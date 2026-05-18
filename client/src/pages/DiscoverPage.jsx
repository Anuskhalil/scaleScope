// src/pages/DiscoverPage.jsx
// ─── Optimized Discover Page — AI-Transparent, Accessible, Production-Ready ───

import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import {
  sendConnectionRequest,
  getConnectionStatus,
  getOrCreateConversation,
} from '../services/studentService';
import {
  Search, Sparkles, Globe, Users, Star, ArrowUpRight, Zap,
  Clock, Heart, Flame, MapPin, Lightbulb, Calendar, Mic,
  Coffee, DollarSign, GraduationCap, Code, Brain, Rocket,
  Award, Filter, ChevronRight, CheckCircle, BarChart2,
  FileText, Gift, Megaphone, X, Loader, RefreshCw,
  UserPlus, MessageSquare, TrendingUp, ChevronDown, ChevronUp,
  Building, Tag, Globe2, Users2, Info,
} from 'lucide-react';

// 🔧 CHANGED: Added toast for user feedback
import toast from 'react-hot-toast';

// 🔧 CHANGED: Added CSS for tooltips, focus states, and better loading
const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}
  .dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .2s cubic-bezier(.22,.68,0,1.2),box-shadow .2s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 40px rgba(15,23,42,.10)}
  .g-ind{background:linear-gradient(135deg,#4f46e5,#7c3aed)}
  .g-em{background:linear-gradient(135deg,#059669,#0891b2)}
  .g-am{background:linear-gradient(135deg,#f59e0b,#ef4444)}
  .g-vi{background:linear-gradient(135deg,#7c3aed,#6366f1)}
  .page-bg{background-color:#f4f5fb;background-image:radial-gradient(circle,#c7d2fe 1px,transparent 1px);background-size:28px 28px}
  .search-glow:focus-within{box-shadow:0 0 0 3px rgba(99,102,241,.15),0 4px 20px rgba(15,23,42,.08)}
  .no-scroll::-webkit-scrollbar{display:none}
  .no-scroll{-ms-overflow-style:none;scrollbar-width:none}
  .sh{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:10px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .f0{animation:fu .35s ease both}
  .f1{animation:fu .35s .07s ease both}
  .f2{animation:fu .35s .14s ease both}
  .f3{animation:fu .35s .21s ease both}
  .f4{animation:fu .35s .28s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  .badge-idea{background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0}
  .badge-mvp{background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe}
  .badge-growth{background:#faf5ff;color:#7c3aed;border:1.5px solid #ddd6fe}
  .badge-built{background:#fff7ed;color:#ea580c;border:1.5px solid #fed7aa}
  .badge-research{background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0}
  .sec-eye{font-size:10px;font-weight:800;letter-spacing:.12em;text-transform:uppercase;color:#6366f1;font-family:'Syne',sans-serif}
  .tab{transition:all .15s}
  .tab.active{background:#4f46e5;color:#fff;box-shadow:0 4px 14px rgba(79,70,229,.25)}
  .tab.inactive{background:#fff;color:#64748b;border:1.5px solid #e2e8f0}
  .tab.inactive:hover{border-color:#a5b4fc;color:#4f46e5}
  .opp-badge-internship{background:#eff6ff;color:#2563eb;border:1.5px solid #bfdbfe}
  .opp-badge-event{background:#faf5ff;color:#7c3aed;border:1.5px solid #ddd6fe}
  .opp-badge-funding{background:#f0fdf4;color:#16a34a;border:1.5px solid #bbf7d0}
  .opp-badge-hackathon{background:#fff7ed;color:#ea580c;border:1.5px solid #fed7aa}
  .opp-badge-accelerator{background:#fef9c3;color:#ca8a04;border:1.5px solid #fde68a}
  .opp-badge-grant{background:#ecfdf5;color:#059669;border:1.5px solid #a7f3d0}
  
  /* 🔧 CHANGED: Accessibility focus states & lightweight tooltip */
  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box{opacity:1;visibility:visible;transform:translateY(0)}
  .tooltip-box{opacity:0;visibility:hidden;transform:translateY(4px);transition:all .15s ease;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:#1e293b;color:#fff;font-size:11px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:240px;white-space:normal;text-align:left}
  .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;margin-left:-4px;border-width:4px;border-style:solid;border-color:#1e293b transparent transparent transparent}
`;

// 🔧 CHANGED: Safe fetch wrapper to prevent silent failures
async function safeFetch(promise, fallback = [], onError = null) {
  try {
    const res = await promise;
    return res?.data || fallback;
  } catch (error) {
    console.error('[SafeFetch] Error:', error);
    if (onError) onError(error);
    return fallback;
  }
}

// 🔧 CHANGED: Simple avatar cache to reduce Supabase storage calls
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 mins

async function getCachedSignedUrl(path) {
  if (!path || path.startsWith('http')) return path;
  const cacheKey = `avatar:${path}`;
  const cached = AVATAR_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.url;

  try {
    const cleanPath = path.replace(/^avatars\//, '');
    const { data } = await supabase.storage.from('avatars').createSignedUrl(cleanPath, 3600);
    if (data?.signedUrl) {
      AVATAR_CACHE.set(cacheKey, { url: data.signedUrl, timestamp: Date.now() });
      return data.signedUrl;
    }
  } catch (e) { console.warn('Avatar URL error:', e); }
  return path;
}

// 🔧 CHANGED: AI match explanation generator for transparency
function getMatchExplanation(userProfile, suggested, matchType) {
  if (!userProfile) return ['Based on your profile activity'];
  const reasons = [];
  
  if (matchType === 'mentor') {
    const p = suggested.profiles || {};
    const skillOverlap = userProfile.skills?.filter(s => p.expertise_areas?.includes(s)) || [];
    if (skillOverlap.length) reasons.push(`Expertise overlap: ${skillOverlap.slice(0, 2).join(', ')}`);
    
    const interestOverlap = userProfile.interests?.filter(i => p.interests?.includes(i)) || [];
    if (interestOverlap.length) reasons.push(`Shared interest in ${interestOverlap[0]}`);
    
    if (userProfile.location && p.location === userProfile.location) reasons.push('Same location');
  } else if (matchType === 'startup') {
    if (suggested.industry && userProfile.interests?.some(i => i.toLowerCase().includes(suggested.industry.toLowerCase()))) {
      reasons.push(`Matches your interest: ${suggested.industry}`);
    }
    if (userProfile.startup_idea_description) reasons.push('You also have a startup idea');
  } else {
    // Co-founder matching
    const userSkills = new Set(userProfile.skills_with_levels?.map(s => s.skill) || []);
    const candSkills = new Set((suggested.skills_with_levels || []).map(s => s.skill));
    const complementary = [...candSkills].filter(s => !userSkills.has(s)).slice(0, 2);
    if (complementary.length) reasons.push(`Complements with: ${complementary.join(', ')}`);
    
    if (suggested.has_startup_idea && userProfile.startup_idea_description) reasons.push('Both actively building');
  }
  
  return reasons.length > 0 ? reasons : ['Profile alignment based on activity'];
}

// ─── Helpers ──────────────────────────────────────────────────────────────
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function timeLeft(deadline) {
  if (!deadline) return null;
  const d = Math.ceil((new Date(deadline) - Date.now()) / 86400000);
  if (d < 0) return { label: 'Closed', cls: 'text-slate-400' };
  if (d === 0) return { label: 'Today!', cls: 'text-red-600 font-bold' };
  if (d <= 7) return { label: `${d}d left`, cls: 'text-orange-500 font-semibold' };
  return { label: `${d}d left`, cls: 'text-slate-500' };
}
function stageBadge(stage) {
  const map = {
    'Just an Idea': 'badge-idea',
    'Researching': 'badge-research',
    'Building MVP': 'badge-mvp',
    'MVP Built': 'badge-built',
    'Growing': 'badge-growth',
  };
  return map[stage] || 'badge-idea';
}
function oppBadge(type) {
  return `opp-badge-${type}`;
}
const OPP_ICONS = {
  internship: <GraduationCap className="w-4 h-4" />,
  event: <Calendar className="w-4 h-4" />,
  funding: <DollarSign className="w-4 h-4" />,
  hackathon: <Zap className="w-4 h-4" />,
  accelerator: <Rocket className="w-4 h-4" />,
  grant: <Gift className="w-4 h-4" />,
};
const AVATAR_GRADS = [
  'from-violet-500 to-indigo-500', 'from-emerald-500 to-teal-500',
  'from-rose-500 to-pink-500', 'from-amber-500 to-orange-500',
  'from-indigo-500 to-blue-500', 'from-cyan-500 to-teal-500',
  'from-fuchsia-500 to-purple-500', 'from-green-500 to-emerald-500',
];
function gradFor(id) { return AVATAR_GRADS[(id || '').charCodeAt?.(0) % AVATAR_GRADS.length] || AVATAR_GRADS[0]; }

function Shimmer({ h = 'h-20' }) { return <div className={`sh ${h} w-full`} />; }
function SectionHead({ eye, title, action, actionTo }) {
  return (
    <div className="flex items-end justify-between mb-5">
      <div>
        <p className="sec-eye mb-1">{eye}</p>
        <h2 className="ss text-xl font-bold text-slate-900">{title}</h2>
      </div>
      {action && actionTo && (
        <Link to={actionTo} className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1 transition-colors" aria-label={`Browse all ${title.toLowerCase()}`}>
          {action}<ChevronRight className="w-3.5 h-3.5" />
        </Link>
      )}
    </div>
  );
}

// ─── Industry + skill filter pills ────────────────────────────────────────
const INDUSTRIES = ['All', 'EdTech', 'HealthTech', 'FinTech', 'AgriTech', 'CleanTech', 'LegalTech', 'AI / ML', 'SaaS', 'E-commerce'];
const PEOPLE_ROLES = ['All', 'Mentor', 'Co-Founder', 'Investor'];
const OPP_TYPES = ['All', 'internship', 'event', 'funding', 'hackathon', 'accelerator', 'grant'];

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function DiscoverPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // ── Data ────────────────────────────────────────────────────────────────
  const [studentProfile, setStudentProfile] = useState(null);
  const [startups, setStartups] = useState([]);
  const [people, setPeople] = useState([]);
  const [opportunities, setOpportunities] = useState([]);
  const [recommended, setRecommended] = useState([]);

  // ── Loading ─────────────────────────────────────────────────────────────
  const [loadingPage, setLoadingPage] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // ── Filters ─────────────────────────────────────────────────────────────
  const [activeTab, setActiveTab] = useState('startups');
  const [industryFilter, setIndustryFilter] = useState('All');
  const [roleFilter, setRoleFilter] = useState('All');
  const [oppTypeFilter, setOppTypeFilter] = useState('All');
  const [query, setQuery] = useState('');

  // ── UI ──────────────────────────────────────────────────────────────────
  const [likedStartups, setLikedStartups] = useState(new Set());
  const [connecting, setConnecting] = useState({});

  // ── Load all data ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    if (!user) return;
    setLoadingPage(true);
    try {
      // 1. Student's own profile (for AI recommendations)
      const [profRes, spRes] = await Promise.all([
        safeFetch(supabase.from('profiles').select('*').eq('id', user.id).maybeSingle(), {}, () => toast.error('Failed to load profile')),
        safeFetch(supabase.from('student_profiles').select('*').eq('user_id', user.id).maybeSingle(), {}, () => toast.error('Failed to load student details')),
      ]);
      const merged = { ...(profRes || {}), ...(spRes || {}) };
      setStudentProfile(merged);

      // 2. Startups / Ideas — founder_profiles JOIN profiles
      const { data: founderData } = await safeFetch(
        supabase.from('founder_profiles')
          .select(`
            id, user_id,
            company_name, company_stage, industry, founding_year,
            team_size, funding_stage, looking_for, problem_solving,
            target_market, idea_title, startup_stage, unique_value_proposition,
            profiles (
              id, full_name, bio, avatar_url, location,
              linkedin_url, github_url
            )
          `)
          .limit(20),
        []
      );
      setStartups(founderData || []);

      // 3. People — mentors + co-founder-seeking students
      const [mentorRes, cfRes] = await Promise.all([
        safeFetch(
          supabase.from('mentor_profiles')
            .select(`
              id, user_id,
              expertise_areas, years_experience, current_role, current_company,
              is_pro_bono, can_help_with, available_for, mentorship_style,
              profiles (id, full_name, bio, avatar_url, location, skills)
            `)
            .limit(12),
          []
        ),
        safeFetch(
          supabase.from('student_profiles')
            .select(`
              id, user_id,
              skills_with_levels, looking_for, help_needed, interests,
              commitment_level, has_startup_idea, startup_idea_description,
              profiles (id, full_name, bio, avatar_url, location, skills)
            `)
            .contains('looking_for', ['Co-Founder'])
            .neq('user_id', user.id)
            .limit(12),
          []
        ),
      ]);

      // Shape into unified people array
      const mentorPeople = (mentorRes || []).map(m => ({
        _type: 'mentor',
        id: m.id,
        user_id: m.user_id,
        name: m.profiles?.full_name,
        bio: m.profiles?.bio,
        location: m.profiles?.location,
        avatar: m.profiles?.avatar_url,
        role: m.current_role || 'Mentor',
        org: m.current_company,
        skills: m.expertise_areas || [],
        years: m.years_experience,
        pro_bono: m.is_pro_bono,
        available: (m.available_for || []).length > 0,
      }));

      const cfPeople = (cfRes || []).map(s => {
        const skillNames = (s.skills_with_levels || []).map(x => x.skill || x).filter(Boolean);
        return {
          _type: 'cofounder',
          id: s.id,
          user_id: s.user_id,
          name: s.profiles?.full_name,
          bio: s.profiles?.bio || s.startup_idea_description,
          location: s.profiles?.location,
          avatar: s.profiles?.avatar_url,
          role: 'Co-Founder',
          skills: skillNames.slice(0, 4),
          commitment: s.commitment_level,
          has_idea: s.has_startup_idea,
          help_needed: s.help_needed || [],
        };
      });

      setPeople([...mentorPeople, ...cfPeople]);

      // 4. Opportunities
      const { data: oppData } = await safeFetch(
        supabase.from('opportunities')
          .select('*')
          .eq('is_active', true)
          .order('is_featured', { ascending: false })
          .order('deadline', { ascending: true })
          .limit(20),
        []
      );
      setOpportunities(oppData || []);

      // 5. AI Recommendations — filter by student skills + interests
      if (merged) {
        buildRecommendations(merged, founderData || [], mentorRes || [], cfRes || []);
      }
    } catch (err) {
      console.error('[Discover]', err);
      toast.error('Failed to load discover page');
    } finally {
      setLoadingPage(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  // ── AI-lite recommendations ───────────────────────────────────────────
  const buildRecommendations = (profile, founders, mentors, cofounders) => {
    const studentSkills = (profile.skills_with_levels || []).map(s => (s.skill || s).toLowerCase());
    const studentInterests = (profile.interests || []).map(s => s.toLowerCase());
    const lookingFor = (profile.looking_for || []).map(s => s.toLowerCase());

    const recs = [];

    // Recommend mentors whose expertise overlaps student's help_needed or interests
    mentors.forEach(m => {
      const expertise = (m.expertise_areas || []).map(s => s.toLowerCase());
      const helpNeeded = (profile.help_needed || []).map(s => s.toLowerCase());
      const overlap = expertise.some(e =>
        studentInterests.some(i => e.includes(i) || i.includes(e)) ||
        helpNeeded.some(h => e.includes(h) || h.includes(e))
      );
      if (overlap) {
        recs.push({
          _rec_type: 'mentor',
          _rec_reason: `Matches your interests & help needed`,
          ...m,
          name: m.profiles?.full_name,
          role: m.current_role || 'Mentor',
          skills: (m.expertise_areas || []).slice(0, 3),
          location: m.profiles?.location,
        });
      }
    });

    // Recommend founders in same industry as student's interests
    founders.forEach(f => {
      const fi = (f.industry || '').toLowerCase();
      const match = studentInterests.some(i => fi.includes(i) || i.includes(fi));
      if (match) {
        recs.push({
          _rec_type: 'startup',
          _rec_reason: `In your interest area: ${f.industry}`,
          ...f,
          name: f.profiles?.full_name,
        });
      }
    });

    // Recommend co-founders whose skills complement student's
    const techSkills = ['technical / dev', 'ai / ml', 'code', 'react', 'python'];
    const bizSkills = ['business strategy', 'marketing', 'sales', 'finance'];
    const studentHasTech = studentSkills.some(s => techSkills.some(t => s.includes(t)));
    const studentHasBiz = studentSkills.some(s => bizSkills.some(t => s.includes(t)));

    cofounders.forEach(c => {
      const cSkills = (c.skills_with_levels || []).map(s => (s.skill || s).toLowerCase());
      const cHasTech = cSkills.some(s => techSkills.some(t => s.includes(t)));
      const cHasBiz = cSkills.some(s => bizSkills.some(t => s.includes(t)));
      const isComplement = (!studentHasTech && cHasTech) || (!studentHasBiz && cHasBiz);
      if (isComplement && (profile.looking_for || []).some(l => l.toLowerCase().includes('co-founder'))) {
        const skillNames = (c.skills_with_levels || []).map(x => x.skill || x).filter(Boolean);
        recs.push({
          _rec_type: 'cofounder',
          _rec_reason: 'Fills your skill gap',
          id: c.id,
          user_id: c.user_id,
          name: c.profiles?.full_name,
          role: 'Co-Founder',
          skills: skillNames.slice(0, 3),
          location: c.profiles?.location,
          bio: c.profiles?.bio || c.startup_idea_description,
        });
      }
    });

    setRecommended(recs.slice(0, 6));
  };

  // ── Connect action ────────────────────────────────────────────────────
  const handleConnect = async (targetUserId, type) => {
    if (!user || connecting[targetUserId]) return;
    setConnecting(p => ({ ...p, [targetUserId]: true }));
    try {
      await sendConnectionRequest(user.id, targetUserId, type);
      toast.success('Connection request sent!');
    } catch (err) {
      if (!err.message?.includes('duplicate') && !err.message?.includes('23505')) {
        toast.error('Could not send request: ' + err.message);
      }
    } finally {
      setConnecting(p => ({ ...p, [targetUserId]: 'sent' }));
    }
  };

  const handleMessage = async (targetUserId) => {
    if (!user) return;
    try {
      await getOrCreateConversation(user.id, targetUserId);
      navigate('/messages');
      toast.success('Opening conversation...');
    } catch (err) { 
      console.error(err); 
      toast.error('Failed to open conversation');
    }
  };

  // ── Filter logic ──────────────────────────────────────────────────────
  const filteredStartups = startups.filter(f => {
    const matchQuery = !query ||
      (f.company_name || f.idea_title || '').toLowerCase().includes(query.toLowerCase()) ||
      (f.problem_solving || '').toLowerCase().includes(query.toLowerCase()) ||
      (f.profiles?.full_name || '').toLowerCase().includes(query.toLowerCase());
    const matchIndustry = industryFilter === 'All' || (f.industry || '').toLowerCase().includes(industryFilter.toLowerCase());
    return matchQuery && matchIndustry;
  });

  const filteredPeople = people.filter(p => {
    const matchQuery = !query ||
      (p.name || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.role || '').toLowerCase().includes(query.toLowerCase()) ||
      (p.skills || []).some(s => s.toLowerCase().includes(query.toLowerCase()));
    const matchRole = roleFilter === 'All' ||
      (roleFilter === 'Mentor' && p._type === 'mentor') ||
      (roleFilter === 'Co-Founder' && p._type === 'cofounder');
    return matchQuery && matchRole;
  });

  const filteredOpps = opportunities.filter(o => {
    const matchQuery = !query ||
      (o.title || '').toLowerCase().includes(query.toLowerCase()) ||
      (o.description || '').toLowerCase().includes(query.toLowerCase());
    const matchType = oppTypeFilter === 'All' || o.type === oppTypeFilter;
    return matchQuery && matchType;
  });

  if (loadingPage) return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg flex items-center justify-center" role="status" aria-live="polite">
        <div className="text-center">
          <div className="w-12 h-12 g-ind rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Globe className="w-6 h-6 text-white" aria-hidden="true" />
          </div>
          <p className="ss font-bold text-slate-900 text-lg">Loading Discover</p>
          <p className="text-slate-400 text-sm dm mt-1">Fetching the ecosystem…</p>
        </div>
      </div>
    </>
  );

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg pt-20 pb-16 dm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* ── PAGE HEADER ─────────────────────────────────────────── */}
          <div className="mb-8 f0">
            <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-500 uppercase tracking-widest bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full mb-3">
              <Globe className="w-3.5 h-3.5" aria-hidden="true" /> Discover
            </span>
            <h1 className="ss text-3xl md:text-4xl font-black text-slate-900 mb-2">
              Explore the Ecosystem
            </h1>
            <p className="text-slate-500 text-sm max-w-lg">
              Startups, mentors, co-founders, and opportunities — all in one feed.
            </p>
          </div>

          {/* ── SEARCH ──────────────────────────────────────────────── */}
          <div className="rounded-2xl transition-all mb-6 f1">
            <div className="flex items-center bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
              <Search className="w-5 h-5 text-slate-400 ml-4 flex-shrink-0" aria-hidden="true" />
              <input
                type="text" value={query} onChange={e => setQuery(e.target.value)}
                placeholder="Search startups, people, opportunities…"
                className="flex-1 px-3 py-4 text-sm text-slate-800 bg-transparent outline-none placeholder-slate-400 dm"
                aria-label="Search discover content"
              />
              {query && (
                <button onClick={() => setQuery('')} className="mr-2 p-1.5 hover:bg-slate-100 rounded-lg transition-all" aria-label="Clear search">
                  <X className="w-4 h-4 text-slate-400" aria-hidden="true" />
                </button>
              )}
            </div>
          </div>

          {/* ── SECTION TABS ────────────────────────────────────────── */}
          <div className="flex gap-2 overflow-x-auto no-scroll pb-2 mb-8 f2">
            {[
              { key: 'startups', label: '🚀 Startups & Ideas', count: filteredStartups.length },
              { key: 'people', label: '🤝 People', count: filteredPeople.length },
              { key: 'opportunities', label: '🎯 Opportunities', count: filteredOpps.length },
            ].map(tab => (
              <button 
                key={tab.key} 
                onClick={() => setActiveTab(tab.key)}
                className={`tab flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap ${activeTab === tab.key ? 'active' : 'inactive'}`}
                aria-pressed={activeTab === tab.key}
              >
                {tab.label}
                <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${activeTab === tab.key ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {tab.count}
                </span>
              </button>
            ))}
          </div>

          {/* ── MAIN LAYOUT ─────────────────────────────────────────── */}
          <div className="grid lg:grid-cols-3 gap-8">

            {/* ════ MAIN FEED (2/3 width) ═════════════════════════════ */}
            <div className="lg:col-span-2 space-y-10">

              {/* ── 0. AI RECOMMENDED ─────────────────────────────── */}
              {recommended.length > 0 && (
                <section className="f0">
                  {/* Banner */}
                  <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-2xl p-5 text-white flex items-center gap-4 mb-5">
                    <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Sparkles className="w-5 h-5" aria-hidden="true" />
                    </div>
                    <div className="flex-1">
                      <p className="font-bold text-sm ss">🔥 Recommended for You</p>
                      <p className="text-indigo-200 text-xs mt-0.5">
                        Based on your skills, interests, and what you're looking for.
                      </p>
                    </div>
                    {!studentProfile?.skills_with_levels?.length && (
                      <Link to="/profile"
                        className="bg-white/20 hover:bg-white/30 text-white text-xs font-semibold px-4 py-2 rounded-xl transition-all whitespace-nowrap">
                        Complete profile →
                      </Link>
                    )}
                  </div>

                  <div className="grid sm:grid-cols-2 gap-4">
                    {recommended.slice(0, 4).map((r, i) => (
                      <RecCard 
                        key={i} 
                        item={r}
                        userProfile={studentProfile}
                        onConnect={() => handleConnect(r.user_id || r.profiles?.id, r._rec_type === 'mentor' ? 'mentor_request' : 'cofounder_request')}
                        onMessage={() => handleMessage(r.user_id || r.profiles?.id)}
                        connecting={connecting[r.user_id || r.profiles?.id]}
                      />
                    ))}
                  </div>
                </section>
              )}

              {/* ── 1. STARTUPS & IDEAS ───────────────────────────── */}
              {activeTab === 'startups' && (
                <section className="f1">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="sec-eye mb-1">🚀 explore ideas</p>
                      <h2 className="ss text-xl font-bold text-slate-900">Startups & Ideas</h2>
                    </div>
                    <Link to="/find-cofounders"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      aria-label="Find co-founders">
                      Find co-founders<ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  {/* Industry filter */}
                  <div className="flex gap-2 overflow-x-auto no-scroll pb-2 mb-5">
                    {INDUSTRIES.map(ind => (
                      <button 
                        key={ind} 
                        onClick={() => setIndustryFilter(ind)}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${industryFilter === ind
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                        aria-pressed={industryFilter === ind}
                      >
                        {ind}
                      </button>
                    ))}
                  </div>

                  {filteredStartups.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {filteredStartups.map((f, i) => (
                        <StartupCard 
                          key={f.id || i} 
                          founder={f} 
                          index={i}
                          onConnect={() => handleConnect(f.user_id, 'cofounder_request')}
                          onMessage={() => handleMessage(f.user_id)}
                          connecting={connecting[f.user_id]}
                          liked={likedStartups.has(f.id)}
                          onLike={() => setLikedStartups(p => { const n = new Set(p); n.has(f.id) ? n.delete(f.id) : n.add(f.id); return n; })}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon="🚀" 
                      label={query ? `No startups matching "${query}"` : 'No startups in the ecosystem yet.'} 
                      sub="Founders will appear here once they join." 
                    />
                  )}
                </section>
              )}

              {/* ── 2. PEOPLE ─────────────────────────────────────── */}
              {activeTab === 'people' && (
                <section className="f1">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="sec-eye mb-1">🤝 find your people</p>
                      <h2 className="ss text-xl font-bold text-slate-900">Mentors & Co-Founders</h2>
                    </div>
                    <Link to="/find-mentors"
                      className="text-xs font-semibold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      aria-label="Find mentors">
                      Find mentors<ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                    </Link>
                  </div>

                  {/* Role filter */}
                  <div className="flex gap-2 mb-5">
                    {PEOPLE_ROLES.map(role => (
                      <button 
                        key={role} 
                        onClick={() => setRoleFilter(role)}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap transition-all ${roleFilter === role
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                        aria-pressed={roleFilter === role}
                      >
                        {role}
                      </button>
                    ))}
                  </div>

                  {filteredPeople.length > 0 ? (
                    <div className="space-y-4">
                      {filteredPeople.map((p, i) => (
                        <PeopleCard 
                          key={p.id || i} 
                          person={p} 
                          index={i}
                          userProfile={studentProfile}
                          onConnect={() => handleConnect(p.user_id, p._type === 'mentor' ? 'mentor_request' : 'cofounder_request')}
                          onMessage={() => handleMessage(p.user_id)}
                          connecting={connecting[p.user_id]}
                        />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon="👥" 
                      label={query ? `No people matching "${query}"` : 'No people found with that filter.'} 
                      sub="Try All or a different role filter." 
                    />
                  )}
                </section>
              )}

              {/* ── 3. OPPORTUNITIES ──────────────────────────────── */}
              {activeTab === 'opportunities' && (
                <section className="f1">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <p className="sec-eye mb-1">🎯 open now</p>
                      <h2 className="ss text-xl font-bold text-slate-900">Opportunities</h2>
                    </div>
                  </div>

                  {/* Type filter */}
                  <div className="flex gap-2 overflow-x-auto no-scroll pb-2 mb-5">
                    {OPP_TYPES.map(type => (
                      <button 
                        key={type} 
                        onClick={() => setOppTypeFilter(type)}
                        className={`text-xs font-semibold px-3.5 py-2 rounded-xl whitespace-nowrap capitalize transition-all ${oppTypeFilter === type
                            ? 'bg-indigo-600 text-white shadow-sm'
                            : 'bg-white border border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600'
                          }`}
                        aria-pressed={oppTypeFilter === type}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  {filteredOpps.length > 0 ? (
                    <div className="space-y-4">
                      {filteredOpps.map((opp, i) => (
                        <OppCard key={opp.id || i} opp={opp} index={i} />
                      ))}
                    </div>
                  ) : (
                    <EmptyState 
                      icon="🎯" 
                      label={query ? `No opportunities matching "${query}"` : 'No open opportunities right now.'} 
                      sub="Check back soon — new ones are added weekly." 
                    />
                  )}
                </section>
              )}
            </div>

            {/* ════ SIDEBAR (1/3 width) ════════════════════════════════ */}
            <div className="space-y-6">

              {/* ── Trending Mentors (sidebar always visible) ─────── */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 f0">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="ss font-bold text-slate-900 text-base">Top Mentors</h3>
                  <Link to="/find-mentors" className="text-xs font-semibold text-indigo-600 flex items-center gap-0.5" aria-label="View all mentors">
                    All<ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
                  </Link>
                </div>
                {people.filter(p => p._type === 'mentor').slice(0, 4).map((m, i) => (
                  <div key={m.id || i} className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 cursor-pointer transition-all group mb-1">
                    <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradFor(m.user_id)} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`} aria-hidden="true">
                      {initials(m.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-slate-800 group-hover:text-indigo-600 transition-colors truncate ss">{m.name}</p>
                      <p className="text-xs text-slate-500 truncate">{m.role}{m.org ? ` · ${m.org}` : ''}</p>
                    </div>
                    <button 
                      onClick={() => handleConnect(m.user_id, 'mentor_request')}
                      className="text-xs font-bold text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-lg hover:bg-indigo-100 transition-all whitespace-nowrap flex-shrink-0"
                      aria-label={`Request mentorship from ${m.name}`}
                    >
                      {connecting[m.user_id] === 'sent' ? 'Sent ✓' : 'Request'}
                    </button>
                  </div>
                ))}
                {people.filter(p => p._type === 'mentor').length === 0 && (
                  <p className="text-xs text-slate-400 italic py-2">No mentors yet.</p>
                )}
                <Link to="/find-mentors"
                  className="w-full mt-3 flex items-center justify-center py-2.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-600 text-xs font-bold rounded-xl transition-all ss tracking-wide">
                  FIND A MENTOR →
                </Link>
              </div>

              {/* ── Upcoming deadlines ─────────────────────────────── */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 f1">
                <h3 className="ss font-bold text-slate-900 text-base mb-4 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-indigo-500" aria-hidden="true" /> Closing Soon
                </h3>
                <div className="space-y-3">
                  {opportunities
                    .filter(o => o.deadline && new Date(o.deadline) > new Date())
                    .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
                    .slice(0, 4)
                    .map((opp, i) => {
                      const tl = timeLeft(opp.deadline);
                      return (
                        <div key={opp.id || i} className="flex items-center gap-3 py-2 border-b border-slate-50 last:border-0">
                          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
                            style={{ background: '#eef2ff', color: '#4f46e5' }}
                            aria-hidden="true"
                          >
                            {OPP_ICONS[opp.type] || <Gift className="w-4 h-4" aria-hidden="true" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 truncate">{opp.title}</p>
                            <p className="text-xs capitalize text-slate-500">{opp.type}</p>
                          </div>
                          {tl && <span className={`text-xs flex-shrink-0 ${tl.cls}`}>{tl.label}</span>}
                        </div>
                      );
                    })
                  }
                  {opportunities.filter(o => o.deadline && new Date(o.deadline) > new Date()).length === 0 && (
                    <p className="text-xs text-slate-400 italic">No upcoming deadlines.</p>
                  )}
                </div>
                <button 
                  onClick={() => setActiveTab('opportunities')}
                  className="w-full mt-3 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-600 text-xs font-bold rounded-xl transition-all ss tracking-wide"
                  aria-label="View all opportunities"
                >
                  VIEW ALL →
                </button>
              </div>

              {/* ── Quick Stats ────────────────────────────────────── */}
              <div className="bg-white rounded-2xl p-6 shadow-sm border border-slate-100 f2">
                <h3 className="ss font-bold text-slate-900 text-base mb-4">Ecosystem Stats</h3>
                <div className="space-y-3">
                  {[
                    { label: 'Startup Ideas', val: startups.length, Icon: Rocket, col: 'text-indigo-600', bg: 'bg-indigo-50' },
                    { label: 'Mentors', val: people.filter(p => p._type === 'mentor').length, Icon: Users, col: 'text-violet-600', bg: 'bg-violet-50' },
                    { label: 'Co-Founder Seekers', val: people.filter(p => p._type === 'cofounder').length, Icon: UserPlus, col: 'text-blue-600', bg: 'bg-blue-50' },
                    { label: 'Open Opportunities', val: opportunities.length, Icon: Gift, col: 'text-emerald-600', bg: 'bg-emerald-50' },
                  ].map(({ label, val, Icon, col, bg }) => (
                    <div key={label} className="flex items-center gap-3">
                      <div className={`w-8 h-8 ${bg} ${col} rounded-lg flex items-center justify-center flex-shrink-0`}>
                        <Icon className="w-4 h-4" aria-hidden="true" />
                      </div>
                      <div className="flex-1">
                        <p className="text-xs text-slate-500">{label}</p>
                      </div>
                      <p className="ss font-black text-slate-900 text-lg">{val}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// STARTUP CARD
// ═══════════════════════════════════════════════════════════════════════════
function StartupCard({ founder, index, onConnect, onMessage, connecting, liked, onLike }) {
  const p = founder.profiles || {};
  const name = founder.company_name || founder.idea_title || 'Untitled Startup';
  const stage = founder.startup_stage || founder.company_stage || 'Just an Idea';
  const desc = founder.problem_solving || founder.unique_value_proposition || p.bio || '';
  const grade = gradFor(founder.user_id);

  return (
    <div className={`lift bg-white rounded-2xl p-5 border border-slate-100 shadow-sm f${Math.min(index, 4)}`}>
      {/* Top row */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grade} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`} aria-hidden="true">
            {initials(p.full_name)}
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-700 ss">{p.full_name || 'Founder'}</p>
            {p.location && (
              <p className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-2.5 h-2.5" aria-hidden="true" />{p.location}
              </p>
            )}
          </div>
        </div>
        <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${stageBadge(stage)}`}>{stage}</span>
      </div>

      {/* Startup name */}
      <h3 className="ss font-bold text-slate-900 text-base mb-1 leading-snug">{name}</h3>
      {founder.industry && (
        <span className="inline-block text-xs bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full mb-2 font-medium">{founder.industry}</span>
      )}
      <p className="text-xs text-slate-500 leading-relaxed mb-4 line-clamp-2">{desc || 'No description yet.'}</p>

      {/* Target market */}
      {founder.target_market && (
        <p className="text-xs text-slate-400 mb-3 flex items-center gap-1">
          <Tag className="w-3 h-3" aria-hidden="true" />Target: {founder.target_market}
        </p>
      )}

      {/* CTAs */}
      <div className="flex items-center gap-2">
        <button 
          onClick={onMessage}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all"
          aria-label={`Message ${name}`}
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
        </button>
        <button 
          onClick={onConnect} 
          disabled={connecting === 'sent'}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition-all ${connecting === 'sent' ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
              connecting ? 'g-ind text-white opacity-70 cursor-wait' : 'g-ind text-white hover:opacity-90'
            }`}
          aria-label={`Join ${name} as co-founder`}
        >
          {connecting === 'sent' ? <><CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />Sent</> :
            connecting ? <Loader className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> :
              <><UserPlus className="w-3.5 h-3.5" aria-hidden="true" />Join as Co-Founder</>}
        </button>
        <button 
          onClick={onLike}
          className={`p-2 rounded-xl border-2 transition-all ${liked ? 'border-rose-200 text-rose-500' : 'border-slate-200 text-slate-400 hover:border-rose-200 hover:text-rose-400'}`}
          aria-label={liked ? 'Remove from favorites' : 'Save to favorites'}
        >
          <Heart className={`w-3.5 h-3.5 ${liked ? 'fill-rose-500' : ''}`} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// PEOPLE CARD (mentor + co-founder)
// ═══════════════════════════════════════════════════════════════════════════
function PeopleCard({ person, index, onConnect, onMessage, connecting, userProfile }) {
  const isMentor = person._type === 'mentor';
  const grade = gradFor(person.user_id);
  const matchType = isMentor ? 'mentor' : 'cofounder';
  const reasons = getMatchExplanation(userProfile, person, matchType);

  return (
    <div className={`lift bg-white rounded-2xl p-5 border border-slate-100 shadow-sm f${Math.min(index, 4)}`}>
      <div className="flex items-start gap-4">
        {/* Accent bar + Avatar */}
        <div className="flex gap-2 items-stretch flex-shrink-0">
          <div className="w-1 rounded-full self-stretch"
            style={{ background: isMentor ? '#4f46e5' : '#7c3aed' }} 
            aria-hidden="true"
          />
          <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${grade} flex items-center justify-center text-white text-sm font-bold ss`} aria-hidden="true">
            {initials(person.name)}
          </div>
        </div>

        <div className="flex-1 min-w-0">
          {/* Header */}
          <div className="flex items-start justify-between gap-2 mb-1">
            <div>
              <p className="ss font-bold text-slate-900 text-base leading-snug">{person.name || 'Unknown'}</p>
              <p className="text-xs text-slate-500">
                {person.role}{person.org ? ` · ${person.org}` : ''}
                {person.years ? ` · ${person.years} yrs` : ''}
              </p>
            </div>
            <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${isMentor ? 'bg-indigo-50 text-indigo-600 border border-indigo-100' : 'bg-violet-50 text-violet-600 border border-violet-100'
                }`}>
                {isMentor ? 'Mentor' : 'Co-Founder'}
              </span>
              {person.available !== undefined && (
                <div className={`w-2 h-2 rounded-full ${person.available ? 'bg-emerald-400' : 'bg-slate-300'}`} aria-label={person.available ? 'Available' : 'Unavailable'} />
              )}
              {person.pro_bono && (
                <span className="text-xs bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded-full font-medium border border-emerald-100">Pro Bono</span>
              )}
            </div>
          </div>

          {/* Location */}
          {person.location && (
            <p className="text-xs text-slate-400 flex items-center gap-1 mb-2">
              <MapPin className="w-3 h-3" aria-hidden="true" />{person.location}
            </p>
          )}

          {/* Bio */}
          {person.bio && (
            <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{person.bio}</p>
          )}

          {/* Skills */}
          {(person.skills || []).length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {person.skills.slice(0, 4).map((sk, i) => (
                <span key={i} className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${isMentor ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'
                  }`}>{sk}</span>
              ))}
            </div>
          )}

          {/* Co-founder specific — what they need */}
          {!isMentor && (person.help_needed || []).length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-xs text-slate-400">Needs help with:</span>
              {person.help_needed.slice(0, 2).map((h, i) => (
                <span key={i} className="text-xs bg-amber-50 text-amber-600 border border-amber-100 px-2 py-0.5 rounded-full font-medium">{h}</span>
              ))}
            </div>
          )}

          {/* Co-founder specific — has idea */}
          {!isMentor && person.has_idea && (
            <p className="text-xs text-indigo-600 font-semibold mb-3 flex items-center gap-1">
              <Lightbulb className="w-3.5 h-3.5" aria-hidden="true" />Has a startup idea
            </p>
          )}

          {/* 🔧 CHANGED: AI match explanation tooltip */}
          <div className="tooltip-wrap mb-3">
            <button 
              className="text-xs text-indigo-500 hover:text-indigo-700 font-medium flex items-center gap-1"
              aria-label="See why this person was recommended"
            >
              <Info className="w-3 h-3" aria-hidden="true" /> Why recommended?
            </button>
            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Reasons:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          {/* CTAs */}
          <div className="flex gap-2">
            <button 
              onClick={onMessage}
              className="flex items-center justify-center gap-1.5 px-4 py-2 border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all"
              aria-label={`Message ${person.name}`}
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
            </button>
            <button 
              onClick={onConnect} 
              disabled={connecting === 'sent'}
              className={`flex items-center justify-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${connecting === 'sent' ? 'bg-emerald-50 text-emerald-600 border-2 border-emerald-200' :
                  connecting ? 'g-ind text-white opacity-70 cursor-wait' :
                    isMentor ? 'g-ind text-white hover:opacity-90' : 'g-vi text-white hover:opacity-90'
                }`}
              aria-label={isMentor ? `Request mentorship from ${person.name}` : `Connect with ${person.name} as co-founder`}
            >
              {connecting === 'sent' ? <><CheckCircle className="w-3.5 h-3.5" aria-hidden="true" />Sent</> :
                connecting ? <Loader className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> :
                  <><UserPlus className="w-3.5 h-3.5" aria-hidden="true" />{isMentor ? 'Request Mentor' : 'Connect'}</>}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// OPPORTUNITY CARD
// ═══════════════════════════════════════════════════════════════════════════
function OppCard({ opp, index }) {
  const tl = timeLeft(opp.deadline);

  return (
    <div className={`lift bg-white rounded-2xl p-5 border border-slate-100 shadow-sm f${Math.min(index, 4)}`}>
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0"
          style={{
            background:
              opp.type === 'internship' ? '#eff6ff' :
                opp.type === 'event' ? '#faf5ff' :
                  opp.type === 'hackathon' ? '#fff7ed' :
                    opp.type === 'accelerator' ? '#fef9c3' :
                      opp.type === 'grant' ? '#ecfdf5' : '#f0fdf4',
            color:
              opp.type === 'internship' ? '#2563eb' :
                opp.type === 'event' ? '#7c3aed' :
                  opp.type === 'hackathon' ? '#ea580c' :
                    opp.type === 'accelerator' ? '#ca8a04' :
                      opp.type === 'grant' ? '#059669' : '#16a34a',
          }}
          aria-hidden="true"
        >
          {OPP_ICONS[opp.type] || <Gift className="w-5 h-5" aria-hidden="true" />}
        </div>

        <div className="flex-1 min-w-0">
          {/* Row 1 */}
          <div className="flex items-start justify-between gap-2 mb-1.5">
            <h3 className="ss font-bold text-slate-900 text-base leading-snug">{opp.title}</h3>
            <div className="flex flex-col items-end gap-1 flex-shrink-0">
              <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full capitalize ${oppBadge(opp.type)}`}>
                {opp.type}
              </span>
              {opp.is_featured && (
                <span className="text-xs bg-amber-50 text-amber-600 font-bold px-2 py-0.5 rounded-full border border-amber-100">
                  ⭐ Featured
                </span>
              )}
            </div>
          </div>

          {/* Organiser */}
          {opp.organiser && (
            <p className="text-xs text-slate-400 mb-2 flex items-center gap-1">
              <Building className="w-3 h-3" aria-hidden="true" />{opp.organiser}
              {opp.location && <><span className="mx-1">·</span><MapPin className="w-3 h-3" aria-hidden="true" />{opp.location}</>}
            </p>
          )}

          {/* Description */}
          {opp.description && (
            <p className="text-sm text-slate-600 leading-relaxed mb-3 line-clamp-2">{opp.description}</p>
          )}

          {/* Footer row */}
          <div className="flex items-center gap-3">
            {opp.deadline && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Clock className="w-3 h-3" aria-hidden="true" />
                Deadline: {new Date(opp.deadline).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
              </span>
            )}
            {tl && (
              <span className={`text-xs font-semibold ${tl.cls}`}>{tl.label}</span>
            )}
            <div className="ml-auto">
              {opp.link && opp.link !== '#' ? (
                <a 
                  href={opp.link} 
                  target="_blank" 
                  rel="noreferrer"
                  className="g-ind text-white text-xs font-bold px-4 py-2 rounded-xl hover:opacity-90 transition-all flex items-center gap-1.5"
                  aria-label={`Apply to ${opp.title}`}
                >
                  Apply / Join <ArrowUpRight className="w-3.5 h-3.5" aria-hidden="true" />
                </a>
              ) : (
                <button 
                  className="g-ind text-white text-xs font-bold px-4 py-2 rounded-xl opacity-50 cursor-not-allowed flex items-center gap-1.5"
                  disabled
                >
                  Coming Soon
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// AI RECOMMENDED CARD
// ═══════════════════════════════════════════════════════════════════════════
function RecCard({ item, userProfile, onConnect, onMessage, connecting }) {
  const isMentor = item._rec_type === 'mentor';
  const isStartup = item._rec_type === 'startup';
  const grade = gradFor(item.user_id);
  const reasons = getMatchExplanation(userProfile, item, item._rec_type);

  return (
    <div className="lift bg-white rounded-2xl p-4 border border-indigo-100 shadow-sm">
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${grade} flex items-center justify-center text-white text-xs font-bold ss flex-shrink-0`} aria-hidden="true">
          {initials(item.name)}
        </div>
        <div className="flex-1 min-w-0">
          <p className="ss font-bold text-slate-900 text-sm leading-snug">
            {isStartup ? (item.company_name || item.idea_title || 'Startup') : item.name}
          </p>
          <p className="text-xs text-slate-500 truncate">{item.role || item.industry || ''}</p>
        </div>
        <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${isMentor ? 'bg-indigo-50 text-indigo-600' : 'bg-violet-50 text-violet-600'
          }`}>
          {isMentor ? 'Mentor' : isStartup ? 'Startup' : 'Co-Founder'}
        </span>
      </div>

      {/* Why recommended */}
      <div className="flex items-center gap-1.5 mt-2.5 mb-3 p-2 bg-indigo-50 rounded-xl tooltip-wrap">
        <Sparkles className="w-3.5 h-3.5 text-indigo-400 flex-shrink-0" aria-hidden="true" />
        <p className="text-xs text-indigo-700 italic">{item._rec_reason}</p>
        <button 
          className="ml-auto text-[10px] text-indigo-400 hover:text-indigo-600 font-medium"
          aria-label="See detailed match reasons"
        >
          Details
        </button>
        <div className="tooltip-box">
          <p className="font-semibold mb-1">Why this match:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {reasons.map((r, i) => <li key={i}>{r}</li>)}
          </ul>
        </div>
      </div>

      {(item.skills || []).length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(item.skills).slice(0, 3).map((s, i) => (
            <span key={i} className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{s}</span>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <button 
          onClick={onMessage}
          className="flex-1 flex items-center justify-center gap-1.5 py-2 border-2 border-slate-200 text-slate-600 hover:border-indigo-200 hover:text-indigo-600 rounded-xl text-xs font-bold transition-all"
          aria-label={`Message ${item.name}`}
        >
          <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
        </button>
        <button 
          onClick={onConnect} 
          disabled={connecting === 'sent'}
          className={`flex-1 flex items-center justify-center gap-1.5 py-2 g-ind text-white rounded-xl text-xs font-bold hover:opacity-90 disabled:opacity-50 transition-all`}
          aria-label={`Connect with ${item.name}`}
        >
          {connecting === 'sent' ? 'Sent ✓' : connecting ? <Loader className="w-3.5 h-3.5 animate-spin" aria-hidden="true" /> : <><UserPlus className="w-3.5 h-3.5" aria-hidden="true" />Connect</>}
        </button>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────
function EmptyState({ icon, label, sub }) {
  return (
    <div className="py-16 text-center bg-white rounded-2xl border-2 border-dashed border-slate-200">
      <div className="text-4xl mb-3" aria-hidden="true">{icon}</div>
      <p className="text-slate-600 font-semibold ss">{label}</p>
      {sub && <p className="text-sm text-slate-400 mt-1 dm">{sub}</p>}
    </div>
  );
}