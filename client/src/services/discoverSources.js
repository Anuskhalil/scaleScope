// Named results keep optional sources from shifting unrelated query results.
export async function fetchDiscoverSources(db, api, userId) {
  const requests = {
    profileRes: db.from('profiles')
      .select('id, full_name, avatar_url, location, bio, user_type')
      .eq('id', userId).maybeSingle(),
    founderRes: db.from('founder_profiles')
      .select('user_id,industry,startup_stage,funding_stage,metadata,commitment_level,help_needed,looking_for,founder_skills')
      .eq('user_id', userId).maybeSingle(),
    foundersRes: db.from('founder_profiles')
      .select('id,user_id,company_name,idea_title,industry,startup_stage,funding_stage,metadata,solution_description,unique_value_proposition,target_audience,looking_for,help_needed,commitment_level,founder_skills,profile_completion,profiles!founder_profiles_user_id_fkey(id,full_name,avatar_url,location,bio,user_type)')
      .eq('is_public', true).eq('is_active', true).neq('user_id', userId).limit(100),
    investorsRes: db.from('investor_profiles')
      .select('*,profiles!investor_profiles_user_id_fkey(id,full_name,avatar_url,location,bio,user_type)')
      .eq('is_public', true).eq('is_active', true).neq('user_id', userId).limit(100),
    connectionsRes: api.getMyConnections(),
    prefsRes: db.from('matching_preferences').select('*').eq('user_id', userId).maybeSingle(),
  };
  const entries = await Promise.all(Object.entries(requests).map(async ([name, request]) => {
    try {
      const value = await request;
      if (value?.error) throw value.error;
      return [name, { status: 'fulfilled', value }];
    } catch (reason) {
      return [name, { status: 'rejected', reason }];
    }
  }));
  const results = Object.fromEntries(entries);
  for (const name of ['profileRes', 'founderRes', 'foundersRes', 'investorsRes']) {
    if (results[name].status === 'rejected') throw results[name].reason;
  }
  return results;
}
