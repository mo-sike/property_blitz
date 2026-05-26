const { v4: uuidv4 } = require('uuid');

const SET_SIZES = {
  brown: 2,
  lightBlue: 3,
  pink: 3,
  orange: 3,
  red: 3,
  yellow: 3,
  green: 3,
  darkBlue: 2,
  railroad: 4,
  utility: 2,
};

const RENT_VALUES = {
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

const PROPERTY_MONEY_VALUES = {
  brown: 1,
  lightBlue: 1,
  pink: 2,
  orange: 2,
  red: 3,
  yellow: 3,
  green: 4,
  darkBlue: 4,
  railroad: 2,
  utility: 2,
};

const ALL_COLORS = Object.keys(SET_SIZES);

function card(fields) {
  return { id: uuidv4(), ...fields };
}

function buildDeck() {
  const cards = [];

  // Money cards — 20 total
  const moneyDef = [
    { value: 1, qty: 6 },
    { value: 2, qty: 5 },
    { value: 3, qty: 3 },
    { value: 4, qty: 3 },
    { value: 5, qty: 2 },
    { value: 10, qty: 1 },
  ];
  for (const { value, qty } of moneyDef) {
    for (let i = 0; i < qty; i++) {
      cards.push(card({
        type: 'money', subtype: null,
        color: null, colors: [],
        value, rentValues: [], setSize: 0, isRainbowWild: false,
      }));
    }
  }

  // Property cards — 28 total
  for (const color of ALL_COLORS) {
    const size = SET_SIZES[color];
    for (let i = 0; i < size; i++) {
      cards.push(card({
        type: 'property', subtype: null,
        color, colors: [color],
        value: PROPERTY_MONEY_VALUES[color],
        rentValues: RENT_VALUES[color],
        setSize: size, isRainbowWild: false,
      }));
    }
  }

  // Wild property cards — 11 total
  const wildDef = [
    { colors: ['lightBlue', 'brown'], qty: 1, value: 2 },
    { colors: ['lightBlue', 'railroad'], qty: 1, value: 4 },
    { colors: ['pink', 'orange'], qty: 2, value: 2 },
    { colors: ['red', 'yellow'], qty: 2, value: 3 },
    { colors: ['darkBlue', 'green'], qty: 1, value: 4 },
    { colors: ['green', 'railroad'], qty: 1, value: 4 },
    { colors: ['railroad', 'utility'], qty: 1, value: 2 },
    { colors: ['rainbow'], qty: 2, value: 0, isRainbow: true },
  ];
  for (const def of wildDef) {
    for (let i = 0; i < def.qty; i++) {
      cards.push(card({
        type: 'wildProperty', subtype: null,
        color: null, colors: def.colors,
        value: def.value,
        rentValues: [], setSize: 0, isRainbowWild: def.isRainbow || false,
      }));
    }
  }

  // Action cards — 34 total
  const actionDef = [
    { subtype: 'passGo', qty: 10, value: 1 },
    { subtype: 'dealBreaker', qty: 2, value: 5 },
    { subtype: 'forcedDeal', qty: 3, value: 3 },
    { subtype: 'slyDeal', qty: 3, value: 3 },
    { subtype: 'justSayNo', qty: 3, value: 4 },
    { subtype: 'debtCollector', qty: 3, value: 3 },
    { subtype: 'birthday', qty: 3, value: 2 },
    { subtype: 'doubleRent', qty: 2, value: 1 },
    { subtype: 'house', qty: 3, value: 3 },
    { subtype: 'hotel', qty: 2, value: 4 },
  ];
  for (const def of actionDef) {
    for (let i = 0; i < def.qty; i++) {
      cards.push(card({
        type: 'action', subtype: def.subtype,
        color: null, colors: [],
        value: def.value,
        rentValues: [], setSize: 0, isRainbowWild: false,
      }));
    }
  }

  // Rent cards — 13 total
  const rentDef = [
    { colors: ['lightBlue', 'brown'], qty: 2, value: 1, subtype: 'rent2color' },
    { colors: ['pink', 'orange'], qty: 2, value: 1, subtype: 'rent2color' },
    { colors: ['red', 'yellow'], qty: 2, value: 1, subtype: 'rent2color' },
    { colors: ['darkBlue', 'green'], qty: 2, value: 1, subtype: 'rent2color' },
    { colors: ['railroad', 'utility'], qty: 2, value: 1, subtype: 'rent2color' },
    { colors: ['rainbow'], qty: 3, value: 3, subtype: 'rentAny' },
  ];
  for (const def of rentDef) {
    for (let i = 0; i < def.qty; i++) {
      cards.push(card({
        type: 'rent', subtype: def.subtype,
        color: null, colors: def.colors,
        value: def.value,
        rentValues: [], setSize: 0, isRainbowWild: false,
      }));
    }
  }

  return shuffle(cards);
}

function shuffle(arr) {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

module.exports = { buildDeck, shuffle, SET_SIZES, RENT_VALUES, PROPERTY_MONEY_VALUES, ALL_COLORS };
