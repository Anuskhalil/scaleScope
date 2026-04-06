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
        linkedin_url, github_url, twitter_url, portfolio_url,
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
  const ext  = file.name.split('.').pop();
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
        linkedin_url, github_url, portfolio_url
      )
    `)
    .contains('looking_for', ['Co-founder'])
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
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Send a connection request.
 * type: 'mentor_request' | 'cofounder_request' | 'investor_contact'
 */
export async function sendConnectionRequest(senderId, receiverId, type, message = '') {
  const { data, error } = await supabase
    .from('connection_requests')
    .insert({
      sender_id:   senderId,
      receiver_id: receiverId,
      type,
      status:  'pending',
      message: message || null,
    })
    .select()
    .single();

  if (error) {
    // Duplicate — request already exists
    if (error.code === '23505') {
      return { alreadySent: true };
    }
    throw error;
  }
  return data;
}

/**
 * Get the connection request status between two users for a given type.
 * Returns: { status, isSender } or null
 */
export async function getConnectionStatus(userId, otherUserId, type) {
  const { data, error } = await supabase
    .from('connection_requests')
    .select('status, sender_id')
    .or(`and(sender_id.eq.${userId},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${userId})`)
    .eq('type', type)
    .maybeSingle();

  if (error) throw error;
  return data ? { status: data.status, isSender: data.sender_id === userId } : null;
}

/**
 * Fetch all connection requests received by a user (incoming, pending).
 */
export async function fetchIncomingRequests(userId) {
  const { data, error } = await supabase
    .from('connection_requests')
    .select(`
      *,
      sender: profiles!connection_requests_sender_id_fkey (
        id, full_name, avatar_url, user_type, location
      )
    `)
    .eq('receiver_id', userId)
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data || [];
}

/**
 * Accept or decline a connection request.
 * On accept — automatically creates a conversation between the two users.
 */
export async function respondToRequest(requestId, status) {
  const { data: req, error: fetchError } = await supabase
    .from('connection_requests')
    .select('sender_id, receiver_id')
    .eq('id', requestId)
    .single();
  if (fetchError) throw fetchError;

  const { error } = await supabase
    .from('connection_requests')
    .update({ status })
    .eq('id', requestId);
  if (error) throw error;

  // If accepted, create a conversation
  if (status === 'accepted') {
    await getOrCreateConversation(req.receiver_id, req.sender_id);
  }
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
      p_type:       'direct',
    });
  if (error) throw error;
  return data; // conversation UUID
}

/**
 * Fetch all conversations for a user, ordered by most recent message.
 * Includes: the other participant's profile + last message preview + unread count.
 */
export async function fetchConversations(userId) {
  const { data, error } = await supabase
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

  if (error) throw error;

  return (data || []).map(row => {
    const conv         = row.conversations;
    const participants = conv.conversation_participants || [];
    const otherParticipant = participants.find(p => p.user_id !== userId);
    const messages     = conv.messages || [];
    const lastMessage  = messages.sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at)
    )[0] || null;

    // Unread = messages after last_read_at that weren't sent by this user
    const unreadCount = messages.filter(m =>
      m.sender_id !== userId &&
      (!row.last_read_at || new Date(m.created_at) > new Date(row.last_read_at))
    ).length;

    return {
      id:              conv.id,
      type:            conv.type,
      title:           conv.title,
      last_message_at: conv.last_message_at,
      otherUser:       otherParticipant?.profiles || null,
      lastMessage,
      unreadCount,
    };
  });
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
      sender_id:       senderId,
      content,
      type,
      file_url:  fileData.url  || null,
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
        event:  'INSERT',
        schema: 'public',
        table:  'messages',
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
        event:  '*',
        schema: 'public',
        table:  'conversations',
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

  if (profileResult.error)    throw profileResult.error;
  if (mentorsResult.error)    throw mentorsResult.error;
  if (coFoundersResult.error) throw coFoundersResult.error;
  // conversations failure is non-fatal — dashboard still works without it

  return {
    profile:       profileResult.data,
    mentors:       mentorsResult.data    || [],
    coFounders:    coFoundersResult.data  || [],
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