const crypto = require('crypto');
const express = require('express');
const auth = require('../middlewares/auth.middleware');
const supabase = require('../config/supabase');

const router = express.Router();

router.use(auth);

const TOKEN_TTL_SECONDS = 60 * 60 * 2;
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => UUID_RE.test(String(value || ''));

function requireLiveKitConfig() {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;
  const url = process.env.LIVEKIT_URL;

  if (!apiKey || !apiSecret || !url) {
    throw new Error('LiveKit is not configured. Set LIVEKIT_URL, LIVEKIT_API_KEY, and LIVEKIT_API_SECRET.');
  }

  return { apiKey, apiSecret, url };
}

function base64UrlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signLiveKitToken({ apiKey, apiSecret, identity, name, roomName }) {
  const now = Math.floor(Date.now() / 1000);
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const payload = {
    iss: apiKey,
    sub: identity,
    name,
    nbf: now - 10,
    exp: now + TOKEN_TTL_SECONDS,
    video: {
      room: roomName,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    },
  };

  const unsigned = `${base64UrlJson(header)}.${base64UrlJson(payload)}`;
  const signature = crypto
    .createHmac('sha256', apiSecret)
    .update(unsigned)
    .digest('base64url');

  return `${unsigned}.${signature}`;
}

async function getConversationParticipants(conversationId) {
  const { data, error } = await supabase
    .from('conversation_participants')
    .select('user_id')
    .eq('conversation_id', conversationId);

  if (error) throw error;

  return data || [];
}

async function assertConversationMember(conversationId, userId) {
  const participants = await getConversationParticipants(conversationId);
  const isMember = participants.some((item) => item.user_id === userId);

  if (!isMember) {
    const error = new Error('You are not a participant in this conversation');
    error.status = 403;
    throw error;
  }

  return participants;
}

async function assertMeetingParticipant(meetingId, userId) {
  const { data: participant, error } = await supabase
    .from('meeting_participants')
    .select('meeting_id, user_id, role')
    .eq('meeting_id', meetingId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;

  if (!participant) {
    const accessError = new Error('You are not a participant in this meeting');
    accessError.status = 403;
    throw accessError;
  }

  return participant;
}

async function getMeeting(meetingId) {
  const { data, error } = await supabase
    .from('meetings')
    .select('id, conversation_id, host_id, title, provider, room_name, status, scheduled_at, started_at, ended_at, created_at')
    .eq('id', meetingId)
    .maybeSingle();

  if (error) throw error;

  if (!data) {
    const notFound = new Error('Meeting not found');
    notFound.status = 404;
    throw notFound;
  }

  return data;
}

router.post('/', async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const {
      conversationId,
      title,
      scheduledAt,
    } = req.body || {};

    if (!conversationId) {
      return res.status(400).json({ error: 'conversationId is required' });
    }

    if (!isUuid(conversationId)) {
      return res.status(400).json({ error: 'Invalid conversationId' });
    }

    const participants = await assertConversationMember(conversationId, currentUserId);
    const roomName = `scalescope-${crypto.randomUUID()}`;

    const { data: meeting, error: meetingError } = await supabase
      .from('meetings')
      .insert({
        conversation_id: conversationId,
        host_id: currentUserId,
        title: (title || 'ScaleScope Meeting').slice(0, 120),
        provider: 'livekit',
        room_name: roomName,
        status: scheduledAt ? 'scheduled' : 'live',
        scheduled_at: scheduledAt || null,
        started_at: scheduledAt ? null : new Date().toISOString(),
      })
      .select('id, conversation_id, host_id, title, provider, room_name, status, scheduled_at, started_at, created_at')
      .single();

    if (meetingError) throw meetingError;

    const participantRows = participants.map((participant) => ({
      meeting_id: meeting.id,
      user_id: participant.user_id,
      role: participant.user_id === currentUserId ? 'host' : 'participant',
    }));

    const { error: participantsError } = await supabase
      .from('meeting_participants')
      .upsert(participantRows, {
        onConflict: 'meeting_id,user_id',
      });

    if (participantsError) throw participantsError;

    res.status(201).json({
      success: true,
      data: meeting,
    });
  } catch (err) {
    console.error('Create meeting failed:', err);
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.get('/:meetingId', async (req, res) => {
  try {
    const userId = req.user.id;
    const { meetingId } = req.params;

    if (!isUuid(meetingId)) {
      return res.status(400).json({ error: 'Invalid meetingId' });
    }

    await assertMeetingParticipant(meetingId, userId);
    const meeting = await getMeeting(meetingId);

    const { data: participants, error } = await supabase
      .from('meeting_participants')
      .select(`
        id,
        user_id,
        role,
        joined_at,
        left_at,
        profiles(
          id,
          full_name,
          avatar_url,
          user_type
        )
      `)
      .eq('meeting_id', meetingId)
      .order('created_at', { ascending: true });

    if (error) throw error;

    res.json({
      success: true,
      data: {
        meeting,
        participants: participants || [],
      },
    });
  } catch (err) {
    console.error('Get meeting failed:', err);
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/:meetingId/token', async (req, res) => {
  try {
    const userId = req.user.id;
    const { meetingId } = req.params;
    const config = requireLiveKitConfig();

    if (!isUuid(meetingId)) {
      return res.status(400).json({ error: 'Invalid meetingId' });
    }

    await assertMeetingParticipant(meetingId, userId);
    const meeting = await getMeeting(meetingId);

    if (['ended', 'cancelled'].includes(meeting.status)) {
      return res.status(409).json({ error: 'This meeting is no longer active' });
    }

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('full_name, email')
      .eq('id', userId)
      .maybeSingle();

    if (profileError) throw profileError;

    const displayName = profile?.full_name || profile?.email || 'ScaleScope user';
    const token = signLiveKitToken({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      identity: userId,
      name: displayName,
      roomName: meeting.room_name,
    });

    await Promise.all([
      supabase
        .from('meeting_participants')
        .update({ joined_at: new Date().toISOString() })
        .eq('meeting_id', meetingId)
        .eq('user_id', userId),
      meeting.status === 'scheduled'
        ? supabase
            .from('meetings')
            .update({
              status: 'live',
              started_at: new Date().toISOString(),
            })
            .eq('id', meetingId)
        : Promise.resolve({ error: null }),
    ]);

    res.json({
      success: true,
      data: {
        token,
        url: config.url,
        roomName: meeting.room_name,
      },
    });
  } catch (err) {
    console.error('Create meeting token failed:', err);
    res.status(err.status || 400).json({ error: err.message });
  }
});

router.post('/:meetingId/end', async (req, res) => {
  try {
    const userId = req.user.id;
    const { meetingId } = req.params;

    if (!isUuid(meetingId)) {
      return res.status(400).json({ error: 'Invalid meetingId' });
    }

    const participant = await assertMeetingParticipant(meetingId, userId);

    if (participant.role !== 'host') {
      return res.status(403).json({ error: 'Only the host can end this meeting' });
    }

    const endedAt = new Date().toISOString();
    const { data, error } = await supabase
      .from('meetings')
      .update({
        status: 'ended',
        ended_at: endedAt,
      })
      .eq('id', meetingId)
      .select('id, status, ended_at')
      .single();

    if (error) throw error;

    await supabase
      .from('meeting_participants')
      .update({ left_at: endedAt })
      .eq('meeting_id', meetingId)
      .is('left_at', null);

    res.json({
      success: true,
      data,
    });
  } catch (err) {
    console.error('End meeting failed:', err);
    res.status(err.status || 400).json({ error: err.message });
  }
});

module.exports = router;
