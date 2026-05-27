const { SET_SIZES } = require('./deck');

function countPropertyCards(arr) {
  return arr.filter(c => c.type === 'property' || c.type === 'wildProperty').length;
}

function hasHouse(arr) {
  return arr.some(c => c.type === 'action' && c.subtype === 'house');
}

function hasHotel(arr) {
  return arr.some(c => c.type === 'action' && c.subtype === 'hotel');
}

// properties[color] is now Card[][] (array of stacks).
// A color is "complete" when at least one stack has >= SET_SIZES[color] property cards.
function isCompleteSet(color, player) {
  const stacks = player.properties[color] || [];
  const size = SET_SIZES[color];
  if (!size) return false;
  return stacks.some(stack => countPropertyCards(stack) >= size);
}

// Returns one entry per complete stack (may contain duplicate colors if a
// player somehow has two complete stacks of the same color).
function getCompleteSets(player) {
  const result = [];
  for (const [color, stacks] of Object.entries(player.properties || {})) {
    const size = SET_SIZES[color];
    if (!size) continue;
    for (const stack of stacks) {
      if (countPropertyCards(stack) >= size) result.push(color);
    }
  }
  return result;
}

function getBankTotal(player) {
  return (player.bank || []).reduce((sum, c) => sum + (c.value || 0), 0);
}

function checkWin(player) {
  return getCompleteSets(player).length >= 3 && getBankTotal(player) >= 10;
}

// A card can be stolen only if its specific stack is NOT a complete set.
function canBeStolen(card, ownerPlayer) {
  for (const [color, stacks] of Object.entries(ownerPlayer.properties || {})) {
    for (const stack of stacks) {
      if (!stack.find(c => c.id === card.id)) continue;
      return countPropertyCards(stack) < (SET_SIZES[color] || Infinity);
    }
  }
  return false;
}

function findCardInHand(player, cardId) {
  return player.hand.find(c => c.id === cardId) || null;
}

function findCardInBank(player, cardId) {
  return player.bank.find(c => c.id === cardId) || null;
}

function findCardInProperties(player, cardId) {
  for (const stacks of Object.values(player.properties || {})) {
    for (const stack of stacks) {
      const c = stack.find(c => c.id === cardId);
      if (c) return c;
    }
  }
  return null;
}

function findPropertyColor(player, cardId) {
  for (const [color, stacks] of Object.entries(player.properties || {})) {
    for (const stack of stacks) {
      if (stack.find(c => c.id === cardId)) return color;
    }
  }
  return null;
}

function getRentForColor(color, player) {
  const stacks = player.properties[color] || [];
  const { RENT_VALUES } = require('./deck');
  let maxRent = 0;
  for (const stack of stacks) {
    const count = countPropertyCards(stack);
    if (count === 0) continue;
    const table = RENT_VALUES[color];
    const base = table[Math.min(count, table.length) - 1] || 0;
    let bonus = 0;
    if (hasHouse(stack)) bonus += 3;
    if (hasHotel(stack)) bonus += 4;
    maxRent = Math.max(maxRent, base + bonus);
  }
  return maxRent;
}

// All cards a player can legally pay with (not rainbow wilds).
// Returns copies with { from: 'bank' } or { from: 'property', fromColor }.
function getPayableCards(player) {
  const cards = [];
  for (const c of player.bank || []) cards.push({ ...c, from: 'bank' });
  for (const [color, stacks] of Object.entries(player.properties || {})) {
    for (const stack of stacks) {
      for (const c of stack) {
        if (c.isRainbowWild) continue;
        cards.push({ ...c, fromColor: color, from: 'property' });
      }
    }
  }
  return cards;
}

function totalPayableValue(player) {
  return getPayableCards(player).reduce((sum, c) => sum + (c.value || 0), 0);
}

module.exports = {
  countPropertyCards,
  hasHouse,
  hasHotel,
  isCompleteSet,
  getCompleteSets,
  checkWin,
  getBankTotal,
  canBeStolen,
  findCardInHand,
  findCardInBank,
  findCardInProperties,
  findPropertyColor,
  getRentForColor,
  getPayableCards,
  totalPayableValue,
};
