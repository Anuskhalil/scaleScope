// src/services/studentService.js — PRODUCTION-READY, FIXED & OPTIMIZED
import { supabase } from '../lib/supabaseClient';

const CACHE = new Map();
const DEFAULT_CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';

const getCache = (key) => {
  const item = CACHE.get(key);
  if (item && Date.now() - item.ts < item.ttl) return item.data;
  CACHE.delete(key);
  return null;
};

const setCache = (key, data, ttl = DEFAULT_CACHE_TTL) => {
  CACHE.set(key, { data, ts: Date.now(), ttl });
};

const clearCache = (pattern) => {
  // Clear all keys matching pattern (e.g., 'profile:*', 'cofounders:*')
  for (let key of CACHE.keys()) {
    if (pattern === '*' || key.startsWith(pattern) || key.includes(pattern)) {
      CACHE.delete(key);
    }
  }
};

const calculateCoFounderScore = (currentUser, candidate) => {
  if (!currentUser || !candidate) return 0;
  let score = 0;

  // ✅ ONLY use skills_with_levels (JSONB array of objects)
  const userSkills = (currentUser.skills_with_levels || [])
    .map(s => s?.skill?.toLowerCase())
    .filter(Boolean);

  const candidateSkills = (candidate.skills_with_levels || [])
    .map(s => s?.skill?.toLowerCase())
    .filter(Boolean);

  // Complementary skills scoring
  const complementary = candidateSkills.filter(s => !userSkills.includes(s)).length;
  const totalPossible = Math.max(userSkills.length, candidateSkills.length, 1);
  score += Math.round((complementary / totalPossible) * 35);

  // Interest overlap
  const userInterests = (currentUser.interests || []).map(i => i?.toLowerCase());
  const candidateInterests = (candidate.interests || []).map(i => i?.toLowerCase());
  const commonInterests = candidateInterests.filter(i => userInterests.includes(i)).length;
  score += Math.round((commonInterests / Math.max(userInterests.length, 1)) * 20);

  // Domain match bonus
  if (currentUser.idea_domain && candidate.idea_domain &&
    currentUser.idea_domain.toLowerCase() === candidate.idea_domain.toLowerCase()) {
    score += 5;
  }

  // Commitment alignment
  if (currentUser.commitment_level === candidate.commitment_level) {
    score += 15;
  } else if (
    (currentUser.commitment_level?.includes('Full-time') && candidate.commitment_level?.includes('Full-time')) ||
    (currentUser.commitment_level?.includes('Casual') && candidate.commitment_level?.includes('Casual'))
  ) {
    score += 8;
  }

  // Help needed ↔ skills match
  const userNeeds = (currentUser.help_needed || []).map(h => h?.toLowerCase());
  const helpMatches = userNeeds.filter(need => candidateSkills.includes(need)).length;
  score += Math.round((helpMatches / Math.max(userNeeds.length, 1)) * 10);

  // Profile completion bonus
  score += Math.round((candidate.profile_completion || 0) * 0.1);

  // Recency bonus
  if (candidate.updated_at) {
    const daysSinceUpdate = (Date.now() - new Date(candidate.updated_at).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceUpdate <= 7) score += 5;
    else if (daysSinceUpdate <= 30) score += 2;
  }

  return Math.min(Math.round(score), 100);
};

export async function fetchStudentProfile(userId) {
  const cacheKey = `profile:${userId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const [pRes, spRes] = await Promise.all([
      supabase.from('profiles').select('id, full_name, email, user_type, avatar_url, bio, location, updated_at').eq('id', userId).maybeSingle(),
      supabase.from('student_profiles').select(`
        id, user_id, university, degree, major, graduation_year_int, current_year, 
        career_goals, looking_for, has_startup_idea, startup_idea_description,
        idea_title, idea_domain, idea_stage, target_audience, unique_value_prop,
        skills_with_levels, help_needed, commitment_level, short_bio_for_mentors, 
        has_cofounder, interests, profile_completion, updated_at
      `).eq('user_id', userId).maybeSingle()
    ]);

    if (pRes.error) throw pRes.error;
    if (spRes.error) throw spRes.error;

    const merged = { ...(pRes.data || {}), ...(spRes.data || {}) };
    setCache(cacheKey, merged);
    return merged;
  } catch (err) {
    console.error('fetchStudentProfile:', err);
    return null;
  }
}

export async function updateProfile(userId, updates) {
  const { error } = await supabase.from('profiles').update({
    ...updates,
    updated_at: new Date().toISOString(),
    last_active: new Date().toISOString()
  }).eq('id', userId);

  if (error) throw error;

  // ✅ Smart cache invalidation
  clearCache(`profile:${userId}`);
  clearCache('cofounders:'); // Refresh suggestions when profile changes
  clearCache('mentors:');

  return true;
}

export async function updateStudentProfile(userId, updates) {
  const { error } = await supabase.from('student_profiles').upsert({
    user_id: userId,
    ...updates,
    updated_at: new Date().toISOString()
  }, { onConflict: 'user_id' });

  if (error) throw error;

  // ✅ Smart cache invalidation
  clearCache(`profile:${userId}`);
  clearCache('cofounders:');
  clearCache('dashboard:');

  return true;
}

export async function uploadAvatar(userId, file) {
  if (!file.type.startsWith('image/')) throw new Error('Invalid file type');
  if (file.size > 5 * 1024 * 1024) throw new Error('File too large (max 5MB)');

  const ext = file.name.split('.').pop().toLowerCase();
  const path = `avatars/${userId}.${ext}`;

  const { error: uploadError } = await supabase.storage.from('avatars').upload(path, file, { upsert: true, cacheControl: '3600' });
  if (uploadError) throw uploadError;

  const { data: signedData, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(path, 86400);
  if (signedError || !signedData?.signedUrl) throw new Error('Failed to generate avatar URL');

  const { error } = await supabase.from('profiles').update({
    avatar_url: path,
    updated_at: new Date().toISOString()
  }).eq('id', userId);

  if (error) throw error;

  // ✅ Clear avatar cache
  clearCache(`profile:${userId}`);

  return signedData.signedUrl;
}

export async function fetchCoFounders({
  skills = [],
  location = '',
  commitment = '',
  limit = 20,
  excludeUserId,
  fresh = false,
  currentUserData = null
} = {}) {

  const cacheKey = `cofounders:${JSON.stringify({ skills, location, commitment, limit, fresh })}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    // 🔹 Step 1: Fetch current user data for scoring
    let currentUser = currentUserData;
    if (!currentUser && excludeUserId) {
      const { data: current } = await supabase
        .from('student_profiles')
        .select(`
        skills_with_levels,
        interests,
        idea_domain,
        commitment_level,
        help_needed
      `)
        .eq('user_id', excludeUserId)
        .maybeSingle();

      currentUser = current;
    }

    // 🔹 Step 2: Build base query — ONLY safe columns & operators
    let query = supabase
      .from('student_profiles')
      .select(`
    id,
    user_id,
    university,
    degree,
    current_year,
    skills_with_levels,
    help_needed,
    commitment_level,
    has_startup_idea,
    startup_idea_description,
    idea_title,
    idea_domain,
    idea_stage,
    target_audience,
    unique_value_prop,
    looking_for,
    interests,
    profile_completion,
    updated_at,
    profiles!student_profiles_user_id_fkey(
      id,
      full_name,
      avatar_url,
      location,
      bio
    )
  `)
      .neq('user_id', excludeUserId)
      .contains('looking_for', ['Co-Founder'])
      .limit(limit * 3);

    query = query.contains('looking_for', ['Co-Founder']);


    if (commitment) {
      query = query.eq('commitment_level', commitment);
    }
    const [studentsRes, foundersRes] = await Promise.all([
      query,
      supabase
        .from('founder_profiles')
        .select(`
          id,
          user_id,
          company_name,
          idea_title,
          industry,
          startup_stage,
          commitment_level,
          help_needed,
          looking_for,
          founder_skills,
          skills_needed,
          profile_completion,
          updated_at,
          profiles!founder_profiles_user_id_fkey(
            id,
            full_name,
            avatar_url,
            location,
            bio,
            user_type
          )
        `)
        .neq('user_id', excludeUserId)
        .contains('looking_for', ['Co-Founder'])
        .limit(limit * 2),
    ]);

    if (studentsRes.error) {
      console.error('fetchCoFounders student query error:', studentsRes.error);
      return [];
    }

    if (foundersRes.error) {
      console.warn('fetchCoFounders founder query error:', foundersRes.error);
    }

    const founderCandidates = (foundersRes.data || []).map((founder) => ({
      ...founder,
      candidate_type: 'founder',
      has_startup_idea: true,
      startup_idea_description: founder.company_name
        ? `${founder.company_name}: ${founder.idea_title || founder.industry || 'Startup'}`
        : founder.idea_title,
      idea_domain: founder.industry,
      idea_stage: founder.startup_stage,
      skills_with_levels: (founder.founder_skills || []).map((skill) => ({ skill })),
      interests: [founder.industry].filter(Boolean),
    }));

    let candidates = [...(studentsRes.data || []), ...founderCandidates];

    // 🔹 Step 6: ✅ Client-side filtering for skills (safe & flexible)
    if (skills.length > 0) {
      candidates = candidates.filter(candidate => {
        const candidateSkills = (candidate.skills_with_levels || [])
          .map(sk => sk?.skill?.toLowerCase())
          .filter(Boolean);

        return skills.some(requestedSkill =>
          candidateSkills.some(cs => cs?.includes(requestedSkill.toLowerCase()))
        );
      });
    }

    // 🔹 Step 7: Score & rank candidates
    const scored = candidates
      .map(candidate => ({
        ...candidate,
        matchScore: calculateCoFounderScore(currentUser, candidate)
      }))
      .sort((a, b) => b.matchScore - a.matchScore)
      .slice(0, limit);

    // 🔹 Step 8: Cache result (only if not fresh)
    if (!fresh) {
      setCache(cacheKey, scored);
    }

    return scored;
  } catch (err) {
    console.error('fetchCoFounders:', err);
    return [];
  }
}

export async function fetchMentors({
  expertise = [],
  location = '',
  proBono = false,
  limit = 20,
  fresh = false
} = {}) {
  const cacheKey = `mentors:${JSON.stringify({ expertise, location, proBono, limit, fresh })}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    let query = supabase.from('profiles')
      .select(`
        id, full_name, avatar_url, location, bio, user_type, updated_at,
        student_profiles(expertise, years_experience, company, pro_bono, mentorship_style)
      `)
      .eq('user_type', 'mentor')
      .limit(limit);

    if (location) query = query.ilike('location', `%${location}%`);

    const { data, error } = await query;
    if (error) {
      console.error('fetchMentors query error:', error);
      return [];
    }

    let result = (data || []).map(m => ({
      user_id: m.id,
      profiles: {
        full_name: m.full_name,
        avatar_url: m.avatar_url,
        location: m.location,
        bio: m.bio
      },
      expertise: m.student_profiles?.expertise || [],
      years: m.student_profiles?.years_experience,
      company: m.student_profiles?.company,
      pro_bono: m.student_profiles?.pro_bono,
      style: m.student_profiles?.mentorship_style,
      updated_at: m.updated_at
    }));

    if (expertise.length > 0) {
      result = result.filter(m =>
        expertise.some(e =>
          m.expertise.some(exp => exp?.toLowerCase().includes(e.toLowerCase()))
        )
      );
    }
    if (proBono) result = result.filter(m => m.pro_bono);

    if (!fresh) {
      setCache(cacheKey, result);
    }

    return result;
  } catch (err) {
    console.error('fetchMentors:', err);
    return [];
  }
}

export async function sendConnectionRequest(payload) {
  try {
    const token = (await supabase.auth.getSession())
      .data.session?.access_token;

    const res = await fetch(`${BASE}/api/connections/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify(payload)
    });

    const data = await res.json();

    if (!res.ok) {
      throw new Error(data.error || 'Failed to send request');
    }

    return data;
  } catch (err) {
    console.error('sendConnectionRequest:', err);
    throw err;
  }
}

export const fetchOutgoingRequests = async (userId, { fresh = false } = {}) => {
  const cacheKey = `outgoing_requests:${userId}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    const { data, error } = await supabase
      .from('connection_requests')
      .select('*')
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = data || [];

    if (!fresh) {
      setCache(cacheKey, result, 15 * 1000);
    }

    return result;
  } catch (err) {
    console.error('fetchOutgoingRequests:', err);
    return [];
  }
};

export async function getConnectionStatus(userId, otherUserId, type) {
  try {
    const cacheKey = `connection_status:${userId}:${otherUserId}:${type}`;
    const cached = getCache(cacheKey);
    if (cached) return cached;

    const { data: sent } = await supabase
      .from('connection_requests')
      .select('id, status, sender_id, receiver_id')
      .eq('sender_id', userId)
      .eq('receiver_id', otherUserId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (sent) {
      return {
        status: sent.status,
        isSender: true,
        id: sent.id
      };
    }

    const { data: received } = await supabase
      .from('connection_requests')
      .select('id, status, sender_id, receiver_id')
      .eq('sender_id', otherUserId)
      .eq('receiver_id', userId)
      .eq('type', type)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (received) {
      return {
        status: received.status,
        isSender: false,
        id: received.id
      };
    }

    setCache(cacheKey, null, 2 * 60 * 1000);
    return null;
  } catch (err) {
    console.error('getConnectionStatus error:', err);
    return null;
  }
}

export async function fetchIncomingRequests(userId, { fresh = false } = {}) {
  const cacheKey = `incoming_requests:${userId}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    const { data, error } = await supabase
      .from('connection_requests')
      .select(`
        *, 
        sender:profiles!connection_requests_sender_id_fkey(
          id, full_name, user_type, avatar_url, location, bio
        )
      `)
      .eq('receiver_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = data || [];

    if (!fresh) {
      setCache(cacheKey, result, 15 * 1000);
    }

    return result;
  } catch (err) {
    console.error('fetchIncomingRequests:', err);
    return [];
  }
}

export async function fetchSentRequests(userId) {
  const cacheKey = `sent_requests:${userId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('connection_requests')
      .select(`
        *, 
        receiver:profiles!connection_requests_receiver_id_fkey(
          id, full_name, user_type, avatar_url, location, bio
        )
      `)
      .eq('sender_id', userId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = data || [];
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('fetchSentRequests:', err);
    return [];
  }
}

export async function respondToRequest(requestId, status) {
  if (!['accepted', 'declined'].includes(status)) throw new Error('Invalid status');

  const { data: req, error: fetchError } = await supabase
    .from('connection_requests')
    .select('sender_id, receiver_id')
    .eq('id', requestId)
    .eq('status', 'pending')
    .single();

  if (fetchError || !req) throw new Error('Request not found');

  const { error } = await supabase
    .from('connection_requests')
    .update({
      status,
      responded_at: new Date().toISOString()
    })
    .eq('id', requestId);

  if (error) throw error;

  // ✅ Invalidate caches
  clearCache(`incoming_requests:${req.receiver_id}`);
  clearCache(`sent_requests:${req.sender_id}`);
  clearCache('dashboard:');

  return true;
}

export async function getOrCreateConversation(userId, otherUserId) {
  const { data, error } = await supabase
    .rpc('create_conversation_with_participants', {
      p_created_by: userId,
      p_other_user: otherUserId,
      p_type: 'direct'
    });
  if (error) throw error;
  return data;
}

export async function fetchConversations(userId, { fresh = false } = {}) {
  const cacheKey = `conversations:${userId}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    const { data: myParticipants, error: partError } = await supabase
      .from('conversation_participants')
      .select('conversation_id, last_read_at')
      .eq('user_id', userId);

    if (partError) {
      console.error('Participants fetch error:', partError);
      return [];
    }

    if (!myParticipants?.length) {
      setCache(cacheKey, [], 30 * 1000);
      return [];
    }

    const conversationIds = myParticipants
      .map((p) => p.conversation_id)
      .filter(Boolean);

    if (!conversationIds.length) {
      return [];
    }

    const [conversationsRes, participantsRes, messagesRes] = await Promise.all([
      supabase
        .from('conversations')
        .select('id, type, title, last_message_at, created_at')
        .in('id', conversationIds)
        .order('last_message_at', { ascending: false, nullsFirst: false }),

      supabase
        .from('conversation_participants')
        .select('conversation_id, user_id')
        .in('conversation_id', conversationIds),

      supabase
        .from('messages')
        .select('id, conversation_id, content, sender_id, created_at')
        .in('conversation_id', conversationIds)
        .order('created_at', { ascending: true }),
    ]);

    if (conversationsRes.error) {
      console.error('Conversation fetch error:', conversationsRes.error);
      return [];
    }

    if (participantsRes.error) {
      console.error('Participants list fetch error:', participantsRes.error);
      return [];
    }

    if (messagesRes.error) {
      console.error('Messages list fetch error:', messagesRes.error);
      return [];
    }

    const allParticipants = participantsRes.data || [];
    const messages = messagesRes.data || [];

    const otherUserIds = [
      ...new Set(
        allParticipants
          .filter((p) => p.user_id !== userId)
          .map((p) => p.user_id)
          .filter(Boolean)
      ),
    ];

    const { data: profiles, error: profilesError } = otherUserIds.length
      ? await supabase
        .from('profiles')
        .select('id, full_name, user_type, avatar_url, location')
        .in('id', otherUserIds)
      : { data: [], error: null };

    if (profilesError) {
      console.error('Profiles fetch error:', profilesError);
      return [];
    }

    const profileById = new Map(
      (profiles || []).map((profile) => [profile.id, profile])
    );

    const result = (conversationsRes.data || []).map((conv) => {
      const currentParticipant = myParticipants.find(
        (p) => p.conversation_id === conv.id
      );

      const otherParticipant = allParticipants.find(
        (p) => p.conversation_id === conv.id && p.user_id !== userId
      );

      const convMessages = messages.filter(
        (msg) => msg.conversation_id === conv.id
      );

      const lastMessage = convMessages.reduce((latest, msg) => {
        if (!latest) return msg;

        return new Date(msg.created_at) > new Date(latest.created_at)
          ? msg
          : latest;
      }, null);

      const unreadCount = convMessages.filter((msg) => {
        return (
          msg.sender_id !== userId &&
          (!currentParticipant?.last_read_at ||
            new Date(msg.created_at) > new Date(currentParticipant.last_read_at))
        );
      }).length;

      return {
        id: conv.id,
        type: conv.type,
        title: conv.title,
        last_message_at: conv.last_message_at,
        otherUser: otherParticipant
          ? profileById.get(otherParticipant.user_id)
          : null,
        lastMessage,
        unreadCount,
      };
    });

    setCache(cacheKey, result, 30 * 1000);
    return result;
  } catch (err) {
    console.error('fetchConversations:', err);
    return [];
  }
}
export async function fetchMessages(conversationId) {
  try {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, conversation_id, sender_id, content, type, 
        file_url, file_name, file_size, created_at, 
        profiles!messages_sender_id_fkey(id, full_name, avatar_url)
      `)
      .eq('conversation_id', conversationId)
      .order('created_at', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.error('fetchMessages:', err);
    return [];
  }
}

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
      file_size: fileData.size || null
    })
    .select()
    .single();

  if (error) throw error;

  // ✅ Invalidate conversation cache to show new message
  clearCache(`conversations:${senderId}`);

  return data;
}

export async function markConversationRead(conversationId, userId) {
  const { error } = await supabase
    .from('conversation_participants')
    .update({ last_read_at: new Date().toISOString() })
    .eq('conversation_id', conversationId)
    .eq('user_id', userId);

  if (error) throw error;

  // ✅ Refresh conversation list
  clearCache(`conversations:${userId}`);

  return true;
}

export function subscribeToMessages(conversationId, onNewMessage) {
  return supabase
    .channel(`msg:${conversationId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `conversation_id=eq.${conversationId}`
    }, payload => {
      onNewMessage(payload.new);
      // Optional: clear cache when new message arrives
      // clearCache(`conversations:*`);
    })
    .on('error', err => console.error('Realtime error:', err))
    .subscribe();
}

export function subscribeToConversations(userId, onChange) {
  return supabase
    .channel(`conv:${userId}`)
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations'
    }, payload => {
      onChange(payload);
      clearCache(`conversations:${userId}`);
    })
    .on('error', err => console.error('Realtime error:', err))
    .subscribe();
}


export async function fetchOpportunities({ limit = 10, type = null, location = null, fresh = false } = {}) {
  const cacheKey = `opportunities:${JSON.stringify({ limit, type, location, fresh })}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  try {
    let query = supabase.from('opportunities')
      .select('*')
      .eq('is_active', true)
      .gte('deadline', new Date().toISOString().split('T')[0])
      .order('is_featured', { ascending: false })
      .order('deadline', { ascending: true })
      .limit(limit);

    if (type) query = query.eq('type', type);
    if (location) query = query.ilike('location', `%${location}%`);

    const { data, error } = await query;
    if (error) throw error;

    const result = data || [];
    if (!fresh) setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('fetchOpportunities:', err);
    return [];
  }
}

export async function fetchMatchingPreferences(userId) {
  const cacheKey = `matching_prefs:${userId}`;
  const cached = getCache(cacheKey);
  if (cached) return cached;

  try {
    const { data, error } = await supabase
      .from('matching_preferences')
      .select('*')
      .eq('user_id', userId)
      .maybeSingle();

    if (error) throw error;

    const result = data || null;
    setCache(cacheKey, result);
    return result;
  } catch (err) {
    console.error('fetchMatchingPreferences:', err);
    return null;
  }
}

export async function updateMatchingPreferences(userId, prefs) {
  const { error } = await supabase
    .from('matching_preferences')
    .upsert({
      user_id: userId,
      ...prefs,
      updated_at: new Date().toISOString()
    }, { onConflict: 'user_id' });

  if (error) throw error;

  // ✅ Invalidate related caches
  clearCache(`matching_prefs:${userId}`);
  clearCache(`profile:${userId}`);
  clearCache('cofounders:');
  clearCache('mentors:');

  return true;
}

export async function fetchDashboardData(userId, { fresh = false } = {}) {
  const cacheKey = `dashboard:${userId}:${fresh ? 'fresh' : 'cached'}`;

  if (!fresh) {
    const cached = getCache(cacheKey);
    if (cached) return cached;
  }

  const results = await Promise.allSettled([
    fetchStudentProfile(userId),
    fetchCoFounders({ limit: 6, excludeUserId: userId, fresh, currentUserData: null }),
    fetchMentors({ limit: 6, fresh }),
    fetchConversations(userId),
    fetchIncomingRequests(userId),
    fetchOpportunities({ limit: 5, fresh }),
    fetchMatchingPreferences(userId)
  ]);

  const result = {
    profile: results[0].status === 'fulfilled' ? results[0].value : null,
    coFounders: results[1].status === 'fulfilled' ? results[1].value : [],
    mentors: results[2].status === 'fulfilled' ? results[2].value : [],
    conversations: results[3].status === 'fulfilled' ? results[3].value : [],
    incomingRequests: results[4].status === 'fulfilled' ? results[4].value : [],
    opportunities: results[5].status === 'fulfilled' ? results[5].value : [],
    matchingPrefs: results[6].status === 'fulfilled' ? results[6].value : null,
    error: results.find(r => r.status === 'rejected')?.reason?.message || null
  };

  if (!fresh) {
    setCache(cacheKey, result, 3 * 60 * 1000); // 3 min cache for dashboard
  }

  return result;
}

export async function logStudentActivity(userId, type, description, meta = {}) {
  try {
    await supabase.from('student_activities').insert({
      user_id: userId,
      type,
      description,
      meta,
      created_at: new Date().toISOString()
    });
  } catch (err) {
    console.warn('logStudentActivity failed:', err);
  }
}

export function clearAllCaches() {
  CACHE.clear();
  console.log('🧹 All caches cleared');
}

export function getCacheStats() {
  return {
    size: CACHE.size,
    keys: Array.from(CACHE.keys())
  };
}
