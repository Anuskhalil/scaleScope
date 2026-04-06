// src/pages/MentorProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../components/landing-page/RoleNavbar';
import {
    fetchMentorProfile, calcMentorCompletion,
    saveMentorBaseProfile, saveMentorDetails, uploadMentorAvatar,
} from '../services/mentorService';
import {
    User, BookOpen, Briefcase, Award, Save, AlertTriangle,
    Edit3, MapPin, Mail, Link as LinkIcon, Camera, Loader,
    Github, Twitter, Linkedin, X, Shield, ChevronDown,
    CheckCircle, Trash2, Star, DollarSign, Clock, Users,
    TrendingUp, Building2, Target, Plus,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .2s cubic-bezier(.22,.68,0,1.2),box-shadow .2s ease}
  .lift:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(5,150,105,.10)}
  .g-ment{background:linear-gradient(135deg,#059669,#0891b2)}
  .prog{background:linear-gradient(90deg,#059669,#0891b2)}
  .inp{width:100%;padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;transition:border-color .15s,background .15s;font-family:'DM Sans',sans-serif}
  .inp:focus{border-color:#059669;background:#fff}
  .inp:disabled{opacity:.5;cursor:not-allowed}
  .sel{width:100%;padding:10px 36px 10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;appearance:none;cursor:pointer;font-family:'DM Sans',sans-serif}
  .sel:focus{border-color:#059669;background:#fff}
  .ta{width:100%;padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;resize:none;font-family:'DM Sans',sans-serif}
  .ta:focus{border-color:#059669;background:#fff}
  .sec-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#059669;display:flex;align-items:center;gap:6px;margin-bottom:4px}
  .fade-in{animation:fi .3s ease both}
  @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
`;

const EXPERTISE_CHIPS = ['Product', 'Fundraising', 'Growth / Marketing', 'Technical / Engineering', 'Legal / Compliance', 'Finance / CFO', 'Design / UX', 'Sales', 'Operations', 'AI / ML', 'EdTech', 'HealthTech', 'FinTech', 'SaaS', 'AgriTech', 'CleanTech'];
const HELP_CHIPS = ['Idea validation', 'Finding product-market fit', 'Fundraising pitch', 'Team building', 'Technical architecture', 'Marketing strategy', 'Financial modelling', 'Legal setup', 'Scaling operations', 'Mental health / resilience'];
const AVAIL_CHIPS = ['1:1 Video calls', 'Async messages', 'Email Q&A', 'Co-working sessions', 'Pitch practice', 'CV / Portfolio review'];
const STYLE_OPTS = ['Hands-on (weekly check-ins)', 'Advisory (monthly strategy)', 'Sounding Board (as needed)', 'Peer accountability', 'Group sessions'];

const makeEmpty = (user) => ({
    // profiles
    full_name: '', email: user?.email || '', location: '', bio: '',
    avatar_url: '', linkedin_url: '', github_url: '', twitter_url: '',
    skills: [],
    // mentor_profiles
    // mentor_profiles
    expertise_areas: [],

    // ✅ FIXED TYPES
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
    // ✅ IMPORTANT
    hourly_rate: null,
    is_pro_bono: false,
});

export default function MentorProfilePage() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const snapRef = useRef(null);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [editMode, setEditMode] = useState(false);
    const [confirmDel, setConfirmDel] = useState(false);
    const [saveErr, setSaveErr] = useState('');

    // tag inputs
    const [coInput, setCoInput] = useState('');
    const [foundInput, setFoundInput] = useState('');

    const [form, setForm] = useState(makeEmpty(user));
    const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
    const togArr = (k, v) => setForm(p => {
        const a = p[k] || [];
        return { ...p, [k]: a.includes(v) ? a.filter(x => x !== v) : [...a, v] };
    });
    const addTag = (k, val, setInput) => {
        const v = val.trim();
        if (!v || (form[k] || []).includes(v)) return;
        setForm(p => ({ ...p, [k]: [...(p[k] || []), v] }));
        setInput('');
    };
    const removeTag = (k, v) => setForm(p => ({ ...p, [k]: (p[k] || []).filter(x => x !== v) }));

    const load = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        try {
            const { profile, mentorProfile } = await fetchMentorProfile(user.id);
            if (profile?.id) {
                const m = {
                    ...makeEmpty(user),
                    full_name: profile.full_name || '',
                    email: profile.email || user.email || '',
                    location: profile.location || '',
                    bio: profile.bio || '',
                    avatar_url: profile.avatar_url || '',
                    linkedin_url: profile.linkedin_url || '',
                    github_url: profile.github_url || '',
                    twitter_url: profile.twitter_url || '',
                    skills: Array.isArray(profile.skills) ? profile.skills : [],
                    expertise_areas: Array.isArray(mentorProfile.expertise_areas) ? mentorProfile.expertise_areas : [],
                    years_experience: mentorProfile.years_experience || '',
                    current_role: mentorProfile.current_role || '',
                    current_company: mentorProfile.current_company || '',
                    companies_worked: Array.isArray(mentorProfile.companies_worked) ? mentorProfile.companies_worked : [],
                    companies_founded: Array.isArray(mentorProfile.companies_founded) ? mentorProfile.companies_founded : [],
                    successful_exits: mentorProfile.successful_exits || '',
                    mentorship_style: mentorProfile.mentorship_style || '',
                    can_help_with: Array.isArray(mentorProfile.can_help_with) ? mentorProfile.can_help_with : [],
                    available_for: Array.isArray(mentorProfile.available_for) ? mentorProfile.available_for : [],
                    mentorship_capacity: mentorProfile.mentorship_capacity || 3,
                    current_mentees: mentorProfile.current_mentees || 0,
                    hourly_rate: mentorProfile.hourly_rate || '',
                    is_pro_bono: Boolean(mentorProfile.is_pro_bono),
                };
                snapRef.current = m;
                setForm(m);
                setEditMode(false);
            } else { setEditMode(true); }
        } catch (err) { console.error(err); setEditMode(true); }
        finally { setLoading(false); }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    const handleSave = async (e) => {
        if (e) e.preventDefault();
        setSaving(true); setSaveErr('');
        try {
            const completion = calcMentorCompletion(form, form);
            await saveMentorBaseProfile(user.id, { ...form, profile_completion: completion, onboarding_completed: true });
            await saveMentorDetails(user.id, form);
            setEditMode(false);
            await load();
        } catch (err) {
            setSaveErr(err.message || 'Failed to save — please try again.');
            if (snapRef.current) setForm(snapRef.current);
        } finally { setSaving(false); }
    };

    const handleAvatar = async (e) => {
        const file = e.target.files?.[0];
        if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
        setUploading(true);
        try { const url = await uploadMentorAvatar(user.id, file); set('avatar_url', url); }
        catch (err) { alert('Upload failed: ' + err.message); }
        finally { setUploading(false); }
    };

    const handleDelete = async () => {
        try {
            await supabase.from('profiles').delete().eq('id', user.id);
            await supabase.auth.signOut();
            navigate('/');
        } catch (err) { alert(err.message); }
    };

    if (loading) return (
        <><style>{CSS}</style><RoleNavbar />
            <div className="h-screen flex items-center justify-center">
                <Loader className="w-8 h-8 animate-spin text-emerald-500" />
            </div>
        </>
    );

    const completion = calcMentorCompletion(form, form);
    const init = (form.full_name || 'M').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
    const spotsLeft = Math.max(0, (form.mentorship_capacity || 3) - (form.current_mentees || 0));
    const trustPts = (form.linkedin_url ? 3 : 0) + (form.github_url ? 2 : 0)
        + (form.successful_exits > 0 ? 3 : 0) + (form.companies_worked?.length > 0 ? 2 : 0);
    const trustPct = Math.round((trustPts / 10) * 100);

    return (
        <>
            <style>{CSS}</style>
            <RoleNavbar />
            <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 dm">
                <div className="max-w-5xl mx-auto">

                    {saveErr && (
                        <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-6 fade-in">
                            <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                            <p className="text-sm text-red-700 flex-1">{saveErr}</p>
                            <button onClick={() => setSaveErr('')}><X className="w-4 h-4 text-red-400" /></button>
                        </div>
                    )}

                    {completion < 100 && (
                        <div className="g-ment rounded-2xl p-5 mb-8 text-white fade-in">
                            <div className="flex items-center justify-between mb-2">
                                <div>
                                    <h3 className="font-bold ss">Complete Your Mentor Profile</h3>
                                    <p className="text-sm text-white/80">A complete profile gets you more and better mentorship requests.</p>
                                </div>
                                <div className="text-right">
                                    <div className="text-3xl font-black ss">{completion}%</div>
                                    <div className="text-xs text-white/70">Complete</div>
                                </div>
                            </div>
                            <div className="w-full bg-white/30 rounded-full h-2">
                                <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${completion}%` }} />
                            </div>
                        </div>
                    )}

                    <div className="grid lg:grid-cols-4 gap-8">

                        {/* ── SIDEBAR ─────────────────────────────────────────────── */}
                        <aside className="lg:col-span-1 space-y-4">

                            {/* Avatar card */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
                                <div className="relative inline-block mb-4">
                                    <div className="h-24 w-24 rounded-full bg-gradient-to-br from-emerald-500 to-teal-500 mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                                        {form.avatar_url
                                            ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                                            : <span className="text-white text-2xl font-bold ss">{init}</span>}
                                    </div>
                                    {editMode && (
                                        <label className="absolute bottom-0 right-0 p-2 bg-emerald-500 rounded-full cursor-pointer hover:bg-emerald-600 shadow-lg">
                                            {uploading ? <Loader className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                                            <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
                                        </label>
                                    )}
                                </div>
                                <h2 className="font-black text-lg text-slate-800 mb-0.5 ss">{form.full_name || 'Your Name'}</h2>
                                {form.current_role && <p className="text-sm font-bold text-emerald-600 ss mb-0.5">{form.current_role}</p>}
                                {form.current_company && <p className="text-xs text-slate-400 mb-1">at {form.current_company}</p>}
                                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-50 text-emerald-700 rounded-full text-xs font-bold uppercase mb-2">
                                    <BookOpen className="w-3.5 h-3.5" /> Mentor
                                </div>
                                {form.location && (
                                    <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                                        <MapPin className="w-3 h-3" />{form.location}
                                    </p>
                                )}
                                {form.years_experience > 0 && (
                                    <p className="text-xs text-slate-500 mt-1">{form.years_experience} yrs experience</p>
                                )}
                                {form.is_pro_bono && (
                                    <span className="inline-block mt-2 text-xs bg-emerald-50 text-emerald-700 border border-emerald-100 px-2.5 py-0.5 rounded-full font-bold">Pro Bono ✓</span>
                                )}
                            </div>

                            {/* Buttons */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 space-y-2">
                                {!editMode ? (
                                    <button onClick={() => setEditMode(true)}
                                        className="w-full py-3 g-ment text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                                        <Edit3 className="w-4 h-4" /> Edit Profile
                                    </button>
                                ) : (
                                    <>
                                        <button onClick={handleSave} disabled={saving}
                                            className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all">
                                            {saving ? <><Loader className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
                                        </button>
                                        <button onClick={() => { setForm(snapRef.current || makeEmpty(user)); setEditMode(false); setSaveErr(''); }}
                                            className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all">Cancel</button>
                                    </>
                                )}
                                <button onClick={() => setConfirmDel(true)}
                                    className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                                    <Trash2 className="w-4 h-4" /> Delete Account
                                </button>
                            </div>

                            {/* Credibility */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 ss">
                                        <Shield className="w-4 h-4 text-emerald-500" />Credibility
                                    </p>
                                    <span className="text-sm font-black text-emerald-600">{trustPct}%</span>
                                </div>
                                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                                    <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${trustPct}%` }} />
                                </div>
                                {[
                                    { label: 'LinkedIn', key: 'linkedin_url', pts: 3, check: !!form.linkedin_url },
                                    { label: 'GitHub', key: 'github_url', pts: 2, check: !!form.github_url },
                                    { label: 'Exits', key: 'successful_exits', pts: 3, check: form.successful_exits > 0 },
                                    { label: 'Companies', key: 'companies_worked', pts: 2, check: (form.companies_worked?.length || 0) > 0 },
                                ].map(l => (
                                    <div key={l.key} className="flex items-center justify-between text-xs mb-1.5">
                                        <span className={l.check ? 'text-slate-600' : 'text-slate-400'}>{l.label}</span>
                                        <span className={`font-bold ${l.check ? 'text-emerald-600' : 'text-slate-300'}`}>
                                            {l.check ? '✓ added' : `+${l.pts} pts`}
                                        </span>
                                    </div>
                                ))}
                            </div>

                            {/* Availability */}
                            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                                <h3 className="ss font-bold text-slate-900 text-sm mb-3 flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-emerald-500" /> Availability
                                </h3>
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl">
                                        <span className="text-slate-500">Capacity</span>
                                        <span className="font-bold text-slate-800 ss">{form.mentorship_capacity} max</span>
                                    </div>
                                    <div className="flex items-center justify-between text-xs p-2.5 bg-slate-50 rounded-xl">
                                        <span className="text-slate-500">Active</span>
                                        <span className="font-bold text-slate-800 ss">{form.current_mentees}</span>
                                    </div>
                                    <div className={`flex items-center justify-between text-xs p-2.5 rounded-xl ${spotsLeft > 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                                        <span className={spotsLeft > 0 ? 'text-emerald-600' : 'text-red-500'}>Open spots</span>
                                        <span className={`font-bold ss ${spotsLeft > 0 ? 'text-emerald-700' : 'text-red-600'}`}>{spotsLeft}</span>
                                    </div>
                                </div>
                            </div>
                        </aside>

                        {/* ── MAIN ────────────────────────────────────────────────── */}
                        <main className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
                            {!editMode
                                ? <ViewMode form={form} />
                                : <EditMode form={form} set={set} togArr={togArr}
                                    addTag={addTag} removeTag={removeTag}
                                    coInput={coInput} setCoInput={setCoInput}
                                    foundInput={foundInput} setFoundInput={setFoundInput}
                                    handleSave={handleSave} saving={saving} completion={completion} />}
                        </main>
                    </div>

                    {confirmDel && (
                        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                            <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                                <div className="text-center">
                                    <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <AlertTriangle className="w-8 h-8 text-red-500" />
                                    </div>
                                    <h2 className="text-2xl font-black text-slate-900 mb-2 ss">Delete Account?</h2>
                                    <p className="text-slate-600 mb-6 text-sm">Permanent. All your mentor data will be deleted.</p>
                                    <div className="flex gap-3">
                                        <button onClick={() => setConfirmDel(false)} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
                                        <button onClick={handleDelete} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Delete</button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </>
    );
}

// ─── VIEW MODE ────────────────────────────────────────────────────────────
function ViewMode({ form }) {
    return (
        <div className="space-y-10 dm">
            <div>
                <h1 className="text-3xl font-black text-slate-900 mb-1 ss">Mentor Profile</h1>
                <p className="text-slate-500 text-sm">Visible to students and founders looking for guidance.</p>
            </div>

            {/* A — Basic Info */}
            <VSec title="A · Basic Information" icon={<User className="w-5 h-5 text-emerald-500" />}>
                <div className="grid md:grid-cols-2 gap-3 mb-3">
                    {[
                        { label: 'Full Name', val: form.full_name, Icon: User },
                        { label: 'Email', val: form.email, Icon: Mail },
                        { label: 'Location', val: form.location, Icon: MapPin },
                    ].map((item, i) => (
                        <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl">
                            <div className="p-2 bg-emerald-50 text-emerald-500 rounded-lg flex-shrink-0"><item.Icon className="w-4 h-4" /></div>
                            <div className="min-w-0">
                                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</p>
                                <p className="text-sm font-semibold text-slate-800 truncate">
                                    {item.val || <span className="text-slate-300 italic font-normal">Not set</span>}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
                {form.bio && (
                    <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-emerald-300">
                        <p className="text-xs font-bold text-emerald-500 uppercase mb-1">About</p>
                        <p className="text-sm text-slate-700 leading-relaxed">{form.bio}</p>
                    </div>
                )}
            </VSec>

            {/* B — Expertise */}
            <VSec title="B · Expertise" icon={<Star className="w-5 h-5 text-emerald-500" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {[
                        { label: 'Experience', val: form.years_experience ? `${form.years_experience} years` : '—' },
                        { label: 'Role', val: form.current_role || '—' },
                        { label: 'Company', val: form.current_company || '—' },
                    ].map((item, i) => (
                        <div key={i} className="text-center bg-emerald-50 rounded-xl p-4 border border-emerald-100">
                            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                            <p className="ss font-black text-slate-900 text-sm">{item.val}</p>
                        </div>
                    ))}
                </div>
                {(form.expertise_areas || []).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {form.expertise_areas.map((e, i) => (
                            <span key={i} className="px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-semibold">{e}</span>
                        ))}
                    </div>
                )}
            </VSec>

            {/* C — Mentorship Details */}
            <VSec title="C · Mentorship Details" icon={<BookOpen className="w-5 h-5 text-emerald-500" />}>
                {form.mentorship_style && (
                    <div className="p-4 bg-emerald-50 border border-emerald-100 rounded-2xl mb-3">
                        <p className="text-xs font-bold text-emerald-600 uppercase mb-1">Style</p>
                        <p className="text-sm font-semibold text-slate-900 ss">{form.mentorship_style}</p>
                    </div>
                )}
                {(form.can_help_with || []).length > 0 && (
                    <div className="mb-3">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Can Help With</p>
                        <div className="flex flex-wrap gap-2">
                            {form.can_help_with.map((h, i) => (
                                <span key={i} className="px-3 py-1.5 bg-teal-50 text-teal-700 border border-teal-100 rounded-full text-xs font-medium">{h}</span>
                            ))}
                        </div>
                    </div>
                )}
                {(form.available_for || []).length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Available For</p>
                        <div className="flex flex-wrap gap-2">
                            {form.available_for.map((a, i) => (
                                <span key={i} className="px-3 py-1.5 bg-blue-50 text-blue-700 border border-blue-100 rounded-full text-xs font-medium">{a}</span>
                            ))}
                        </div>
                    </div>
                )}
            </VSec>

            {/* D — Credibility */}
            <VSec title="D · Credibility" icon={<Award className="w-5 h-5 text-emerald-500" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
                    {[
                        { label: 'Exits', val: form.successful_exits || '0' },
                        { label: 'Founded', val: (form.companies_founded || []).length || '0' },
                        { label: 'Worked At', val: (form.companies_worked || []).length || '0' },
                    ].map((item, i) => (
                        <div key={i} className="text-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                            <p className="ss font-black text-slate-900 text-2xl">{item.val}</p>
                        </div>
                    ))}
                </div>
                {(form.companies_worked || []).length > 0 && (
                    <div className="mb-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Companies Worked At</p>
                        <div className="flex flex-wrap gap-2">
                            {form.companies_worked.map((c, i) => (
                                <span key={i} className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded-full text-xs font-medium">{c}</span>
                            ))}
                        </div>
                    </div>
                )}
                {(form.companies_founded || []).length > 0 && (
                    <div>
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Companies Founded</p>
                        <div className="flex flex-wrap gap-2">
                            {form.companies_founded.map((c, i) => (
                                <span key={i} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 rounded-full text-xs font-medium">{c}</span>
                            ))}
                        </div>
                    </div>
                )}
            </VSec>

            {/* E — Availability & Pricing */}
            <VSec title="E · Availability & Pricing" icon={<DollarSign className="w-5 h-5 text-emerald-500" />}>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {[
                        { label: 'Capacity', val: `${form.mentorship_capacity || 3} mentees max` },
                        { label: 'Currently', val: `${form.current_mentees || 0} active` },
                        { label: 'Rate', val: form.is_pro_bono ? 'Pro Bono ✓' : form.hourly_rate ? `$${form.hourly_rate}/hr` : 'Not disclosed' },
                    ].map((item, i) => (
                        <div key={i} className="text-center bg-slate-50 rounded-xl p-4 border border-slate-100">
                            <p className="text-xs text-slate-400 mb-1">{item.label}</p>
                            <p className="ss font-bold text-slate-900 text-sm">{item.val}</p>
                        </div>
                    ))}
                </div>
            </VSec>

            {/* F — Links */}
            <VSec title="F · Links" icon={<LinkIcon className="w-5 h-5 text-emerald-500" />}>
                {[form.linkedin_url, form.github_url, form.twitter_url].some(Boolean) ? (
                    <div className="grid md:grid-cols-2 gap-3">
                        {[
                            { key: 'linkedin_url', label: 'LinkedIn', Icon: Linkedin, bg: 'bg-blue-50', tc: 'text-blue-700' },
                            { key: 'github_url', label: 'GitHub', Icon: Github, bg: 'bg-slate-50', tc: 'text-slate-700' },
                            { key: 'twitter_url', label: 'Twitter', Icon: Twitter, bg: 'bg-sky-50', tc: 'text-sky-600' },
                        ].filter(l => form[l.key]).map(l => (
                            <a key={l.key} href={form[l.key]} target="_blank" rel="noreferrer"
                                className={`flex items-center gap-3 p-3.5 ${l.bg} ${l.tc} rounded-xl hover:opacity-80 transition-all group`}>
                                <l.Icon className="w-4 h-4 flex-shrink-0" />
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-bold uppercase tracking-wide">{l.label}</p>
                                    <p className="text-xs truncate opacity-70">{form[l.key].replace(/^https?:\/\//, '')}</p>
                                </div>
                                <LinkIcon className="w-3.5 h-3.5 opacity-40 flex-shrink-0" />
                            </a>
                        ))}
                    </div>
                ) : <p className="text-sm text-slate-400 italic py-2">No links yet. LinkedIn boosts trust by 3 pts.</p>}
            </VSec>
        </div>
    );
}

// ─── EDIT MODE ────────────────────────────────────────────────────────────
function EditMode({ form, set, togArr, addTag, removeTag, coInput, setCoInput, foundInput, setFoundInput, handleSave, saving, completion }) {
    return (
        <form onSubmit={handleSave} className="space-y-10 dm">
            <div>
                <h1 className="text-3xl font-black text-slate-900 ss mb-1">Edit Mentor Profile</h1>
                <p className="text-slate-400 text-sm">The more you fill in, the better your matches and request quality.</p>
            </div>

            {/* Progress */}
            <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
                <div className="flex items-center justify-between mb-1.5">
                    <span className="text-sm font-bold text-emerald-700 ss">Profile Completion</span>
                    <span className="font-black text-emerald-600 ss">{completion}%</span>
                </div>
                <div className="h-2.5 bg-emerald-200 rounded-full overflow-hidden">
                    <div className="h-full prog rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
                </div>
            </div>

            {/* A — Basic Info */}
            <ESec title="A · Basic Information" icon={<User className="w-4 h-4" />}>
                <div className="grid md:grid-cols-2 gap-4">
                    <FInp label="Full Name *" value={form.full_name} onChange={v => set('full_name', v)} placeholder="Your full name" required />
                    <FInp label="Email" value={form.email} disabled />
                    <FInp label="City / Country" value={form.location} onChange={v => set('location', v)} placeholder="e.g. Karachi, Pakistan" />
                </div>
                <FTxt label="Your Bio (students read this first)" value={form.bio} onChange={v => set('bio', v)}
                    placeholder="Who are you? What industries have you worked in? Why do you mentor? Be genuine — 3–5 sentences work best."
                    rows={4} max={500} />
                <p className="text-xs text-slate-400 text-right -mt-3">{(form.bio || '').length}/500</p>
            </ESec>

            {/* B — Expertise */}
            <ESec title="B · Expertise" icon={<Star className="w-4 h-4" />}
                hint="This is the #1 thing students filter by — be specific.">
                <div className="grid md:grid-cols-2 gap-4">
                    <FInp label="Current Role" value={form.current_role} onChange={v => set('current_role', v)} placeholder="e.g. Head of Product at Careem" />
                    <FInp label="Current Company" value={form.current_company} onChange={v => set('current_company', v)} placeholder="e.g. Careem" />
                    <FInp
                        label="Years of Experience"
                        type="number"
                        value={form.years_experience ?? ''}
                        onChange={v => set('years_experience', v === '' ? 0 : Number(v))}
                        placeholder="e.g. 12"
                    />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Expertise Areas</label>
                    <div className="flex flex-wrap gap-2 mb-2">
                        {EXPERTISE_CHIPS.map(e => {
                            const on = (form.expertise_areas || []).includes(e);
                            return (
                                <button key={e} type="button" onClick={() => togArr('expertise_areas', e)}
                                    className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${on ? 'border-emerald-400 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-500 hover:border-emerald-200'}`}>
                                    {e}{on ? ' ✓' : ''}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </ESec>

            {/* C — Mentorship Details */}
            <ESec title="C · Mentorship Details" icon={<BookOpen className="w-4 h-4" />}
                hint="Be specific here — it sets expectations and attracts the right mentees.">
                <FSel label="Mentorship Style" value={form.mentorship_style} onChange={v => set('mentorship_style', v)} options={STYLE_OPTS} placeholder="Select your style…" />
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">What I Can Help With</label>
                    <div className="flex flex-wrap gap-2">
                        {HELP_CHIPS.map(h => {
                            const on = (form.can_help_with || []).includes(h);
                            return (
                                <button key={h} type="button" onClick={() => togArr('can_help_with', h)}
                                    className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${on ? 'border-teal-400 bg-teal-50 text-teal-700' : 'border-slate-200 bg-white text-slate-500 hover:border-teal-200'}`}>
                                    {h}{on ? ' ✓' : ''}
                                </button>
                            );
                        })}
                    </div>
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Available For</label>
                    <div className="flex flex-wrap gap-2">
                        {AVAIL_CHIPS.map(a => {
                            const on = (form.available_for || []).includes(a);
                            return (
                                <button key={a} type="button" onClick={() => togArr('available_for', a)}
                                    className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${on ? 'border-blue-300 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>
                                    {a}{on ? ' ✓' : ''}
                                </button>
                            );
                        })}
                    </div>
                </div>
            </ESec>

            {/* D — Credibility */}
            <ESec title="D · Credibility" icon={<Award className="w-4 h-4" />}
                hint="Past experience is your trust signal — students care about this deeply.">
                <div className="grid md:grid-cols-2 gap-4">
                    <FInp
                        label="Successful Exits"
                        type="number"
                        value={form.successful_exits ?? ''}
                        onChange={v => set('successful_exits', v === '' ? 0 : Number(v))}
                        placeholder="0"
                    />
                </div>
                {/* Companies Worked */}
                <TagInput label="Companies Worked At" tags={form.companies_worked || []}
                    inputVal={coInput} onInputChange={setCoInput}
                    onAdd={() => addTag('companies_worked', coInput, setCoInput)}
                    onRemove={v => removeTag('companies_worked', v)}
                    placeholder="e.g. Google → press Enter" />
                {/* Companies Founded */}
                <TagInput label="Companies Founded" tags={form.companies_founded || []}
                    inputVal={foundInput} onInputChange={setFoundInput}
                    onAdd={() => addTag('companies_founded', foundInput, setFoundInput)}
                    onRemove={v => removeTag('companies_founded', v)}
                    placeholder="e.g. MyStartup → press Enter" />
            </ESec>

            {/* E — Availability & Pricing */}
            <ESec title="E · Availability & Pricing" icon={<DollarSign className="w-4 h-4" />}
                hint="Pro Bono mentors get 2× more requests from students.">
                <div className="grid md:grid-cols-3 gap-4">
                    <FInp
                        label="Max Concurrent Mentees"
                        type="number"
                        value={form.mentorship_capacity ?? ''}
                        onChange={v => set('mentorship_capacity', v === '' ? 3 : Number(v))}
                        placeholder="3"
                    />
                    <FInp
                        label="Currently Mentoring"
                        type="number"
                        value={form.current_mentees ?? ''}
                        onChange={v => set('current_mentees', v === '' ? 0 : Number(v))}
                        placeholder="0"
                    />
                    <FInp
                        label="Hourly Rate (USD)"
                        type="number"
                        value={form.hourly_rate ?? ''}
                        onChange={v => set('hourly_rate', v === '' ? null : Number(v))}
                        placeholder="e.g. 100"
                        disabled={form.is_pro_bono}
                    />
                </div>
                <label className="flex items-center gap-3 p-4 border-2 border-slate-200 rounded-2xl cursor-pointer hover:border-emerald-200 transition-all">
                    <input type="checkbox" checked={!!form.is_pro_bono} onChange={e => { set('is_pro_bono', e.target.checked); if (e.target.checked) set('hourly_rate', ''); }}
                        className="w-4 h-4 accent-emerald-600" />
                    <div>
                        <p className="text-sm font-bold text-slate-800">I mentor pro bono (free)</p>
                        <p className="text-xs text-slate-400">You'll appear in the "Pro Bono" filter — students love this.</p>
                    </div>
                </label>
            </ESec>

            {/* F — Links */}
            <ESec title="F · Links" icon={<LinkIcon className="w-4 h-4" />}
                hint="LinkedIn is the single highest-trust signal for students.">
                <div className="grid md:grid-cols-2 gap-4">
                    {[
                        { field: 'linkedin_url', label: 'LinkedIn URL', pts: 3, ph: 'https://linkedin.com/in/…', Icon: Linkedin },
                        { field: 'github_url', label: 'GitHub URL', pts: 2, ph: 'https://github.com/…', Icon: Github },
                        { field: 'twitter_url', label: 'Twitter URL', pts: 1, ph: 'https://twitter.com/…', Icon: Twitter },
                    ].map(({ field, label, pts, ph, Icon }) => (
                        <div key={field}>
                            <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                                <Icon classN ame="w-3.5 h-3.5" /> {label}
                                <span className="ml-auto text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full normal-case font-bold">+{pts} pts</span>
                            </label>
                            <input type="url" value={form[field] || ''} onChange={e => set(field, e.target.value)} placeholder={ph} className="inp" />
                        </div>
                    ))}
                </div>
            </ESec>
        </form>
    );
}

// ─── Primitives ──────────────────────────────────────────────────────────
function VSec({ title, icon, children }) {
    return (<section><div className="flex items-center gap-2 mb-4">{icon}<h2 className="text-base font-bold text-slate-900 ss">{title}</h2></div>{children}</section>);
}
function ESec({ title, icon, hint, children }) {
    return (
        <section className="pt-8 border-t border-slate-100 space-y-5">
            <div><p className="sec-lbl">{icon} {title}</p>{hint && <p className="text-xs text-slate-400 mt-0.5 mb-1">{hint}</p>}</div>
            {children}
        </section>
    );
}
function FInp({ label, value, onChange, type = 'text', placeholder, required, disabled }) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
            <input type={type} value={value || ''} onChange={e => onChange?.(e.target.value)}
                placeholder={placeholder} required={required} disabled={disabled} className="inp" />
        </div>
    );
}
function FSel({ label, value, onChange, options, placeholder }) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
            <div className="relative">
                <select value={value || ''} onChange={e => onChange(e.target.value)} className="sel">
                    <option value="">{placeholder}</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
        </div>
    );
}
function FTxt({ label, value, onChange, placeholder, rows = 4, max }) {
    return (
        <div className="space-y-1.5">
            {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
            <textarea value={value || ''} onChange={e => onChange(e.target.value)}
                placeholder={placeholder} rows={rows} maxLength={max} className="ta" />
        </div>
    );
}
function TagInput({ label, tags, inputVal, onInputChange, onAdd, onRemove, placeholder }) {
    return (
        <div className="space-y-2">
            {label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
            <div className="flex gap-2">
                <input className="inp flex-1" value={inputVal} onChange={e => onInputChange(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); onAdd(); } }}
                    placeholder={placeholder} />
                <button type="button" onClick={onAdd} className="px-4 py-2.5 bg-emerald-600 text-white rounded-xl text-sm font-bold hover:bg-emerald-700 transition-all">
                    <Plus className="w-4 h-4" />
                </button>
            </div>
            {tags.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                    {tags.map((t, i) => (
                        <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-full text-xs font-semibold border border-emerald-100">
                            {t}<button type="button" onClick={() => onRemove(t)}><X className="w-3 h-3" /></button>
                        </span>
                    ))}
                </div>
            )}
        </div>
    );
}