const {
  isCompleteSet, getCompleteSets, canBeStolen,
  findCardInHand, findPropertyColor, getRentForColor,
  getPayableCards, totalPayableValue, hasHouse, hasHotel,
  countPropertyCards,
} = require('./rules');
const { drawCards, checkAndSetWinner } = require('./state');
const { SET_SIZES } = require('./deck');

// Remove a card from player's hand
function removeFromHand(player, cardId) {
  const idx = player.hand.findIndex(c => c.id === cardId);
  if (idx === -1) return null;
  return player.hand.splice(idx, 1)[0];
}

// Remove a card from player's bank
function removeFromBank(player, cardId) {
  const idx = player.bank.findIndex(c => c.id === cardId);
  if (idx === -1) return null;
  return player.bank.splice(idx, 1)[0];
}

// Remove a card from player's properties (any color)
function removeFromProperties(player, cardId) {
  for (const [color, arr] of Object.entries(player.properties)) {
    const idx = arr.findIndex(c => c.id === cardId);
    if (idx !== -1) return arr.splice(idx, 1)[0];
  }
  return null;
}

// Place a property card into a player's color group
function placeInProperties(player, card, color) {
  if (!player.properties[color]) player.properties[color] = [];
  player.properties[color].push(card);
  card.color = color; // track current placement
}

// Main card play handler — returns { error } or { ok, pendingAction }
function playCard(room, playerId, payload) {
  const { cardId, playAs, target, targetProperty, offeredProperty, targetSet, destinationColor, useDoubleRent } = payload;

  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };

  const card = findCardInHand(player, cardId);
  if (!card) return { error: 'Card not in hand' };

  if (room.playsRemainingThisTurn <= 0) return { error: 'No plays remaining this turn' };
  if (room.pendingAction) return { error: 'Waiting for action resolution' };

  // BANK: money or action/rent cards used as money
  if (playAs === 'bank') {
    if (card.type !== 'money' && card.type !== 'action' && card.type !== 'rent' && card.type !== 'wildProperty') {
      return { error: 'Cannot bank that card type' };
    }
    if (card.type === 'property') return { error: 'Properties cannot be banked' };
    removeFromHand(player, cardId);
    player.bank.push(card);
    room.playsRemainingThisTurn--;
    return { ok: true };
  }

  // PROPERTY: place property or wild on table
  if (playAs === 'property') {
    if (card.type !== 'property' && card.type !== 'wildProperty') {
      return { error: 'Not a property card' };
    }
    let color = destinationColor;
    if (card.type === 'property') {
      color = card.color; // regular property has fixed color
    } else {
      // Wild: validate destinationColor
      if (!color) return { error: 'Must specify destinationColor for wild cards' };
      if (!card.isRainbowWild && !card.colors.includes(color)) {
        return { error: 'Invalid color for this wild card' };
      }
    }
    removeFromHand(player, cardId);
    placeInProperties(player, card, color);
    room.playsRemainingThisTurn--;
    checkAndSetWinner(room);
    return { ok: true };
  }

  // ACTION: play as action card
  if (playAs === 'action') {
    return handleAction(room, player, card, { target, targetProperty, offeredProperty, targetSet, destinationColor, useDoubleRent });
  }

  return { error: 'Unknown playAs value' };
}

function handleAction(room, player, card, opts) {
  const { target, targetProperty, offeredProperty, targetSet, destinationColor } = opts;

  if (card.type === 'rent') return handleRent(room, player, card, opts);

  if (card.type !== 'action') return { error: 'Not an action card' };

  switch (card.subtype) {
    case 'passGo':
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      drawCards(room, player, 2);
      room.playsRemainingThisTurn--;
      return { ok: true };

    case 'doubleRent':
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      room.doubleRentActive = true;
      room.playsRemainingThisTurn--;
      return { ok: true };

    case 'house': {
      if (!targetSet) return { error: 'Must specify targetSet color' };
      if (!isCompleteSet(targetSet, player)) return { error: 'Set is not complete' };
      if (targetSet === 'railroad' || targetSet === 'utility') return { error: 'Cannot place house on Railroad or Utility' };
      const arr = player.properties[targetSet];
      if (hasHouse(arr)) return { error: 'Set already has a house' };
      removeFromHand(player, card.id);
      player.properties[targetSet].push(card);
      room.playsRemainingThisTurn--;
      return { ok: true };
    }

    case 'hotel': {
      if (!targetSet) return { error: 'Must specify targetSet color' };
      if (!isCompleteSet(targetSet, player)) return { error: 'Set is not complete' };
      if (targetSet === 'railroad' || targetSet === 'utility') return { error: 'Cannot place hotel on Railroad or Utility' };
      const arr = player.properties[targetSet];
      if (!hasHouse(arr)) return { error: 'Set must have a house before placing hotel' };
      if (hasHotel(arr)) return { error: 'Set already has a hotel' };
      removeFromHand(player, card.id);
      player.properties[targetSet].push(card);
      room.playsRemainingThisTurn--;
      return { ok: true };
    }

    case 'debtCollector': {
      const targetPlayer = room.players.find(p => p.id === target);
      if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      room.playsRemainingThisTurn--;
      room.pendingAction = {
        type: 'debtCollector',
        fromPlayerId: player.id,
        originalTargetId: targetPlayer.id,
        currentResponderId: targetPlayer.id,
        amount: 5,
        remainingTargets: [],
        details: {},
        jsnDepth: 0,
        phase: 'jsnWindow',
      };
      return { ok: true, pendingAction: room.pendingAction };
    }

    case 'birthday': {
      const others = room.players.filter(p => p.id !== player.id && p.connected);
      if (others.length === 0) return { error: 'No other players' };
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      room.playsRemainingThisTurn--;
      const [first, ...rest] = others;
      room.pendingAction = {
        type: 'birthday',
        fromPlayerId: player.id,
        originalTargetId: first.id,
        currentResponderId: first.id,
        amount: 2,
        remainingTargets: rest.map(p => p.id),
        details: {},
        jsnDepth: 0,
        phase: 'jsnWindow',
      };
      return { ok: true, pendingAction: room.pendingAction };
    }

    case 'slyDeal': {
      const targetPlayer = room.players.find(p => p.id === target);
      if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };
      if (!targetProperty) return { error: 'Must specify targetProperty' };
      const tCard = targetPlayer.properties
        ? Object.values(targetPlayer.properties).flat().find(c => c.id === targetProperty)
        : null;
      if (!tCard) return { error: 'Target property not found' };
      if (!canBeStolen(tCard, targetPlayer)) return { error: 'Cannot steal from a complete set' };
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      room.playsRemainingThisTurn--;
      room.pendingAction = {
        type: 'slyDeal',
        fromPlayerId: player.id,
        originalTargetId: targetPlayer.id,
        currentResponderId: targetPlayer.id,
        amount: 0,
        remainingTargets: [],
        details: { targetCardId: targetProperty },
        jsnDepth: 0,
        phase: 'jsnWindow',
      };
      return { ok: true, pendingAction: room.pendingAction };
    }

    case 'forcedDeal': {
      const targetPlayer = room.players.find(p => p.id === target);
      if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };
      if (!targetProperty || !offeredProperty) return { error: 'Must specify targetProperty and offeredProperty' };
      const tCard = Object.values(targetPlayer.properties).flat().find(c => c.id === targetProperty);
      if (!tCard) return { error: 'Target property not found' };
      if (!canBeStolen(tCard, targetPlayer)) return { error: 'Cannot swap from a complete set' };
      const oCard = Object.values(player.properties).flat().find(c => c.id === offeredProperty);
      if (!oCard) return { error: 'Offered property not found' };
      if (!canBeStolen(oCard, player)) return { error: 'Cannot swap from your own complete set' };
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      room.playsRemainingThisTurn--;
      room.pendingAction = {
        type: 'forcedDeal',
        fromPlayerId: player.id,
        originalTargetId: targetPlayer.id,
        currentResponderId: targetPlayer.id,
        amount: 0,
        remainingTargets: [],
        details: { targetCardId: targetProperty, offeredCardId: offeredProperty },
        jsnDepth: 0,
        phase: 'jsnWindow',
      };
      return { ok: true, pendingAction: room.pendingAction };
    }

    case 'dealBreaker': {
      const targetPlayer = room.players.find(p => p.id === target);
      if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };
      if (!targetSet) return { error: 'Must specify targetSet color' };
      if (!isCompleteSet(targetSet, targetPlayer)) return { error: 'Target set is not complete' };
      removeFromHand(player, card.id);
      room.discardPile.push(card);
      room.playsRemainingThisTurn--;
      room.pendingAction = {
        type: 'dealBreaker',
        fromPlayerId: player.id,
        originalTargetId: targetPlayer.id,
        currentResponderId: targetPlayer.id,
        amount: 0,
        remainingTargets: [],
        details: { targetSetColor: targetSet },
        jsnDepth: 0,
        phase: 'jsnWindow',
      };
      return { ok: true, pendingAction: room.pendingAction };
    }

    default:
      return { error: `Unknown action subtype: ${card.subtype}` };
  }
}

function handleRent(room, player, card, opts) {
  const { destinationColor, target, useDoubleRent } = opts;

  // Dual-color rent card — charges ALL other players
  if (card.subtype === 'rent2color') {
    if (!destinationColor || !card.colors.includes(destinationColor)) {
      return { error: 'Must choose a valid rent color' };
    }

    // Capture flag BEFORE clearing it, then clear
    const presetDouble = room.doubleRentActive;
    room.doubleRentActive = false;

    // Player can also club a Double the Rent card from hand alongside this rent
    let playedDoubleCard = false;
    if (useDoubleRent && !presetDouble) {
      const drc = player.hand.find(c => c.type === 'action' && c.subtype === 'doubleRent');
      if (drc) {
        if (room.playsRemainingThisTurn < 2) return { error: 'Need 2 plays for Rent + Double the Rent' };
        removeFromHand(player, drc.id);
        room.discardPile.push(drc);
        playedDoubleCard = true;
      }
    }

    const applyDouble = presetDouble || playedDoubleCard;
    let amount = getRentForColor(destinationColor, player);
    if (applyDouble) amount *= 2;

    if (amount <= 0) return { error: 'No rent value for that color' };

    const others = room.players.filter(p => p.id !== player.id && p.connected);
    if (others.length === 0) return { error: 'No other players' };

    removeFromHand(player, card.id);
    room.discardPile.push(card);
    // Rent costs 1 play; if we also consumed a doubleRent card from hand, that's +1 more
    room.playsRemainingThisTurn -= playedDoubleCard ? 2 : 1;

    const [first, ...rest] = others;
    room.pendingAction = {
      type: 'rent',
      fromPlayerId: player.id,
      originalTargetId: first.id,
      currentResponderId: first.id,
      amount,
      remainingTargets: rest.map(p => p.id),
      details: { rentColor: destinationColor },
      jsnDepth: 0,
      phase: 'jsnWindow',
    };
    return { ok: true, pendingAction: room.pendingAction };
  }

  // Multicolor wild rent (rainbow) — charges ONE chosen player; cannot be doubled
  if (card.subtype === 'rentAny') {
    if (!destinationColor) return { error: 'Must specify a rent color' };
    if (!target) return { error: 'Must specify a target player' };
    const targetPlayer = room.players.find(p => p.id === target);
    if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };

    const amount = getRentForColor(destinationColor, player);
    if (amount <= 0) return { error: 'No rent value for that color' };

    removeFromHand(player, card.id);
    room.discardPile.push(card);
    room.doubleRentActive = false;
    room.playsRemainingThisTurn--;

    room.pendingAction = {
      type: 'rent',
      fromPlayerId: player.id,
      originalTargetId: targetPlayer.id,
      currentResponderId: targetPlayer.id,
      amount,
      remainingTargets: [],
      details: { rentColor: destinationColor },
      jsnDepth: 0,
      phase: 'jsnWindow',
    };
    return { ok: true, pendingAction: room.pendingAction };
  }

  return { error: 'Unknown rent card type' };
}

// Handle Just Say No response
function handleJustSayNo(room, playerId) {
  const pa = room.pendingAction;
  if (!pa) return { error: 'No pending action' };
  if (pa.currentResponderId !== playerId) return { error: 'Not your turn to respond' };

  const player = room.players.find(p => p.id === playerId);
  const jsnCard = player.hand.find(c => c.type === 'action' && c.subtype === 'justSayNo');
  if (!jsnCard) return { error: 'No Just Say No card in hand' };

  player.hand = player.hand.filter(c => c.id !== jsnCard.id);
  room.discardPile.push(jsnCard);

  pa.jsnDepth++;
  // Switch responder: if fromPlayer played JSN, switch to originalTarget; vice versa
  if (playerId === pa.fromPlayerId) {
    pa.currentResponderId = pa.originalTargetId;
  } else {
    pa.currentResponderId = pa.fromPlayerId;
  }

  return { ok: true };
}

// Accept the current state of the pending action (or let JSN stand)
// jsnDepth even → action proceeds; odd → action cancelled
function handleAccept(room, playerId) {
  const pa = room.pendingAction;
  if (!pa) return { error: 'No pending action' };
  if (pa.currentResponderId !== playerId) return { error: 'Not your turn to respond' };

  const actionCancelled = pa.jsnDepth % 2 === 1; // odd = JSN standing

  if (actionCancelled) {
    // Action was cancelled by Just Say No; advance to next birthday target or clear
    return advanceOrClearPendingAction(room, true);
  }

  // Action proceeds
  if (pa.phase === 'jsnWindow') {
    // For payment actions, move to payment phase
    if (pa.type === 'rent' || pa.type === 'debtCollector' || pa.type === 'birthday') {
      pa.phase = 'payment';
      pa.currentResponderId = pa.originalTargetId;
      return { ok: true, needsPayment: true };
    }
    // For theft actions, resolve immediately
    return resolveTheftAction(room, pa);
  }

  return { error: 'Unexpected accept in payment phase' };
}

// Player submits payment cards
function handlePayDebt(room, playerId, cardIds) {
  const pa = room.pendingAction;
  if (!pa) return { error: 'No pending action' };
  if (pa.phase !== 'payment') return { error: 'Not in payment phase' };
  if (pa.currentResponderId !== playerId) return { error: 'Not your turn to pay' };

  const targetPlayer = room.players.find(p => p.id === playerId);
  const fromPlayer = room.players.find(p => p.id === pa.fromPlayerId);

  const payableCards = getPayableCards(targetPlayer);
  const totalAvailable = payableCards.reduce((s, c) => s + (c.value || 0), 0);

  // Collect selected cards
  const selected = cardIds.map(id => payableCards.find(c => c.id === id)).filter(Boolean);
  const totalPaid = selected.reduce((s, c) => s + (c.value || 0), 0);

  // Validate: must pay at least the debt if able
  if (totalPaid < pa.amount && totalAvailable >= pa.amount) {
    return { error: `Must pay at least ${pa.amount}M (you can cover it)` };
  }

  // Rainbow wilds cannot pay
  if (selected.some(c => c.isRainbowWild)) {
    return { error: 'Rainbow wilds cannot be used to pay debts' };
  }

  // Transfer cards
  for (const c of selected) {
    if (c.from === 'bank') {
      removeFromBank(targetPlayer, c.id);
      fromPlayer.bank.push(c);
    } else if (c.from === 'property') {
      removeFromProperties(targetPlayer, c.id);
      // Property goes into recipient's matching color group (or first valid color for wilds)
      let destColor = c.color;
      if (!destColor && c.type === 'wildProperty') {
        destColor = c.colors[0] === 'rainbow' ? Object.keys(fromPlayer.properties)[0] : c.colors[0];
      }
      if (destColor && fromPlayer.properties[destColor]) {
        fromPlayer.properties[destColor].push(c);
      } else {
        fromPlayer.bank.push(c); // fallback
      }
    }
  }

  checkAndSetWinner(room);
  return advanceOrClearPendingAction(room, false);
}

// Resolve a theft action (slyDeal, forcedDeal, dealBreaker)
function resolveTheftAction(room, pa) {
  const fromPlayer = room.players.find(p => p.id === pa.fromPlayerId);
  const targetPlayer = room.players.find(p => p.id === pa.originalTargetId);

  if (pa.type === 'slyDeal') {
    const c = Object.values(targetPlayer.properties).flat().find(x => x.id === pa.details.targetCardId);
    if (!c) return advanceOrClearPendingAction(room, true);
    removeFromProperties(targetPlayer, c.id);
    const destColor = c.color || (c.isRainbowWild ? 'brown' : c.colors[0]);
    if (fromPlayer.properties[destColor]) fromPlayer.properties[destColor].push(c);
    else fromPlayer.bank.push(c);
  } else if (pa.type === 'forcedDeal') {
    // Swap cards
    const tCard = Object.values(targetPlayer.properties).flat().find(x => x.id === pa.details.targetCardId);
    const oCard = Object.values(fromPlayer.properties).flat().find(x => x.id === pa.details.offeredCardId);
    if (tCard && oCard) {
      const tColor = getPropertyColor(targetPlayer, tCard.id);
      const oColor = getPropertyColor(fromPlayer, oCard.id);
      removeFromProperties(targetPlayer, tCard.id);
      removeFromProperties(fromPlayer, oCard.id);
      if (fromPlayer.properties[tColor]) fromPlayer.properties[tColor].push(tCard);
      else fromPlayer.bank.push(tCard);
      if (targetPlayer.properties[oColor]) targetPlayer.properties[oColor].push(oCard);
      else targetPlayer.bank.push(oCard);
    }
  } else if (pa.type === 'dealBreaker') {
    const color = pa.details.targetSetColor;
    const setCards = [...(targetPlayer.properties[color] || [])];
    targetPlayer.properties[color] = [];
    if (!fromPlayer.properties[color]) fromPlayer.properties[color] = [];
    fromPlayer.properties[color].push(...setCards);
  }

  checkAndSetWinner(room);
  return advanceOrClearPendingAction(room, false);
}

// Advance to next birthday/rent target or clear the pendingAction
function advanceOrClearPendingAction(room, cancelled) {
  const pa = room.pendingAction;
  if (!pa) return { ok: true };

  if (pa.remainingTargets && pa.remainingTargets.length > 0) {
    const nextId = pa.remainingTargets.shift();
    pa.originalTargetId = nextId;
    pa.currentResponderId = nextId;
    pa.jsnDepth = 0;
    pa.phase = 'jsnWindow';
    return { ok: true, nextTarget: nextId };
  }

  room.pendingAction = null;
  return { ok: true };
}

// Reassign a wild card on the current player's turn
function reassignWild(room, playerId, cardId, newColor) {
  const player = room.players.find(p => p.id === playerId);
  if (!player) return { error: 'Player not found' };

  const card = Object.values(player.properties).flat().find(c => c.id === cardId);
  if (!card || (card.type !== 'wildProperty')) return { error: 'Card not found or not a wild' };

  if (!card.isRainbowWild && !card.colors.includes(newColor)) {
    return { error: 'Invalid color for this wild' };
  }
  if (!player.properties[newColor]) return { error: 'Invalid color' };

  const oldColor = getPropertyColor(player, cardId);
  if (isCompleteSet(oldColor, player)) return { error: 'Cannot move wild from a complete set mid-action' };

  removeFromProperties(player, cardId);
  player.properties[newColor].push(card);
  card.color = newColor;
  return { ok: true };
}

function getPropertyColor(player, cardId) {
  for (const [color, arr] of Object.entries(player.properties)) {
    if (arr.find(c => c.id === cardId)) return color;
  }
  return null;
}

module.exports = {
  playCard, handleJustSayNo, handleAccept, handlePayDebt, reassignWild,
  resolveTheftAction, advanceOrClearPendingAction,
};
