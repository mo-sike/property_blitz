import React from 'react';
import { useGameState } from './hooks/useGameState';
import Lobby from './components/Lobby';
import Board from './components/Board';

export default function App() {
  const { state, actions } = useGameState();

  if (state.screen === 'game' && state.gameState?.status === 'playing') {
    return <Board state={state} actions={actions} />;
  }

  return <Lobby state={state} actions={actions} />;
}
