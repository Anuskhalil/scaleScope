const express = require('express');
const auth = require('../middlewares/auth.middleware');
const supabase = require('../config/supabase');

const router = express.Router();

router.use(auth);

router.post('/with/:otherUserId', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const otherUserId = req.params.otherUserId;

    if (!otherUserId) {
      return res.status(400).json({ error: 'otherUserId is required' });
    }

    if (currentUserId === otherUserId) {
      return res.status(400).json({ error: 'Cannot create conversation with yourself' });
    }

    const { data, error } = await supabase.rpc(
      'create_conversation_with_participants',
      {
        p_created_by: currentUserId,
        p_other_user: otherUserId,
        p_type: 'direct',
      }
    );

    if (error) throw error;

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
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds),

      supabase
        .from('messages')
        .select('id, conversation_id, content, sender_id, created_at, is_ai_generated')
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
          ? profileById.get(otherParticipant.user_id)
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

    const { data: membership, error: memberError } = await supabase
      .from('conversation_participants')
      .select('conversation_id')
      .eq('conversation_id', conversationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) throw memberError;

    if (!membership) {
      return res.status(403).json({ error: 'You are not a participant in this conversation' });
    }

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
        created_at
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({ success: true, data: data || [] });
  } catch (e) {
    console.error('Fetch conversation messages error:', e);
    res.status(400).json({ error: e.message });
  }
});

router.post('/:conversationId/read', async (req, res) => {
  try {
    const userId = req.user.id;
    const conversationId = req.params.conversationId;

    const { error } = await supabase
      .from('conversation_participants')
      .update({ last_read_at: new Date().toISOString() })
      .eq('conversation_id', conversationId)
      .eq('user_id', userId);

    if (error) throw error;

    res.json({ success: true });
  } catch (e) {
    console.error('Mark conversation read error:', e);
    res.status(400).json({ error: e.message });
  }
});

module.exports = router;