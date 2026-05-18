import { supabase } from './supabaseClient';

const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const getAuthHeaders = async () => {
    const { data, error } = await supabase.auth.getSession();

    if (error) {
        throw new Error(error.message || 'Failed to get auth session');
    }

    const token = data.session?.access_token;

    if (!token) {
        throw new Error('You are not authenticated. Please login again.');
    }

    return {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
    };
};

const readJson = async (res) => {
    return res.json().catch(() => ({}));
};

export const backendApi = {
    // AI CoFounder Suggestions
    getCofounders: async (limit = 8) => {
        const res = await fetch(`${BASE}/api/cofounders?limit=${limit}`, {
            headers: await getAuthHeaders(),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch cofounders');
        }

        return data;
    },

    // Send Connection Request
    sendConnect: async (receiverId, message, type = 'cofounder_request') => {
        if (!receiverId) {
            throw new Error('receiverId is required');
        }

        const res = await fetch(`${BASE}/api/connections/request`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                receiverId,
                type,
                message: message?.slice(0, 300) || null,
            }),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || `Connection request failed: ${res.status}`);
        }

        return data;
    },

    // Accept / Decline Connection Request
    respondConnect: async (requestId, action) => {
        if (!requestId) {
            throw new Error('requestId is required');
        }

        if (!['accept', 'decline'].includes(action)) {
            throw new Error('Invalid action. Use "accept" or "decline".');
        }

        const res = await fetch(`${BASE}/api/connections/respond`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                requestId,
                action,
            }),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || `Failed to ${action} request`);
        }

        return data;
    },

    // My Connections
    getMyConnections: async () => {
        const res = await fetch(`${BASE}/api/connections/mine`, {
            headers: await getAuthHeaders(),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch connections');
        }

        return data;
    },

    // Get or create conversation
    getOrCreateConversation: async (otherUserId) => {
        if (!otherUserId) {
            throw new Error('otherUserId is required');
        }

        const res = await fetch(`${BASE}/api/conversations/with/${otherUserId}`, {
            method: 'POST',
            headers: await getAuthHeaders(),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to get conversation');
        }

        return data;
    },

    getConversations: async () => {
        const res = await fetch(`${BASE}/api/conversations`, {
            headers: await getAuthHeaders(),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch conversations');
        }

        return data;
    },

    getConversationMessages: async (conversationId) => {
        const res = await fetch(`${BASE}/api/conversations/${conversationId}/messages`, {
            headers: await getAuthHeaders(),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to fetch messages');
        }

        return data;
    },

    markConversationRead: async (conversationId) => {
        const res = await fetch(`${BASE}/api/conversations/${conversationId}/read`, {
            method: 'POST',
            headers: await getAuthHeaders(),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to mark conversation read');
        }

        return data;
    },

    // Feedback after ignoring invitation
    sendConnectionFeedback: async ({ targetUserId, requestId, feedback }) => {
        if (!targetUserId) {
            throw new Error('targetUserId is required');
        }

        const res = await fetch(`${BASE}/api/connections/feedback`, {
            method: 'POST',
            headers: await getAuthHeaders(),
            body: JSON.stringify({
                targetUserId,
                requestId,
                feedback,
            }),
        });

        const data = await readJson(res);

        if (!res.ok) {
            throw new Error(data.error || 'Failed to send feedback');
        }

        return data;
    },
};