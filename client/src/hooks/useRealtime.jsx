// client/src/hooks/useRealtime.jsx — Simplified version
import { useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { initSocket, getSocket } from '../lib/socketClient';
import toast from 'react-hot-toast';

export const useRealtime = ({ onConnectionRequest, onConnectionResponse, onMessage, onConvCreated } = {}) => {
  const { user } = useAuth();

  const handleConnRequest = useCallback((payload) => {
    toast.custom((t) => (
      <div className="bg-white p-4 rounded-xl shadow-lg border border-gray-200 max-w-sm">
        <p className="font-semibold text-gray-900 mb-2">🤝 New Connection Request</p>
        <p className="text-sm text-gray-600 mb-3">From: {payload.senderName || 'User'}</p>
        {payload.message && <p className="text-xs text-gray-500 italic mb-3">"{payload.message}"</p>}
        <div className="flex gap-2">
          <button onClick={() => { /* handle accept */ }} className="flex-1 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg">Accept</button>
          <button onClick={() => toast.dismiss(t)} className="flex-1 py-1.5 border border-gray-200 text-xs font-bold rounded-lg">Decline</button>
        </div>
      </div>
    ), { duration: 10000 });
    onConnectionRequest?.(payload);
  }, [onConnectionRequest]);

  const handleConnResponse = useCallback((payload) => {
    if (payload.action === 'accept') {
      toast.success('You are now connected! 🎉', { style: { background: '#98DE38', color: '#000' } });
    }
    onConnectionResponse?.(payload);
  }, [onConnectionResponse]);

  const handleMessage = useCallback((payload) => {
    toast.success(`New message: ${payload.content.slice(0, 30)}...`);
    onMessage?.(payload);
  }, [onMessage]);

  const handleConvCreated = useCallback((payload) => {
    toast.success('Chat ready! Start messaging.');
    onConvCreated?.(payload);
  }, [onConvCreated]);

  useEffect(() => {
    if (!user) return;
    
    let socket;
    const setup = async () => {
      socket = await initSocket(user.id);
      socket.on('conn:request', handleConnRequest);
      socket.on('conn:response', handleConnResponse);
      socket.on('msg:new', handleMessage);
      socket.on('conv:created', handleConvCreated);
    };
    
    setup();
    
    return () => {
      socket?.off('conn:request', handleConnRequest);
      socket?.off('conn:response', handleConnResponse);
      socket?.off('msg:new', handleMessage);
      socket?.off('conv:created', handleConvCreated);
    };
  }, [user, handleConnRequest, handleConnResponse, handleMessage, handleConvCreated]);
};