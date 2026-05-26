const { SET_SIZES } = require('./deck');

function countPropertyCards(colorArr) {
  return colorArr.filter(c => c.type === 'property' || c.type === 'wildProperty').length;
}

function hasHouse(colorArr) {
  return colorArr.some(c => c.type === 'action' && c.subtype === 'house');
}

function hasHotel(colorArr) {
  return colorArr.some(c => c.type === 'action' && c.subtype === 'hotel');
}

function isCompleteSet(color, player) {
  const arr = player.properties[color] || [];
  return countPropertyCards(arr) >= SET_SIZES[color];
}

function getCompleteSets(player) {
  return Object.keys(SET_SIZES).filter(color => isCompleteSet(color, player));
}

function getBankTotal(player) {
  return (player.bank || []).reduce((sum, c) => sum + (c.value || 0), 0);
}

function checkWin(player) {
  return getCompleteSets(player).length >= 3 && getBankTotal(player) >= 10;
}

// Cards in a set that can be targeted by Sly/Forced Deal (NOT from a complete set)
function canBeStolen(card, ownerPlayer) {
  for (const [color, arr] of Object.entries(ownerPlayer.properties)) {
    if (!arr.find(c => c.id === card.id)) continue;
    if (isCompleteSet(color, ownerPlayer)) return false;
    return true;
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
  for (const arr of Object.values(player.properties)) {
    const c = arr.find(c => c.id === cardId);
    if (c) return c;
  }
  return null;
}

function findPropertyColor(player, cardId) {
  for (const [color, arr] of Object.entries(player.properties)) {
    if (arr.find(c => c.id === cardId)) return color;
  }
  return null;
}

function getRentForColor(color, player) {
  const arr = player.properties[color] || [];
  const count = countPropertyCards(arr);
  if (count === 0) return 0;
  const { RENT_VALUES } = require('./deck');
  const table = RENT_VALUES[color];
  const base = table[Math.min(count, table.length) - 1] || 0;
  let bonus = 0;
  if (hasHouse(arr)) bonus += 3;
  if (hasHotel(arr)) bonus += 4;
  return base + bonus;
}

// Get all cards a player can legally pay with (not rainbow wilds)
function getPayableCards(player) {
  const cards = [];
  for (const c of player.bank) cards.push({ ...c, from: 'bank' });
  for (const [color, arr] of Object.entries(player.properties)) {
    for (const c of arr) {
      if (c.isRainbowWild) continue;
      cards.push({ ...c, fromColor: color, from: 'property' });
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
