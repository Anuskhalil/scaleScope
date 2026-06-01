// src/pages/InvestorProfile.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../components/landing-page/RoleNavbar';
import {
  fetchInvestorProfile,
  calcInvestorCompletion,
  saveInvestorBaseProfile,
  saveInvestorDetails,
  uploadInvestorAvatar,
} from '../services/investorService';
import {
  User,
  DollarSign,
  Briefcase,
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
  Shield,
  CheckCircle,
  Trash2,
  Building2,
  Star,
  Clock,
  Target,
  Globe,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  .chip { padding: 8px 12px; border: 2px solid var(--gray-200); border-radius: 999px; background: #fff; color: #4B5563; font-size: 12px; font-weight: 700; transition: all .15s; }
  .chip:hover { border-color: rgba(152,222,56,.55); }
  .chip.selected { border-color: var(--primary); background: rgba(152,222,56,.10); color: #1B2D7F; }
`;

const INVESTOR_TYPES = ['Solo Angel', 'Angel Syndicate', 'VC Fund', 'Impact Fund', 'Corporate VC', 'Family Office', 'Accelerator'];
const STAGE_OPTS = ['Pre-seed', 'Seed', 'Series A', 'Series B', 'Series B+', 'Growth'];
const INDUSTRY_OPTS = ['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech', 'E-commerce', 'AI / ML', 'Social Impact', 'Gaming', 'DeepTech', 'Other'];
const INVOLVEMENT_OPTS = ['Hands-on (weekly check-ins)', 'Advisory (monthly)', 'Board seat', 'Silent investor', 'Reactive (founder-led)'];
const CONTACT_OPTS = ['Platform message', 'Email', 'LinkedIn', 'WhatsApp', 'Calendly link'];
const GEO_OPTS = ['Pakistan', 'South Asia', 'MENA', 'Southeast Asia', 'Global / Remote', 'USA', 'UK', 'Europe'];
const RESPONSE_TIME_OPTS = ['Within 24 hours', '1-3 days', 'Within a week', 'Monthly review cycle'];
const INVESTMENT_FREQUENCY_OPTS = ['Occasional', '1-2 deals / quarter', 'Monthly', 'Rolling fund', 'Case-by-case'];
const LEAD_OR_FOLLOW_OPTS = ['Lead investor', 'Follow investor', 'Either lead or follow', 'Syndicate only'];
const BUSINESS_MODEL_OPTS = ['SaaS', 'Marketplace', 'Subscription', 'Transaction / commission', 'Usage-based', 'Enterprise sales', 'Consumer app', 'Hardware-enabled'];

const makeEmpty = (user) => ({
  id: null,
  user_id: user?.id || '',
  profile_id: user?.id || '',
  full_name: '',
  email: user?.email || '',
  user_type: 'investor',
  location: '',
  bio: '',
  avatar_url: '',
  linkedin_url: '',
  github_url: '',
  twitter_url: '',
  investor_type: '',
  firm_name: '',
  investment_stage: [],
  industries_of_interest: [],
  ticket_size_min: '',
  ticket_size_max: '',
  geographic_focus: '',
  portfolio_count: 0,
  successful_exits: 0,
  notable_investments: '',
  investment_thesis: '',
  typical_involvement: '',
  accepting_pitches: true,
  preferred_contact_method: '',
  fund_name: '',
  preferred_stages: [],
  preferred_industries: [],
  check_range_min: '',
  check_range_max: '',
  geography_focus: '',
  total_investments: 0,
  exits: 0,
  what_i_look_for: '',
  is_verified: false,
  response_time: '',
  website_url: '',
  booking_url: '',
  investment_frequency: '',
  lead_or_follow: '',
  minimum_traction_required: '',
  preferred_business_models: [],
  portfolio_url: '',
  due_diligence_requirements: '',
  profile_completion: 0,
  onboarding_completed: false,
  is_public: true,
  is_active: true,
  created_at: '',
  updated_at: '',
});

const safeArray = (value) => Array.isArray(value) ? value : [];

const normalizeProfile = (user, profile = {}, investorProfile = {}) => {
  const stages = safeArray(investorProfile.investment_stage).length
    ? investorProfile.investment_stage
    : safeArray(investorProfile.preferred_stages);
  const industries = safeArray(investorProfile.industries_of_interest).length
    ? investorProfile.industries_of_interest
    : safeArray(investorProfile.preferred_industries);
  const firmName = investorProfile.firm_name || investorProfile.fund_name || '';
  const thesis = investorProfile.investment_thesis || investorProfile.what_i_look_for || '';
  const minTicket = investorProfile.ticket_size_min ?? investorProfile.check_range_min ?? '';
  const maxTicket = investorProfile.ticket_size_max ?? investorProfile.check_range_max ?? '';
  const geo = investorProfile.geographic_focus || investorProfile.geography_focus || '';
  const portfolioCount = investorProfile.portfolio_count ?? investorProfile.total_investments ?? 0;
  const exits = investorProfile.successful_exits ?? investorProfile.exits ?? 0;

  return {
    ...makeEmpty(user),
    id: investorProfile.id || null,
    user_id: investorProfile.user_id || user?.id || '',
    profile_id: investorProfile.profile_id || profile.id || user?.id || '',
    full_name: profile.full_name || '',
    email: profile.email || user?.email || '',
    user_type: profile.user_type || 'investor',
    location: profile.location || '',
    bio: profile.bio || '',
    avatar_url: profile.avatar_url || '',
    linkedin_url: profile.linkedin_url || '',
    github_url: profile.github_url || '',
    twitter_url: profile.twitter_url || '',
    investor_type: investorProfile.investor_type || '',
    firm_name: firmName,
    investment_stage: stages,
    industries_of_interest: industries,
    ticket_size_min: minTicket,
    ticket_size_max: maxTicket,
    geographic_focus: geo,
    portfolio_count: portfolioCount,
    successful_exits: exits,
    notable_investments: investorProfile.notable_investments || '',
    investment_thesis: thesis,
    typical_involvement: investorProfile.typical_involvement || '',
    accepting_pitches: investorProfile.accepting_pitches !== false,
    preferred_contact_method: investorProfile.preferred_contact_method || '',
    fund_name: investorProfile.fund_name || firmName,
    preferred_stages: safeArray(investorProfile.preferred_stages).length ? investorProfile.preferred_stages : stages,
    preferred_industries: safeArray(investorProfile.preferred_industries).length ? investorProfile.preferred_industries : industries,
    check_range_min: investorProfile.check_range_min ?? minTicket,
    check_range_max: investorProfile.check_range_max ?? maxTicket,
    geography_focus: investorProfile.geography_focus || geo,
    total_investments: investorProfile.total_investments ?? portfolioCount,
    exits: investorProfile.exits ?? exits,
    what_i_look_for: investorProfile.what_i_look_for || thesis,
    is_verified: investorProfile.is_verified === true,
    response_time: investorProfile.response_time || '',
    website_url: investorProfile.website_url || '',
    booking_url: investorProfile.booking_url || '',
    investment_frequency: investorProfile.investment_frequency || '',
    lead_or_follow: investorProfile.lead_or_follow || '',
    minimum_traction_required: investorProfile.minimum_traction_required || '',
    preferred_business_models: safeArray(investorProfile.preferred_business_models),
    portfolio_url: investorProfile.portfolio_url || '',
    due_diligence_requirements: investorProfile.due_diligence_requirements || '',
    profile_completion: investorProfile.profile_completion || 0,
    onboarding_completed: investorProfile.onboarding_completed || false,
    is_public: investorProfile.is_public !== false,
    is_active: investorProfile.is_active !== false,
    created_at: investorProfile.created_at || '',
    updated_at: investorProfile.updated_at || profile.updated_at || '',
  };
};

const formatDate = (value) => value ? new Date(value).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

export default function InvestorProfilePage() {
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

  const STORAGE_KEY = `investor_profile_draft_${user?.id || 'anon'}`;
  const SESSION_KEY = `investor_profile_session_${user?.id || 'anon'}`;

  const saveDraft = useCallback((data) => {
    try {
      const draft = { ...data, _savedAt: Date.now(), _userId: user?.id, _hasUnsavedChanges: true };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
      sessionStorage.setItem(SESSION_KEY, JSON.stringify(draft));
    } catch (err) {
      console.warn('Investor draft save failed:', err);
    }
  }, [SESSION_KEY, STORAGE_KEY, user?.id]);

  const loadDraft = useCallback(() => {
    try {
      const sessionRaw = sessionStorage.getItem(SESSION_KEY);
      if (sessionRaw) {
        const draft = JSON.parse(sessionRaw);
        if (draft._userId === user?.id) return draft;
      }
      const localRaw = localStorage.getItem(STORAGE_KEY);
      if (localRaw) {
        const draft = JSON.parse(localRaw);
        if (draft._userId === user?.id && Date.now() - draft._savedAt < 7 * 24 * 60 * 60 * 1000) return draft;
        localStorage.removeItem(STORAGE_KEY);
      }
    } catch (err) {
      console.warn('Investor draft load failed:', err);
    }
    return null;
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
      }, 150);
    }
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [formData, isEditMode, saveDraft]);

  const loadProfile = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const draft = loadDraft();
      const { profile, investorProfile } = await fetchInvestorProfile(user.id);
      const normalized = normalizeProfile(user, profile, investorProfile);
      const dbUpdatedAt = new Date(normalized.updated_at || 0).getTime();
      const useDraft = draft && draft._savedAt >= dbUpdatedAt;
      const source = useDraft ? { ...normalized, ...draft } : normalized;

      snapRef.current = source;
      setFormData(source);
      setIsEditMode(Boolean(useDraft && draft?._hasUnsavedChanges));
      setHasUnsavedChanges(Boolean(useDraft && draft?._hasUnsavedChanges));
      if (useDraft && draft?._hasUnsavedChanges) {
        toast('Unsaved changes restored', { duration: 3000, style: { background: '#1B2D7F', color: '#fff' } });
      }
    } catch (err) {
      console.error('Investor profile load error:', err);
      toast.error('Failed to load profile');
      setIsEditMode(true);
    } finally {
      setLoading(false);
    }
  }, [loadDraft, user]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const updateField = useCallback((key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    setHasUnsavedChanges(true);
  }, []);

  const toggleArrayField = (field, value) => {
    setFormData((prev) => {
      const arr = prev[field] || [];
      return { ...prev, [field]: arr.includes(value) ? arr.filter((item) => item !== value) : [...arr, value] };
    });
    setHasUnsavedChanges(true);
  };

  const handleUpdate = async (event) => {
    if (event) event.preventDefault();
    if (saving) return;

    setSaving(true);
    setSaveError('');

    try {
      const profileCompletion = calcInvestorCompletion(formData, formData);
      const payload = {
        ...formData,
        profile_id: formData.profile_id || user.id,
        fund_name: formData.fund_name || formData.firm_name,
        preferred_stages: formData.preferred_stages?.length ? formData.preferred_stages : formData.investment_stage,
        preferred_industries: formData.preferred_industries?.length ? formData.preferred_industries : formData.industries_of_interest,
        check_range_min: formData.check_range_min || formData.ticket_size_min,
        check_range_max: formData.check_range_max || formData.ticket_size_max,
        geography_focus: formData.geography_focus || formData.geographic_focus,
        total_investments: formData.total_investments || formData.portfolio_count,
        exits: formData.exits || formData.successful_exits,
        what_i_look_for: formData.what_i_look_for || formData.investment_thesis,
        website_url: formData.website_url?.trim() || '',
        booking_url: formData.booking_url?.trim() || '',
        investment_frequency: formData.investment_frequency || '',
        lead_or_follow: formData.lead_or_follow || '',
        minimum_traction_required: formData.minimum_traction_required?.trim() || '',
        preferred_business_models: formData.preferred_business_models || [],
        portfolio_url: formData.portfolio_url?.trim() || '',
        due_diligence_requirements: formData.due_diligence_requirements?.trim() || '',
        profile_completion: profileCompletion,
        onboarding_completed: true,
      };
      await saveInvestorBaseProfile(user.id, payload);
      await saveInvestorDetails(user.id, payload);
      clearDraft();
      setHasUnsavedChanges(false);
      toast.success('Profile saved!', { style: { background: '#98DE38', color: '#000' } });
      setIsEditMode(false);
      await loadProfile();
    } catch (err) {
      console.error('Investor profile save error:', err);
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
      const url = await uploadInvestorAvatar(user.id, file);
      updateField('avatar_url', url);
      toast.success('Avatar updated!');
    } catch (err) {
      console.error('Investor avatar upload error:', err);
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
      console.error('Investor delete error:', err);
      toast.error('Failed to deactivate');
    }
  };

  if (loading) {
    return (
      <>
        <style>{STYLES}</style>
        <RoleNavbar />
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
          <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
        </div>
      </>
    );
  }

  const completion = calcInvestorCompletion(formData, formData);

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
              <button type="button" onClick={() => setSaveError('')} className="p-1 hover:bg-red-100 rounded" aria-label="Close save error">
                <X className="w-4 h-4 text-red-400" />
              </button>
            </div>
          )}

          {completion < 100 && (
            <div className="g-brand rounded-2xl p-5 mb-8 text-black fade-in lift">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-3">
                <div>
                  <h3 className="font-bold text-base ss flex items-center gap-2"><Target className="w-4 h-4" />Complete Your Investor Profile</h3>
                  <p className="text-sm text-black/80 mt-1">Founders filter investors by stage, industry, ticket size, and thesis.</p>
                </div>
                <div className="text-right sm:text-left">
                  <div className="text-3xl font-black ss">{completion}%</div>
                  <div className="text-xs text-black/70">Complete</div>
                </div>
              </div>
              <div className="w-full bg-black/20 rounded-full h-2.5 overflow-hidden">
                <div className="h-full bg-black rounded-full transition-all" style={{ width: `${completion}%` }} />
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
                      <span className="text-white text-2xl font-bold ss">{formData.full_name?.charAt(0)?.toUpperCase() || 'I'}</span>
                    )}
                  </div>
                  {isEditMode && (
                    <label className="absolute bottom-0 right-0 p-2 bg-white rounded-full cursor-pointer hover:scale-105 transition-transform shadow border">
                      {uploading ? <Loader className="w-4 h-4 animate-spin text-gray-700" /> : <Camera className="w-4 h-4 text-gray-700" />}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" disabled={uploading} />
                    </label>
                  )}
                </div>
                <h2 className="font-black text-lg text-gray-900 mb-1 ss">{formData.full_name || 'Your Name'}</h2>
                <p className="text-sm text-gray-500">{formData.firm_name || 'Your Fund / Firm'}</p>
                <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-gray-50 text-gray-700 rounded-full text-xs font-bold uppercase mt-2 border">
                  {formData.investor_type || 'Investor'}
                </div>
                {formData.location && <p className="text-xs text-gray-400 flex items-center justify-center gap-1 mt-2"><MapPin className="w-3 h-3" />{formData.location}</p>}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 space-y-3">
                {!isEditMode ? (
                  <button type="button" onClick={() => setIsEditMode(true)} className="w-full py-3 g-brand text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90">
                    <Edit3 className="w-4 h-4" />Edit Profile
                  </button>
                ) : (
                  <>
                    <button type="button" onClick={handleUpdate} disabled={saving} className="w-full py-3 bg-[#1B2D7F] text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-[#2A3F8F] disabled:opacity-50">
                      {saving ? <><Loader className="w-4 h-4 animate-spin" />Saving...</> : <><Save className="w-4 h-4" />Save Changes</>}
                    </button>
                    <button type="button" onClick={() => { setFormData(snapRef.current || makeEmpty(user)); setIsEditMode(false); setHasUnsavedChanges(false); clearDraft(); setSaveError(''); }} className="w-full py-2.5 bg-gray-100 text-gray-700 rounded-xl font-semibold text-sm hover:bg-gray-200">
                      Cancel
                    </button>
                  </>
                )}
                <button type="button" onClick={() => setShowDeleteConfirm(true)} className="w-full py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" />Delete Account
                </button>
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
                  <ViewMode formData={formData} completion={completion} />
                ) : (
                  <EditMode formData={formData} updateField={updateField} toggleArrayField={toggleArrayField} completion={completion} />
                )}
              </div>
            </section>
          </div>

          {showDeleteConfirm && <DeleteModal onCancel={() => setShowDeleteConfirm(false)} onConfirm={handleDelete} />}
        </div>
      </div>
    </>
  );
}

function ViewMode({ formData, completion }) {
  const ticket = formData.check_range_min || formData.check_range_max
    ? `${formData.check_range_min || '0'} - ${formData.check_range_max || 'Open'} USD`
    : 'Not disclosed';

  return (
    <div className="space-y-10 dm">
      <header>
        <h1 className="text-3xl font-black text-gray-900 mb-1 ss">My Profile</h1>
        <p className="text-gray-500 text-sm">Your investor identity powers founder discovery, pitch matching, and deal flow.</p>
      </header>

      <Section title="Basic Information" icon={<User className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Full Name', value: formData.full_name, Icon: User },
            { label: 'Email', value: formData.email, Icon: Mail },
            { label: 'Location', value: formData.location, Icon: MapPin },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
        {formData.bio && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>About</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.bio}</p>
          </div>
        )}
      </Section>

      <Section title="Investment Criteria" icon={<DollarSign className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Investor Type', value: formData.investor_type, Icon: DollarSign },
            { label: 'Firm Name', value: formData.firm_name, Icon: Building2 },
            { label: 'Ticket Size', value: ticket, Icon: Target },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
        <ChipGroup title="Preferred Stages" values={formData.preferred_stages} strong />
        <ChipGroup title="Preferred Industries" values={formData.preferred_industries} />
        {formData.geography_focus && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4" style={{ borderColor: '#1B2D7F' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#1B2D7F' }}>Geographic Focus</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.geography_focus}</p>
          </div>
        )}
      </Section>

      <Section title="Investment Thesis" icon={<BookIcon />}>
        {formData.investment_thesis ? (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.investment_thesis}</p>
          </div>
        ) : <Empty label="No thesis added yet. Add one so founders can self-qualify before pitching." />}
      </Section>

      <Section title="Portfolio & Credibility" icon={<Star className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Portfolio Count', value: `${formData.portfolio_count || 0} companies`, Icon: Briefcase },
            { label: 'Successful Exits', value: formData.successful_exits || '0', Icon: CheckCircle },
            { label: 'Completion', value: `${completion}%`, Icon: Shield },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
        {formData.notable_investments ? (
          <div className="p-4 bg-gray-50 rounded-xl">
            <p className="text-xs font-bold text-gray-400 uppercase mb-1">Notable Investments</p>
            <p className="text-sm text-gray-700">{formData.notable_investments}</p>
          </div>
        ) : <Empty label="No notable investments added yet." />}
      </Section>

      <Section title="Engagement Preferences" icon={<Briefcase className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3">
          {[
            { label: 'Typical Involvement', value: formData.typical_involvement, Icon: UsersIcon },
            { label: 'Accepting Pitches', value: formData.accepting_pitches ? 'Yes' : 'Paused', Icon: CheckCircle },
            { label: 'Contact Method', value: formData.preferred_contact_method, Icon: Mail },
            { label: 'Response Time', value: formData.response_time, Icon: Clock },
            { label: 'Verified', value: formData.is_verified ? 'Verified' : 'Not verified', Icon: Shield },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
      </Section>

      <Section title="Deal Process" icon={<Target className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Investment Frequency', value: formData.investment_frequency, Icon: Clock },
            { label: 'Lead or Follow', value: formData.lead_or_follow, Icon: Target },
            { label: 'Booking Link', value: formData.booking_url ? 'Added' : '', Icon: LinkIcon },
            { label: 'Website', value: formData.website_url ? 'Added' : '', Icon: Globe },
            { label: 'Portfolio URL', value: formData.portfolio_url ? 'Added' : '', Icon: Briefcase },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
        <ChipGroup title="Preferred Business Models" values={formData.preferred_business_models} strong />
        {formData.minimum_traction_required && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mb-4" style={{ borderColor: '#1B2D7F' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#1B2D7F' }}>Minimum Traction Required</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.minimum_traction_required}</p>
          </div>
        )}
        {formData.due_diligence_requirements && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>Due Diligence Requirements</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.due_diligence_requirements}</p>
          </div>
        )}
      </Section>

      <Section title="Investor Profile Fields" icon={<Shield className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-4">
          {[
            { label: 'Fund Name', value: formData.fund_name, Icon: Building2 },
            { label: 'Check Range', value: `${formData.check_range_min || '0'} - ${formData.check_range_max || 'Open'} USD`, Icon: DollarSign },
            { label: 'Geography Focus', value: formData.geography_focus, Icon: Globe },
            { label: 'Total Investments', value: `${formData.total_investments || 0}`, Icon: Briefcase },
            { label: 'Exits', value: `${formData.exits || 0}`, Icon: CheckCircle },
            { label: 'Public Profile', value: formData.is_public ? 'Public' : 'Private', Icon: Shield },
            { label: 'Active Profile', value: formData.is_active ? 'Active' : 'Inactive', Icon: CheckCircle },
            { label: 'Onboarding', value: formData.onboarding_completed ? 'Completed' : 'In progress', Icon: Target },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
        <ChipGroup title="Preferred Stages" values={formData.preferred_stages} strong />
        <ChipGroup title="Preferred Industries" values={formData.preferred_industries} />
        {formData.what_i_look_for && (
          <div className="p-4 bg-gray-50 rounded-xl border-l-4 mt-4" style={{ borderColor: '#98DE38' }}>
            <p className="text-xs font-bold uppercase mb-1" style={{ color: '#98DE38' }}>What I Look For</p>
            <p className="text-sm text-gray-700 leading-relaxed">{formData.what_i_look_for}</p>
          </div>
        )}
      </Section>

      <Section title="System Fields" icon={<Shield className="w-5 h-5 text-[#1B2D7F]" />}>
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { label: 'Investor Profile ID', value: formData.id, Icon: Shield },
            { label: 'User ID', value: formData.user_id, Icon: User },
            { label: 'Profile ID', value: formData.profile_id, Icon: User },
            { label: 'Saved Completion', value: `${formData.profile_completion || 0}%`, Icon: Target },
            { label: 'Created', value: formatDate(formData.created_at), Icon: Clock },
            { label: 'Last Updated', value: formatDate(formData.updated_at), Icon: Clock },
          ].map((item) => <InfoTile key={item.label} item={item} />)}
        </div>
      </Section>

      <Section title="Links" icon={<LinkIcon className="w-5 h-5 text-[#1B2D7F]" />}>
        {[formData.linkedin_url, formData.github_url, formData.twitter_url].some(Boolean) ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin },
              { key: 'github_url', label: 'GitHub', Icon: Github },
              { key: 'twitter_url', label: 'Twitter', Icon: Twitter },
            ].filter((link) => formData[link.key]).map((link) => (
              <a key={link.key} href={formData[link.key]} target="_blank" rel="noreferrer" className="flex items-center gap-3 p-4 rounded-xl hover:opacity-80 transition-all bg-gray-50 text-[#1B2D7F]">
                <link.Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold uppercase tracking-wide">{link.label}</p>
                  <p className="text-xs truncate opacity-80">{formData[link.key].replace(/^https?:\/\//, '')}</p>
                </div>
                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-50" />
              </a>
            ))}
          </div>
        ) : <Empty label="No links added yet. LinkedIn boosts investor credibility." />}
      </Section>
    </div>
  );
}

function EditMode({ formData, updateField, toggleArrayField, completion }) {
  return (
    <form onSubmit={(event) => event.preventDefault()} className="space-y-10 dm">
      <header>
        <h1 className="text-3xl font-black text-gray-900 ss mb-1">Edit Profile</h1>
        <p className="text-gray-400 text-sm">Basic info + investment criteria + portfolio signals.</p>
      </header>

      <div className="bg-gray-50 border border-gray-200 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-bold ss" style={{ color: '#1B2D7F' }}>Profile Completion</span>
          <span className="font-black ss" style={{ color: '#1B2D7F' }}>{completion}%</span>
        </div>
        <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all prog" style={{ width: `${completion}%` }} />
        </div>
      </div>

      <EditSection title="Basic Information" icon={<User className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Full Name *" value={formData.full_name} onChange={(value) => updateField('full_name', value)} icon={<User className="w-4 h-4" />} placeholder="Your full name" required />
          <FormInput label="Email" value={formData.email} disabled icon={<Mail className="w-4 h-4" />} hint="Contact support to change" />
          <FormInput label="City / Country" value={formData.location} onChange={(value) => updateField('location', value)} icon={<MapPin className="w-4 h-4" />} placeholder="e.g. Karachi, Pakistan" />
        </div>
        <FormTextarea label="About You" value={formData.bio} onChange={(value) => updateField('bio', value)} placeholder="2-3 sentences about your background, investment focus, and what you bring beyond capital..." rows={3} max={500} />
      </EditSection>

      <EditSection title="Investment Criteria" icon={<DollarSign className="w-4 h-4" />} hint="Founders use these fields to decide whether to pitch you.">
        <div className="grid md:grid-cols-2 gap-4">
          <SelectField label="Investor Type" value={formData.investor_type} onChange={(value) => updateField('investor_type', value)} options={INVESTOR_TYPES} placeholder="Select investor type..." />
          <FormInput label="Fund / Firm Name" value={formData.firm_name} onChange={(value) => updateField('firm_name', value)} icon={<Building2 className="w-4 h-4" />} placeholder="e.g. Indus Valley Capital" />
          <FormInput label="Check Range Min (USD)" type="number" value={formData.check_range_min ?? ''} onChange={(value) => updateField('check_range_min', value)} placeholder="e.g. 25000" />
          <FormInput label="Check Range Max (USD)" type="number" value={formData.check_range_max ?? ''} onChange={(value) => updateField('check_range_max', value)} placeholder="e.g. 150000" />
          <SelectField label="Geography Focus" value={formData.geography_focus} onChange={(value) => updateField('geography_focus', value)} options={GEO_OPTS} placeholder="Select geography..." />
        </div>

        <ChipPicker label="Preferred Stages" values={STAGE_OPTS} selected={formData.preferred_stages || []} onToggle={(value) => toggleArrayField('preferred_stages', value)} />
        <ChipPicker label="Preferred Industries" values={INDUSTRY_OPTS} selected={formData.preferred_industries || []} onToggle={(value) => toggleArrayField('preferred_industries', value)} />
        <FormTextarea label="Investment Thesis" value={formData.investment_thesis} onChange={(value) => updateField('investment_thesis', value)} placeholder="What do you invest in and why? What kind of founders, stages, and markets are a fit?" rows={4} max={700} />
      </EditSection>

      <EditSection title="Portfolio & Credibility" icon={<Star className="w-4 h-4" />} hint="Trust signals help serious founders prioritize your response.">
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Portfolio Count" type="number" value={formData.portfolio_count ?? ''} onChange={(value) => updateField('portfolio_count', value === '' ? 0 : Number(value))} placeholder="e.g. 12" />
          <FormInput label="Successful Exits" type="number" value={formData.successful_exits ?? ''} onChange={(value) => updateField('successful_exits', value === '' ? 0 : Number(value))} placeholder="e.g. 2" />
        </div>
        <FormTextarea label="Notable Investments" value={formData.notable_investments} onChange={(value) => updateField('notable_investments', value)} placeholder="Companies you've backed that founders will recognize." rows={2} max={400} />
      </EditSection>

      <EditSection title="Engagement Preferences" icon={<Briefcase className="w-4 h-4" />} hint="Help founders understand how you work before they pitch.">
        <div className="grid md:grid-cols-2 gap-4">
          <SelectField label="Typical Involvement" value={formData.typical_involvement} onChange={(value) => updateField('typical_involvement', value)} options={INVOLVEMENT_OPTS} placeholder="Select involvement..." />
          <SelectField label="Preferred Contact Method" value={formData.preferred_contact_method} onChange={(value) => updateField('preferred_contact_method', value)} options={CONTACT_OPTS} placeholder="Select contact method..." />
          <SelectField label="Response Time" value={formData.response_time} onChange={(value) => updateField('response_time', value)} options={RESPONSE_TIME_OPTS} placeholder="Select response time..." />
        </div>
        <label className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-[#98DE38]/50 transition-all">
          <input type="checkbox" checked={formData.accepting_pitches !== false} onChange={(event) => updateField('accepting_pitches', event.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1B2D7F] focus:ring-[#98DE38]" />
          <div>
            <p className="text-sm font-semibold text-gray-700">Accepting pitches</p>
            <p className="text-xs text-gray-400">Keep this on when founders can send investor interest requests.</p>
          </div>
        </label>
      </EditSection>

      <EditSection title="Deal Process" icon={<Target className="w-4 h-4" />} hint="Use clean investor fields for founder matching and pitch routing.">
        <div className="grid md:grid-cols-2 gap-4">
          <SelectField label="Investment Frequency" value={formData.investment_frequency} onChange={(value) => updateField('investment_frequency', value)} options={INVESTMENT_FREQUENCY_OPTS} placeholder="Select frequency..." />
          <SelectField label="Lead or Follow" value={formData.lead_or_follow} onChange={(value) => updateField('lead_or_follow', value)} options={LEAD_OR_FOLLOW_OPTS} placeholder="Select preference..." />
          <FormInput label="Website URL" value={formData.website_url} onChange={(value) => updateField('website_url', value)} icon={<Globe className="w-4 h-4" />} placeholder="https://yourfund.com" />
          <FormInput label="Booking URL" value={formData.booking_url} onChange={(value) => updateField('booking_url', value)} icon={<LinkIcon className="w-4 h-4" />} placeholder="https://calendly.com/your-link" />
          <FormInput label="Portfolio URL" value={formData.portfolio_url} onChange={(value) => updateField('portfolio_url', value)} icon={<Briefcase className="w-4 h-4" />} placeholder="https://yourfund.com/portfolio" />
        </div>
        <ChipPicker label="Preferred Business Models" values={BUSINESS_MODEL_OPTS} selected={formData.preferred_business_models || []} onToggle={(value) => toggleArrayField('preferred_business_models', value)} />
        <FormTextarea label="Minimum Traction Required" value={formData.minimum_traction_required} onChange={(value) => updateField('minimum_traction_required', value)} placeholder="e.g. MVP launched, 1K MAU, paid pilots, revenue, LOIs, or founder-market fit signals." rows={3} max={500} />
        <FormTextarea label="Due Diligence Requirements" value={formData.due_diligence_requirements} onChange={(value) => updateField('due_diligence_requirements', value)} placeholder="Documents or proof you need before reviewing: pitch deck, cap table, financials, metrics, incorporation, customer evidence." rows={3} max={700} />
      </EditSection>

      <EditSection title="Investor Profile Fields" icon={<Shield className="w-4 h-4" />} hint="These map directly to investor_profiles, including alias fields used by matching and filters.">
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Fund Name" value={formData.fund_name || formData.firm_name} onChange={(value) => { updateField('fund_name', value); updateField('firm_name', value); }} icon={<Building2 className="w-4 h-4" />} placeholder="e.g. Indus Valley Capital" />
          <FormInput label="Check Range Min (USD)" type="number" value={formData.check_range_min ?? formData.ticket_size_min ?? ''} onChange={(value) => { updateField('check_range_min', value); updateField('ticket_size_min', value); }} placeholder="e.g. 25000" />
          <FormInput label="Check Range Max (USD)" type="number" value={formData.check_range_max ?? formData.ticket_size_max ?? ''} onChange={(value) => { updateField('check_range_max', value); updateField('ticket_size_max', value); }} placeholder="e.g. 150000" />
          <SelectField label="Geography Focus" value={formData.geography_focus || formData.geographic_focus} onChange={(value) => { updateField('geography_focus', value); updateField('geographic_focus', value); }} options={GEO_OPTS} placeholder="Select geography..." />
          <FormInput label="Total Investments" type="number" value={formData.total_investments ?? formData.portfolio_count ?? ''} onChange={(value) => { const next = value === '' ? 0 : Number(value); updateField('total_investments', next); updateField('portfolio_count', next); }} placeholder="e.g. 12" />
          <FormInput label="Exits" type="number" value={formData.exits ?? formData.successful_exits ?? ''} onChange={(value) => { const next = value === '' ? 0 : Number(value); updateField('exits', next); updateField('successful_exits', next); }} placeholder="e.g. 2" />
        </div>
        <ChipPicker label="Preferred Stages" values={STAGE_OPTS} selected={formData.preferred_stages || formData.investment_stage || []} onToggle={(value) => { toggleArrayField('preferred_stages', value); toggleArrayField('investment_stage', value); }} />
        <ChipPicker label="Preferred Industries" values={INDUSTRY_OPTS} selected={formData.preferred_industries || formData.industries_of_interest || []} onToggle={(value) => { toggleArrayField('preferred_industries', value); toggleArrayField('industries_of_interest', value); }} />
        <FormTextarea label="What I Look For" value={formData.what_i_look_for || formData.investment_thesis} onChange={(value) => { updateField('what_i_look_for', value); updateField('investment_thesis', value); }} placeholder="Describe the signals, founder qualities, traction, and market conditions you care about." rows={3} max={700} />
        <div className="grid md:grid-cols-2 gap-3">
          {[
            { field: 'is_public', title: 'Public profile', desc: 'Show this investor profile in founder discovery.' },
            { field: 'is_active', title: 'Active profile', desc: 'Keep matching and pitch workflows enabled.' },
            { field: 'is_verified', title: 'Verified investor', desc: 'Mark this profile as verified after admin review.' },
          ].map((item) => (
            <label key={item.field} className="flex items-start gap-3 p-4 border-2 border-gray-200 rounded-2xl cursor-pointer hover:border-[#98DE38]/50 transition-all">
              <input type="checkbox" checked={formData[item.field] === true} onChange={(event) => updateField(item.field, event.target.checked)} className="mt-1 w-4 h-4 rounded border-gray-300 text-[#1B2D7F] focus:ring-[#98DE38]" />
              <div>
                <p className="text-sm font-semibold text-gray-700">{item.title}</p>
                <p className="text-xs text-gray-400">{item.desc}</p>
              </div>
            </label>
          ))}
        </div>
        <div className="grid md:grid-cols-2 gap-4">
          <FormInput label="Investor Profile ID" value={formData.id || ''} disabled icon={<Shield className="w-4 h-4" />} />
          <FormInput label="User ID" value={formData.user_id || ''} disabled icon={<User className="w-4 h-4" />} />
          <FormInput label="Profile ID" value={formData.profile_id || ''} disabled icon={<User className="w-4 h-4" />} />
          <FormInput label="Saved Completion" value={`${formData.profile_completion || 0}%`} disabled icon={<Target className="w-4 h-4" />} />
        </div>
      </EditSection>

      <EditSection title="Links" icon={<LinkIcon className="w-4 h-4" />} hint="LinkedIn is the strongest investor verification signal.">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { field: 'linkedin_url', Icon: Linkedin, label: 'LinkedIn URL', points: 3, placeholder: 'https://linkedin.com/in/you' },
            { field: 'github_url', Icon: Github, label: 'GitHub URL', points: 1, placeholder: 'https://github.com/you' },
            { field: 'twitter_url', Icon: Twitter, label: 'Twitter URL', points: 1, placeholder: 'https://twitter.com/you' },
          ].map((item) => (
            <div key={item.field}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-gray-500 uppercase tracking-wide mb-1.5">
                <item.Icon className="w-3.5 h-3.5" style={{ color: '#1B2D7F' }} />
                {item.label}
                <span className="ml-auto text-white font-bold px-1.5 py-0.5 rounded-full text-[10px]" style={{ background: '#98DE38' }}>+{item.points}</span>
              </label>
              <input type="url" placeholder={item.placeholder} value={formData[item.field] || ''} onChange={(event) => updateField(item.field, event.target.value)} className="inp" aria-label={`${item.label} input`} />
            </div>
          ))}
        </div>
      </EditSection>
    </form>
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
        <p className="text-sm font-semibold text-gray-800 truncate">{item.value || <span className="text-gray-300 italic">Not provided</span>}</p>
      </div>
    </div>
  );
}

function ChipGroup({ title, values = [], strong = false }) {
  return (
    <div className="mb-3">
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      {values.length > 0 ? (
        <div className="flex flex-wrap gap-2">
          {values.map((value) => (
            <span key={value} className="px-3 py-2 rounded-full text-xs font-semibold border" style={{ background: strong ? 'rgba(152,222,56,0.12)' : 'rgba(27,45,127,0.08)', color: '#1B2D7F', borderColor: strong ? '#98DE38' : 'rgba(27,45,127,0.2)' }}>
              {value}
            </span>
          ))}
        </div>
      ) : <Empty label={`No ${title.toLowerCase()} added yet.`} />}
    </div>
  );
}

function ChipPicker({ label, values, selected, onToggle }) {
  return (
    <div>
      <p className="text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">{label}</p>
      <div className="flex flex-wrap gap-2 mb-4">
        {values.map((value) => (
          <button key={value} type="button" onClick={() => onToggle(value)} className={`chip ${selected.includes(value) ? 'selected' : ''}`} aria-pressed={selected.includes(value)}>
            {selected.includes(value) ? '✓' : '+'} {value}
          </button>
        ))}
      </div>
    </div>
  );
}

function SelectField({ label, value, onChange, options, placeholder }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>
      <select className="sel" value={value || ''} onChange={(event) => onChange(event.target.value)}>
        <option value="">{placeholder}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
    </div>
  );
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
    {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}{required && <span className="text-red-500 ml-0.5">*</span>}</label>}
    <div className="relative">
      {icon && <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none">{icon}</div>}
      <input type={type} value={value || ''} onChange={(event) => onChange?.(event.target.value)} placeholder={placeholder} required={required} disabled={disabled} className={`inp ${icon ? 'pl-10' : ''}`} />
    </div>
    {hint && <p className="text-xs text-gray-400 -mt-1">{hint}</p>}
  </div>
);

const FormTextarea = ({ label, value, onChange, placeholder, rows = 4, max }) => (
  <div className="space-y-1.5">
    {label && <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide">{label}</label>}
    <textarea value={value || ''} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={rows} maxLength={max} className="ta" />
    {max && <p className="text-xs text-gray-400 text-right">{(value || '').length}/{max}</p>}
  </div>
);

const Empty = ({ label }) => (
  <div className="text-center py-6 px-4 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
    <p className="text-sm text-gray-400 italic">{label}</p>
  </div>
);

const DeleteModal = ({ onCancel, onConfirm }) => (
  <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4" role="dialog" aria-modal="true" onClick={(event) => event.target === event.currentTarget && onCancel()}>
    <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl text-center lift">
      <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4">
        <AlertTriangle className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-black text-gray-900 mb-2 ss">Delete Account?</h2>
      <p className="text-gray-600 mb-6 text-sm">This action is permanent. All your profile data, requests, and activity will be deactivated.</p>
      <div className="flex gap-3">
        <button type="button" onClick={onCancel} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold hover:bg-gray-200">Cancel</button>
        <button type="button" onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Delete Account</button>
      </div>
    </div>
  </div>
);

function BookIcon() {
  return <Globe className="w-5 h-5 text-[#1B2D7F]" />;
}

function UsersIcon(props) {
  return <Briefcase {...props} />;
}
