// src/services/founderService.js
// ─── All Supabase calls for the early-stage founder role ────────────────────

import { supabase } from '../lib/supabaseClient';

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchFounderProfile(userId) {
  const [profRes, fpRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (profRes.error) throw profRes.error;
  return { profile: profRes.data || {}, founderProfile: fpRes.data || {} };
}

export async function saveFounderBaseProfile(userId, data) {
  const { error } = await supabase.from('profiles').upsert({
    id: userId,
    full_name:    data.full_name,
    email:        data.email,
    user_type:    'early-stage-founder',
    location:     data.location,
    bio:          data.bio,
    avatar_url:   data.avatar_url,
    linkedin_url: data.linkedin_url,
    github_url:   data.github_url,
    twitter_url:  data.twitter_url,
    skills:       data.skills     || [],
    interests:    data.interests  || [],
    profile_completion:   data.profile_completion   || 0,
    onboarding_completed: data.onboarding_completed || false,
    metadata:     data.metadata   || {},
    updated_at:   new Date().toISOString(),
    last_active:  new Date().toISOString(),
  }, { onConflict: 'id' });
  if (error) throw error;
}

export async function saveFounderStartupProfile(userId, data) {
  // funding_raised is NUMERIC in schema — strip non-numeric chars, store null if empty/unparseable
  const parseFunding = (v) => {
    if (!v) return null;
    const n = parseFloat(String(v).replace(/[^0-9.]/g, ''));
    return isNaN(n) ? null : n;
  };

  const { error } = await supabase.from('founder_profiles').upsert({
    user_id:              userId,
    company_name:         data.company_name         || null,
    idea_title:           data.idea_title            || null,
    industry:             data.industry              || null,
    startup_stage:        data.startup_stage         || null,
    company_stage:        data.startup_stage         || null,
    problem_solving:      data.problem_solving       || null,
    problem_statement:    data.problem_statement     || null,
    solution_description: data.solution_description  || null,
    unique_value_proposition: data.unique_value_proposition || null,
    target_market:        data.target_market         || null,
    target_audience:      data.target_audience       || null,
    revenue_model:        data.revenue_model         || null,
    competitors:          data.competitors           || null,
    launch_timeline:      data.launch_timeline       || null,
    team_size:            data.team_size    ? Number(data.team_size)    : null,
    funding_raised:       parseFunding(data.funding_raised),
    funding_stage:        data.funding_stage         || null,
    founding_year:        data.founding_year ? Number(data.founding_year) : null,
    pitch_deck_url:       data.pitch_deck_url        || null,
    demo_url:             data.demo_url              || null,
    website_url:          data.website_url           || null,
    looking_for:          data.looking_for           || [],
    help_needed:          data.help_needed           || [],
    skills_needed:        data.skills_needed         || [],
    updated_at:           new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

export async function uploadFounderAvatar(userId, file) {
  const path = `avatars/${userId}.${file.name.split('.').pop()}`;
  const { error } = await supabase.storage.from('avatars').upload(path, file, { upsert: true });
  if (error) throw error;
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  return publicUrl;
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchFounderDashboardData(userId) {
  const [profRes, fpRes, reqRes, convRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
    supabase.from('connection_requests')
      .select(`id, type, message, status, created_at,
        sender:profiles!connection_requests_sender_id_fkey (
          id, full_name, avatar_url, user_type, location
        )`)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false })
      .limit(8),
    supabase.from('conversations')
      .select(`id, last_message_at,
        conversation_participants!inner ( user_id,
          profiles ( id, full_name, avatar_url, user_type )
        )`)
      .eq('conversation_participants.user_id', userId)
      .order('last_message_at', { ascending: false })
      .limit(5),
  ]);

  if (profRes.error) throw profRes.error;

  let mentors = [], investors = [];

  try {
    const { data } = await supabase
      .from('mentor_profiles')
      .select(`id, user_id, expertise_areas, years_experience,
        current_role, current_company, is_pro_bono, available_for,
        profiles ( id, full_name, avatar_url, location, bio )`)
      .limit(6);
    mentors = data || [];
  } catch (e) { console.warn('mentors:', e.message); }

  try {
    const { data } = await supabase
      .from('investor_profiles')
      .select(`id, profile_id, investor_type, fund_name, preferred_stages,
        preferred_industries, check_range_min, check_range_max,
        total_investments, what_i_look_for, is_verified,
        profiles!investor_profiles_profile_id_fkey (
          id, full_name, avatar_url, location
        )`)
      .eq('is_active', true)
      .limit(6);
    investors = data || [];
  } catch (e) { console.warn('investors:', e.message); }

  return {
    profile:        profRes.data  || {},
    founderProfile: fpRes.data    || {},
    requests:       reqRes.data   || [],
    conversations:  convRes.data  || [],
    mentors,
    investors,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND TEAM
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchTeamCandidates({ skills = [], commitment = '', limit = 24 } = {}) {
  const { data, error } = await supabase
    .from('student_profiles')
    .select(`id, user_id,
      skills_with_levels, looking_for, help_needed, interests,
      commitment_level, hours_per_week, has_startup_idea,
      startup_idea_description, career_goals,
      profiles ( id, full_name, bio, avatar_url, location, skills )`)
    .or('looking_for.cs.{"Co-Founder"},looking_for.cs.{"Startup"}')
    .limit(limit);
  if (error) throw error;

  let result = data || [];

  if (skills.length > 0) {
    result = result.filter(s => {
      const ss = (s.skills_with_levels || []).map(x => (x.skill || x).toLowerCase());
      return skills.some(sk => ss.some(sv => sv.includes(sk.toLowerCase())));
    });
  }
  if (commitment) {
    result = result.filter(s => s.commitment_level === commitment);
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND MENTORS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchMentorsForFounder({ industry = '', expertise = [], limit = 20 } = {}) {
  let query = supabase
    .from('mentor_profiles')
    .select(`id, user_id,
      expertise_areas, years_experience, current_role, current_company,
      is_pro_bono, can_help_with, available_for, successful_exits,
      companies_founded, mentorship_style,
      profiles ( id, full_name, bio, avatar_url, location, skills,
        linkedin_url, github_url )`)
    .limit(limit);

  if (expertise.length > 0) query = query.overlaps('expertise_areas', expertise);

  const { data, error } = await query;
  if (error) throw error;

  let result = data || [];
  if (industry) {
    result = result.filter(m =>
      (m.can_help_with || []).some(h => h.toLowerCase().includes(industry.toLowerCase())) ||
      (m.expertise_areas || []).some(e => e.toLowerCase().includes(industry.toLowerCase()))
    );
  }
  return result;
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND INVESTORS
// ═══════════════════════════════════════════════════════════════════════════

export async function fetchInvestors({ stage = '', industry = '', limit = 20 } = {}) {
  let query = supabase
    .from('investor_profiles')
    .select(`id, profile_id,
      investor_type, fund_name, preferred_stages, preferred_industries,
      check_range_min, check_range_max, investment_thesis,
      geography_focus, total_investments, exits,
      what_i_look_for, is_verified, is_active, response_time,
      profiles!investor_profiles_profile_id_fkey (
        id, full_name, bio, avatar_url, location,
        linkedin_url, twitter_url )`)
    .eq('is_active', true)
    .limit(limit);

  if (stage)    query = query.contains('preferred_stages', [stage]);
  if (industry) query = query.contains('preferred_industries', [industry]);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// CONNECTIONS
// ═══════════════════════════════════════════════════════════════════════════

export async function respondToConnectionRequest(requestId, status) {
  const { error } = await supabase
    .from('connection_requests')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', requestId);
  if (error) throw error;
}

export async function sendConnectionRequest(senderId, receiverId, type, message = '') {
  const { error } = await supabase.from('connection_requests').insert({
    sender_id:   senderId,
    receiver_id: receiverId,
    type, message, status: 'pending',
    created_at:  new Date().toISOString(),
  });
  if (error) throw error;
}

export async function getOrCreateConversation(userId, otherUserId) {
  const { data: mine } = await supabase
    .from('conversation_participants').select('conversation_id').eq('user_id', userId);
  if (mine?.length) {
    const ids = mine.map(e => e.conversation_id);
    const { data: shared } = await supabase
      .from('conversation_participants').select('conversation_id')
      .eq('user_id', otherUserId).in('conversation_id', ids);
    if (shared?.length) return shared[0].conversation_id;
  }
  const { data: conv, error } = await supabase
    .from('conversations').insert({ created_at: new Date().toISOString() }).select('id').single();
  if (error) throw error;
  await supabase.from('conversation_participants').insert([
    { conversation_id: conv.id, user_id: userId },
    { conversation_id: conv.id, user_id: otherUserId },
  ]);
  return conv.id;
}

// ═══════════════════════════════════════════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════════════════════════════════════════

export function calcFounderCompletion(p, fp) {
  let s = 0;
  // Identity (30)
  if ((p.full_name  || '').trim().length > 1)  s += 8;
  if ((p.bio        || '').trim().length > 20) s += 8;
  if  (p.avatar_url)                           s += 5;
  if  (p.location)                             s += 4;
  if  (p.linkedin_url || p.github_url)         s += 5;
  // Startup (50)
  if ((fp.company_name || fp.idea_title || '').trim().length > 1) s += 10;
  if  (fp.industry)                            s += 8;
  if  (fp.startup_stage || fp.company_stage)   s += 7;
  if ((fp.problem_solving || fp.problem_statement || '').length > 20) s += 10;
  if ((fp.unique_value_proposition || '').length > 10) s += 8;
  if  (fp.target_market || fp.target_audience) s += 7;
  // Proof (20)
  if  (fp.pitch_deck_url)                      s += 8;
  if  (fp.demo_url)                            s += 6;
  if  (fp.funding_stage)                       s += 6;
  return Math.min(s, 100);
}

export function formatCheckSize(min, max) {
  const fmt = n => n >= 1000000 ? `$${(n/1000000).toFixed(1)}M` : `$${(n/1000).toFixed(0)}K`;
  if (!min && !max) return 'Undisclosed';
  if (!min) return `Up to ${fmt(max)}`;
  if (!max) return `${fmt(min)}+`;
  return `${fmt(min)} – ${fmt(max)}`;
}