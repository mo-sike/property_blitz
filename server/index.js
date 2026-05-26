const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const {
  createRoom, joinRoom, startGame,
  getRoom, getRoomBySocket, removeSocket,
  getCurrentPlayer, advanceTurn, doDrawPhase,
  checkAndSetWinner, calculateLeaderboard, finalizeDisconnect,
} = require('./game/state');

const {
  playCard, handleJustSayNo, handleAccept, handlePayDebt, reassignWild,
} = require('./game/actions');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: '*', methods: ['GET', 'POST'] },
  allowEIO3: true,
  transports: ['polling', 'websocket'],
});

const PORT = process.env.PORT || 3001;

// Broadcast full game state to all sockets in the room
function broadcast(room) {
  io.to(room.roomCode).emit('game_state', sanitize(room));
}

function emitGameOver(room, reason = 'win') {
  if (room.status !== 'finished') room.status = 'finished';
  const leaderboard = calculateLeaderboard(room);
  io.to(room.roomCode).emit('game_over', { leaderboard, reason });
}

// For now, send full state (clients display only what they need)
function sanitize(room) {
  return {
    roomCode: room.roomCode,
    status: room.status,
    hostId: room.hostId,
    players: room.players.map(p => ({
      id: p.id,
      name: p.name,
      hand: p.hand,
      bank: p.bank,
      properties: p.properties,
      connected: p.connected,
      handCount: p.hand.length,
    })),
    drawPileCount: room.drawPile.length,
    discardPile: room.discardPile.slice(-5), // last 5 discards
    currentPlayerIndex: room.currentPlayerIndex,
    playsRemainingThisTurn: room.playsRemainingThisTurn,
    doubleRentActive: room.doubleRentActive,
    pendingAction: room.pendingAction
      ? {
          type: room.pendingAction.type,
          fromPlayerId: room.pendingAction.fromPlayerId,
          originalTargetId: room.pendingAction.originalTargetId,
          currentResponderId: room.pendingAction.currentResponderId,
          amount: room.pendingAction.amount,
          details: room.pendingAction.details,
          jsnDepth: room.pendingAction.jsnDepth,
          phase: room.pendingAction.phase,
          remainingCount: room.pendingAction.remainingTargets.length,
        }
      : null,
    winner: room.winner,
    hasDrawnThisTurn: room.hasDrawnThisTurn,
  };
}

io.on('connection', (socket) => {
  console.log(`Connected: ${socket.id}`);

  socket.on('create_room', ({ playerName }) => {
    if (!playerName?.trim()) return socket.emit('error', { message: 'Name required' });
    const room = createRoom(socket.id, playerName.trim());
    socket.join(room.roomCode);
    socket.emit('room_created', { roomCode: room.roomCode });
    broadcast(room);
  });

  socket.on('join_room', ({ roomCode, playerName }) => {
    if (!roomCode?.trim() || !playerName?.trim()) {
      return socket.emit('error', { message: 'Room code and name required' });
    }
    const result = joinRoom(roomCode.toUpperCase(), socket.id, playerName.trim());
    if (result.error) return socket.emit('error', { message: result.error });
    socket.join(result.room.roomCode);
    socket.emit('room_joined', { roomCode: result.room.roomCode, reconnected: result.reconnected });
    broadcast(result.room);
  });

  socket.on('start_game', ({ roomCode }) => {
    const room = getRoom(roomCode);
    if (!room) return socket.emit('error', { message: 'Room not found' });
    if (room.hostId !== socket.id) return socket.emit('error', { message: 'Only host can start' });
    if (room.players.length < 2) return socket.emit('error', { message: 'Need at least 2 players' });
    const started = startGame(roomCode);
    if (!started) return socket.emit('error', { message: 'Could not start game' });
    io.to(roomCode).emit('game_started', sanitize(started));
    broadcast(started);
  });

  socket.on('draw_cards', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.status !== 'playing') return;
    const current = getCurrentPlayer(room);
    if (!current || current.id !== socket.id) return socket.emit('error', { message: 'Not your turn' });
    if (room.hasDrawnThisTurn) return socket.emit('error', { message: 'Already drew cards this turn' });
    if (room.pendingAction) return socket.emit('error', { message: 'Resolve pending action first' });
    doDrawPhase(room);
    broadcast(room);
  });

  socket.on('play_card', (payload) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.status !== 'playing') return socket.emit('error', { message: 'Game not active' });
    const current = getCurrentPlayer(room);
    if (!current || current.id !== socket.id) return socket.emit('error', { message: 'Not your turn' });
    if (!room.hasDrawnThisTurn) return socket.emit('error', { message: 'Draw cards first' });
    if (room.pendingAction) return socket.emit('error', { message: 'Resolve pending action first' });

    const result = playCard(room, socket.id, payload);
    if (result.error) return socket.emit('error', { message: result.error });

    const playingPlayer = room.players.find(p => p.id === socket.id);
    if (playingPlayer) playingPlayer.cardsPlayed++;

    if (room.winner) {
      broadcast(room);
      emitGameOver(room);
      return;
    }

    broadcast(room);

    if (result.pendingAction) {
      const pa = room.pendingAction;
      io.to(room.roomCode).emit('action_prompt', {
        type: pa.type,
        fromPlayerId: pa.fromPlayerId,
        fromPlayerName: room.players.find(p => p.id === pa.fromPlayerId)?.name,
        targetPlayerId: pa.currentResponderId,
        amount: pa.amount,
        details: pa.details,
        canJustSayNo: true,
        phase: pa.phase,
      });
    }
  });

  socket.on('just_say_no', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const result = handleJustSayNo(room, socket.id);
    if (result.error) return socket.emit('error', { message: result.error });

    broadcast(room);
    const pa = room.pendingAction;
    io.to(room.roomCode).emit('just_say_no_played', {
      byPlayerId: socket.id,
      byPlayerName: room.players.find(p => p.id === socket.id)?.name,
      newResponderId: pa.currentResponderId,
      jsnDepth: pa.jsnDepth,
    });
    io.to(room.roomCode).emit('action_prompt', {
      type: pa.type,
      fromPlayerId: pa.fromPlayerId,
      fromPlayerName: room.players.find(p => p.id === pa.fromPlayerId)?.name,
      targetPlayerId: pa.currentResponderId,
      amount: pa.amount,
      details: pa.details,
      canJustSayNo: true,
      jsnDepth: pa.jsnDepth,
      phase: pa.phase,
    });
  });

  socket.on('accept_action', () => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const result = handleAccept(room, socket.id);
    if (result.error) return socket.emit('error', { message: result.error });

    if (room.winner) {
      broadcast(room);
      emitGameOver(room);
      return;
    }

    broadcast(room);

    if (result.needsPayment && room.pendingAction) {
      io.to(room.roomCode).emit('action_prompt', {
        type: room.pendingAction.type,
        phase: 'payment',
        targetPlayerId: room.pendingAction.currentResponderId,
        amount: room.pendingAction.amount,
        fromPlayerId: room.pendingAction.fromPlayerId,
        fromPlayerName: room.players.find(p => p.id === room.pendingAction.fromPlayerId)?.name,
        details: room.pendingAction.details,
      });
    } else if (result.nextTarget && room.pendingAction) {
      io.to(room.roomCode).emit('action_prompt', {
        type: room.pendingAction.type,
        fromPlayerId: room.pendingAction.fromPlayerId,
        fromPlayerName: room.players.find(p => p.id === room.pendingAction.fromPlayerId)?.name,
        targetPlayerId: room.pendingAction.currentResponderId,
        amount: room.pendingAction.amount,
        details: room.pendingAction.details,
        canJustSayNo: true,
        phase: 'jsnWindow',
      });
    }
  });

  socket.on('pay_debt', ({ cards: cardIds }) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const result = handlePayDebt(room, socket.id, cardIds || []);
    if (result.error) return socket.emit('error', { message: result.error });

    if (room.winner) {
      broadcast(room);
      emitGameOver(room);
      return;
    }

    broadcast(room);

    if (result.nextTarget && room.pendingAction) {
      io.to(room.roomCode).emit('action_prompt', {
        type: room.pendingAction.type,
        fromPlayerId: room.pendingAction.fromPlayerId,
        fromPlayerName: room.players.find(p => p.id === room.pendingAction.fromPlayerId)?.name,
        targetPlayerId: room.pendingAction.currentResponderId,
        amount: room.pendingAction.amount,
        details: room.pendingAction.details,
        canJustSayNo: true,
        phase: 'jsnWindow',
      });
    }
  });

  socket.on('reassign_wild', ({ cardId, newColor }) => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.status !== 'playing') return;
    if (room.pendingAction) return socket.emit('error', { message: 'Resolve pending action first' });
    const current = getCurrentPlayer(room);
    if (!current || current.id !== socket.id) return socket.emit('error', { message: 'Not your turn' });
    const result = reassignWild(room, socket.id, cardId, newColor);
    if (result.error) return socket.emit('error', { message: result.error });
    broadcast(room);
  });

  socket.on('end_turn', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.status !== 'playing') return;
    const current = getCurrentPlayer(room);
    if (!current || current.id !== socket.id) return socket.emit('error', { message: 'Not your turn' });
    if (room.pendingAction) return socket.emit('error', { message: 'Resolve pending action first' });

    // Check discard requirement
    if (current.hand.length > 7) {
      return socket.emit('error', { message: 'Discard down to 7 cards first' });
    }

    advanceTurn(room);

    const winner = checkAndSetWinner(room);
    if (winner) {
      broadcast(room);
      emitGameOver(room);
      return;
    }

    broadcast(room);
  });

  socket.on('discard_cards', ({ cardIds }) => {
    const room = getRoomBySocket(socket.id);
    if (!room) return;
    const current = getCurrentPlayer(room);
    if (!current || current.id !== socket.id) return socket.emit('error', { message: 'Not your turn' });

    const player = current;
    if (player.hand.length <= 7) return socket.emit('error', { message: 'Hand is already 7 or fewer' });

    const toDiscard = cardIds || [];
    const excess = player.hand.length - 7;
    if (toDiscard.length !== excess) {
      return socket.emit('error', { message: `Must discard exactly ${excess} card(s)` });
    }

    for (const id of toDiscard) {
      const idx = player.hand.findIndex(c => c.id === id);
      if (idx !== -1) {
        const [removed] = player.hand.splice(idx, 1);
        room.discardPile.push(removed);
      }
    }

    broadcast(room);
  });

  socket.on('end_game', () => {
    const room = getRoomBySocket(socket.id);
    if (!room || room.status !== 'playing') return;
    const player = room.players.find(p => p.id === socket.id);
    if (!player || !player.connected) return;
    emitGameOver(room, 'manual');
    broadcast(room);
  });

  socket.on('disconnect', () => {
    console.log(`Disconnected: ${socket.id}`);
    const disconnectedId = socket.id;
    const room = removeSocket(disconnectedId);
    if (!room) return;
    broadcast(room);

    if (room.status === 'playing') {
      // End the game if player is still disconnected after 3 minutes
      setTimeout(() => {
        const player = room.players.find(p => p.id === disconnectedId);
        if (player && !player.connected && room.status === 'playing') {
          emitGameOver(room, 'disconnect_timeout');
          broadcast(room);
        }
      }, 3 * 60 * 1000);
    } else {
      // Lobby: remove player cleanly after 60 seconds
      setTimeout(() => finalizeDisconnect(disconnectedId), 60 * 1000);
    }
  });
});

app.get('/health', (_, res) => res.json({ ok: true }));

server.listen(PORT, () => {
  console.log(`Property Blitz server running on port ${PORT}`);
});
