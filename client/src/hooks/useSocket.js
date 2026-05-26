import { useEffect, useRef, useCallback, useState } from 'react';
import { io } from 'socket.io-client';

const SERVER_URL = import.meta.env.VITE_SERVER_URL || '';

let sharedSocket = null;

export function useSocket(handlers) {
  const handlersRef = useRef(handlers);
  handlersRef.current = handlers;
  const [connected, setConnected] = useState(sharedSocket?.connected ?? false);

  useEffect(() => {
    if (!sharedSocket) {
      sharedSocket = io(SERVER_URL, { autoConnect: true, transports: ['polling', 'websocket'] });
    }
    const socket = sharedSocket;

    // Sync initial state
    setConnected(socket.connected);

    const onConnect    = () => setConnected(true);
    const onDisconnect = () => setConnected(false);
    socket.on('connect',    onConnect);
    socket.on('disconnect', onDisconnect);

    const events = [
      'game_state', 'game_started', 'game_over', 'room_created', 'room_joined',
      'action_prompt', 'just_say_no_played', 'error', 'chat_message',
    ];

    const listeners = {};
    for (const ev of events) {
      listeners[ev] = (data) => {
        if (handlersRef.current[ev]) handlersRef.current[ev](data);
      };
      socket.on(ev, listeners[ev]);
    }

    return () => {
      socket.off('connect',    onConnect);
      socket.off('disconnect', onDisconnect);
      for (const ev of events) socket.off(ev, listeners[ev]);
    };
  }, []);

  const emit = useCallback((event, data) => {
    if (sharedSocket) sharedSocket.emit(event, data);
  }, []);

  const getSocketId = useCallback(() => sharedSocket?.id, []);

  return { emit, getSocketId, connected };
}
