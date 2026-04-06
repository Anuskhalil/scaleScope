// src/pages/FounderProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../components/landing-page/RoleNavbar';
import {
  fetchFounderProfile, saveFounderBaseProfile, saveFounderStartupProfile,
  uploadFounderAvatar, calcFounderCompletion,
} from '../services/founderService';
import {
  User, Rocket, Briefcase, DollarSign, Save, AlertTriangle,
  Edit3, MapPin, Mail, Link as LinkIcon, Camera, Loader,
  Github, Twitter, Linkedin, X, Shield, Globe, FileText,
  ChevronDown, CheckCircle, Trash2, TrendingUp, Target,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .2s cubic-bezier(.22,.68,0,1.2),box-shadow .2s ease}
  .lift:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(245,158,11,.10)}
  .g-found{background:linear-gradient(135deg,#f59e0b,#ef4444)}
  .g-ind{background:linear-gradient(135deg,#4f46e5,#7c3aed)}
  .prog{background:linear-gradient(90deg,#f59e0b,#ef4444)}
  .inp{width:100%;padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;transition:border-color .15s,background .15s;font-family:'DM Sans',sans-serif}
  .inp:focus{border-color:#f59e0b;background:#fff}
  .inp:disabled{opacity:.5;cursor:not-allowed}
  .sel{width:100%;padding:10px 36px 10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;appearance:none;cursor:pointer;font-family:'DM Sans',sans-serif}
  .sel:focus{border-color:#f59e0b;background:#fff}
  .ta{width:100%;padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;resize:none;font-family:'DM Sans',sans-serif}
  .ta:focus{border-color:#f59e0b;background:#fff}
  .sec-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#d97706;display:flex;align-items:center;gap:6px;margin-bottom:4px}
  .fade-in{animation:fi .3s ease both}
  @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
`;

const INDUSTRIES   = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech','E-commerce','AI / ML','Social Impact','Gaming','Other'];
const STAGES       = ['Just an Idea','Researching','Building MVP','MVP Built','Growing'];
const FUND_STAGES  = ['Bootstrapped','Pre-seed','Seed','Series A','Series B+'];
const REVENUE_OPTS = ['Subscription','B2B SaaS','Freemium','Commission / Marketplace','Advertising','Usage-Based','Other'];
const LOOKING_FOR  = [
  { val: 'Co-Founder', icon: '👥', desc: 'Build together'    },
  { val: 'Developer',  icon: '💻', desc: 'Tech talent'       },
  { val: 'Marketer',   icon: '📣', desc: 'Growth & branding' },
  { val: 'Designer',   icon: '🎨', desc: 'UI/UX expertise'   },
  { val: 'Investor',   icon: '💰', desc: 'Funding partner'   },
  { val: 'Mentor',     icon: '🧠', desc: 'Expert guidance'   },
];
const HELP_NEEDED  = ['Marketing','Technical / Dev','Fundraising','Product Strategy','Legal','Operations','Design / UX','Sales'];

const makeEmpty = (user) => ({
  // profiles
  full_name: '', email: user?.email || '', location: '', bio: '',
  avatar_url: '', linkedin_url: '', github_url: '', twitter_url: '',
  skills: [],
  // founder_profiles
  company_name: '', idea_title: '', industry: '', startup_stage: '',
  problem_solving: '', problem_statement: '',
  unique_value_proposition: '', target_market: '', target_audience: '',
  solution_description: '', revenue_model: '', competitors: '',
  launch_timeline: '', team_size: 1, funding_raised: '', funding_stage: '',
  founding_year: '', pitch_deck_url: '', demo_url: '', website_url: '',
  looking_for: [], help_needed: [], skills_needed: [],
});

export default function FounderProfile() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const snapRef   = useRef(null);

  const [loading,    setLoading]    = useState(true);
  const [saving,     setSaving]     = useState(false);
  const [uploading,  setUploading]  = useState(false);
  const [editMode,   setEditMode]   = useState(false);
  const [confirmDel, setConfirmDel] = useState(false);
  const [saveErr,    setSaveErr]    = useState('');

  const [form, setForm] = useState(makeEmpty(user));
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));
  const togArr = (k, v) => setForm(p => {
    const a = p[k] || [];
    return { ...p, [k]: a.includes(v) ? a.filter(x => x !== v) : [...a, v] };
  });

  const load = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { profile, founderProfile } = await fetchFounderProfile(user.id);
      if (profile?.id) {
        const m = {
          ...makeEmpty(user),
          // from profiles
          full_name:    profile.full_name   || '',
          email:        profile.email       || user.email || '',
          location:     profile.location    || '',
          bio:          profile.bio         || '',
          avatar_url:   profile.avatar_url  || '',
          linkedin_url: profile.linkedin_url|| '',
          github_url:   profile.github_url  || '',
          twitter_url:  profile.twitter_url || '',
          skills:       Array.isArray(profile.skills) ? profile.skills : [],
          // from founder_profiles
          company_name:             founderProfile.company_name             || '',
          idea_title:               founderProfile.idea_title               || '',
          industry:                 founderProfile.industry                 || '',
          startup_stage:            founderProfile.startup_stage            || founderProfile.company_stage || '',
          problem_solving:          founderProfile.problem_solving          || '',
          problem_statement:        founderProfile.problem_statement        || '',
          unique_value_proposition: founderProfile.unique_value_proposition || '',
          target_market:            founderProfile.target_market            || founderProfile.target_audience || '',
          solution_description:     founderProfile.solution_description     || '',
          revenue_model:            founderProfile.revenue_model            || '',
          competitors:              founderProfile.competitors              || '',
          launch_timeline:          founderProfile.launch_timeline          || '',
          team_size:                founderProfile.team_size                || 1,
          funding_raised:           founderProfile.funding_raised           || '',
          funding_stage:            founderProfile.funding_stage            || '',
          founding_year:            founderProfile.founding_year            || '',
          pitch_deck_url:           founderProfile.pitch_deck_url           || '',
          demo_url:                 founderProfile.demo_url                 || '',
          looking_for:              Array.isArray(founderProfile.looking_for)   ? founderProfile.looking_for   : [],
          help_needed:              Array.isArray(founderProfile.help_needed)   ? founderProfile.help_needed   : [],
          skills_needed:            Array.isArray(founderProfile.skills_needed) ? founderProfile.skills_needed : [],
          website_url:              founderProfile.website_url                  || '',
        };
        snapRef.current = m;
        setForm(m);
        setEditMode(false);
      } else {
        setEditMode(true);
      }
    } catch (err) { console.error(err); setEditMode(true); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true); setSaveErr('');
    try {
      await saveFounderBaseProfile(user.id, {
        full_name:    form.full_name,
        email:        form.email,
        location:     form.location,
        bio:          form.bio,
        avatar_url:   form.avatar_url,
        linkedin_url: form.linkedin_url,
        github_url:   form.github_url,
        twitter_url:  form.twitter_url,
        skills:       form.skills,
        profile_completion: calcFounderCompletion(form, form),
        onboarding_completed: true,
      });
      await saveFounderStartupProfile(user.id, {
        company_name:             form.company_name,
        idea_title:               form.idea_title,
        industry:                 form.industry,
        startup_stage:            form.startup_stage,
        problem_solving:          form.problem_solving,
        problem_statement:        form.problem_statement,
        unique_value_proposition: form.unique_value_proposition,
        target_market:            form.target_market,
        target_audience:          form.target_market,
        solution_description:     form.solution_description,
        revenue_model:            form.revenue_model,
        competitors:              form.competitors,
        launch_timeline:          form.launch_timeline,
        team_size:                form.team_size,
        funding_raised:           form.funding_raised,
        funding_stage:            form.funding_stage,
        founding_year:            form.founding_year,
        pitch_deck_url:           form.pitch_deck_url,
        demo_url:                 form.demo_url,
        looking_for:              form.looking_for  || [],
        help_needed:              form.help_needed  || [],
        skills_needed:            form.skills_needed || [],
        website_url:              form.website_url   || '',
      });
      setEditMode(false);
      await load();
    } catch (err) {
      setSaveErr(err.message || 'Failed to save — check your inputs.');
      if (snapRef.current) setForm(snapRef.current);
    } finally { setSaving(false); }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    try {
      const url = await uploadFounderAvatar(user.id, file);
      set('avatar_url', url);
    } catch (err) { alert('Upload failed: ' + err.message); }
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
        <Loader className="w-8 h-8 animate-spin text-amber-500" />
      </div>
    </>
  );

  const completion  = calcFounderCompletion(form, form);
  const startupName = form.company_name || form.idea_title || 'Your Startup';
  const trustPts    = (form.linkedin_url ? 2 : 0) + (form.pitch_deck_url ? 3 : 0) + (form.demo_url ? 3 : 0) + (form.github_url ? 2 : 0);
  const trustPct    = Math.round((trustPts / 10) * 100);
  const init        = (form.full_name || 'F').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

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
            <div className="g-found rounded-2xl p-5 mb-8 text-white fade-in">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold ss">Complete Your Startup Profile</h3>
                  <p className="text-sm text-white/80">A full profile unlocks better investor and mentor matches.</p>
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

            {/* ── SIDEBAR ───────────────────────────────────────────── */}
            <aside className="lg:col-span-1 space-y-4">

              {/* Avatar card */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-amber-500 to-orange-500 mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {form.avatar_url
                      ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white text-2xl font-bold ss">{init}</span>}
                  </div>
                  {editMode && (
                    <label className="absolute bottom-0 right-0 p-2 bg-amber-500 rounded-full cursor-pointer hover:bg-amber-600 shadow-lg">
                      {uploading
                        ? <Loader className="w-4 h-4 text-white animate-spin" />
                        : <Camera className="w-4 h-4 text-white" />}
                      <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
                    </label>
                  )}
                </div>
                <h2 className="font-black text-lg text-slate-800 mb-0.5 ss">{form.full_name || 'Your Name'}</h2>
                <p className="text-sm font-bold text-amber-600 ss mb-2">{startupName}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50 text-amber-700 rounded-full text-xs font-bold uppercase mb-2">
                  <Rocket className="w-3.5 h-3.5" /> Founder
                </div>
                {form.location && (
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1">
                    <MapPin className="w-3 h-3" />{form.location}
                  </p>
                )}
                {(form.looking_for || []).length > 0 && (
                  <div className="flex flex-wrap justify-center gap-1 mt-3">
                    {form.looking_for.map((v, i) => {
                      const opt = LOOKING_FOR.find(o => o.val === v);
                      return (
                        <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2 py-0.5 rounded-full">
                          {opt?.icon} {v}
                        </span>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action buttons */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 space-y-2">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)}
                    className="w-full py-3 g-found text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all">
                      {saving
                        ? <><Loader className="w-4 h-4 animate-spin" />Saving…</>
                        : <><Save className="w-4 h-4" />Save Changes</>}
                    </button>
                    <button onClick={() => { setForm(snapRef.current || makeEmpty(user)); setEditMode(false); setSaveErr(''); }}
                      className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all">
                      Cancel
                    </button>
                  </>
                )}
                <button onClick={() => setConfirmDel(true)}
                  className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>

              {/* Credibility score */}
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
                  { label: 'Pitch Deck',  key: 'pitch_deck_url', pts: 3 },
                  { label: 'Demo',        key: 'demo_url',        pts: 3 },
                  { label: 'LinkedIn',    key: 'linkedin_url',    pts: 2 },
                  { label: 'GitHub',      key: 'github_url',      pts: 2 },
                ].map(l => (
                  <div key={l.key} className="flex items-center justify-between text-xs mb-1.5">
                    <span className={form[l.key] ? 'text-slate-600' : 'text-slate-400'}>{l.label}</span>
                    <span className={`font-bold ${form[l.key] ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {form[l.key] ? '✓ added' : `+${l.pts} pts`}
                    </span>
                  </div>
                ))}
              </div>
            </aside>

            {/* ── MAIN PANEL ─────────────────────────────────────────── */}
            <main className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
              {!editMode
                ? <ViewMode form={form} />
                : <EditMode form={form} set={set} togArr={togArr} handleSave={handleSave} saving={saving} completion={completion} />}
            </main>
          </div>

          {/* Delete confirm modal */}
          {confirmDel && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
                <div className="text-center">
                  <div className="h-16 w-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <AlertTriangle className="w-8 h-8 text-red-500" />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2 ss">Delete Account?</h2>
                  <p className="text-slate-600 mb-6 text-sm">Permanent. All your data and startup info will be erased.</p>
                  <div className="flex gap-3">
                    <button onClick={() => setConfirmDel(false)}
                      className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
                    <button onClick={handleDelete}
                      className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Delete</button>
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

// ─── VIEW MODE ───────────────────────────────────────────────────────────
function ViewMode({ form }) {
  const startupName = form.company_name || form.idea_title || 'Your Startup';
  return (
    <div className="space-y-10 dm">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-1 ss">Founder Profile</h1>
        <p className="text-slate-500 text-sm">Your identity and startup — visible to mentors, investors, and potential team members.</p>
      </div>

      {/* A — Basic Info */}
      <VSec title="A · Basic Information" icon={<User className="w-5 h-5 text-amber-500" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          {[
            { label: 'Full Name', val: form.full_name, Icon: User },
            { label: 'Email',     val: form.email,     Icon: Mail },
            { label: 'Location',  val: form.location,  Icon: MapPin },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl">
              <div className="p-2 bg-amber-50 text-amber-500 rounded-lg flex-shrink-0"><item.Icon className="w-4 h-4" /></div>
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
          <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-amber-300">
            <p className="text-xs font-bold text-amber-500 uppercase mb-1">About</p>
            <p className="text-sm text-slate-700 leading-relaxed">{form.bio}</p>
          </div>
        )}
      </VSec>

      {/* B — Startup Info */}
      <VSec title="B · Startup" icon={<Rocket className="w-5 h-5 text-amber-500" />}>
        <div className="bg-gradient-to-br from-amber-50 to-orange-50 border border-amber-100 rounded-2xl p-5">
          <h3 className="ss font-black text-2xl text-slate-900 mb-1">{startupName}</h3>
          <div className="flex flex-wrap gap-1.5 mb-3">
            {form.industry && <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-0.5 rounded-full font-semibold">{form.industry}</span>}
            {form.startup_stage && <span className="text-xs bg-white border border-amber-200 text-amber-700 px-2.5 py-0.5 rounded-full font-semibold">{form.startup_stage}</span>}
            {form.revenue_model && <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-0.5 rounded-full font-medium">{form.revenue_model}</span>}
          </div>
          {(form.problem_solving || form.problem_statement) && (
            <div className="mb-3">
              <p className="text-xs font-bold text-amber-600 uppercase mb-1">Problem</p>
              <p className="text-sm text-slate-700 leading-relaxed">{form.problem_solving || form.problem_statement}</p>
            </div>
          )}
          {form.unique_value_proposition && (
            <div className="mb-3">
              <p className="text-xs font-bold text-amber-600 uppercase mb-1">Unique Value</p>
              <p className="text-sm text-slate-700 italic leading-relaxed">"{form.unique_value_proposition}"</p>
            </div>
          )}
          {form.target_market && (
            <div>
              <p className="text-xs font-bold text-amber-600 uppercase mb-1">Target Market</p>
              <p className="text-sm text-slate-700">{form.target_market}</p>
            </div>
          )}
        </div>
      </VSec>

      {/* C — Traction */}
      <VSec title="C · Traction" icon={<TrendingUp className="w-5 h-5 text-amber-500" />}>
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Team Size',  val: form.team_size ? `${form.team_size}` : '—' },
            { label: 'Stage',      val: form.funding_stage || '—' },
            { label: 'Raised',     val: form.funding_raised || '—' },
          ].map((item, i) => (
            <div key={i} className="text-center bg-stone-50 rounded-xl p-4 border border-stone-100">
              <p className="text-xs text-slate-400 mb-1">{item.label}</p>
              <p className="ss font-black text-slate-900 text-xl">{item.val}</p>
            </div>
          ))}
        </div>
      </VSec>

      {/* D — Looking For */}
      {(form.looking_for || []).length > 0 && (
        <VSec title="D · Looking For" icon={<Target className="w-5 h-5 text-amber-500" />}>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {form.looking_for.map((v, i) => {
              const opt = LOOKING_FOR.find(o => o.val === v);
              return (
                <div key={i} className="flex flex-col items-center gap-1.5 p-4 bg-amber-50 border border-amber-100 rounded-2xl text-center">
                  <span className="text-2xl">{opt?.icon || '🔍'}</span>
                  <span className="text-xs font-bold text-amber-800 ss">{v}</span>
                  <span className="text-xs text-amber-500">{opt?.desc}</span>
                </div>
              );
            })}
          </div>
          {(form.skills_needed || []).length > 0 && (
            <div className="mt-4">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wide mb-2">Skills needed</p>
              <div className="flex flex-wrap gap-2">
                {form.skills_needed.map((s, i) => (
                  <span key={i} className="text-xs bg-amber-50 text-amber-700 border border-amber-100 px-2.5 py-1 rounded-full font-medium">{s}</span>
                ))}
              </div>
            </div>
          )}
        </VSec>
      )}

      {/* E — Links */}
      <VSec title="E · Links & Assets" icon={<LinkIcon className="w-5 h-5 text-amber-500" />}>
        {[form.pitch_deck_url, form.demo_url, form.linkedin_url, form.github_url, form.twitter_url, form.website_url].some(Boolean) ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[
              { key: 'pitch_deck_url', label: 'Pitch Deck', Icon: FileText, bg: 'bg-amber-50', tc: 'text-amber-700' },
              { key: 'demo_url',       label: 'Demo',       Icon: Globe,    bg: 'bg-blue-50',  tc: 'text-blue-600'  },
              { key: 'website_url',    label: 'Website',    Icon: Globe,    bg: 'bg-green-50', tc: 'text-green-700' },
              { key: 'linkedin_url',   label: 'LinkedIn',   Icon: Linkedin, bg: 'bg-blue-50',  tc: 'text-blue-700'  },
              { key: 'github_url',     label: 'GitHub',     Icon: Github,   bg: 'bg-slate-50', tc: 'text-slate-700' },
              { key: 'twitter_url',    label: 'Twitter',    Icon: Twitter,  bg: 'bg-sky-50',   tc: 'text-sky-600'   },
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
        ) : <p className="text-sm text-slate-400 italic py-2">No links yet. Add a pitch deck or demo to boost investor interest.</p>}
      </VSec>
    </div>
  );
}

// ─── EDIT MODE ───────────────────────────────────────────────────────────
function EditMode({ form, set, togArr, handleSave, saving, completion }) {
  return (
    <form onSubmit={handleSave} className="space-y-10 dm">
      <div>
        <h1 className="text-3xl font-black text-slate-900 ss mb-1">Edit Profile</h1>
        <p className="text-slate-400 text-sm">Fill every section for the best investor and mentor matches.</p>
      </div>

      {/* Progress bar */}
      <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold text-amber-700 ss">Completion</span>
          <span className="font-black text-amber-600 ss">{completion}%</span>
        </div>
        <div className="h-2.5 bg-amber-200 rounded-full overflow-hidden">
          <div className="h-full prog rounded-full transition-all duration-500" style={{ width: `${completion}%` }} />
        </div>
      </div>

      {/* A — Basic Info */}
      <ESec title="A · Basic Information" icon={<User className="w-4 h-4" />}
        hint="Your personal identity — shown alongside your startup.">
        <div className="grid md:grid-cols-2 gap-4">
          <FInp label="Full Name *" value={form.full_name} onChange={v => set('full_name', v)} placeholder="Your full name" required />
          <FInp label="Email" value={form.email} disabled />
          <FInp label="City / Country" value={form.location} onChange={v => set('location', v)} placeholder="e.g. Karachi, Pakistan" />
        </div>
        <FTxt label="Your Bio" value={form.bio} onChange={v => set('bio', v)}
          placeholder="2–3 sentences about you as a founder. What drives you? What's your background?" rows={3} max={400} />
      </ESec>

      {/* B — Startup Info */}
      <ESec title="B · Startup Information" icon={<Rocket className="w-4 h-4" />}
        hint="The core of your profile — investors and mentors read this first.">
        <div className="grid md:grid-cols-2 gap-4">
          <FInp label="Company / Startup Name" value={form.company_name} onChange={v => set('company_name', v)} placeholder="e.g. EduPath" />
          <FInp label="Idea Title (if no name yet)" value={form.idea_title} onChange={v => set('idea_title', v)} placeholder="e.g. AI Study Planner for Students" />
          <FSel label="Industry" value={form.industry} onChange={v => set('industry', v)} options={INDUSTRIES} placeholder="Select industry…" />
          <FSel label="Startup Stage" value={form.startup_stage} onChange={v => set('startup_stage', v)} options={STAGES} placeholder="Select stage…" />
          <FSel label="Revenue Model" value={form.revenue_model} onChange={v => set('revenue_model', v)} options={REVENUE_OPTS} placeholder="Select model…" />
          <FInp label="Launch Timeline" value={form.launch_timeline} onChange={v => set('launch_timeline', v)} placeholder="e.g. Q3 2026" />
        </div>
        <FTxt label="Problem Statement *" value={form.problem_solving || form.problem_statement}
          onChange={v => { set('problem_solving', v); set('problem_statement', v); }}
          placeholder="What specific problem are you solving? Be precise. e.g. 'University students in Pakistan waste 4hrs/day on unstructured study…'" rows={3} max={500} />
        <FTxt label="Unique Value Proposition" value={form.unique_value_proposition}
          onChange={v => set('unique_value_proposition', v)}
          placeholder="Why you over alternatives? e.g. 'AI-adaptive study plans that work offline — no existing tool does this.'" rows={2} max={400} />
        <div className="grid md:grid-cols-2 gap-4">
          <FTxt label="Target Market" value={form.target_market}
            onChange={v => set('target_market', v)} rows={2} max={300}
            placeholder="Who are your customers? e.g. University students aged 18–24 in Pakistan" />
          <FTxt label="Key Competitors" value={form.competitors}
            onChange={v => set('competitors', v)} rows={2} max={300}
            placeholder="e.g. Google Classroom, local tutoring centres" />
        </div>
        <FTxt label="Solution Description" value={form.solution_description}
          onChange={v => set('solution_description', v)} rows={2} max={400}
          placeholder="How does your product/service work? Keep it simple." />
      </ESec>

      {/* C — Traction */}
      <ESec title="C · Traction" icon={<TrendingUp className="w-4 h-4" />}
        hint="Even early signals matter — fill what you have.">
        <div className="grid md:grid-cols-3 gap-4">
          <FInp label="Team Size" type="number" value={form.team_size || 1} onChange={v => set('team_size', v)} placeholder="1" />
          <FSel label="Funding Stage" value={form.funding_stage} onChange={v => set('funding_stage', v)} options={FUND_STAGES} placeholder="Select…" />
          <FInp label="Funding Raised" value={form.funding_raised} onChange={v => set('funding_raised', v)} placeholder="e.g. $50,000 or Bootstrapped" />
        </div>
        <FInp label="Founding Year" value={form.founding_year} onChange={v => set('founding_year', v)} placeholder="e.g. 2025" />
      </ESec>

      {/* D — Links */}
      <ESec title="D · Links & Assets" icon={<LinkIcon className="w-4 h-4" />}
        hint="A pitch deck and demo are the two highest-value items for investor outreach.">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            { field: 'pitch_deck_url', label: 'Pitch Deck URL',   pts: 3, ph: 'Google Drive, Notion, or direct link', Icon: FileText },
            { field: 'demo_url',       label: 'Demo / Video URL', pts: 3, ph: 'Loom, YouTube, or live product URL',   Icon: Globe    },
            { field: 'website_url',    label: 'Website URL',      pts: 2, ph: 'https://yourstartup.com',              Icon: Globe    },
            { field: 'linkedin_url',   label: 'LinkedIn URL',     pts: 2, ph: 'https://linkedin.com/in/…',            Icon: Linkedin },
            { field: 'github_url',     label: 'GitHub URL',       pts: 2, ph: 'https://github.com/…',                 Icon: Github   },
            { field: 'twitter_url',    label: 'Twitter / X URL',  pts: 1, ph: 'https://twitter.com/…',                Icon: Twitter  },
          ].map(({ field, label, pts, ph, Icon }) => (
            <div key={field}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                <Icon className="w-3.5 h-3.5" /> {label}
                <span className="ml-auto text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-full normal-case font-bold">+{pts} pts</span>
              </label>
              <input type="url" value={form[field] || ''} onChange={e => set(field, e.target.value)}
                placeholder={ph} className="inp" />
            </div>
          ))}
        </div>
      </ESec>

      {/* E — Looking For */}
      <ESec title="E · Looking For" icon={<Target className="w-4 h-4" />}
        hint="What does your startup need right now? Select all that apply.">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-4">
          {LOOKING_FOR.map(opt => {
            const on = (form.looking_for || []).includes(opt.val);
            return (
              <button key={opt.val} type="button" onClick={() => togArr('looking_for', opt.val)}
                className={`flex flex-col items-center gap-1.5 py-4 px-2 rounded-2xl border-2 text-center transition-all ${
                  on ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
                }`}>
                <span className="text-2xl">{opt.icon}</span>
                <span className="text-xs font-bold ss">{opt.val}</span>
                <span className="text-[10px] text-slate-400">{opt.desc}</span>
                {on && <CheckCircle className="w-3.5 h-3.5 text-amber-500" />}
              </button>
            );
          })}
        </div>
        {/* Help Needed chips */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Areas You Need Help In</label>
          <div className="flex flex-wrap gap-2">
            {HELP_NEEDED.map(h => {
              const on = (form.help_needed || []).includes(h);
              return (
                <button key={h} type="button" onClick={() => togArr('help_needed', h)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${
                    on ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
                  }`}>
                  {h}{on ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
        {/* Skills Needed chips */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Skills You're Looking to Hire / Partner For</label>
          <div className="flex flex-wrap gap-2">
            {['Python / Backend','React / Frontend','Mobile (iOS/Android)','AI / ML','Data Science','UI/UX Design','Graphic Design','Growth Marketing','SEO / Content','Sales','Finance / CFO','Legal'].map(s => {
              const on = (form.skills_needed || []).includes(s);
              return (
                <button key={s} type="button" onClick={() => togArr('skills_needed', s)}
                  className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${
                    on ? 'border-amber-400 bg-amber-50 text-amber-700' : 'border-slate-200 bg-white text-slate-500 hover:border-amber-200'
                  }`}>
                  {s}{on ? ' ✓' : ''}
                </button>
              );
            })}
          </div>
        </div>
      </ESec>
    </form>
  );
}

// ─── Primitives ──────────────────────────────────────────────────────────
function VSec({ title, icon, children }) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">{icon}<h2 className="text-base font-bold text-slate-900 ss">{title}</h2></div>
      {children}
    </section>
  );
}
function ESec({ title, icon, hint, children }) {
  return (
    <section className="pt-8 border-t border-slate-100 space-y-5">
      <div>
        <p className="sec-lbl">{icon} {title}</p>
        {hint && <p className="text-xs text-slate-400 mt-0.5 mb-1">{hint}</p>}
      </div>
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