import { io } from 'socket.io-client';
import { supabase } from './supabaseClient';

let socket = null;

export const initSocket = async (userId) => {
  if (socket?.connected) return socket;

  const { data } = await supabase.auth.getSession();
  
  socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
    auth: { token: data.session?.access_token },
    transports: ['websocket', 'polling']
  });

  socket.on('connect', () => {
    console.log('🔌 Socket connected');
    socket.emit('authenticate', userId);
  });

  socket.on('connect_error', (err) => {
    console.error('Socket error:', err.message);
  });

  return socket;
};

export const getSocket = () => socket;

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
};