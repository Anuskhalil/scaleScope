const { Server } = require('socket.io');
const supabase = require('./supabase');
const { createMessage, triggerAIReply } = require('../services/messaging.service');
const { allowedOrigins } = require('./cors');

let io;
const onlineUsers = new Map();

exports.isUserOnline = (userId) => {
  return onlineUsers.has(userId);
};

async function getOtherParticipantId(convId, senderId) {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', convId);

  if (error) {
    console.error('Failed to get other participant:', error);
    return null;
  }

  return (data || []).find((p) => p.user_id !== senderId)?.user_id || null;
}

exports.setupSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  io.use(async (socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) return next(new Error('Auth required'));

    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) return next(new Error('Invalid token'));

    socket.data.userId = user.id;
    next();
  });

  io.on('connection', (socket) => {
    console.log(`🔌 Connected: ${socket.data.userId}`);

    onlineUsers.set(socket.data.userId, socket.id);
    socket.join(`user:${socket.data.userId}`);

    socket.on('join:conv', (convId) => {
      socket.join(`conv:${convId}`);
    });

    socket.on('msg:send', async ({ convId, content }) => {
      if (!content?.trim()) return;

      try {
        const msg = await createMessage(convId, socket.data.userId, content);

        io.to(`conv:${convId}`).emit('msg:new', msg);

        const otherUserId = await getOtherParticipantId(convId, socket.data.userId);
        const receiverOnline = otherUserId ? onlineUsers.has(otherUserId) : false;

        if (!receiverOnline) {
          setTimeout(async () => {
            try {
              const aiMsg = await triggerAIReply(msg, convId, {
                receiverOnline,
              });

              if (aiMsg) {
                io.to(`conv:${convId}`).emit('msg:new', aiMsg);
              }
            } catch (err) {
              console.error('AI reply background error:', err);
            }
          }, 2500);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.data.userId);
      console.log(`🔌 Disconnected: ${socket.data.userId}`);
    });
  });

  return io;
};

exports.getIO = () => io;