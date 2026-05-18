const express = require('express');
const auth = require('../middlewares/auth.middleware');
const { sendRequest, respondRequest } = require('../services/connection.service');
const supabase = require('../config/supabase');
const { getIO } = require('../config/socket');

const router = express.Router();
router.use(auth);

router.post('/request', async (req, res) => {
    try {
        const { receiverId, type = 'cofounder_request', message } = req.body;

        const result = await sendRequest(
            req.user.id,
            receiverId,
            type,
            message
        );

        if (result.alreadyPending || result.alreadyConnected) {
            return res.status(200).json({
                success: true,
                requestId: result.id,
                status: result.status,
                alreadyPending: Boolean(result.alreadyPending),
                alreadyConnected: Boolean(result.alreadyConnected),
            });
        }

        getIO()?.to(`user:${receiverId}`).emit('conn:request', {
            id: result.id,
            senderId: req.user.id,
            senderName: req.user.email,
            message,
        });

        res.status(201).json({
            success: true,
            requestId: result.id,
            status: result.status,
        });
    } catch (e) {
        console.error('CONNECTION REQUEST ERROR:', e);

        res.status(400).json({
            success: false,
            error: e.message,
        });
    }
});

router.get('/status/:userId', async (req, res) => {
    try {
        const currentUserId = req.user.id;
        const otherUserId = req.params.userId;

        const { data, error } = await supabase
            .from('connection_requests')
            .select('*')
            .or(
                `and(sender_id.eq.${currentUserId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${currentUserId})`
            )
            .maybeSingle();

        if (error) throw error;

        res.json({
            success: true,
            connection: data || null
        });

    } catch (e) {
        console.error('❌ Status API error:', e);
        res.status(400).json({ error: e.message });
    }
});

router.post('/respond', async (req, res) => {
    try {
        const { requestId, action } = req.body;
        const result = await respondRequest(requestId, action, req.user.id);

        const accepted = action === 'accept' || result.status === 'accepted';

        getIO()?.to(`user:${result.senderId}`).emit('conn:response', {
            action,
            requestId,
            status: result.status,
            otherUserId: req.user.id,
            conversationId: result.conversationId || null,
        });

        getIO()?.to(`user:${req.user.id}`).emit('conn:response', {
            action,
            requestId,
            status: result.status,
            otherUserId: result.senderId,
            conversationId: result.conversationId || null,
        });

        if (accepted && result.conversationId) {
            getIO()?.to(`user:${req.user.id}`)
                .to(`user:${result.senderId}`)
                .emit('conv:created', {
                    id: result.conversationId,
                    conversationId: result.conversationId,
                });
        }

        res.json({
            success: true,
            status: result.status,
            conversationId: result.conversationId,
        });
    } catch (e) {
        res.status(400).json({ error: e.message });
    }
});

router.get('/mine', async (req, res) => {
    try {
        const userId = req.user.id;

        const { data, error } = await supabase
            .from('connections')
            .select(`
          id,
          user_1,
          user_2,
          connection_type,
          connected_at,
          user1:profiles!connections_user_1_fkey(
            id, full_name, user_type, avatar_url, location, bio
          ),
          user2:profiles!connections_user_2_fkey(
            id, full_name, user_type, avatar_url, location, bio
          )
        `)
            .or(`user_1.eq.${userId},user_2.eq.${userId}`)
            .order('connected_at', { ascending: false });

        if (error) throw error;

        const connections = (data || []).map((row) => {
            const otherUser = row.user_1 === userId ? row.user2 : row.user1;

            return {
                id: row.id,
                connectionType: row.connection_type,
                connectedAt: row.connected_at,
                otherUser,
            };
        });

        res.json({
            success: true,
            data: connections,
        });
    } catch (e) {
        console.error('Fetch my connections error:', e);
        res.status(400).json({ error: e.message });
    }
});

router.post('/feedback', async (req, res) => {
    try {
        const { targetUserId, requestId, feedback } = req.body;

        if (!targetUserId || !feedback) {
            return res.status(400).json({ error: 'targetUserId and feedback are required' });
        }

        const { error } = await supabase
            .from('interaction_history')
            .insert({
                user_id: req.user.id,
                target_user_id: targetUserId,
                interaction_type: 'connection_feedback',
                outcome: feedback,
                context: {
                    request_id: requestId || null,
                },
            });

        if (error) throw error;

        res.json({
            success: true,
        });
    } catch (e) {
        console.error('Connection feedback error:', e);
        res.status(400).json({ error: e.message });
    }
});

module.exports = router;