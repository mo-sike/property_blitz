import { useState, useCallback } from 'react';
import { useSocket } from './useSocket';

const initialState = {
  screen: 'lobby',
  playerName: '',
  roomCode: '',
  gameState: null,
  actionPrompt: null,
  errorMessage: null,
  myId: null,
};

export function useGameState() {
  const [state, setState] = useState(initialState);

  const update = useCallback((patch) => setState(prev => ({ ...prev, ...patch })), []);

  const { emit, getSocketId } = useSocket({
    game_state: (gs) => {
      update({ gameState: gs, myId: getSocketId() });
    },
    game_started: (gs) => {
      update({ gameState: gs, screen: 'game', myId: getSocketId() });
    },
    game_over: ({ winner }) => {
      update({ actionPrompt: null });
      // gameState will be updated via game_state event
    },
    room_created: ({ roomCode }) => {
      update({ roomCode, myId: getSocketId() });
    },
    room_joined: ({ roomCode }) => {
      update({ roomCode, screen: 'lobby', myId: getSocketId() });
    },
    action_prompt: (prompt) => {
      update({ actionPrompt: prompt, myId: getSocketId() });
    },
    just_say_no_played: (data) => {
      // actionPrompt will be updated by subsequent action_prompt event
    },
    error: ({ message }) => {
      update({ errorMessage: message });
      setTimeout(() => update({ errorMessage: null }), 4000);
    },
  });

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
    clearError: () => update({ errorMessage: null }),
    setScreen: (screen) => update({ screen }),
  };

  return { state, actions };
}
