const { buildDeck, shuffle, ALL_COLORS } = require('./deck');
const { checkWin } = require('./rules');

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
    doubleRentActive: false,
    pendingAction: null,
    winner: null,
    hasDrawnThisTurn: false,
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
  room.doubleRentActive = false;

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
    // Clean up after 60 seconds if still disconnected
    setTimeout(() => {
      const p = room.players.find(x => x.id === socketId);
      if (p && !p.connected && p.disconnectTime && Date.now() - p.disconnectTime >= 60000) {
        room.players = room.players.filter(x => x.id !== socketId);
        socketToRoom.delete(socketId);
        if (room.players.length === 0) rooms.delete(room.roomCode);
      }
    }, 61000);
  }

  socketToRoom.delete(socketId);
  return room;
}

function getCurrentPlayer(room) {
  return room.players[room.currentPlayerIndex] || null;
}

function advanceTurn(room) {
  // Reset doubleRent on turn change
  room.doubleRentActive = false;
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
  const hasAnyCards = player.hand.length > 0 ||
    player.bank.length > 0 ||
    Object.values(player.properties).some(arr => arr.length > 0);

  const count = hasAnyCards ? 2 : 5;
  drawCards(room, player, count);
  room.hasDrawnThisTurn = true;
}

function checkAndSetWinner(room) {
  for (const player of room.players) {
    if (checkWin(player)) {
      room.winner = player.id;
      room.status = 'finished';
      return player;
    }
  }
  return null;
}

module.exports = {
  createRoom, joinRoom, startGame,
  getRoom, getRoomBySocket, removeSocket,
  getCurrentPlayer, advanceTurn, doDrawPhase,
  drawCards, checkAndSetWinner, makeEmptyProperties,
};
