// src/services/investorService.js
// All Supabase data functions for the investor role.
// Connection / messaging re-exported from studentService (shared infrastructure).

import { supabase } from '../lib/supabaseClient';

// ── Re-export shared infrastructure ──────────────────────────────────────
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
  fetchIncomingRequests,
} from './studentService';

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
  if  (p.linkedin_url)                         s += 3;
  // Investment criteria (45)
  if  (ip.investor_type)                       s += 8;
  if  (ip.firm_name)                           s += 7;
  if ((ip.investment_stage || []).length > 0)  s += 8;
  if ((ip.industries_of_interest || []).length > 0) s += 8;
  if  (ip.ticket_size_min || ip.ticket_size_max) s += 7;
  if  (ip.investment_thesis)                   s += 7;
  // Credibility (20)
  if  (ip.portfolio_count > 0)                 s += 7;
  if  (ip.successful_exits > 0)               s += 7;
  if  (ip.notable_investments)                 s += 6;
  // Preferences (10)
  if  (ip.typical_involvement)                 s += 5;
  if  (ip.preferred_contact_method)            s += 5;
  return Math.min(s, 100);
}

/**
 * Missing-field nudges for the dashboard.
 */
export function getInvestorProfileNudges(p, ip) {
  const nudges = [];
  if (!(p.bio && p.bio.trim().length > 30))
    nudges.push({ field: 'bio',              msg: 'Add a bio — founders read this before pitching' });
  if (!(ip.investment_stage?.length > 0))
    nudges.push({ field: 'investment_stage', msg: 'Add your investment stage to receive matched pitches' });
  if (!(ip.industries_of_interest?.length > 0))
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
export function formatTicketSize(min, max) {
  const fmt = n => n >= 1_000_000 ? `$${(n / 1_000_000).toFixed(1)}M` : `$${(n / 1000).toFixed(0)}K`;
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
    skills:       data.skills       || [],
    profile_completion:   data.profile_completion   || 0,
    onboarding_completed: data.onboarding_completed || false,
    updated_at:   now,
    last_active:  now,
  }, { onConflict: 'id' });
  if (error) throw error;
}

/**
 * Upsert investor-specific fields (investor_profiles table).
 */
export async function saveInvestorDetails(userId, data) {
  const { error } = await supabase.from('investor_profiles').upsert({
    user_id:               userId,
    investor_type:         data.investor_type         || null,
    firm_name:             data.firm_name             || null,
    investment_stage:      data.investment_stage      || [],
    ticket_size_min:       data.ticket_size_min       ? Number(data.ticket_size_min) : null,
    ticket_size_max:       data.ticket_size_max       ? Number(data.ticket_size_max) : null,
    industries_of_interest: data.industries_of_interest || [],
    geographic_focus:      data.geographic_focus      || null,
    portfolio_count:       data.portfolio_count       ? Number(data.portfolio_count) : 0,
    successful_exits:      data.successful_exits      ? Number(data.successful_exits) : 0,
    notable_investments:   data.notable_investments   || null,
    investment_thesis:     data.investment_thesis     || null,
    typical_involvement:   data.typical_involvement   || null,
    accepting_pitches:     data.accepting_pitches     !== false,
    preferred_contact_method: data.preferred_contact_method || null,
    updated_at:            new Date().toISOString(),
  }, { onConflict: 'user_id' });
  if (error) throw error;
}

/**
 * Upload avatar and update profiles.avatar_url.
 */
export async function uploadInvestorAvatar(userId, file) {
  const path = `avatars/${userId}.${file.name.split('.').pop()}`;
  const { error: ue } = await supabase.storage
    .from('avatars').upload(path, file, { upsert: true });
  if (ue) throw ue;
  const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path);
  await saveInvestorBaseProfile(userId, { avatar_url: publicUrl });
  return publicUrl;
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
        id, type, status, message, created_at,
        sender: profiles!connection_requests_sender_id_fkey (
          id, full_name, avatar_url, user_type, location
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .in('type', ['investor_contact', 'investor'])
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
    const { data } = await supabase
      .from('founder_profiles')
      .select(`
        id, user_id, company_name, idea_title, industry,
        startup_stage, company_stage, problem_solving, problem_statement,
        unique_value_proposition, funding_stage, team_size, looking_for,
        pitch_deck_url, demo_url,
        profiles ( id, full_name, bio, avatar_url, location )
      `)
      .limit(8);
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
 * Fetch founders for an investor to browse.
 */
export async function fetchStartupsForInvestor({
  industry = '',
  stage    = '',
  limit    = 24,
} = {}) {
  let q = supabase
    .from('founder_profiles')
    .select(`
      id, user_id, company_name, idea_title, industry,
      startup_stage, company_stage, funding_stage, team_size,
      problem_solving, problem_statement, unique_value_proposition,
      target_market, revenue_model, looking_for, help_needed,
      pitch_deck_url, demo_url, website_url,
      profiles ( id, full_name, bio, avatar_url, location )
    `)
    .limit(limit);

  if (industry) q = q.eq('industry', industry);
  if (stage)    q = q.or(`startup_stage.eq.${stage},funding_stage.eq.${stage}`);

  const { data, error } = await q;
  if (error) throw error;
  return data || [];
}

// ═══════════════════════════════════════════════════════════════════════════
// AI MATCHING (rule-based, no tokens)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Score startups against an investor's thesis and criteria.
 * Returns startups sorted by relevance with _score and _matchReason.
 */
export function rankStartupsForInvestor(startups, investorProfile) {
  const ip         = investorProfile || {};
  const industries = (ip.industries_of_interest || []).map(s => s.toLowerCase());
  const stages     = (ip.investment_stage       || []).map(s => s.toLowerCase());

  return startups.map(f => {
    let score   = 0;
    const reasons = [];
    const fInd  = (f.industry    || '').toLowerCase();
    const fStage= (f.funding_stage || f.startup_stage || f.company_stage || '').toLowerCase();

    // Industry match
    if (industries.some(i => i.includes(fInd) || fInd.includes(i))) {
      score += 45;
      reasons.push(`${f.industry} matches your focus`);
    }
    // Stage match
    if (stages.some(s => s.includes(fStage) || fStage.includes(s))) {
      score += 35;
      reasons.push(`${f.funding_stage || f.startup_stage || 'Stage'} aligns`);
    }
    // Has pitch deck (investor-ready signal)
    if (f.pitch_deck_url) { score += 10; }
    // Has a defined problem statement
    if (f.problem_solving || f.problem_statement) score += 10;

    return {
      ...f,
      _score:       Math.min(score, 100),
      _matchReason: reasons[0] || 'Matches your portfolio focus',
    };
  }).sort((a, b) => b._score - a._score);
}