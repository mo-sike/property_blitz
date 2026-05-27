const { buildDeck, shuffle, ALL_COLORS } = require('./deck');
const { checkWin, getCompleteSets } = require('./rules');

const rooms = new Map();
const socketToRoom = new Map();

function makeEmptyProperties() {
  const p = {};
  for (const c of ALL_COLORS) p[c] = [];
  return p;
}

function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let code;
  do {
    code = Array.from({ length: 4 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
  } while (rooms.has(code));
  return code;
}

function createRoom(socketId, playerName) {
  const code = generateRoomCode();
  const room = {
    roomCode: code,
    hostId: socketId,
    status: 'waiting',
    players: [makePlayer(socketId, playerName)],
    drawPile: [],
    discardPile: [],
    currentPlayerIndex: 0,
    playsRemainingThisTurn: 3,
    pendingAction: null,
    winner: null,
    hasDrawnThisTurn: false,
    moveLog: [],
  };
  rooms.set(code, room);
  socketToRoom.set(socketId, code);
  return room;
}

function makePlayer(socketId, name) {
  return {
    id: socketId,
    name,
    hand: [],
    bank: [],
    properties: makeEmptyProperties(),
    connected: true,
    disconnectTime: null,
    cardsPlayed: 0,
  };
}

function joinRoom(roomCode, socketId, playerName) {
  const room = rooms.get(roomCode);
  if (!room) return { error: 'Room not found' };
  if (room.status !== 'waiting') {
    // Allow reconnect during game
    const existing = room.players.find(p => p.name === playerName && !p.connected);
    if (existing) {
      const oldId = existing.id;
      socketToRoom.delete(oldId);
      existing.id = socketId;
      existing.connected = true;
      existing.disconnectTime = null;
      socketToRoom.set(socketId, roomCode);
      // Update pendingAction references
      if (room.pendingAction) {
        if (room.pendingAction.fromPlayerId === oldId) room.pendingAction.fromPlayerId = socketId;
        if (room.pendingAction.currentResponderId === oldId) room.pendingAction.currentResponderId = socketId;
        if (room.pendingAction.originalTargetId === oldId) room.pendingAction.originalTargetId = socketId;
        room.pendingAction.remainingTargets = room.pendingAction.remainingTargets.map(id => id === oldId ? socketId : id);
      }
      if (room.players[room.currentPlayerIndex] && room.players[room.currentPlayerIndex].id === oldId) {
        // currentPlayerIndex still valid, id updated
      }
      return { room, reconnected: true };
    }
    return { error: 'Game already in progress' };
  }
  if (room.players.length >= 5) return { error: 'Room is full' };
  if (room.players.find(p => p.name === playerName)) return { error: 'Name already taken' };

  room.players.push(makePlayer(socketId, playerName));
  socketToRoom.set(socketId, roomCode);
  return { room };
}

function startGame(roomCode) {
  const room = rooms.get(roomCode);
  if (!room || room.status !== 'waiting') return null;
  if (room.players.length < 2) return null;

  const deck = buildDeck();
  const playerCount = room.players.length;
  let idx = 0;

  for (const player of room.players) {
    player.hand = deck.slice(idx, idx + 5);
    idx += 5;
  }

  room.drawPile = deck.slice(idx);
  room.discardPile = [];
  room.status = 'playing';
  room.currentPlayerIndex = 0;
  room.playsRemainingThisTurn = 3;
  room.hasDrawnThisTurn = false;
  room.winner = null;
  room.pendingAction = null;

  return room;
}

function drawCards(room, player, count) {
  const drawn = [];
  for (let i = 0; i < count; i++) {
    if (room.drawPile.length === 0) {
      if (room.discardPile.length === 0) break;
      room.drawPile = shuffle(room.discardPile);
      room.discardPile = [];
    }
    drawn.push(room.drawPile.shift());
  }
  player.hand.push(...drawn);
  return drawn;
}

function getRoom(roomCode) {
  return rooms.get(roomCode) || null;
}

function getRoomBySocket(socketId) {
  const code = socketToRoom.get(socketId);
  return code ? rooms.get(code) : null;
}

function removeSocket(socketId) {
  const room = getRoomBySocket(socketId);
  if (!room) return null;
  const player = room.players.find(p => p.id === socketId);
  if (player) {
    player.connected = false;
    player.disconnectTime = Date.now();
  }
  socketToRoom.delete(socketId);
  return room;
}

// Remove a disconnected player from their room (used for lobby cleanup)
function finalizeDisconnect(socketId) {
  for (const [code, room] of rooms) {
    const idx = room.players.findIndex(p => p.id === socketId && !p.connected);
    if (idx !== -1) {
      room.players.splice(idx, 1);
      if (room.players.length === 0) rooms.delete(code);
      return;
    }
  }
}

function calculateLeaderboard(room) {
  const entries = room.players.map(p => {
    const bankValue = (p.bank || []).reduce((s, c) => s + (c.value || 0), 0);
    const propValue = Object.values(p.properties || {}).flat().reduce((s, c) => s + (c.value || 0), 0);
    return {
      id: p.id,
      name: p.name,
      totalValue: bankValue + propValue,
      bankValue,
      propValue,
      cardsPlayed: p.cardsPlayed || 0,
      completeSets: getCompleteSets(p).length,
      isWinner: room.winner === p.id,
    };
  });

  entries.sort((a, b) => {
    if (a.isWinner !== b.isWinner) return a.isWinner ? -1 : 1;
    if (b.totalValue !== a.totalValue) return b.totalValue - a.totalValue;
    return a.cardsPlayed - b.cardsPlayed;
  });

  return entries.map((e, i) => ({ ...e, rank: i + 1 }));
}

function getCurrentPlayer(room) {
  return room.players[room.currentPlayerIndex] || null;
}

function advanceTurn(room) {
  room.hasDrawnThisTurn = false;

  let nextIdx = (room.currentPlayerIndex + 1) % room.players.length;
  // Skip disconnected players
  let attempts = 0;
  while (!room.players[nextIdx].connected && attempts < room.players.length) {
    nextIdx = (nextIdx + 1) % room.players.length;
    attempts++;
  }
  room.currentPlayerIndex = nextIdx;
  room.playsRemainingThisTurn = 3;
  room.pendingAction = null;
}

function doDrawPhase(room) {
  const player = getCurrentPlayer(room);
  // Official rule: draw 5 if hand is empty at start of turn, otherwise draw 2
  const count = player.hand.length === 0 ? 5 : 2;
  drawCards(room, player, count);
  room.hasDrawnThisTurn = true;
}

// Win can only be declared on the current player's own turn.
// If a player completes their 3rd set during an opponent's action,
// the win is detected at the start of their next turn (draw_cards).
function checkAndSetWinner(room) {
  const player = getCurrentPlayer(room);
  if (!player) return null;
  if (checkWin(player)) {
    room.winner = player.id;
    room.status = 'finished';
    return player;
  }
  return null;
}

module.exports = {
  createRoom, joinRoom, startGame,
  getRoom, getRoomBySocket, removeSocket,
  getCurrentPlayer, advanceTurn, doDrawPhase,
  drawCards, checkAndSetWinner, makeEmptyProperties,
  finalizeDisconnect, calculateLeaderboard,
};
