// src/pages/MentorRolePages/MentorProfile.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../../components/landing-page/RoleNavbar';
import AIProfileQualityChecker from '../../components/AIProfileQualityChecker';
import {
  User,
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
  Linkedin,
  FileText,
  Globe,
  Upload,
  X,
  BookOpen,
  Users,
  DollarSign,
  Plus,
  Lightbulb,
  Clock,
  Award,
  Star,
  Building2,
  Target,
} from 'lucide-react';
import toast from 'react-hot-toast';

import {
  fetchMentorProfile,
  calcMentorCompletion,
  saveMentorBaseProfile,
  saveMentorDetails,
  uploadMentorAvatar,
} from '../../services/mentorService';

const STYLES = `
  :root { --primary: #98DE38; --primary-dark: #7EC42E; --secondary: #1B2D7F; --secondary-light: #2A3F8F; --white: #fff; --gray-50: #F9FAFB; --gray-100: #F3F4F6; --gray-200: #E5E7EB; }
  .ss { font-family: 'Syne', sans-serif; }
  .dm { font-family: 'DM Sans', sans-serif; }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .prog { background: linear-gradient(90deg, var(--primary), var(--primary-dark)); transition: width .4s ease; }
  .inp { width: 100%; padding: 10px 14px; background: var(--gray-50); border: 2px solid var(--gray-200); border-radius: 12px; font-size: 14px; outline: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif; }
  .inp:focus { border-color: var(--primary); background: var(--white); }
  .inp:disabled { opacity: .55; cursor: not-allowed; }
  .sel { width: 100%; padding: 10px 36px 10px 14px; background: var(--gray-50); border: 2px solid var(--gray-200); border-radius: 12px; font-size: 14px; outline: none; appearance: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif; }
  .sel:focus { border-color: var(--primary); background: var(--white); }
  .ta { width: 100%; padding: 10px 14px; background: var(--gray-50); border: 2px solid var(--gray-200); border-radius: 12px; font-size: 14px; outline: none; resize: none; transition: border-color .15s; font-family: 'DM Sans', sans-serif; }
  .ta:focus { border-color: var(--primary); background: var(--white); }
  .sec-label { font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: .06em; color: var(--secondary); display: flex; align-items: center; gap: 6px; margin-bottom: 16px; }
  .fade-in { animation: fi .3s ease both; }
  @keyframes fi { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
  button:focus-visible, .inp:focus-visible, .sel:focus-visible, .ta:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
  @keyframes fadeIn { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: none; } }
  .animate-fadeIn { animation: fadeIn 0.3s ease-out both; }
  .line-clamp-4 { display: -webkit-box; -webkit-line-clamp: 4; -webkit-box-orient: vertical; overflow: hidden; }
  .chip { padding: 8px 12px; border: 2px solid var(--gray-200); border-radius: 999px; background: #fff; color: #4B5563; font-size: 12px; font-weight: 700; transition: all .15s; }
  .chip:hover { border-color: rgba(152,222,56,.55); }
  .chip.selected { border-color: var(--primary); background: rgba(152,222,56,.10); color: #1B2D7F; }
`;

const EXPERTISE_CHIPS = [
  'Product',
  'Fundraising',
  'Growth / Marketing',
  'Technical / Engineering',
  'Legal / Compliance',
  'Finance / CFO',
  'Design / UX',
  'Sales',
  'Operations',
  'AI / ML',
  'EdTech',
  'HealthTech',
  'FinTech',
  'SaaS',
  'AgriTech',
  'CleanTech',
];

const HELP_CHIPS = [
  'Idea validation',
  'Finding product-market fit',
  'Fundraising pitch',
  'Team building',
  'Technical architecture',
  'Marketing strategy',
  'Financial modelling',
  'Legal setup',
  'Scaling operations',
  'Founder resilience',
];

const ROLE_EXPERTISE_MAP = {
  product: ['Product Strategy', 'Roadmapping', 'User Research', 'MVP Planning', 'Product Analytics'],
  founder: ['Startup Strategy', 'Fundraising', 'Hiring', 'Go-To-Market', 'Investor Readiness'],
  growth: ['Growth Loops', 'Marketing Strategy', 'Sales Funnel', 'Community Building', 'Retention'],
  engineer: ['Technical Architecture', 'MVP Build', 'Code Review', 'Scalability', 'AI / ML'],
  design: ['Design / UX', 'User Research', 'Product Discovery', 'Branding', 'Prototype Review'],
  finance: ['Financial Modelling', 'Pricing Strategy', 'Unit Economics', 'Fundraising Readiness'],
  legal: ['Legal / Compliance', 'Company Setup', 'IP Strategy', 'Contracts'],
  operations: ['Operations', 'Process Design', 'Hiring Systems', 'Customer Success'],
};

const EXTRA_HELP_CHIPS = [
  'Pitch deck review',
  'Investor introductions',
  'Pricing strategy',
  'Hiring interview practice',
  'Product analytics',
  'Customer discovery',
  'MVP scoping',
  'Go-to-market experiments',
  'Unit economics',
  'Leadership coaching',
  'Security review',
  'Compliance planning',
];

const AVAIL_CHIPS = [
  '1:1 Video calls',
  'Async messages',
  'Email Q&A',
  'Co-working sessions',
  'Pitch practice',
  'Portfolio review',
  'Platform live meeting',
  'Office hours',
  'Startup teardown',
  'Mock investor meeting',
  'Document review',
  'Accountability sprint',
];

const STYLE_OPTS = [
  'Hands-on (weekly check-ins)',
  'Advisory (monthly strategy)',
  'Sounding Board (as needed)',
  'Peer accountability',
  'Group sessions',
  'Coach-led sprint',
  'Office-hours style',
  'Tactical problem solving',
  'Accountability partner',
  'Deep-dive workshop',
  'Board advisor style',
];
const MENTEE_OPTS = ['Students', 'Early-stage founders', 'Solo founders', 'Technical founders', 'Non-technical founders', 'Women founders', 'First-time founders', 'Student founders', 'Pre-MVP founders', 'Post-MVP founders', 'Fundraising founders', 'Growth-stage founders'];
const INDUSTRY_SUPPORT_OPTS = ['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'E-commerce', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech', 'AI / ML', 'Social Impact', 'Gaming'];
const LANGUAGE_OPTS = ['English', 'Urdu', 'Hindi', 'Arabic', 'Punjabi', 'Sindhi', 'Pashto', 'Balochi', 'Persian', 'Turkish', 'French', 'Spanish', 'German', 'Chinese', 'Japanese', 'Korean', 'Bengali', 'Tamil', 'Malay', 'Indonesian'];
const TIMEZONE_OPTS = ['Asia/Karachi', 'UTC', 'Asia/Dubai', 'Asia/Kolkata', 'Europe/London', 'America/New_York', 'Remote / flexible'];
const MENTORSHIP_MODE_OPTS = ['Platform live meeting', 'Async messaging', 'Hybrid', 'In-person', 'Group office hours'];

const slugify = (text) =>
  String(text || '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '');

const normalizeText = (value) => String(value || '').toLowerCase();

function getSuggestedExpertise(form) {
  const text = normalizeText(`${form.current_role} ${form.current_company} ${form.years_experience}`);
  const suggestions = new Set();

  Object.entries(ROLE_EXPERTISE_MAP).forEach(([keyword, values]) => {
    if (text.includes(keyword)) values.forEach((item) => suggestions.add(item));
  });

  if (Number(form.years_experience || 0) >= 5) {
    ['Leadership', 'Strategy', 'Team Building'].forEach((item) => suggestions.add(item));
  }

  return Array.from(new Set([...suggestions, ...EXPERTISE_CHIPS])).slice(0, 18);
}

function getSuggestedHelp(form) {
  const base = new Set([...HELP_CHIPS, ...EXTRA_HELP_CHIPS]);
  getSuggestedExpertise(form).forEach((item) => {
    if (normalizeText(item).includes('product')) base.add('Product roadmap review');
    if (normalizeText(item).includes('fund')) base.add('Fundraising pitch');
    if (normalizeText(item).includes('technical') || normalizeText(item).includes('architecture')) base.add('Technical architecture');
    if (normalizeText(item).includes('growth')) base.add('Marketing strategy');
  });

  return Array.from(base).slice(0, 20);
}

function getSuggestedIndustries(form) {
  const text = normalizeText([
    form.current_role,
    form.current_company,
    ...(form.expertise_areas || []),
    ...(form.companies_worked || []),
    ...(form.companies_founded || []),
  ].join(' '));

  const suggested = INDUSTRY_SUPPORT_OPTS.filter((item) => {
    const key = normalizeText(item).replace(/[^a-z0-9]/g, '');
    return text.includes(normalizeText(item)) || text.replace(/[^a-z0-9]/g, '').includes(key);
  });

  return Array.from(new Set([...suggested, ...INDUSTRY_SUPPORT_OPTS]));
}

function hasWorkHistory(form) {
  return Boolean(
    form.current_company ||
    (form.companies_worked || []).length > 0 ||
    (form.companies_founded || []).length > 0
  );
}

function hasEvidence(form, key) {
  return Boolean(
    form.metadata?.[`${key}_url`] ||
    form.metadata?.[`${key}_file_url`]
  );
}

function getLinkStatus(url) {
  if (!url) return 'Not added';
  try {
    const parsed = new URL(url);
    return ['http:', 'https:'].includes(parsed.protocol) ? 'Format verified' : 'Invalid protocol';
  } catch {
    return 'Invalid URL';
  }
}

const makeEmpty = (user) => ({
  id: null,
  user_id: user?.id || '',
  full_name: '',
  email: user?.email || '',
  user_type: 'mentor',
  location: '',
  bio: '',
  avatar_url: '',
  linkedin_url: '',
  github_url: '',
  twitter_url: '',
  expertise_areas: [],
  years_experience: 0,
  current_role: '',
  current_company: '',
  companies_worked: [],
  companies_founded: [],
  successful_exits: 0,
  mentorship_style: '',
  can_help_with: [],
  available_for: [],
  mentorship_capacity: 3,
  current_mentees: 0,
  hourly_rate: '',
  is_pro_bono: false,
  booking_url: '',
  preferred_mentees: [],
  industries_supported: [],
  languages: [],
  availability_hours: '',
  timezone: '',
  mentorship_mode: '',
  success_stories: '',
  is_public: true,
  is_active: true,
  metadata: {},
  profile_completion: 0,
  onboarding_completed: false,
  created_at: '',
  updated_at: '',
});

function calcCompletionWithBreakdown(form) {
  const percentage = calcMentorCompletion(form, form);
  const checks = [
    { field: 'full_name', condition: (form.full_name || '').trim().length > 1, label: 'Full name' },
    { field: 'bio', condition: (form.bio || '').trim().length > 30, label: 'Bio (30+ chars)' },
    { field: 'avatar', condition: !!form.avatar_url, label: 'Profile photo' },
    { field: 'location', condition: (form.location || '').trim().length > 1, label: 'Location' },
    { field: 'linkedin', condition: !!form.linkedin_url, label: 'LinkedIn profile' },
    { field: 'expertise_areas', condition: (form.expertise_areas || []).length >= 2, label: '2+ expertise areas' },
    { field: 'years_experience', condition: Number(form.years_experience || 0) > 0, label: 'Years of experience' },
    { field: 'current_role', condition: !!form.current_role, label: 'Current role' },
    { field: 'current_company', condition: !!form.current_company, label: 'Current company' },
    { field: 'can_help_with', condition: (form.can_help_with || []).length >= 2, label: '2+ help areas' },
    { field: 'mentorship_style', condition: !!form.mentorship_style, label: 'Mentorship style' },
    { field: 'companies_worked', condition: (form.companies_worked || []).length > 0, label: 'Company experience' },
    { field: 'work_evidence', condition: !hasWorkHistory(form) || hasEvidence(form, 'work_evidence'), label: 'Work evidence' },
    { field: 'pricing', condition: !!form.hourly_rate || form.is_pro_bono, label: 'Pricing preference' },
    { field: 'available_for', condition: (form.available_for || []).length > 0, label: 'Availability' },
    { field: 'timezone', condition: !!form.timezone, label: 'Timezone' },
    { field: 'mentorship_mode', condition: !!form.mentorship_mode, label: 'Mentorship mode' },
  ];

  return {
    percentage,
    missing: checks.filter((item) => !item.condition).slice(0, 3),
    all: checks,
  };
}

function getMentorQualityChecks(form) {
  const completion = calcCompletionWithBreakdown(form);
  const required = [
    { field: 'full_name', condition: (form.full_name || '').trim().length > 1, label: 'Full name' },
    { field: 'bio', condition: (form.bio || '').trim().length > 30, label: 'Mentor bio with at least 30 characters' },
    { field: 'location', condition: (form.location || '').trim().length > 1, label: 'City / country' },
    { field: 'expertise_areas', condition: (form.expertise_areas || []).length >= 2, label: 'At least 2 expertise areas' },
    { field: 'years_experience', condition: Number(form.years_experience || 0) > 0, label: 'Years of experience' },
    { field: 'current_role', condition: !!form.current_role, label: 'Current role' },
    { field: 'can_help_with', condition: (form.can_help_with || []).length >= 2, label: 'At least 2 help areas' },
    { field: 'mentorship_style', condition: !!form.mentorship_style, label: 'Mentorship style' },
    { field: 'available_for', condition: (form.available_for || []).length > 0, label: 'Available for' },
    { field: 'work_evidence', condition: !hasWorkHistory(form) || hasEvidence(form, 'work_evidence'), label: 'Work/startup evidence' },
    { field: 'mentees_evidence', condition: Number(form.current_mentees || 0) <= 0 || hasEvidence(form, 'mentees_evidence'), label: 'Current mentees evidence' },
  ];

  const recommended = completion.all.filter((item) => {
    return !required.some((req) => req.field === item.field);
  });

  return { required, recommended };
}

const normalizeProfile = (user, profile = {}, mentorProfile = {}) => ({
  ...makeEmpty(user),
  id: mentorProfile.id || null,
  user_id: mentorProfile.user_id || user?.id || '',
  full_name: profile.full_name || '',
  email: profile.email || user?.email || '',
  user_type: profile.user_type || 'mentor',
  location: profile.location || '',
  bio: profile.bio || '',
  avatar_url: profile.avatar_url || '',
  linkedin_url: profile.linkedin_url || '',
  github_url: profile.github_url || '',
  twitter_url: profile.twitter_url || '',
  expertise_areas: Array.isArray(mentorProfile.expertise_areas) ? mentorProfile.expertise_areas : [],
  years_experience: mentorProfile.years_experience || 0,
  current_role: mentorProfile.current_role || '',
  current_company: mentorProfile.current_company || '',
  companies_worked: Array.isArray(mentorProfile.companies_worked) ? mentorProfile.companies_worked : [],
  companies_founded: Array.isArray(mentorProfile.companies_founded) ? mentorProfile.companies_founded : [],
  successful_exits: mentorProfile.successful_exits || 0,
  mentorship_style: mentorProfile.mentorship_style || '',
  can_help_with: Array.isArray(mentorProfile.can_help_with) ? mentorProfile.can_help_with : [],
  available_for: Array.isArray(mentorProfile.available_for) ? mentorProfile.available_for : [],
  mentorship_capacity: mentorProfile.mentorship_capacity || 3,
  current_mentees: mentorProfile.current_mentees || 0,
  hourly_rate: mentorProfile.hourly_rate || '',
  is_pro_bono: Boolean(mentorProfile.is_pro_bono),
  booking_url: mentorProfile.booking_url || '',
  preferred_mentees: Array.isArray(mentorProfile.preferred_mentees) ? mentorProfile.preferred_mentees : [],
  industries_supported: Array.isArray(mentorProfile.industries_supported) ? mentorProfile.industries_supported : [],
  languages: Array.isArray(mentorProfile.languages) ? mentorProfile.languages : [],
  availability_hours: mentorProfile.availability_hours || '',
  timezone: mentorProfile.timezone || '',
  mentorship_mode: mentorProfile.mentorship_mode || '',
  success_stories: mentorProfile.success_stories || '',
  is_public: mentorProfile.is_public !== false,
  is_active: mentorProfile.is_active !== false,
  metadata: mentorProfile.metadata || {},
  profile_completion: mentorProfile.profile_completion || 0,
  onboarding_completed: Boolean(mentorProfile.onboarding_completed),
  created_at: mentorProfile.created_at || '',
  updated_at: mentorProfile.updated_at || profile.updated_at,
});

export default function MentorProfilePage() {
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
  const [formData, setFormData] = useState(makeEmpty(user));
  const [companyInput, setCompanyInput] = useState('');
  const [foundedInput, setFoundedInput] = useState('');

  const STORAGE_KEY = `mentor_profile_draft_${user?.id || 'anon'}`;
  const SESSION_KEY = `mentor_profile_session_${user?.id || 'anon'}`;

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
    } catch (err) {
      console.warn('Draft save failed:', err);
    }
  }, [SESSION_KEY, STORAGE_KEY, user?.id]);

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
        if (localDraft._userId === user?.id && Date.now() - localDraft._savedAt < 7 * 24 * 60 * 60 * 1000) {
          return localDraft;
        }
        localStorage.removeItem(STORAGE_KEY);
      }

      return null;
    } catch (err) {
      console.warn('Draft load failed:', err);
      return null;
    }
  }, [SESSION_KEY, STORAGE_KEY, user?.id]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }, [SESSION_KEY, STORAGE_KEY]);

  useEffect(() => {
    if (isEditMode && formData.full_name) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveDraft(formData);
        setHasUnsavedChanges(true);
      }, 100);
    }

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData, isEditMode, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (isEditMode && hasUnsavedChanges) {
        saveDraft(formData);
        event.preventDefault();
        event.returnValue = '';
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [formData, hasUnsavedChanges, isEditMode, saveDraft]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;

    setLoading(true);

    try {
      const draft = loadDraft();
      const { profile, mentorProfile } = await fetchMentorProfile(user.id);
      const dbUpdatedAt = new Date(profile?.updated_at || mentorProfile?.updated_at || 0).getTime();
      const draftUpdatedAt = draft?._savedAt || 0;
      const useDraft = draft && draft._userId === user.id && draftUpdatedAt >= dbUpdatedAt;
      const normalized = useDraft
        ? {
            ...normalizeProfile(user, profile, mentorProfile),
            ...draft,
          }
        : normalizeProfile(user, profile, mentorProfile);

      snapRef.current = normalized;
      setFormData(normalized);

      const shouldStayInEditMode = useDraft && draft?._hasUnsavedChanges;
      setIsEditMode(Boolean(shouldStayInEditMode));
      setHasUnsavedChanges(Boolean(shouldStayInEditMode));

      if (shouldStayInEditMode) {
        toast('Unsaved changes restored', {
          duration: 3000,
          style: {
            background: '#1B2D7F',
            color: '#fff',
          },
        });
      }
    } catch (err) {
      console.error('Mentor profile load error:', err);
      toast.error('Failed to load profile');
      setIsEditMode(true);
      setHasUnsavedChanges(true);
    } finally {
      setLoading(false);
    }
  }, [loadDraft, user]);

  useEffect(() => {
    if (user) loadProfile();
  }, [loadProfile, user]);

  const updateField = useCallback((key, value) => {
    setFormData((prev) => ({
      ...prev,
      [key]: value,
    }));
    setHasUnsavedChanges(true);
  }, []);

  const toggleArrayField = (field, value) => {
    setFormData((prev) => {
      const values = prev[field] || [];
      return {
        ...prev,
        [field]: values.includes(value)
          ? values.filter((item) => item !== value)
          : [...values, value],
      };
    });
    setHasUnsavedChanges(true);
  };

  const addTag = (field, value, setInput) => {
    const clean = value.trim();
    if (!clean || (formData[field] || []).includes(clean)) return;

    setFormData((prev) => ({
      ...prev,
      [field]: [...(prev[field] || []), clean],
    }));
    setInput('');
    setHasUnsavedChanges(true);
  };

  const removeTag = (field, value) => {
    setFormData((prev) => ({
      ...prev,
      [field]: (prev[field] || []).filter((item) => item !== value),
    }));
    setHasUnsavedChanges(true);
  };

  const handleUpdate = async (event) => {
    if (event) event.preventDefault();
    if (saving) return;

    const quality = getMentorQualityChecks(formData);
    const missingRequired = quality.required.filter((item) => !item.condition);
    if (missingRequired.length > 0) {
      const message = `Please complete required fields: ${missingRequired.map((item) => item.label).join(', ')}`;
      setSaveError(message);
      toast.error('Complete required mentor fields first');
      return;
    }

    const linkValues = {
      linkedin_url: formData.linkedin_url,
      mentor_portfolio_url: formData.metadata?.mentor_portfolio_url,
      mentor_video_url: formData.metadata?.mentor_video_url,
      work_evidence_url: formData.metadata?.work_evidence_url,
      mentees_evidence_url: formData.metadata?.mentees_evidence_url,
      success_story_url: formData.metadata?.success_story_url,
    };
    const invalidLinks = Object.entries(linkValues)
      .filter(([, value]) => value && getLinkStatus(value) !== 'Format verified')
      .map(([field]) => field);

    if (invalidLinks.length > 0) {
      const message = `Please fix invalid links: ${invalidLinks.join(', ')}`;
      setSaveError(message);
      toast.error('Fix invalid mentor links first');
      return;
    }

    setSaving(true);
    setSaveError('');

    try {
      const completion = calcCompletionWithBreakdown(formData).percentage;
      const payload = {
        ...formData,
        booking_url: '',
        github_url: '',
        twitter_url: '',
        metadata: {
          ...(formData.metadata || {}),
          link_verification: Object.fromEntries(
            Object.entries(linkValues).map(([field, value]) => [field, getLinkStatus(value)])
          ),
          verified_at: new Date().toISOString(),
        },
        profile_completion: completion,
        onboarding_completed: true,
      };

      await saveMentorBaseProfile(user.id, payload);
      await saveMentorDetails(user.id, payload);

      clearDraft();
      setHasUnsavedChanges(false);
      toast.success('Profile saved!', {
        style: {
          background: '#98DE38',
          color: '#000',
        },
      });
      setIsEditMode(false);
      await loadProfile();
    } catch (err) {
      console.error('Mentor profile save error:', err);
      setSaveError(err.message || 'Error saving');
      toast.error('Failed to save');
      if (snapRef.current) setFormData(snapRef.current);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (event) => {
    const file = event.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) {
      toast.error('Select a valid image under 5MB');
      return;
    }

    setUploading(true);

    try {
      const url = await uploadMentorAvatar(user.id, file);
      updateField('avatar_url', url);
      toast.success('Avatar updated!');
    } catch (err) {
      console.error('Avatar upload error:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleMentorFileUpload = async ({ file, folder, metadataKey }) => {
    if (!file || !user?.id) return;
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Select a file under 10MB');
      return;
    }

    setUploading(true);

    try {
      const ext = file.name.split('.').pop()?.toLowerCase() || 'bin';
      const cleanName = slugify(file.name.replace(/\.[^.]+$/, '')) || 'document';
      const filePath = `mentors/${user.id}/${folder}/${Date.now()}-${cleanName}.${ext}`;
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
      console.error('Mentor document upload error:', err);
      toast.error(err.message || 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', user.id);
      await supabase.auth.signOut();
      clearDraft();
      toast.success('Account deactivated');
      navigate('/');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Failed to deactivate');
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

  const completion = calcCompletionWithBreakdown(formData);
  const qualityChecks = getMentorQualityChecks(formData);
  const spotsLeft = Math.max(0, Number(formData.mentorship_capacity || 3) - Number(formData.current_mentees || 0));

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
                    Complete Your Profile
                  </h3>
                  <p className="text-sm text-black/80 mt-1">
                    {completion.missing.length
                      ? `Next: ${completion.missing.map((item) => item.label).join(', ')}`
                      : 'Better matches await.'}
                  </p>
                </div>
                <div className="text-right sm:text-left">
                  <div className="text-3xl font-black ss">{completion.percentage}%</div>
                  <div className="text-xs text-black/70">Complete</div>
                </div>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow={completion.percentage}>
                <div className="h-full bg-black rounded-full transition-all" style={{ width: `${completion.percentage}%` }} />
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-6">
            <aside className="lg:col-span-1 space-y-5">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center lift">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full g-brand mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {formData.avatar_url ? (
                      <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <span className="text-white text-2xl font-bold ss">
                        {formData.full_name?.charAt(0)?.toUpperCase() || 'M'}
                      </span>
                    )}
                  </div>
                  {isEditMode && (
                    <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full cursor-pointer hover:scale-105 transition-transform shadow border">
                      {uploading ? <Loader className="w-4 h-4 text-gray-700 animate-spin" /> : <Camera className="w-4 h-4 text-gray-700" />}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" disabled={uploading} />
                    </label>
                  )}
                </div>
                <h2 className="font-black text-lg text-gray-900 mb-1 ss">
                  {formData.full_name || 'Your Name'}
                </h2>
                {formData.current_role && (
                  <p className="text-sm text-gray-500">{formData.current_role}</p>
                )}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-bold uppercase mt-2 border">
                  mentor
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
                          Saving...
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
                roleLabel="Mentor profile"
                completion={completion}
                requiredItems={qualityChecks.required}
                recommendedItems={qualityChecks.recommended}
              />
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                {!isEditMode ? (
                  <ViewMode formData={formData} spotsLeft={spotsLeft} />
                ) : (
                  <EditMode
                    formData={formData}
                    updateField={updateField}
                    toggleArrayField={toggleArrayField}
                    companyInput={companyInput}
                    setCompanyInput={setCompanyInput}
                    foundedInput={foundedInput}
                    setFoundedInput={setFoundedInput}
                    addTag={addTag}
                    removeTag={removeTag}
                    onFileUpload={handleMentorFileUpload}
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

function ViewMode({ formData, spotsLeft }) {
  return (
    <div className="space-y-10 dm">
      <header>
        <h1 className="text-3xl font-black text-gray-900 mb-1 ss">My Profile</h1>
        <p className="text-gray-500 text-sm">Your identity powers mentor, founder, and student matching.</p>
      </header>

      <Section title="Basic Information" icon={<User className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Full Name', value: formData.full_name, Icon: User },
            { label: 'Email', value: formData.email, Icon: Mail },
            { label: 'Location', value: formData.location, Icon: MapPin },
          ].map((item) => (
            <InfoTile key={item.label} item={item} />
          ))}
        </div>
        {formData.bio && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>About</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.bio}</p>
          </div>
        )}
      </Section>

      <Section title="Expertise" icon={<Star className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Current Role', value: formData.current_role, Icon: Briefcase },
            { label: 'Current Company', value: formData.current_company, Icon: Building2 },
            { label: 'Experience', value: formData.years_experience ? `${formData.years_experience} years` : '', Icon: Award },
          ].map((item) => (
            <InfoTile key={item.label} item={item} />
          ))}
        </div>

        {(formData.expertise_areas || []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {formData.expertise_areas.map((item) => (
              <span key={item} className="px-3 py-2 rounded-full text-xs font-semibold border" style={{ background: 'rgba(27,45,127,0.08)', color: '#1B2D7F', borderColor: 'rgba(27,45,127,0.2)' }}>
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Empty label="No expertise areas added yet. Add at least 2 to improve matching." />
        )}
      </Section>

      <Section title="Mentorship Details" icon={<BookOpen className="w-5 h-5 text-[#1B2D7F]" />}>
        {formData.mentorship_style && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mb-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">Mentorship Style</p>
            <p className="text-sm font-semibold text-gray-800">{formData.mentorship_style}</p>
          </div>
        )}

        {(formData.can_help_with || []).length > 0 ? (
          <div className="flex flex-wrap gap-2 mb-4">
            {formData.can_help_with.map((item) => (
              <span key={item} className="px-3 py-2 rounded-full text-xs font-semibold border" style={{ background: 'rgba(152,222,56,0.12)', color: '#1B2D7F', borderColor: '#98DE38' }}>
                {item}
              </span>
            ))}
          </div>
        ) : (
          <Empty label="No help areas specified. Add some to get relevant founder matches." />
        )}

        {(formData.available_for || []).length > 0 && (
          <div className="flex flex-wrap gap-2">
            {formData.available_for.map((item) => (
              <span key={item} className="px-3 py-2 rounded-full text-xs font-semibold border" style={{ background: 'rgba(27,45,127,0.05)', color: '#1B2D7F', borderColor: 'rgba(27,45,127,0.2)' }}>
                {item}
              </span>
            ))}
          </div>
        )}
      </Section>

      <Section title="Credibility" icon={<Award className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Successful Exits', value: formData.successful_exits || '0', Icon: TrendingIcon },
            { label: 'Worked At', value: (formData.companies_worked || []).length || '0', Icon: Building2 },
            { label: 'Founded', value: (formData.companies_founded || []).length || '0', Icon: Target },
          ].map((item) => (
            <InfoTile key={item.label} item={item} />
          ))}
        </div>

        {(formData.companies_worked || []).length > 0 && (
          <ChipGroup title="Companies Worked At" values={formData.companies_worked} />
        )}
        {(formData.companies_founded || []).length > 0 && (
          <ChipGroup title="Companies Founded" values={formData.companies_founded} />
        )}
      </Section>

      <Section title="Availability & Pricing" icon={<DollarSign className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: 'Capacity', value: `${formData.mentorship_capacity || 3} mentees max`, Icon: Users },
            { label: 'Open Spots', value: `${spotsLeft} available`, Icon: Clock },
            { label: 'Rate', value: formData.is_pro_bono ? 'Pro Bono' : formData.hourly_rate ? `$${formData.hourly_rate}/hr` : 'Not disclosed', Icon: DollarSign },
          ].map((item) => (
            <InfoTile key={item.label} item={item} />
          ))}
        </div>
      </Section>

      <Section title="Mentorship Logistics" icon={<Clock className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Availability Hours', value: formData.availability_hours, Icon: Clock },
            { label: 'Timezone', value: formData.timezone, Icon: Clock },
            { label: 'Mentorship Mode', value: formData.mentorship_mode, Icon: Users },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
        {(formData.preferred_mentees || []).length > 0 && <ChipGroup title="Preferred Mentees" values={formData.preferred_mentees} />}
        {(formData.industries_supported || []).length > 0 && <ChipGroup title="Industries Supported" values={formData.industries_supported} />}
        {(formData.languages || []).length > 0 && <ChipGroup title="Languages" values={formData.languages} />}
        {formData.success_stories && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>Success Stories</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.success_stories}</p>
          </div>
        )}
      </Section>

      <Section title="Links" icon={<LinkIcon className="w-5 h-5 text-[#1B2D7F]" />}>
        {[formData.linkedin_url, formData.metadata?.mentor_portfolio_url, formData.metadata?.mentor_video_url].some(Boolean) ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin, bg: 'bg-blue-50', color: 'text-blue-600' },
              { key: 'mentor_portfolio_url', label: 'Portfolio', Icon: FileText, bg: 'bg-gray-50', color: 'text-[#1B2D7F]', meta: true },
              { key: 'mentor_video_url', label: 'Video', Icon: Globe, bg: 'bg-gray-50', color: 'text-[#1B2D7F]', meta: true },
            ].filter((link) => link.meta ? formData.metadata?.[link.key] : formData[link.key]).map((link) => {
              const url = link.meta ? formData.metadata?.[link.key] : formData[link.key];

              return (
              <a key={link.key} href={url} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-4 rounded-xl hover:opacity-80 transition-all ${link.bg} ${link.color}`}>
                <link.Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide">{link.label}</p>
                  <p className="text-xs truncate opacity-80">{url.replace(/^https?:\/\//, '')}</p>
                </div>
                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              </a>
              );
            })}
          </div>
        ) : (
          <Empty label="No links added yet. Connect your profiles to boost verification." />
        )}
      </Section>
    </div>
  );
}

function EditMode({
  formData,
  updateField,
  toggleArrayField,
  companyInput,
  setCompanyInput,
  foundedInput,
  setFoundedInput,
  addTag,
  removeTag,
  onFileUpload,
  uploading,
}) {
  const completion = calcCompletionWithBreakdown(formData);
  const suggestedExpertise = getSuggestedExpertise(formData);
  const suggestedHelp = getSuggestedHelp(formData);
  const suggestedIndustries = getSuggestedIndustries(formData);

  return (
    <form onSubmit={(event) => event.preventDefault()} className="space-y-10 dm">
      <header>
        <h1 className="text-3xl font-black text-gray-900 ss mb-1">Edit Profile</h1>
        <p className="text-gray-400 text-sm">Basic info + Expertise + Mentorship details.</p>
      </header>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold ss" style={{ color: '#1B2D7F' }}>Profile Completion</span>
          <span className="font-black ss" style={{ color: '#1B2D7F' }}>{completion.percentage}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all prog" style={{ width: `${completion.percentage}%` }} />
        </div>
        {completion.missing.length > 0 && (
          <p className="text-xs text-gray-500 mt-2">
            Tip: Add {completion.missing.map((item) => item.label.toLowerCase()).join(', ')} to reach 100%
          </p>
        )}
      </div>

      <EditSection title="Basic Information" icon={<User className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Full Name *" value={formData.full_name} onChange={(value) => updateField('full_name', value)} icon={<User className="w-4 h-4" />} placeholder="Your full name" required />
          <FormInput label="Email" value={formData.email} disabled icon={<Mail className="w-4 h-4" />} hint="Contact support to change" />
          <FormInput label="City / Country" value={formData.location} onChange={(value) => updateField('location', value)} icon={<MapPin className="w-4 h-4" />} placeholder="e.g. Karachi, Pakistan" />
        </div>
        <FormTextarea label="About You" value={formData.bio} onChange={(value) => updateField('bio', value)} placeholder="2-3 sentences about your background, experience, and how you help founders..." rows={3} max={500} />
      </EditSection>

      <EditSection title="Expertise" icon={<Star className="w-4 h-4" />} hint="This improves founder, student, and mentor matching.">
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Current Role" value={formData.current_role} onChange={(value) => updateField('current_role', value)} icon={<Briefcase className="w-4 h-4" />} placeholder="e.g. Head of Product" />
          <FormInput label="Current Company" value={formData.current_company} onChange={(value) => updateField('current_company', value)} icon={<Building2 className="w-4 h-4" />} placeholder="e.g. Careem" />
          <FormInput label="Years of Experience" type="number" value={formData.years_experience ?? ''} onChange={(value) => updateField('years_experience', value === '' ? 0 : Number(value))} placeholder="e.g. 8" />
        </div>
        <ChipPicker
          values={suggestedExpertise}
          selected={formData.expertise_areas || []}
          onToggle={(value) => toggleArrayField('expertise_areas', value)}
        />
        <InlineArrayAdder
          value={formData.metadata?.custom_expertise || ''}
          onChange={(value) => updateField('metadata', { ...(formData.metadata || {}), custom_expertise: value })}
          onAdd={() => {
            const value = (formData.metadata?.custom_expertise || '').trim();
            if (!value) return;
            if (!(formData.expertise_areas || []).includes(value)) toggleArrayField('expertise_areas', value);
            updateField('metadata', { ...(formData.metadata || {}), custom_expertise: '' });
          }}
          placeholder="Other expertise..."
        />
      </EditSection>

      <EditSection title="Mentorship Details" icon={<BookOpen className="w-4 h-4" />} hint="Set expectations and attract the right mentees.">
        <div className="space-y-1.5">
          <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mentorship Style</label>
          <select className="sel" value={formData.mentorship_style || ''} onChange={(event) => updateField('mentorship_style', event.target.value)}>
            <option value="">Select your style...</option>
            {STYLE_OPTS.map((style) => (
              <option key={style} value={style}>{style}</option>
            ))}
          </select>
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">What I Can Help With</p>
          <ChipPicker
            values={suggestedHelp}
            selected={formData.can_help_with || []}
            onToggle={(value) => toggleArrayField('can_help_with', value)}
          />
          <InlineArrayAdder
            value={formData.metadata?.custom_help || ''}
            onChange={(value) => updateField('metadata', { ...(formData.metadata || {}), custom_help: value })}
            onAdd={() => {
              const value = (formData.metadata?.custom_help || '').trim();
              if (!value) return;
              if (!(formData.can_help_with || []).includes(value)) toggleArrayField('can_help_with', value);
              updateField('metadata', { ...(formData.metadata || {}), custom_help: '' });
            }}
            placeholder="Other help area..."
          />
        </div>

        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Available For</p>
          <ChipPicker
            values={AVAIL_CHIPS}
            selected={formData.available_for || []}
            onToggle={(value) => toggleArrayField('available_for', value)}
          />
          <InlineArrayAdder
            value={formData.metadata?.custom_available_for || ''}
            onChange={(value) => updateField('metadata', { ...(formData.metadata || {}), custom_available_for: value })}
            onAdd={() => {
              const value = (formData.metadata?.custom_available_for || '').trim();
              if (!value) return;
              if (!(formData.available_for || []).includes(value)) toggleArrayField('available_for', value);
              updateField('metadata', { ...(formData.metadata || {}), custom_available_for: '' });
            }}
            placeholder="Other availability..."
          />
        </div>
      </EditSection>

      <EditSection title="Credibility" icon={<Award className="w-4 h-4" />} hint="Past experience is your trust signal.">
        <FormInput label="Successful Exits" type="number" value={formData.successful_exits ?? ''} onChange={(value) => updateField('successful_exits', value === '' ? 0 : Number(value))} placeholder="0" />
        <TagInput
          label="Companies Worked At"
          tags={formData.companies_worked || []}
          inputValue={companyInput}
          onInputChange={setCompanyInput}
          onAdd={() => addTag('companies_worked', companyInput, setCompanyInput)}
          onRemove={(value) => removeTag('companies_worked', value)}
          placeholder="e.g. Google"
        />
        <TagInput
          label="Companies Founded"
          tags={formData.companies_founded || []}
          inputValue={foundedInput}
          onInputChange={setFoundedInput}
          onAdd={() => addTag('companies_founded', foundedInput, setFoundedInput)}
          onRemove={(value) => removeTag('companies_founded', value)}
          placeholder="e.g. MyStartup"
        />
        {hasWorkHistory(formData) && (
          <ProofBox
            title="Work / Startup Evidence"
            description="Upload or link proof such as portfolio, company profile, case study, product demo, docs, or a short video."
            url={formData.metadata?.work_evidence_url || ''}
            onUrlChange={(value) => updateField('metadata', { ...(formData.metadata || {}), work_evidence_url: value })}
            filePath={formData.metadata?.work_evidence_file_url}
            onFileChange={(file) => onFileUpload?.({ file, folder: 'credibility', metadataKey: 'work_evidence_file_url' })}
            uploading={uploading}
          />
        )}
      </EditSection>

      <EditSection title="Availability & Pricing" icon={<DollarSign className="w-4 h-4" />} hint="Capacity and pricing help founders understand your availability.">
        <div className="grid md:grid-cols-3 gap-4">
          <FormInput label="Max Concurrent Mentees" type="number" value={formData.mentorship_capacity ?? ''} onChange={(value) => updateField('mentorship_capacity', value === '' ? 3 : Number(value))} placeholder="3" />
          <FormInput label="Currently Mentoring" type="number" value={formData.current_mentees ?? ''} onChange={(value) => updateField('current_mentees', value === '' ? 0 : Number(value))} placeholder="0" />
          <FormInput label="Hourly Rate (USD)" type="number" value={formData.hourly_rate ?? ''} onChange={(value) => updateField('hourly_rate', value === '' ? '' : Number(value))} placeholder="e.g. 100" disabled={formData.is_pro_bono} />
        </div>
        <label className="flex items-center gap-3 p-4 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-[#98DE38]/50 transition-all">
          <input
            type="checkbox"
            checked={!!formData.is_pro_bono}
            onChange={(event) => {
              updateField('is_pro_bono', event.target.checked);
              if (event.target.checked) updateField('hourly_rate', '');
            }}
            className="w-4 h-4 rounded border-gray-300 text-[#1B2D7F] focus:ring-[#98DE38]"
          />
          <div>
            <p className="text-sm font-semibold text-gray-700">I mentor pro bono (free)</p>
            <p className="text-xs text-gray-400">This helps students and early founders find you faster.</p>
          </div>
        </label>
        {Number(formData.current_mentees || 0) > 0 && (
          <ProofBox
            title="Current Mentees Evidence"
            description="Add proof that you are actively mentoring, such as a testimonial, session screenshot, program page, PDF, video, or public mentor profile."
            url={formData.metadata?.mentees_evidence_url || ''}
            onUrlChange={(value) => updateField('metadata', { ...(formData.metadata || {}), mentees_evidence_url: value })}
            filePath={formData.metadata?.mentees_evidence_file_url}
            onFileChange={(file) => onFileUpload?.({ file, folder: 'mentees-proof', metadataKey: 'mentees_evidence_file_url' })}
            uploading={uploading}
          />
        )}
      </EditSection>

      <EditSection title="Mentorship Logistics" icon={<Clock className="w-4 h-4" />} hint="Scheduling happens inside the platform, so this only captures availability, fit, and support preferences.">
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Availability Hours" value={formData.availability_hours} onChange={(value) => updateField('availability_hours', value)} icon={<Clock className="w-4 h-4" />} placeholder="e.g. Sat-Sun, 6-9 PM" />
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Timezone</label>
            <select className="sel" value={formData.timezone || ''} onChange={(event) => updateField('timezone', event.target.value)}>
              <option value="">Select timezone...</option>
              {TIMEZONE_OPTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Mentorship Mode</label>
            <select className="sel" value={formData.mentorship_mode || ''} onChange={(event) => updateField('mentorship_mode', event.target.value)}>
              <option value="">Select mode...</option>
              {MENTORSHIP_MODE_OPTS.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Preferred Mentees</p>
          <ChipPicker values={MENTEE_OPTS} selected={formData.preferred_mentees || []} onToggle={(value) => toggleArrayField('preferred_mentees', value)} />
          <InlineArrayAdder
            value={formData.metadata?.custom_preferred_mentee || ''}
            onChange={(value) => updateField('metadata', { ...(formData.metadata || {}), custom_preferred_mentee: value })}
            onAdd={() => {
              const value = (formData.metadata?.custom_preferred_mentee || '').trim();
              if (!value) return;
              if (!(formData.preferred_mentees || []).includes(value)) toggleArrayField('preferred_mentees', value);
              updateField('metadata', { ...(formData.metadata || {}), custom_preferred_mentee: '' });
            }}
            placeholder="Other mentee type..."
          />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Industries Supported</p>
          <ChipPicker values={suggestedIndustries} selected={formData.industries_supported || []} onToggle={(value) => toggleArrayField('industries_supported', value)} />
          <InlineArrayAdder
            value={formData.metadata?.custom_industry || ''}
            onChange={(value) => updateField('metadata', { ...(formData.metadata || {}), custom_industry: value })}
            onAdd={() => {
              const value = (formData.metadata?.custom_industry || '').trim();
              if (!value) return;
              if (!(formData.industries_supported || []).includes(value)) toggleArrayField('industries_supported', value);
              updateField('metadata', { ...(formData.metadata || {}), custom_industry: '' });
            }}
            placeholder="Other industry..."
          />
        </div>
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Languages</p>
          <ChipPicker values={LANGUAGE_OPTS} selected={formData.languages || []} onToggle={(value) => toggleArrayField('languages', value)} />
          <InlineArrayAdder
            value={formData.metadata?.custom_language || ''}
            onChange={(value) => updateField('metadata', { ...(formData.metadata || {}), custom_language: value })}
            onAdd={() => {
              const value = (formData.metadata?.custom_language || '').trim();
              if (!value) return;
              if (!(formData.languages || []).includes(value)) toggleArrayField('languages', value);
              updateField('metadata', { ...(formData.metadata || {}), custom_language: '' });
            }}
            placeholder="Search/add another language..."
          />
        </div>
        <FormTextarea label="Success Stories" value={formData.success_stories} onChange={(value) => updateField('success_stories', value)} placeholder="Share outcomes, mentee wins, exits, funding, launches, or career progress you helped with." rows={3} max={700} />
        <ProofBox
          title="Success Story Proof"
          description="Optional but recommended: attach a short video, image, testimonial, deck, or public link related to a mentee outcome."
          url={formData.metadata?.success_story_url || ''}
          onUrlChange={(value) => updateField('metadata', { ...(formData.metadata || {}), success_story_url: value })}
          filePath={formData.metadata?.success_story_file_url}
          onFileChange={(file) => onFileUpload?.({ file, folder: 'success-stories', metadataKey: 'success_story_file_url' })}
          uploading={uploading}
        />
      </EditSection>

      <EditSection title="Links" icon={<LinkIcon className="w-4 h-4" />} hint="Boosts verification & discoverability.">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { field: 'linkedin_url', Icon: Linkedin, label: 'LinkedIn URL', points: 3, placeholder: 'https://linkedin.com/in/you' },
            { field: 'mentor_portfolio_url', Icon: FileText, label: 'Mentor Portfolio URL', points: 3, placeholder: 'https://yourportfolio.com/mentorship' },
            { field: 'mentor_video_url', Icon: Globe, label: 'Mentor Video URL', points: 2, placeholder: 'https://youtube.com/... or https://loom.com/...' },
          ].map((item) => (
            <div key={item.field}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                <item.Icon className="w-3.5 h-3.5" style={{ color: '#1B2D7F' }} />
                {item.label}
                <span className="ml-auto text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: '#98DE38' }}>+{item.points}</span>
              </label>
              <input
                type="url"
                placeholder={item.placeholder}
                value={item.field in formData ? formData[item.field] || '' : formData.metadata?.[item.field] || ''}
                onChange={(event) => {
                  if (item.field in formData) {
                    updateField(item.field, event.target.value);
                  } else {
                    updateField('metadata', { ...(formData.metadata || {}), [item.field]: event.target.value });
                  }
                }}
                className="inp"
                aria-label={`${item.label} input`}
              />
              <p className={`text-xs mt-1 font-semibold ${getLinkStatus(item.field in formData ? formData[item.field] : formData.metadata?.[item.field]) === 'Format verified' ? 'text-green-700' : (item.field in formData ? formData[item.field] : formData.metadata?.[item.field]) ? 'text-red-600' : 'text-gray-400'}`}>
                {getLinkStatus(item.field in formData ? formData[item.field] : formData.metadata?.[item.field])}
              </p>
            </div>
          ))}
        </div>
      </EditSection>
    </form>
  );
}

function InlineArrayAdder({ value, onChange, onAdd, placeholder }) {
  return (
    <div className="flex flex-col sm:flex-row gap-2 mb-4">
      <input
        className="inp flex-1"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === 'Enter') {
            event.preventDefault();
            onAdd();
          }
        }}
        placeholder={placeholder}
      />
      <button
        type="button"
        onClick={onAdd}
        className="px-4 py-2.5 g-brand text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity"
      >
        Add
      </button>
    </div>
  );
}

function ProofBox({ title, description, url, onUrlChange, filePath, onFileChange, uploading }) {
  return (
    <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-3">
      <div>
        <p className="text-xs font-bold text-gray-500 uppercase tracking-wide">{title}</p>
        <p className="text-xs text-gray-400 mt-1">{description}</p>
      </div>

      <div>
        <input
          type="url"
          value={url || ''}
          onChange={(event) => onUrlChange(event.target.value)}
          placeholder="https://proof-link.com"
          className="inp"
        />
        <p className={`text-xs mt-1 font-semibold ${getLinkStatus(url) === 'Format verified' ? 'text-green-700' : url ? 'text-red-600' : 'text-gray-400'}`}>
          {getLinkStatus(url)}
        </p>
      </div>

      <label className="flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-[#98DE38]/60 bg-white text-sm font-bold text-gray-600">
        {uploading ? <Loader className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
        Upload proof file
        <input
          type="file"
          accept=".pdf,.ppt,.pptx,.doc,.docx,.png,.jpg,.jpeg,.mp4,.mov"
          disabled={uploading}
          onChange={(event) => onFileChange(event.target.files?.[0])}
          className="sr-only"
        />
      </label>

      {filePath && (
        <p className="text-xs text-green-700 font-semibold">
          Uploaded: {filePath}
        </p>
      )}
    </div>
  );
}

function InfoTile({ item }) {
  const Icon = item.Icon;

  return (
    <div className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
      <div className="p-2 bg-gray-100 rounded-lg" style={{ color: '#1B2D7F' }}>
        <Icon className="w-4 h-4" />
      </div>
      <div className="min-w-0">
        <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</p>
        <p className="text-sm font-semibold text-gray-800 truncate">
          {item.value || <span className="text-gray-300 italic">Not provided</span>}
        </p>
      </div>
    </div>
  );
}

function ChipGroup({ title, values }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {values.map((value) => (
          <span key={value} className="px-3 py-1.5 bg-gray-100 text-gray-700 rounded-full text-xs font-medium">{value}</span>
        ))}
      </div>
    </div>
  );
}

function ChipPicker({ values, selected, onToggle }) {
  return (
    <div className="flex flex-wrap gap-2 mb-4">
      {values.map((value) => (
        <button
          key={value}
          type="button"
          onClick={() => onToggle(value)}
          className={`chip ${selected.includes(value) ? 'selected' : ''}`}
          aria-pressed={selected.includes(value)}
        >
          {selected.includes(value) ? '✓' : '+'} {value}
        </button>
      ))}
    </div>
  );
}

function TagInput({ label, tags, inputValue, onInputChange, onAdd, onRemove, placeholder }) {
  return (
    <div className="space-y-2">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      <div className="flex gap-2">
        <input
          className="inp flex-1"
          value={inputValue}
          onChange={(event) => onInputChange(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault();
              onAdd();
            }
          }}
          placeholder={placeholder}
        />
        <button type="button" onClick={onAdd} className="px-4 py-2.5 g-brand text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity" aria-label={`Add ${label}`}>
          <Plus className="w-4 h-4" />
        </button>
      </div>
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.map((tag) => (
            <span key={tag} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-semibold border border-gray-200">
              {tag}
              <button type="button" onClick={() => onRemove(tag)} aria-label={`Remove ${tag}`}>
                <X className="w-3 h-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

const TrendingIcon = TrendingUpIcon;

function TrendingUpIcon(props) {
  return <Award {...props} />;
}

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
      <p className="sec-label">{icon}{title}</p>
      {hint && <p className="text-xs text-gray-400 -mt-1.5 mb-3">{hint}</p>}
    </div>
    {children}
  </section>
);

const FormInput = ({ label, value, onChange, type = 'text', placeholder, required, disabled, icon, hint }) => (
  <div className="space-y-1.5">
    {label && (
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
    )}
    <div className="relative">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}
      <input type={type} value={value || ''} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={`inp ${icon ? 'pl-10' : ''}`} aria-required={required} aria-disabled={disabled} />
    </div>
    {hint && <p className="text-xs text-gray-400 -mt-1">{hint}</p>}
  </div>
);

const FormTextarea = ({ label, value, onChange, placeholder, rows = 4, max }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
    <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} maxLength={max} className="ta" aria-describedby={max ? `${label}-counter` : undefined} />
    {max && <p id={`${label}-counter`} className="text-xs text-gray-400 text-right">{(value || '').length}/{max}</p>}
  </div>
);

const Empty = ({ label, action }) => (
  <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
    <p className="text-sm text-gray-400 italic">{label}</p>
    {action}
  </div>
);

const DeleteModal = ({ onCancel, onConfirm }) => {
  const btnRef = useRef(null);

  useEffect(() => {
    const handler = (event) => event.key === 'Escape' && onCancel();
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onCancel]);

  useEffect(() => {
    btnRef.current?.focus();
  }, []);

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(event) => event.target === event.currentTarget && onCancel()}>
      <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl text-center lift">
        <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <AlertTriangle className="w-8 h-8" />
        </div>
        <h2 id="delete-title" className="text-2xl font-black text-gray-900 mb-2 ss">Delete Account?</h2>
        <p className="text-gray-600 mb-6 text-sm">This action is permanent. All your profile data, connections, and activity will be deleted.</p>
        <div className="flex gap-3">
          <button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button>
          <button onClick={onConfirm} ref={btnRef} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Delete Account</button>
        </div>
      </div>
    </div>
  );
};
