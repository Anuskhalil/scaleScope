// src/pages/student/ProfilePage.jsx — FINAL FIXED VERSION
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../../components/landing-page/RoleNavbar';
import {
  User, GraduationCap, Briefcase, Trash2, Save, AlertTriangle,
  Edit3, MapPin, Mail, Link as LinkIcon, CheckCircle, Camera,
  Loader, Github, Twitter, Linkedin, X, Tag, Shield,
  BookOpen, Users, DollarSign, Rocket, Plus, Lightbulb, Heart, Sparkles,
  Info, Clock
} from 'lucide-react';
import toast from 'react-hot-toast';

// 🎨 BRAND STYLES
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
`;

// 📊 CONSTANTS
const GRADUATION_YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() + i - 2);
const CURRENT_YEARS = ['1st Year', '2nd Year', '3rd Year', '4th Year', '5th Year', 'Graduate'];
const SKILL_CHIPS = ['Technical / Dev', 'AI / ML', 'Marketing', 'Design / UI-UX', 'Business Strategy', 'Sales', 'Finance', 'Operations', 'Content Creation', 'Community Building', 'Fundraising', 'Data Analysis'];
const INTEREST_CHIPS = ['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'E-commerce', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech', 'AI / ML', 'Social Impact', 'Gaming'];
const HELP_NEEDED_CHIPS = ['Product Strategy', 'Technical Architecture', 'Design / UX', 'Marketing & Growth', 'Fundraising', 'Market Research', 'Legal & Compliance', 'Team Building', 'Pitch Deck Review', 'Mentorship', 'User Research', 'Business Model'];
const COMMITMENT_LEVELS = ['Exploring', 'Casual (2–5 hrs/week)', 'Serious (5–15 hrs/week)', 'Full-time (15–30 hrs/week)'];
const LOOKING_FOR_OPTS = [
  { val: 'Co-Founder', icon: '👥', desc: 'Build together' },
  { val: 'Mentor', icon: '🧠', desc: 'Guidance & advice' },
  { val: 'Internship', icon: '💼', desc: 'Work experience' },
  { val: 'Startup', icon: '🚀', desc: 'Join a startup' },
];

// 🤖 AUTO-GENERATE HELP NEEDED based on Interests + Idea Description
const generateHelpSuggestions = (interests, ideaDescription) => {
  const suggestions = new Set();
  const desc = (ideaDescription || '').toLowerCase();
  const KEYWORD_MAP = {
    'app': ['Technical Architecture', 'Product Strategy'],
    'platform': ['Technical Architecture', 'Business Model'],
    'ai': ['Technical Architecture', 'Data Analysis'],
    'ml': ['Technical Architecture', 'Data Analysis'],
    'machine learning': ['Technical Architecture', 'Data Analysis'],
    'blockchain': ['Technical Architecture', 'Legal & Compliance'],
    'web3': ['Technical Architecture', 'Fundraising'],
    'market': ['Market Research', 'Marketing & Growth'],
    'user': ['User Research', 'Design / UX'],
    'customer': ['Market Research', 'Sales'],
    'revenue': ['Business Model', 'Fundraising'],
    'monetize': ['Business Model', 'Fundraising'],
    'scale': ['Team Building', 'Operations'],
    'design': ['Design / UX'],
    'ui': ['Design / UX'],
    'ux': ['Design / UX'],
    'interface': ['Design / UX'],
    'prototype': ['Design / UX', 'Product Strategy'],
    'growth': ['Marketing & Growth'],
    'acquisition': ['Marketing & Growth'],
    'viral': ['Marketing & Growth'],
    'seo': ['Marketing & Growth'],
    'content': ['Content Creation', 'Marketing & Growth'],
    'invest': ['Fundraising', 'Pitch Deck Review'],
    'fund': ['Fundraising', 'Pitch Deck Review'],
    'pitch': ['Pitch Deck Review', 'Mentorship'],
    'seed': ['Fundraising', 'Business Model'],
    'fintech': ['Legal & Compliance', 'Product Strategy'],
    'health': ['Legal & Compliance', 'User Research'],
    'education': ['User Research', 'Content Creation'],
    'edtech': ['User Research', 'Content Creation'],
  };
  (interests || []).forEach(interest => {
    const lower = interest.toLowerCase();
    Object.entries(KEYWORD_MAP).forEach(([keyword, helps]) => {
      if (lower.includes(keyword)) helps.forEach(h => suggestions.add(h));
    });
  });
  Object.entries(KEYWORD_MAP).forEach(([keyword, helps]) => {
    if (desc.includes(keyword)) helps.forEach(h => suggestions.add(h));
  });
  if (suggestions.size === 0 && desc.length > 20) {
    suggestions.add('Product Strategy');
    suggestions.add('Market Research');
    suggestions.add('Mentorship');
  }
  return Array.from(suggestions).slice(0, 5);
};

// ✅ SAFE INITIAL STATE
const makeEmpty = (user, role) => ({
  full_name: '', email: user?.email || '', user_type: role || '',
  location: '', bio: '', avatar_url: '', linkedin_url: '', github_url: '', twitter_url: '',
  skills: [], interests: [], looking_for: [], help_needed: [], projects: [], launch_risk_flags: [],
  skills_with_levels: [],
  university: '', degree: '', major: '', graduation_year_int: '', current_year: '', career_goals: '',
  startup_idea_description: '', short_bio_for_mentors: '', commitment_level: '',
  // ✅ NEW startup idea fields
  has_startup_idea: false,
  idea_title: '',
  idea_domain: '',
  idea_stage: '',
  target_audience: '',
  unique_value_prop: '',
  profile_completion: 0, onboarding_completed: false, metadata: {},
});

// 🔧 Helpers
const slugify = (text) => (text || '').toLowerCase().trim().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function getCachedAvatarUrl(avatarPath) {
  try {
    if (!avatarPath) return '';
    if (avatarPath.startsWith('http')) return avatarPath;
    const cleanPath = avatarPath.replace(/^\/+/, '');
    const cacheKey = `avatar:${cleanPath}`;
    const cached = AVATAR_CACHE.get(cacheKey);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(cleanPath, 60 * 60 * 24);
    if (error || !data?.signedUrl) return '';
    AVATAR_CACHE.set(cacheKey, { url: data.signedUrl, ts: Date.now() });
    return data.signedUrl;
  } catch (err) { console.error('Avatar URL error:', err); return ''; }
}

// ✅ PROFILE COMPLETION CALCULATOR
function calcCompletionWithBreakdown(f) {
  const checks = [
    { field: 'full_name', condition: (f.full_name || '').trim().length > 1, points: 10, label: 'Full name' },
    { field: 'bio', condition: (f.bio || '').trim().length > 20, points: 10, label: 'Bio (20+ chars)' },
    { field: 'location', condition: (f.location || '').trim().length > 1, points: 5, label: 'Location' },
    { field: 'avatar', condition: !!f.avatar_url, points: 10, label: 'Profile photo' },
    { field: 'university', condition: (f.university || '').trim().length > 1, points: 8, label: 'University' },
    { field: 'degree', condition: (f.degree || '').trim().length > 1, points: 8, label: 'Degree' },
    { field: 'skills', condition: ((f.skills || []).length >= 3), points: 10, label: '3+ skills' },
    { field: 'interests', condition: ((f.interests || []).length >= 2), points: 5, label: '2+ interests' },
    { field: 'linkedin', condition: !!f.linkedin_url, points: 10, label: 'LinkedIn profile' },
    { field: 'github', condition: !!f.github_url, points: 3, label: 'GitHub profile' },
    { field: 'career_goals', condition: (f.career_goals || '').trim().length > 10, points: 5, label: 'Career goals' },
    { field: 'looking_for', condition: ((f.looking_for || []).length > 0), points: 3, label: 'Looking for preference' },
    { field: 'help_needed', condition: ((f.help_needed || []).length > 0), points: 3, label: 'Help needed' },
    { field: 'mentor_bio', condition: (f.short_bio_for_mentors || '').trim().length > 10, points: 3, label: 'Mentor bio' },
    { field: 'commitment', condition: !!f.commitment_level, points: 2, label: 'Commitment level' },
    { field: 'skill_levels', condition: ((f.skills_with_levels || []).length >= (f.skills || []).length && (f.skills || []).length > 0), points: 3, label: 'Skill proficiency levels' },
    { field: 'startup_idea', condition: (f.startup_idea_description || '').trim().length > 10, points: 2, label: 'Startup idea description' },
  ];
  const earned = checks.filter(c => c.condition).reduce((sum, c) => sum + c.points, 0);
  const total = checks.reduce((sum, c) => sum + c.points, 0);
  const missing = checks.filter(c => !c.condition).slice(0, 3);
  return { percentage: Math.min(Math.round((earned / total) * 100), 100), missing, all: checks };
}

// ✅ MAIN COMPONENT
export default function ProfilePage() {
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
  const [avatarDisplayUrl, setAvatarDisplayUrl] = useState('');
  const [avatarPath, setAvatarPath] = useState('');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);

  const userRole = user?.user_metadata?.user_type;
  const isStudent = userRole === 'student';

  const [formData, setFormData] = useState(makeEmpty(user, userRole));
  const [skillInput, setSkillInput] = useState('');
  const [interestInput, setInterestInput] = useState('');

  const STORAGE_KEY = `student_profile_draft_${user?.id || 'anon'}`;
  const SESSION_KEY = `student_profile_session_${user?.id || 'anon'}`;

  const saveDraft = useCallback((data) => {
    try {
      const draft = { ...data, _savedAt: Date.now(), _userId: user?.id, _isDraft: true, _hasUnsavedChanges: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
    } catch (e) { console.warn('Draft save failed:', e); }
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
        if (localDraft._userId === user?.id && Date.now() - localDraft._savedAt < 7 * 24 * 60 * 60 * 1000) {
          return localDraft;
        }
        localStorage.removeItem(STORAGE_KEY);
      }
      return null;
    } catch (e) { console.warn('Draft load failed:', e); return null; }
  }, [user?.id, STORAGE_KEY, SESSION_KEY]);

  const clearDraft = useCallback(() => {
    localStorage.removeItem(STORAGE_KEY);
    sessionStorage.removeItem(SESSION_KEY);
  }, [STORAGE_KEY, SESSION_KEY]);

  useEffect(() => {
    if (isEditMode && formData.full_name) {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => { saveDraft(formData); setHasUnsavedChanges(true); }, 100);
    }
    return () => { if (saveTimerRef.current) clearTimeout(saveTimerRef.current); };
  }, [formData, isEditMode, saveDraft]);

  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (isEditMode && hasUnsavedChanges) {
        try {
          const draft = { ...formData, _savedAt: Date.now(), _userId: user?.id, _isDraft: true, _hasUnsavedChanges: true };
          localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
          sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
        } catch (err) { console.warn('Draft save on unload failed:', err); }
        e.preventDefault(); e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [isEditMode, hasUnsavedChanges, formData, user?.id, STORAGE_KEY, SESSION_KEY]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const draft = loadDraft();
      const [profilesRes, studentRes] = await Promise.all([
        supabase.from('profiles').select('id, full_name, email, user_type, avatar_url, bio, location, linkedin_url, github_url, twitter_url, updated_at').eq('id', user.id).maybeSingle(),
        supabase.from('student_profiles').select(`id, user_id, university, degree, major, graduation_year_int, interests, current_year, career_goals, looking_for, has_startup_idea, startup_idea_description, idea_title, idea_domain, idea_stage, target_audience, unique_value_prop, skills_with_levels, help_needed, commitment_level, short_bio_for_mentors, profile_completion, updated_at`).eq('user_id', user.id).maybeSingle()
      ]);
      if (profilesRes.error) throw profilesRes.error;
      if (studentRes.error) throw studentRes.error;

      const pd = profilesRes.data || {};
      const sd = studentRes.data || {};
      const dbUpdatedAt = new Date(pd?.updated_at || sd?.updated_at || 0).getTime();
      const draftUpdatedAt = draft?._savedAt || 0;
      const useDraft = draft && draft._userId === user?.id && draftUpdatedAt >= dbUpdatedAt;
      const source = useDraft ? { ...pd, ...sd, ...draft } : { ...pd, ...sd };

      const avatarPathFromDB = pd.avatar_url || '';
      setAvatarPath(avatarPathFromDB);
      const avatarUrl = await getCachedAvatarUrl(avatarPathFromDB);
      setAvatarDisplayUrl(avatarUrl || '');

      const normalized = {
        ...makeEmpty(user, userRole),
        full_name: source.full_name || '', email: source.email || user?.email || '', user_type: source.user_type || userRole || '',
        location: source.location || '', bio: source.bio || '', avatar_url: avatarUrl || '',
        linkedin_url: source.linkedin_url || '', github_url: source.github_url || '', twitter_url: source.twitter_url || '',
        skills: Array.isArray(source?.skills_with_levels) ? source.skills_with_levels.map(s => s?.skill || s).filter(Boolean) : [],
        interests: source?.interests || [], looking_for: source?.looking_for || [], help_needed: source?.help_needed || [],
        projects: source?.projects || [], launch_risk_flags: source?.launch_risk_flags || [],
        skills_with_levels: source?.skills_with_levels || [],
        university: source.university || '', degree: source.degree || '', major: source.major || '',
        graduation_year_int: source.graduation_year_int ? String(source.graduation_year_int) : '',
        current_year: source.current_year || '', career_goals: source.career_goals || '',
        startup_idea_description: source.startup_idea_description || '', short_bio_for_mentors: source.short_bio_for_mentors || '',
        commitment_level: source.commitment_level || '',
        // ✅ NEW fields
        has_startup_idea: source.has_startup_idea || false,
        idea_title: source.idea_title || '',
        idea_domain: source.idea_domain || '',
        idea_stage: source.idea_stage || '',
        target_audience: source.target_audience || '',
        unique_value_prop: source.unique_value_prop || '',
        profile_completion: source.profile_completion || 0, onboarding_completed: source.onboarding_completed || false, updated_at: source.updated_at,
      };

      snapRef.current = normalized;
      setFormData(normalized);
      const shouldStayInEditMode = useDraft && draft?._hasUnsavedChanges;
      setIsEditMode(shouldStayInEditMode);
      setHasUnsavedChanges(shouldStayInEditMode);
      if (shouldStayInEditMode) toast('Unsaved changes restored', { icon: '♻️', duration: 3000, style: { background: '#1B2D7F', color: '#fff' } });
    } catch (err) { console.error('Profile load error:', err); toast.error('Failed to load profile'); setIsEditMode(true); setHasUnsavedChanges(true); } finally { setLoading(false); }
  }, [user, userRole, loadDraft]);

  useEffect(() => { if (user) loadProfile(); }, [user, loadProfile]);

  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    if (saving) return;
    setSaving(true); setSaveError('');
    try {
      const now = new Date().toISOString();
      const { error: pe } = await supabase.from('profiles').update({
        full_name: formData.full_name?.trim() || null, email: formData.email?.trim() || null, user_type: formData.user_type || null,
        location: formData.location?.trim() || null, bio: formData.bio?.trim() || null, avatar_url: avatarPath || null,
        linkedin_url: formData.linkedin_url?.trim() || null, github_url: formData.github_url?.trim() || null, twitter_url: formData.twitter_url?.trim() || null,
        updated_at: now, last_active: now,
      }).eq('id', user.id);
      if (pe) throw pe;

      const skillsWithLevels = (formData.skills || []).map(skill => ({ skill, level: (formData.skills_with_levels || []).find(s => s.skill === skill)?.level || 'Intermediate' }));

      const { error: se } = await supabase.from('student_profiles').upsert({
        user_id: user.id, university: formData.university?.trim() || null, degree: formData.degree?.trim() || null, major: formData.major?.trim() || null,
        graduation_year_int: formData.graduation_year_int ? parseInt(formData.graduation_year_int, 10) : null, current_year: formData.current_year || null,
        career_goals: formData.career_goals?.trim() || null, interests: formData.interests || [], looking_for: formData.looking_for || [], help_needed: formData.help_needed || [],
        // ✅ NEW startup idea fields
        has_startup_idea: formData.has_startup_idea || false,
        idea_title: formData.has_startup_idea ? (formData.idea_title?.trim() || null) : null,
        idea_domain: formData.has_startup_idea ? (formData.idea_domain?.trim() || null) : null,
        idea_stage: formData.has_startup_idea ? (formData.idea_stage || null) : null,
        target_audience: formData.has_startup_idea ? (formData.target_audience?.trim() || null) : null,
        unique_value_prop: formData.has_startup_idea ? (formData.unique_value_prop?.trim() || null) : null,
        startup_idea_description: formData.has_startup_idea ? (formData.startup_idea_description?.trim() || null) : null,
        short_bio_for_mentors: formData.short_bio_for_mentors?.trim() || null, commitment_level: formData.commitment_level || null,
        skills_with_levels: skillsWithLevels, profile_completion: calcCompletionWithBreakdown(formData).percentage, updated_at: now,
      }, { onConflict: 'user_id' });
      if (se) throw se;

      clearDraft(); setHasUnsavedChanges(false);
      toast.success('Profile saved!', { style: { background: '#98DE38', color: '#000' } });
      setIsEditMode(false); await loadProfile();
    } catch (err) { console.error('Save error:', err); setSaveError(err.message || 'Error saving'); toast.error('Failed to save'); if (snapRef.current) setFormData(snapRef.current); } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || file.size > 5 * 1024 * 1024 || !file.type.startsWith('image/')) { toast.error('Select a valid image under 5MB'); return; }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop()?.toLowerCase();
      const filePath = `${slugify(formData.full_name || 'user')}_${user.id}.${ext}`;
      if (avatarPath) await supabase.storage.from('avatars').remove([avatarPath]);
      const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, file, { cacheControl: '3600', upsert: true });
      if (uploadError) throw uploadError;
      const { data: signedData, error: signedError } = await supabase.storage.from('avatars').createSignedUrl(filePath, 60 * 60 * 24);
      if (signedError) throw signedError;
      const signedUrl = signedData?.signedUrl || '';
      const { error: dbError } = await supabase.from('profiles').update({ avatar_url: filePath, updated_at: new Date().toISOString() }).eq('id', user.id);
      if (dbError) throw dbError;
      AVATAR_CACHE.delete(`avatar:${filePath}`);
      setAvatarPath(filePath); setAvatarDisplayUrl(signedUrl);
      setFormData((prev) => ({ ...prev, avatar_url: signedUrl }));
      setHasUnsavedChanges(true); toast.success('Avatar updated!');
    } catch (err) { console.error('Avatar upload error:', err); toast.error(err.message || 'Upload failed'); } finally { setUploading(false); }
  };

  const updateField = useCallback((key, value) => { setFormData(prev => { const newData = { ...prev, [key]: value }; setHasUnsavedChanges(true); return newData; }); }, []);

  const toggleSkill = (skill) => {
    setFormData(prev => {
      const skills = prev.skills || []; const exists = skills.includes(skill);
      const newSkills = exists ? skills.filter(s => s !== skill) : [...skills, skill];
      const newLevels = exists ? (prev.skills_with_levels || []).filter(s => s.skill !== skill) : [...(prev.skills_with_levels || []), { skill, level: 'Intermediate' }];
      setHasUnsavedChanges(true); return { ...prev, skills: newSkills, skills_with_levels: newLevels };
    });
  };

  const toggleInterest = (interest) => {
    setFormData(prev => { const arr = prev.interests || []; setHasUnsavedChanges(true); return { ...prev, interests: arr.includes(interest) ? arr.filter(i => i !== interest) : [...arr, interest] }; });
  };

  const toggleArrayField = (field, value) => {
    setFormData(prev => { const arr = prev[field] || []; setHasUnsavedChanges(true); return { ...prev, [field]: arr.includes(value) ? arr.filter(v => v !== value) : [...arr, value] }; });
  };

  const addCustomSkill = () => {
    const val = skillInput.trim();
    if (val && !(formData.skills || []).includes(val)) {
      setFormData(prev => ({ ...prev, skills: [...(prev.skills || []), val], skills_with_levels: [...(prev.skills_with_levels || []), { skill: val, level: 'Intermediate' }] }));
      setHasUnsavedChanges(true); setSkillInput('');
    }
  };

  const addCustomInterest = () => {
    const val = interestInput.trim();
    if (val && !(formData.interests || []).includes(val)) { setFormData(prev => ({ ...prev, interests: [...(prev.interests || []), val] })); setHasUnsavedChanges(true); setInterestInput(''); }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('profiles').update({ deleted_at: new Date().toISOString() }).eq('id', user.id);
      await supabase.auth.signOut(); clearDraft(); toast.success('Account deactivated'); navigate('/');
    } catch (err) { console.error('Delete error:', err); toast.error('Failed to deactivate'); }
  };

  if (loading) return (
    <>
      <style>{STYLES}</style>
      <RoleNavbar />
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#1B2D7F' }} />
      </div>
    </>
  );

  const completion = calcCompletionWithBreakdown(formData);

  return (
    <>
      <style>{STYLES}</style>
      <RoleNavbar />
      <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4 dm">
        <div className="max-w-5xl mx-auto">
          {saveError && (
            <div className="flex items-start gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-6 fade-in" role="alert">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1"><p className="font-semibold text-red-800 text-sm">Save Error</p><p className="text-sm text-red-700">{saveError}</p></div>
              <button onClick={() => setSaveError('')} className="p-1 hover:bg-red-100 rounded"><X className="w-4 h-4 text-red-400" /></button>
            </div>
          )}
          {completion.percentage < 100 && (
            <div className="g-brand rounded-2xl p-5 mb-8 text-black fade-in lift">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base ss flex items-center gap-2"><Lightbulb className="w-4 h-4" />Complete Your Profile</h3>
                  <p className="text-sm text-black/80 mt-1">{completion.missing.length ? `Next: ${completion.missing.map(m => m.label).join(', ')}` : 'Better matches await.'}</p>
                </div>
                <div className="text-right sm:text-left"><div className="text-3xl font-black ss">{completion.percentage}%</div><div className="text-xs text-black/70">Complete</div></div>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden" role="progressbar" aria-valuenow={completion.percentage}><div className="h-full bg-black rounded-full transition-all" style={{ width: `${completion.percentage}%` }} /></div>
            </div>
          )}
          <div className="grid lg:grid-cols-4 gap-6">
            <aside className="lg:col-span-1 space-y-5">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 text-center lift">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full g-brand mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {avatarDisplayUrl ? <img src={avatarDisplayUrl} alt="Avatar" className="w-full h-full object-cover" loading="lazy" /> : <span className="text-white text-2xl font-bold ss">{formData.full_name?.charAt(0)?.toUpperCase() || 'U'}</span>}
                  </div>
                  {isEditMode && <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full cursor-pointer hover:scale-105 transition-transform shadow border"><Camera className="w-4 h-4 text-gray-700" /><input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" disabled={uploading} /></label>}
                </div>
                <h2 className="font-black text-lg text-gray-900 mb-1 ss">{formData.full_name || 'Your Name'}</h2>
                {formData.university && <p className="text-sm text-gray-500">{formData.university}</p>}
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-bold uppercase mt-2 border">{userRole?.replace(/-/g, ' ')}</div>
                {formData.location && <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-2"><MapPin className="w-3 h-3" />{formData.location}</p>}
              </div>
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                {!isEditMode ? (
                  <button onClick={() => { setIsEditMode(true); setHasUnsavedChanges(false); }} className="w-full py-3 g-brand text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90"><Edit3 className="w-4 h-4" />Edit Profile</button>
                ) : (
                  <>
                    <button onClick={handleUpdate} disabled={saving} className="w-full py-3 bg-[#1B2D7F] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#2A3F8F] disabled:opacity-50">{saving ? <><Loader className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}</button>
                    <button onClick={() => { setFormData(snapRef.current || makeEmpty(user, userRole)); setIsEditMode(false); setHasUnsavedChanges(false); clearDraft(); setSaveError(''); }} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200 transition-colors">Cancel</button>
                  </>
                )}
                <button onClick={() => setShowDeleteConfirm(true)} className="w-full py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50"><Trash2 className="w-4 h-4" />Delete Account</button>
              </div>
              {isEditMode && hasUnsavedChanges && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-center">
                  <p className="text-xs text-amber-700 font-medium flex items-center justify-center gap-1"><Clock className="w-3 h-3" /> Unsaved changes auto-saved locally</p>
                </div>
              )}
            </aside>
            <section className="lg:col-span-3">
              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-6 md:p-8">
                {!isEditMode ? (
                  <ViewMode formData={formData} isStudent={isStudent} onEditClick={() => { setFormData(prev => ({ ...prev, has_startup_idea: true })); setIsEditMode(true); toast('🚀 Ready to share an idea? Edit your profile!', { style: { background: '#98DE38', color: '#000' } }); }} />
                ) : (
                  <EditMode formData={formData} setFormData={setFormData} isStudent={isStudent} toggleSkill={toggleSkill} toggleInterest={toggleInterest} toggleArrayField={toggleArrayField} skillInput={skillInput} setSkillInput={setSkillInput} interestInput={interestInput} setInterestInput={setInterestInput} addCustomSkill={addCustomSkill} addCustomInterest={addCustomInterest} onSave={handleUpdate} saving={saving} updateField={updateField} />
                )}
              </div>
            </section>
          </div>
          {showDeleteConfirm && <DeleteModal onCancel={() => { setShowDeleteConfirm(false); setHasUnsavedChanges(false); }} onConfirm={handleDelete} />}
        </div>
      </div>
    </>
  );
}

// ─── VIEW MODE COMPONENT (FIXED - NO DUPLICATES) ───
function ViewMode({ formData, isStudent, onEditClick }) {
  return (
    <div className="space-y-10 dm">
      <header><h1 className="text-3xl font-black text-gray-900 mb-1 ss">My Profile</h1><p className="text-gray-500 text-sm">Your identity powers mentor, co-founder, and investor matching.</p></header>

      {/* Basic Info */}
      <Section title="Basic Information" icon={<User className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {[{ l: 'Full Name', v: formData.full_name, I: User }, { l: 'Email', v: formData.email, I: Mail }, { l: 'Location', v: formData.location, I: MapPin }].map((x, i) => (
            <div key={i} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"><div className="p-2 bg-gray-100 rounded-lg" style={{ color: '#1B2D7F' }}><x.I className="w-4 h-4" /></div><div className="min-w-0"><p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">{x.l}</p><p className="text-sm font-semibold text-gray-800 truncate">{x.v || <span className="text-gray-300 italic">Not provided</span>}</p></div></div>
          ))}
        </div>
        {formData.bio && <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}><p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>About</p><p className="text-sm text-gray-700 leading-relaxed">{formData.bio}</p></div>}
      </Section>

      {/* Education */}
      {isStudent && (
        <Section title="Education" icon={<GraduationCap className="w-5 h-5 text-[#1B2D7F]" />}>
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { l: 'University', v: formData.university, I: GraduationCap },
              { l: 'Degree', v: formData.degree, I: BookOpen },
              { l: 'Major', v: formData.major, I: BookOpen },
              { l: 'Current Year', v: formData.current_year, I: Clock },
              {
                l: 'Graduation Year',
                v: formData.graduation_year_int,
                I: GraduationCap,
              },
            ].map((x, i) => (
              <div
                key={i}
                className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl"
              >
                <div
                  className="p-2 bg-gray-100 rounded-lg"
                  style={{ color: '#1B2D7F' }}
                >
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

          {formData.career_goals && (
            <div
              className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4"
              style={{ borderColor: '#1B2D7F' }}
            >
              <p className="text-xs font-bold uppercase mb-1" style={{ color: '#1B2D7F' }}>
                Career Goals
              </p>

              <p className="text-sm text-gray-700 leading-relaxed">
                {formData.career_goals}
              </p>
            </div>
          )}
        </Section>
      )}

      {/* Availability & Commitment */}
      {isStudent && (
        <Section
          title="Availability & Commitment"
          icon={<Clock className="w-5 h-5 text-[#1B2D7F]" />}
        >
          <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
              Commitment Level
            </p>

            <p className="text-sm font-semibold text-gray-800">
              {formData.commitment_level || (
                <span className="text-gray-300 italic">Not provided</span>
              )}
            </p>
          </div>
        </Section>
      )}

      {/* 🚀 CONDITIONAL: Startup Idea Showcase (ONLY if has_startup_idea = true) */}
      {isStudent && formData.has_startup_idea && (
        <>
          <Section title="My Startup Idea" icon={<Rocket className="w-5 h-5" style={{ color: '#98DE38' }} />}>
            <div className="bg-gradient-to-br from-gray-900 to-gray-800 text-white rounded-2xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  {formData.idea_domain && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#98DE38]/20 text-[#98DE38] text-xs font-bold rounded-md uppercase">
                      <Tag className="w-3" /> {formData.idea_domain}
                    </span>
                  )}
                  <h3 className="font-bold text-lg mt-2">{formData.idea_title || 'Untitled Startup'}</h3>
                  {formData.idea_stage && (
                    <span className="inline-block px-2 py-0.5 bg-white/10 text-white/80 text-xs rounded mt-1">
                      {formData.idea_stage.replace('-', ' ').toUpperCase()}
                    </span>
                  )}
                </div>
              </div>
              {formData.unique_value_prop && <p className="text-sm text-gray-300 italic mb-3">"{formData.unique_value_prop}"</p>}
              {formData.startup_idea_description && <p className="text-sm text-gray-300 leading-relaxed line-clamp-4">{formData.startup_idea_description}</p>}
              {formData.target_audience && <p className="text-xs text-gray-400 mt-3 flex items-center gap-1"><Users className="w-3" /> For: {formData.target_audience}</p>}
            </div>
          </Section>

          {/* 💡 Interests - ONLY in conditional block (NO DUPLICATE) */}
          <Section title="Interests" icon={<Tag className="w-5 h-5" style={{ color: '#98DE38' }} />}>
            {(formData.interests || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(formData.interests || []).map((interest, i) => (
                  <span key={`${interest}-${i}`} className="px-3 py-2 rounded-full text-xs font-semibold border" style={{ background: 'rgba(152,222,56,0.12)', color: '#1B2D7F', borderColor: '#98DE38' }}>{interest}</span>
                ))}
              </div>
            ) : <Empty label="No interests added yet." />}
          </Section>

          {/* ❤️ Help Needed - ONLY in conditional block (NO DUPLICATE) */}
          <Section title="Help Needed" icon={<Heart className="w-5 h-5" style={{ color: '#EF4444' }} />}>
            {(formData.help_needed || []).length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {(formData.help_needed || []).map((item, i) => (
                  <span key={`${item}-${i}`} className="px-3 py-2 rounded-full text-xs font-semibold border flex items-center gap-1" style={{ background: 'rgba(239,68,68,0.08)', color: '#DC2626', borderColor: 'rgba(239,68,68,0.3)' }}>{item}</span>
                ))}
              </div>
            ) : <Empty label="No help areas specified. Add some to get relevant mentor matches!" action={<button onClick={onEditClick} className="text-xs font-bold text-[#1B2D7F] hover:underline mt-2">Edit to add</button>} />}
          </Section>

          {/* 🧠 Message to Mentors - ONLY in conditional block (NO DUPLICATE) */}
          <Section title="Message to Mentors" icon={<Lightbulb className="w-5 h-5" style={{ color: '#F59E0B' }} />}>
            {formData.short_bio_for_mentors ? (
              <div className="p-4 rounded-xl border" style={{ background: 'rgba(245,158,11,0.08)', borderColor: 'rgba(245,158,11,0.3)' }}><p className="text-sm text-gray-700 leading-relaxed">{formData.short_bio_for_mentors}</p></div>
            ) : <Empty label="No message for mentors yet. Add one to increase response rates!" />}
          </Section>
        </>
      )}

      {/* 📭 PROMPT: Only if has_startup_idea = false */}
      {isStudent && !formData.has_startup_idea && (
        <Section title="Startup Journey" icon={<Rocket className="w-5 h-5 text-gray-400" />}>
          <div className="text-center py-8 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
            <Rocket className="w-10 h-10 mx-auto text-gray-300 mb-3" />
            <p className="text-sm text-gray-500 mb-1">Don't have a startup idea yet?</p>
            <p className="text-xs text-gray-400 mb-4">That's okay! Explore opportunities or find mentors to help you discover one.</p>
            <button onClick={onEditClick} className="px-4 py-2 g-brand text-black text-xs font-bold rounded-lg hover:opacity-90">+ Add My Idea</button>
          </div>
        </Section>
      )}

      {/* Skills - Always show */}
      <Section title="Skills" icon={<Briefcase className="w-5 h-5 text-[#1B2D7F]" />}>
        {(formData.skills || []).length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {(formData.skills || []).map((skill, i) => {
              const level = (formData.skills_with_levels || []).find(s => s.skill === skill)?.level;
              return <span key={`${skill}-${i}`} className="px-3 py-2 rounded-full text-xs font-semibold border" style={{ background: 'rgba(27,45,127,0.08)', color: '#1B2D7F', borderColor: 'rgba(27,45,127,0.2)' }}>{skill}{level && <span className="text-gray-400 ml-1">· {level}</span>}</span>;
            })}
          </div>
        ) : <Empty label="No skills added yet. Add at least 3 to improve matching." />}
      </Section>

      {/* Looking For - Always show for students */}
      {isStudent && (
        <Section title="Looking For" icon={<Tag className="w-5 h-5 text-[#1B2D7F]" />}>
          {(formData.looking_for || []).length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(formData.looking_for || []).map((val, i) => {
                const opt = LOOKING_FOR_OPTS.find(o => o.val === val);
                return <div key={`${val}-${i}`} className="flex flex-col items-center gap-2 p-4 rounded-2xl text-center border" style={{ background: 'rgba(27,45,127,0.05)', borderColor: 'rgba(27,45,127,0.2)' }}><span className="text-2xl">{opt?.icon || '🔍'}</span><span className="text-xs font-bold ss" style={{ color: '#1B2D7F' }}>{val}</span><span className="text-xs text-gray-400">{opt?.desc}</span></div>;
              })}
            </div>
          ) : <Empty label="No preferences set yet." />}
        </Section>
      )}

      {/* Links - Always show */}
      <Section title="Links" icon={<LinkIcon className="w-5 h-5 text-[#1B2D7F]" />}>
        {([formData.linkedin_url, formData.github_url, formData.twitter_url].some(Boolean)) ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[{ k: 'linkedin_url', l: 'LinkedIn', I: Linkedin, bg: 'bg-blue-50', c: 'text-blue-600' }, { k: 'github_url', l: 'GitHub', I: Github, bg: 'bg-gray-50', c: 'text-gray-600' }, { k: 'twitter_url', l: 'Twitter', I: Twitter, bg: 'bg-sky-50', c: 'text-sky-600' }].filter(link => formData[link.k]).map(link => (
              <a key={link.k} href={formData[link.k]} target="_blank" rel="noreferrer" className={`flex items-center gap-3 p-4 rounded-xl hover:opacity-80 transition-all ${link.bg} ${link.c}`}><link.I className="w-4 h-4 flex-shrink-0" /><div className="flex-1 min-w-0"><p className="text-xs font-bold uppercase tracking-wide">{link.l}</p><p className="text-xs truncate group-hover:underline opacity-80">{formData[link.k].replace(/^https?:\/\//, '')}</p></div><LinkIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" /></a>
            ))}
          </div>
        ) : <Empty label="No links added yet. Connect your profiles to boost verification." />}
      </Section>
    </div>
  );
}

// ─── EDIT MODE COMPONENT ───
function EditMode({ formData, setFormData, isStudent, toggleSkill, toggleInterest, toggleArrayField, skillInput, setSkillInput, interestInput, setInterestInput, addCustomSkill, addCustomInterest, updateField }) {
  const completion = calcCompletionWithBreakdown(formData);
  return (
    <form onSubmit={(e) => { e.preventDefault(); }} className="space-y-10 dm">
      <header><h1 className="text-3xl font-black text-gray-900 ss mb-1">Edit Profile</h1><p className="text-gray-400 text-sm">Basic info + Education + Startup details.</p></header>
      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2"><span className="text-sm font-bold ss" style={{ color: '#1B2D7F' }}>Profile Completion</span><span className="font-black ss" style={{ color: '#1B2D7F' }}>{completion.percentage}%</span></div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${completion.percentage}%`, background: `linear-gradient(90deg, #98DE38, #7EC42E)` }} /></div>
        {completion.missing.length > 0 && <p className="text-xs text-gray-500 mt-2">Tip: Add {completion.missing.map(m => m.label.toLowerCase()).join(', ')} to reach 100%</p>}
      </div>
      <EditSection title="Basic Information" icon={<User className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Full Name *" value={formData.full_name} onChange={(v) => updateField('full_name', v)} icon={<User className="w-4 h-4" />} placeholder="Your full name" required />
          <FormInput label="Email" value={formData.email} disabled icon={<Mail className="w-4 h-4" />} hint="Contact support to change" />
          <FormInput label="City / Country" value={formData.location} onChange={(v) => updateField('location', v)} icon={<MapPin className="w-4 h-4" />} placeholder="e.g. Karachi, Pakistan" />
        </div>
        <FormTextarea label="About You" value={formData.bio} onChange={(v) => updateField('bio', v)} placeholder="2–3 sentences about your background, goals, and what you're looking for..." rows={3} max={400} />
      </EditSection>

      {/* Education */}
      {isStudent && (
        <EditSection
          title="Education"
          icon={<GraduationCap className="w-4 h-4" />}
          hint="Education details improve co-founder, mentor, and investor matching."
        >
          <div className="grid md:grid-cols-2 gap-4">
            <FormInput
              label="University / Institute *"
              value={formData.university}
              onChange={(v) => updateField('university', v)}
              icon={<GraduationCap className="w-4 h-4" />}
              placeholder="e.g. Ahmed Institute Karachi"
              required
            />

            <FormInput
              label="Degree *"
              value={formData.degree}
              onChange={(v) => updateField('degree', v)}
              icon={<BookOpen className="w-4 h-4" />}
              placeholder="e.g. BS Computer Science"
              required
            />

            <FormInput
              label="Major / Specialization"
              value={formData.major}
              onChange={(v) => updateField('major', v)}
              icon={<BookOpen className="w-4 h-4" />}
              placeholder="e.g. AI, Economics, Software Engineering"
            />

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                Current Year
              </label>

              <select
                className="sel"
                value={formData.current_year || ''}
                onChange={(e) => updateField('current_year', e.target.value)}
              >
                <option value="">Select current year…</option>
                {CURRENT_YEARS.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
                Expected Graduation Year
              </label>

              <select
                className="sel"
                value={formData.graduation_year_int || ''}
                onChange={(e) => updateField('graduation_year_int', e.target.value)}
              >
                <option value="">Select graduation year…</option>
                {GRADUATION_YEARS.map((year) => (
                  <option key={year} value={String(year)}>
                    {year}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <FormTextarea
            label="Career Goals"
            value={formData.career_goals}
            onChange={(v) => updateField('career_goals', v)}
            placeholder="What do you want to achieve as a student founder? What kind of startup, career path, or opportunities are you aiming for?"
            rows={3}
            max={400}
          />
        </EditSection>
      )}

      {/* Availability & Commitment */}
      {isStudent && (
        <EditSection
          title="Availability & Commitment"
          icon={<Clock className="w-4 h-4" />}
          hint="This helps AI match you with co-founders who have a similar working commitment."
        >
          <div className="space-y-1.5">
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">
              Commitment Level
            </label>

            <select
              className="sel"
              value={formData.commitment_level || ''}
              onChange={(e) => updateField('commitment_level', e.target.value)}
            >
              <option value="">Select commitment level…</option>
              {COMMITMENT_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>

            <p className="text-xs text-gray-400">
              Example: Exploring, Casual, Serious, or Full-time.
            </p>
          </div>
        </EditSection>
      )}

      {/* Startup Idea Section */}
      {isStudent && (
        <EditSection title="Startup Idea" icon={<Lightbulb className="w-4 h-4" />} hint="Share your idea to attract co-founders & mentors.">
          <div className="mb-4 p-4 bg-gray-50 rounded-xl border border-gray-200">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={formData.has_startup_idea || false} onChange={(e) => { const hasIdea = e.target.checked; updateField('has_startup_idea', hasIdea); if (hasIdea && !formData.help_needed?.length) { const suggestions = generateHelpSuggestions(formData.interests, formData.startup_idea_description); if (suggestions.length > 0) { updateField('help_needed', suggestions); toast('💡 Help suggestions auto-added!', { style: { background: '#98DE38', color: '#000' }, duration: 2500 }); } } }} className="w-4 h-4 rounded border-gray-300 text-[#1B2D7F] focus:ring-[#98DE38]" />
              <span className="text-sm font-semibold text-gray-700">I have a startup idea</span>
            </label>
          </div>
          {formData.has_startup_idea && (
            <div className="space-y-4 animate-fadeIn">
              <FormInput label="Idea Title *" value={formData.idea_title || ''} onChange={(v) => updateField('idea_title', v)} placeholder="e.g. EduMatch - AI Tutor Finder" required />
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Domain / Industry *</label>
                <select className="sel" value={formData.idea_domain || ''} onChange={(e) => updateField('idea_domain', e.target.value)} required>
                  <option value="">Select domain…</option>
                  {INTEREST_CHIPS.map(domain => (<option key={domain} value={domain}>{domain}</option>))}
                  <option value="Other">Other</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">Current Stage</label>
                <select className="sel" value={formData.idea_stage || ''} onChange={(e) => updateField('idea_stage', e.target.value)}>
                  <option value="">Select stage…</option>
                  <option value="idea">💡 Just an idea</option><option value="problem">🔍 Problem validated</option><option value="mvp">🛠️ MVP built</option><option value="traction">📈 Getting users</option><option value="revenue">💰 Generating revenue</option>
                </select>
              </div>
              <FormInput label="Target Audience" value={formData.target_audience || ''} onChange={(v) => updateField('target_audience', v)} placeholder="e.g. University students in Pakistan, Freelance designers…" />
              <FormTextarea label="What Makes It Unique?" value={formData.unique_value_prop || ''} onChange={(v) => updateField('unique_value_prop', v)} placeholder="Why will users choose you over alternatives? What's your secret sauce?" rows={2} max={200} />
              <FormTextarea label="Detailed Description *" value={formData.startup_idea_description || ''} onChange={(v) => { updateField('startup_idea_description', v); if (formData.has_startup_idea) { const suggestions = generateHelpSuggestions(formData.interests, v); if (suggestions.length > 0 && (!formData.help_needed || formData.help_needed.length === 0)) { updateField('help_needed', suggestions); } } }} placeholder="What problem are you solving? Who has this problem? How does your solution work? What makes it different?" rows={4} max={600} required />
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
                <p className="text-xs font-bold text-amber-800 mb-2 flex items-center gap-1"><Sparkles className="w-3" /> Auto-Suggested Help Needed</p>
                <div className="flex flex-wrap gap-2">{generateHelpSuggestions(formData.interests, formData.startup_idea_description).map(s => (<span key={s} className="px-2 py-1 bg-amber-100 text-amber-800 text-xs rounded-md font-medium">{s}</span>))}</div>
                <p className="text-xs text-amber-700 mt-2">💡 Click items in "Help Needed" section below to add/remove</p>
              </div>
              <div className="pt-2">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Customize Help Needed</p>
                <div className="flex flex-wrap gap-2">{HELP_NEEDED_CHIPS.map(item => { const selected = (formData.help_needed || []).includes(item); return (<button key={item} type="button" onClick={() => toggleArrayField('help_needed', item)} className={`px-3 py-1.5 rounded-full text-xs font-semibold border transition-all ${selected ? 'bg-red-100 border-red-300 text-red-700' : 'bg-white border-gray-200 text-gray-600 hover:border-red-200'}`}>{selected ? '✓ ' : '+ '}{item}</button>); })}</div>
              </div>
            </div>
          )}
        </EditSection>
      )}

      {/* Skills */}
      <EditSection title="Skills" icon={<Briefcase className="w-4 h-4" />} hint="AI uses your skills for matching. Add at least 3.">
        <div className="flex flex-wrap gap-2 mb-4">{SKILL_CHIPS.map(skill => (<button key={skill} type="button" onClick={() => toggleSkill(skill)} className={`chip ${((formData.skills || []).includes(skill)) ? 'selected' : ''}`} aria-pressed={(formData.skills || []).includes(skill)}>{(formData.skills || []).includes(skill) ? '✓' : '+'} {skill}</button>))}</div>
        <div className="flex gap-2"><input className="inp flex-1" value={skillInput} onChange={(e) => setSkillInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomSkill())} placeholder="Add custom skill…" aria-label="Add custom skill" /><button type="button" onClick={addCustomSkill} className="px-4 py-2.5 g-brand text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity" aria-label="Add custom skill">Add</button></div>
      </EditSection>

      {/* Skill Levels */}
      {isStudent && (formData.skills || []).length > 0 && (
        <EditSection title="Skill Proficiency" icon={<Briefcase className="w-4 h-4" />} hint="Rate your level for better matching.">
          <div className="space-y-3">{(formData.skills || []).map(skill => { const currentLevel = (formData.skills_with_levels || []).find(s => s.skill === skill)?.level || 'Intermediate'; return (<div key={skill} className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl"><span className="text-sm font-medium text-gray-700 flex-1">{skill}</span><select value={currentLevel} onChange={(e) => { setFormData(prev => { const levels = [...(prev.skills_with_levels || [])]; const idx = levels.findIndex(s => s.skill === skill); const newEntry = { skill, level: e.target.value }; if (idx >= 0) levels[idx] = newEntry; else levels.push(newEntry); return { ...prev, skills_with_levels: levels }; }); }} className="sel w-40 text-sm" aria-label={`Proficiency level for ${skill}`}><option>Beginner</option><option>Intermediate</option><option>Advanced</option><option>Expert</option></select></div>); })}</div>
        </EditSection>
      )}

      {/* Interests */}
      <EditSection title="Interests" icon={<Tag className="w-4 h-4" />} hint="Industries you care about.">
        <div className="flex flex-wrap gap-2 mb-4">{INTEREST_CHIPS.map(interest => (<button key={interest} type="button" onClick={() => toggleInterest(interest)} className={`chip ${((formData.interests || []).includes(interest)) ? 'selected' : ''}`} style={(formData.interests || []).includes(interest) ? { borderColor: '#98DE38' } : {}} aria-pressed={(formData.interests || []).includes(interest)}>{(formData.interests || []).includes(interest) ? '✓' : '+'} {interest}</button>))}</div>
        <div className="flex gap-2"><input className="inp flex-1" value={interestInput} onChange={(e) => setInterestInput(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addCustomInterest())} placeholder="Add custom interest…" aria-label="Add custom interest" /><button type="button" onClick={addCustomInterest} className="px-4 py-2.5 g-brand text-black rounded-xl text-sm font-bold hover:opacity-90 transition-opacity" aria-label="Add custom interest">Add</button></div>
      </EditSection>

      {/* Student-specific */}
      {isStudent && (
        <>
          <EditSection title="Looking For" icon={<Tag className="w-4 h-4" />} hint="What are you here to find?">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">{LOOKING_FOR_OPTS.map(opt => { const selected = (formData.looking_for || []).includes(opt.val); return (<button key={opt.val} type="button" onClick={() => toggleArrayField('looking_for', opt.val)} className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-all ${selected ? 'border-[#98DE38] bg-[#98DE38]/10' : 'border-gray-200 bg-white hover:border-[#98DE38]/50'}`} aria-pressed={selected}><span className="text-2xl">{opt.icon}</span><span className="text-xs font-bold ss">{opt.val}</span><span className="text-[10px] text-gray-400">{opt.desc}</span>{selected && <span className="text-xs font-bold" style={{ color: '#98DE38' }}>✓ Selected</span>}</button>); })}</div>
          </EditSection>
          <EditSection title="Help Needed" icon={<Heart className="w-4 h-4" />} hint="What do you need guidance on?">
            <div className="flex flex-wrap gap-2">{HELP_NEEDED_CHIPS.map(item => (<button key={item} type="button" onClick={() => toggleArrayField('help_needed', item)} className={`chip ${((formData.help_needed || []).includes(item)) ? 'selected' : ''}`} style={(formData.help_needed || []).includes(item) ? { borderColor: '#EF4444' } : {}} aria-pressed={(formData.help_needed || []).includes(item)}>{(formData.help_needed || []).includes(item) ? '✓' : '+'} {item}</button>))}</div>
          </EditSection>
          <EditSection title="Short Bio for Mentors" icon={<Lightbulb className="w-4 h-4" />} hint="Appears on mentor match cards. Keep it concise.">
            <FormTextarea label="Mentor Bio" value={formData.short_bio_for_mentors} onChange={(v) => updateField('short_bio_for_mentors', v)} placeholder="Brief intro for mentors: your background, what you're building, and what help you need..." rows={3} max={300} />
          </EditSection>
        </>
      )}

      {/* Links */}
      <EditSection title="Links" icon={<LinkIcon className="w-4 h-4" />} hint="Boosts verification & discoverability.">
        <div className="grid md:grid-cols-2 gap-4">{[{ field: 'linkedin_url', Icon: Linkedin, label: 'LinkedIn URL', points: 3, placeholder: 'https://linkedin.com/in/you' }, { field: 'github_url', Icon: Github, label: 'GitHub URL', points: 2, placeholder: 'https://github.com/you' }, { field: 'twitter_url', Icon: Twitter, label: 'Twitter URL', points: 1, placeholder: 'https://twitter.com/you' }].map(item => (<div key={item.field}><label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5"><item.Icon className="w-3.5 h-3.5" style={{ color: '#1B2D7F' }} /> {item.label}<span className="ml-auto text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: '#98DE38' }}>+{item.points}</span></label><input type="url" placeholder={item.placeholder} value={formData[item.field] || ''} onChange={(e) => updateField(item.field, e.target.value)} className="inp" aria-label={`${item.label} input`} /></div>))}</div>
      </EditSection>
    </form>
  );
}

// ─── SHARED UI PRIMITIVES ───
const Section = ({ title, icon, children }) => (<section className="space-y-4 pt-6 border-t border-gray-100 first:pt-0 first:border-t-0"><div className="flex items-center gap-2 mb-3">{icon}<h2 className="text-lg font-bold text-gray-900 ss">{title}</h2></div>{children}</section>);
const EditSection = ({ title, icon, hint, children }) => (<section className="space-y-4 pt-8 border-t border-gray-100 first:pt-0 first:border-t-0"><div><p className="sec-label">{icon}{title}</p>{hint && <p className="text-xs text-gray-400 -mt-1.5 mb-3">{hint}</p>}</div>{children}</section>);
const FormInput = ({ label, value, onChange, type = 'text', placeholder, required, disabled, icon, hint }) => (<div className="space-y-1.5">{label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}<div className="relative">{icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}<input type={type} value={value || ''} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={`inp ${icon ? 'pl-10' : ''}`} aria-required={required} aria-disabled={disabled} /></div>{hint && <p className="text-xs text-gray-400 -mt-1">{hint}</p>}</div>);
const FormTextarea = ({ label, value, onChange, placeholder, rows = 4, max }) => (<div className="space-y-1.5">{label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}<textarea value={value || ''} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={max} className="ta" aria-describedby={max ? `${label}-counter` : undefined} />{max && <p id={`${label}-counter`} className="text-xs text-gray-400 text-right">{(value || '').length}/{max}</p>}</div>);
const Empty = ({ label, action }) => (<div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200"><p className="text-sm text-gray-400 italic">{label}</p>{action}</div>);
const DeleteModal = ({ onCancel, onConfirm }) => { useEffect(() => { const h = (e) => e.key === 'Escape' && onCancel(); document.addEventListener('keydown', h); return () => document.removeEventListener('keydown', h); }, [onCancel]); const btnRef = useRef(null); useEffect(() => { btnRef.current?.focus(); }, []); return (<div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" aria-labelledby="delete-title" onClick={(e) => e.target === e.currentTarget && onCancel()}><div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl text-center lift"><div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8" /></div><h2 id="delete-title" className="text-2xl font-black text-gray-900 mb-2 ss">Delete Account?</h2><p className="text-gray-600 mb-6 text-sm">This action is permanent. All your profile data, connections, and activity will be deleted.</p><div className="flex gap-3"><button onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200 transition-colors">Cancel</button><button onClick={onConfirm} ref={btnRef} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700 transition-colors">Delete Account</button></div></div></div>); };
