// src/services/mentorService.js
// All Supabase data functions for the mentor role.
// Connection / messaging re-exported from studentService (shared infrastructure).

import { supabase } from '../lib/supabaseClient';

// ── Re-export shared functions ────────────────────────────────────────────
export {
  sendConnectionRequest,
  getConnectionStatus,
  getOrCreateConversation,
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToConversations,
  respondToRequest,
} from './studentService';

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch a mentor's combined profile (profiles + mentor_profiles).
 * Returns { profile, mentorProfile } — both may be empty objects if new user.
 */
export async function fetchMentorProfile(userId) {
  const [{ data: pd, error: pe }, { data: mp }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('mentor_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (pe) throw pe;
  return { profile: pd || {}, mentorProfile: mp || {} };
}

/**
 * Completion score — drives the "Profile Strength" widget.
 */
export function calcMentorCompletion(p, mp) {
  let s = 0;
  // Identity (30)
  if ((p.full_name  || '').trim().length > 1)  s += 8;
  if ((p.bio        || '').trim().length > 30)  s += 7;
  if  (p.avatar_url)                            s += 5;
  if  (p.location)                              s += 4;
  if  (p.linkedin_url || p.github_url)          s += 6;
  // Expertise (40)
  if ((mp.expertise_areas || []).length >= 2)   s += 12;
  if  (mp.years_experience > 0)                 s += 6;
  if  (mp.current_role)                         s += 6;
  if  (mp.current_company)                      s += 4;
  if ((mp.can_help_with || []).length >= 2)     s += 7;
  if  (mp.mentorship_style)                     s += 5;
  // Credibility (20)
  if ((mp.companies_worked || []).length > 0)   s += 6;
  if  (mp.successful_exits > 0)                 s += 8;
  if  (mp.hourly_rate || mp.is_pro_bono)        s += 6;
  // Availability (10)
  if  (mp.mentorship_capacity > 0)              s += 5;
  if ((mp.available_for || []).length > 0)      s += 5;
  return Math.min(s, 100);
}

/**
 * Missing-field suggestions for the dashboard nudge widget.
 */
export function getMentorProfileNudges(p, mp) {
  const nudges = [];
  if (!(p.bio && p.bio.trim().length > 30))
    nudges.push({ field: 'bio',            msg: 'Add a bio — students read this first' });
  if (!(mp.expertise_areas?.length >= 2))
    nudges.push({ field: 'expertise_areas', msg: 'Add expertise areas to get better matches' });
  if (!mp.current_role)
    nudges.push({ field: 'current_role',   msg: 'Add your current role for credibility' });
  if (!(mp.can_help_with?.length >= 2))
    nudges.push({ field: 'can_help_with',  msg: 'Add what you can help with' });
  if (!p.avatar_url)
    nudges.push({ field: 'avatar_url',     msg: 'Add a profile photo — 3× more requests' });
  if (!p.linkedin_url)
    nudges.push({ field: 'linkedin_url',   msg: 'Link LinkedIn to boost trust score' });
  return nudges.slice(0, 3); // show max 3
}

/**
 * Save shared profile fields (profiles table).
 */
export async function saveMentorBaseProfile(userId, data) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('profiles').upsert({
    id:           userId,
    full_name:    data.full_name,
    email:        data.email,
    user_type:    'mentor',
    location:     data.location     || null,
    bio:          data.bio          || null,
    avatar_url:   data.avatar_url   || null,
    linkedin_url: data.linkedin_url || null,
    github_url:   data.github_url   || null,
    twitter_url:  data.twitter_url  || null,
    skills:       data.skills       || [],
    interests:    data.interests    || [],
    profile_completion:   data.profile_completion   || 0,
    onboarding_completed: data.onboarding_completed || false,
    updated_at:   now,
    last_active:  now,
  }, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Upsert mentor-specific fields (mentor_profiles table).
 */
export async function saveMentorDetails(userId, data) {
  // Guard: ensure integer fields are truly numbers, never arrays or strings
  const safeInt = (v, fallback = 0) => {
    const n = Number(v);
    return isNaN(n) || !isFinite(n) ? fallback : Math.max(0, Math.floor(n));
  };
  const safeNum = (v) => {
    const n = Number(v);
    return (v === '' || v === null || v === undefined || isNaN(n)) ? null : n;
  };
  // Guard: ensure array fields are always genuine JS arrays of strings, never numbers
  // Coerce any value to a clean TEXT[] — handles arrays, strings, and anything else
  const safeArr = (v) => {
    if (Array.isArray(v))          return v.filter(x => typeof x === 'string' && x.trim());
    if (typeof v === 'string' && v.trim()) return [v.trim()];  // single string → wrap in array
    return [];
  };

  const { error } = await supabase.from('mentor_profiles').upsert({
    user_id:             userId,
    expertise_areas:     safeArr(data.expertise_areas),
    years_experience:    safeInt(data.years_experience, 0),
    current_role:        data.current_role      || null,
    current_company:     data.current_company   || null,
    companies_worked:    safeArr(data.companies_worked),
    companies_founded:   safeArr(data.companies_founded),
    successful_exits:    safeInt(data.successful_exits, 0),
    mentorship_style:    data.mentorship_style  || null,
    can_help_with:       safeArr(data.can_help_with),
    available_for:       safeArr(data.available_for),
    mentorship_capacity: safeInt(data.mentorship_capacity, 3),
    current_mentees:     safeInt(data.current_mentees, 0),
    hourly_rate:         safeNum(data.hourly_rate),
    is_pro_bono:         Boolean(data.is_pro_bono),
    updated_at:          new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

/**
 * Upload avatar, update profiles.avatar_url, return public URL.
 */
export async function uploadMentorAvatar(userId, file) {
  const path = `avatars/${userId}.${file.name.split('.').pop()}`;
  const { error: ue } = await supabase.storage
    .from('avatars').upload(path, file, { upsert: true });
  if (ue) throw ue;
  const { data: { publicUrl } } = supabase.storage
    .from('avatars').getPublicUrl(path);
  await saveMentorBaseProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch everything the mentor dashboard needs in parallel.
 */
export async function fetchMentorDashboard(userId) {
  const [profRes, mpRes, reqRes, convRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('mentor_profiles').select('*').eq('user_id', userId).maybeSingle(),

    // Incoming mentor requests (pending)
    supabase.from('connection_requests')
      .select(`
        id, type, status, message, created_at,
        sender: profiles!connection_requests_sender_id_fkey (
          id, full_name, avatar_url, user_type, location
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .in('type', ['mentor_request', 'mentor'])
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent conversations for message preview
    supabase.from('conversation_participants')
      .select(`
        conversation_id, last_read_at,
        conversations (
          id, type, last_message_at,
          conversation_participants (
            user_id,
            profiles ( id, full_name, avatar_url, user_type )
          ),
          messages ( id, content, sender_id, created_at )
        )
      `)
      .eq('user_id', userId)
      .order('conversations(last_message_at)', { ascending: false })
      .limit(5),
  ]);

  if (profRes.error) throw profRes.error;

  // Active mentees — accepted requests where this mentor is the receiver
  let mentees = [];
  try {
    const { data } = await supabase
      .from('connection_requests')
      .select(`
        id, created_at, type,
        sender: profiles!connection_requests_sender_id_fkey (
          id, full_name, avatar_url, user_type, location, bio
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'accepted')
      .in('type', ['mentor_request', 'mentor'])
      .order('created_at', { ascending: false });
    mentees = data || [];
  } catch (e) { console.warn('mentees:', e.message); }

  // Suggested founders (for AI suggestion section)
  let founders = [];
  try {
    const { data } = await supabase
      .from('founder_profiles')
      .select(`
        id, user_id, industry, startup_stage, company_stage,
        company_name, idea_title, problem_solving, help_needed,
        profiles ( id, full_name, avatar_url, location, bio )
      `)
      .limit(6);
    founders = data || [];
  } catch (e) { console.warn('founders:', e.message); }

  // Suggested students with startup ideas
  let students = [];
  try {
    const { data } = await supabase
      .from('student_profiles')
      .select(`
        id, user_id, has_startup_idea, startup_idea_description,
        help_needed, commitment_level, interests,
        profiles ( id, full_name, avatar_url, location, bio )
      `)
      .eq('has_startup_idea', true)
      .limit(6);
    students = data || [];
  } catch (e) { console.warn('students:', e.message); }

  // Shape conversations
  const convos = (convRes.data || []).map(row => {
    const conv  = row.conversations || {};
    const msgs  = (conv.messages || []).sort((a, b) =>
      new Date(b.created_at) - new Date(a.created_at));
    const other = (conv.conversation_participants || []).find(p => p.user_id !== userId);
    const unread = msgs.filter(m =>
      m.sender_id !== userId &&
      (!row.last_read_at || new Date(m.created_at) > new Date(row.last_read_at))
    ).length;
    return {
      id:             conv.id,
      last_message_at: conv.last_message_at,
      otherUser:      other?.profiles || null,
      lastMessage:    msgs[0] || null,
      unreadCount:    unread,
    };
  });

  return {
    profile:       profRes.data || {},
    mentorProfile: mpRes.data   || {},
    requests:      reqRes.data  || [],
    mentees,
    founders,
    students,
    convos,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// MY MENTEES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch all accepted mentees for a mentor, enriched with their startup/student data.
 */
export async function fetchMentees(mentorUserId) {
  const { data: reqs, error } = await supabase
    .from('connection_requests')
    .select(`
      id, created_at, updated_at, type, message,
      sender: profiles!connection_requests_sender_id_fkey (
        id, full_name, avatar_url, user_type, location, bio, email
      )
    `)
    .eq('receiver_id', mentorUserId)
    .eq('status', 'accepted')
    .in('type', ['mentor_request', 'mentor'])
    .order('updated_at', { ascending: false });

  if (error) throw error;
  if (!reqs?.length) return [];

  const senderIds = reqs.map(r => r.sender?.id).filter(Boolean);

  // Enrich with startup/student data
  const [fpRes, spRes] = await Promise.all([
    supabase.from('founder_profiles')
      .select('user_id, company_name, idea_title, startup_stage, industry, problem_solving')
      .in('user_id', senderIds),
    supabase.from('student_profiles')
      .select('user_id, has_startup_idea, startup_idea_description, help_needed, commitment_level')
      .in('user_id', senderIds),
  ]);

  const fpMap = Object.fromEntries((fpRes.data || []).map(r => [r.user_id, r]));
  const spMap = Object.fromEntries((spRes.data || []).map(r => [r.user_id, r]));

  return reqs.map(req => ({
    requestId:    req.id,
    since:        req.updated_at || req.created_at,
    user:         req.sender || {},
    founderData:  fpMap[req.sender?.id] || null,
    studentData:  spMap[req.sender?.id] || null,
  }));
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND FOUNDERS (mentor browsing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch founders for a mentor to browse and offer help.
 */
export async function fetchFoundersForMentor({
  industry = '',
  stage    = '',
  limit    = 20,
} = {}) {
  let q = supabase
    .from('founder_profiles')
    .select(`
      id, user_id, company_name, idea_title, industry,
      startup_stage, company_stage, problem_solving, problem_statement,
      unique_value_proposition, target_market, help_needed, looking_for,
      profiles ( id, full_name, bio, avatar_url, location )
    `)
    .limit(limit);

  if (industry) q = q.eq('industry', industry);
  if (stage)    q = q.or(`startup_stage.eq.${stage},company_stage.eq.${stage}`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

/**
 * Fetch students who have a startup idea and need mentor help.
 */
export async function fetchStudentsWithIdeas({
  helpArea = '',
  limit    = 20,
} = {}) {
  let q = supabase
    .from('student_profiles')
    .select(`
      id, user_id, has_startup_idea, startup_idea_description,
      help_needed, commitment_level, interests, career_goals,
      profiles ( id, full_name, bio, avatar_url, location )
    `)
    .eq('has_startup_idea', true)
    .limit(limit);

  const { data, error } = await q;
  if (error) throw error;

  let result = data || [];
  if (helpArea) {
    result = result.filter(s =>
      (s.help_needed || []).some(h =>
        h.toLowerCase().includes(helpArea.toLowerCase())
      )
    );
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// AI MATCHING (rule-based, no tokens)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Score founders against a mentor's expertise.
 * Returns founders sorted by relevance with a _score and _matchReason.
 */
export function rankFoundersForMentor(founders, mentorProfile) {
  const expertise  = (mentorProfile.expertise_areas || []).map(s => s.toLowerCase());
  const canHelp    = (mentorProfile.can_help_with   || []).map(s => s.toLowerCase());

  return founders.map(f => {
    let score  = 0;
    const need = (f.help_needed || []).map(s => s.toLowerCase());
    const ind  = (f.industry    || '').toLowerCase();

    // Industry match with expertise
    if (expertise.some(e => e.includes(ind) || ind.includes(e))) score += 40;

    // Help needed matches what mentor can provide
    const helpHits = need.filter(h => canHelp.some(c => c.includes(h) || h.includes(c)));
    score += helpHits.length * 20;

    // Problem statement exists = better signal
    if (f.problem_solving || f.problem_statement) score += 10;

    const reasons = [];
    if (ind && expertise.some(e => e.includes(ind) || ind.includes(e)))
      reasons.push(`${f.industry} aligns with your expertise`);
    if (helpHits.length)
      reasons.push(`Needs help with ${helpHits[0]}`);

    return {
      ...f,
      _score:       Math.min(score, 100),
      _matchReason: reasons[0] || 'Matches your profile',
    };
  }).sort((a, b) => b._score - a._score);
}

/**
 * Score students with ideas against a mentor's expertise.
 */
export function rankStudentsForMentor(students, mentorProfile) {
  const canHelp = (mentorProfile.can_help_with || []).map(s => s.toLowerCase());

  return students.map(s => {
    let score = 0;
    const need = (s.help_needed || []).map(h => h.toLowerCase());
    const hits = need.filter(h => canHelp.some(c => c.includes(h) || h.includes(c)));
    score += hits.length * 25;
    if (s.startup_idea_description) score += 15;
    if (s.commitment_level === 'Full-time') score += 10;

    return {
      ...s,
      _score:       Math.min(score, 100),
      _matchReason: hits.length
        ? `Needs help with ${hits[0]}`
        : 'Has a startup idea',
    };
  }).sort((a, b) => b._score - a._score);
}