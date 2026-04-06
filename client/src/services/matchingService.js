// src/services/matchingService.js
//
// Phase 2 — Rule-based matching (no AI tokens).
// Scores mentors, co-founders, and investors against the student's profile
// using four signals: skills, industry, startup_stage, and looking_for.
//
// Every scorer returns { score: 0-100, reasons: string[] }.
// score is a weighted integer used to sort result lists.
// reasons are human-readable strings shown in the match card.
//
// When Phase 3 AI arrives, these scores become the fallback/seed values.

// ═══════════════════════════════════════════════════════════════════════════
// WEIGHTS
// Adjust these to tune match sensitivity without changing logic.
// ═══════════════════════════════════════════════════════════════════════════

const W = {
    // Mentor weights
    MENTOR_SKILL_OVERLAP:    35,   // student skill ∩ mentor expertise_areas
    MENTOR_INDUSTRY_MATCH:   25,   // student industry = mentor industry focus
    MENTOR_HELP_NEEDED:      25,   // student help_needed ∩ mentor can_help_with
    MENTOR_STAGE_MATCH:      15,   // mentor has worked with this stage
  
    // Co-founder weights
    CF_SKILL_COMPLEMENT:     40,   // skills student LACKS that cofounder HAS
    CF_LOOKING_FOR_MATCH:    20,   // both want the same type of partner
    CF_INDUSTRY_MATCH:       20,   // same industry interest
    CF_AVAILABILITY_MATCH:   20,   // commitment levels compatible
  
    // Investor weights
    INV_INDUSTRY_MATCH:      40,
    INV_STAGE_MATCH:         35,
    INV_REVENUE_MODEL:       25,
  };
  
  // ═══════════════════════════════════════════════════════════════════════════
  // HELPERS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Normalise a value to string array, handling nulls and single strings. */
  function toArr(v) {
    if (!v) return [];
    if (Array.isArray(v)) return v.map(x => String(x).toLowerCase().trim());
    return [String(v).toLowerCase().trim()];
  }
  
  /** Count how many items from arr are in set (case-insensitive). */
  function overlapCount(arr, set) {
    const s = new Set(toArr(set));
    return toArr(arr).filter(x => s.has(x)).length;
  }
  
  /** True if any item in arr is in set. */
  function anyMatch(arr, set) {
    return overlapCount(arr, set) > 0;
  }
  
  /** Clamp a number to [0, 100]. */
  function clamp(n) {
    return Math.max(0, Math.min(100, Math.round(n)));
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // STUDENT PROFILE NORMALISER
  // Pulls the relevant matching fields out of whatever shape the profile is in.
  // ═══════════════════════════════════════════════════════════════════════════
  
  function normaliseStudent(profile) {
    // skills_with_levels → flat skill name list
    const skillNames = (profile.skills_with_levels || [])
      .map(s => (s.skill || s).toLowerCase().trim())
      .filter(Boolean);
  
    // merge with flat skills array
    const allSkills = [
      ...new Set([
        ...skillNames,
        ...toArr(profile.skills),
      ]),
    ];
  
    return {
      skills:        allSkills,
      industry:      (profile.industry || '').toLowerCase().trim(),
      startup_stage: (profile.startup_stage || '').toLowerCase().trim(),
      looking_for:   toArr(profile.looking_for),
      help_needed:   toArr(profile.help_needed),
      interests:     toArr(profile.interests),
      commitment:    (profile.commitment_level || '').toLowerCase(),
      revenue_model: (profile.revenue_model || '').toLowerCase(),
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MENTOR SCORER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Score a mentor_profiles row against a student profile.
   *
   * @param {object} mentor   - row from mentor_profiles (with profiles nested)
   * @param {object} student  - raw student profile object
   * @returns {{ score: number, reasons: string[], matchedOn: string[] }}
   */
  export function scoreMentor(mentor, student) {
    const s        = normaliseStudent(student);
    const reasons  = [];
    const matched  = [];
    let   raw      = 0;
  
    // ── 1. Skill overlap ──────────────────────────────────────────────
    // Student's skills ∩ mentor's expertise_areas
    const mentorExpertise = toArr(mentor.expertise_areas);
    const skillHits = s.skills.filter(sk => mentorExpertise.includes(sk));
  
    if (skillHits.length > 0) {
      // Scale: 1 match = 60% weight, 2+ = 100%
      const pct = Math.min(1, skillHits.length / 2);
      raw += W.MENTOR_SKILL_OVERLAP * pct;
      matched.push('skills');
      reasons.push(`Shares expertise in ${skillHits.slice(0, 2).map(cap).join(' & ')}`);
    }
  
    // ── 2. Industry match ─────────────────────────────────────────────
    const mentorIndustries = toArr(mentor.can_help_with).concat(toArr(mentor.expertise_areas));
    if (s.industry && anyMatch([s.industry], mentorIndustries)) {
      raw += W.MENTOR_INDUSTRY_MATCH;
      matched.push('industry');
      reasons.push(`Works in ${cap(s.industry)}`);
    } else if (s.interests.length > 0 && anyMatch(s.interests, mentorIndustries)) {
      raw += W.MENTOR_INDUSTRY_MATCH * 0.5;
      matched.push('industry');
      reasons.push('Industry interests overlap');
    }
  
    // ── 3. Help needed ─────────────────────────────────────────────────
    const canHelp = toArr(mentor.can_help_with);
    const helpHits = s.help_needed.filter(h => canHelp.includes(h));
    if (helpHits.length > 0) {
      const pct = Math.min(1, helpHits.length / 2);
      raw += W.MENTOR_HELP_NEEDED * pct;
      matched.push('help_needed');
      reasons.push(`Can help with ${helpHits.slice(0, 2).map(cap).join(' & ')}`);
    }
  
    // ── 4. Startup stage experience ────────────────────────────────────
    const stageKeywords = {
      'just an idea':  ['idea', 'validation', 'early stage', 'pre-mvp'],
      'researching':   ['research', 'validation', 'market', 'discovery'],
      'building mvp':  ['mvp', 'product', 'technical', 'dev', 'build'],
      'mvp built':     ['growth', 'fundraising', 'scale', 'revenue', 'traction'],
    };
    const stageWords = stageKeywords[s.startup_stage] || [];
    const mentorStyle = toArr(mentor.mentorship_style)
      .concat(toArr(mentor.can_help_with))
      .concat(toArr(mentor.available_for));
    if (stageWords.length > 0 && anyMatch(stageWords, mentorStyle)) {
      raw += W.MENTOR_STAGE_MATCH;
      matched.push('startup_stage');
      reasons.push(`Experienced with ${cap(s.startup_stage || 'early stage')} founders`);
    }
  
    // ── Fallback reason ─────────────────────────────────────────────────
    if (reasons.length === 0) {
      reasons.push('General mentorship match');
    }
  
    return {
      score:     clamp(raw),
      reasons,
      matchedOn: matched,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // CO-FOUNDER SCORER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Score a student_profiles row (co-founder candidate) against the current student.
   *
   * Key insight: we reward COMPLEMENTARY skills, not identical ones.
   * A student who has Technical should be matched with someone who lacks it,
   * not another technical person.
   *
   * @param {object} candidate  - student_profiles row (with profiles nested)
   * @param {object} student    - current student's profile
   * @returns {{ score: number, reasons: string[], matchedOn: string[] }}
   */
  export function scoreCoFounder(candidate, student) {
    const s          = normaliseStudent(student);
    const reasons    = [];
    const matched    = [];
    let   raw        = 0;
  
    const candidateSkills = (candidate.skills_with_levels || [])
      .map(x => (x.skill || x).toLowerCase().trim())
      .concat(toArr(candidate.profiles?.skills));
  
    // ── 1. Skill complementarity ──────────────────────────────────────
    // Reward skills the student LACKS that the candidate HAS.
    // Define common skill pairings: technical ↔ business
    const TECH_SKILLS    = ['technical / dev', 'ai / ml', 'code', 'developer', 'react', 'node.js', 'python', 'ios/swift', 'devops', 'data'];
    const BUSI_SKILLS    = ['business strategy', 'marketing', 'sales', 'finance', 'operations', 'fundraising', 'community building'];
    const DESIGN_SKILLS  = ['design / ui-ux', 'design/figma', 'palette'];
  
    const studentHasTech   = s.skills.some(sk => TECH_SKILLS.some(t => sk.includes(t)));
    const studentHasBiz    = s.skills.some(sk => BUSI_SKILLS.some(t => sk.includes(t)));
    const studentHasDesign = s.skills.some(sk => DESIGN_SKILLS.some(t => sk.includes(t)));
  
    const candHasTech   = candidateSkills.some(sk => TECH_SKILLS.some(t => sk.includes(t)));
    const candHasBiz    = candidateSkills.some(sk => BUSI_SKILLS.some(t => sk.includes(t)));
    const candHasDesign = candidateSkills.some(sk => DESIGN_SKILLS.some(t => sk.includes(t)));
  
    let complementScore = 0;
    const complements   = [];
  
    if (!studentHasTech && candHasTech) {
      complementScore += 40;
      complements.push('Technical execution');
    }
    if (!studentHasBiz && candHasBiz) {
      complementScore += 30;
      complements.push('Business / growth');
    }
    if (!studentHasDesign && candHasDesign) {
      complementScore += 20;
      complements.push('Design / UX');
    }
    // Penalise if both have identical dominant skill (duplicate co-founder)
    if (studentHasTech && candHasTech && !candHasBiz && !candHasDesign) {
      complementScore -= 20;
    }
  
    if (complementScore > 0) {
      raw += Math.min(W.CF_SKILL_COMPLEMENT, complementScore);
      matched.push('skills');
      reasons.push(`Fills your gap: ${complements.join(' + ')}`);
    } else if (candidateSkills.length > 0) {
      // Partial credit for any skills
      raw += W.CF_SKILL_COMPLEMENT * 0.3;
      reasons.push('Has relevant skills');
    }
  
    // ── 2. Both want a co-founder ────────────────────────────────────
    const candLookingFor = toArr(candidate.looking_for);
    const studentWantsCofounder = s.looking_for.includes('co-founder');
    const candWantsCofounder    = candLookingFor.includes('co-founder');
  
    if (studentWantsCofounder && candWantsCofounder) {
      raw += W.CF_LOOKING_FOR_MATCH;
      matched.push('looking_for');
      reasons.push('Both actively looking for a co-founder');
    } else if (candWantsCofounder) {
      raw += W.CF_LOOKING_FOR_MATCH * 0.6;
      matched.push('looking_for');
      reasons.push('Actively seeking a co-founder');
    }
  
    // ── 3. Industry match ────────────────────────────────────────────
    const candInterests = toArr(candidate.profiles?.interests)
      .concat(toArr(candidate.industry));
    if (s.industry && anyMatch([s.industry], candInterests)) {
      raw += W.CF_INDUSTRY_MATCH;
      matched.push('industry');
      reasons.push(`Same industry focus: ${cap(s.industry)}`);
    } else if (s.interests.length > 0 && anyMatch(s.interests, candInterests)) {
      raw += W.CF_INDUSTRY_MATCH * 0.5;
      matched.push('industry');
      reasons.push('Overlapping industry interests');
    }
  
    // ── 4. Commitment compatibility ──────────────────────────────────
    // Full-time + Full-time = perfect, Exploring + All-in = poor fit
    const commitMap = {
      'all-in (30+ hrs/week)':            4,
      'full-time (15–30 hrs/week)':       3,
      'serious (5–15 hrs/week)':          2,
      'exploring (< 5 hrs/week)':         1,
    };
    const sLevel   = commitMap[s.commitment]                                     || 0;
    const cLevel   = commitMap[(candidate.commitment_level || '').toLowerCase()] || 0;
  
    if (sLevel > 0 && cLevel > 0) {
      const diff = Math.abs(sLevel - cLevel);
      const pct  = diff === 0 ? 1 : diff === 1 ? 0.6 : 0.1;
      raw += W.CF_AVAILABILITY_MATCH * pct;
      if (diff === 0) {
        matched.push('availability');
        reasons.push('Same commitment level');
      }
    }
  
    if (reasons.length === 0) {
      reasons.push('Potential co-founder match');
    }
  
    return {
      score:     clamp(raw),
      reasons,
      matchedOn: matched,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INVESTOR SCORER
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Score an investor_profiles row against a student profile.
   *
   * @param {object} investor  - investor_profiles row (with profiles nested)
   * @param {object} student   - raw student profile object
   * @returns {{ score: number, reasons: string[], matchedOn: string[] }}
   */
  export function scoreInvestor(investor, student) {
    const s       = normaliseStudent(student);
    const reasons = [];
    const matched = [];
    let   raw     = 0;
  
    const invIndustries = toArr(investor.industries_of_interest);
    const invStages     = toArr(investor.investment_stage);
  
    // ── 1. Industry match ─────────────────────────────────────────────
    if (s.industry && anyMatch([s.industry], invIndustries)) {
      raw += W.INV_INDUSTRY_MATCH;
      matched.push('industry');
      reasons.push(`Invests in ${cap(s.industry)}`);
    } else if (s.interests.length > 0 && anyMatch(s.interests, invIndustries)) {
      raw += W.INV_INDUSTRY_MATCH * 0.6;
      matched.push('industry');
      reasons.push('Industry interests align');
    }
  
    // ── 2. Stage match ────────────────────────────────────────────────
    const stageMap = {
      'just an idea':  ['pre-seed', 'idea', 'pre-revenue', 'early'],
      'researching':   ['pre-seed', 'idea', 'early'],
      'building mvp':  ['pre-seed', 'seed', 'mvp'],
      'mvp built':     ['seed', 'pre-series a', 'series a', 'traction'],
    };
    const compatStages = stageMap[s.startup_stage] || ['pre-seed'];
    if (anyMatch(compatStages, invStages)) {
      raw += W.INV_STAGE_MATCH;
      matched.push('startup_stage');
      reasons.push(`Funds ${cap(s.startup_stage || 'early stage')} startups`);
    }
  
    // ── 3. Revenue model ──────────────────────────────────────────────
    const revenueKeywords = {
      'subscription':              ['saas', 'subscription', 'recurring'],
      'b2b saas':                  ['b2b', 'saas', 'enterprise'],
      'freemium':                  ['consumer', 'b2c', 'saas'],
      'commission / marketplace':  ['marketplace', 'platform', 'two-sided'],
      'advertising':               ['media', 'consumer', 'b2c'],
      'usage-based':               ['saas', 'developer tools', 'api'],
    };
    const thesis = (investor.investment_thesis || '').toLowerCase();
    const rvWords = revenueKeywords[s.revenue_model] || [];
    if (rvWords.some(w => thesis.includes(w))) {
      raw += W.INV_REVENUE_MODEL;
      matched.push('revenue_model');
      reasons.push('Revenue model fits investment thesis');
    }
  
    if (reasons.length === 0) {
      reasons.push('Potential investor match');
    }
  
    return {
      score:     clamp(raw),
      reasons,
      matchedOn: matched,
    };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // BATCH MATCHERS
  // These are the main functions called by pages and the dashboard.
  // Each takes a list of raw DB rows + the student profile,
  // attaches _matchScore and _matchReasons, and returns sorted results.
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Score and sort a list of mentor_profiles rows against a student.
   *
   * @param {object[]} mentors       - raw rows from fetchMentors()
   * @param {object}   studentProfile
   * @param {object}   opts
   * @param {number}   opts.minScore   - filter out scores below this (default 0)
   * @param {number}   opts.limit      - cap results (default 20)
   * @returns {object[]} mentors with _matchScore, _matchReasons, _matchedOn added
   */
  export function rankMentors(mentors, studentProfile, { minScore = 0, limit = 20 } = {}) {
    return mentors
      .map(m => {
        const { score, reasons, matchedOn } = scoreMentor(m, studentProfile);
        return { ...m, _matchScore: score, _matchReasons: reasons, _matchedOn: matchedOn };
      })
      .filter(m => m._matchScore >= minScore)
      .sort((a, b) => b._matchScore - a._matchScore)
      .slice(0, limit);
  }
  
  /**
   * Score and sort a list of student_profiles (co-founder candidates).
   *
   * @param {object[]} candidates    - raw rows from fetchCoFounders()
   * @param {object}   studentProfile
   * @param {object}   opts
   * @returns {object[]} candidates with _matchScore, _matchReasons, _matchedOn added
   */
  export function rankCoFounders(candidates, studentProfile, { minScore = 0, limit = 20 } = {}) {
    return candidates
      .map(c => {
        const { score, reasons, matchedOn } = scoreCoFounder(c, studentProfile);
        return { ...c, _matchScore: score, _matchReasons: reasons, _matchedOn: matchedOn };
      })
      .filter(c => c._matchScore >= minScore)
      .sort((a, b) => b._matchScore - a._matchScore)
      .slice(0, limit);
  }
  
  /**
   * Score and sort a list of investor_profiles rows.
   *
   * @param {object[]} investors     - raw rows from fetchInvestors()
   * @param {object}   studentProfile
   * @param {object}   opts
   * @returns {object[]} investors with _matchScore, _matchReasons, _matchedOn added
   */
  export function rankInvestors(investors, studentProfile, { minScore = 0, limit = 20 } = {}) {
    return investors
      .map(i => {
        const { score, reasons, matchedOn } = scoreInvestor(i, studentProfile);
        return { ...i, _matchScore: score, _matchReasons: reasons, _matchedOn: matchedOn };
      })
      .filter(i => i._matchScore >= minScore)
      .sort((a, b) => b._matchScore - a._matchScore)
      .slice(0, limit);
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // MATCH LABEL HELPER
  // Returns a human label for a score — used in badge chips on cards.
  // ═══════════════════════════════════════════════════════════════════════════
  
  /**
   * Convert a 0–100 score into a label + colour class.
   *
   * @param {number} score
   * @returns {{ label: string, color: string, bg: string }}
   */
  export function matchLabel(score) {
    if (score >= 80) return { label: 'Strong Match',  color: '#4f46e5', bg: '#eef2ff' };
    if (score >= 60) return { label: 'Good Match',    color: '#7c3aed', bg: '#f5f3ff' };
    if (score >= 40) return { label: 'Partial Match', color: '#0891b2', bg: '#ecfeff' };
    return              { label: 'Low Match',     color: '#94a3b8', bg: '#f8fafc' };
  }
  
  // ═══════════════════════════════════════════════════════════════════════════
  // INTERNAL UTILS
  // ═══════════════════════════════════════════════════════════════════════════
  
  /** Capitalise first letter of each word. */
  function cap(str) {
    return String(str)
      .split(' ')
      .map(w => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');
  }