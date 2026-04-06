const MODEL = 'claude-sonnet-4-20250514';
const _cache = new Map();

// ─── Public API ──────────────────────────────────────────────────────────────

export function clearAICache(profileId) {
  for (const key of _cache.keys()) {
    if (key.startsWith(`${profileId}_`)) _cache.delete(key);
  }
}

export async function getStudentAIInsights(profile, { force = false } = {}) {
  // Require at least one meaningful field before spending tokens
  const hasData =
    profile.idea_title ||
    profile.startup_stage ||
    (profile.skills_with_levels || []).length > 0 ||
    (profile.problem_statement || '').length > 20;

  if (!hasData) return buildFallback(profile);

  const cacheKey = `${profile.id}_${profile.updated_at || 'draft'}`;
  if (!force && _cache.has(cacheKey)) return _cache.get(cacheKey);

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: 4000,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: buildPrompt(profile) }],
      }),
    });

    const data   = await res.json();
    const raw    = (data.content || []).map(b => b.text || '').join('');
    const clean  = raw.replace(/```json|```/gi, '').trim();
    const result = JSON.parse(clean);

    _cache.set(cacheKey, result);
    return result;
  } catch (err) {
    console.error('[ScalScope AI]', err);
    return buildFallback(profile);
  }
}

// ─── System prompt ───────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are the ScalScope AI Agent — an expert startup coach embedded in a student founder platform.

MISSION: Analyse each student's complete profile and return ONE perfectly-structured JSON object that drives every section of their personalised dashboard.

NON-NEGOTIABLE RULES:
1. Return ONLY valid JSON. Zero markdown. Zero backticks. Zero prose outside JSON.
2. Every suggestion must reference the student's ACTUAL data. Never be generic.
3. "why" and "portfolio_fit" fields: explain the exact concrete reason tied to this student's specific idea, industry, stage, and stated need. One direct, specific sentence.
4. Scores are integers 0-100. Never null. Use realistic values based on data completeness.
5. Smart prompts must be urgent, specific nudges about the highest-impact missing data.
6. next_steps must be achievable within 7 days, tied to their exact startup stage.
7. Mentor names must sound real and professional. Investor firms must sound credible.
8. Co-founder why_compatible: explicitly name the skill gap and explain how this person fills it.`;

// ─── User prompt builder ─────────────────────────────────────────────────────

function buildPrompt(p) {
  const skills = (p.skills_with_levels || [])
    .map(s => `${s.skill} (${s.level})`)
    .join(', ') || 'None added yet';

  const links = [
    p.linkedin_url   && 'LinkedIn',
    p.github_url     && 'GitHub',
    p.twitter_url    && 'Twitter',
    p.resume_url     && 'Resume',
    p.pitch_deck_url && 'Pitch Deck',
    p.website_url    && 'Website',
  ].filter(Boolean).join(', ') || 'None';

  return `Analyse this student's profile and return ONLY the JSON structure below — every field filled, no nulls:

=== STUDENT PROFILE ===
Name: ${p.full_name || 'Not set'} | Location: ${p.location || 'Not set'}
Idea: ${p.idea_title || 'Not added'} | Industry: ${p.industry || 'Not set'} | Stage: ${p.startup_stage || 'Just an Idea'}
Problem: ${p.problem_statement || 'Not written'}
Solution: ${p.solution_description || 'Not written'}
Target Audience: ${p.target_audience || 'Not set'} | Revenue Model: ${p.revenue_model || 'Not set'}
Competitors: ${p.competitors || 'Not listed'} | UVP: ${p.unique_value_proposition || 'Not set'}
Skills: ${skills}
Primary Goal: ${p.primary_goal || 'Not set'} | Needs Most: ${p.what_you_need_most || 'Not set'}
Launch Timeline: ${p.launch_timeline || 'Not set'}
Commitment: ${p.commitment_level || 'Not set'} | Hours/Week: ${p.hours_per_week || 'Not set'}
Has Co-Founder: ${p.has_cofounder ? 'Yes' : 'No'} | Collab Pref: ${p.collaboration_preference || 'Not set'}
Trust Links: ${links}
Mentor Bio: ${p.short_bio_for_mentors || 'Not written'}

=== RETURN EXACTLY THIS JSON (all fields required, no nulls) ===
{
  "readiness_score": 0,
  "score_breakdown": {
    "problem_clarity": 0,
    "market_awareness": 0,
    "execution_capacity": 0,
    "monetisation_clarity": 0
  },
  "ai_insight": "2 sentences using their actual idea name — biggest current strength + single most urgent action",
  "profile_summary": "1 sentence introducing this student to a mentor — name, idea, stage",
  "next_steps": [
    "Specific action doable in 7 days — stage-appropriate",
    "Action 2 — different focus area",
    "Action 3",
    "Action 4"
  ],
  "mentor_suggestions": [
    {
      "name": "Full realistic name",
      "role": "Title · Company or Background",
      "expertise": "primary domain",
      "speciality": "their standout specialty",
      "tags": ["tag1", "tag2", "tag3"],
      "match_score": 92,
      "avatar": "AB",
      "grad": "from-violet-500 to-indigo-600",
      "sessions_completed": 145,
      "rating": 4.9,
      "why": "SPECIFIC: exactly why this mentor for this student's exact idea, industry and stated need",
      "available": true,
      "response_time": "Usually replies within 2 hours"
    },
    {
      "name": "Full name 2",
      "role": "role",
      "expertise": "domain",
      "speciality": "specialty",
      "tags": ["t1", "t2", "t3"],
      "match_score": 87,
      "avatar": "CD",
      "grad": "from-indigo-500 to-blue-600",
      "sessions_completed": 89,
      "rating": 4.8,
      "why": "specific match reason",
      "available": true,
      "response_time": "Typically within 4 hours"
    },
    {
      "name": "Full name 3",
      "role": "role",
      "expertise": "domain",
      "speciality": "specialty",
      "tags": ["t1", "t2", "t3"],
      "match_score": 81,
      "avatar": "EF",
      "grad": "from-purple-500 to-violet-600",
      "sessions_completed": 210,
      "rating": 4.95,
      "why": "specific match reason",
      "available": false,
      "response_time": "Busy this week"
    }
  ],
  "investor_suggestions": [
    {
      "name": "Full realistic investor name",
      "firm": "Credible fund name",
      "type": "Angel | Pre-seed VC | Seed VC | Accelerator",
      "focus_areas": ["area1", "area2", "area3"],
      "typical_check": "$10k-$50k",
      "avatar": "GH",
      "grad": "from-emerald-500 to-teal-600",
      "match_score": 88,
      "portfolio_fit": "SPECIFIC: why this investor thesis matches this student's exact idea and industry",
      "stage_fit": "Pre-seed",
      "open_to_students": true
    },
    {
      "name": "Full name 2",
      "firm": "Fund 2",
      "type": "type",
      "focus_areas": ["a1", "a2"],
      "typical_check": "$25k-$100k",
      "avatar": "IJ",
      "grad": "from-teal-500 to-cyan-600",
      "match_score": 79,
      "portfolio_fit": "specific reason",
      "stage_fit": "Seed",
      "open_to_students": true
    }
  ],
  "cofounder_suggestion": {
    "needed": true,
    "type": "Technical Co-Founder",
    "description": "Specific 2-sentence description of what co-founder is needed and why",
    "emoji": "💻",
    "urgent": true,
    "profile_traits": ["trait1", "trait2", "trait3"],
    "why": "SPECIFIC: name the exact skill gap and why this type fills it",
    "ideal_background": "specific background description"
  },
  "cofounder_matches": [
    {
      "name": "Full realistic name",
      "role": "Their current role or background",
      "skills": ["skill1", "skill2", "skill3"],
      "compatibility_score": 94,
      "avatar": "KL",
      "grad": "from-blue-500 to-indigo-600",
      "location": "City or Remote",
      "commitment": "Full-time",
      "why_compatible": "SPECIFIC: name the student's exact gap and how this person fills it"
    },
    {
      "name": "Full name 2",
      "role": "role",
      "skills": ["s1", "s2", "s3"],
      "compatibility_score": 86,
      "avatar": "MN",
      "grad": "from-violet-500 to-purple-600",
      "location": "location",
      "commitment": "Part-time",
      "why_compatible": "specific reason"
    }
  ],
  "skill_gaps": [
    { "skill": "skill name", "gap": true, "importance": "why this matters for their specific idea" },
    { "skill": "skill 2", "gap": false, "importance": "why having this already helps them" }
  ],
  "launch_risks": [
    "Specific risk tied to their actual profile data",
    "Risk 2 tied to their data",
    "Risk 3"
  ],
  "smart_prompts": [
    { "id": "p1", "text": "Urgent specific nudge about most impactful missing field", "cta": "Fix Now" },
    { "id": "p2", "text": "Second nudge — different section of profile", "cta": "Add Now" }
  ],
  "trust_score": 0,
  "milestones_ai": {
    "idea_submitted": false,
    "overview_complete": false,
    "skills_added": false,
    "mentor_connected": false,
    "mvp_stage": false,
    "pitch_ready": false
  },
  "weekly_focus": "One sentence: the single most important thing this student should do this week"
}`;
}

// ─── Fallback when API is unavailable or profile is empty ────────────────────

function buildFallback(p) {
  return {
    readiness_score: 8,
    score_breakdown: { problem_clarity: 8, market_awareness: 5, execution_capacity: 10, monetisation_clarity: 5 },
    ai_insight: `Add your startup idea and describe the problem you're solving to unlock personalised AI insights for ${p.idea_title || 'your venture'}.`,
    profile_summary: 'Student founder — building their profile to unlock AI-powered matching.',
    next_steps: [
      'Add your startup idea name and industry sector to start AI matching',
      'Write a clear problem statement (3+ sentences) to boost your Clarity score',
      'Add at least 3 skills with experience levels so AI can find your co-founder match',
      'Set your primary goal and commitment level to personalise your action plan',
    ],
    mentor_suggestions: [],
    investor_suggestions: [],
    cofounder_suggestion: {
      needed: !p.has_cofounder,
      type: 'Co-Founder',
      description: 'Complete your skills section to receive a specific co-founder recommendation tailored to your skill gaps.',
      emoji: '🤝',
      urgent: false,
      profile_traits: [],
      why: 'Add your skills with levels so AI can identify what kind of co-founder would complement you best.',
      ideal_background: 'TBD — add your skills to unlock',
    },
    cofounder_matches: [],
    skill_gaps: [],
    launch_risks: ['Profile incomplete — AI cannot accurately assess risks yet'],
    smart_prompts: [
      { id: 'p1', text: 'Add your startup idea to unlock personalised AI mentor and investor matches.', cta: 'Add Idea' },
      { id: 'p2', text: 'Add your skills with levels so AI can find your ideal co-founder match.', cta: 'Add Skills' },
    ],
    trust_score: 0,
    milestones_ai: {
      idea_submitted: !!p.idea_title,
      overview_complete: false,
      skills_added: false,
      mentor_connected: false,
      mvp_stage: false,
      pitch_ready: false,
    },
    weekly_focus: 'Complete your startup profile to unlock all AI-powered features on your dashboard.',
  };
}