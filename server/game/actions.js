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

// Remove a card from player's properties (any color, any stack).
// Prunes empty stacks after removal.
function removeFromProperties(player, cardId) {
  for (const [, stacks] of Object.entries(player.properties)) {
    for (let si = 0; si < stacks.length; si++) {
      const stack = stacks[si];
      const idx = stack.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        const [removed] = stack.splice(idx, 1);
        if (stack.length === 0) stacks.splice(si, 1); // prune empty stack
        return removed;
      }
    }
  }
  return null;
}

// Place a property card into the player's color group.
// Rule: a single stack may hold at most SET_SIZES[color] property cards.
// If all existing stacks are full (or none exist), a new stack is created.
function placeInProperties(player, card, color) {
  if (!player.properties[color]) player.properties[color] = [];
  const stacks = player.properties[color];
  const setSize = SET_SIZES[color] || Infinity;
  const target = stacks.find(
    stack => countPropertyCards(stack) < setSize,
  );
  if (target) {
    target.push(card);
  } else {
    stacks.push([card]);
  }
  card.color = color;
}

// All property cards across all stacks (flat), for lookups
function allPropertyCards(player) {
  return Object.values(player.properties).flat(2);
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

  // BANK: money or action/rent cards used as money.
  // Properties (including wild properties) can NEVER be banked.
  if (playAs === 'bank') {
    if (card.type !== 'money' && card.type !== 'action' && card.type !== 'rent') {
      return { error: 'Cannot bank that card type' };
    }
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
      return { error: 'Double the Rent must be played alongside a rent card, not separately' };

    case 'house': {
      if (!targetSet) return { error: 'Must specify targetSet color' };
      if (targetSet === 'railroad' || targetSet === 'utility') return { error: 'Cannot place house on Railroad or Utility' };
      const stacks = player.properties[targetSet] || [];
      const completeStack = stacks.find(stack => countPropertyCards(stack) >= SET_SIZES[targetSet]);
      if (!completeStack) return { error: 'Set is not complete' };
      if (hasHouse(completeStack)) return { error: 'Set already has a house' };
      removeFromHand(player, card.id);
      completeStack.push(card);
      room.playsRemainingThisTurn--;
      return { ok: true };
    }

    case 'hotel': {
      if (!targetSet) return { error: 'Must specify targetSet color' };
      if (targetSet === 'railroad' || targetSet === 'utility') return { error: 'Cannot place hotel on Railroad or Utility' };
      const stacks = player.properties[targetSet] || [];
      const completeStack = stacks.find(stack => countPropertyCards(stack) >= SET_SIZES[targetSet]);
      if (!completeStack) return { error: 'Set is not complete' };
      if (!hasHouse(completeStack)) return { error: 'Set must have a house before placing hotel' };
      if (hasHotel(completeStack)) return { error: 'Set already has a hotel' };
      removeFromHand(player, card.id);
      completeStack.push(card);
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
      const tCard = allPropertyCards(targetPlayer).find(c => c.id === targetProperty);
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
        details: { targetCardId: targetProperty, targetCard: tCard },
        jsnDepth: 0,
        phase: 'jsnWindow',
      };
      return { ok: true, pendingAction: room.pendingAction };
    }

    case 'forcedDeal': {
      const targetPlayer = room.players.find(p => p.id === target);
      if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };
      if (!targetProperty || !offeredProperty) return { error: 'Must specify targetProperty and offeredProperty' };
      const tCard = allPropertyCards(targetPlayer).find(c => c.id === targetProperty);
      if (!tCard) return { error: 'Target property not found' };
      if (!canBeStolen(tCard, targetPlayer)) return { error: 'Cannot swap from a complete set' };
      const oCard = allPropertyCards(player).find(c => c.id === offeredProperty);
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
        details: { targetCardId: targetProperty, offeredCardId: offeredProperty, targetCard: tCard, offeredCard: oCard },
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
      const dbStacks = targetPlayer.properties[targetSet] || [];
      const dbStack = dbStacks.find(stack => countPropertyCards(stack) >= SET_SIZES[targetSet]) || [];
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
        details: { targetSetColor: targetSet, targetSetCards: [...dbStack] },
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

    // Double the Rent must be played alongside this rent card (not pre-played).
    let playedDoubleCard = false;
    if (useDoubleRent) {
      const drc = player.hand.find(c => c.type === 'action' && c.subtype === 'doubleRent');
      if (drc) {
        if (room.playsRemainingThisTurn < 2) return { error: 'Need 2 plays for Rent + Double the Rent' };
        removeFromHand(player, drc.id);
        room.discardPile.push(drc);
        playedDoubleCard = true;
      }
    }

    const applyDouble = playedDoubleCard;
    let amount = getRentForColor(destinationColor, player);
    if (applyDouble) amount *= 2;

    if (amount <= 0) return { error: 'No rent value for that color' };

    const others = room.players.filter(p => p.id !== player.id && p.connected);
    if (others.length === 0) return { error: 'No other players' };

    removeFromHand(player, card.id);
    room.discardPile.push(card);
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

  // Rainbow wild rent — charges ONE chosen player; cannot be doubled
  if (card.subtype === 'rentAny') {
    if (!destinationColor) return { error: 'Must specify a rent color' };
    if (!target) return { error: 'Must specify a target player' };
    const targetPlayer = room.players.find(p => p.id === target);
    if (!targetPlayer || targetPlayer.id === player.id) return { error: 'Invalid target' };

    const amount = getRentForColor(destinationColor, player);
    if (amount <= 0) return { error: 'No rent value for that color' };

    removeFromHand(player, card.id);
    room.discardPile.push(card);
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
  if (playerId === pa.fromPlayerId) {
    pa.currentResponderId = pa.originalTargetId;
  } else {
    pa.currentResponderId = pa.fromPlayerId;
  }

  return { ok: true };
}

// Accept the current state of the pending action (or let JSN stand).
// jsnDepth even → action proceeds; odd → action cancelled.
function handleAccept(room, playerId) {
  const pa = room.pendingAction;
  if (!pa) return { error: 'No pending action' };
  if (pa.currentResponderId !== playerId) return { error: 'Not your turn to respond' };

  const actionCancelled = pa.jsnDepth % 2 === 1;

  if (actionCancelled) {
    return advanceOrClearPendingAction(room, true);
  }

  if (pa.phase === 'jsnWindow') {
    if (pa.type === 'rent' || pa.type === 'debtCollector' || pa.type === 'birthday') {
      pa.phase = 'payment';
      pa.currentResponderId = pa.originalTargetId;
      return { ok: true, needsPayment: true };
    }
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

  const selected = cardIds.map(id => payableCards.find(c => c.id === id)).filter(Boolean);
  const totalPaid = selected.reduce((s, c) => s + (c.value || 0), 0);

  if (totalPaid < pa.amount && totalAvailable >= pa.amount) {
    return { error: `Must pay at least ${pa.amount}M (you can cover it)` };
  }

  if (selected.some(c => c.isRainbowWild)) {
    return { error: 'Rainbow wilds cannot be used to pay debts' };
  }

  for (const c of selected) {
    if (c.from === 'bank') {
      removeFromBank(targetPlayer, c.id);
      fromPlayer.bank.push(c);
    } else if (c.from === 'property') {
      removeFromProperties(targetPlayer, c.id);
      let destColor = c.color;
      if (!destColor && c.type === 'wildProperty') {
        destColor = c.colors[0] === 'rainbow'
          ? Object.keys(fromPlayer.properties)[0]
          : c.colors[0];
      }
      if (destColor) {
        if (!fromPlayer.properties[destColor]) fromPlayer.properties[destColor] = [];
        placeInProperties(fromPlayer, c, destColor);
      } else {
        fromPlayer.bank.push(c);
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
    const c = allPropertyCards(targetPlayer).find(x => x.id === pa.details.targetCardId);
    if (!c) return advanceOrClearPendingAction(room, true);
    removeFromProperties(targetPlayer, c.id);
    const destColor = c.color || (c.isRainbowWild ? 'brown' : c.colors[0]);
    if (!fromPlayer.properties[destColor]) fromPlayer.properties[destColor] = [];
    placeInProperties(fromPlayer, c, destColor);

  } else if (pa.type === 'forcedDeal') {
    const tCard = allPropertyCards(targetPlayer).find(x => x.id === pa.details.targetCardId);
    const oCard = allPropertyCards(fromPlayer).find(x => x.id === pa.details.offeredCardId);
    if (tCard && oCard) {
      const tColor = findPropertyColor(targetPlayer, tCard.id);
      const oColor = findPropertyColor(fromPlayer, oCard.id);
      removeFromProperties(targetPlayer, tCard.id);
      removeFromProperties(fromPlayer, oCard.id);
      if (tColor) placeInProperties(fromPlayer, tCard, tColor);
      else fromPlayer.bank.push(tCard);
      if (oColor) placeInProperties(targetPlayer, oCard, oColor);
      else targetPlayer.bank.push(oCard);
    }

  } else if (pa.type === 'dealBreaker') {
    const color = pa.details.targetSetColor;
    const stacks = targetPlayer.properties[color] || [];
    // Steal only the one complete stack — leave any overflow stacks with the target
    const completeIdx = stacks.findIndex(
      stack => countPropertyCards(stack) >= SET_SIZES[color],
    );
    if (completeIdx !== -1) {
      const [stolenStack] = stacks.splice(completeIdx, 1);
      if (!fromPlayer.properties[color]) fromPlayer.properties[color] = [];
      fromPlayer.properties[color].push(stolenStack);
    }
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

  // Find the wild across all stacks
  let oldColor = null;
  let oldStack = null;
  for (const [color, stacks] of Object.entries(player.properties)) {
    for (const stack of stacks) {
      if (stack.find(c => c.id === cardId)) { oldColor = color; oldStack = stack; break; }
    }
    if (oldColor) break;
  }

  const card = oldStack?.find(c => c.id === cardId);
  if (!card || card.type !== 'wildProperty') return { error: 'Card not found or not a wild' };

  if (!card.isRainbowWild && !card.colors.includes(newColor)) {
    return { error: 'Invalid color for this wild' };
  }
  if (!player.properties[newColor]) return { error: 'Invalid color' };

  // Cannot move wild out of a complete set
  if (countPropertyCards(oldStack) >= SET_SIZES[oldColor]) {
    return { error: 'Cannot move wild from a complete set mid-action' };
  }

  removeFromProperties(player, cardId);
  placeInProperties(player, card, newColor);
  return { ok: true };
}

module.exports = {
  playCard, handleJustSayNo, handleAccept, handlePayDebt, reassignWild,
  resolveTheftAction, advanceOrClearPendingAction,
};
