import React from 'react';
import { useGameState } from './hooks/useGameState';
import Lobby from './components/Lobby';
import Board from './components/Board';

export default function App() {
  const { state, actions } = useGameState();

  // Show the Board for both 'playing' and 'finished' states — the Leaderboard
  // overlay renders on top of the Board when the game ends (status === 'finished').
  if (state.screen === 'game' && state.gameState) {
    return <Board state={state} actions={actions} />;
  }

  return <Lobby state={state} actions={actions} />;
}
