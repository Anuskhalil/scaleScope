// src/services/studentService.js
// All Supabase data functions for the student role.
// Pages import from here — no raw supabase calls inside components.

import { supabase } from '../lib/supabaseClient';

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch a student's combined profile.
 * Returns merged object: { ...profiles fields, ...student_profiles fields }
 */
export async function fetchStudentProfile(userId) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(`
      *,
      profiles (
        id, full_name, email, user_type, location, bio, avatar_url,
        linkedin_url, github_url, twitter_url,
        skills, interests, profile_completion, onboarding_completed,
        last_active, created_at, metadata
      )
    `)
    .eq('user_id', userId)
    .single();

  if (error) {
    // No student_profiles row yet — return just the profiles row
    if (error.code === 'PGRST116') {
      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (profileError) throw profileError;
      return { profiles: profileData, ...profileData };
    }
    throw error;
  }

  // Flatten: student_profiles fields + profiles fields at top level
  const { profiles: p, ...sp } = data;
  return { ...p, ...sp, profiles: p };
}

/**
 * Update shared profile fields (profiles table).
 * Pass only the fields you want to change.
 */
export async function updateProfile(userId, updates) {
  const { error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId);
  if (error) throw error;
}

/**
 * Upsert student-specific fields (student_profiles table).
 * Creates the row if it doesn't exist yet.
 */
export async function updateStudentProfile(userId, updates) {
  const { error } = await supabase
    .from('student_profiles')
    .upsert(
      { user_id: userId, ...updates, updated_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );
  if (error) throw error;
}

/**
 * Upload avatar to Supabase Storage and update profiles.avatar_url.
 * Returns the public URL.
 */
export async function uploadAvatar(userId, file) {
  const ext = file.name.split('.').pop();
  const path = `avatars/${userId}.${ext}`;

  const { error: uploadError } = await supabase.storage
    .from('avatars')
    .upload(path, file, { upsert: true });
  if (uploadError) throw uploadError;

  const { data: { publicUrl } } = supabase.storage
    .from('avatars')
    .getPublicUrl(path);

  await updateProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

/**
 * Recalculate and save profile_completion score.
 * Call after any save to keep it in sync.
 */
export async function syncProfileCompletion(userId, fields) {
  const checks = [
    fields.full_name, fields.bio, fields.location,
    fields.university, fields.degree,
    fields.skills?.length > 0,
    fields.looking_for?.length > 0,
    fields.help_needed?.length > 0,
    fields.linkedin_url || fields.github_url,
    fields.avatar_url,
    fields.idea_title || fields.startup_idea_description,
  ];
  const score = Math.round((checks.filter(Boolean).length / checks.length) * 100);
  await updateProfile(userId, { profile_completion: score });
  return score;
}

// ═══════════════════════════════════════════════════════════════════════════
// MENTORS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch mentor list with profile data.
 * Supports filters: expertise (array overlap), location, industry, availability.
 */
export async function fetchMentors({ expertise = [], location = '', industry = '', limit = 20 } = {}) {
  let query = supabase
    .from('mentor_profiles')
    .select(`
      id, user_id,
      expertise_areas, years_experience, current_role, current_company,
      companies_worked, mentorship_capacity, current_mentees, mentorship_style,
      available_for, is_pro_bono, can_help_with, successful_exits, companies_founded,
      profiles (
        id, full_name, bio, avatar_url, location, skills,
        linkedin_url, github_url, twitter_url
      )
    `)
    .limit(limit);

  if (expertise.length > 0) {
    query = query.overlaps('expertise_areas', expertise);
  }
  if (industry) {
    query = query.contains('can_help_with', [industry]);
  }

  const { data, error } = await query;
  if (error) throw error;

  // Filter by location client-side (profile field)
  let result = data || [];
  if (location) {
    result = result.filter(m =>
      m.profiles?.location?.toLowerCase().includes(location.toLowerCase())
    );
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// CO-FOUNDERS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch students who are looking for co-founders.
 * Co-founders are students, not early-stage-founders.
 * Filter: student_profiles WHERE 'Co-founder' = ANY(looking_for)
 */
/**
 * Fetch students who are looking for co-founders.
 * Co-founders are students, not early-stage-founders.
 * Filter: student_profiles WHERE 'Co-founder' = ANY(looking_for)
 */
export async function fetchCoFounders({
  skills = [],
  industry = '',
  startupStage = '',
  location = '',
  availability = '',
  limit = 20
} = {}) {
  let query = supabase
    .from('student_profiles')
    .select(`
      id, user_id,
      university, degree, skills_with_levels, looking_for, help_needed,
      commitment_level, hours_per_week, has_cofounder,
      has_startup_idea, startup_idea_description,
      profiles (
        id, full_name, bio, avatar_url, location, skills, interests,
        linkedin_url, github_url
      )
    `)
    .contains('looking_for', ['Co-Founder'])
    .limit(limit);

  const { data, error } = await query;
  if (error) throw error;

  let result = data || [];

  // Client-side filters
  if (skills.length > 0) {
    result = result.filter(s =>
      s.profiles?.skills?.some(sk => skills.includes(sk))
    );
  }
  if (location) {
    result = result.filter(s =>
      s.profiles?.location?.toLowerCase().includes(location.toLowerCase())
    );
  }
  if (availability) {
    result = result.filter(s => s.commitment_level === availability);
  }

  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTION REQUESTS
// Matches schema: connection_requests table with partial unique index
// on (sender_id, receiver_id, type) WHERE status = 'pending'
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a connection request.
 * type: 'mentor_request' | 'cofounder_request' | 'investor_contact'
 * Returns { alreadySent: true } if a pending duplicate exists, or the new row.
 */
export async function sendConnectionRequest(senderId, receiverId, type, message = '') {
  // Input validation
  if (!senderId || !receiverId) throw new Error('Missing user IDs.');
  if (senderId === receiverId) throw new Error('Cannot send request to yourself.');
  const validTypes = ['mentor_request', 'cofounder_request', 'investor_contact'];
  if (!validTypes.includes(type)) throw new Error(`Invalid request type: ${type}`);

  // Clean message
  const cleanMessage = (message || '').trim().slice(0, 500);

  const { data, error } = await supabase
    .from('connection_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      type,
      status: 'pending',
      message: cleanMessage || null,
    })
    .select()
    .single();

  if (error) {
    // Duplicate pending request — partial unique index violation
    if (error.code === '23505') {
      return { alreadySent: true };
    }
    throw error;
  }
  return data;
}

/**
 * Get the connection request status between two users for a given type.
 * Checks both directions: did I send to them, or did they send to me?
 * Returns the MOST RECENT request: { status, isSender } or null.
 */
export async function getConnectionStatus(userId, otherUserId, type) {
  // Check if user sent a request to otherUser
  const { data: sent, error: sentErr } = await supabase
    .from('connection_requests')
    .select('status, sender_id')
    .eq('sender_id', userId)
    .eq('receiver_id', otherUserId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (sentErr) throw sentErr;
  if (sent) return { status: sent.status, isSender: true };

  // Check if otherUser sent a request to user
  const { data: received, error: recvErr } = await supabase
    .from('connection_requests')
    .select('status, sender_id')
    .eq('sender_id', otherUserId)
    .eq('receiver_id', userId)
    .eq('type', type)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (recvErr) throw recvErr;
  if (received) return { status: received.status, isSender: false };

  return null;
}

/**
 * Fetch all PENDING connection requests received by a user.
 * Used by the dashboard "Pending Requests" section and the Requests page.
 */
export async function fetchIncomingRequests(userId) {
  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      *,
      sender:profiles!connection_requests_sender_id_fkey (
        id, full_name, avatar_url, user_type, location, bio, skills
      )
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Fetch all connection requests SENT by a user (any status).
 * Used by the Requests page "Sent" tab.
 */
export async function fetchSentRequests(userId) {
  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      *,
      receiver:profiles!connection_requests_receiver_id_fkey (
        id, full_name, avatar_url, user_type, location, bio, skills
      )
    `)
    .eq('sender_id', userId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Accept or decline a pending connection request.
 * Only works on pending requests (enforced by query + RLS policy).
 * On accept — attempts to create a conversation (non-fatal if it fails).
 */
export async function respondToRequest(requestId, status) {
  // Validate status value
  if (!['accepted', 'declined'].includes(status)) {
    throw new Error('Invalid status. Must be "accepted" or "declined".');
  }

  // Fetch the request — only act on PENDING requests
  const { data: req, error: fetchError } = await supabase
    .from('connection_requests')
    .select('sender_id, receiver_id, type')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (fetchError) throw fetchError;
  if (!req) throw new Error('Request not found or already handled.');

  // Update status
  const { error } = await supabase
    .from('connection_requests')
    .update({
      status,
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (error) throw error;

  // If accepted, try to create a conversation
  if (status === 'accepted') {
    try {
      await getOrCreateConversation(req.receiver_id, req.sender_id);
    } catch (convErr) {
      console.error('[respondToRequest] Could not create conversation:', convErr.message);
      // Don't throw — the request is still accepted
    }
  }
}

/**
 * Withdraw a pending request that the user sent.
 * Only works on pending requests (enforced by query + RLS policy).
 */
export async function withdrawRequest(requestId) {
  const { error } = await supabase
    .from('connection_requests')
    .update({
      status: 'withdrawn',
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId)
    .eq('status', 'pending');

  if (error) throw error;
}

// ═══════════════════════════════════════════════════════════════════════════
// CONVERSATIONS & MESSAGES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Get or create a direct conversation between two users.
 * Uses the Postgres RPC function created in the migration.
 */
export async function getOrCreateConversation(userId, otherUserId) {
  const { data, error } = await supabase
    .rpc('create_conversation_with_participants', {
      p_created_by: userId,
      p_other_user: otherUserId,
      p_type: 'direct',
    });
  if (error) throw error;
  return data; // conversation UUID
}



/**
 * Fetch all conversations for a user, ordered by most recent message.
 * Includes: the other participant's profile + last message preview + unread count.
 *
 * PERFORMANCE: Fetches all messages per conversation in one query, then
 * processes them in a single pass to extract last message + unread count.
 * For production with heavy message volume, consider a DB view or RPC.
 */

/**
 * Upload a file to Supabase Storage for message attachments.
 * Returns { url, name, size }.
 */
export async function uploadMessageFile(file) {
  const ext = file.name.split('.').pop();
  const path = `messages/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;

  const { error } = await supabase.storage
    .from('message-attachments')
    .upload(path, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('message-attachments')
    .getPublicUrl(path);

  return {
    url: publicUrl,
    name: file.name,
    size: file.size < 1024 * 1024
      ? `${(file.size / 1024).toFixed(0)} KB`
      : `${(file.size / (1024 * 1024)).toFixed(1)} MB`,
  };
}

export async function fetchConversations(userId) {
  // Step 1: Get conversation list with participants
  const { data: participants, error: pError } = await supabase
    .from('conversation_participants')
    .select(`
      conversation_id,
      last_read_at,
      conversations (
        id, type, title, last_message_at, created_at,
        conversation_participants (
          user_id,
          profiles (
            id, full_name, avatar_url, user_type, location
          )
        ),
        messages (
          id, content, type, sender_id, created_at
        )
      )
    `)
    .eq('user_id', userId)
    .order('conversations(last_message_at)', { ascending: false });

  if (pError) throw pError;
  if (!participants || participants.length === 0) return [];

  // Step 2: Single-pass through all messages to build last message map + unread counts
  const lastMsgMap = {};
  const unreadMap = {};

  for (const row of participants) {
    const convId = row.conversation_id;
    const readAt = row.last_read_at;
    const messages = row.conversations?.messages || [];

    for (const msg of messages) {
      // Track latest message per conversation
      const existing = lastMsgMap[convId];
      if (!existing || new Date(msg.created_at) > new Date(existing.created_at)) {
        lastMsgMap[convId] = msg;
      }
      // Count unread (not from self, after last_read_at)
      if (msg.sender_id !== userId) {
        if (!readAt || new Date(msg.created_at) > new Date(readAt)) {
          unreadMap[convId] = (unreadMap[convId] || 0) + 1;
        }
      }
    }
  }

  // Step 3: Assemble final array
  return participants.map(row => {
    const conv = row.conversations;
    const otherParticipant = (conv.conversation_participants || []).find(
      p => p.user_id !== userId
    );
    return {
      id: conv.id,
      type: conv.type,
      title: conv.title,
      last_message_at: conv.last_message_at,
      otherUser: otherParticipant?.profiles || null,
      lastMessage: lastMsgMap[conv.id] || null,
      unreadCount: unreadMap[conv.id] || 0,
    };
  });
}

export async function fetchOpportunities({ limit = 5 } = {}) {
  const { data, error } = await supabase
    .from('opportunities')
    .select('*')
    .eq('is_active', true)
    .order('deadline', { ascending: true })
    .limit(limit);
  if (error) throw error;
  return data || [];
}

/**
 * Fetch all messages in a conversation, oldest first.
 */
export async function fetchMessages(conversationId) {
  const { data, error } = await supabase
    .from('messages')
    .select(`
      id, conversation_id, sender_id, content, type,
      file_url, file_name, file_size, is_read, created_at,
      profiles (
        id, full_name, avatar_url
      )
    `)
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return data || [];
}

/**
 * Send a message into a conversation.
 * type: 'text' | 'file' | 'pitch_deck' | 'system'
 */
export async function sendMessage(conversationId, senderId, content, type = 'text', fileData = {}) {
  const { data, error } = await supabase
    .from('messages')
    .insert({
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type,
      file_url: fileData.url || null,
      file_name: fileData.name || null,
      file_size: fileData.size || null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

/**
 * Mark all messages in a conversation as read for this user.
 * Updates conversation_participants.last_read_at.
 */
export async function markConversationRead(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);
  if (error) throw error;
}

/**
 * Subscribe to new messages in a conversation via Supabase Realtime.
 * Returns the channel — call channel.unsubscribe() on cleanup.
 *
 * Usage:
 *   const channel = subscribeToMessages(convId, (msg) => setMessages(prev => [...prev, msg]));
 *   return () => channel.unsubscribe();
 */
export function subscribeToMessages(conversationId, onNewMessage) {
  const channel = supabase
    .channel(`messages:${conversationId}`)
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => onNewMessage(payload.new)
    )
    .subscribe();

  return channel;
}

/**
 * Subscribe to conversation list changes (e.g. new messages updating last_message_at).
 * Returns the channel — call channel.unsubscribe() on cleanup.
 */
export function subscribeToConversations(userId, onChange) {
  const channel = supabase
    .channel(`conversations:${userId}`)
    .on(
      'postgres_changes',
      {
        event: '*',
        schema: 'public',
        table: 'conversations',
      },
      () => onChange()
    )
    .subscribe();

  return channel;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch everything the student dashboard needs in 4 parallel queries.
 * Returns: { profile, mentors, coFounders, conversations }
 */
export async function fetchDashboardData(userId) {
  const [
    profileResult,
    mentorsResult,
    coFoundersResult,
    conversationsResult,
  ] = await Promise.all([
    // Profile + completion score
    supabase
      .from('profiles')
      .select('full_name, avatar_url, profile_completion, bio, location, skills')
      .eq('id', userId)
      .single(),

    // Top 5 mentors
    supabase
      .from('mentor_profiles')
      .select(`
        id, user_id, expertise_areas, years_experience, can_help_with, is_pro_bono,
        profiles (id, full_name, avatar_url, bio, location)
      `)
      .limit(5),

    // Top 4 students looking for co-founders (excluding self)
    supabase
      .from('student_profiles')
      .select(`
        id, user_id, looking_for, commitment_level, skills_with_levels,
        has_startup_idea, startup_idea_description,
        profiles (id, full_name, avatar_url, bio, location, skills)
      `)
      .contains('looking_for', ['Co-founder'])
      .neq('user_id', userId)
      .limit(4),

    // Recent conversations (for message preview)
    supabase
      .from('conversation_participants')
      .select(`
        conversation_id,
        conversations (
          id, last_message_at,
          messages (
            content, sender_id, created_at
          ),
          conversation_participants (
            user_id,
            profiles (id, full_name, avatar_url)
          )
        )
      `)
      .eq('user_id', userId)
      .order('conversations(last_message_at)', { ascending: false })
      .limit(5),
  ]);

  if (profileResult.error) throw profileResult.error;
  if (mentorsResult.error) throw mentorsResult.error;
  if (coFoundersResult.error) throw coFoundersResult.error;
  // conversations failure is non-fatal — dashboard still works without it

  return {
    profile: profileResult.data,
    mentors: mentorsResult.data || [],
    coFounders: coFoundersResult.data || [],
    conversations: conversationsResult.error ? [] : (conversationsResult.data || []),
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// PHASE 2 — MATCHED FETCH WRAPPERS
// Fetch from DB then immediately rank with rule-based scores.
// Drop-in replacements for fetchMentors / fetchCoFounders in pages.
// ═══════════════════════════════════════════════════════════════════════════

import { rankMentors, rankCoFounders, rankInvestors } from './matchingService';

/**
 * Fetch mentors AND score them against the student's profile.
 * Returns rows with _matchScore, _matchReasons, _matchedOn attached, sorted best first.
 *
 * @param {object} studentProfile  - the current student's full profile object
 * @param {object} filters         - same filters as fetchMentors()
 * @param {object} opts
 * @param {number} opts.minScore   - hide results below this score (default 0)
 */
export async function fetchMatchedMentors(studentProfile, filters = {}, { minScore = 0 } = {}) {
  const raw = await fetchMentors({ ...filters, limit: filters.limit || 50 });
  return rankMentors(raw, studentProfile, { minScore, limit: filters.limit || 20 });
}

/**
 * Fetch co-founder candidates AND score them against the student's profile.
 * Returns rows sorted by complementarity score.
 *
 * @param {object} studentProfile
 * @param {object} filters         - same filters as fetchCoFounders()
 * @param {object} opts
 */
export async function fetchMatchedCoFounders(studentProfile, filters = {}, { minScore = 0 } = {}) {
  const raw = await fetchCoFounders({ ...filters, limit: filters.limit || 50 });
  return rankCoFounders(raw, studentProfile, { minScore, limit: filters.limit || 20 });
}

/**
 * Fetch investors AND score them against the student's profile.
 * investor_profiles table must exist in your schema.
 *
 * @param {object} studentProfile
 * @param {object} filters
 */
export async function fetchMatchedInvestors(studentProfile, filters = {}, { minScore = 0 } = {}) {
  let query = supabase
    .from('investor_profiles')
    .select(`
      id, user_id,
      investor_type, firm_name, investment_stage, ticket_size_min, ticket_size_max,
      industries_of_interest, geographic_focus, portfolio_count,
      investment_thesis, typical_involvement, accepting_pitches,
      profiles (
        id, full_name, bio, avatar_url, location
      )
    `)
    .eq('accepting_pitches', true)
    .limit(filters.limit || 50);

  const { data, error } = await query;
  if (error) throw error;

  return rankInvestors(data || [], studentProfile, { minScore, limit: filters.limit || 20 });
}