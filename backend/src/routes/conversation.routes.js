const express = require('express');
const auth = require('../middlewares/auth.middleware');
const supabase = require('../config/supabase');
const { getIO, isUserOnline } = require('../config/socket');
const { createMessage } = require('../services/messaging.service');

const router = express.Router();

router.use(auth);

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => UUID_RE.test(String(value || ''));

router.post('/with/:otherUserId', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    if (!isUuid(otherUserId)) {
      return res.status(400).json({ error: 'Valid otherUserId is required' });
    }

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const { data: connection, error: connectionError } = await supabase
      .from('connections')
      .select('id')
      .or(
        `and(user_1.eq.${currentUserId},user_2.eq.${otherUserId}),and(user_1.eq.${otherUserId},user_2.eq.${currentUserId})`
      )
      .maybeSingle();

    if (connectionError) throw connectionError;

    if (!connection) {
      return res.status(403).json({ error: 'Connect first before opening a conversation' });
    }

    const { data, error } = await supabase.rpc(
      'create_conversation_with_participants',
      {
        p_created_by: currentUserId,
        p_other_user: otherUserId,
        p_type: 'direct',
      }
    );

    if (error) {
      throw new Error(
        `Conversation setup failed. Please run the create_conversation_with_participants SQL function. ${error.message}`
      );
    }

    res.json({
      success: true,
      conversationId: data,
    });
  } catch (e) {
    console.error('Create conversation error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.get('/', async (req, res) => {
  try {
    const userId = req.user.id;

    const { data: myParticipants, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (partError) throw partError;

    const conversationIds = (myParticipants || [])
      .map((p) => p.conversation_id)
      .filter(Boolean);

    if (!conversationIds.length) {
      return res.json({ success: true, data: [] });
    }

    const [conversationsRes, participantsRes, messagesRes] = await Promise.all([
      supabase
        .from('conversations')
        .select('id, type, title, last_message_at, created_at')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false }),

      supabase
        .from('conversation_participants')
        .select('conversation_id, user_id, last_read_at')
        .in('conversation_id', conversationIds),

      supabase
        .from('messages')
        .select('id, conversation_id, content, sender_id, created_at, updated_at, is_ai_generated')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true }),
    ]);

    if (conversationsRes.error) throw conversationsRes.error;
    if (participantsRes.error) throw participantsRes.error;
    if (messagesRes.error) throw messagesRes.error;

    const allParticipants = participantsRes.data || [];
    const allMessages = messagesRes.data || [];

    const otherUserIds = [
      ...new Set(
        allParticipants
          .filter((p) => p.user_id !== userId)
          .map((p) => p.user_id)
          .filter(Boolean)
      ),
    ];

    const { data: profiles, error: profilesError } = otherUserIds.length
      ? await supabase
          .from('profiles')
          .select('id, full_name, user_type, avatar_url, location')
          .in('id', otherUserIds)
      : { data: [], error: null };

    if (profilesError) throw profilesError;

    const profileById = new Map((profiles || []).map((p) => [p.id, p]));

    const result = (conversationsRes.data || []).map((conv) => {
      const currentParticipant = myParticipants.find(
        (p) => p.conversation_id === conv.id
      );

      const otherParticipant = allParticipants.find(
        (p) => p.conversation_id === conv.id && p.user_id !== userId
      );

      const convMessages = allMessages.filter(
        (m) => m.conversation_id === conv.id
      );

      const lastMessage = convMessages.reduce((latest, msg) => {
        if (!latest) return msg;
        return new Date(msg.created_at) > new Date(latest.created_at)
          ? msg
          : latest;
      }, null);

      const unreadCount = convMessages.filter((msg) => {
        return (
          msg.sender_id !== userId &&
          (!currentParticipant?.last_read_at ||
            new Date(msg.created_at) > new Date(currentParticipant.last_read_at))
        );
      }).length;

      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        last_message_at: conv.last_message_at,
        otherUser: otherParticipant
          ? {
              ...profileById.get(otherParticipant.user_id),
              isOnline: isUserOnline(otherParticipant.user_id),
              last_read_at: otherParticipant.last_read_at,
            }
          : null,
        lastMessage,
        unreadCount,
      };
    });

    res.json({ success: true, data: result });
  } catch (e) {
    console.error('Fetch conversations error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.get('/:conversationId/messages', async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.conversationId;

    if (!isUuid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversationId' });
    }

    const { data: membership, error: memberError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, user_id, last_read_at')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!membership) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

    const { data: participants, error: participantsError } = await supabase
      .from('conversation_participants')
      .select('user_id, last_read_at')
      .eq('conversation_id', conversationId);

    if (participantsError) throw participantsError;

    const otherParticipant = (participants || []).find((p) => p.user_id !== userId);

    const { data, error } = await supabase
      .from('messages')
      .select(`
        id,
        conversation_id,
        sender_id,
        content,
        type,
        file_url,
        file_name,
        file_size,
        is_ai_generated,
        created_at,
        updated_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    const messages = (data || []).map((message) => ({
      ...message,
      seen_by_other:
        message.sender_id === userId &&
        Boolean(otherParticipant?.last_read_at) &&
        new Date(otherParticipant.last_read_at) >= new Date(message.created_at),
    }));

    res.json({
      success: true,
      data: messages,
      meta: {
        otherUserId: otherParticipant?.user_id || null,
        otherUserOnline: otherParticipant?.user_id ? isUserOnline(otherParticipant.user_id) : false,
        otherLastReadAt: otherParticipant?.last_read_at || null,
      },
    });
  } catch (e) {
    console.error('Fetch conversation messages error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:conversationId/messages', async (req, res) => {
  try {
    if (!isUuid(req.params.conversationId)) {
      return res.status(400).json({ error: 'Invalid conversationId' });
    }

    const message = await createMessage(
      req.params.conversationId,
      req.user.id,
      req.body?.content
    );

    res.status(201).json({ success: true, data: message });
  } catch (e) {
    console.error('Create conversation message error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.put('/:conversationId/messages/:messageId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageId } = req.params;
    const content = String(req.body?.content || '').trim();

    if (!isUuid(conversationId) || !isUuid(messageId)) {
      return res.status(400).json({ error: 'Invalid conversation or message id' });
    }

    if (!content) return res.status(400).json({ error: 'message content is required' });
    if (content.length > 2000) return res.status(400).json({ error: 'message content is too long' });

    const { data: membership, error: memberError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!membership) return res.status(403).json({ error: 'You are not a participant in this conversation' });

    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from('messages')
      .update({ content, updated_at: now })
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .eq('sender_id', userId)
      .eq('is_ai_generated', false)
      .select('id, conversation_id, sender_id, content, type, file_url, file_name, file_size, is_ai_generated, created_at, updated_at')
      .maybeSingle();

    if (error) throw error;
    if (!data) return res.status(404).json({ error: 'Message not found or not editable' });

    getIO()?.to(`conv:${conversationId}`).emit('msg:updated', data);
    res.json({ success: true, data });
  } catch (e) {
    console.error('Edit message error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.delete('/:conversationId/messages/:messageId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { conversationId, messageId } = req.params;

    if (!isUuid(conversationId) || !isUuid(messageId)) {
      return res.status(400).json({ error: 'Invalid conversation or message id' });
    }

    const { data: membership, error: memberError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) throw memberError;
    if (!membership) return res.status(403).json({ error: 'You are not a participant in this conversation' });

    const { data: existing, error: existingError } = await supabase
      .from('messages')
      .select('id')
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .eq('sender_id', userId)
      .maybeSingle();

    if (existingError) throw existingError;
    if (!existing) return res.status(404).json({ error: 'Message not found or not deletable' });

    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId)
      .eq('conversation_id', conversationId)
      .eq('sender_id', userId);

    if (error) throw error;

    getIO()?.to(`conv:${conversationId}`).emit('msg:deleted', { id: messageId, conversation_id: conversationId });
    res.json({ success: true, data: { id: messageId, conversation_id: conversationId } });
  } catch (e) {
    console.error('Delete message error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:conversationId/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.conversationId;
    const readAt = new Date().toISOString();

    if (!isUuid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversationId' });
    }

    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: readAt })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;

    getIO()?.to(`conv:${conversationId}`).emit('conv:read', {
      conversation_id: conversationId,
      reader_id: userId,
      read_at: readAt,
    });

    res.json({ success: true });
  } catch (e) {
    console.error('Mark conversation read error:', e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;
