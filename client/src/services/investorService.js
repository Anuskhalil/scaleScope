// src/services/investorService.js
// All Supabase data functions for the investor role.
// Connection / messaging re-exported from studentService (shared infrastructure).

import { supabase } from '../lib/supabaseClient';
import { backendApi } from '../lib/backendApi';
import { attachServerMatches } from './serverMatching';
import { uploadRoleAvatar } from '../utils/avatarStorage';

// ── Re-export shared infrastructure ──────────────────────────────────────
export {
  getConnectionStatus,
  fetchConversations,
  fetchMessages,
  sendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToConversations,
  fetchIncomingRequests,
} from './studentService';

export async function sendConnectionRequest(senderId, receiverId, type = 'investor_interest', message = '') {
  if (!senderId) throw new Error('senderId is required');
  if (!receiverId) throw new Error('receiverId is required');

  return backendApi.sendConnect(receiverId, message?.slice(0, 500), type);
}

export async function respondToRequest(requestId, status) {
  const action = status === 'accepted' ? 'accept' : status === 'declined' ? 'decline' : status;
  return backendApi.respondConnect(requestId, action);
}

export async function getOrCreateConversation(userId, otherUserId) {
  if (!userId) throw new Error('userId is required');
  if (!otherUserId) throw new Error('otherUserId is required');

  const data = await backendApi.getOrCreateConversation(otherUserId);
  return data.conversationId || data.id || data.data?.id;
}

// ═══════════════════════════════════════════════════════════════════════════
// PROFILE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch investor's combined profile (profiles + investor_profiles).
 */
export async function fetchInvestorProfile(userId) {
  const [{ data: pd, error: pe }, { data: ip }] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('investor_profiles').select('*').eq('user_id', userId).maybeSingle(),
  ]);
  if (pe) throw pe;
  return { profile: pd || {}, investorProfile: ip || {} };
}

/**
 * Completion score for the profile strength widget.
 */
export function calcInvestorCompletion(p, ip) {
  let s = 0;
  // Identity (25)
  if ((p.full_name  || '').trim().length > 1) s += 7;
  if ((p.bio        || '').trim().length > 30) s += 6;
  if  (p.avatar_url)                           s += 5;
  if  (p.location)                             s += 4;
  if  (p.linkedin_url || ip.website_url || ip.portfolio_url || ip.metadata?.investor_profile_url) s += 3;
  // Investment criteria (45)
  if  (ip.investor_type)                       s += 8;
  if  (ip.firm_name || ip.fund_name)           s += 7;
  if ((ip.preferred_stages || ip.investment_stage || []).length > 0)  s += 8;
  if ((ip.preferred_industries || ip.industries_of_interest || []).length > 0) s += 8;
  if  (ip.check_range_min || ip.check_range_max || ip.ticket_size_min || ip.ticket_size_max) s += 7;
  if  (ip.investment_thesis || ip.what_i_look_for) s += 7;
  // Credibility (20)
  if  ((ip.total_investments || ip.portfolio_count) > 0) s += 7;
  if  ((ip.exits || ip.successful_exits) > 0) s += 7;
  if  (ip.notable_investments)                 s += 6;
  // Preferences (10)
  if  (ip.typical_involvement)                 s += 4;
  if  (ip.response_time)                       s += 3;
  if  (ip.metadata?.portfolio_evidence_url || ip.metadata?.portfolio_evidence_file_url) s += 3;
  return Math.min(s, 100);
}

/**
 * Missing-field nudges for the dashboard.
 */
export function getInvestorProfileNudges(p, ip) {
  const nudges = [];
  if (!(p.bio && p.bio.trim().length > 30))
    nudges.push({ field: 'bio',              msg: 'Add a bio — founders read this before pitching' });
  if (!((ip.preferred_stages || ip.investment_stage || []).length > 0))
    nudges.push({ field: 'preferred_stages', msg: 'Add your investment stage to receive matched pitches' });
  if (!((ip.preferred_industries || ip.industries_of_interest || []).length > 0))
    nudges.push({ field: 'industries',       msg: 'Set your industry focus for better founder matches' });
  if (!ip.investment_thesis)
    nudges.push({ field: 'thesis',           msg: 'Write your thesis — founders use it to self-qualify' });
  if (!p.avatar_url)
    nudges.push({ field: 'avatar_url',       msg: 'Add a photo — investors with photos get 2× more pitches' });
  return nudges.slice(0, 3);
}

/**
 * Format ticket size range into readable label.
 */
export function formatTicketSize(min, max, currency = 'USD') {
  const fmt = n => `${currency} ${Number(n).toLocaleString('en-US')}`;
  if (!min && !max) return 'Undisclosed';
  if (!min) return `Up to ${fmt(max)}`;
  if (!max) return `${fmt(min)}+`;
  return `${fmt(min)} – ${fmt(max)}`;
}

/**
 * Save shared profile fields (profiles table).
 */
export async function saveInvestorBaseProfile(userId, data) {
  const now = new Date().toISOString();
  const { error } = await supabase.from('profiles').upsert({
    id:           userId,
    full_name:    data.full_name,
    email:        data.email,
    user_type:    'investor',
    location:     data.location     || null,
    bio:          data.bio          || null,
    avatar_url:   data.avatar_url   || null,
    linkedin_url: data.linkedin_url || null,
    github_url:   data.github_url   || null,
    twitter_url:  data.twitter_url  || null,
    updated_at:   now,
    last_active:  now,
  }, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Upsert investor-specific fields (investor_profiles table).
 */
export async function saveInvestorDetails(userId, data) {
  const safeArr = (v) => {
    if (Array.isArray(v)) return v.filter((item) => typeof item === 'string' && item.trim());
    if (typeof v === 'string' && v.trim()) return [v.trim()];
    return [];
  };
  const safeInt = (v, fallback = 0) => {
    const n = Number(v);
    return Number.isFinite(n) ? Math.max(0, Math.floor(n)) : fallback;
  };
  const safeNum = (v) => {
    const n = Number(v);
    return v === '' || v === null || v === undefined || !Number.isFinite(n) ? null : n;
  };
  const safeJson = (v) => {
    if (!v || typeof v !== 'object' || Array.isArray(v)) return {};
    return v;
  };
  const preferredStages = safeArr(data.preferred_stages?.length ? data.preferred_stages : data.investment_stage);
  const preferredIndustries = safeArr(data.preferred_industries?.length ? data.preferred_industries : data.industries_of_interest);
  const minCheck = safeNum(data.check_range_min ?? data.ticket_size_min);
  const maxCheck = safeNum(data.check_range_max ?? data.ticket_size_max);
  const totalInvestments = safeInt(data.total_investments ?? data.portfolio_count, 0);
  const exits = safeInt(data.exits ?? data.successful_exits, 0);

  const { error } = await supabase.from('investor_profiles').upsert({
    user_id:               userId,
    profile_id:            userId,
    investor_type:         data.investor_type         || null,
    firm_name:             data.firm_name || data.fund_name || null,
    investment_stage:      preferredStages,
    ticket_size_min:       minCheck,
    ticket_size_max:       maxCheck,
    industries_of_interest: preferredIndustries,
    geographic_focus:      data.geographic_focus || data.geography_focus || null,
    portfolio_count:       totalInvestments,
    successful_exits:      exits,
    notable_investments:   data.notable_investments   || null,
    investment_thesis:     data.investment_thesis || data.what_i_look_for || null,
    typical_involvement:   data.typical_involvement   || null,
    accepting_pitches:     data.accepting_pitches     !== false,
    preferred_contact_method: null,
    fund_name:             data.fund_name || data.firm_name || null,
    preferred_stages:      preferredStages,
    preferred_industries:  preferredIndustries,
    check_range_min:       minCheck,
    check_range_max:       maxCheck,
    geography_focus:       data.geography_focus || data.geographic_focus || null,
    total_investments:     totalInvestments,
    exits,
    what_i_look_for:       data.what_i_look_for || data.investment_thesis || null,
    response_time:         data.response_time || null,
    website_url:           data.website_url || null,
    booking_url:           null,
    investment_frequency:  data.investment_frequency || null,
    lead_or_follow:        data.lead_or_follow || null,
    minimum_traction_required: data.minimum_traction_required || null,
    preferred_business_models: safeArr(data.preferred_business_models),
    portfolio_url:         data.portfolio_url || null,
    due_diligence_requirements: data.due_diligence_requirements || null,
    metadata:              safeJson(data.metadata),
    profile_completion:    safeInt(data.profile_completion, 0),
    onboarding_completed:  Boolean(data.onboarding_completed),
    is_public:             data.is_public !== false,
    is_active:             data.is_active !== false,
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
  window.dispatchEvent(new Event('profile:saved'));
}

/**
 * Upload avatar and update profiles.avatar_url.
 */
export async function uploadInvestorAvatar(userId, file) {
  const { path, signedUrl } = await uploadRoleAvatar({
    roleFolder: 'investors',
    userId,
    file,
  });

  const { error } = await supabase
    .from('profiles')
    .update({
      avatar_url: path,
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
  if (error) throw error;

  return { path, signedUrl };
}

// ═══════════════════════════════════════════════════════════════════════════
// DASHBOARD
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch everything the investor dashboard needs in parallel.
 */
export async function fetchInvestorDashboard(userId) {
  const [profRes, ipRes, reqRes, convRes] = await Promise.all([
    supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
    supabase.from('investor_profiles').select('*').eq('user_id', userId).maybeSingle(),

    // Incoming pitches / connection requests
    supabase.from('connection_requests')
      .select(`
        id, sender_id, type, status, message, created_at,
        sender: profiles!connection_requests_sender_id_fkey (
          id, full_name, avatar_url, user_type, location
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .in('type', ['investor_contact', 'investor_interest', 'investor'])
      .order('created_at', { ascending: false })
      .limit(10),

    // Recent conversations
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

  // Suggested startups (founders matching investor's industry/stage)
  let startups = [];
  try {
    const { data, error } = await supabase
      .from('founder_profiles')
      .select(`
        id, user_id, company_name, idea_title, industry,
        startup_stage, company_stage, problem_solving, problem_statement,
        unique_value_proposition, funding_stage, team_size, looking_for,
        pitch_deck_url, demo_url,
        profiles ( id, full_name, bio, avatar_url, location )
      `)
      .eq('is_public', true)
      .eq('is_active', true)
      .neq('user_id', userId)
      .order('updated_at', { ascending: false })
      .limit(150);
    if (error) throw error;
    startups = data || [];
  } catch (e) { console.warn('startups:', e.message); }

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
      id:              conv.id,
      last_message_at: conv.last_message_at,
      otherUser:       other?.profiles || null,
      lastMessage:     msgs[0] || null,
      unreadCount:     unread,
    };
  });

  return {
    profile:         profRes.data || {},
    investorProfile: ipRes.data   || {},
    requests:        reqRes.data  || [],
    startups,
    convos,
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// FIND STARTUPS (investor browsing)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Fetch startups from student and professional Early Founders.
 */
const normalizeFounderStartupForInvestor = (row = {}) => ({
  ...row,
  source_role: 'founder',
  source_label: 'Founder Startup',
  founder_background: row.metadata?.founder_background || '',
});

export async function fetchStartupsForInvestor({
  industry = '',
  stage    = '',
  limit    = 24,
} = {}) {
  let founderQuery = supabase
    .from('founder_profiles')
    .select(`
      id, user_id, company_name, idea_title, industry,
      startup_stage, company_stage, funding_stage, team_size,
      problem_solving, problem_statement, unique_value_proposition,
      target_market, revenue_model, looking_for, help_needed,
      pitch_deck_url, demo_url, website_url,
      profile_completion, is_public, is_active, metadata,
      profiles ( id, full_name, bio, avatar_url, location )
    `)
    .eq('is_public', true)
    .eq('is_active', true)
    .limit(limit);

  if (industry) {
    founderQuery = founderQuery.eq('industry', industry);
  }

  if (stage) {
    founderQuery = founderQuery.or(`startup_stage.eq.${stage},company_stage.eq.${stage},funding_stage.eq.${stage}`);
  }

  const founderRes = await founderQuery;
  if (founderRes.error) throw founderRes.error;
  return (founderRes.data || [])
    .filter(row => !row.metadata?.founder_intent || row.metadata.founder_intent === 'building')
    .map(normalizeFounderStartupForInvestor);
}

// ═══════════════════════════════════════════════════════════════════════════
// AI MATCHING (rule-based, no tokens)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Score startups against an investor's thesis and criteria.
 * Returns startups sorted by relevance with _score and _matchReason.
 */
export async function rankStartupsForInvestor(startups) {
  return attachServerMatches(startups);
}
