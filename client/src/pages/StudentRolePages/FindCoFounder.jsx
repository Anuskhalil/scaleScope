<<<<<<< HEAD
// src/pages/StudentRolePages/FindCoFounder.jsx
import React, {
  useState,
  useEffect,
  useCallback,
  memo,
  useMemo,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  Search,
  Users,
  UserPlus,
  MessageSquare,
  MapPin,
  X,
  Loader,
  CheckCircle,
  Clock,
  Lightbulb,
  Info,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
=======
// src/pages/student/FindCoFoundersPage.jsx
// ─── Optimized Find Co-Founders Page — AI-Transparent, Accessible, Production-Ready ───

import React, { useState, useEffect, useMemo, useCallback, memo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMatchedCoFounders,
  fetchStudentProfile,
  sendConnectionRequest,
  getOrCreateConversation,
} from '../../services/studentService';
import {
  Search, Sparkles, Zap, CheckCircle, Clock, X,
  Award, MessageSquare, Heart, UserPlus,
  ChevronRight, Filter, MapPin, Briefcase,
  Loader, AlertTriangle, RefreshCw, Users, Rocket,
  Info,
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
} from 'lucide-react';
import toast from 'react-hot-toast';

<<<<<<< HEAD
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import { fetchCoFounders } from '../../services/studentService';

const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --white: #fff;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
=======
// 🔧 CHANGED: Added toast for user feedback
import toast from 'react-hot-toast';

// 🔧 CHANGED: Added CSS for tooltips, focus states, and better loading
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  .ss { font-family:'Syne',sans-serif; }
  .dm { font-family:'DM Sans',sans-serif; }
  .lift { transition: transform .22s cubic-bezier(.22,.68,0,1.2), box-shadow .22s ease; will-change: transform; }
  .lift:hover { transform: translateY(-3px); box-shadow: 0 16px 44px rgba(109,40,217,.10); }
  .g-vi { background: linear-gradient(135deg,#7c3aed,#6366f1); }
  .comp-fill { background: linear-gradient(90deg,#7c3aed,#6366f1); }
  .card-top { border-color: #c4b5fd !important; background: linear-gradient(160deg,#fdf9ff 0%,#f5f3ff 100%); }
  .filter-sec { border-bottom:1px solid #e2e8f0; padding-bottom:18px; margin-bottom:18px; }
  .filter-sec:last-child { border-bottom:none; padding-bottom:0; margin-bottom:0; }
  .chip { display:inline-flex; align-items:center; padding:4px 11px; border-radius:9999px; font-size:11px; font-weight:600; cursor:pointer; border:1.5px solid #e2e8f0; background:#fff; color:#64748b; transition:all .14s; user-select: none; -webkit-tap-highlight-color: transparent; }
  .chip:hover { border-color:#c4b5fd; color:#7c3aed; }
  .chip.on { background:#f5f3ff; border-color:#c4b5fd; color:#7c3aed; }
  .chip:active { transform: scale(.98); }
  .dot-g { width:7px;height:7px;border-radius:50%;background:#22c55e;flex-shrink:0; }
  .dot-a { width:7px;height:7px;border-radius:50%;background:#f59e0b;flex-shrink:0; }
  .int-tag { background:#f5f3ff; color:#6d28d9; border:1.5px solid #ede9fe; font-size:11px; font-weight:600; padding:3px 10px; border-radius:9999px; }
  .sk-tag  { background:#f5f3ff; color:#7c3aed; border:1.5px solid #ddd6fe; font-size:11px; font-weight:600; padding:3px 10px; border-radius:9999px; }
  .slide-in { animation: si .28s cubic-bezier(.32,.72,0,1) both; }
  @keyframes si { from{opacity:0;transform:translateX(28px)} to{opacity:1;transform:none} }
  .tab-bar { border-bottom:2px solid #e2e8f0; display:flex; overflow-x:auto; scroll-behavior: smooth; }
  .tab-bar::-webkit-scrollbar { display:none; }
  .tab { padding:10px 16px; font-size:13px; font-weight:600; color:#64748b; cursor:pointer; border-bottom:2px solid transparent; margin-bottom:-2px; transition:all .14s; white-space:nowrap; font-family:'DM Sans',sans-serif; }
  .tab.on { color:#7c3aed; border-bottom-color:#7c3aed; }
  .tab:active { transform: scale(.98); }
  @keyframes mp { from{opacity:0;transform:scale(.95)} to{opacity:1;transform:scale(1)} }
  .modal-pop { animation:mp .22s cubic-bezier(.34,1.4,.64,1) both; }
  .inp { width:100%; padding:10px 14px; border:1.5px solid #e2e8f0; border-radius:12px; font-size:13px; outline:none; font-family:'DM Sans',sans-serif; transition:border-color .14s; background:#fff; }
  .inp:focus { border-color:#7c3aed; box-shadow: 0 0 0 3px rgba(124,58,237,.1); }
  .thin::-webkit-scrollbar { width:4px; }
  .thin::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .comp-track { height:5px; background:#ede9fe; border-radius:4px; overflow:hidden; }
  .comp-bar-fill { height:100%; background:linear-gradient(90deg,#7c3aed,#6366f1); border-radius:4px; }
  .badge-idea  { background:#f0fdf4; color:#16a34a; border:1.5px solid #bbf7d0; }
  .badge-mvp   { background:#eff6ff; color:#2563eb; border:1.5px solid #bfdbfe; }
  .badge-built { background:#fff7ed; color:#ea580c; border:1.5px solid #fed7aa; }
  @keyframes fu { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  .f0{animation:fu .32s ease both} .f1{animation:fu .32s .06s ease both} .f2{animation:fu .32s .12s ease both} .f3{animation:fu .32s .18s ease both} .f4{animation:fu .32s .24s ease both}
  .shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sh 1.4s infinite; border-radius:16px; contain: content; }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .no-scroll::-webkit-scrollbar{display:none} .no-scroll{-ms-overflow-style:none;scrollbar-width:none}
  
  /* 🔧 CHANGED: Accessibility focus states & lightweight tooltip */
  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box{opacity:1;visibility:visible;transform:translateY(0)}
  .tooltip-box{opacity:0;visibility:hidden;transform:translateY(4px);transition:all .15s ease;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:#1e293b;color:#fff;font-size:11px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:240px;white-space:normal;text-align:left}
  .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;margin-left:-4px;border-width:4px;border-style:solid;border-color:#1e293b transparent transparent transparent}
  
  /* Mobile optimizations */
  @media (max-width: 1024px) {
    .lift:hover { transform: none; box-shadow: none; }
    .chip:active { transform: scale(.95); }
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
  }

  .page-bg {
    background: var(--gray-50);
    background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }

  .lift {
    transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease;
  }

  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(27,45,127,.12);
  }

  .shimmer {
    background: linear-gradient(90deg, var(--gray-200) 25%, #ddd 50%, var(--gray-200) 75%);
    background-size: 200% 100%;
    animation: s 1.5s infinite;
    border-radius: 12px;
  }

  @keyframes s {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (max-width: 768px) {
    button, [role="button"] { min-height: 44px; min-width: 44px; }
  }

  .tooltip-wrap { position: relative; }

  .tooltip-wrap:focus-within .tooltip-box,
  .tooltip-wrap:hover .tooltip-box {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .tooltip-box {
    opacity: 0;
    visibility: hidden;
    transform: translateX(-50%) translateY(4px);
    transition: all .15s ease;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    background: var(--secondary);
    color: var(--white);
    font-size: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    width: 260px;
    white-space: normal;
  }

  .tooltip-box::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border: 5px solid transparent;
    border-top-color: var(--secondary);
  }
`;

<<<<<<< HEAD
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;
=======
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
function getMatchExplanation(userProfile, suggested) {
  if (!userProfile) return ['Based on your profile activity'];
  const reasons = [];
  
  // Skill complementarity
  const userSkills = new Set(userProfile.skills_with_levels?.map(s => s.skill?.toLowerCase()) || []);
  const candSkills = new Set((suggested.skills_with_levels || []).map(s => s.skill?.toLowerCase()));
  const complementary = [...candSkills].filter(s => !userSkills.has(s)).slice(0, 2);
  if (complementary.length) reasons.push(`Complements with: ${complementary.join(', ')}`);
  
  // Shared interests
  const userInterests = new Set(userProfile.interests?.map(i => i.toLowerCase()) || []);
  const candInterests = new Set(suggested.interests?.map(i => i.toLowerCase()) || []);
  const shared = [...userInterests].filter(i => candInterests.has(i)).slice(0, 2);
  if (shared.length) reasons.push(`Shared interest: ${shared.join(', ')}`);
  
  // Startup stage alignment
  if (suggested.has_startup_idea && userProfile.startup_idea_description) {
    reasons.push('Both actively building startups');
  }
  
  // Location match
  if (userProfile.location && suggested.profiles?.location === userProfile.location) {
    reasons.push('Same location');
  }
  
  return reasons.length > 0 ? reasons : ['Profile alignment based on activity'];
}

// ─── Constants (memoized to prevent re-creation) ─────────────────────────
const F_SKILLS = Object.freeze(['React', 'Node.js', 'AI/ML', 'Python', 'iOS/Swift', 'Design/Figma', 'Marketing', 'Finance', 'Product', 'Data', 'DevOps', 'Sales']);
const F_IND = Object.freeze(['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech', 'E-Commerce', 'AI / ML']);
const F_STAGE = Object.freeze(['Just an Idea', 'Pre-MVP', 'Building MVP', 'MVP Built', 'Revenue']);
const F_LOC = Object.freeze(['Karachi', 'Lahore', 'Islamabad', 'Remote', 'International']);
const F_AVAIL = Object.freeze(['Full-time Ready', 'Part-time', 'Flexible / Open', 'After April']);
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

async function getCachedUrl(path) {
  if (!path || path.startsWith('http')) return path;

  const key = `av:${path}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  try {
    const cleanPath = path.replace(/^avatars\//, '').replace(/^\/+/, '');

    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(cleanPath, 3600);

    if (error) {
      console.warn('Avatar signed URL error:', error.message);
      return null;
    }

    if (data?.signedUrl) {
      AVATAR_CACHE.set(key, { url: data.signedUrl, ts: Date.now() });
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('Avatar load failed:', err);
  }

  return null;
}

<<<<<<< HEAD
const initials = (name) => {
  if (!name) return '?';

  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};
=======
// ─── Shape DB row into card format (FIXED + enhanced) ─────────────────────
function shapeCofounder(row, currentUserId) {
  const p = row.profiles || {};
  const name = p.full_name || 'Founder';
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

const AVATAR_GRADS = [
  'from-violet-500 to-indigo-500',
  'from-emerald-500 to-teal-500',
  'from-amber-500 to-orange-500',
  'from-blue-500 to-cyan-500',
];

const gradFor = (id = '') => {
  const index = id ? String(id).charCodeAt(0) % AVATAR_GRADS.length : 0;
  return AVATAR_GRADS[index] || AVATAR_GRADS[0];
};

const normalizeText = (value) => String(value || '').toLowerCase().trim();

const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return skill.skill || skill.name || skill.title || '';
};

const getNestedProfile = (candidate) => {
  if (!candidate) return {};
  if (Array.isArray(candidate.profiles)) return candidate.profiles[0] || {};
  return candidate.profiles || candidate.profile || candidate.user || {};
};

const getPersonId = (candidate) => {
  const nestedProfile = getNestedProfile(candidate);

  return (
    candidate?.profile_id ||
    candidate?.user_id ||
    candidate?.target_user_id ||
    nestedProfile?.id ||
    candidate?.id
  );
};

const normalizeProfile = (candidate) => {
  const nestedProfile = getNestedProfile(candidate);
  const personId = getPersonId(candidate);

  return {
    ...nestedProfile,
    ...(candidate?.profile || {}),
    id: personId,
    full_name:
      candidate?.full_name ||
      candidate?.name ||
      candidate?.profile_name ||
      candidate?.display_name ||
      nestedProfile?.full_name ||
      nestedProfile?.name ||
      'Student Founder',
    avatar_url:
      candidate?.avatar_url ||
      candidate?.profile_avatar_url ||
      nestedProfile?.avatar_url ||
      null,
    location:
      candidate?.location ||
      candidate?.profile_location ||
      nestedProfile?.location ||
      '',
    bio:
      candidate?.bio ||
      candidate?.profile_bio ||
      nestedProfile?.bio ||
      '',
    user_type:
      candidate?.user_type || nestedProfile?.user_type || 'student',
    skills: candidate?.skills || nestedProfile?.skills || [],
  };
};

const getScore = (candidate) => {
  return Number(
    candidate?.matchScore ||
      candidate?.match_score ||
      candidate?.score ||
      candidate?.ai_score ||
      0
  );
};

const hasLookingFor = (candidate, option) => {
  const values =
    candidate?.looking_for ||
    candidate?.student_profile?.looking_for ||
    candidate?.student_profiles?.looking_for ||
    candidate?.profile?.looking_for ||
    candidate?.profiles?.looking_for ||
    [];

  if (Array.isArray(values)) return values.includes(option);

<<<<<<< HEAD
  return normalizeText(values).includes(normalizeText(option));
};

function computeCoFounderMatch(currentUserProfile, candidate) {
  if (!currentUserProfile || !candidate) {
    return { matchScore: 10, reasons: ['Basic profile compatibility'] };
  }

  let score = 0;
  const reasons = [];

  const currentSkills = new Set(
    (currentUserProfile.skills_with_levels || [])
      .map(normalizeSkill)
      .map(normalizeText)
      .filter(Boolean)
  );

  const candidateSkills = new Set(
    (candidate.skills_with_levels || [])
      .map(normalizeSkill)
      .map(normalizeText)
      .filter(Boolean)
  );

  const currentNeeds = new Set(
    (currentUserProfile.help_needed || [])
      .map(normalizeText)
      .filter(Boolean)
  );

  const currentInterests = new Set(
    (currentUserProfile.interests || [])
      .map(normalizeText)
      .filter(Boolean)
  );

  const candidateInterests = new Set(
    (candidate.interests || [])
      .map(normalizeText)
      .filter(Boolean)
  );

  const needSkillMatches = [...candidateSkills].filter((skill) => {
    return [...currentNeeds].some((need) => {
      return (
        need.includes(skill) ||
        skill.includes(need) ||
        need.split(' ').some((word) => word.length > 2 && skill.includes(word))
      );
    });
  });

  if (needSkillMatches.length > 0) {
    score += Math.min(25, needSkillMatches.length * 10);
    reasons.push(`Matches your needs: ${needSkillMatches.slice(0, 2).join(', ')}`);
  }

  const complementarySkills = [...candidateSkills].filter(
    (skill) => !currentSkills.has(skill)
  );

  if (complementarySkills.length > 0) {
    score += Math.min(20, complementarySkills.length * 5);
    reasons.push(`Complementary skills: ${complementarySkills.slice(0, 2).join(', ')}`);
  }

  if (
    currentUserProfile.commitment_level &&
    candidate.commitment_level &&
    currentUserProfile.commitment_level === candidate.commitment_level
  ) {
    score += 15;
    reasons.push(`Same commitment level: ${candidate.commitment_level}`);
  }

  if (
    currentUserProfile.idea_domain &&
    candidate.idea_domain &&
    normalizeText(currentUserProfile.idea_domain) === normalizeText(candidate.idea_domain)
  ) {
    score += 15;
    reasons.push(`Same startup domain: ${candidate.idea_domain}`);
  } else {
    const sharedInterests = [...currentInterests].filter((interest) =>
      candidateInterests.has(interest)
    );

    if (sharedInterests.length > 0) {
      score += Math.min(10, sharedInterests.length * 5);
      reasons.push(`Shared interests: ${sharedInterests.slice(0, 2).join(', ')}`);
    }
  }

  if (currentUserProfile.has_startup_idea && candidate.has_startup_idea) {
    score += 10;
    reasons.push('Both are working on startup ideas');
  }

  if (
    currentUserProfile.university &&
    candidate.university &&
    normalizeText(currentUserProfile.university) === normalizeText(candidate.university)
  ) {
    score += 5;
    reasons.push('Same university network');
  }

  const completion = Number(candidate.profile_completion || 0);

  if (completion >= 80) {
    score += 10;
    reasons.push('Strong completed profile');
  } else if (completion >= 50) {
    score += 5;
    reasons.push('Decent profile completion');
  }

  const finalScore = Math.max(10, Math.min(100, Math.round(score)));

  return {
    matchScore: finalScore,
    reasons: reasons.length ? reasons.slice(0, 3) : ['Basic profile compatibility'],
=======
    projects: [],
    // 🔧 CHANGED: Store raw avatar path for caching
    avatarPath: p.avatar_url,
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
  };
}

function buildMatchReasons(currentUserProfile, candidate) {
  return computeCoFounderMatch(currentUserProfile, candidate).reasons;
}

<<<<<<< HEAD
const Avatar = memo(({ name, path, grad = 'from-gray-400 to-gray-500', size = 'md' }) => {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));
=======
const CheckRow = memo(({ label, checked, onClick }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
    <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 group-hover:border-violet-300'}`} role="checkbox" aria-checked={checked}>
      {checked && <div className="w-2 h-2 rounded-sm bg-white" />}
    </div>
    <span className="text-sm text-slate-600 group-hover:text-violet-600 transition-colors">{label}</span>
  </label>
));

const RadioRow = memo(({ label, checked, onClick }) => (
  <label className="flex items-center gap-2.5 cursor-pointer group" onClick={onClick}>
    <div className={`w-4 h-4 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all ${checked ? 'bg-violet-600 border-violet-600' : 'border-slate-300 group-hover:border-violet-300'}`} role="radio" aria-checked={checked}>
      {checked && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
    </div>
    <span className="text-sm text-slate-600 group-hover:text-violet-600 transition-colors">{label}</span>
  </label>
));

const CompatBars = memo(({ scores }) => (
  <div className="grid grid-cols-2 gap-x-4 gap-y-2.5">
    {scores.map((c, i) => (
      <div key={i}>
        <div className="flex justify-between text-xs mb-1">
          <span className="text-slate-500">{c.label}</span>
          <span className="font-bold text-slate-700">{c.val}%</span>
        </div>
        <div className="comp-track" role="progressbar" aria-valuenow={c.val} aria-valuemin={0} aria-valuemax={100}>
          <div className="comp-bar-fill" style={{ width: `${c.val}%` }} />
        </div>
      </div>
    ))}
  </div>
));

// ─── Profile Panel (memoized + accessible) ────────────────────────────────────────────
const ProfilePanel = memo(({ cf, onClose, onConnect, onMessage }) => {
  const [tab, setTab] = useState('about');
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

  useEffect(() => {
    let cancelled = false;

<<<<<<< HEAD
    if (!path) {
      setUrl(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
=======
  return (
    <div className="fixed inset-0 z-40 flex" role="dialog" aria-modal="true" aria-labelledby="profile-title">
      <div className="flex-1 bg-black/40 backdrop-blur-sm" onClick={onClose} aria-hidden="true" />
      <div className="w-full max-w-lg bg-white h-full flex flex-col shadow-2xl slide-in dm overflow-hidden">
        <div className="border-b border-slate-100 px-6 py-4 flex items-center justify-between flex-shrink-0">
          <p id="profile-title" className="text-xs font-bold text-slate-400 uppercase tracking-widest">Co-Founder Profile</p>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 hover:bg-slate-200 flex items-center justify-center transition-all min-h-[44px]" aria-label="Close profile">
            <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto thin">
          <div className="px-6 pt-6 pb-5 border-b border-slate-100">
            <div className="flex items-start gap-4 mb-4">
              <div className={`w-16 h-16 rounded-2xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-black text-xl ss flex-shrink-0`} aria-hidden="true">
                {cf.initials}
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="ss font-black text-slate-900 text-xl leading-tight mb-0.5">{cf.name}</h2>
                <p className="text-sm font-semibold text-slate-600">{cf.role}</p>
                <p className="text-xs text-slate-400 mt-0.5 italic">{cf.tagline}</p>
              </div>
            </div>
            <div className="grid grid-cols-4 gap-2 mb-4">
              {[
                { label: 'Match', v: `${cf.matchScore}%`, sub: 'Match score' },
                { label: 'Avail', v: cf.availDot === 'g' ? 'Now' : 'Soon', sub: 'availability' },
                { label: 'Stage', v: cf.startupStage.split(' ').slice(-1)[0], sub: 'startup stage' },
                { label: 'Edu', v: cf.edu ? cf.edu.split(' ')[0] : '—', sub: 'university' },
              ].map((s, i) => (
                <div key={i} className="bg-slate-50 rounded-xl p-2.5 text-center">
                  <p className="ss font-black text-slate-900 text-base leading-none mb-0.5">{s.v}</p>
                  <p className="text-[10px] text-slate-400 leading-tight">{s.sub}</p>
                </div>
              ))}
            </div>
            <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 text-xs text-violet-700 leading-relaxed">
              <p className="font-bold flex items-center gap-1 mb-1"><Zap className="w-3 h-3 text-violet-500" aria-hidden="true" /> Why matched</p>
              {cf.aiReason}
            </div>
          </div>
          <div className="px-6 border-b border-slate-100">
            <div className="tab-bar" role="tablist">
              {['about', 'skills', 'compatibility'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`tab ${tab === t ? 'on' : ''}`}
                  role="tab"
                  aria-selected={tab === t}
                  aria-controls={`panel-${t}`}
                  id={`tab-${t}`}
                >
                  {t.charAt(0).toUpperCase() + t.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="px-6 py-6">
            {tab === 'about' && (
              <div className="space-y-5" role="tabpanel" id="panel-about" aria-labelledby="tab-about">
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Bio</p>
                  {cf.bio ? <p className="text-sm text-slate-700 leading-relaxed">{cf.bio}</p> : <p className="text-sm text-slate-400 italic">No bio added yet.</p>}
                </div>
                {cf.interests.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Startup Interests</p>
                    <div className="flex flex-wrap gap-2">{cf.interests.map(t => <span key={t} className="int-tag">{t}</span>)}</div>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Details</p>
                  <div className="space-y-2">
                    {[
                      { icon: <MapPin className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.location },
                      { icon: <Clock className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.exp },
                      { icon: <Award className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.edu },
                      { icon: <Briefcase className="w-3.5 h-3.5" aria-hidden="true" />, val: cf.commitment },
                      { icon: <Rocket className="w-3.5 h-3.5" aria-hidden="true" />, val: `Stage: ${cf.startupStage}` },
                    ].filter(d => d.val).map((d, i) => (
                      <div key={i} className="flex items-center gap-2.5 text-sm text-slate-600">
                        <span className="text-violet-400 flex-shrink-0">{d.icon}</span>{d.val}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
            {tab === 'skills' && (
              <div role="tabpanel" id="panel-skills" aria-labelledby="tab-skills">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-4">Skills</p>
                {cf.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2 mb-6">{cf.skills.map(s => <span key={s} className="sk-tag">{s}</span>)}</div>
                ) : <p className="text-sm text-slate-400 italic mb-4">No skills listed.</p>}
              </div>
            )}
            {tab === 'compatibility' && (
              <div role="tabpanel" id="panel-compatibility" aria-labelledby="tab-compatibility">
                <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-5">Compatibility Breakdown</p>
                <CompatBars scores={cf.compatScore} />
                <div className="mt-5 p-4 bg-violet-50 border border-violet-100 rounded-xl">
                  <p className="text-xs font-bold text-violet-700 mb-1">Overall Match Score</p>
                  <p className="ss font-black text-violet-900 text-2xl">{cf.matchScore}%</p>
                  <p className="text-xs text-violet-600 mt-1">Based on skills, vision, work style & commitment alignment.</p>
                </div>
              </div>
            )}
          </div>
        </div>
        <div className="sticky bottom-0 border-t border-slate-100 bg-white px-6 py-4 flex gap-3 flex-shrink-0">
          <button onClick={() => onMessage(cf)} className="flex-1 flex items-center justify-center gap-2 border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600 py-3 rounded-xl text-sm font-bold transition-all min-h-[44px]" aria-label={`Message ${cf.name}`}>
            <MessageSquare className="w-4 h-4" aria-hidden="true" /> Message
          </button>
          <button onClick={() => onConnect(cf)} className="flex-1 flex items-center justify-center gap-2 g-vi text-white py-3 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-lg shadow-violet-200 min-h-[44px]" aria-label={`Connect with ${cf.name}`}>
            <UserPlus className="w-4 h-4" aria-hidden="true" /> Connect
          </button>
        </div>
      </div>
    </div>
  );
});

// ─── Connect Modal (memoized + accessible + toast feedback) ────────────────────────────────────────────
const ConnectModal = memo(({ cf, userId, onClose }) => {
  const [idea, setIdea] = useState('');
  const [why, setWhy] = useState('');
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    setSending(true); setError('');
    try {
      const message = [idea && `Idea: ${idea}`, why && `Why: ${why}`].filter(Boolean).join('\n');
      await sendConnectionRequest(userId, cf.user_id, 'cofounder_request', message);
      setSent(true);
      toast.success('Co-founder request sent!');
    } catch (err) {
      setError(err.message || 'Failed to send request');
      toast.error('Failed to send request');
    } finally {
      setSending(false);
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    }

    setLoading(true);

<<<<<<< HEAD
    getCachedUrl(path).then((avatarUrl) => {
      if (!cancelled) {
        setUrl(avatarUrl);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[size];

  if (loading) return <div className={`${sizeClass} rounded-xl shimmer`} aria-hidden="true" />;

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${sizeClass} object-cover rounded-xl`}
        loading="lazy"
        onError={() => setUrl(null)}
      />
    );
  }
=======
  if (sent) return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <div className="bg-white rounded-3xl p-8 max-w-sm w-full text-center shadow-2xl modal-pop">
        <div className="w-16 h-16 g-vi rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
          <CheckCircle className="w-8 h-8 text-white" aria-hidden="true" />
        </div>
        <h3 className="ss font-black text-slate-900 text-xl mb-2">Request Sent!</h3>
        <p className="text-sm text-slate-500 leading-relaxed mb-6"><strong className="text-slate-700">{cf.name}</strong> will receive your co-founder request.</p>
        <button onClick={onClose} className="w-full py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200 transition-all min-h-[44px]" aria-label="Close confirmation">Done</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="connect-title">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <h3 id="connect-title" className="ss font-black text-slate-900 text-xl">Send Co-Founder Request</h3>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all min-h-[44px]" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </button>
        </div>
        <div className="flex items-center gap-3 p-4 bg-violet-50 border border-violet-100 rounded-2xl mb-6">
          <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-bold ss flex-shrink-0`} aria-hidden="true">
            {cf.initials}
          </div>
          <div className="flex-1">
            <p className="ss font-bold text-slate-900">{cf.name}</p>
            <p className="text-xs text-slate-500">{cf.role}</p>
          </div>
          <div className="g-vi text-white text-xs font-bold px-2.5 py-1 rounded-full flex-shrink-0">{cf.matchScore}% match</div>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4" role="alert">{error}</p>}
        <div className="space-y-4 mb-5">
          <div>
            <label htmlFor="idea-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Your idea in one line</label>
            <input
              id="idea-input"
              type="text"
              className="inp"
              value={idea}
              onChange={e => setIdea(e.target.value)}
              placeholder="e.g. AI-powered personalised learning for Pakistan's students"
              maxLength={200}
              aria-label="Your startup idea"
            />
          </div>
          <div>
            <label htmlFor="why-input" className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Why do you see them as your co-founder?</label>
            <textarea
              id="why-input"
              rows={3}
              className="inp resize-none"
              value={why}
              onChange={e => setWhy(e.target.value)}
              placeholder="Reference their specific background..."
              maxLength={500}
              aria-label="Why you want to connect"
            />
          </div>
        </div>
        <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-5 text-xs text-violet-700 leading-relaxed">
          <strong className="flex items-center gap-1 mb-1"><Zap className="w-3 h-3" aria-hidden="true" /> Tip:</strong>
          Lead with why your domain insight is the missing piece they need.
        </div>
        <button
          onClick={handleSend}
          disabled={sending}
          className="w-full g-vi text-white font-bold py-3.5 rounded-xl hover:opacity-90 transition-all shadow-lg shadow-violet-200 flex items-center justify-center gap-2 disabled:opacity-50 min-h-[44px]"
          aria-busy={sending}
        >
          {sending ? <><Loader className="w-4 h-4 animate-spin" aria-hidden="true" />Sending…</> : <><UserPlus className="w-4 h-4" aria-hidden="true" /> Send Co-Founder Request</>}
        </button>
      </div>
    </div>
  );
});

// ─── Message Modal (memoized + accessible + toast feedback) ────────────────────────────────────────────
const MessageModal = memo(({ cf, userId, onClose }) => {
  const navigate = useNavigate();
  const [msg, setMsg] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const handleSend = useCallback(async () => {
    if (!msg.trim()) return;
    setSending(true); setError('');
    try {
      await getOrCreateConversation(userId, cf.user_id);
      navigate('/messages');
      onClose();
      toast.success('Opening conversation...');
    } catch (err) {
      setError(err.message || 'Failed to open conversation');
      toast.error('Failed to open conversation');
      setSending(false);
    }
  }, [msg, userId, cf.user_id, navigate, onClose]);

  useEffect(() => {
    const handleEsc = (e) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4" role="dialog" aria-modal="true" aria-labelledby="message-title">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl modal-pop dm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white text-sm font-bold ss`} aria-hidden="true">
              {cf.initials}
            </div>
            <div>
              <p className="ss font-bold text-slate-900">{cf.name}</p>
              <p className="text-xs text-slate-400">{cf.role}</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all min-h-[44px]" aria-label="Close">
            <X className="w-4 h-4 text-slate-500" aria-hidden="true" />
          </button>
        </div>
        {error && <p className="text-xs text-red-600 bg-red-50 p-3 rounded-xl mb-4" role="alert">{error}</p>}
        <textarea
          rows={4}
          value={msg}
          onChange={e => setMsg(e.target.value)}
          className="inp resize-none mb-4"
          placeholder={`Hi ${cf.name.split(' ')[0]}, I came across your profile on ScalScope...`}
          maxLength={1000}
          aria-label="Message"
        />
        <button
          onClick={handleSend}
          disabled={!msg.trim() || sending}
          className={`w-full py-3 rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all min-h-[44px]
            ${msg.trim() && !sending ? 'g-vi text-white shadow-lg shadow-violet-200 hover:opacity-90' : 'bg-slate-100 text-slate-400 cursor-not-allowed'}`}
          aria-busy={sending}
        >
          {sending ? <><Loader className="w-4 h-4 animate-spin" aria-hidden="true" />Opening…</> : <><MessageSquare className="w-4 h-4" aria-hidden="true" /> Open Chat</>}
        </button>
        <p className="text-xs text-slate-400 text-center mt-2">You'll be redirected to Messages.</p>
      </div>
    </div>
  );
});

// ─── CoFounder Card (memoized for performance + accessibility + AI transparency) ───────────────────────────
const CoFounderCard = memo(({ cf, onView, onConnect, onMessage, onSave, isSaved, userProfile }) => {
  const [showBreakdown, setShowBreakdown] = useState(false);
  const reasons = getMatchExplanation(userProfile, cf);
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold rounded-xl`}
      aria-hidden="true"
    >
<<<<<<< HEAD
      {initials(name)}
=======
      {cf.matchScore >= 80 && (
        <div className="mb-4">
          <span className="g-vi text-white text-xs font-bold px-3 py-1.5 rounded-full inline-flex items-center gap-1">
            <Sparkles className="w-3 h-3" aria-hidden="true" /> Strong Match
          </span>
        </div>
      )}
      <div className="flex flex-col md:flex-row gap-5">
        <div className="flex-shrink-0">
          <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${cf.grad} flex items-center justify-center text-white font-black text-lg ss`} aria-hidden="true">
            {cf.initials}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-start justify-between gap-3 mb-2">
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="ss font-black text-slate-900 text-xl">{cf.name}</h3>
                {cf.verified && <CheckCircle className="w-4 h-4 text-violet-500 flex-shrink-0" aria-label="Verified profile" />}
                <span className="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-medium">{cf.badge}</span>
              </div>
              <p className="text-sm font-semibold text-slate-600 mt-0.5">{cf.role}</p>
              <p className="text-xs text-violet-500 font-medium italic mt-0.5">{cf.tagline}</p>
            </div>
            <div className={`px-3 py-1.5 rounded-xl flex items-center gap-1.5 flex-shrink-0 ${cf.matchScore >= 80 ? 'g-vi text-white' : cf.matchScore >= 60 ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600'}`}>
              <Zap className="w-3.5 h-3.5" aria-hidden="true" />
              <span className="font-bold text-sm">{cf.matchScore}% Match</span>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mb-3 text-xs">
            <span className="flex items-center gap-1.5 text-slate-500">
              <MapPin className="w-3 h-3" aria-hidden="true" />{cf.location}
            </span>
            <span className={`flex items-center gap-1.5 font-semibold ${cf.availDot === 'g' ? 'text-green-600' : 'text-amber-600'}`}>
              <div className={cf.availDot === 'g' ? 'dot-g' : 'dot-a'} aria-hidden="true" />{cf.availability}
            </span>
            <span className={`px-2.5 py-0.5 rounded-full font-bold text-xs ${cf.stageClass}`}>{cf.startupStage}</span>
          </div>
          {cf.interests.length > 0 && (
            <div className="flex items-center gap-1.5 mb-3 flex-wrap">
              <span className="text-xs text-slate-400">Interested in:</span>
              {cf.interests.slice(0, 3).map(t => <span key={t} className="int-tag">{t}</span>)}
            </div>
          )}
          {cf.skills.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {cf.skills.slice(0, 5).map(s => <span key={s} className="sk-tag">{s}</span>)}
            </div>
          )}
          {(cf.exp || cf.edu) && (
            <div className="flex flex-wrap gap-4 mb-4 text-xs text-slate-500">
              {cf.edu && <span className="flex items-center gap-1"><Award className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />{cf.edu}</span>}
              {cf.exp && <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-violet-400" aria-hidden="true" />{cf.exp}</span>}
            </div>
          )}
          <div className="mb-4"><CompatBars scores={cf.compatScore} /></div>

          {/* 🔧 CHANGED: Match transparency - accessible toggle with tooltip */}
          <div className="bg-violet-50 border border-violet-100 rounded-xl p-3 mb-4 text-xs text-violet-700 leading-relaxed tooltip-wrap">
            <button
              onClick={() => setShowBreakdown(!showBreakdown)}
              className="flex items-center justify-between w-full group text-left"
              aria-expanded={showBreakdown}
              aria-controls={`breakdown-${cf.id}`}
            >
              <span>
                <Zap className="w-3 h-3 inline mr-1 text-violet-500" aria-hidden="true" />
                <strong>Why matched: </strong>{cf.aiReason}
              </span>
              <ChevronRight className={`w-4 h-4 transition-transform md:hidden ${showBreakdown ? 'rotate-90' : ''}`} aria-hidden="true" />
            </button>
            <div
              id={`breakdown-${cf.id}`}
              className={`mt-3 space-y-2 ${showBreakdown ? 'block' : 'hidden md:block'}`}
            >
              {cf.compatScore.map((c, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-[10px] text-slate-500 w-24 flex-shrink-0">{c.label}</span>
                  <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full ${c.val >= 80 ? 'bg-emerald-500' : c.val >= 60 ? 'bg-violet-500' : 'bg-slate-400'}`}
                      style={{ width: `${c.val}%` }}
                      role="progressbar"
                      aria-valuenow={c.val}
                      aria-valuemin={0}
                      aria-valuemax={100}
                    />
                  </div>
                  <span className="text-[10px] font-bold text-slate-700 w-8 text-right">{c.val}%</span>
                </div>
              ))}
            </div>
            {/* 🔧 CHANGED: AI explanation tooltip */}
            <button className="mt-2 text-[10px] text-violet-500 hover:text-violet-700 font-medium" aria-label="See detailed match reasons">
              Why these reasons?
            </button>
            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Factors:</p>
              <ul className="list-disc list-inside space-y-0.5">
                {reasons.map((r, i) => <li key={i}>{r}</li>)}
              </ul>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => onView(cf)}
              className="flex items-center gap-1.5 border-2 border-slate-200 text-slate-700 hover:border-violet-300 hover:text-violet-600 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]"
              aria-label={`View ${cf.name}'s profile`}
            >
              View Profile <ChevronRight className="w-3.5 h-3.5" aria-hidden="true" />
            </button>
            <button
              onClick={() => onConnect(cf)}
              className="flex items-center gap-1.5 g-vi text-white px-4 py-2 rounded-xl text-sm font-bold hover:opacity-90 transition-all shadow-md shadow-violet-200 min-h-[44px]"
              aria-label={`Connect with ${cf.name}`}
            >
              <UserPlus className="w-3.5 h-3.5" aria-hidden="true" /> Connect
            </button>
            <button
              onClick={() => onMessage(cf)}
              className="flex items-center gap-1.5 border-2 border-emerald-200 text-emerald-700 hover:bg-emerald-50 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]"
              aria-label={`Message ${cf.name}`}
            >
              <MessageSquare className="w-3.5 h-3.5" aria-hidden="true" /> Message
            </button>
            <button
              onClick={() => onSave(cf.id)}
              className={`flex items-center gap-1.5 border-2 px-4 py-2 rounded-xl text-sm font-bold transition-all min-h-[44px]
                ${isSaved ? 'border-rose-300 bg-rose-50 text-rose-600' : 'border-slate-200 text-slate-500 hover:border-rose-300 hover:text-rose-500'}`}
              aria-pressed={isSaved}
              aria-label={isSaved ? 'Remove from saved' : 'Save to favorites'}
            >
              <Heart className={`w-3.5 h-3.5 ${isSaved ? 'fill-rose-500 text-rose-500' : ''}`} aria-hidden="true" />
              {isSaved ? 'Saved' : 'Save'}
            </button>
          </div>
        </div>
      </div>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    </div>
  );
});

const CoFounderCard = memo(function CoFounderCard({
  candidate,
  currentUserProfile,
  connectionStatus,
  onConnect,
  onMessage,
  connecting,
}) {
  const personId = getPersonId(candidate);
  const p = useMemo(() => normalizeProfile(candidate), [candidate]);
  const score = getScore(candidate);

  const reasons = useMemo(() => {
    return candidate.reasons?.length
      ? candidate.reasons
      : buildMatchReasons(currentUserProfile, candidate);
  }, [currentUserProfile, candidate]);

  const skillNames = useMemo(() => {
    return [
      ...new Set(
        [
          ...(candidate.skills_with_levels || []).map(normalizeSkill),
          ...(candidate.skills || []),
          ...(p.skills || []),
        ]
          .flat()
          .map(normalizeSkill)
          .filter(Boolean)
      ),
    ].slice(0, 5);
  }, [candidate, p.skills]);

  const buttonState = connecting || connectionStatus;

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-brand" aria-hidden="true" />

        <Avatar name={p.full_name} path={p.avatar_url} grad={gradFor(personId)} size="xl" />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="font-bold text-gray-900 truncate">{p.full_name}</p>

              <p className="text-xs text-gray-500">
                {candidate.university || 'University not added'}
                {candidate.degree ? ` · ${candidate.degree}` : ''}
                {candidate.major ? ` · ${candidate.major}` : ''}
                {candidate.current_year ? ` · ${candidate.current_year}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                {score}% Match
              </span>

              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-purple-50 text-purple-700">
                Co-Founder
              </span>
            </div>
          </div>

          {p.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3" />
              {p.location}
            </p>
          )}

          {p.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{p.bio}</p>}

          {candidate.startup_idea_description && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mt-3">
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-1">
                <Lightbulb className="w-3" />
                Startup Idea
              </p>

              <p className="text-sm text-gray-700 line-clamp-2">
                {candidate.startup_idea_description}
              </p>
            </div>
          )}

          {skillNames.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {skillNames.map((skill, index) => (
                <span
                  key={`${skill}-${index}`}
                  className="text-xs px-2 py-0.5 rounded-full bg-purple-50 text-purple-700"
                >
                  {skill}
                </span>
              ))}
            </div>
          )}

          {candidate.help_needed?.length > 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Needs: {candidate.help_needed.slice(0, 3).join(', ')}
            </p>
          )}

          {candidate.commitment_level && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <Clock className="w-3" />
              {candidate.commitment_level}
            </p>
          )}

          <div className="tooltip-wrap mt-3 inline-block">
            <button
              type="button"
              className="text-xs text-indigo-600 hover:underline flex items-center gap-1"
              aria-label="Why recommended?"
            >
              <Info className="w-3" />
              Why this match?
            </button>

            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Reasons:</p>

              <ul className="list-disc list-inside text-xs space-y-1">
                {reasons.map((reason, index) => (
                  <li key={`${reason}-${index}`}>{reason}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <Link
              to={`/user-profile/${personId}`}
              className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
            >
              View Profile
            </Link>

            <button
              type="button"
              onClick={() => {
                if (connectionStatus === 'accepted') onMessage(personId);
              }}
              disabled={connectionStatus !== 'accepted'}
              title={
                connectionStatus === 'accepted'
                  ? 'Message this connection'
                  : 'Connect first to send messages'
              }
              className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                connectionStatus === 'accepted'
                  ? 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
                  : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-3.5 mr-1" />
              {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
            </button>

            {buttonState === 'accepted' ? (
              <button
                type="button"
                disabled
                className="py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center"
              >
                <CheckCircle className="w-3.5 mr-1" />
                Connected
              </button>
            ) : buttonState === 'pending' || buttonState === 'sent' ? (
              <button
                type="button"
                disabled
                className="py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center"
              >
                <Clock className="w-3.5 mr-1" />
                Pending
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConnect(candidate)}
                disabled={buttonState === true}
                className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
              >
                {buttonState === true ? (
                  <Loader className="w-3.5 animate-spin mr-1" />
                ) : (
                  <UserPlus className="w-3.5 mr-1" />
                )}
                {buttonState === true ? 'Sending...' : 'Connect'}
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
});

export default function FindCoFoundersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

<<<<<<< HEAD
  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({ profile: {}, coFounders: [], myConnections: [] });
=======
  const [founders, setFounders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [fetchErr, setFetchErr] = useState('');
  const [studentProfile, setStudentProfile] = useState(null); // 🔧 CHANGED: Store for AI explanations
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

  const [filters, setFilters] = useState({
    skill: 'All',
    commitment: 'All',
    query: '',
    matchBand: 'all',
  });

  const [connecting, setConnecting] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});

  const normalizeCandidate = useCallback((candidate, currentProfile) => {
    const personId = getPersonId(candidate);
    const p = normalizeProfile(candidate);
    const calculated = computeCoFounderMatch(currentProfile, candidate);

<<<<<<< HEAD
    return {
      ...candidate,
      profile_id: personId,
      user_id: candidate?.user_id || personId,
      full_name: p.full_name,
      avatar_url: p.avatar_url,
      location: p.location,
      bio: p.bio,
      user_type: p.user_type,
      matchScore: Number(
        candidate.matchScore ||
          candidate.match_score ||
          candidate.score ||
          candidate.ai_score ||
          calculated.matchScore
      ),
      reasons: candidate.reasons?.length ? candidate.reasons : calculated.reasons,
=======
    setLoading(true);
    setFetchErr('');

    // Timeout to prevent infinite loading
    const timeoutId = setTimeout(() => {
      setFetchErr('Request timed out. Please check your connection.');
      setLoading(false);
    }, 10000);

    try {
      // 🔧 CHANGED: Use safeFetch with error handling
      const currentUserProfile = await safeFetch(
        fetchStudentProfile(user.id),
        {},
        () => toast.error('Failed to load your profile')
      );
      setStudentProfile(currentUserProfile);

      const matchedFounders = await safeFetch(
        fetchMatchedCoFounders(
          currentUserProfile,
          {
            skills: fSkills,
            industry: fInd[0],
            startupStage: fStage,
            location: fLoc[0],
            availability: fAvail,
            limit: 30,
          },
          { minScore: 35 }
        ),
        [],
        () => toast.error('Failed to load co-founder matches')
      );

      const shaped = matchedFounders
        .filter(r => r.user_id !== user.id)
        .map(row => shapeCofounder(row, user.id));

      setFounders(shaped);

    } catch (err) {
      console.error('[loadFounders]', err);
      const userMsg = err.message?.includes('row-level security')
        ? "Permission denied. Please ensure your profile is complete."
        : err.message?.includes('connection')
          ? "Network issue. Please check your connection."
          : "Failed to load matches. Please try again.";
      setFetchErr(userMsg);
      toast.error(userMsg);
    } finally {
      clearTimeout(timeoutId);
      setLoading(false);
    }
  }, [user?.id, fSkills, fInd, fStage, fLoc, fAvail]);

  // Initial load + re-rank on filter changes
  useEffect(() => {
    loadFounders();
  }, [loadFounders]);

  // Cleanup: clear timeouts on unmount
  useEffect(() => {
    return () => {
      // Any pending timeouts will be cleared by individual components
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    };
  }, []);

  const load = useCallback(async () => {
    if (!user?.id) return;

    setState({ loading: true, error: null });

    try {
      const [profileRes, studentRes, serviceCoFoundersRes, myConnectionsRes] =
        await Promise.allSettled([
          supabase
            .from('profiles')
            .select('id, full_name, avatar_url, location, bio, user_type')
            .eq('id', user.id)
            .maybeSingle(),

          supabase
            .from('student_profiles')
            .select(`
              id,
              user_id,
              university,
              degree,
              major,
              current_year,
              skills_with_levels,
              interests,
              help_needed,
              looking_for,
              commitment_level,
              has_startup_idea,
              startup_idea_description,
              idea_title,
              idea_domain,
              profile_completion
            `)
            .eq('user_id', user.id)
            .maybeSingle(),

          fetchCoFounders({
            limit: 100,
            excludeUserId: user.id,
            fresh: true,
          }),

          backendApi.getMyConnections(),
        ]);

      const profileData =
        profileRes.status === 'fulfilled' ? profileRes.value.data || {} : {};

      const studentData =
        studentRes.status === 'fulfilled' ? studentRes.value.data || {} : {};

      const currentProfile = { ...profileData, ...studentData };

      let coFounders = [];

      if (serviceCoFoundersRes.status === 'fulfilled' && Array.isArray(serviceCoFoundersRes.value)) {
        coFounders = serviceCoFoundersRes.value
          .map((candidate) => normalizeCandidate(candidate, currentProfile))
          .filter((candidate) => hasLookingFor(candidate, 'Co-Founder'));
      }

      if (!coFounders.length) {
        const { data: fallbackData, error: fallbackError } = await supabase
          .from('student_profiles')
          .select(`
            id,
            user_id,
            university,
            degree,
            major,
            current_year,
            skills_with_levels,
            interests,
            help_needed,
            looking_for,
            commitment_level,
            has_startup_idea,
            startup_idea_description,
            idea_title,
            idea_domain,
            profile_completion,
            profiles!student_profiles_user_id_fkey(
              id,
              full_name,
              avatar_url,
              location,
              bio,
              user_type
            )
          `)
          .contains('looking_for', ['Co-Founder'])
          .neq('user_id', user.id)
          .limit(100);

        if (fallbackError) throw fallbackError;

        coFounders = (fallbackData || [])
          .map((candidate) => normalizeCandidate({ ...candidate, profile_id: candidate.user_id }, currentProfile))
          .filter((candidate) => hasLookingFor(candidate, 'Co-Founder'));
      }

      coFounders = coFounders.sort((a, b) => getScore(b) - getScore(a));

      const myConnections =
        myConnectionsRes.status === 'fulfilled'
          ? myConnectionsRes.value?.data || []
          : [];

      const statusMap = {};

      myConnections.forEach((connection) => {
        if (connection.otherUser?.id) statusMap[connection.otherUser.id] = 'accepted';
      });

      setConnStatusMap(statusMap);

      setData({ profile: currentProfile, coFounders, myConnections });
      setState({ loading: false, error: null });
    } catch (err) {
      console.error('Find cofounders load failed:', err);
      setState({ loading: false, error: err.message || 'Failed to load co-founders' });
      toast.error('Failed to load co-founders');
    }
  }, [user?.id, normalizeCandidate]);

  useEffect(() => {
    load();
  }, [load]);

  const allSkills = useMemo(() => {
    const skills = new Set();

    data.coFounders.forEach((candidate) => {
      (candidate.skills_with_levels || []).forEach((skill) => {
        const name = normalizeSkill(skill);
        if (name) skills.add(name);
      });

      (candidate.skills || []).forEach((skill) => {
        const name = normalizeSkill(skill);
        if (name) skills.add(name);
      });
    });

    return ['All', ...Array.from(skills).slice(0, 14)];
  }, [data.coFounders]);

  const filtered = useMemo(() => {
    const { query, skill, commitment, matchBand } = filters;

    return (data.coFounders || [])
      .filter((candidate) => {
        const personId = getPersonId(candidate);
        if (!personId) return false;
        if (!hasLookingFor(candidate, 'Co-Founder')) return false;

        const p = normalizeProfile(candidate);
        const score = getScore(candidate);

        const skills = [
          ...(candidate.skills_with_levels || []).map(normalizeSkill),
          ...(candidate.skills || []),
          ...(p.skills || []),
        ]
          .flat()
          .map(normalizeSkill)
          .map(normalizeText)
          .filter(Boolean);

        const searchText = [
          p.full_name,
          p.bio,
          p.location,
          candidate.university,
          candidate.degree,
          candidate.major,
          candidate.current_year,
          candidate.startup_idea_description,
          candidate.idea_title,
          candidate.idea_domain,
          candidate.commitment_level,
          skills.join(' '),
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();

        const matchQuery = !query || searchText.includes(query.toLowerCase());
        const matchSkill = skill === 'All' || skills.some((item) => item.includes(skill.toLowerCase()));
        const matchCommitment = commitment === 'All' || candidate.commitment_level === commitment;
        const matchBandOk =
          matchBand === 'all' ||
          (matchBand === 'below60' && score < 60) ||
          (matchBand === '60plus' && score >= 60);

        return matchQuery && matchSkill && matchCommitment && matchBandOk;
      })
      .sort((a, b) => getScore(b) - getScore(a));
  }, [data.coFounders, filters]);

  const handleConnect = async (candidate) => {
    const targetUserId = getPersonId(candidate);
    const p = normalizeProfile(candidate);
    const name = p.full_name || 'there';

    if (!targetUserId || connecting[targetUserId]) return;

    setConnecting((prev) => ({ ...prev, [targetUserId]: true }));

<<<<<<< HEAD
    try {
      const score = getScore(candidate);

      const response = await backendApi.sendConnect(
        targetUserId,
        `Hi ${name}, our profiles match ${score}%. I’d like to explore a co-founder fit with you.`,
        'cofounder_request'
      );

      if (response.alreadyConnected || response.status === 'accepted') {
        setConnStatusMap((prev) => ({ ...prev, [targetUserId]: 'accepted' }));
        toast.success('Already connected');
        return;
      }

      setConnStatusMap((prev) => ({ ...prev, [targetUserId]: 'pending' }));

      toast.success(
        response.alreadyPending ? 'Request already pending' : 'Connection request sent',
        { style: { background: '#98DE38', color: '#000' } }
      );
    } catch (err) {
      console.error('Connect failed:', err);
      toast.error(err.message || 'Could not send request');
    } finally {
      setConnecting((prev) => ({ ...prev, [targetUserId]: false }));
    }
  };

  const handleMessage = async (targetUserId) => {
    if (!targetUserId) {
      toast.error('User ID missing');
      return;
    }

    if (connStatusMap[targetUserId] !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    try {
      const res = await backendApi.getOrCreateConversation(targetUserId);
      const convId = res.conversationId || res.id || res.data?.id;
      navigate(convId ? `/messages?conv=${convId}` : '/messages');
    } catch (err) {
      console.error('Open message failed:', err);
      toast.error('Could not open conversation');
    }
  };

  const resetFilters = () => {
    setFilters({ skill: 'All', commitment: 'All', query: '', matchBand: 'all' });
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-red-100 p-6 text-center max-w-md">
          <p className="font-bold text-red-600 mb-2">Could not load co-founders</p>
          <p className="text-sm text-gray-500 mb-4">{state.error}</p>
          <button type="button" onClick={load} className="px-4 py-2 g-brand text-black rounded-xl text-sm font-bold">
            Try again
          </button>
=======
        {/* Match Banner */}
        <div className="g-vi rounded-2xl p-5 mb-6 flex flex-col sm:flex-row items-start sm:items-center gap-4 f1">
          <div className="w-11 h-11 bg-white/20 rounded-2xl flex items-center justify-center flex-shrink-0" aria-hidden="true">
            <Sparkles className="w-5 h-5 text-white" aria-hidden="true" />
          </div>
          <div className="flex-1">
            <p className="ss font-bold text-white text-base">Smart Matching Based on Your Profile</p>
            <p className="text-violet-200 text-xs mt-0.5">Results ranked by skill complementarity and shared goals.</p>
          </div>
          <span className="bg-white/15 border border-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl flex-shrink-0" aria-live="polite">
            {filtered.length} Matches Found
          </span>
        </div>

        {/* Error */}
        {fetchErr && (
          <div className="flex items-center gap-3 bg-red-50 border border-red-100 rounded-2xl px-5 py-3 mb-6" role="alert">
            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" aria-hidden="true" />
            <p className="text-sm text-red-700 flex-1">{fetchErr}</p>
            <button onClick={loadFounders} className="flex items-center gap-1 text-xs font-bold text-red-600 hover:text-red-800 min-h-[44px]" aria-label="Retry loading">
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" /> Retry
            </button>
          </div>
        )}

        {/* Search + Sort + Refresh */}
        <div className="flex flex-col sm:flex-row gap-3 mb-5 f3">
          <div className="flex-1 flex items-center bg-white border border-slate-200 rounded-xl px-4 gap-2 shadow-sm">
            <Search className="w-4 h-4 text-slate-400 flex-shrink-0" aria-hidden="true" />
            <input
              value={query}
              onChange={e => setQuery(e.target.value)}
              placeholder="Search by skill, location, interest…"
              className="flex-1 py-3 text-sm outline-none bg-transparent text-slate-700 placeholder-slate-400 dm"
              aria-label="Search co-founders"
            />
          </div>
          <button
            onClick={() => setSbOpen(v => !v)}
            className="lg:hidden flex items-center gap-2 bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-600 shadow-sm min-h-[44px]"
            aria-expanded={sbOpen}
            aria-controls="filters-sidebar"
            aria-label="Toggle filters"
          >
            <Filter className="w-4 h-4" aria-hidden="true" /> Filters
            {activeN > 0 && <span className="g-vi text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">{activeN}</span>}
          </button>
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-white border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-700 outline-none shadow-sm dm min-h-[44px]"
            aria-label="Sort by"
          >
            <option value="match">Best Match</option>
            <option value="skills">Most Skills</option>
            <option value="name">Alphabetical</option>
          </select>
          <button
            onClick={loadFounders}
            className="flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 transition-colors px-3 py-2 rounded-xl border border-violet-200 bg-violet-50 hover:bg-violet-100 min-h-[44px]"
            title="Refresh matches based on your updated profile"
            aria-label="Refresh matches"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} aria-hidden="true" />
            Refresh
          </button>
        </div>

        <p className="text-sm text-slate-500 mb-5" aria-live="polite">
          Showing <span className="font-bold text-slate-900">{filtered.length}</span> co-founder{filtered.length !== 1 ? 's' : ''}
          {activeN > 0 && <span className="text-violet-600 font-medium"> · {activeN} filter{activeN > 1 ? 's' : ''} active</span>}
        </p>

        <div className="flex gap-7 items-start">
          {/* Sidebar - Mobile: toggle, Desktop: sticky */}
          <aside
            id="filters-sidebar"
            className={`w-60 flex-shrink-0 bg-white rounded-2xl border border-slate-100 shadow-sm p-5 ${sbOpen ? 'block' : 'hidden'} lg:block lg:sticky lg:top-24`}
            aria-label="Filters"
          >
            <div className="flex items-center justify-between mb-5">
              <p className="ss font-bold text-slate-900 text-sm">Filters</p>
              {activeN > 0 && <button onClick={clearAll} className="text-xs text-red-500 font-semibold hover:text-red-600 transition-colors">Clear all</button>}
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {F_SKILLS.map(v => (
                  <Chip
                    key={v}
                    label={v}
                    on={fSkills.includes(v)}
                    onClick={() => togArr(fSkills, setFSkills, v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Industry</p>
              <div className="space-y-2">
                {F_IND.slice(0, 6).map(v => (
                  <CheckRow
                    key={v}
                    label={v}
                    checked={fInd.includes(v)}
                    onClick={() => togArr(fInd, setFInd, v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Startup Stage</p>
              <div className="space-y-2">
                {F_STAGE.map(v => (
                  <RadioRow
                    key={v}
                    label={v}
                    checked={fStage === v}
                    onClick={() => setFStage(p => p === v ? '' : v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Location</p>
              <div className="flex flex-wrap gap-1.5">
                {F_LOC.map(v => (
                  <Chip
                    key={v}
                    label={v}
                    on={fLoc.includes(v)}
                    onClick={() => togArr(fLoc, setFLoc, v)}
                  />
                ))}
              </div>
            </div>
            <div className="filter-sec">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Availability</p>
              <div className="space-y-2">
                {F_AVAIL.map(v => (
                  <RadioRow
                    key={v}
                    label={v}
                    checked={fAvail === v}
                    onClick={() => setFAvail(p => p === v ? '' : v)}
                  />
                ))}
              </div>
            </div>
          </aside>

          {/* Cards */}
          <main className="flex-1 min-w-0 space-y-4" aria-label="Co-founder results">
            {loading ? (
              // Skeleton loading states
              <>
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
                <div className="shimmer h-48 rounded-2xl" />
              </>
            ) : filtered.length === 0 ? (
              // Empty state with CTAs
              <div className="bg-white rounded-2xl p-12 text-center border border-slate-100">
                <div className="w-16 h-16 bg-violet-50 rounded-full flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                  <Users className="w-8 h-8 text-violet-500" aria-hidden="true" />
                </div>
                <p className="ss font-bold text-slate-700 mb-2 text-lg">No co-founders match your filters</p>
                <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto">
                  {founders.length === 0
                    ? "You're the only student looking for a co-founder right now. Complete your profile to appear in others' searches!"
                    : "Try broadening your filters or check back later as more students join."}
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center">
                  <button
                    onClick={clearAll}
                    className="px-5 py-2.5 bg-violet-600 text-white rounded-xl font-semibold hover:bg-violet-700 transition-all min-h-[44px]"
                  >
                    Clear Filters
                  </button>
                  <button
                    onClick={() => navigate('/profile')}
                    className="px-5 py-2.5 border-2 border-violet-200 text-violet-700 rounded-xl font-semibold hover:bg-violet-50 transition-all min-h-[44px]"
                  >
                    Complete My Profile
                  </button>
                </div>
              </div>
            ) : (
              // Results list
              filtered.map((cf, idx) => (
                <CoFounderCard
                  key={cf.id}
                  cf={cf}
                  userProfile={studentProfile} // 🔧 CHANGED: Pass for AI explanations
                  onView={handleView}
                  onConnect={handleConnect}
                  onMessage={handleMessage}
                  onSave={handleSave}
                  isSaved={saved.has(cf.id)}
                />
              ))
            )}
          </main>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
        </div>
      </div>
    );
  }

  const totalCandidates = (data.coFounders || []).filter((candidate) => {
    const id = getPersonId(candidate);
    return id && hasLookingFor(candidate, 'Co-Founder');
  }).length;

  const below60Count = (data.coFounders || []).filter((candidate) => {
    const id = getPersonId(candidate);
    return id && hasLookingFor(candidate, 'Co-Founder') && getScore(candidate) < 60;
  }).length;

  const strongCount = (data.coFounders || []).filter((candidate) => {
    const id = getPersonId(candidate);
    return id && hasLookingFor(candidate, 'Co-Founder') && getScore(candidate) >= 60;
  }).length;

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-green-50 text-green-700 border border-green-200">
              <Users className="w-3.5" />
              Find Co-Founders
            </span>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Build Together</h1>
                <p className="text-gray-500 text-sm max-w-xl mt-2">
                  Explore students who selected Co-Founder in Looking For. Best 60%+ matches appear on your dashboard.
                </p>
              </div>

              <Link
                to="/profile"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Improve Matching
                <ArrowRight className="w-4" />
              </Link>
            </div>
          </header>

          <section className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Available co-founder candidates</p>
              <p className="text-2xl font-black text-gray-900">{totalCandidates}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Explore matches below 60%</p>
              <p className="text-2xl font-black text-gray-900">{below60Count}</p>
            </div>

            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Strong matches 60%+</p>
              <p className="text-2xl font-black text-gray-900">{strongCount}</p>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 text-gray-400" />

              <input
                type="text"
                value={filters.query}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Search by name, skill, university, idea…"
                className="flex-1 outline-none text-sm"
                aria-label="Search co-founders"
              />

              {filters.query && (
                <button
                  type="button"
                  onClick={() => setFilters((prev) => ({ ...prev, query: '' }))}
                  className="p-1 hover:bg-gray-100 rounded"
                  aria-label="Clear search"
                >
                  <X className="w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-4 gap-3 mt-4">
              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Match band</label>
                <select
                  value={filters.matchBand}
                  onChange={(event) => setFilters((prev) => ({ ...prev, matchBand: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="all">All matches</option>
                  <option value="60plus">60%+</option>
                  <option value="below60">Below 60%</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Skill</label>
                <select
                  value={filters.skill}
                  onChange={(event) => setFilters((prev) => ({ ...prev, skill: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  {allSkills.map((skill) => (
                    <option key={skill} value={skill}>{skill}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 mb-1 block">Commitment</label>
                <select
                  value={filters.commitment}
                  onChange={(event) => setFilters((prev) => ({ ...prev, commitment: event.target.value }))}
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
                >
                  <option value="All">All</option>
                  <option value="Exploring">Exploring</option>
                  <option value="Casual (2–5 hrs/week)">Casual (2–5 hrs/week)</option>
                  <option value="Serious (5–15 hrs/week)">Serious (5–15 hrs/week)</option>
                  <option value="Full-time (15–30 hrs/week)">Full-time (15–30 hrs/week)</option>
                </select>
              </div>

              <div className="flex items-end">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="w-full py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"
                >
                  <SlidersHorizontal className="w-4" />
                  Reset
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{filtered.length}</span> results
            </p>
            <p className="text-xs text-gray-400">Message unlocks after accepted connection.</p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4" aria-live="polite">
              {filtered.map((candidate) => {
                const id = getPersonId(candidate);
                return (
                  <CoFounderCard
                    key={id || candidate.id}
                    candidate={candidate}
                    currentUserProfile={data.profile}
                    connectionStatus={connStatusMap[id]}
                    connecting={connecting[id]}
                    onConnect={handleConnect}
                    onMessage={handleMessage}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
              <div className="w-14 h-14 rounded-full bg-gray-50 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-6 text-gray-400" />
              </div>
              <p className="font-bold text-gray-800">No co-founders match your filters.</p>
              <p className="text-sm text-gray-500 mt-1">Try changing match band, skill, or search query.</p>
              <button type="button" onClick={resetFilters} className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black">
                Clear filters
              </button>
            </div>
          )}

          <aside className="mt-8 bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 text-[#1B2D7F]" />
              Matching tip
            </h3>

            <p className="text-sm text-gray-600">
              Add skills, help-needed fields, commitment level, startup idea details, and interests to improve AI matching quality.
            </p>

            <Link to="/profile" className="inline-flex items-center gap-1 text-xs font-bold text-indigo-600 mt-3 hover:underline">
              Edit Profile <ArrowRight className="w-3" />
            </Link>
          </aside>
        </div>
      </div>
    </>
  );
}
