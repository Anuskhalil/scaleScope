// src/pages/EarlyStageFoundeRolerPages/FounderProfile.jsx
// Founder Profile — Student Profile style/design, Founder-specific data + smart suggestions

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../../components/landing-page/RoleNavbar';
import AIProfileQualityChecker from '../../components/AIProfileQualityChecker';
import {
  User,
  Rocket,
  Briefcase,
  Trash2,
  Save,
  AlertTriangle,
  Edit3,
  MapPin,
  Mail,
  Link as LinkIcon,
  Camera,
  Loader,
  Github,
  Twitter,
  Linkedin,
  X,
  Tag,
  Shield,
  Users,
  DollarSign,
  Lightbulb,
  Heart,
  Sparkles,
  Clock,
  Target,
  TrendingUp,
  Globe,
  FileText,
  Building2,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchFounderProfile,
  saveFounderBaseProfile,
  saveFounderStartupProfile,
  uploadFounderAvatar,
  resolveAvatarUrl,
} from '../../services/founderService';

// 🎨 SAME BRAND STYLES AS STUDENT PROFILE
const STYLES = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --white: #fff;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }

  .ss { font-family: 'Syne', sans-serif; }
  .dm { font-family: 'DM Sans', sans-serif; }

  .lift {
    transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease;
  }

  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(27,45,127,.12);
  }

  .g-brand {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  }

  .g-sec {
    background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
  }

  .prog {
    background: linear-gradient(90deg, var(--primary), var(--primary-dark));
    transition: width .4s ease;
  }

  .inp {
    width: 100%;
    padding: 10px 14px;
    background: var(--gray-50);
    border: 2px solid var(--gray-200);
    border-radius: 12px;
    font-size: 14px;
    outline: none;
    transition: border-color .15s;
    font-family: 'DM Sans', sans-serif;
  }

  .inp:focus {
    border-color: var(--primary);
    background: var(--white);
  }

  .sel {
    width: 100%;
    padding: 10px 36px 10px 14px;
    background: var(--gray-50);
    border: 2px solid var(--gray-200);
    border-radius: 12px;
    font-size: 14px;
    outline: none;
    appearance: none;
    transition: border-color .15s;
    font-family: 'DM Sans', sans-serif;
  }

  .sel:focus {
    border-color: var(--primary);
    background: var(--white);
  }

  .ta {
    width: 100%;
    padding: 10px 14px;
    background: var(--gray-50);
    border: 2px solid var(--gray-200);
    border-radius: 12px;
    font-size: 14px;
    outline: none;
    resize: none;
    transition: border-color .15s;
    font-family: 'DM Sans', sans-serif;
  }

  .ta:focus {
    border-color: var(--primary);
    background: var(--white);
  }

  .sec-label {
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: .06em;
    color: var(--secondary);
    display: flex;
    align-items: center;
    gap: 6px;
    margin-bottom: 16px;
  }

  .fade-in {
    animation: fi .3s ease both;
  }

  @keyframes fi {
    from { opacity:0; transform:translateY(10px); }
    to { opacity:1; transform:none; }
  }

  button:focus-visible,
  .inp:focus-visible,
  .sel:focus-visible,
  .ta:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  @keyframes fadeIn {
    from { opacity: 0; transform: translateY(8px); }
    to { opacity: 1; transform: none; }
  }

  .animate-fadeIn {
    animation: fadeIn 0.3s ease-out both;
  }

  .line-clamp-4 {
    display: -webkit-box;
    -webkit-line-clamp: 4;
    -webkit-box-orient: vertical;
    overflow: hidden;
  }

  .chip {
    padding: 8px 12px;
    border-radius: 999px;
    border: 2px solid #e5e7eb;
    background: white;
    color: #4b5563;
    font-size: 12px;
    font-weight: 700;
    transition: all .15s ease;
  }

  .chip:hover {
    border-color: #98DE38;
  }

  .chip.selected {
    border-color: #98DE38;
    background: rgba(152,222,56,.12);
    color: #1B2D7F;
  }
`;

// 📊 CONSTANTS
const INDUSTRIES = [
  'EdTech',
  'HealthTech',
  'FinTech',
  'SaaS',
  'AgriTech',
  'CleanTech',
  'LegalTech',
  'HRTech',
  'E-commerce',
  'AI / ML',
  'Social Impact',
  'Gaming',
  'Other',
];

const STARTUP_STAGES = [
  'Just an Idea',
  'Wireframes',
  'Prototype',
  'Researching',
  'Building MVP',
  'MVP Built',
  'Live Product',
  'Growing',
  'Revenue',
];
const TRACTION_READY_STAGES = ['MVP Built', 'Live Product', 'Growing', 'Revenue'];
const SHOW_LEGACY_FOUNDER_FIELDS = false;

const FUNDING_STAGES = [
  'Bootstrapped',
  'Pre-seed',
  'Seed',
  'Series A',
  'Series B+',
];

const REVENUE_MODELS = [
  'Subscription',
  'B2B SaaS',
  'Freemium',
  'Commission / Marketplace',
  'Advertising',
  'Usage-Based',
  'One-time Purchase',
  'Other',
];

const VALIDATION_STATUS = [
  'Not validated yet',
  'Talking to users',
  'Problem validated',
  'Solution validated',
  'MVP tested',
  'Paying customers',
];

const PRODUCT_STATUS = [
  'Idea only',
  'Wireframes',
  'Prototype',
  'MVP in development',
  'MVP launched',
  'Live product',
];

const FOUNDER_ROLES = [
  'Solo Founder',
  'Technical Founder',
  'Business Founder',
  'Product Founder',
  'Marketing/Growth Founder',
  'Domain Expert Founder',
];

const FOUNDER_COMMITMENT = [
  'Exploring',
  'Part-time',
  'Serious part-time',
  'Full-time',
];

const WEEKLY_HOURS = [
  '2–5 hrs/week',
  '5–10 hrs/week',
  '10–20 hrs/week',
  '20–40 hrs/week',
  '40+ hrs/week',
];

const LOOKING_FOR_OPTS = [
  { val: 'Co-Founder', icon: '👥', desc: 'Build together' },
  { val: 'Developer', icon: '💻', desc: 'Tech talent' },
  { val: 'Designer', icon: '🎨', desc: 'Product design' },
  { val: 'Marketer', icon: '📣', desc: 'Growth help' },
  { val: 'Mentor', icon: '🧠', desc: 'Guidance' },
  { val: 'Investor', icon: '💰', desc: 'Funding' },
];

const HELP_NEEDED_CHIPS = [
  'Product Strategy',
  'Technical / Dev',
  'Design / UX',
  'Marketing',
  'Fundraising',
  'Pitch Deck Review',
  'Market Research',
  'User Research',
  'Legal',
  'Operations',
  'Sales',
  'Hiring / Team Building',
  'Business Model',
];

const SKILLS_NEEDED_CHIPS = [
  'React / Frontend',
  'Node.js / Backend',
  'Python',
  'AI / ML',
  'Mobile App Dev',
  'UI/UX Design',
  'Growth Marketing',
  'Sales',
  'Finance / CFO',
  'Legal',
  'Content / SEO',
  'Data Science',
];

const FOUNDER_SKILL_CHIPS = [
  'Product Strategy',
  'Business Strategy',
  'Sales',
  'Marketing',
  'Technical / Dev',
  'AI / ML',
  'Fundraising',
  'Operations',
  'Design / UI-UX',
  'Leadership',
  'Finance',
  'Data Analysis',
];

const TECH_STACK_CHIPS = [
  'React',
  'Node.js',
  'Python',
  'Supabase',
  'PostgreSQL',
  'Firebase',
  'Flutter',
  'React Native',
  'AI / ML',
  'No-code',
  'Figma',
  'AWS',
];

const HIRING_ROLE_CHIPS = [
  'Technical Co-Founder',
  'Frontend Developer',
  'Backend Developer',
  'Mobile Developer',
  'UI/UX Designer',
  'Growth Marketer',
  'Sales Lead',
  'Operations Lead',
  'Finance / CFO',
  'Content Creator',
];
const EXTRA_LOOKING_FOR_OPTS = [
  { val: 'Sales Lead', icon: 'S', desc: 'Revenue support' },
  { val: 'Advisor', icon: 'A', desc: 'Strategic support' },
  { val: 'Operations Lead', icon: 'O', desc: 'Execution support' },
];

const KEY_RISK_CHIPS = [
  'Technical risk',
  'Market risk',
  'Legal/compliance risk',
  'Customer acquisition risk',
  'Funding risk',
  'Competition risk',
  'Team risk',
  'Pricing risk',
];
const LEGAL_STATUS_OPTS = ['Not registered yet', 'Sole proprietor', 'Private limited', 'LLC / C-Corp', 'Partnership', 'Non-profit', 'Other'];
const INVESTMENT_READINESS_OPTS = ['Not raising yet', 'Preparing materials', 'Ready for intro', 'Actively raising', 'Committed round'];
const COFOUNDER_STATUS_OPTS = ['Solo founder', 'Has co-founder', 'Looking for co-founder', 'Team formed', 'Open to advisory co-founder'];

const makeEmpty = (user) => ({
  // profiles
  id: null,
  user_id: user?.id || '',
  full_name: '',
  email: user?.email || '',
  user_type: 'early-stage-founder',
  location: '',
  bio: '',
  avatar_url: '',
  linkedin_url: '',
  github_url: '',
  twitter_url: '',
  founder_skills: [],

  // founder_profiles
  company_name: '',
  idea_title: '',
  industry: '',
  startup_stage: '',
  company_stage: '',
  problem_solving: '',
  problem_statement: '',
  unique_value_proposition: '',
  target_market: '',
  target_audience: '',
  solution_description: '',
  revenue_model: '',
  competitors: '',
  launch_timeline: '',
  team_size: 1,
  funding_raised: '',
  funding_stage: '',
  founding_year: '',
  pitch_deck_url: '',
  demo_url: '',
  website_url: '',
  startup_location: '',
  legal_status: '',
  monthly_revenue: '',
  active_users: '',
  customer_count: '',
  incubator_or_accelerator: '',
  pitch_video_url: '',
  investment_readiness: '',
  cofounder_status: '',
  looking_for: [],
  help_needed: [],
  skills_needed: [],
  profile_completion: 0,
  onboarding_completed: false,
  is_public: true,
  is_active: true,
  created_at: '',
  updated_at: '',
  metadata: {},

  // enhanced founder profile fields
  founder_role: '',
  commitment_level: '',
  weekly_hours: '',

  validation_status: '',
  customer_validation: '',
  traction_summary: '',
  traction_metrics: {},

  business_model_details: '',
  go_to_market_strategy: '',
  current_challenges: '',

  hiring_roles: [],
  equity_available: '',
  cofounder_requirements: '',

  ask_amount: '',
  use_of_funds: '',
  milestones_next_6_months: '',

  market_size: '',
  product_status: '',
  tech_stack: [],
  key_risks: [],
});

const safeArray = (v) => (Array.isArray(v) ? v : []);
const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

function calcFounderCompletionWithBreakdown(f) {
  const checks = [
    { field: 'full_name', condition: (f.full_name || '').trim().length > 1, points: 6, label: 'Full name' },
    { field: 'bio', condition: (f.bio || '').trim().length > 20, points: 6, label: 'Founder bio' },
    { field: 'location', condition: (f.location || '').trim().length > 1, points: 3, label: 'Location' },
    { field: 'avatar', condition: !!f.avatar_url, points: 5, label: 'Profile photo' },
    { field: 'linkedin', condition: !!f.linkedin_url, points: 4, label: 'LinkedIn profile' },
    {
      field: 'founder_skills',
      condition: safeArray(f.founder_skills).length >= 3,
      points: 5,
      label: '3+ founder skills',
    },
    { field: 'startup_name', condition: !!(f.company_name || f.idea_title), points: 7, label: 'Startup name / idea title' },
    { field: 'industry', condition: !!f.industry, points: 5, label: 'Industry' },
    { field: 'stage', condition: !!f.startup_stage, points: 5, label: 'Startup stage' },
    { field: 'stage_proof', condition: !!f.startup_stage, points: 4, label: 'Startup stage proof' },
    { field: 'startup_location', condition: !!f.startup_location, points: 3, label: 'Startup location' },
    { field: 'investment_readiness', condition: !!f.investment_readiness, points: 3, label: 'Investment readiness' },
    { field: 'validation_status', condition: !!f.validation_status, points: 5, label: 'Validation status' },
    { field: 'problem', condition: (f.problem_solving || f.problem_statement || '').trim().length > 20, points: 8, label: 'Problem statement' },
    { field: 'uvp', condition: (f.unique_value_proposition || '').trim().length > 10, points: 6, label: 'Unique value' },
    { field: 'target_market', condition: (f.target_market || '').trim().length > 5, points: 4, label: 'Target market' },
    { field: 'gtm', condition: (f.go_to_market_strategy || '').trim().length > 10, points: 5, label: 'Go-to-market strategy' },
    { field: 'challenges', condition: (f.current_challenges || '').trim().length > 10, points: 4, label: 'Current challenges' },
    { field: 'looking_for', condition: safeArray(f.looking_for).length > 0, points: 4, label: 'Looking for' },
    { field: 'help_needed', condition: safeArray(f.help_needed).length > 0, points: 4, label: 'Help needed' },
    { field: 'pitch_deck', condition: !!f.pitch_deck_url, points: 4, label: 'Pitch deck' },
  ];

  const earned = checks.filter((c) => c.condition).reduce((sum, c) => sum + c.points, 0);
  const total = checks.reduce((sum, c) => sum + c.points, 0);
  const missing = checks.filter((c) => !c.condition).slice(0, 3);

  return {
    percentage: Math.min(Math.round((earned / total) * 100), 100),
    missing,
    all: checks,
  };
}

function getFounderQualityChecks(f) {
  const stageProof = getFounderStageProof(f.startup_stage);
  const stageProofValue = f.metadata?.[stageProof.key] || '';
  const stageProofOk =
    !f.startup_stage ||
    Boolean(stageProofValue) ||
    Boolean(f.demo_url && ['mvp_url', 'live_product_url'].includes(stageProof.key));

  const required = [
    { field: 'full_name', condition: (f.full_name || '').trim().length > 1, label: 'Full name' },
    { field: 'bio', condition: (f.bio || '').trim().length > 20, label: 'Founder bio with at least 20 characters' },
    { field: 'location', condition: (f.location || '').trim().length > 1, label: 'City / country' },
    { field: 'founder_skills', condition: safeArray(f.founder_skills).length >= 3, label: 'At least 3 founder skills' },
    { field: 'startup_name', condition: !!(f.company_name || f.idea_title), label: 'Startup name or idea title' },
    { field: 'industry', condition: !!f.industry, label: 'Startup industry' },
    { field: 'stage', condition: !!f.startup_stage, label: 'Startup stage' },
    { field: 'stage_proof', condition: stageProofOk, label: 'Startup stage verification proof' },
    { field: 'problem', condition: (f.problem_solving || f.problem_statement || '').trim().length > 30, label: 'Problem statement with at least 30 characters' },
    { field: 'target_market', condition: (f.target_market || '').trim().length > 5, label: 'Target market' },
    { field: 'looking_for', condition: safeArray(f.looking_for).length > 0, label: 'Looking for preference' },
    { field: 'help_needed', condition: safeArray(f.help_needed).length > 0, label: 'Help needed areas' },
  ];

  const recommended = calcFounderCompletionWithBreakdown(f).all.filter((item) => {
    return !required.some((req) => req.field === item.field);
  });

  return { required, recommended };
}

const generateFounderHelpSuggestions = (form) => {
  const suggestions = new Set();

  const text = [
    form.industry,
    form.startup_stage,
    form.product_status,
    form.problem_solving,
    form.problem_statement,
    form.solution_description,
    form.unique_value_proposition,
    form.target_market,
    form.revenue_model,
    form.business_model_details,
    form.go_to_market_strategy,
    form.current_challenges,
    form.validation_status,
    form.funding_stage,
    safeArray(form.key_risks).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const add = (...items) => items.forEach((item) => suggestions.add(item));

  if (/mvp|prototype|product|build|technical|platform|app|software|ai|ml|machine learning|automation/.test(text)) {
    add('Technical / Dev', 'Product Strategy');
  }

  if (/design|ui|ux|prototype|wireframe|user experience|interface/.test(text)) {
    add('Design / UX');
  }

  if (/market|customer|audience|users|validation|research|problem validated|talking to users/.test(text)) {
    add('Market Research', 'User Research');
  }

  if (/growth|marketing|acquisition|seo|content|social|brand|go.to.market|go to market/.test(text)) {
    add('Marketing', 'Sales');
  }

  if (/fund|investment|investor|pre-seed|seed|pitch|deck|runway/.test(text)) {
    add('Fundraising', 'Pitch Deck Review');
  }

  if (/legal|compliance|fintech|health|healthtech|insurance|payment|data privacy/.test(text)) {
    add('Legal');
  }

  if (/business model|revenue|pricing|monetize|subscription|commission/.test(text)) {
    add('Business Model', 'Product Strategy');
  }

  if (/team|co-founder|cofounder|hire|hiring|recruit/.test(text)) {
    add('Hiring / Team Building');
  }

  if (/operations|process|delivery|supply|logistics/.test(text)) {
    add('Operations');
  }

  if (suggestions.size === 0 && text.length > 30) {
    add('Product Strategy', 'Market Research', 'Mentorship');
  }

  return Array.from(suggestions).slice(0, 6);
};

const generateFounderSkillSuggestions = (form) => {
  const suggestions = new Set();

  const text = [
    form.industry,
    form.idea_title,
    form.problem_solving,
    form.solution_description,
    form.product_status,
    safeArray(form.tech_stack).join(' '),
    form.current_challenges,
    safeArray(form.hiring_roles).join(' '),
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  const add = (...items) => items.forEach((item) => suggestions.add(item));

  if (/react|frontend|web|dashboard|saas|platform|marketplace/.test(text)) {
    add('React / Frontend');
  }

  if (/backend|api|database|server|node|supabase|postgres|platform|saas/.test(text)) {
    add('Node.js / Backend');
  }

  if (/ai|ml|machine learning|recommendation|automation|chatbot|analytics|data/.test(text)) {
    add('AI / ML', 'Data Science');
  }

  if (/mobile|android|ios|app/.test(text)) {
    add('Mobile App Dev');
  }

  if (/design|ui|ux|prototype|wireframe/.test(text)) {
    add('UI/UX Design');
  }

  if (/growth|marketing|seo|content|brand|acquisition/.test(text)) {
    add('Growth Marketing', 'Content / SEO');
  }

  if (/sales|b2b|enterprise|customer/.test(text)) {
    add('Sales');
  }

  if (/fund|investor|finance|pricing|revenue/.test(text)) {
    add('Finance / CFO');
  }

  if (/legal|compliance|fintech|healthtech|privacy/.test(text)) {
    add('Legal');
  }

  if (suggestions.size === 0 && text.length > 30) {
    add('React / Frontend', 'Growth Marketing', 'UI/UX Design');
  }

  return Array.from(suggestions).slice(0, 6);
};

const shouldShowTractionFunding = (stage) => TRACTION_READY_STAGES.includes(stage);

const getFounderStageProof = (stage) => {
  const map = {
    'Just an Idea': { key: 'idea_research_url', label: 'Upload idea research / concept deck', accept: '.pdf,.ppt,.pptx,.doc,.docx' },
    Wireframes: { key: 'wireframe_url', label: 'Upload wireframes or prototype screenshots', accept: '.pdf,.ppt,.pptx,.png,.jpg,.jpeg' },
    Prototype: { key: 'prototype_url', label: 'Upload prototype file or add demo link', accept: '.pdf,.ppt,.pptx,.png,.jpg,.jpeg' },
    Researching: { key: 'research_validation_url', label: 'Upload research / validation notes', accept: '.pdf,.doc,.docx,.csv,.xlsx' },
    'Building MVP': { key: 'mvp_progress_url', label: 'Upload MVP progress proof', accept: '.pdf,.ppt,.pptx,.png,.jpg,.jpeg' },
    'MVP Built': { key: 'mvp_url', label: 'MVP website or demo link', accept: '' },
    'Live Product': { key: 'live_product_url', label: 'Live product URL', accept: '' },
    Growing: { key: 'traction_proof_url', label: 'Upload traction proof', accept: '.pdf,.ppt,.pptx,.csv,.xlsx,.png,.jpg,.jpeg' },
    Revenue: { key: 'revenue_proof_url', label: 'Upload revenue proof', accept: '.pdf,.csv,.xlsx,.png,.jpg,.jpeg' },
  };

  return map[stage] || map['Just an Idea'];
};

const getLinkStatus = (url) => {
  if (!url) return 'Not added';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? 'Format verified' : 'Invalid protocol';
  } catch {
    return 'Invalid URL';
  }
};

function initials(name) {
  return (name || 'F')
    .split(' ')
    .filter(Boolean)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

// ✅ MAIN COMPONENT
export default function FounderProfile() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const snapRef = useRef(null);
  const saveTimerRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [isEditMode, setIsEditMode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState('');

  const [formData, setFormData] = useState(makeEmpty(user));
  const [skillInput, setSkillInput] = useState('');

  const STORAGE_KEY = `founder_profile_draft_${user?.id || 'anon'}`;
  const SESSION_KEY = `founder_profile_session_${user?.id || 'anon'}`;

  const saveDraft = useCallback((data) => {
    try {
      const draft = {
        ...data,
        _savedAt: Date.now(),
        _userId: user?.id,
        _isDraft: true,
        _hasUnsavedChanges: true,
      };

      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
    } catch (e) {
      console.warn('Founder draft save failed:', e);
    }
  }, [user?.id, STORAGE_KEY, SESSION_KEY]);

  const loadDraft = useCallback(() => {
    try {
      const sessionRaw = sessionStorage.getItem(SESSION_KEY);
      if (sessionRaw) {
        const sessionDraft = JSON.parse(sessionRaw);
        if (sessionDraft._userId === user?.id) return sessionDraft;
      }

      const localRaw = localStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        const localDraft = JSON.parse(localRaw);

        if (
          localDraft._userId === user?.id &&
          Date.now() - localDraft._savedAt < 7 * 24 * 60 * 60 * 1000
        ) {
          return localDraft;
        }

        localStorage.removeItem(STORAGE_KEY);
      }

      return null;
    } catch (e) {
      console.warn('Founder draft load failed:', e);
      return null;
    }
  }, [user?.id, STORAGE_KEY, SESSION_KEY]);

  const clearDraft = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(SESSION_KEY);
    } catch {
      return;
    }
  }, [STORAGE_KEY, SESSION_KEY]);

  useEffect(() => {
    if (isEditMode && formData.full_name) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);

      saveTimerRef.current = setTimeout(() => {
        saveDraft(formData);
        setHasUnsavedChanges(true);
      }, 150);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData, isEditMode, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEditMode && hasUnsavedChanges) {
        try {
          const draft = {
            ...formData,
            _savedAt: Date.now(),
            _userId: user?.id,
            _isDraft: true,
            _hasUnsavedChanges: true,
          };

          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
        } catch (err) {
          console.warn('Founder draft save on unload failed:', err);
        }

        e.preventDefault();
        e.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditMode, hasUnsavedChanges, formData, user?.id, STORAGE_KEY, SESSION_KEY]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);
    setSaveError('');

    try {
      const draft = loadDraft();
      const { profile, founderProfile } = await fetchFounderProfile(user.id);

      const pd = profile || {};
      const fp = founderProfile || {};

      const dbUpdatedAt = new Date(pd?.updated_at || fp?.updated_at || 0).getTime();
      const draftUpdatedAt = draft?._savedAt || 0;
      const useDraft = draft && draft._userId === user.id && draftUpdatedAt >= dbUpdatedAt;

      const source = useDraft ? { ...pd, ...fp, ...draft } : { ...pd, ...fp };

      const normalized = {
        ...makeEmpty(user),

        id: source.id || null,
        user_id: source.user_id || user?.id || '',
        full_name: source.full_name || '',
        email: source.email || user.email || '',
        user_type: source.user_type || 'early-stage-founder',
        location: source.location || '',
        bio: source.bio || '',
        avatar_url: source.avatar_url || '',
        linkedin_url: source.linkedin_url || '',
        github_url: source.github_url || '',
        twitter_url: source.twitter_url || '',
        founder_skills: safeArray(source.founder_skills).length
          ? safeArray(source.founder_skills)
          : safeArray(source.skills),

        company_name: source.company_name || '',
        idea_title: source.idea_title || '',
        industry: source.industry || '',
        startup_stage: source.startup_stage || source.company_stage || '',
        company_stage: source.company_stage || source.startup_stage || '',
        problem_solving: source.problem_solving || source.problem_statement || '',
        problem_statement: source.problem_statement || source.problem_solving || '',
        unique_value_proposition: source.unique_value_proposition || '',
        target_market: source.target_market || source.target_audience || '',
        target_audience: source.target_audience || source.target_market || '',
        solution_description: source.solution_description || '',
        revenue_model: source.revenue_model || '',
        competitors: source.competitors || '',
        launch_timeline: source.launch_timeline || '',
        team_size: source.team_size || 1,
        funding_raised:
          source.funding_raised === null || source.funding_raised === undefined
            ? ''
            : String(source.funding_raised),
        funding_stage: source.funding_stage || '',
        founding_year:
          source.founding_year === null || source.founding_year === undefined
            ? ''
            : String(source.founding_year),
        pitch_deck_url: source.pitch_deck_url || '',
        demo_url: source.demo_url || '',
        website_url: source.website_url || '',
        startup_location: source.startup_location || '',
        legal_status: source.legal_status || '',
        monthly_revenue: source.monthly_revenue === null || source.monthly_revenue === undefined ? '' : String(source.monthly_revenue),
        active_users: source.active_users === null || source.active_users === undefined ? '' : String(source.active_users),
        customer_count: source.customer_count === null || source.customer_count === undefined ? '' : String(source.customer_count),
        incubator_or_accelerator: source.incubator_or_accelerator || '',
        pitch_video_url: source.pitch_video_url || '',
        investment_readiness: source.investment_readiness || '',
        cofounder_status: source.cofounder_status || '',
        looking_for: safeArray(source.looking_for),
        help_needed: safeArray(source.help_needed),
        skills_needed: safeArray(source.skills_needed),
        profile_completion: source.profile_completion || 0,
        onboarding_completed: source.onboarding_completed || false,
        is_public: source.is_public !== false,
        is_active: source.is_active !== false,
        created_at: source.created_at || '',
        updated_at: source.updated_at || '',

        founder_role: source.founder_role || '',
        commitment_level: source.commitment_level || '',
        weekly_hours: source.weekly_hours || '',

        validation_status: source.validation_status || '',
        customer_validation: source.customer_validation || '',
        traction_summary: source.traction_summary || '',
        traction_metrics: source.traction_metrics || {},

        business_model_details: source.business_model_details || '',
        go_to_market_strategy: source.go_to_market_strategy || '',
        current_challenges: source.current_challenges || '',

        hiring_roles: safeArray(source.hiring_roles),
        equity_available: source.equity_available || '',
        cofounder_requirements: source.cofounder_requirements || '',

        ask_amount: source.ask_amount || '',
        use_of_funds: source.use_of_funds || '',
        milestones_next_6_months: source.milestones_next_6_months || '',

        market_size: source.market_size || '',
        product_status: source.product_status || '',
        tech_stack: safeArray(source.tech_stack),
        key_risks: safeArray(source.key_risks),
        metadata: source.metadata || {},
      };

      snapRef.current = normalized;
      setFormData(normalized);

      const signedAvatar = await resolveAvatarUrl(normalized.avatar_url);
      setAvatarPreviewUrl(signedAvatar);

      const shouldStayInEditMode = useDraft && draft?._hasUnsavedChanges;
      const hasFounderProfile =
        Boolean(fp?.id || fp?.user_id) ||
        Boolean(normalized.company_name || normalized.idea_title || normalized.problem_solving);

      setIsEditMode(shouldStayInEditMode || !hasFounderProfile);
      setHasUnsavedChanges(shouldStayInEditMode);

      if (shouldStayInEditMode) {
        toast('Unsaved founder changes restored', {
          icon: '♻️',
          duration: 3000,
          style: { background: '#1B2D7F', color: '#fff' },
        });
      }
    } catch (err) {
      console.error('Founder profile load error:', err);
      toast.error('Failed to load founder profile');
      setIsEditMode(true);
      setHasUnsavedChanges(true);
    } finally {
      setLoading(false);
    }
  }, [user, loadDraft]);

  useEffect(() => {
    if (user) loadProfile();
  }, [user, loadProfile]);

  const updateField = useCallback((key, value) => {
    setFormData((prev) => {
      setHasUnsavedChanges(true);
      return { ...prev, [key]: value };
    });
  }, []);

  const toggleArrayField = (field, value) => {
    setFormData((prev) => {
      const arr = safeArray(prev[field]);

      setHasUnsavedChanges(true);

      return {
        ...prev,
        [field]: arr.includes(value)
          ? arr.filter((item) => item !== value)
          : [...arr, value],
      };
    });
  };

  const toggleSkill = (skill) => {
    setFormData((prev) => {
      const skills = safeArray(prev.founder_skills);
      const exists = skills.includes(skill);

      setHasUnsavedChanges(true);

      return {
        ...prev,
        founder_skills: exists
          ? skills.filter((s) => s !== skill)
          : [...skills, skill],
      };
    });
  };

  const addCustomSkill = () => {
    const val = skillInput.trim();

    if (val && !safeArray(formData.founder_skills).includes(val)) {
      setFormData((prev) => ({
        ...prev,
        founder_skills: [...safeArray(prev.founder_skills), val],
      }));

      setHasUnsavedChanges(true);
      setSkillInput('');
    }
  };

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (saving || !user?.id) return;

    const quality = getFounderQualityChecks(formData);
    const missingRequired = quality.required.filter((item) => !item.condition);
    if (missingRequired.length > 0) {
      const message = `Please complete required fields: ${missingRequired.map((item) => item.label).join(', ')}`;
      setSaveError(message);
      toast.error('Complete required founder fields first');
      return;
    }

    const linkFields = ['pitch_deck_url', 'pitch_video_url', 'demo_url', 'website_url', 'linkedin_url', 'github_url', 'twitter_url'];
    const invalidLinks = linkFields.filter((field) => formData[field] && getLinkStatus(formData[field]) !== 'Format verified');
    const stageProof = getFounderStageProof(formData.startup_stage);
    const stageProofUrl = formData.metadata?.[stageProof.key] || '';
    const invalidStageProof =
      ['mvp_url', 'live_product_url'].includes(stageProof.key) &&
      stageProofUrl &&
      getLinkStatus(stageProofUrl) !== 'Format verified';

    if (invalidLinks.length > 0 || invalidStageProof) {
      const message = `Please fix invalid links: ${[
        ...invalidLinks,
        ...(invalidStageProof ? [stageProof.label] : []),
      ].join(', ')}`;
      setSaveError(message);
      toast.error('Fix invalid founder links first');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const now = new Date().toISOString();
      const completion = calcFounderCompletionWithBreakdown(formData).percentage;

      const normalizedProblem =
        formData.problem_solving ||
        formData.problem_statement ||
        '';

      await saveFounderBaseProfile(user.id, {
        full_name: formData.full_name?.trim() || '',
        email: formData.email?.trim() || user.email,
        user_type: 'early-stage-founder',
        location: formData.location?.trim() || '',
        bio: formData.bio?.trim() || '',
        avatar_url: formData.avatar_url || '',
        linkedin_url: formData.linkedin_url?.trim() || '',
        github_url: formData.github_url?.trim() || '',
        twitter_url: formData.twitter_url?.trim() || '',
        skills: safeArray(formData.founder_skills),
        profile_completion: completion,
        onboarding_completed: true,
        is_public: formData.is_public !== false,
        is_active: formData.is_active !== false,
        metadata: {
          updated_from: 'founder_profile_page',
          updated_at: now,
          link_verification: linkFields.reduce((acc, field) => ({
            ...acc,
            [field]: getLinkStatus(formData[field]),
          }), {}),
        },
      });

      await saveFounderStartupProfile(user.id, {
        company_name: formData.company_name?.trim() || '',
        idea_title: formData.idea_title?.trim() || '',
        industry: formData.industry || '',
        startup_stage: formData.startup_stage || '',

        problem_solving: normalizedProblem?.trim() || '',
        problem_statement: normalizedProblem?.trim() || '',
        unique_value_proposition: formData.unique_value_proposition?.trim() || '',
        target_market: formData.target_market?.trim() || '',
        target_audience: formData.target_market?.trim() || '',
        solution_description: formData.solution_description?.trim() || '',
        revenue_model: formData.revenue_model || '',
        competitors: formData.competitors?.trim() || '',
        launch_timeline: formData.launch_timeline?.trim() || '',

        team_size: formData.team_size || 1,
        funding_raised: formData.funding_raised || '',
        funding_stage: formData.funding_stage || '',
        founding_year: formData.founding_year || '',

        pitch_deck_url: formData.pitch_deck_url?.trim() || '',
        demo_url: formData.demo_url?.trim() || '',
        website_url: formData.website_url?.trim() || '',
        startup_location: formData.startup_location?.trim() || '',
        legal_status: formData.legal_status || '',
        monthly_revenue: formData.monthly_revenue || '',
        active_users: formData.active_users || '',
        customer_count: formData.customer_count || '',
        incubator_or_accelerator: formData.incubator_or_accelerator?.trim() || '',
        pitch_video_url: formData.pitch_video_url?.trim() || '',
        investment_readiness: formData.investment_readiness || '',
        cofounder_status: formData.cofounder_status || '',

        looking_for: safeArray(formData.looking_for),
        help_needed: safeArray(formData.help_needed),
        skills_needed: safeArray(formData.skills_needed),

        // ✅ Save Founder Skills here
        founder_skills: safeArray(formData.founder_skills),

        founder_role: formData.founder_role,
        commitment_level: formData.commitment_level,
        weekly_hours: formData.weekly_hours,

        validation_status: formData.validation_status,
        customer_validation: formData.customer_validation,
        traction_summary: formData.traction_summary,
        traction_metrics: formData.traction_metrics || {},

        business_model_details: formData.business_model_details,
        go_to_market_strategy: formData.go_to_market_strategy,
        current_challenges: formData.current_challenges,

        hiring_roles: safeArray(formData.hiring_roles),
        equity_available: formData.equity_available,
        cofounder_requirements: formData.cofounder_requirements,

        ask_amount: formData.ask_amount,
        use_of_funds: formData.use_of_funds,
        milestones_next_6_months: formData.milestones_next_6_months,

        market_size: formData.market_size,
        product_status: formData.startup_stage,
        tech_stack: [],
        key_risks: [],
        metadata: {
          ...(formData.metadata || {}),
          link_verification: linkFields.reduce((acc, field) => ({
            ...acc,
            [field]: getLinkStatus(formData[field]),
          }), {}),
          verified_at: now,
        },
      });

      clearDraft();
      setHasUnsavedChanges(false);

      toast.success('Founder profile saved!', {
        style: { background: '#98DE38', color: '#000' },
      });

      setIsEditMode(false);
      await loadProfile();
    } catch (err) {
      console.error('Founder save error:', err);
      setSaveError(err.message || 'Error saving founder profile');
      toast.error('Failed to save founder profile');
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];

    if (!file || file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      toast.error('Select a valid image under 5MB');
      return;
    }

    setUploading(true);

    try {
      const result = await uploadFounderAvatar(
        user.id,
        file,
        formData.full_name || formData.company_name || 'founder'
      );

      setFormData((prev) => ({
        ...prev,
        // ✅ DB path, not signed URL
        avatar_url: result.path,
      }));

      // ✅ UI preview signed URL
      setAvatarPreviewUrl(result.signedUrl);

      setHasUnsavedChanges(true);

      toast.success('Avatar uploaded. Click Save Changes to keep it.');
    } catch (err) {
      console.error('Founder avatar upload error:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleFounderFileUpload = async ({ file, folder, metadataKey }) => {
    if (!file || !user?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Select a file under 10MB');
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const cleanName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'document';
      const filePath = `founders/${user.id}/${folder}/${Date.now()}-${cleanName}.${ext}`;
      const { error } = await supabase.storage
        .from('profile-documents')
        .upload(filePath, file, { cacheControl: '3600', upsert: true });

      if (error) throw error;

      updateField('metadata', {
        ...(formData.metadata || {}),
        [metadataKey]: filePath,
      });
      toast.success('File uploaded. Click Save Changes to keep it.');
    } catch (err) {
      console.error('Founder document upload error:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supabase
        .from('profiles')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', user.id);

      await supabase.auth.signOut();
      clearDraft();

      toast.success('Account deactivated');
      navigate('/');
    } catch (err) {
      console.error('Founder delete error:', err);
      toast.error('Failed to deactivate account');
    }
  };

  if (loading) {
    return (
      <>
        <style>{STYLES}</style>
        <RoleNavbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader className="w-8 h-8 animate-spin" style={{ color: '#1B2D7F' }} />
        </div>
      </>
    );
  }

  const completion = calcFounderCompletionWithBreakdown(formData);
  const qualityChecks = getFounderQualityChecks(formData);

  return (
    <>
      <style>{STYLES}</style>
      <RoleNavbar />

      <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4 dm">
        <div className="max-w-5xl mx-auto">
          {saveError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 fade-in" role="alert">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />

              <div className="flex-1">
                <p className="font-semibold text-red-800 text-sm">Save Error</p>
                <p className="text-sm text-red-700">{saveError}</p>
              </div>

              <button onClick={() => setSaveError('')} className="p-1 hover:bg-red-100 rounded">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}

          {completion.percentage < 100 && (
            <div className="g-brand rounded-2xl p-5 mb-8 text-black fade-in lift">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base ss flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Complete Your Founder Profile
                  </h3>

                  <p className="text-sm text-black/80 mt-1">
                    {completion.missing.length
                      ? `Next: ${completion.missing.map((m) => m.label).join(', ')}`
                      : 'Better mentor and investor matches await.'}
                  </p>
                </div>

                <div className="text-right sm:text-left">
                  <div className="text-3xl font-black ss">{completion.percentage}%</div>
                  <div className="text-xs text-black/70">Complete</div>
                </div>
              </div>

              <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
                <div
                  className="h-full bg-black rounded-full transition-all"
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-6">
            <aside className="lg:col-span-1 space-y-5">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center lift">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full g-brand mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {avatarPreviewUrl ? (
                      <img
                        src={avatarPreviewUrl}
                        alt="Founder avatar"
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <span className="text-white text-2xl font-bold ss">
                        {initials(formData.full_name)}
                      </span>
                    )}
                  </div>

                  {isEditMode && (
                    <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full cursor-pointer hover:scale-105 transition-transform shadow border">
                      {uploading ? (
                        <Loader className="w-4 h-4 text-gray-700 animate-spin" />
                      ) : (
                        <Camera className="w-4 h-4 text-gray-700" />
                      )}

                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="sr-only"
                        disabled={uploading}
                      />
                    </label>
                  )}
                </div>

                <h2 className="font-black text-lg text-gray-900 mb-1 ss">
                  {formData.full_name || 'Your Name'}
                </h2>

                {(formData.company_name || formData.idea_title) && (
                  <p className="text-sm text-gray-500">
                    {formData.company_name || formData.idea_title}
                  </p>
                )}

                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-bold uppercase mt-2 border">
                  Founder
                </div>

                {formData.location && (
                  <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-2">
                    <MapPin className="w-3 h-3" />
                    {formData.location}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                {!isEditMode ? (
                  <button
                    onClick={() => {
                      setIsEditMode(true);
                      setHasUnsavedChanges(false);
                    }}
                    className="w-full py-3 g-brand text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90"
                  >
                    <Edit3 className="w-4 h-4" />
                    Edit Profile
                  </button>
                ) : (
                  <>
                    <button
                      onClick={handleUpdate}
                      disabled={saving}
                      className="w-full py-3 bg-[#1B2D7F] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#2A3F8F] disabled:opacity-50"
                    >
                      {saving ? (
                        <>
                          <Loader className="w-4 h-4 animate-spin" />
                          Saving…
                        </>
                      ) : (
                        <>
                          <Save className="w-4 h-4" />
                          Save Changes
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => {
                        setFormData(snapRef.current || makeEmpty(user));
                        setIsEditMode(false);
                        setHasUnsavedChanges(false);
                        clearDraft();
                        setSaveError('');
                      }}
                      className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors"
                    >
                      Cancel
                    </button>
                  </>
                )}

                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="w-full py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete Account
                </button>
              </div>

              {isEditMode && hasUnsavedChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-1">
                    <Clock className="w-3 h-3" />
                    Unsaved changes auto-saved locally
                  </p>
                </div>
              )}
            </aside>

            <section className="lg:col-span-3">
              <div className="space-y-6">
              <AIProfileQualityChecker
                roleLabel="Founder profile"
                completion={completion}
                requiredItems={qualityChecks.required}
                recommendedItems={qualityChecks.recommended}
              />
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                {!isEditMode ? (
                  <ViewMode
                    formData={formData}
                    onEditClick={() => {
                      setIsEditMode(true);
                      toast('🚀 Edit your founder profile to improve matches!', {
                        style: { background: '#98DE38', color: '#000' },
                      });
                    }}
                  />
                ) : (
                  <EditMode
                    formData={formData}
                    toggleSkill={toggleSkill}
                    toggleArrayField={toggleArrayField}
                    skillInput={skillInput}
                    setSkillInput={setSkillInput}
                    addCustomSkill={addCustomSkill}
                    onSave={handleUpdate}
                    saving={saving}
                    updateField={updateField}
                    onFileUpload={handleFounderFileUpload}
                    uploading={uploading}
                  />
                )}
              </div>
              </div>
            </section>
          </div>

          {showDeleteConfirm && (
            <DeleteModal
              onCancel={() => {
                setShowDeleteConfirm(false);
                setHasUnsavedChanges(false);
              }}
              onConfirm={handleDelete}
            />
          )}
        </div>
      </div>
    </>
  );
}

// ─── VIEW MODE ───
function ViewMode({ formData, onEditClick }) {
  return (
    <div className="space-y-10 dm">
      <header>
        <h1 className="text-3xl font-black text-gray-900 mb-1 ss">
          Founder Profile
        </h1>
        <p className="text-gray-500 text-sm">
          Your startup identity powers mentor, investor, and team matching.
        </p>
      </header>

      <Section title="Basic Information" icon={<User className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {[
            { l: 'Full Name', v: formData.full_name, I: User },
            { l: 'Email', v: formData.email, I: Mail },
            { l: 'Location', v: formData.location, I: MapPin },
            { l: 'Founder Role', v: formData.founder_role, I: Briefcase },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-gray-100 rounded-lg" style={{ color: '#1B2D7F' }}>
                <x.I className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                  {x.l}
                </p>

                <p className="text-sm font-semibold text-gray-800 truncate">
                  {x.v || <span className="text-gray-300 italic">Not provided</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {formData.bio && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>
              About Founder
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.bio}</p>
          </div>
        )}
      </Section>

      <Section title="Startup Overview" icon={<Rocket className="w-5 h-5 text-[#1B2D7F]" />}>
        {(formData.company_name || formData.idea_title || formData.problem_solving) ? (
          <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5">
            <div className="flex items-start justify-between mb-3">
              <div>
                {formData.industry && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#98DE38]/20 text-[#98DE38] text-xs font-bold rounded-md uppercase">
                    <Tag className="w-3" />
                    {formData.industry}
                  </span>
                )}

                <h3 className="font-bold text-lg mt-2">
                  {formData.company_name || formData.idea_title || 'Untitled Startup'}
                </h3>

                <div className="flex flex-wrap gap-2 mt-2">
                  {formData.startup_stage && (
                    <span className="inline-block px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded">
                      {formData.startup_stage}
                    </span>
                  )}

                  {formData.validation_status && (
                    <span className="inline-block px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded">
                      {formData.validation_status}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {formData.unique_value_proposition && (
              <p className="text-sm text-gray-300 italic mb-3">
                "{formData.unique_value_proposition}"
              </p>
            )}

            {(formData.problem_solving || formData.problem_statement) && (
              <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">
                {formData.problem_solving || formData.problem_statement}
              </p>
            )}

            {formData.target_market && (
              <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
                <Users className="w-3" />
                For: {formData.target_market}
              </p>
            )}
          </div>
        ) : (
          <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Rocket className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-1">No startup details yet.</p>
            <p className="text-xs text-gray-400 mb-4">
              Add startup details to get better mentor and investor matches.
            </p>
            <button
              onClick={onEditClick}
              className="px-4 py-2 g-brand text-black text-xs font-bold rounded-lg hover:opacity-90"
            >
              + Add Startup Details
            </button>
          </div>
        )}
      </Section>

      <Section title="Traction & Funding" icon={<TrendingUp className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { l: 'Team Size', v: formData.team_size, I: Users },
            { l: 'Funding Stage', v: formData.funding_stage, I: DollarSign },
            { l: 'Funding Raised', v: formData.funding_raised, I: DollarSign },
            { l: 'Ask Amount', v: formData.ask_amount, I: DollarSign },
            { l: 'Revenue Model', v: formData.revenue_model, I: Briefcase },
            { l: 'Market Size', v: formData.market_size, I: TrendingUp },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-gray-100 rounded-lg" style={{ color: '#1B2D7F' }}>
                <x.I className="w-4 h-4" />
              </div>

              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                  {x.l}
                </p>

                <p className="text-sm font-semibold text-gray-800 truncate">
                  {x.v || <span className="text-gray-300 italic">Not provided</span>}
                </p>
              </div>
            </div>
          ))}
        </div>

        {formData.traction_summary && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4" style={{ borderColor: '#1B2D7F' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#1B2D7F' }}>
              Traction Summary
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.traction_summary}</p>
          </div>
        )}

        {formData.use_of_funds && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>
              Use of Funds
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.use_of_funds}</p>
          </div>
        )}
      </Section>

      <Section title="Founder Skills" icon={<Briefcase className="w-5 h-5 text-[#1B2D7F]" />}>
        {safeArray(formData.founder_skills).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {safeArray(formData.founder_skills).map((skill, i) => (
              <span
                key={`${skill}-${i}`}
                className="px-3 py-2 rounded-full text-xs font-semibold border"
                style={{
                  background: 'rgba(27,45,127,0.08)',
                  color: '#1B2D7F',
                  borderColor: 'rgba(27,45,127,0.2)',
                }}
              >
                {skill}
              </span>
            ))}
          </div>
        ) : (
          <Empty label="No founder skills added yet. Add at least 3 to improve matching." />
        )}
      </Section>

      <Section title="Looking For" icon={<Target className="w-5 h-5 text-[#1B2D7F]" />}>
        {safeArray(formData.looking_for).length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {safeArray(formData.looking_for).map((val, i) => {
              const opt = LOOKING_FOR_OPTS.find((o) => o.val === val);

              return (
                <div
                  key={`${val}-${i}`}
                  className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center border"
                  style={{
                    background: 'rgba(27,45,127,0.05)',
                    borderColor: 'rgba(27,45,127,0.2)',
                  }}
                >
                  <span className="text-2xl">{opt?.icon || '🔍'}</span>
                  <span className="text-xs font-bold ss" style={{ color: '#1B2D7F' }}>
                    {val}
                  </span>
                  <span className="text-xs text-gray-400">{opt?.desc}</span>
                </div>
              );
            })}
          </div>
        ) : (
          <Empty label="No founder needs selected yet." />
        )}
      </Section>

      <Section title="Help Needed" icon={<Heart className="w-5 h-5 text-red-500" />}>
        {safeArray(formData.help_needed).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {safeArray(formData.help_needed).map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="px-3 py-2 rounded-full text-xs font-semibold border"
                style={{
                  background: 'rgba(239,68,68,0.08)',
                  color: '#DC2626',
                  borderColor: 'rgba(239,68,68,0.3)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Empty label="No help areas specified. Add some to get relevant mentor matches." />
        )}
      </Section>

      {SHOW_LEGACY_FOUNDER_FIELDS && (
      <Section title="Skills Needed" icon={<Sparkles className="w-5 h-5 text-[#98DE38]" />}>
        {safeArray(formData.skills_needed).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {safeArray(formData.skills_needed).map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="px-3 py-2 rounded-full text-xs font-semibold border"
                style={{
                  background: 'rgba(152,222,56,0.12)',
                  color: '#1B2D7F',
                  borderColor: '#98DE38',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Empty label="No required team skills added yet." />
        )}
      </Section>
      )}

      <Section title="Hiring & Co-Founder Requirements" icon={<Users className="w-5 h-5 text-[#1B2D7F]" />}>
        {(safeArray(formData.hiring_roles).length > 0 || formData.cofounder_requirements) && (
          <div className="mb-4 rounded-xl bg-[#98DE38]/10 border border-[#98DE38]/30 p-3 text-xs font-bold text-[#1B2D7F]">
            This founder is hiring a co-founder with these requirements.
          </div>
        )}

        {safeArray(formData.hiring_roles).length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {safeArray(formData.hiring_roles).map((item, i) => (
              <span
                key={`${item}-${i}`}
                className="px-3 py-2 rounded-full text-xs font-semibold border"
                style={{
                  background: 'rgba(27,45,127,0.08)',
                  color: '#1B2D7F',
                  borderColor: 'rgba(27,45,127,0.2)',
                }}
              >
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Empty label="No hiring roles selected yet." />
        )}

        {formData.cofounder_requirements && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>
              Co-Founder Requirements
            </p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.cofounder_requirements}</p>
          </div>
        )}
      </Section>

      <Section title="Readiness & Operating Metrics" icon={<TrendingUp className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { l: 'Startup Location', v: formData.startup_location, I: MapPin },
            { l: 'Legal Status', v: formData.legal_status, I: Shield },
            { l: 'Investment Readiness', v: formData.investment_readiness, I: DollarSign },
            { l: 'Monthly Revenue', v: formData.monthly_revenue, I: DollarSign },
            { l: 'Active Users', v: formData.active_users || '0', I: Users },
            { l: 'Customers', v: formData.customer_count || '0', I: Target },
            { l: 'Incubator / Accelerator', v: formData.incubator_or_accelerator, I: Rocket },
            { l: 'Co-Founder Status', v: formData.cofounder_status, I: Users },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-gray-100 rounded-lg" style={{ color: '#1B2D7F' }}><x.I className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{x.l}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{x.v || <span className="text-gray-300 italic">Not provided</span>}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>

      {SHOW_LEGACY_FOUNDER_FIELDS && (
      <Section title="Visibility & Status" icon={<Shield className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { l: 'Public Profile', v: formData.is_public ? 'Visible' : 'Private', I: Shield },
            { l: 'Active Startup', v: formData.is_active ? 'Active' : 'Inactive', I: Shield },
          ].map((x, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
              <div className="p-2 bg-gray-100 rounded-lg" style={{ color: '#1B2D7F' }}><x.I className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{x.l}</p>
                <p className="text-sm font-semibold text-gray-800 truncate">{x.v || <span className="text-gray-300 italic">Not provided</span>}</p>
              </div>
            </div>
          ))}
        </div>
      </Section>
      )}

      <Section title="Links & Assets" icon={<LinkIcon className="w-5 h-5 text-[#1B2D7F]" />}>
        {[
          formData.pitch_deck_url,
          formData.pitch_video_url,
          formData.demo_url,
          formData.website_url,
          formData.linkedin_url,
          formData.github_url,
          formData.twitter_url,
        ].some(Boolean) ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { k: 'pitch_deck_url', l: 'Pitch Deck', I: FileText, bg: 'bg-lime-50', c: 'text-[#1B2D7F]' },
              { k: 'pitch_video_url', l: 'Pitch Video', I: Globe, bg: 'bg-lime-50', c: 'text-[#1B2D7F]' },
              { k: 'demo_url', l: 'Demo', I: Globe, bg: 'bg-gray-50', c: 'text-gray-700' },
              { k: 'website_url', l: 'Website', I: Globe, bg: 'bg-gray-50', c: 'text-gray-700' },
              { k: 'linkedin_url', l: 'LinkedIn', I: Linkedin, bg: 'bg-blue-50', c: 'text-blue-600' },
              { k: 'github_url', l: 'GitHub', I: Github, bg: 'bg-gray-50', c: 'text-gray-600' },
              { k: 'twitter_url', l: 'Twitter', I: Twitter, bg: 'bg-sky-50', c: 'text-sky-600' },
            ]
              .filter((link) => formData[link.k])
              .map((link) => (
                <a
                  key={link.k}
                  href={formData[link.k]}
                  target="_blank"
                  rel="noreferrer"
                  className={`flex items-center gap-3 p-4 rounded-xl hover:opacity-80 transition-all ${link.bg} ${link.c}`}
                >
                  <link.I className="w-4 h-4 flex-shrink-0" />

                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold uppercase tracking-wide">{link.l}</p>
                    <p className="text-xs truncate opacity-80">
                      {formData[link.k].replace(/^https?:\/\//, '')}
                    </p>
                  </div>

                  <LinkIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
                </a>
              ))}
          </div>
        ) : (
          <Empty label="No links added yet. Add a pitch deck, demo, or social links to boost credibility." />
        )}
      </Section>
    </div>
  );
}

// ─── EDIT MODE ───
function EditMode({
  formData,
  toggleSkill,
  toggleArrayField,
  skillInput,
  setSkillInput,
  addCustomSkill,
  onSave,
  saving,
  updateField,
  onFileUpload,
  uploading,
}) {
  const completion = calcFounderCompletionWithBreakdown(formData);
  const autoHelpSuggestions = generateFounderHelpSuggestions(formData);
  const autoSkillSuggestions = generateFounderSkillSuggestions(formData);
  const allLookingForOptions = [...LOOKING_FOR_OPTS, ...EXTRA_LOOKING_FOR_OPTS];
  const stageProof = getFounderStageProof(formData.startup_stage);
  const tractionReady = shouldShowTractionFunding(formData.startup_stage);

  const addAutoHelpSuggestions = () => {
    const merged = Array.from(
      new Set([...(formData.help_needed || []), ...autoHelpSuggestions])
    );

    updateField('help_needed', merged);
    toast.success('Auto help suggestions added!');
  };

  const addAutoSkillSuggestions = () => {
    const merged = Array.from(
      new Set([...(formData.skills_needed || []), ...autoSkillSuggestions])
    );

    updateField('skills_needed', merged);
    toast.success('Auto skill suggestions added!');
  };

  return (
    <form onSubmit={(e) => e.preventDefault()} className="space-y-10 dm">
      <header>
        <h1 className="text-3xl font-black text-gray-900 ss mb-1">
          Edit Founder Profile
        </h1>
        <p className="text-gray-400 text-sm">
          Basic info + startup details + traction + founder needs.
        </p>
      </header>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold ss" style={{ color: '#1B2D7F' }}>
            Profile Completion
          </span>
          <span className="font-black ss" style={{ color: '#1B2D7F' }}>
            {completion.percentage}%
          </span>
        </div>

        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${completion.percentage}%`,
              background: `linear-gradient(90deg, #98DE38, #7EC42E)`,
            }}
          />
        </div>

        {completion.missing.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Tip: Add {completion.missing.map((m) => m.label.toLowerCase()).join(', ')} to reach 100%
          </p>
        )}
      </div>

      <EditSection title="Basic Information" icon={<User className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Full Name *"
            value={formData.full_name}
            onChange={(v) => updateField('full_name', v)}
            icon={<User className="w-4 h-4" />}
            placeholder="Your full name"
            required
          />

          <FormInput
            label="Email"
            value={formData.email}
            disabled
            icon={<Mail className="w-4 h-4" />}
            hint="Contact support to change"
          />

          <FormInput
            label="City / Country"
            value={formData.location}
            onChange={(v) => updateField('location', v)}
            icon={<MapPin className="w-4 h-4" />}
            placeholder="e.g. Karachi, Pakistan"
          />
        </div>

        <FormTextarea
          label="About You"
          value={formData.bio}
          onChange={(v) => updateField('bio', v)}
          placeholder="2–3 sentences about your founder background, mission, and what you're building..."
          rows={3}
          max={400}
        />
      </EditSection>

      <EditSection
        title="Startup Information"
        icon={<Rocket className="w-4 h-4" />}
        hint="This is the core data used for mentor, investor, and team matching."
      >
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Company / Startup Name"
            value={formData.company_name}
            onChange={(v) => updateField('company_name', v)}
            icon={<Building2 className="w-4 h-4" />}
            placeholder="e.g. EduPath"
          />

          <FormInput
            label="Idea Title"
            value={formData.idea_title}
            onChange={(v) => updateField('idea_title', v)}
            icon={<Lightbulb className="w-4 h-4" />}
            placeholder="e.g. AI Study Planner"
          />

          <SelectField
            label="Industry"
            value={formData.industry}
            onChange={(v) => updateField('industry', v)}
            options={INDUSTRIES}
            placeholder="Select industry…"
          />

          <SelectField
            label="Startup Stage"
            value={formData.startup_stage}
            onChange={(v) => {
              updateField('startup_stage', v);
              updateField('product_status', v);
            }}
            options={STARTUP_STAGES}
            placeholder="Select stage…"
          />

          {SHOW_LEGACY_FOUNDER_FIELDS && (
            <SelectField
              label="Product Status"
              value={formData.product_status}
              onChange={(v) => updateField('product_status', v)}
              options={PRODUCT_STATUS}
              placeholder="Select product status…"
            />
          )}

          <SelectField
            label="Validation Status"
            value={formData.validation_status}
            onChange={(v) => updateField('validation_status', v)}
            options={VALIDATION_STATUS}
            placeholder="Select validation status…"
          />

          <SelectField
            label="Revenue Model"
            value={formData.revenue_model}
            onChange={(v) => updateField('revenue_model', v)}
            options={REVENUE_MODELS}
            placeholder="Select revenue model…"
          />

          <FormInput
            label="Launch Timeline"
            value={formData.launch_timeline}
            onChange={(v) => updateField('launch_timeline', v)}
            icon={<Clock className="w-4 h-4" />}
            placeholder="e.g. Q3 2026"
          />

          <FormInput
            label="Market Size / Opportunity"
            value={formData.market_size}
            onChange={(v) => updateField('market_size', v)}
            icon={<TrendingUp className="w-4 h-4" />}
            placeholder="e.g. $2B EdTech market in MENA"
          />
        </div>

        {stageProof.key === 'mvp_url' || stageProof.key === 'live_product_url' ? (
          <FormInput
            label={stageProof.label}
            value={formData.metadata?.[stageProof.key] || formData.demo_url || ''}
            onChange={(v) =>
              updateField('metadata', {
                ...(formData.metadata || {}),
                [stageProof.key]: v,
              })
            }
            icon={<Globe className="w-4 h-4" />}
            placeholder="https://your-product.com"
            hint={getLinkStatus(formData.metadata?.[stageProof.key] || formData.demo_url)}
          />
        ) : (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
              {stageProof.label}
            </p>

            <input
              type="file"
              accept={stageProof.accept}
              disabled={uploading}
              onChange={(e) =>
                onFileUpload?.({
                  file: e.target.files?.[0],
                  folder: 'startup-proof',
                  metadataKey: stageProof.key,
                })
              }
              className="block w-full text-sm text-gray-600"
            />

            {formData.metadata?.[stageProof.key] && (
              <p className="text-xs text-green-700 font-semibold mt-2">
                Uploaded: {formData.metadata[stageProof.key]}
              </p>
            )}
          </div>
        )}

        <FormTextarea
          label="Problem Statement *"
          value={formData.problem_solving || formData.problem_statement}
          onChange={(v) => {
            updateField('problem_solving', v);
            updateField('problem_statement', v);
          }}
          placeholder="What specific problem are you solving? Who feels this pain?"
          rows={4}
          max={600}
        />

        <FormTextarea
          label="Unique Value Proposition"
          value={formData.unique_value_proposition}
          onChange={(v) => updateField('unique_value_proposition', v)}
          placeholder="Why will customers choose you over alternatives?"
          rows={2}
          max={300}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <FormTextarea
            label="Target Market"
            value={formData.target_market}
            onChange={(v) => {
              updateField('target_market', v);
              updateField('target_audience', v);
            }}
            placeholder="e.g. University students in Pakistan"
            rows={2}
            max={300}
          />

          <FormTextarea
            label="Competitors"
            value={formData.competitors}
            onChange={(v) => updateField('competitors', v)}
            placeholder="e.g. Google Classroom, Duolingo, Coursera"
            rows={2}
            max={300}
          />
        </div>

        <FormTextarea
          label="Solution Description"
          value={formData.solution_description}
          onChange={(v) => updateField('solution_description', v)}
          placeholder="How does your product/service work?"
          rows={3}
          max={500}
        />

        <FormTextarea
          label="Business Model Details"
          value={formData.business_model_details}
          onChange={(v) => updateField('business_model_details', v)}
          placeholder="How exactly will this startup make money?"
          rows={3}
          max={500}
        />

        <FormTextarea
          label="Customer Validation"
          value={formData.customer_validation}
          onChange={(v) => updateField('customer_validation', v)}
          placeholder="Have you talked to users? What feedback or signals have you received?"
          rows={3}
          max={500}
        />

        <FormTextarea
          label="Go-To-Market Strategy"
          value={formData.go_to_market_strategy}
          onChange={(v) => updateField('go_to_market_strategy', v)}
          placeholder="How will you get your first 100, 1,000, or 10,000 users?"
          rows={3}
          max={500}
        />

        <FormTextarea
          label="Current Challenges"
          value={formData.current_challenges}
          onChange={(v) => updateField('current_challenges', v)}
          placeholder="What is blocking progress right now? Tech, funding, marketing, team, validation?"
          rows={3}
          max={500}
        />
      </EditSection>

      <EditSection
        title="Founder Commitment"
        icon={<Clock className="w-4 h-4" />}
        hint="This helps match you with co-founders and mentors who fit your seriousness level."
      >
        <div className="grid md:grid-cols-3 gap-4">
          <SelectField
            label="Founder Type"
            value={formData.founder_role}
            onChange={(v) => updateField('founder_role', v)}
            options={FOUNDER_ROLES}
            placeholder="Select founder type…"
          />

          <SelectField
            label="Commitment Level"
            value={formData.commitment_level}
            onChange={(v) => updateField('commitment_level', v)}
            options={FOUNDER_COMMITMENT}
            placeholder="Select commitment…"
          />

          <SelectField
            label="Weekly Availability"
            value={formData.weekly_hours}
            onChange={(v) => updateField('weekly_hours', v)}
            options={WEEKLY_HOURS}
            placeholder="Select hours…"
          />
        </div>
      </EditSection>

      <EditSection
        title="Traction & Funding"
        icon={<TrendingUp className="w-4 h-4" />}
        hint="Even early signals help mentors and investors understand your stage."
      >
        {!tractionReady && (
          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-sm font-bold text-gray-800">
              Traction fields unlock when the startup reaches MVP Built, Live Product, Growing, or Revenue.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              For now, focus on startup proof, problem, validation, target market, and go-to-market details.
            </p>
          </div>
        )}

        {tractionReady && (
          <>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Team Size"
            type="number"
            value={formData.team_size}
            onChange={(v) => updateField('team_size', v)}
            icon={<Users className="w-4 h-4" />}
            placeholder="1"
          />

          <SelectField
            label="Funding Stage"
            value={formData.funding_stage}
            onChange={(v) => updateField('funding_stage', v)}
            options={FUNDING_STAGES}
            placeholder="Select funding stage…"
          />

          <FormInput
            label="Funding Raised"
            value={formData.funding_raised}
            onChange={(v) => updateField('funding_raised', v)}
            icon={<DollarSign className="w-4 h-4" />}
            placeholder="e.g. 50000"
          />

          <FormInput
            label="Ask Amount"
            value={formData.ask_amount}
            onChange={(v) => updateField('ask_amount', v)}
            icon={<DollarSign className="w-4 h-4" />}
            placeholder="e.g. $50K or PKR 5M"
          />

          <FormInput
            label="Founding Year"
            value={formData.founding_year}
            onChange={(v) => updateField('founding_year', v)}
            icon={<Clock className="w-4 h-4" />}
            placeholder="e.g. 2025"
          />
        </div>

        <FormTextarea
          label="Use of Funds"
          value={formData.use_of_funds}
          onChange={(v) => updateField('use_of_funds', v)}
          placeholder="How will you use funding? Product, hiring, marketing, operations?"
          rows={3}
          max={500}
        />

        <FormTextarea
          label="Milestones for Next 6 Months"
          value={formData.milestones_next_6_months}
          onChange={(v) => updateField('milestones_next_6_months', v)}
          placeholder="What will you achieve in the next 6 months?"
          rows={3}
          max={500}
        />

        <FormTextarea
          label="Traction Summary"
          value={formData.traction_summary}
          onChange={(v) => updateField('traction_summary', v)}
          placeholder="Users, revenue, pilots, LOIs, waitlist, partnerships, or early feedback."
          rows={3}
          max={500}
        />

        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Monthly Revenue" value={formData.monthly_revenue} onChange={(v) => updateField('monthly_revenue', v)} icon={<DollarSign className="w-4 h-4" />} placeholder="e.g. 50000" />
          <FormInput label="Active Users" type="number" value={formData.active_users} onChange={(v) => updateField('active_users', v)} icon={<Users className="w-4 h-4" />} placeholder="e.g. 1200" />
          <FormInput label="Customer Count" type="number" value={formData.customer_count} onChange={(v) => updateField('customer_count', v)} icon={<Target className="w-4 h-4" />} placeholder="e.g. 35" />
          <FormInput label="Incubator / Accelerator" value={formData.incubator_or_accelerator} onChange={(v) => updateField('incubator_or_accelerator', v)} icon={<Rocket className="w-4 h-4" />} placeholder="e.g. NIC, Y Combinator, Plan9" />
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <SelectField label="Legal Status" value={formData.legal_status} onChange={(v) => updateField('legal_status', v)} options={LEGAL_STATUS_OPTS} placeholder="Select legal status..." />
          <SelectField label="Investment Readiness" value={formData.investment_readiness} onChange={(v) => updateField('investment_readiness', v)} options={INVESTMENT_READINESS_OPTS} placeholder="Select readiness..." />
          <SelectField label="Co-Founder Status" value={formData.cofounder_status} onChange={(v) => updateField('cofounder_status', v)} options={COFOUNDER_STATUS_OPTS} placeholder="Select co-founder status..." />
          <FormInput label="Startup Location" value={formData.startup_location} onChange={(v) => updateField('startup_location', v)} icon={<MapPin className="w-4 h-4" />} placeholder="e.g. Karachi, Remote, LUMS Lahore" />
        </div>
          </>
        )}
      </EditSection>

      <EditSection title="Founder Skills" icon={<Briefcase className="w-4 h-4" />} hint="AI uses your skills for matching. Add at least 3.">
        <div className="flex flex-wrap gap-2 mb-4">
          {FOUNDER_SKILL_CHIPS.map((skill) => (
            <button
              key={skill}
              type="button"
              onClick={() => toggleSkill(skill)}
              className={`chip ${safeArray(formData.founder_skills).includes(skill) ? 'selected' : ''}`}
              aria-pressed={safeArray(formData.founder_skills).includes(skill)}
            >
              {safeArray(formData.founder_skills).includes(skill) ? '✓' : '+'} {skill}
            </button>
          ))}
        </div>

        <div className="flex gap-2">
          <input
            className="inp flex-1"
            value={skillInput}
            onChange={(e) => setSkillInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())}
            placeholder="Add custom skill…"
          />

          <button
            type="button"
            onClick={addCustomSkill}
            className="px-4 py-2.5 g-brand text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>
      </EditSection>

      {SHOW_LEGACY_FOUNDER_FIELDS && (
      <EditSection
        title="Current / Planned Tech Stack"
        icon={<Sparkles className="w-4 h-4" />}
        hint="This helps technical co-founders and developers understand what you're building with."
      >
        <div className="flex flex-wrap gap-2">
          {TECH_STACK_CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleArrayField('tech_stack', item)}
              className={`chip ${safeArray(formData.tech_stack).includes(item) ? 'selected' : ''}`}
            >
              {safeArray(formData.tech_stack).includes(item) ? '✓' : '+'} {item}
            </button>
          ))}
        </div>
      </EditSection>
      )}

      <EditSection title="Looking For" icon={<Target className="w-4 h-4" />} hint="What does your startup need right now?">
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {allLookingForOptions.map((opt) => {
            const selected = safeArray(formData.looking_for).includes(opt.val);

            return (
              <button
                key={opt.val}
                type="button"
                onClick={() => toggleArrayField('looking_for', opt.val)}
                className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-all ${selected
                  ? 'border-[#98DE38] bg-[#98DE38]/10'
                  : 'border-gray-200 bg-white hover:border-[#98DE38]/50'
                  }`}
              >
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-xs font-bold ss">{opt.val}</span>
                <span className="text-[10px] text-gray-400">{opt.desc}</span>
                {selected && (
                  <span className="text-xs font-bold" style={{ color: '#98DE38' }}>
                    ✓ Selected
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </EditSection>

      <EditSection
        title="Help Needed"
        icon={<Heart className="w-4 h-4" />}
        hint="Auto suggestions are generated from your startup idea, stage, market, and current challenges."
      >
        {autoHelpSuggestions.length > 0 && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl mb-4">
            <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1">
              <Sparkles className="w-3" />
              Suggested based on your startup profile
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {autoHelpSuggestions.map((item) => (
                <span
                  key={item}
                  className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-md font-medium"
                >
                  {item}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={addAutoHelpSuggestions}
              className="px-3 py-2 bg-[#1B2D7F] text-white rounded-lg text-xs font-bold hover:bg-[#2A3F8F]"
            >
              Add Suggestions
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {HELP_NEEDED_CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleArrayField('help_needed', item)}
              className={`chip ${safeArray(formData.help_needed).includes(item) ? 'selected' : ''}`}
            >
              {safeArray(formData.help_needed).includes(item) ? '✓' : '+'} {item}
            </button>
          ))}
        </div>
      </EditSection>

      {SHOW_LEGACY_FOUNDER_FIELDS && (
      <EditSection
        title="Skills Needed"
        icon={<Sparkles className="w-4 h-4" />}
        hint="Auto suggestions are generated from your product, tech stack, industry, and hiring needs."
      >
        {autoSkillSuggestions.length > 0 && (
          <div className="p-4 bg-lime-50 border border-lime-200 rounded-xl mb-4">
            <p className="text-xs font-bold text-[#1B2D7F] mb-2 flex items-center gap-1">
              <Sparkles className="w-3" />
              Suggested skills for your startup
            </p>

            <div className="flex flex-wrap gap-2 mb-3">
              {autoSkillSuggestions.map((item) => (
                <span
                  key={item}
                  className="px-2 py-1 bg-white border border-lime-200 text-[#1B2D7F] text-xs rounded-md font-medium"
                >
                  {item}
                </span>
              ))}
            </div>

            <button
              type="button"
              onClick={addAutoSkillSuggestions}
              className="px-3 py-2 g-brand text-black rounded-lg text-xs font-bold hover:opacity-90"
            >
              Add Skill Suggestions
            </button>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {SKILLS_NEEDED_CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleArrayField('skills_needed', item)}
              className={`chip ${safeArray(formData.skills_needed).includes(item) ? 'selected' : ''}`}
            >
              {safeArray(formData.skills_needed).includes(item) ? '✓' : '+'} {item}
            </button>
          ))}
        </div>
      </EditSection>
      )}

      <EditSection
        title="Hiring & Co-Founder Requirements"
        icon={<Users className="w-4 h-4" />}
        hint="This helps Find Team and AI matching understand who you need."
      >
        <div className="flex flex-wrap gap-2 mb-4">
          {HIRING_ROLE_CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleArrayField('hiring_roles', item)}
              className={`chip ${safeArray(formData.hiring_roles).includes(item) ? 'selected' : ''}`}
            >
              {safeArray(formData.hiring_roles).includes(item) ? '✓' : '+'} {item}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-2 mb-4">
          <input
            className="inp flex-1"
            value={formData.metadata?.custom_hiring_role || ''}
            onChange={(e) =>
              updateField('metadata', {
                ...(formData.metadata || {}),
                custom_hiring_role: e.target.value,
              })
            }
            placeholder="Add custom co-founder requirement..."
          />

          <button
            type="button"
            onClick={() => {
              const value = (formData.metadata?.custom_hiring_role || '').trim();
              if (!value) return;

              updateField('hiring_roles', [
                ...new Set([...safeArray(formData.hiring_roles), value]),
              ]);
              updateField('metadata', {
                ...(formData.metadata || {}),
                custom_hiring_role: '',
              });
            }}
            className="px-4 py-2.5 g-brand text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
          >
            Add
          </button>
        </div>

        {(safeArray(formData.hiring_roles).length > 0 || formData.cofounder_requirements) && (
          <div className="mb-4 rounded-xl bg-[#98DE38]/10 border border-[#98DE38]/30 p-3 text-xs font-bold text-[#1B2D7F]">
            This founder is hiring a co-founder with these requirements.
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-4">
          <FormInput
            label="Equity Available"
            value={formData.equity_available}
            onChange={(v) => updateField('equity_available', v)}
            icon={<DollarSign className="w-4 h-4" />}
            placeholder="e.g. 5–15% for technical co-founder"
          />

          <FormTextarea
            label="Co-Founder Requirements"
            value={formData.cofounder_requirements}
            onChange={(v) => updateField('cofounder_requirements', v)}
            placeholder="Describe ideal co-founder: skills, personality, commitment, location, etc."
            rows={3}
            max={500}
          />
        </div>
      </EditSection>

      {SHOW_LEGACY_FOUNDER_FIELDS && (
      <EditSection
        title="Risks & Constraints"
        icon={<Shield className="w-4 h-4" />}
        hint="Being honest about risks helps mentors give better guidance."
      >
        <div className="flex flex-wrap gap-2">
          {KEY_RISK_CHIPS.map((item) => (
            <button
              key={item}
              type="button"
              onClick={() => toggleArrayField('key_risks', item)}
              className={`chip ${safeArray(formData.key_risks).includes(item) ? 'selected' : ''}`}
            >
              {safeArray(formData.key_risks).includes(item) ? '✓' : '+'} {item}
            </button>
          ))}
        </div>
      </EditSection>
      )}

      {SHOW_LEGACY_FOUNDER_FIELDS && (
      <EditSection title="Visibility & Status" icon={<Shield className="w-4 h-4" />} hint="Control whether mentors, investors, and team candidates can discover this startup profile.">
        <div className="grid md:grid-cols-2 gap-3">
          <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-[#98DE38]/50 transition-all">
            <input type="checkbox" checked={formData.is_public !== false} onChange={(e) => updateField('is_public', e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1B2D7F] focus:ring-[#98DE38]" />
            <div><p className="text-sm font-semibold text-gray-700">Public startup profile</p><p className="text-xs text-gray-400">Show this startup in matching and discovery.</p></div>
          </label>
          <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-[#98DE38]/50 transition-all">
            <input type="checkbox" checked={formData.is_active !== false} onChange={(e) => updateField('is_active', e.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1B2D7F] focus:ring-[#98DE38]" />
            <div><p className="text-sm font-semibold text-gray-700">Active startup</p><p className="text-xs text-gray-400">Keep on while you are looking for support or funding.</p></div>
          </label>
        </div>
      </EditSection>
      )}

      <EditSection title="Links & Assets" icon={<LinkIcon className="w-4 h-4" />} hint="Boosts investor trust and discoverability.">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { field: 'pitch_deck_url', Icon: FileText, label: 'Pitch Deck URL', points: 4, placeholder: 'Google Drive, Notion, or direct link' },
            { field: 'pitch_video_url', Icon: Globe, label: 'Pitch Video URL', points: 3, placeholder: 'Loom, YouTube, or video pitch URL' },
            { field: 'demo_url', Icon: Globe, label: 'Demo / Product URL', points: 3, placeholder: 'Loom, YouTube, or live demo URL' },
            { field: 'website_url', Icon: Globe, label: 'Website URL', points: 2, placeholder: 'https://yourstartup.com' },
            { field: 'linkedin_url', Icon: Linkedin, label: 'LinkedIn URL', points: 3, placeholder: 'https://linkedin.com/in/you' },
            { field: 'github_url', Icon: Github, label: 'GitHub URL', points: 2, placeholder: 'https://github.com/you' },
            { field: 'twitter_url', Icon: Twitter, label: 'Twitter URL', points: 1, placeholder: 'https://twitter.com/you' },
          ].map((item) => (
            <div key={item.field}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                <item.Icon className="w-3.5 h-3.5" style={{ color: '#1B2D7F' }} />
                {item.label}
                <span className="ml-auto text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: '#98DE38' }}>
                  +{item.points}
                </span>
              </label>

              <input
                type="url"
                placeholder={item.placeholder}
                value={formData[item.field] || ''}
                onChange={(e) => updateField(item.field, e.target.value)}
                className="inp"
              />

              <p
                className={`text-xs mt-1 font-semibold ${
                  getLinkStatus(formData[item.field]) === 'Format verified'
                    ? 'text-green-700'
                    : formData[item.field]
                      ? 'text-red-600'
                      : 'text-gray-400'
                }`}
              >
                {getLinkStatus(formData[item.field])}
              </p>
            </div>
          ))}
        </div>

        <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">
            Upload Pitch Deck / Founder Assets
          </p>

          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.doc,.docx"
            disabled={uploading}
            onChange={(e) =>
              onFileUpload?.({
                file: e.target.files?.[0],
                folder: 'assets',
                metadataKey: 'pitch_deck_file_url',
              })
            }
            className="block w-full text-sm text-gray-600"
          />

          {formData.metadata?.pitch_deck_file_url && (
            <p className="text-xs text-green-700 font-semibold mt-2">
              Uploaded: {formData.metadata.pitch_deck_file_url}
            </p>
          )}
        </div>
      </EditSection>

      <button
        type="button"
        onClick={onSave}
        disabled={saving}
        className="w-full py-3 bg-[#1B2D7F] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#2A3F8F] disabled:opacity-50"
      >
        {saving ? (
          <>
            <Loader className="w-4 h-4 animate-spin" />
            Saving…
          </>
        ) : (
          <>
            <Save className="w-4 h-4" />
            Save Founder Profile
          </>
        )}
      </button>
    </form>
  );
}

// ─── SHARED UI PRIMITIVES ───
const Section = ({ title, icon, children }) => (
  <section className="space-y-4 pt-6 border-t border-gray-100 first:pt-0 first:border-t-0">
    <div className="flex items-center gap-2 mb-3">
      {icon}
      <h2 className="text-lg font-bold text-gray-900 ss">{title}</h2>
    </div>
    {children}
  </section>
);

const EditSection = ({ title, icon, hint, children }) => (
  <section className="space-y-4 pt-8 border-t border-gray-100 first:pt-0 first:border-t-0">
    <div>
      <p className="sec-label">
        {icon}
        {title}
      </p>
      {hint && <p className="text-xs text-gray-400 -mt-1.5 mb-3">{hint}</p>}
    </div>
    {children}
  </section>
);

const FormInput = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  required,
  disabled,
  icon,
  hint,
}) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}

    <div className="relative">
      {icon && (
        <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">
          {icon}
        </div>
      )}

      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange?.(e.target.value)}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`inp ${icon ? 'pl-10' : ''}`}
      />
    </div>

    {hint && <p className="text-xs text-gray-400 -mt-1">{hint}</p>}
  </div>
);

const SelectField = ({
  label,
  value,
  onChange,
  options,
  placeholder,
}) => (
  <div className="space-y-1.5">
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
      {label}
    </label>

    <select
      className="sel"
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">{placeholder}</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
    </select>
  </div>
);

const FormTextarea = ({
  label,
  value,
  onChange,
  placeholder,
  rows = 4,
  max,
}) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
        {label}
      </label>
    )}

    <textarea
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      rows={rows}
      maxLength={max}
      className="ta"
    />

    {max && (
      <p className="text-xs text-gray-400 text-right">
        {(value || '').length}/{max}
      </p>
    )}
  </div>
);

const Empty = ({ label, action }) => (
  <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
    <p className="text-sm text-gray-400 italic">{label}</p>
    {action}
  </div>
);

const DeleteModal = ({ onCancel, onConfirm }) => {
  useEffect(() => {
    const h = (e) => e.key === 'Escape' && onCancel();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [onCancel]);

  const btnRef = useRef(null);

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <div
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="delete-title"
      onClick={(e) => e.target === e.currentTarget && onCancel()}
    >
      <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl text-center lift">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>

        <h2 id="delete-title" className="text-2xl font-black text-gray-900 mb-2 ss">
          Delete Account?
        </h2>

        <p className="text-gray-600 mb-6 text-sm">
          This action is permanent. Your founder profile, startup data, connections,
          and activity may be deleted or deactivated.
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={onConfirm}
            ref={btnRef}
            className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors"
          >
            Delete Account
          </button>
        </div>
      </div>
    </div>
  );
};
