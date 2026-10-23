import { io } from 'socket.io-client';
import { supabase } from './supabaseClient';

let socket = null;
let socketUserId = null;

export const initSocket = async (userId) => {
  const { data } = await supabase.auth.getSession();
  if (!data.session || data.session.user.id !== userId) return null;
  if (socket && socketUserId === userId) return socket;
  socket?.disconnect();
  socketUserId = userId;
  
  socket = io(import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001', {
    auth: async (callback) => {
      const { data: latest } = await supabase.auth.getSession();
      callback({ token: latest.session?.user.id === userId ? latest.session.access_token : '' });
    },
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
    socketUserId = null;
  }
};

supabase.auth.onAuthStateChange((event) => {
  if (event === 'SIGNED_OUT') disconnectSocket();
});
