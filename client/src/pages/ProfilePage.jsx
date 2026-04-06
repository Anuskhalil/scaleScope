import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
import { useNavigate } from 'react-router-dom';
import RoleNavbar from '../components/landing-page/RoleNavbar';
import {
  User, GraduationCap, Briefcase, Trash2, Save, AlertTriangle,
  Edit3, MapPin, Mail, Link as LinkIcon, Globe, CheckCircle, Camera,
  Loader, Github, Twitter, Linkedin, X, Tag, Shield,
  BookOpen, Users, DollarSign, Rocket, Plus,
} from 'lucide-react';

const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  .ss { font-family:'Syne',sans-serif; }
  .dm { font-family:'DM Sans',sans-serif; }
  .lift { transition:transform .2s cubic-bezier(.22,.68,0,1.2),box-shadow .2s ease; }
  .lift:hover { transform:translateY(-2px); box-shadow:0 12px 36px rgba(79,70,229,.10); }
  .g-ind { background:linear-gradient(135deg,#4f46e5,#7c3aed); }
  .g-am  { background:linear-gradient(135deg,#f59e0b,#ef4444); }
  .prog  { background:linear-gradient(90deg,#4f46e5,#7c3aed); }
  .inp { width:100%; padding:10px 14px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:12px; font-size:14px; outline:none; transition:border-color .15s,background .15s; font-family:'DM Sans',sans-serif; }
  .inp:focus { border-color:#6366f1; background:#fff; }
  .inp:disabled { opacity:.5; cursor:not-allowed; }
  .sel { width:100%; padding:10px 36px 10px 14px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:12px; font-size:14px; outline:none; appearance:none; transition:border-color .15s; font-family:'DM Sans',sans-serif; }
  .sel:focus { border-color:#6366f1; background:#fff; }
  .ta { width:100%; padding:10px 14px; background:#f8fafc; border:2px solid #e2e8f0; border-radius:12px; font-size:14px; outline:none; resize:none; transition:border-color .15s; font-family:'DM Sans',sans-serif; }
  .ta:focus { border-color:#6366f1; background:#fff; }
  .sec-label { font-size:11px; font-weight:700; text-transform:uppercase; letter-spacing:.06em; color:#6366f1; display:flex; align-items:center; gap:6px; margin-bottom:16px; }
  .fade-in { animation:fi .3s ease both; }
  @keyframes fi { from{opacity:0;transform:translateY(10px)} to{opacity:1;transform:none} }
`;

const GRADUATION_YEARS = Array.from({length:10},(_,i)=>new Date().getFullYear()+i-2);
const CURRENT_YEARS    = ['1st Year','2nd Year','3rd Year','4th Year','5th Year','Graduate'];
const SKILL_CHIPS      = ['Technical / Dev','AI / ML','Marketing','Design / UI-UX','Business Strategy','Sales','Finance','Operations','Content Creation','Community Building','Fundraising','Data Analysis'];
const INTEREST_CHIPS   = ['EdTech','HealthTech','FinTech','SaaS','E-commerce','AgriTech','CleanTech','LegalTech','HRTech','AI / ML','Social Impact','Gaming'];

// ── PATCH 1: looking_for options ─────────────────────────────────────────
const LOOKING_FOR_OPTS = [
  { val:'Co-Founder',  icon:'👥', desc:'Build together'     },
  { val:'Mentor',      icon:'🧠', desc:'Guidance & advice'  },
  { val:'Internship',  icon:'💼', desc:'Work experience'    },
  { val:'Startup',     icon:'🚀', desc:'Join a startup'     },
];

// ── PATCH 2: calcCompletion — +5 pts if looking_for filled ───────────────
function calcCompletion(f) {
  let s = 0;
  if ((f.full_name   ||'').trim().length>1)   s+=10;
  if ((f.bio         ||'').trim().length>20)   s+=10;
  if ((f.location    ||'').trim().length>1)    s+=8;
  if  (f.avatar_url)                           s+=10;
  if ((f.university  ||'').trim().length>1)    s+=8;
  if ((f.degree      ||'').trim().length>1)    s+=8;
  if ((f.skills      ||[]).length>=3)          s+=10;
  if ((f.interests   ||[]).length>=2)          s+=8;
  if  (f.linkedin_url)                         s+=10;
  if  (f.github_url)                           s+=5;  // reduced slightly to fit new field
  if ((f.career_goals||'').trim().length>10)   s+=8;
  if ((f.looking_for ||[]).length>0)           s+=5;  // ← NEW: +5 for looking_for
  return Math.min(s,100);
}

// ── PATCH 3: makeEmpty — add looking_for: [] ─────────────────────────────
const makeEmpty = (user,role) => ({
  full_name:'', email:user?.email||'', user_type:role||'',
  location:'', bio:'', avatar_url:'',
  linkedin_url:'', github_url:'', twitter_url:'',
  skills:[], interests:[],
  onboarding_completed:false, metadata:{},
  university:'', degree:'', major:'',
  graduation_year:'', current_year:'', career_goals:'',
  looking_for:[],   // ← NEW
});

export default function ProfilePage() {
  const { user }  = useAuth();
  const navigate  = useNavigate();
  const snapRef   = useRef(null);

  const [loading,           setLoading]          = useState(true);
  const [saving,            setSaving]            = useState(false);
  const [uploading,         setUploading]         = useState(false);
  const [isEditMode,        setIsEditMode]        = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [saveError,         setSaveError]         = useState('');

  const userRole  = user?.user_metadata?.user_type;
  const isStudent = userRole === 'student';

  const [formData,      setFormData]      = useState(makeEmpty(user, userRole));
  const [skillInput,    setSkillInput]    = useState('');
  const [interestInput, setInterestInput] = useState('');

  useEffect(()=>{ if(user) load(); },[user]);

  const load = async () => {
    setLoading(true);
    try {
      const {data:pd} = await supabase.from('profiles').select('*').eq('id',user.id).maybeSingle();
      let sd = {};
      if (isStudent) {
        const {data} = await supabase.from('student_profiles').select('*').eq('user_id',user.id).maybeSingle();
        sd = data||{};
      }
      if (pd) {
        const m = {
          ...makeEmpty(user,userRole),
          full_name:     pd.full_name    ||'',
          email:         pd.email        ||user?.email||'',
          user_type:     pd.user_type    ||userRole||'',
          location:      pd.location     ||'',
          bio:           pd.bio          ||'',
          avatar_url:    pd.avatar_url   ||'',
          linkedin_url:  pd.linkedin_url ||'',
          github_url:    pd.github_url   ||'',
          twitter_url:   pd.twitter_url  ||'',
          skills:        Array.isArray(pd.skills)    ? pd.skills    : [],
          interests:     Array.isArray(pd.interests) ? pd.interests : [],
          onboarding_completed: pd.onboarding_completed||false,
          metadata:      pd.metadata||{},
          university:    sd.university     ||'',
          degree:        sd.degree         ||'',
          major:         sd.major          ||'',
          graduation_year: sd.graduation_year||'',
          current_year:  sd.current_year   ||'',
          career_goals:  sd.career_goals   ||'',
          looking_for:   Array.isArray(sd.looking_for) ? sd.looking_for : [],  // ← NEW
        };
        snapRef.current = m;
        setFormData(m);
        setIsEditMode(false);
      } else { setIsEditMode(true); }
    } catch(err) { console.error(err); setIsEditMode(true); }
    finally { setLoading(false); }
  };

  // ── PATCH 4: handleUpdate — save looking_for to student_profiles ────────
  const handleUpdate = async (e) => {
    if (e) e.preventDefault();
    setSaving(true); setSaveError('');
    try {
      const now = new Date().toISOString();
      const {error:pe} = await supabase.from('profiles').upsert({
        id:                   user.id,
        full_name:            formData.full_name,
        email:                formData.email,
        user_type:            formData.user_type,
        location:             formData.location,
        bio:                  formData.bio,
        avatar_url:           formData.avatar_url,
        linkedin_url:         formData.linkedin_url,
        github_url:           formData.github_url,
        twitter_url:          formData.twitter_url,
        skills:               formData.skills,
        interests:            formData.interests,
        profile_completion:   calcCompletion(formData),
        onboarding_completed: formData.onboarding_completed,
        metadata:             formData.metadata,
        updated_at: now, last_active: now,
      },{onConflict:'id'});
      if (pe) throw pe;

      if (isStudent) {
        const {error:se} = await supabase.from('student_profiles').upsert({
          user_id:         user.id,
          university:      formData.university,
          degree:          formData.degree,
          major:           formData.major,
          graduation_year: formData.graduation_year||null,
          current_year:    formData.current_year||null,
          career_goals:    formData.career_goals,
          looking_for:     formData.looking_for || [],   // ← NEW
          updated_at:      now,
        },{onConflict:'user_id'});
        if (se) throw se;
      }
      setIsEditMode(false);
      await load();
    } catch(err) {
      setSaveError(err.message||'Error saving');
      if (snapRef.current) setFormData(snapRef.current);
    } finally { setSaving(false); }
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file||file.size>5*1024*1024||!file.type.startsWith('image/')) return;
    setUploading(true);
    try {
      const path = `avatars/${user.id}.${file.name.split('.').pop()}`;
      const {error:ue} = await supabase.storage.from('avatars').upload(path,file,{upsert:true});
      if (ue) throw ue;
      const {data:{publicUrl}} = supabase.storage.from('avatars').getPublicUrl(path);
      setFormData(prev=>({...prev,avatar_url:publicUrl}));
    } catch(err){alert('Upload failed: '+err.message);}
    finally{setUploading(false);}
  };

  const togSkill    = s => setFormData(prev=>({...prev,skills:   prev.skills.includes(s)   ?prev.skills.filter(x=>x!==s)   :[...prev.skills,s]}));
  const togInterest = s => setFormData(prev=>({...prev,interests:prev.interests.includes(s)?prev.interests.filter(x=>x!==s):[...prev.interests,s]}));
  // ── PATCH 5: toggle for looking_for array ───────────────────────────────
  const togLookingFor = v => setFormData(prev => {
    const arr = prev.looking_for || [];
    return {...prev, looking_for: arr.includes(v) ? arr.filter(x=>x!==v) : [...arr, v]};
  });

  const addSkill    = () => { const v=skillInput.trim(); if(v&&!formData.skills.includes(v)){setFormData(p=>({...p,skills:[...p.skills,v]}));setSkillInput('');} };
  const addInterest = () => { const v=interestInput.trim(); if(v&&!formData.interests.includes(v)){setFormData(p=>({...p,interests:[...p.interests,v]}));setInterestInput('');} };

  const handleDelete = async () => {
    try {
      await supabase.from('profiles').delete().eq('id',user.id);
      await supabase.auth.signOut();
      navigate('/');
    } catch(err){alert('Error: '+err.message);}
  };

  const getRoleIcon = () => ({student:<GraduationCap className="w-4 h-4"/>,mentor:<Users className="w-4 h-4"/>,investor:<DollarSign className="w-4 h-4"/>,'early-stage-founder':<Rocket className="w-4 h-4"/>}[userRole]||<User className="w-4 h-4"/>);

  if (loading) return (
    <><style>{STYLES}</style><RoleNavbar/>
      <div className="h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-indigo-600"/></div>
    </>
  );

  const completion = calcCompletion(formData);
  const trustPts   = [formData.linkedin_url?3:0, formData.github_url?2:0, formData.twitter_url?1:0].reduce((a,b)=>a+b,0);
  const trustPct   = Math.round((trustPts/6)*100);

  return (
    <>
      <style>{STYLES}</style>
      <RoleNavbar/>
      <div className="min-h-screen bg-slate-50 pt-24 pb-16 px-4 dm">
        <div className="max-w-5xl mx-auto">

          {saveError&&(
            <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-3 mb-6 fade-in">
              <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0"/>
              <p className="text-sm text-red-700 flex-1">{saveError}</p>
              <button onClick={()=>setSaveError('')}><X className="w-4 h-4 text-red-400"/></button>
            </div>
          )}

          {completion<100&&(
            <div className="g-am rounded-2xl p-5 mb-8 text-white fade-in">
              <div className="flex items-center justify-between mb-2">
                <div>
                  <h3 className="font-bold text-base ss">Complete Your Profile</h3>
                  <p className="text-sm text-white/80">A complete profile gets you better mentor and co-founder matches.</p>
                </div>
                <div className="text-right"><div className="text-3xl font-black ss">{completion}%</div><div className="text-xs text-white/70">Complete</div></div>
              </div>
              <div className="w-full bg-white/30 rounded-full h-2">
                <div className="bg-white rounded-full h-2 transition-all duration-500" style={{width:`${completion}%`}}/>
              </div>
            </div>
          )}

          <div className="grid lg:grid-cols-4 gap-8">

            {/* SIDEBAR */}
            <div className="lg:col-span-1 space-y-5">
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-7 text-center">
                <div className="relative inline-block mb-4">
                  <div className="h-24 w-24 rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 mx-auto flex items-center justify-center border-4 border-white shadow-lg overflow-hidden">
                    {formData.avatar_url
                      ?<img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover"/>
                      :<span className="text-white text-2xl font-bold ss">{formData.full_name?.charAt(0)?.toUpperCase()||'U'}</span>
                    }
                  </div>
                  {isEditMode&&(
                    <label className="absolute bottom-0 right-0 p-2 bg-indigo-600 rounded-full cursor-pointer hover:bg-indigo-700 shadow-lg">
                      {uploading?<Loader className="w-4 h-4 text-white animate-spin"/>:<Camera className="w-4 h-4 text-white"/>}
                      <input type="file" accept="image/*" onChange={handleAvatarUpload} className="hidden" disabled={uploading}/>
                    </label>
                  )}
                </div>
                <h2 className="font-black text-lg text-slate-800 mb-1 ss">{formData.full_name||'Your Name'}</h2>
                {formData.university&&<p className="text-sm text-slate-500 mb-0.5">{formData.university}</p>}
                {formData.degree&&<p className="text-xs text-slate-400 mb-2">{formData.degree}</p>}
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-xs font-bold uppercase mb-2">
                  {getRoleIcon()} {formData.user_type?.replace(/-/g,' ')}
                </div>
                {formData.location&&<p className="text-xs text-slate-400 flex items-center justify-center gap-1 mt-1"><MapPin className="w-3 h-3"/>{formData.location}</p>}
                {/* Looking For badges on sidebar card */}
                {(formData.looking_for||[]).length>0&&(
                  <div className="flex flex-wrap justify-center gap-1 mt-2">
                    {formData.looking_for.map((v,i)=>{
                      const opt=LOOKING_FOR_OPTS.find(o=>o.val===v);
                      return <span key={i} className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 px-2 py-0.5 rounded-full font-medium">{opt?.icon} {v}</span>;
                    })}
                  </div>
                )}
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5 space-y-3">
                {!isEditMode?(
                  <button onClick={()=>setIsEditMode(true)} className="w-full py-3 bg-indigo-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-indigo-700 transition-all">
                    <Edit3 className="w-4 h-4"/> Edit Profile
                  </button>
                ):(
                  <>
                    <button onClick={handleUpdate} disabled={saving} className="w-full py-3 bg-green-600 text-white rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:bg-green-700 disabled:opacity-50 transition-all">
                      {saving?<><Loader className="w-4 h-4 animate-spin"/>Saving…</>:<><Save className="w-4 h-4"/>Save Changes</>}
                    </button>
                    <button type="button" onClick={()=>{setFormData(snapRef.current||makeEmpty(user,userRole));setIsEditMode(false);setSaveError('');}} className="w-full py-2.5 bg-slate-100 text-slate-600 rounded-xl font-semibold text-sm hover:bg-slate-200 transition-all">Cancel</button>
                  </>
                )}
                <button onClick={()=>setShowDeleteConfirm(true)} className="w-full py-2.5 bg-white border-2 border-red-100 text-red-600 rounded-xl font-semibold text-sm flex items-center justify-center gap-2 hover:bg-red-50 transition-all">
                  <Trash2 className="w-4 h-4"/> Delete Account
                </button>
              </div>

              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-sm font-bold text-slate-700 flex items-center gap-1.5 ss"><Shield className="w-4 h-4 text-emerald-500"/>Trust Score</p>
                  <span className="text-sm font-black text-emerald-600">{trustPct}%</span>
                </div>
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden mb-3">
                  <div className="h-full bg-emerald-500 rounded-full transition-all" style={{width:`${trustPct}%`}}/>
                </div>
                {[{label:'LinkedIn',key:'linkedin_url',pts:3},{label:'GitHub',key:'github_url',pts:2},{label:'Twitter',key:'twitter_url',pts:1}].map(l=>(
                  <div key={l.key} className="flex items-center justify-between text-xs mb-1">
                    <span className={formData[l.key]?'text-slate-600':'text-slate-400'}>{l.label}</span>
                    <span className={`font-bold ${formData[l.key]?'text-emerald-600':'text-slate-300'}`}>{formData[l.key]?'✓':'+'+l.pts+' pts'}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* MAIN */}
            <div className="lg:col-span-3 bg-white rounded-3xl shadow-sm border border-slate-100 p-8 md:p-10">
              {!isEditMode
                ?<ViewMode formData={formData} isStudent={isStudent}/>
                :<EditMode
                    formData={formData} setFormData={setFormData}
                    isStudent={isStudent}
                    togSkill={togSkill} togInterest={togInterest}
                    togLookingFor={togLookingFor}
                    skillInput={skillInput} setSkillInput={setSkillInput}
                    interestInput={interestInput} setInterestInput={setInterestInput}
                    addSkill={addSkill} addInterest={addInterest}
                    handleUpdate={handleUpdate} saving={saving}
                  />
              }
            </div>
          </div>

          {showDeleteConfirm&&<DeleteModal onCancel={()=>setShowDeleteConfirm(false)} onConfirm={handleDelete}/>}
        </div>
      </div>
    </>
  );
}

// ─── VIEW MODE ─────────────────────────────────────────────────────────────
function ViewMode({formData, isStudent}) {
  return (
    <div className="space-y-10 dm">
      <div>
        <h1 className="text-3xl font-black text-slate-900 mb-1 ss">My Profile</h1>
        <p className="text-slate-500 text-sm">Your identity powers mentor, co-founder, and investor matching.</p>
      </div>

      <Sec title="Basic Information" icon={<User className="w-5 h-5 text-indigo-500"/>}>
        <div className="grid md:grid-cols-2 gap-3 mb-3">
          {[
            {label:'Full Name',val:formData.full_name, Icon:User},
            {label:'Email',    val:formData.email,     Icon:Mail},
            {label:'Location', val:formData.location,  Icon:MapPin},
          ].map((item,i)=>(
            <div key={i} className="flex items-start gap-3 p-3.5 bg-slate-50 rounded-xl">
              <div className="p-2 bg-indigo-50 text-indigo-500 rounded-lg flex-shrink-0"><item.Icon className="w-4 h-4"/></div>
              <div className="min-w-0">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wide mb-0.5">{item.label}</p>
                <p className="text-sm font-semibold text-slate-800 truncate">{item.val||<span className="text-slate-300 font-normal italic">Not provided</span>}</p>
              </div>
            </div>
          ))}
        </div>
        {formData.bio&&<div className="p-4 bg-slate-50 rounded-xl border-l-4 border-indigo-300"><p className="text-xs font-bold text-indigo-400 uppercase mb-1">About</p><p className="text-sm text-slate-700 leading-relaxed">{formData.bio}</p></div>}
      </Sec>

      {isStudent&&(
        <Sec title="Education" icon={<GraduationCap className="w-5 h-5 text-indigo-500"/>}>
          {formData.university?(
            <div className="space-y-3">
              <div className="bg-gradient-to-br from-indigo-50 to-violet-50 border border-indigo-100 rounded-2xl p-5">
                <p className="text-xs font-bold text-indigo-400 uppercase mb-1">University</p>
                <p className="text-xl font-black text-slate-900 ss">{formData.university}</p>
                {formData.degree&&<p className="text-sm text-slate-600 mt-1">{formData.degree}{formData.major?` · ${formData.major}`:''}</p>}
                <div className="flex gap-2 mt-2 flex-wrap">
                  {formData.current_year&&<span className="text-xs bg-indigo-100 text-indigo-700 font-bold px-3 py-1 rounded-full">{formData.current_year}</span>}
                  {formData.graduation_year&&<span className="text-xs bg-slate-100 text-slate-600 font-bold px-3 py-1 rounded-full">Class of {formData.graduation_year}</span>}
                </div>
              </div>
              {formData.career_goals&&<div className="p-4 bg-slate-50 rounded-xl border-l-4 border-violet-300"><p className="text-xs font-bold text-violet-500 uppercase mb-1">Career Goals</p><p className="text-sm text-slate-700 leading-relaxed">{formData.career_goals}</p></div>}
            </div>
          ):<Empty label="No education info added yet."/>}
        </Sec>
      )}

      <Sec title="Skills" icon={<Briefcase className="w-5 h-5 text-indigo-500"/>}>
        {(formData.skills||[]).length>0
          ?<div className="flex flex-wrap gap-2">{formData.skills.map((s,i)=><span key={i} className="px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-100 rounded-full text-xs font-semibold">{s}</span>)}</div>
          :<Empty label="No skills added yet."/>
        }
      </Sec>

      <Sec title="Interests" icon={<Tag className="w-5 h-5 text-indigo-500"/>}>
        {(formData.interests||[]).length>0
          ?<div className="flex flex-wrap gap-2">{formData.interests.map((s,i)=><span key={i} className="px-3 py-2 bg-violet-50 text-violet-700 border border-violet-100 rounded-full text-xs font-semibold">{s}</span>)}</div>
          :<Empty label="No interests added yet."/>
        }
      </Sec>

      {/* ── PATCH 6: Looking For — ViewMode display ────────────────────── */}
      {isStudent&&(
        <Sec title="Looking For" icon={<Tag className="w-5 h-5 text-indigo-500"/>}>
          {(formData.looking_for||[]).length>0?(
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {formData.looking_for.map((v,i)=>{
                const opt=LOOKING_FOR_OPTS.find(o=>o.val===v);
                return (
                  <div key={i} className="flex flex-col items-center gap-1.5 p-3.5 bg-indigo-50 border border-indigo-100 rounded-2xl text-center">
                    <span className="text-2xl">{opt?.icon||'🔍'}</span>
                    <span className="text-xs font-bold text-indigo-700 ss">{v}</span>
                    <span className="text-xs text-indigo-400">{opt?.desc||''}</span>
                  </div>
                );
              })}
            </div>
          ):<Empty label="No preferences set yet."/>}
        </Sec>
      )}

      <Sec title="Links" icon={<LinkIcon className="w-5 h-5 text-indigo-500"/>}>
        {[formData.linkedin_url,formData.github_url,formData.twitter_url].some(Boolean)?(
          <div className="grid md:grid-cols-2 gap-3">
            {[
              {key:'linkedin_url',label:'LinkedIn',Icon:Linkedin,bg:'bg-blue-50', tc:'text-blue-600'},
              {key:'github_url',  label:'GitHub',  Icon:Github,  bg:'bg-slate-50',tc:'text-slate-600'},
              {key:'twitter_url', label:'Twitter', Icon:Twitter, bg:'bg-sky-50',  tc:'text-sky-600'},
            ].filter(l=>formData[l.key]).map(l=>(
              <a key={l.key} href={formData[l.key]} target="_blank" rel="noreferrer"
                className={`flex items-center gap-3 p-3.5 ${l.bg} ${l.tc} rounded-xl hover:opacity-80 transition-all group`}>
                <l.Icon className="w-4 h-4 flex-shrink-0"/>
                <div className="flex-1 min-w-0"><p className="text-xs font-bold uppercase tracking-wide">{l.label}</p><p className="text-xs truncate group-hover:underline opacity-80">{formData[l.key].replace(/^https?:\/\//,'')}</p></div>
                <LinkIcon className="w-3.5 h-3.5 flex-shrink-0 opacity-50"/>
              </a>
            ))}
          </div>
        ):<Empty label="No links added yet. Links boost your Trust Score."/>}
      </Sec>
    </div>
  );
}

// ─── EDIT MODE ─────────────────────────────────────────────────────────────
function EditMode({formData,setFormData,isStudent,togSkill,togInterest,togLookingFor,skillInput,setSkillInput,interestInput,setInterestInput,addSkill,addInterest,handleUpdate,saving}) {
  const f = (field,val) => setFormData(prev=>({...prev,[field]:val}));
  const completion = calcCompletion(formData);

  return (
    <form onSubmit={handleUpdate} className="space-y-10 dm">
      <div>
        <h1 className="text-3xl font-black text-slate-900 ss mb-1">Edit Profile</h1>
        <p className="text-slate-400 text-sm">Basic info + Education. Startup ideas live on the Dashboard.</p>
      </div>

      <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-sm font-bold text-indigo-700 ss">Profile Completion</span>
          <span className="font-black text-indigo-600 ss">{completion}%</span>
        </div>
        <div className="h-2.5 bg-indigo-200 rounded-full overflow-hidden">
          <div className="h-full prog rounded-full transition-all duration-500" style={{width:`${completion}%`}}/>
        </div>
      </div>

      {/* A — Basic Information */}
      <EditSec title="Basic Information" icon={<User className="w-4 h-4"/>}>
        <div className="grid md:grid-cols-2 gap-4">
          <FInp label="Full Name *" value={formData.full_name} onChange={v=>f('full_name',v)} icon={<User className="w-4 h-4"/>} placeholder="Your full name" required/>
          <FInp label="Email" value={formData.email} disabled icon={<Mail className="w-4 h-4"/>}/>
          <FInp label="City / Country" value={formData.location} onChange={v=>f('location',v)} icon={<MapPin className="w-4 h-4"/>} placeholder="e.g. Karachi, Pakistan"/>
        </div>
        <FTxt label="About You" value={formData.bio} onChange={v=>f('bio',v)}
          placeholder="2–3 sentences about who you are, what you study, and what excites you." rows={3} max={400}/>
        <p className="text-xs text-slate-400 -mt-2 text-right">{(formData.bio||'').length}/400</p>
      </EditSec>

      {/* B — Education */}
      {isStudent&&(
        <EditSec title="Education" icon={<GraduationCap className="w-4 h-4"/>}
          hint="Helps mentors understand your background and match you better.">
          <div className="grid md:grid-cols-2 gap-4">
            <FInp label="University / College" value={formData.university} onChange={v=>f('university',v)} icon={<GraduationCap className="w-4 h-4"/>} placeholder="e.g. NUST, IBA, LUMS"/>
            <FInp label="Degree" value={formData.degree} onChange={v=>f('degree',v)} icon={<BookOpen className="w-4 h-4"/>} placeholder="e.g. BSc Computer Science"/>
            <FInp label="Major / Specialisation" value={formData.major} onChange={v=>f('major',v)} icon={<Briefcase className="w-4 h-4"/>} placeholder="e.g. Software Engineering"/>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Current Year</label>
              <div className="relative">
                <select className="sel" value={formData.current_year||''} onChange={e=>f('current_year',e.target.value)}>
                  <option value="">Select…</option>
                  {CURRENT_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
                <GraduationCap className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
              </div>
            </div>
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">Graduation Year</label>
              <div className="relative">
                <select className="sel" value={formData.graduation_year||''} onChange={e=>f('graduation_year',e.target.value)}>
                  <option value="">Select…</option>
                  {GRADUATION_YEARS.map(y=><option key={y} value={y}>{y}</option>)}
                </select>
                <BookOpen className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none"/>
              </div>
            </div>
          </div>
          <FTxt label="Career Goals" value={formData.career_goals} onChange={v=>f('career_goals',v)}
            placeholder="What do you want to do after graduation? e.g. Build a startup in EdTech, become a product manager…"
            rows={3} max={400}/>
        </EditSec>
      )}

      {/* C — Skills */}
      <EditSec title="Skills" icon={<Briefcase className="w-4 h-4"/>}
        hint="AI uses your skills to find relevant mentors and co-founders.">
        <div className="flex flex-wrap gap-2 mb-3">
          {SKILL_CHIPS.map(s=>(
            <button key={s} type="button" onClick={()=>togSkill(s)}
              className={`text-xs font-semibold px-3 py-2 rounded-full border transition-all ${
                formData.skills.includes(s)?'bg-indigo-50 text-indigo-700 border-indigo-300':'bg-slate-50 text-slate-500 border-slate-200 hover:border-indigo-200 hover:text-indigo-500'
              }`}>
              {formData.skills.includes(s)?'✓ ':'+ '}{s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="inp flex-1" value={skillInput} onChange={e=>setSkillInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addSkill())} placeholder="Add a custom skill…"/>
          <button type="button" onClick={addSkill} className="px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all">Add</button>
        </div>
        {formData.skills.filter(s=>!SKILL_CHIPS.includes(s)).length>0&&(
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.skills.filter(s=>!SKILL_CHIPS.includes(s)).map((s,i)=>(
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 text-indigo-700 rounded-full text-xs font-semibold border border-indigo-100">
                {s}<button type="button" onClick={()=>togSkill(s)}><X className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        )}
      </EditSec>

      {/* D — Interests */}
      <EditSec title="Interests" icon={<Tag className="w-4 h-4"/>}
        hint="Industries and areas you care about. Shown to mentors and investors.">
        <div className="flex flex-wrap gap-2 mb-3">
          {INTEREST_CHIPS.map(s=>(
            <button key={s} type="button" onClick={()=>togInterest(s)}
              className={`text-xs font-semibold px-3 py-2 rounded-full border transition-all ${
                formData.interests.includes(s)?'bg-violet-50 text-violet-700 border-violet-300':'bg-slate-50 text-slate-500 border-slate-200 hover:border-violet-200 hover:text-violet-500'
              }`}>
              {formData.interests.includes(s)?'✓ ':'+ '}{s}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <input className="inp flex-1" value={interestInput} onChange={e=>setInterestInput(e.target.value)}
            onKeyDown={e=>e.key==='Enter'&&(e.preventDefault(),addInterest())} placeholder="Add a custom interest…"/>
          <button type="button" onClick={addInterest} className="px-4 py-2.5 bg-violet-600 text-white rounded-xl text-sm font-bold hover:bg-violet-700 transition-all">Add</button>
        </div>
        {formData.interests.filter(s=>!INTEREST_CHIPS.includes(s)).length>0&&(
          <div className="flex flex-wrap gap-2 mt-2">
            {formData.interests.filter(s=>!INTEREST_CHIPS.includes(s)).map((s,i)=>(
              <span key={i} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-violet-50 text-violet-700 rounded-full text-xs font-semibold border border-violet-100">
                {s}<button type="button" onClick={()=>togInterest(s)}><X className="w-3 h-3"/></button>
              </span>
            ))}
          </div>
        )}
      </EditSec>

      {/* ── PATCH 6: Looking For — EditMode section ────────────────────── */}
      {isStudent&&(
        <EditSec title="Looking For" icon={<Tag className="w-4 h-4"/>}
          hint="What are you here to find? Select all that apply. This is what makes you appear as a Co-Founder seeker on Discover.">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {LOOKING_FOR_OPTS.map(opt=>{
              const on=(formData.looking_for||[]).includes(opt.val);
              return (
                <button key={opt.val} type="button" onClick={()=>togLookingFor(opt.val)}
                  className={`flex flex-col items-center gap-2 py-4 px-2 rounded-2xl border-2 text-center transition-all ${
                    on
                      ?'border-indigo-400 bg-indigo-50 text-indigo-700'
                      :'border-slate-200 bg-white text-slate-500 hover:border-indigo-200 hover:bg-indigo-50/50'
                  }`}>
                  <span className="text-2xl">{opt.icon}</span>
                  <span className="text-xs font-bold ss">{opt.val}</span>
                  <span className="text-[10px] text-slate-400">{opt.desc}</span>
                  {on&&<span className="text-xs text-indigo-500 font-bold">✓ Selected</span>}
                </button>
              );
            })}
          </div>
          <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
            <span className="text-indigo-500 font-bold">Tip:</span>
            Selecting "Co-Founder" makes you visible in the Discover page under People → Co-Founders.
          </p>
        </EditSec>
      )}

      {/* E — Links */}
      <EditSec title="Links" icon={<LinkIcon className="w-4 h-4"/>}
        hint="Each link boosts your Trust Score. Mentors check these before accepting.">
        <div className="grid md:grid-cols-2 gap-4">
          {[
            {field:'linkedin_url',Icon:Linkedin,label:'LinkedIn URL',pts:3,ph:'https://linkedin.com/in/yourname'},
            {field:'github_url',  Icon:Github,  label:'GitHub URL',  pts:2,ph:'https://github.com/yourusername'},
            {field:'twitter_url', Icon:Twitter, label:'Twitter URL',  pts:1,ph:'https://twitter.com/yourhandle'},
          ].map(({field,Icon,label,pts,ph})=>(
            <div key={field}>
              <label className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wide mb-1.5">
                <Icon className="w-3.5 h-3.5"/> {label}
                <span className="ml-auto text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded-full normal-case">+{pts} pts</span>
              </label>
              <input type="url" placeholder={ph} value={formData[field]||''} onChange={e=>f(field,e.target.value)} className="inp"/>
            </div>
          ))}
        </div>
      </EditSec>
    </form>
  );
}

// ─── Shared primitives ──────────────────────────────────────────────────────
function Sec({title,icon,children}) {
  return (
    <section>
      <div className="flex items-center gap-2 mb-4">{icon}<h2 className="text-lg font-bold text-slate-900 ss">{title}</h2></div>
      {children}
    </section>
  );
}
function EditSec({title,icon,hint,children}) {
  return (
    <section className="space-y-4 pt-8 border-t border-slate-100">
      <div><p className="sec-label">{icon}{title}</p>{hint&&<p className="text-xs text-slate-400 -mt-2 mb-3">{hint}</p>}</div>
      {children}
    </section>
  );
}
function FInp({label,value,onChange,type='text',placeholder,required,disabled,icon}) {
  return (
    <div className="space-y-1.5">
      {label&&<label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
      <div className="relative">
        {icon&&<div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">{icon}</div>}
        <input type={type} value={value||''} onChange={e=>onChange?.(e.target.value)}
          placeholder={placeholder} required={required} disabled={disabled}
          className={`inp ${icon?'pl-10':''}`}/>
      </div>
    </div>
  );
}
function FTxt({label,value,onChange,placeholder,rows=4,max}) {
  return (
    <div className="space-y-1.5">
      {label&&<label className="block text-xs font-bold text-slate-500 uppercase tracking-wide">{label}</label>}
      <textarea value={value||''} onChange={e=>onChange(e.target.value)} placeholder={placeholder} rows={rows} maxLength={max} className="ta"/>
    </div>
  );
}
function Empty({label}) { return <p className="text-sm text-slate-400 italic py-2">{label}</p>; }
function DeleteModal({onCancel,onConfirm}) {
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl">
        <div className="text-center">
          <div className="h-16 w-16 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4"><AlertTriangle className="w-8 h-8"/></div>
          <h2 className="text-2xl font-black text-slate-900 mb-2 ss">Delete Account?</h2>
          <p className="text-slate-600 mb-6 text-sm">This is permanent. All your data will be deleted immediately.</p>
          <div className="flex gap-3">
            <button onClick={onCancel} className="flex-1 py-3 bg-slate-100 text-slate-700 rounded-xl font-bold hover:bg-slate-200">Cancel</button>
            <button onClick={onConfirm} className="flex-1 py-3 bg-red-600 text-white rounded-xl font-bold hover:bg-red-700">Delete Account</button>
          </div>
        </div>
      </div>
    </div>
  );
}