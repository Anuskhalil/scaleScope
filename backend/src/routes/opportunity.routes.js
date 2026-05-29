const express = require('express');
const auth = require('../middlewares/auth.middleware');
const supabase = require('../config/supabase');

const router = express.Router();

router.use(auth);

const CURATED_TECH_OPPORTUNITIES = [
  {
    id: 'curated-gdg-kolachi-events',
    title: 'GDG Kolachi Tech Events & Workshops',
    type: 'workshop',
    organiser: 'GDG Kolachi',
    description: 'Karachi developer community events, workshops, hackathons, and Google technology learning sessions.',
    location: 'Karachi, Pakistan',
    city: 'Karachi',
    area: 'Various',
    domain: 'AI',
    industry: 'AI / ML',
    mode: 'hybrid',
    link: 'https://gdgkolachi.com/events',
    source: 'gdg-kolachi',
    source_url: 'https://gdgkolachi.com/events',
    deadline: null,
    tags: ['tech', 'google', 'ai', 'workshop', 'community'],
    verified: true,
    is_featured: true,
    is_active: true,
  },
  {
    id: 'curated-aiseekho-2026',
    title: 'AI Seekho 2026 Hackathon',
    type: 'hackathon',
    organiser: 'GDG Kolachi',
    description: 'Agentic AI hackathon focused on building impactful AI solutions for Pakistan.',
    location: 'Karachi, Pakistan',
    city: 'Karachi',
    area: 'Karachi',
    domain: 'AI',
    industry: 'AI / ML',
    mode: 'offline',
    link: 'https://gdg.community.dev/events/details/google-gdg-kolachi-presents-aiseekho2026-hackathon/',
    source: 'gdg-community',
    source_url: 'https://gdg.community.dev/events/details/google-gdg-kolachi-presents-aiseekho2026-hackathon/',
    deadline: null,
    tags: ['tech', 'ai', 'agentic ai', 'hackathon', 'students'],
    verified: true,
    is_featured: true,
    is_active: true,
  },
  {
    id: 'curated-devday-fast-nuces-2026',
    title: 'DevDay by FAST NUCES Karachi 2026',
    type: 'hackathon',
    organiser: 'FAST NUCES Karachi / ACM HITMS',
    description: 'Developer-first tech fest with coding, innovation, real-world challenges, competitions, and collaboration.',
    location: 'FAST NUCES, Karachi',
    city: 'Karachi',
    area: 'FAST NUCES',
    domain: 'Web Dev',
    industry: 'SaaS',
    mode: 'offline',
    link: 'https://hitms.acm.org/events/devday-nuces-2026',
    source: 'hitms-acm',
    source_url: 'https://hitms.acm.org/events/devday-nuces-2026',
    deadline: null,
    tags: ['tech', 'coding', 'hackathon', 'competition', 'students'],
    verified: true,
    is_featured: true,
    is_active: true,
  },
  {
    id: 'curated-motive-pk-internship-2026',
    title: 'Motive PK Internship 2026',
    type: 'internship',
    organiser: 'Motive',
    description: '12-week hybrid internship program for Pakistan students, including Karachi, Lahore, and Islamabad.',
    location: 'Hybrid - Karachi, Lahore, Islamabad',
    city: 'Karachi',
    area: 'Hybrid',
    domain: 'Web Dev',
    industry: 'SaaS',
    mode: 'hybrid',
    link: 'https://gomotive.com/company/careers/pk/internship-2026/',
    source: 'motive',
    source_url: 'https://gomotive.com/company/careers/pk/internship-2026/',
    deadline: null,
    tags: ['tech', 'internship', 'engineering', 'startup', 'students'],
    verified: true,
    is_featured: true,
    is_active: true,
  },
  {
    id: 'curated-national-ai-hackathon-2026',
    title: 'National AI Hackathon 2026',
    type: 'hackathon',
    organiser: 'Atomcamp',
    description: 'Multi-city AI hackathon series where students learn, build, and compete on deep-tech and Agentic AI challenges.',
    location: 'Pakistan - Multi-city',
    city: 'Global',
    area: 'Multi-city',
    domain: 'AI',
    industry: 'AI / ML',
    mode: 'offline',
    link: 'https://aihackathon.atomcamp.com/',
    source: 'atomcamp',
    source_url: 'https://aihackathon.atomcamp.com/',
    deadline: null,
    tags: ['tech', 'ai', 'hackathon', 'students', 'deep-tech'],
    verified: true,
    is_featured: true,
    is_active: true,
  },
  {
    id: 'curated-ibm-developer-karachi',
    title: 'IBM Developer Karachi Meetups',
    type: 'event',
    organiser: 'IBM Developer Karachi',
    description: 'Developer, architect, and technology community meetups for learning, networking, and technical sessions.',
    location: 'Karachi / Online',
    city: 'Karachi',
    area: 'Online',
    domain: 'Cloud',
    industry: 'SaaS',
    mode: 'hybrid',
    link: 'https://www.meetup.com/ibmkarachi/',
    source: 'meetup',
    source_url: 'https://www.meetup.com/ibmkarachi/',
    deadline: null,
    tags: ['tech', 'developer', 'cloud', 'meetup', 'community'],
    verified: true,
    is_featured: false,
    is_active: true,
  },
  {
    id: 'curated-karachi-ai-meetups',
    title: 'Karachi AI Meetups & Pitchathons',
    type: 'event',
    organiser: 'Karachi AI',
    description: 'Applied AI talks, startup pitchathons, and AI community sessions for founders, students, and builders.',
    location: 'Karachi, Pakistan',
    city: 'Karachi',
    area: 'Various',
    domain: 'AI',
    industry: 'AI / ML',
    mode: 'offline',
    link: 'https://www.karachidotai.com/karachi-ai-meetup-25-startups-scaled-with-ai-talks-pitchathon',
    source: 'karachi-ai',
    source_url: 'https://www.karachidotai.com/karachi-ai-meetup-25-startups-scaled-with-ai-talks-pitchathon',
    deadline: null,
    tags: ['tech', 'ai', 'startup', 'pitchathon', 'founders'],
    verified: true,
    is_featured: false,
    is_active: true,
  },
];

const clean = (value) => {
  const text = String(value || '').trim();
  return text && text.toLowerCase() !== 'all' ? text : null;
};

const parseLimit = (value) => {
  const parsed = Number(value || 50);
  if (!Number.isFinite(parsed)) return 50;
  return Math.min(Math.max(Math.trunc(parsed), 1), 100);
};

const normalize = (value) => String(value || '').toLowerCase().trim();

const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return skill.skill || skill.name || skill.title || '';
};

const matchesFilter = (opp, filters) => {
  const { type, city, area, domain, industry, mode, query } = filters;
  const haystack = [
    opp.title,
    opp.description,
    opp.organiser,
    opp.location,
    opp.city,
    opp.area,
    opp.domain,
    opp.industry,
    opp.mode,
    ...(Array.isArray(opp.tags) ? opp.tags : []),
  ].filter(Boolean).join(' ').toLowerCase();

  if (type && opp.type !== type) return false;
  if (city && !normalize(opp.city || opp.location).includes(normalize(city))) return false;
  if (area && !normalize(opp.area || opp.location).includes(normalize(area))) return false;
  if (domain && !normalize(`${opp.domain || ''} ${(opp.tags || []).join(' ')}`).includes(normalize(domain))) return false;
  if (industry && !normalize(`${opp.industry || ''} ${(opp.tags || []).join(' ')}`).includes(normalize(industry))) return false;
  if (mode && normalize(opp.mode) !== normalize(mode)) return false;
  if (query && !haystack.includes(normalize(query))) return false;
  return true;
};

const dedupeOpportunities = (rows) => {
  const seen = new Set();

  return rows.filter((row) => {
    const key = normalize(row.source_url || row.link || row.title);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

async function getProfileContext(userId) {
  const [profileRes, studentRes, founderRes] = await Promise.allSettled([
    supabase.from('profiles').select('id, location, user_type').eq('id', userId).maybeSingle(),
    supabase
      .from('student_profiles')
      .select('interests, skills_with_levels, help_needed, idea_domain, university')
      .eq('user_id', userId)
      .maybeSingle(),
    supabase
      .from('founder_profiles')
      .select('industry, help_needed, skills_needed, founder_skills, tech_stack, current_challenges')
      .eq('user_id', userId)
      .maybeSingle(),
  ]);

  const profile = profileRes.status === 'fulfilled' ? profileRes.value.data || {} : {};
  const student = studentRes.status === 'fulfilled' ? studentRes.value.data || {} : {};
  const founder = founderRes.status === 'fulfilled' ? founderRes.value.data || {} : {};

  return {
    city: profile.location || '',
    domains: [
      student.idea_domain,
      founder.industry,
      ...(student.interests || []),
      ...(student.help_needed || []),
      ...(founder.help_needed || []),
      ...(founder.skills_needed || []),
      ...(founder.tech_stack || []),
      ...(founder.founder_skills || []),
      ...(student.skills_with_levels || []).map(normalizeSkill),
    ].filter(Boolean),
  };
}

const scoreOpportunity = (opp, profileContext) => {
  let score = opp.is_featured ? 20 : 5;
  const reasons = [];
  const city = normalize(profileContext.city);
  const oppPlace = normalize(`${opp.city || ''} ${opp.location || ''} ${opp.area || ''}`);
  const oppText = normalize([
    opp.title,
    opp.description,
    opp.domain,
    opp.industry,
    ...(Array.isArray(opp.tags) ? opp.tags : []),
  ].join(' '));

  if (city && oppPlace.includes(city)) {
    score += 25;
    reasons.push('Matches your location');
  }

  const matchedDomains = profileContext.domains
    .map(normalize)
    .filter(Boolean)
    .filter((domain) => oppText.includes(domain) || domain.includes(normalize(opp.domain)));

  if (matchedDomains.length > 0) {
    score += Math.min(35, matchedDomains.length * 12);
    reasons.push(`Relevant to ${matchedDomains.slice(0, 2).join(', ')}`);
  }

  if (['internship', 'hackathon', 'workshop', 'bootcamp'].includes(opp.type)) {
    score += 10;
    reasons.push('Good student-builder opportunity');
  }

  if (opp.verified) {
    score += 10;
    reasons.push('Verified source');
  }

  return {
    ...opp,
    recommendation_score: Math.min(100, score),
    recommendation_reasons: reasons.slice(0, 3),
  };
};

router.get('/', async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const limit = parseLimit(req.query.limit);

    const type = clean(req.query.type);
    const city = clean(req.query.city);
    const area = clean(req.query.area);
    const domain = clean(req.query.domain);
    const industry = clean(req.query.industry);
    const mode = clean(req.query.mode);
    const queryText = clean(req.query.query);
    const profileContext = await getProfileContext(req.user.id);

    let query = supabase
      .from('opportunities')
      .select('*')
      .eq('is_active', true)
      .or(`deadline.is.null,deadline.gte.${today}`)
      .order('is_featured', { ascending: false })
      .order('deadline', { ascending: true, nullsFirst: false })
      .limit(limit);

    if (type) query = query.eq('type', type);
    if (city) query = query.ilike('city', `%${city}%`);
    if (area) query = query.ilike('area', `%${area}%`);
    if (domain) query = query.ilike('domain', `%${domain}%`);
    if (industry) query = query.ilike('industry', `%${industry}%`);
    if (mode) query = query.eq('mode', mode.toLowerCase());

    if (queryText) {
      const safe = queryText.replace(/[%,]/g, ' ');
      query = query.or([
        `title.ilike.%${safe}%`,
        `description.ilike.%${safe}%`,
        `organiser.ilike.%${safe}%`,
        `location.ilike.%${safe}%`,
        `city.ilike.%${safe}%`,
        `area.ilike.%${safe}%`,
        `domain.ilike.%${safe}%`,
        `industry.ilike.%${safe}%`,
      ].join(','));
    }

    const { data, error } = await query;
    if (error) throw error;

    const dbRows = data || [];
    const curatedRows = CURATED_TECH_OPPORTUNITIES.filter((opp) => matchesFilter(opp, {
      type,
      city,
      area,
      domain,
      industry,
      mode,
      query: queryText,
    }));

    const merged = dedupeOpportunities([...dbRows, ...curatedRows])
      .map((opp) => scoreOpportunity(opp, profileContext))
      .sort((a, b) => {
        if ((b.recommendation_score || 0) !== (a.recommendation_score || 0)) {
          return (b.recommendation_score || 0) - (a.recommendation_score || 0);
        }

        if (Boolean(b.is_featured) !== Boolean(a.is_featured)) {
          return Number(Boolean(b.is_featured)) - Number(Boolean(a.is_featured));
        }

        if (a.deadline && b.deadline) return new Date(a.deadline) - new Date(b.deadline);
        if (a.deadline) return -1;
        if (b.deadline) return 1;
        return String(a.title || '').localeCompare(String(b.title || ''));
      })
      .slice(0, limit);

    res.json({
      success: true,
      data: merged,
      meta: {
        limit,
        sourceCounts: {
          database: dbRows.length,
          curated: curatedRows.length,
        },
        filters: { type, city, area, domain, industry, mode, query: queryText },
      },
    });
  } catch (err) {
    console.error('Fetch opportunities error:', err);
    res.status(400).json({ error: err.message || 'Failed to fetch opportunities' });
  }
});

module.exports = router;
