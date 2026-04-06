// src/pages/InvestorProfilePage.jsx
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../components/landing-page/RoleNavbar';
import {
  fetchInvestorProfile, calcInvestorCompletion,
  saveInvestorBaseProfile, saveInvestorDetails, uploadInvestorAvatar,
} from '../services/investorService';
import {
  User, DollarSign, Briefcase, Save, AlertTriangle,
  Edit3, MapPin, Mail, Link as LinkIcon, Camera, Loader,
  Github, Twitter, Linkedin, X, Shield, ChevronDown,
  CheckCircle, Trash2, TrendingUp, Building2, BarChart2,
  Globe, Star,
} from 'lucide-react';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .2s cubic-bezier(.22,.68,0,1.2),box-shadow .2s ease}
  .lift:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(29,78,216,.10)}
  .g-inv{background:linear-gradient(135deg,#1d4ed8,#4f46e5)}
  .prog{background:linear-gradient(90deg,#1d4ed8,#4f46e5)}
  .inp{width:100%;padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;transition:border-color .15s,background .15s;font-family:'DM Sans',sans-serif}
  .inp:focus{border-color:#1d4ed8;background:#fff}
  .inp:disabled{opacity:.5;cursor:not-allowed}
  .sel{width:100%;padding:10px 36px 10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;appearance:none;cursor:pointer;font-family:'DM Sans',sans-serif}
  .sel:focus{border-color:#1d4ed8;background:#fff}
  .ta{width:100%;padding:10px 14px;background:#f8fafc;border:2px solid #e2e8f0;border-radius:12px;font-size:14px;outline:none;resize:none;font-family:'DM Sans',sans-serif}
  .ta:focus{border-color:#1d4ed8;background:#fff}
  .sec-lbl{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:.06em;color:#1d4ed8;display:flex;align-items:center;gap:6px;margin-bottom:4px}
  .fade-in{animation:fi .3s ease both}
  @keyframes fi{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
`;

const INVESTOR_TYPES   = ['Solo Angel','Angel Syndicate','VC Fund','Impact Fund','Corporate VC','Family Office','Accelerator'];
const STAGE_OPTS       = ['Pre-seed','Seed','Series A','Series B','Series B+','Growth'];
const INDUSTRY_OPTS    = ['EdTech','HealthTech','FinTech','SaaS','AgriTech','CleanTech','LegalTech','HRTech','E-commerce','AI / ML','Social Impact','Gaming','DeepTech','Other'];
const INVOLVEMENT_OPTS = ['Hands-on (weekly check-ins)','Advisory (monthly)','Board seat','Silent investor','Reactive (founder-led)'];
const CONTACT_OPTS     = ['Platform message','Email','LinkedIn','WhatsApp','Calendly link'];
const GEO_OPTS         = ['Pakistan','South Asia','MENA','Southeast Asia','Global / Remote','USA','UK','Europe'];

const makeEmpty = (user) => ({
  full_name: '', email: user?.email || '', location: '', bio: '',
  avatar_url: '', linkedin_url: '', github_url: '', twitter_url: '',
  skills: [],
  investor_type: '', firm_name: '',
  investment_stage: [], industries_of_interest: [],
  ticket_size_min: '', ticket_size_max: '', geographic_focus: '',
  portfolio_count: '', successful_exits: '', notable_investments: '',
  investment_thesis: '', typical_involvement: '', accepting_pitches: true,
  preferred_contact_method: '',
});

export default function InvestorProfilePage() {
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
      const { profile: pd, investorProfile: ip } = await fetchInvestorProfile(user.id);
      if (pd?.id) {
        const m = {
          ...makeEmpty(user),
          full_name:    pd.full_name    || '',
          email:        pd.email        || user.email || '',
          location:     pd.location     || '',
          bio:          pd.bio          || '',
          avatar_url:   pd.avatar_url   || '',
          linkedin_url: pd.linkedin_url || '',
          github_url:   pd.github_url   || '',
          twitter_url:  pd.twitter_url  || '',
          skills:       Array.isArray(pd.skills) ? pd.skills : [],
          investor_type:     ip.investor_type       || '',
          firm_name:         ip.firm_name           || '',
          investment_stage:  Array.isArray(ip.investment_stage)        ? ip.investment_stage        : [],
          industries_of_interest: Array.isArray(ip.industries_of_interest) ? ip.industries_of_interest : [],
          ticket_size_min:   ip.ticket_size_min ? String(ip.ticket_size_min) : '',
          ticket_size_max:   ip.ticket_size_max ? String(ip.ticket_size_max) : '',
          geographic_focus:  ip.geographic_focus      || '',
          portfolio_count:   ip.portfolio_count ? String(ip.portfolio_count) : '',
          successful_exits:  ip.successful_exits ? String(ip.successful_exits) : '',
          notable_investments: ip.notable_investments || '',
          investment_thesis: ip.investment_thesis     || '',
          typical_involvement: ip.typical_involvement || '',
          accepting_pitches: ip.accepting_pitches !== false,
          preferred_contact_method: ip.preferred_contact_method || '',
        };
        snapRef.current = m;
        setForm(m);
        setEditMode(false);
      } else { setEditMode(true); }
    } catch (e) { console.error(e); setEditMode(true); }
    finally { setLoading(false); }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setSaving(true); setSaveErr('');
    try {
      const completion = calcInvestorCompletion(form, form);
      await saveInvestorBaseProfile(user.id, { ...form, profile_completion: completion, onboarding_completed: true });
      await saveInvestorDetails(user.id, {
        investor_type:     form.investor_type,
        firm_name:         form.firm_name,
        investment_stage:  form.investment_stage,
        industries_of_interest: form.industries_of_interest,
        ticket_size_min:   form.ticket_size_min || null,
        ticket_size_max:   form.ticket_size_max || null,
        geographic_focus:  form.geographic_focus,
        portfolio_count:   form.portfolio_count,
        successful_exits:  form.successful_exits,
        notable_investments: form.notable_investments,
        investment_thesis: form.investment_thesis,
        typical_involvement: form.typical_involvement,
        accepting_pitches: form.accepting_pitches,
        preferred_contact_method: form.preferred_contact_method,
      });
      setEditMode(false);
      await load();
    } catch (e) {
      setSaveErr(e.message || 'Failed to save');
      if (snapRef.current) setForm(snapRef.current);
    } finally { setSaving(false); }
  };

  const handleAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/') || file.size > 5 * 1024 * 1024) return;
    setUploading(true);
    try { const url = await uploadInvestorAvatar(user.id, file); set('avatar_url', url); }
    catch (e) { alert('Upload failed: ' + e.message); }
    finally { setUploading(false); }
  };

  const handleDelete = async () => {
    try {
      await supabase.from('profiles').delete().eq('id', user.id);
      await supabase.auth.signOut();
      navigate('/');
    } catch (e) { alert(e.message); }
  };

  if (loading) return (
    <><style>{CSS}</style><RoleNavbar />
      <div className="h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-blue-600" />
      </div>
    </>
  );

  const completion = calcInvestorCompletion(form, form);
  const init = (form.full_name || 'I').split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const trustPts = (form.linkedin_url ? 3 : 0) + (form.avatar_url ? 2 : 0) + (form.investment_thesis ? 3 : 0) + (form.notable_investments ? 2 : 0);
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
            <div className="g-inv rounded-2xl p-5 mb-8 text-white fade-in">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold ss">Complete Your Investor Profile</h3>
                  <p className="text-sm text-white/80">Founders filter investors by stage and industry — fill everything to appear in searches.</p>
                </div>
                <div className="text-right"><div className="text-3xl font-black ss">{completion}%</div><div className="text-xs text-white/70">Complete</div></div>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all duration-500" style={{ width: `${completion}%` }} />
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-8">
            {/* SIDEBAR */}
            <aside className="lg:col-span-1 space-y-4">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 text-center">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-blue-600 to-indigo-600 mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {form.avatar_url
                      ? <img src={form.avatar_url} alt="" className="w-full h-full object-cover" />
                      : <span className="text-white text-2xl font-bold ss">{init}</span>}
                  </div>
                  {editMode && (
                    <label className="absolute bottom-0 right-0 p-2 bg-blue-600 rounded-full cursor-pointer hover:bg-blue-700 shadow-lg">
                      {uploading ? <Loader className="w-4 h-4 text-white animate-spin" /> : <Camera className="w-4 h-4 text-white" />}
                      <input type="file" accept="image/*" onChange={handleAvatar} className="hidden" disabled={uploading} />
                    </label>
                  )}
                </div>
                <h2 className="font-black text-lg text-slate-800 mb-0.5 ss">{form.full_name || 'Your Name'}</h2>
                <p className="text-sm font-bold text-blue-600 ss mb-1">{form.firm_name || 'Your Fund / Firm'}</p>
                <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-blue-700 rounded-full text-xs font-bold uppercase mb-2">
                  <DollarSign className="w-3.5 h-3.5" /> Investor
                </div>
                {form.investor_type && (
                  <p className="text-xs text-slate-500 mb-1">{form.investor_type}</p>
                )}
                {form.location && (
                  <p className="text-xs text-slate-400 flex items-center justify-center gap-1">
                    <MapPin className="w-3 h-3" />{form.location}
                  </p>
                )}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-4 space-y-2">
                {!editMode ? (
                  <button onClick={() => setEditMode(true)}
                    className="w-full py-3 g-inv text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90">
                    <Edit3 className="w-4 h-4" /> Edit Profile
                  </button>
                ) : (
                  <>
                    <button onClick={handleSave} disabled={saving}
                      className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50">
                      {saving ? <><Loader className="w-4 h-4 animate-spin" />Saving…</> : <><Save className="w-4 h-4" />Save Changes</>}
                    </button>
                    <button onClick={() => { setForm(snapRef.current || makeEmpty(user)); setEditMode(false); setSaveErr(''); }}
                      className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200">
                      Cancel
                    </button>
                  </>
                )}
                <button onClick={() => setConfirmDel(true)}
                  className="w-full py-2.5 border-2 border-red-100 text-red-500 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50">
                  <Trash2 className="w-4 h-4" /> Delete Account
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-700 ss flex items-center gap-1.5"><Shield className="w-4 h-4 text-emerald-500" />Credibility</p>
                  <span className="text-sm font-black text-emerald-600">{trustPct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-emerald-500 rounded-full" style={{ width: `${trustPct}%` }} />
                </div>
                {[
                  { label: 'LinkedIn',      key: 'linkedin_url',     pts: 3 },
                  { label: 'Photo',         key: 'avatar_url',       pts: 2 },
                  { label: 'Thesis',        key: 'investment_thesis', pts: 3 },
                  { label: 'Portfolio cos', key: 'notable_investments', pts: 2 },
                ].map(l => (
                  <div key={l.key} className="flex items-center justify-between text-xs mb-1.5">
                    <span className={form[l.key] ? 'text-slate-600' : 'text-slate-400'}>{l.label}</span>
                    <span className={`font-bold ${form[l.key] ? 'text-emerald-600' : 'text-slate-300'}`}>
                      {form[l.key] ? '✓' : `+${l.pts} pts`}
                    </span>
                  </div>
                ))}
              </div>
            </aside>

            {/* MAIN */}
            <main className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
              {!editMode ? <ViewMode form={form} /> : <EditMode form={form} set={set} togArr={togArr} handleSave={handleSave} saving={saving} completion={completion} />}
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
                  <p className="text-slate-600 mb-6 text-sm">Permanent. All your data and investor profile will be erased.</p>
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
  const ticket = form.ticket_size_min || form.ticket_size_max
    ? `$${Number(form.ticket_size_min || 0).toLocaleString()} – $${Number(form.ticket_size_max || 0).toLocaleString()}`
    : '—';
  return (
    <div className="space-y-10 dm">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-1 ss">Investor Profile</h1>
        <p className="text-slate-500 text-sm">Your profile is visible to founders searching for investors on ScalScope.</p>
      </div>

      <VSec title="A · Basic Information" icon={<User className="w-5 h-5 text-blue-500" />}>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          {[{label:'Full Name',val:form.full_name,Icon:User},{label:'Email',val:form.email,Icon:Mail},{label:'Location',val:form.location,Icon:MapPin}].map((item,i) => (
            <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl">
              <div className="p-2 bg-blue-50 text-blue-500 rounded-lg flex-shrink-0"><item.Icon className="w-4 h-4" /></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{item.val || <span className="text-slate-300 italic font-normal">Not set</span>}</p>
              </div>
            </div>
          ))}
        </div>
        {form.bio && <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-blue-300"><p className="text-xs font-bold text-blue-500 uppercase mb-1">About</p><p className="text-sm text-slate-700 leading-relaxed">{form.bio}</p></div>}
      </VSec>

      <VSec title="B · Investment Criteria" icon={<DollarSign className="w-5 h-5 text-blue-500" />}>
        <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-2xl p-5">
          <div className="flex items-start gap-4 mb-3">
            <div>
              <h3 className="ss font-black text-xl text-slate-900">{form.firm_name || 'Your Fund'}</h3>
              <p className="text-sm text-slate-500 mt-0.5">{form.investor_type || 'Investor'}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 mb-3">
            {[{label:'Ticket',val:ticket},{label:'Portfolio',val:`${form.portfolio_count||0} cos`},{label:'Exits',val:form.successful_exits||'—'}].map((s,i) => (
              <div key={i} className="text-center bg-white/70 rounded-xl p-3">
                <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
                <p className="ss font-black text-slate-900">{s.val}</p>
              </div>
            ))}
          </div>
          <div className="flex flex-wrap gap-1.5 mb-2">
            {(form.investment_stage||[]).map((s,i) => <span key={i} className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-0.5 rounded-full font-semibold">{s}</span>)}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {(form.industries_of_interest||[]).map((ind,i) => <span key={i} className="text-xs bg-blue-100 text-blue-800 px-2.5 py-0.5 rounded-full font-medium">{ind}</span>)}
          </div>
          {form.geographic_focus && <p className="text-xs text-slate-500 mt-2 flex items-center gap-1"><MapPin className="w-3 h-3" />Focus: {form.geographic_focus}</p>}
        </div>
        {form.investment_thesis && (
          <div className="p-4 bg-slate-50 rounded-xl border-l-4 border-blue-300 mt-3">
            <p className="text-xs font-bold text-blue-500 uppercase mb-1">Investment Thesis</p>
            <p className="text-sm text-slate-700 leading-relaxed">{form.investment_thesis}</p>
          </div>
        )}
      </VSec>

      <VSec title="C · Credibility" icon={<Star className="w-5 h-5 text-blue-500" />}>
        {form.notable_investments && (
          <div className="p-4 bg-slate-50 rounded-xl mb-3"><p className="text-xs font-bold text-slate-400 uppercase mb-1">Notable Investments</p><p className="text-sm text-slate-700">{form.notable_investments}</p></div>
        )}
        <div className="grid grid-cols-2 gap-3">
          {[{label:'Typical Involvement',val:form.typical_involvement||'—'},{label:'Accepts Pitches',val:form.accepting_pitches!==false?'Yes ✓':'Paused'},{label:'Contact via',val:form.preferred_contact_method||'—'}].map((s,i) => (
            <div key={i} className="bg-slate-50 rounded-xl p-3.5">
              <p className="text-xs text-slate-400 mb-0.5">{s.label}</p>
              <p className="text-sm font-semibold text-slate-800 ss">{s.val}</p>
            </div>
          ))}
        </div>
      </VSec>

      <VSec title="D · Links" icon={<LinkIcon className="w-5 h-5 text-blue-500" />}>
        {[form.linkedin_url, form.github_url, form.twitter_url].some(Boolean) ? (
          <div className="grid md:grid-cols-2 gap-3">
            {[{key:'linkedin_url',label:'LinkedIn',Icon:Linkedin,bg:'bg-blue-50',tc:'text-blue-600'},
              {key:'github_url',  label:'GitHub',  Icon:Github,  bg:'bg-slate-50',tc:'text-slate-600'},
              {key:'twitter_url', label:'Twitter', Icon:Twitter, bg:'bg-sky-50',  tc:'text-sky-600'}].filter(l=>form[l.key]).map(l => (
              <a key={l.key} href={form[l.key]} target="_blank" rel="noreferrer"
                className={`flex items-center gap-3 p-3.5 ${l.bg} ${l.tc} rounded-xl hover:opacity-80 group`}>
                <l.Icon className="w-4 h-4 flex-shrink-0" />
                <div className="flex-1 min-w-0"><p className="text-xs font-bold uppercase">{l.label}</p><p className="text-xs truncate opacity-70">{form[l.key].replace(/^https?:\/\//,'')}</p></div>
              </a>
            ))}
          </div>
        ) : <p className="text-sm text-slate-400 italic py-2">No links added. LinkedIn boosts your credibility score.</p>}
      </VSec>
    </div>
  );
}

// ─── EDIT MODE ────────────────────────────────────────────────────────────
function EditMode({ form, set, togArr, handleSave, saving, completion }) {
  return (
    <form onSubmit={handleSave} className="space-y-10 dm">
      <div><h1 className="text-3xl font-black text-slate-900 ss mb-1">Edit Investor Profile</h1><p className="text-slate-400 text-sm">Complete every section to appear in founder searches.</p></div>
      <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1.5"><span className="text-sm font-bold text-blue-700 ss">Completion</span><span className="font-black text-blue-600 ss">{completion}%</span></div>
        <div className="h-2.5 bg-blue-200 rounded-full overflow-hidden"><div className="h-full prog rounded-full transition-all duration-500" style={{ width: `${completion}%` }} /></div>
      </div>

      {/* A — Basic Info */}
      <ESec title="A · Basic Information" icon={<User className="w-4 h-4" />}>
        <div className="grid md:grid-cols-2 gap-4">
          <FInp label="Full Name *" value={form.full_name} onChange={v => set('full_name', v)} placeholder="Your full name" required />
          <FInp label="Email" value={form.email} disabled />
          <FInp label="City / Country" value={form.location} onChange={v => set('location', v)} placeholder="e.g. Karachi, Pakistan" />
        </div>
        <FTxt label="Your Bio" value={form.bio} onChange={v => set('bio', v)} placeholder="2–3 sentences about you as an investor. Your background, what you look for, and what you bring beyond capital." rows={3} max={400} />
      </ESec>

      {/* B — Investment Criteria */}
      <ESec title="B · Investment Criteria" icon={<DollarSign className="w-4 h-4" />}
        hint="Founders filter by stage and industry — fill these to show up in the right searches.">
        <div className="grid md:grid-cols-2 gap-4">
          <FSel label="Investor Type" value={form.investor_type} onChange={v => set('investor_type', v)} options={INVESTOR_TYPES} placeholder="Select type…" />
          <FInp label="Fund / Firm Name" value={form.firm_name} onChange={v => set('firm_name', v)} placeholder="e.g. Indus Valley Capital" />
          <FInp label="Min Ticket Size (USD)" type="number" value={form.ticket_size_min} onChange={v => set('ticket_size_min', v)} placeholder="e.g. 25000" />
          <FInp label="Max Ticket Size (USD)" type="number" value={form.ticket_size_max} onChange={v => set('ticket_size_max', v)} placeholder="e.g. 150000" />
          <FSel label="Geographic Focus" value={form.geographic_focus} onChange={v => set('geographic_focus', v)} options={GEO_OPTS} placeholder="Select geography…" />
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Investment Stages</label>
          <div className="flex flex-wrap gap-2">
            {STAGE_OPTS.map(s => {
              const on = (form.investment_stage || []).includes(s);
              return <button key={s} type="button" onClick={() => togArr('investment_stage', s)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${on ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>
                {s}{on ? ' ✓' : ''}
              </button>;
            })}
          </div>
        </div>
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide mb-2">Industry Focus</label>
          <div className="flex flex-wrap gap-2">
            {INDUSTRY_OPTS.map(ind => {
              const on = (form.industries_of_interest || []).includes(ind);
              return <button key={ind} type="button" onClick={() => togArr('industries_of_interest', ind)}
                className={`text-xs font-semibold px-3 py-2 rounded-xl border-2 transition-all ${on ? 'border-blue-400 bg-blue-50 text-blue-700' : 'border-slate-200 bg-white text-slate-500 hover:border-blue-200'}`}>
                {ind}{on ? ' ✓' : ''}
              </button>;
            })}
          </div>
        </div>
        <FTxt label="Investment Thesis" value={form.investment_thesis} onChange={v => set('investment_thesis', v)}
          placeholder="What do you invest in and why? What do you look for in a founder? Founders self-qualify using this." rows={4} max={600} />
      </ESec>

      {/* C — Credibility */}
      <ESec title="C · Portfolio & Credibility" icon={<Star className="w-4 h-4" />}
        hint="Social proof. Even early-stage angels should fill what they have.">
        <div className="grid md:grid-cols-3 gap-4">
          <FInp label="Portfolio Count" type="number" value={form.portfolio_count} onChange={v => set('portfolio_count', v)} placeholder="e.g. 12" />
          <FInp label="Successful Exits" type="number" value={form.successful_exits} onChange={v => set('successful_exits', v)} placeholder="e.g. 2" />
        </div>
        <FTxt label="Notable Investments" value={form.notable_investments} onChange={v => set('notable_investments', v)}
          placeholder="e.g. Airlift, Tajir, Bazaar — companies you've backed that founders will recognise." rows={2} max={400} />
      </ESec>

      {/* D — Preferences */}
      <ESec title="D · Engagement Preferences" icon={<Briefcase className="w-4 h-4" />}
        hint="Help founders understand how you work before they pitch.">
        <div className="grid md:grid-cols-2 gap-4">
          <FSel label="Typical Involvement" value={form.typical_involvement} onChange={v => set('typical_involvement', v)} options={INVOLVEMENT_OPTS} placeholder="Select involvement…" />
          <FSel label="Preferred Contact Method" value={form.preferred_contact_method} onChange={v => set('preferred_contact_method', v)} options={CONTACT_OPTS} placeholder="Select…" />
        </div>
        <div className="flex items-center gap-3 p-4 bg-slate-50 rounded-xl">
          <label className="flex items-center gap-3 cursor-pointer flex-1">
            <div className={`w-11 h-6 rounded-full relative transition-colors ${form.accepting_pitches ? 'bg-blue-600' : 'bg-slate-300'}`}
              onClick={() => set('accepting_pitches', !form.accepting_pitches)}>
              <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.accepting_pitches ? 'left-6' : 'left-1'}`} />
            </div>
            <div>
              <p className="text-sm font-semibold text-slate-900">Accepting Pitches</p>
              <p className="text-xs text-slate-400">{form.accepting_pitches ? 'Visible to founders — they can pitch you' : 'Hidden — you won\'t receive new pitches'}</p>
            </div>
          </label>
        </div>
      </ESec>

      {/* E — Links */}
      <ESec title="E · Links" icon={<LinkIcon className="w-4 h-4" />}
        hint="LinkedIn is the single most important link for investors.">
        <div className="grid md:grid-cols-2 gap-4">
          {[{field:'linkedin_url',label:'LinkedIn URL',pts:3,ph:'https://linkedin.com/in/…',Icon:Linkedin},
            {field:'github_url',  label:'GitHub URL', pts:1,ph:'https://github.com/…',   Icon:Github},
            {field:'twitter_url', label:'Twitter URL', pts:1,ph:'https://twitter.com/…',  Icon:Twitter}].map(({ field, label, pts, ph, Icon }) => (
            <div key={field}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                <Icon className="w-3.5 h-3.5" /> {label}
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

// ─── Primitives ───────────────────────────────────────────────────────────
function VSec({ title, icon, children }) {
  return (<section><div className="flex items-center gap-2 mb-4">{icon}<h2 className="text-base font-bold text-slate-900 ss">{title}</h2></div>{children}</section>);
}
function ESec({ title, icon, hint, children }) {
  return (<section className="pt-8 border-t border-slate-100 space-y-5"><div><p className="sec-lbl">{icon} {title}</p>{hint && <p className="text-xs text-slate-400 mt-0.5 mb-1">{hint}</p>}</div>{children}</section>);
}
function FInp({ label, value, onChange, type = 'text', placeholder, required, disabled }) {
  return (<div className="space-y-1.5">{label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}<input type={type} value={value || ''} onChange={e => onChange?.(e.target.value)} placeholder={placeholder} required={required} disabled={disabled} className="inp" /></div>);
}
function FSel({ label, value, onChange, options, placeholder }) {
  return (<div className="space-y-1.5">{label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}<div className="relative"><select value={value || ''} onChange={e => onChange(e.target.value)} className="sel"><option value="">{placeholder}</option>{options.map(o => <option key={o} value={o}>{o}</option>)}</select><ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" /></div></div>);
}
function FTxt({ label, value, onChange, placeholder, rows = 4, max }) {
  return (<div className="space-y-1.5">{label && <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}<textarea value={value || ''} onChange={e => onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={max} className="ta" /></div>);
}