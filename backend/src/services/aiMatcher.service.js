const supabase = require('../config/supabase');
const gemini = require('../config/gemini');

// ✅ ADD these logs inside getCoFounderMatches function:

exports.getCoFounderMatches = async (currentUserId, limit = 8) => {
    console.log(`🔍 Fetching matches for user: ${currentUserId}`);

    const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select(`
        *,
        student_profiles(*)
    `)
        .eq('id', currentUserId)
        .single();

    if (profileError || !profile) {
        console.error('❌ Failed to fetch user profile:', profileError);
        return [];
    }

    console.log('✅ User profile fetched:', {
        id: profile.id,
        hasStudentProfile: !!profile.student_profiles,
        user_type: profile.user_type
    });

    if (!profile.student_profiles) {
        console.warn('⚠️ No student profile found for user');
        return [];
    }

    const user = {
        ...profile,
        ...profile.student_profiles
    };

    const { data: rawCandidates, error: candidatesError } = await supabase
        .from('profiles')
        .select(`
        *,
        student_profiles(*)
    `)
        .eq('user_type', 'student')
        .neq('id', currentUserId)
        .limit(limit * 3);

    if (candidatesError) {
        console.error('❌ Failed to fetch candidates:', candidatesError);
        return [];
    }

    const candidates = rawCandidates?.map(c => ({
        ...c.student_profiles,
        id: c.id,
        user_id: c.id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        location: c.location
    })) || [];

    // 3. Score each candidate WITH LOGS
    const scored = await Promise.all(candidates.map(async (c, idx) => {
        const result = await calculateScore(user, c);
        console.log(`🎯 Candidate ${idx + 1}: ${c.full_name} → Score: ${result.matchScore}`, {
            reasons: result.reasons,
            hasIdea: c.has_startup_idea,
            commitment: c.commitment_level
        });
        return result;
    }));

    // 4. Filter & sort
    const filtered = scored.filter(s => {
        const keep = s.matchScore >= 0;
        if (!keep) console.log(`❌ Filtered out: ${s.full_name} (score: ${s.matchScore})`);
        return keep;
    });

    console.log(`✅ Returning ${filtered.length} matches after filtering`);

    return filtered
        .sort((a, b) => b.matchScore - a.matchScore)
        .slice(0, limit);
};

async function calculateScore(u, c) {
    let score = 0;
    const reasons = [];

    // 🔹 Skills (30%)
    const needed = (u.skills_with_levels || []).filter(s =>
        (s.proficiency || 0) < 3
    );
    const has = (c.skills_with_levels || []).filter(s => s.proficiency >= 4);
    const matches = needed.filter(n => has.some(h => h.skill.toLowerCase() === n.skill.toLowerCase()));
    score += Math.min(30, matches.length * 10);
    if (matches.length) reasons.push(`Knows ${matches.map(m => m.skill).join(', ')}`);

    // 🔹 Commitment (20%)
    if (u.commitment_level === c.commitment_level) {
        score += 20;
        reasons.push('Same commitment level');
    }

    // 🔹 AI Idea Similarity (50%)
    if (u.has_startup_idea && c.has_startup_idea) {
        const sim = await getIdeaSimilarity(u, c);
        score += Math.round(sim * 50);
        reasons.push(sim > 0.7 ? 'Highly aligned startup vision' : 'Complementary market focus');
    } else if (!u.has_startup_idea && !c.has_startup_idea) {
        score += 15;
        reasons.push('Both exploring ideas');
    }

    return {
        id: c.user_id,
        user_id: c.user_id,
        full_name: c.full_name,
        avatar_url: c.avatar_url,
        university: c.university,
        commitment_level: c.commitment_level,
        has_startup_idea: c.has_startup_idea,
        matchScore: Math.min(100, score),
        reasons
    };
}

async function getIdeaSimilarity(a, b) {
    const textA = `${a.idea_title} ${a.idea_domain} ${a.startup_idea_description}`.slice(0, 2000);
    const textB = `${b.idea_title} ${b.idea_domain} ${b.startup_idea_description}`.slice(0, 2000);

    // Use Gemini for similarity scoring
    return await gemini.getSimilarityScore(textA, textB);
}
