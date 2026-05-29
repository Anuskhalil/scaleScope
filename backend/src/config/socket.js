const { Server } = require('socket.io');
const { corsOptions } = require('./cors');
const supabase = require('./supabase');
const { createMessage, triggerAIReply } = require('../services/messaging.service');

let io;
const onlineUsers = new Map();
const AUTO_REPLY_DELAY_MS = Number(process.env.AUTO_REPLY_DELAY_MS || 60 * 1000);

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
  io = new Server(server, {
    cors: {
      origin: corsOptions.origin,
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
    io.emit('presence:update', {
      userId: socket.data.userId,
      online: true,
    });

    socket.on('join:conv', async (convId) => {
      if (!convId) return;

      const { data: membership, error } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('conversation_id', convId)
        .eq('user_id', socket.data.userId)
        .maybeSingle();

      if (error || !membership) {
        socket.emit('error', { message: 'Conversation access denied' });
        return;
      }

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
              const stillOnline = otherUserId ? onlineUsers.has(otherUserId) : false;

              if (stillOnline) {
                console.log('AI reply skipped: receiver returned before auto-reply');
                return;
              }

              const aiMsg = await triggerAIReply(msg, convId, {
                receiverOnline: stillOnline,
                isReceiverOnline: (userId) => onlineUsers.has(userId),
              });

              if (aiMsg) {
                io.to(`conv:${convId}`).emit('msg:new', aiMsg);
              }
            } catch (err) {
              console.error('AI reply background error:', err);
            }
          }, AUTO_REPLY_DELAY_MS);
        }
      } catch (err) {
        socket.emit('error', { message: err.message });
      }
    });

    socket.on('disconnect', () => {
      onlineUsers.delete(socket.data.userId);
      io.emit('presence:update', {
        userId: socket.data.userId,
        online: false,
      });
      console.log(`🔌 Disconnected: ${socket.data.userId}`);
    });
  });

  return io;
};

exports.getIO = () => io;
