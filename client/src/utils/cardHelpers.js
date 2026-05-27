export const COLOR_META = {
  brown:     { label: 'Brown',      bg: 'bg-amber-800',   text: 'text-white',  border: 'border-amber-600',  hex: '#92400e' },
  lightBlue: { label: 'Light Blue', bg: 'bg-sky-300',     text: 'text-gray-900', border: 'border-sky-400', hex: '#7dd3fc' },
  pink:      { label: 'Pink',       bg: 'bg-pink-400',    text: 'text-white',  border: 'border-pink-300',   hex: '#f472b6' },
  orange:    { label: 'Orange',     bg: 'bg-orange-400',  text: 'text-white',  border: 'border-orange-300', hex: '#fb923c' },
  red:       { label: 'Red',        bg: 'bg-red-500',     text: 'text-white',  border: 'border-red-400',    hex: '#ef4444' },
  yellow:    { label: 'Yellow',     bg: 'bg-yellow-400',  text: 'text-gray-900', border: 'border-yellow-300', hex: '#facc15' },
  green:     { label: 'Green',      bg: 'bg-green-600',   text: 'text-white',  border: 'border-green-500',  hex: '#16a34a' },
  darkBlue:  { label: 'Dark Blue',  bg: 'bg-blue-800',    text: 'text-white',  border: 'border-blue-600',   hex: '#1e40af' },
  railroad:  { label: 'Railroad',   bg: 'bg-gray-600',    text: 'text-white',  border: 'border-gray-400',   hex: '#4b5563' },
  utility:   { label: 'Utility',    bg: 'bg-purple-500',  text: 'text-white',  border: 'border-purple-400', hex: '#a855f7' },
};

export const SET_SIZES = {
  brown: 2, lightBlue: 3, pink: 3, orange: 3,
  red: 3, yellow: 3, green: 3, darkBlue: 2,
  railroad: 4, utility: 2,
};

export const RENT_VALUES = {
  brown: [1, 2],
  lightBlue: [1, 2, 3],
  pink: [1, 2, 4],
  orange: [1, 3, 5],
  red: [2, 3, 6],
  yellow: [2, 4, 6],
  green: [2, 4, 7],
  darkBlue: [3, 8],
  railroad: [1, 2, 3, 4],
  utility: [1, 2],
};

export function getColorMeta(color) {
  return COLOR_META[color] || { label: color || 'Wild', bg: 'bg-gray-500', text: 'text-white', border: 'border-gray-400', hex: '#6b7280' };
}

export function cardLabel(card) {
  if (!card) return '';
  switch (card.type) {
    case 'money': return `$${card.value}M`;
    case 'property': return getColorMeta(card.color).label;
    case 'wildProperty':
      if (card.isRainbowWild) return 'Rainbow Wild';
      return card.colors.map(c => getColorMeta(c).label).join(' / ');
    case 'action': return ACTION_LABELS[card.subtype] || card.subtype;
    case 'rent':
      if (card.subtype === 'rentAny') return 'Rainbow Rent';
      return `Rent: ${card.colors.map(c => getColorMeta(c).label).join('/')}`;
    default: return 'Card';
  }
}

export const ACTION_LABELS = {
  passGo: 'Pass Go',
  dealBreaker: 'Deal Breaker',
  forcedDeal: 'Forced Deal',
  slyDeal: 'Sly Deal',
  justSayNo: 'Just Say No',
  debtCollector: 'Debt Collector',
  birthday: "It's My Birthday",
  doubleRent: 'Double the Rent',
  house: 'House',
  hotel: 'Hotel',
};

export function cardDescription(card) {
  if (!card) return '';
  switch (card.type) {
    case 'money': return `Bank value: $${card.value}M`;
    case 'property': {
      const meta = getColorMeta(card.color);
      const rents = RENT_VALUES[card.color] || [];
      return `${meta.label} property • Rent: ${rents.join('→')}M`;
    }
    case 'wildProperty':
      if (card.isRainbowWild) return 'Place in ANY color set • No debt value';
      return `Wild: ${card.colors.map(c => getColorMeta(c).label).join(' or ')} • Value: $${card.value}M`;
    case 'action': return ACTION_DESCRIPTIONS[card.subtype] || '';
    case 'rent':
      if (card.subtype === 'rentAny') return 'Charge ALL players rent for any one color';
      return `Charge one player rent for ${card.colors.map(c => getColorMeta(c).label).join(' or ')}`;
    default: return '';
  }
}

export const ACTION_DESCRIPTIONS = {
  passGo: 'Draw 2 extra cards immediately',
  dealBreaker: 'Steal a complete property set from any player',
  forcedDeal: 'Swap one of your properties with one from any player',
  slyDeal: 'Steal one property from any player (not a full set)',
  justSayNo: 'Cancel any action card played against you',
  debtCollector: 'Force one player to pay you 5M',
  birthday: 'All other players pay you 2M',
  doubleRent: 'Double the next rent card you play this turn',
  house: 'Add to a complete set (+3M rent). Not Railroad/Utility',
  hotel: 'Add to a complete set with a House (+4M rent)',
};

export function cardBgColor(card) {
  if (!card) return 'bg-gray-700';
  switch (card.type) {
    case 'money': return 'bg-emerald-700';
    case 'property': return getColorMeta(card.color).bg;
    case 'wildProperty':
      if (card.isRainbowWild) return 'bg-gradient-to-br from-red-400 via-yellow-400 to-blue-400';
      return 'bg-gradient-to-br from-gray-600 to-gray-800';
    case 'action': return 'bg-slate-700';
    case 'rent': return 'bg-indigo-700';
    default: return 'bg-gray-700';
  }
}

export function isPropertyCard(card) {
  return card && (card.type === 'property' || card.type === 'wildProperty');
}

export function canBePlayedAsAction(card) {
  return card && (card.type === 'action' || card.type === 'rent');
}

export function canBePlayedAsProperty(card) {
  return card && (card.type === 'property' || card.type === 'wildProperty');
}

export function canBeBanked(card) {
  return card && card.type !== 'property' && card.type !== 'wildProperty';
}

export function countPropertyCards(arr) {
  return (arr || []).filter(c => c.type === 'property' || c.type === 'wildProperty').length;
}

export function isCompleteSet(color, player) {
  const size = SET_SIZES[color];
  if (!size) return false;
  const stacks = player.properties[color] || [];
  return stacks.some(stack => countPropertyCards(stack) >= size);
}

export function getCompleteSets(player) {
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

export function getBankTotal(player) {
  return (player.bank || []).reduce((sum, c) => sum + (c.value || 0), 0);
}

export function checkWin(player) {
  return getCompleteSets(player).length >= 3 && getBankTotal(player) >= 10;
}

export function getRentForSet(color, cards) {
  const propCount = countPropertyCards(cards);
  if (propCount === 0) return 0;
  const table = RENT_VALUES[color] || [];
  const base = table[Math.min(propCount, table.length) - 1] || 0;
  const hasHouse = cards.some(c => c.type === 'action' && c.subtype === 'house');
  const hasHotel = cards.some(c => c.type === 'action' && c.subtype === 'hotel');
  return base + (hasHouse ? 3 : 0) + (hasHotel ? 4 : 0);
}

export function canBeStolen(cardId, ownerPlayer) {
  for (const [color, stacks] of Object.entries(ownerPlayer.properties || {})) {
    for (const stack of stacks) {
      if (!stack.find(c => c.id === cardId)) continue;
      return countPropertyCards(stack) < (SET_SIZES[color] || Infinity);
    }
  }
  return false;
}

export function getPayableCards(player) {
  const out = [];
  for (const c of player.bank || []) out.push({ ...c, fromArea: 'bank' });
  for (const [color, stacks] of Object.entries(player.properties || {})) {
    for (const stack of stacks) {
      for (const c of stack) {
        if (c.isRainbowWild) continue;
        out.push({ ...c, fromArea: 'property', fromColor: color });
      }
    }
  }
  return out;
}
