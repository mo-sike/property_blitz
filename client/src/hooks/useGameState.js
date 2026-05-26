import { useState, useCallback, useEffect } from 'react';
import { useSocket } from './useSocket';

const SESSION_KEY = 'pb_session';

function saveSession(roomCode, playerName) {
  try { localStorage.setItem(SESSION_KEY, JSON.stringify({ roomCode, playerName })); } catch {}
}
function clearSession() {
  try { localStorage.removeItem(SESSION_KEY); } catch {}
}
function loadSession() {
  try { return JSON.parse(localStorage.getItem(SESSION_KEY) || 'null'); } catch { return null; }
}

const initialState = {
  screen: 'lobby',
  playerName: '',
  roomCode: '',
  gameState: null,
  actionPrompt: null,
  errorMessage: null,
  myId: null,
  leaderboard: null,
  gameOverReason: null,
  chatMessages: [],
};

export function useGameState() {
  const [state, setState] = useState(initialState);

  const update = useCallback((patch) => setState(prev => ({ ...prev, ...patch })), []);

  const { emit, getSocketId, connected: socketConnected } = useSocket({
    game_state: (gs) => {
      setState(prev => ({
        ...prev,
        gameState: gs,
        myId: getSocketId(),
        // Auto-transition to game board when game is active (handles reconnect on reload)
        screen: gs.status === 'playing' ? 'game' : prev.screen,
      }));
    },
    game_started: (gs) => {
      update({ gameState: gs, screen: 'game', myId: getSocketId() });
    },
    game_over: ({ leaderboard, reason }) => {
      clearSession();
      update({ leaderboard, gameOverReason: reason, actionPrompt: null });
    },
    room_created: ({ roomCode }) => {
      setState(prev => {
        saveSession(roomCode, prev.playerName);
        return { ...prev, roomCode, myId: getSocketId() };
      });
    },
    room_joined: ({ roomCode, reconnected }) => {
      setState(prev => {
        saveSession(roomCode, prev.playerName);
        return {
          ...prev,
          roomCode,
          myId: getSocketId(),
          // On reconnect to an active game keep current screen; game_state will
          // flip it to 'game' momentarily. On fresh join go to lobby.
          screen: reconnected ? prev.screen : 'lobby',
        };
      });
    },
    action_prompt: (prompt) => {
      update({ actionPrompt: prompt, myId: getSocketId() });
    },
    just_say_no_played: () => {
      // actionPrompt will be updated by the subsequent action_prompt event
    },
    chat_message: (msg) => {
      setState(prev => ({
        ...prev,
        chatMessages: [...prev.chatMessages, msg].slice(-50),
      }));
    },
    error: ({ message }) => {
      // Clear stale session if the room no longer exists or we can't rejoin
      if (message === 'Room not found' || message === 'Game already in progress') {
        clearSession();
      }
      update({ errorMessage: message });
      setTimeout(() => update({ errorMessage: null }), 4000);
    },
  });

  // ── Auto-reconnect on (re)connect ─────────────────────────────────────────
  // Fires whenever the socket connects. If there's a saved session in
  // localStorage (set when creating/joining a room), automatically rejoin.
  // The server matches by playerName + disconnected status, so a page reload
  // during an active game seamlessly puts the player back in.
  useEffect(() => {
    if (!socketConnected) return;
    const saved = loadSession();
    if (saved?.roomCode && saved?.playerName) {
      setState(prev => ({ ...prev, playerName: saved.playerName }));
      emit('join_room', { roomCode: saved.roomCode, playerName: saved.playerName });
    }
  }, [socketConnected, emit]);

  const actions = {
    createRoom: (playerName) => {
      update({ playerName });
      emit('create_room', { playerName });
    },
    joinRoom: (roomCode, playerName) => {
      update({ playerName, roomCode });
      emit('join_room', { roomCode, playerName });
    },
    startGame: () => {
      emit('start_game', { roomCode: state.roomCode });
    },
    drawCards: () => {
      emit('draw_cards');
    },
    playCard: (payload) => {
      emit('play_card', payload);
    },
    justSayNo: () => {
      emit('just_say_no');
      update({ actionPrompt: null });
    },
    acceptAction: () => {
      emit('accept_action');
    },
    payDebt: (cardIds) => {
      emit('pay_debt', { cards: cardIds });
      update({ actionPrompt: null });
    },
    endTurn: () => {
      emit('end_turn');
    },
    discardCards: (cardIds) => {
      emit('discard_cards', { cardIds });
    },
    reassignWild: (cardId, newColor) => {
      emit('reassign_wild', { cardId, newColor });
    },
    endGame: () => {
      emit('end_game');
    },
    sendChat: (text) => {
      emit('chat_message', { text });
    },
    clearError: () => update({ errorMessage: null }),
    setScreen: (screen) => update({ screen }),
  };

  return { state: { ...state, socketConnected }, actions };
}
