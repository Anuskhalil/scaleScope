const supabase = require('../config/supabase');


exports.getCoFounderMatches = async (currentUserId, limit = 8) => {
  const { cofounderMatch, cofounderConsent } = await import('../../../shared/matching.mjs');
  const count = Math.max(1, Math.min(50, Number(limit) || 8));
  const [viewer, candidates] = await Promise.all([
    supabase.from('founder_profiles').select('industry,commitment_level,skills_needed,founder_skills,metadata,looking_for')
      .eq('user_id', currentUserId).maybeSingle(),
    supabase.from('founder_profiles')
      .select('user_id,industry,commitment_level,skills_needed,founder_skills,idea_title,metadata,looking_for,profiles!founder_profiles_user_id_fkey!inner(id,full_name,avatar_url,user_type)')
      .eq('profiles.user_type', 'early-stage-founder')
      .eq('is_public', true).eq('is_active', true)
      .neq('user_id', currentUserId).order('updated_at', { ascending: false }).limit(150),
  ]);
  if (viewer.error || candidates.error) throw viewer.error || candidates.error;
  if (!viewer.data) return [];
  return (candidates.data || []).filter(candidate => cofounderConsent(viewer.data, candidate)).map(candidate => ({
    id: candidate.user_id,
    user_id: candidate.user_id,
    full_name: candidate.profiles?.full_name,
    avatar_url: candidate.profiles?.avatar_url,
    commitment_level: candidate.commitment_level,
    has_startup_idea: Boolean(candidate.idea_title),
    ...cofounderMatch(viewer.data, candidate),
    serverMatch: cofounderMatch(viewer.data, candidate),
  })).sort((a, b) => b.matchScore - a.matchScore).slice(0, count);
};
