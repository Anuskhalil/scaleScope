import {useEffect,useState} from 'react';
import {RefreshCw,Download,Save,Search,UserRound,ClipboardCheck} from 'lucide-react';
import {profileReviewApi} from '../services/profileReviewApi';
import {downloadEvidence,trustApi} from '../services/trustApi';
import PassportWorkspace from '../components/PassportWorkspace';
import EvidenceWorkspace from '../components/EvidenceWorkspace';
import {passportVisible} from '../utils/passportFlags.mjs';
import AIReviewReport from '../components/AIReviewReport';
import './TrustWorkspace.css';
import '../components/ReviewUI.css';
function Value({value}){
 if(typeof value==='boolean')return value?'Yes':'No';
 if(Array.isArray(value))return value.length?<ul>{value.map((v,i)=><li key={i}><Value value={v}/></li>)}</ul>:<span>None added</span>;
 if(value&&typeof value==='object')return <Fields value={value}/>;
 return String(value??'Not provided');
}
function Fields({value}){
 if(!value)return <p>No role profile has been saved.</p>;
 return <dl className="admin-fields">{Object.entries(value).filter(([k,v])=>v!==null&&v!==''&&!['id','user_id','created_at','updated_at'].includes(k)).map(([k,v])=><div key={k}><dt>{k.replaceAll('_',' ')}</dt><dd><Value value={v}/></dd></div>)}</dl>;
}
export default function AdminReviewPage(){
 const [allowed,setAllowed]=useState(false),[loaded,setLoaded]=useState(false),[rows,setRows]=useState([]),[selected,setSelected]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [status,setStatus]=useState('approved'),[note,setNote]=useState('');
 const [search,setSearch]=useState('');
 const [tab,setTab]=useState('profiles'),[evidenceQueue,setEvidenceQueue]=useState([]),[notice,setNotice]=useState('');
 useEffect(()=>{if(!allowed||tab!=='evidence')return;let active=true;trustApi('/review-queue').then(q=>{if(active)setEvidenceQueue(q);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[allowed,tab]);
 async function reviewEvidence(fn,reload=true){setBusy(true);setError('');setNotice('');try{await fn();setNotice(reload?'Evidence review saved.':'Download started.');if(reload)setEvidenceQueue(await trustApi('/review-queue'));return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}}
 useEffect(()=>{let alive=true;profileReviewApi('/me').then(async me=>{
  if(!me.isAdmin)throw new Error('This page is restricted to authorized administrators.');
  const q=await profileReviewApi('/queue');if(alive){setAllowed(true);setRows(q);}
 }).catch(e=>{if(alive)setError(e.message);}).finally(()=>{if(alive)setLoaded(true);});return()=>{alive=false;};},[]);
 async function run(fn){setBusy(true);setError('');try{await fn();}catch(e){setError(e.message);}finally{setBusy(false);}}
 async function open(id){await run(async()=>{setSelected(await profileReviewApi('/profiles/'+id));setNote('');setStatus('approved');});}
 const filtered=rows.filter(r=>(r.profile.full_name+' '+r.profile.user_type).toLowerCase().includes(search.toLowerCase()));
 return <main className="trust-workspace review-admin">
  <header className="admin-heading"><div><h1>Profile reviews</h1><p className="tw-muted">Review evidence and make an informed decision.</p></div><span className="review-badge"><ClipboardCheck size={16}/>{rows.length} pending</span></header>
  {error&&<p role="alert" className="tw-error">{error}</p>}
  {!loaded&&<p>Checking access...</p>}
  {notice&&<p role="status">{notice}</p>}
  {allowed&&<nav className="tw-tabs" aria-label="Verification reviews">{[['profiles','Profiles'],...(passportVisible(import.meta.env)?[['passport','Passport claims']]:[]),['evidence','Evidence reviews']].map(([id,title])=><button key={id} disabled={busy} aria-current={tab===id?'page':undefined} onClick={()=>{setTab(id);setError('');setNotice('');}}>{title}</button>)}</nav>}
  {allowed&&tab==='passport'&&<PassportWorkspace reviewOnly/>}
  {allowed&&tab==='evidence'&&<fieldset className="tw-body" disabled={busy}><EvidenceWorkspace reviewOnly data={{own:[],shared:[],grants:[],reviewer:true}} connections={[]} queue={evidenceQueue} run={reviewEvidence}/></fieldset>}
  {allowed&&tab==='profiles'&&<fieldset disabled={busy} className="tw-body admin-workspace" aria-busy={busy}>
   <aside className="admin-queue">
   <div className="tw-row"><h2>Pending profiles</h2><button title="Refresh queue" aria-label="Refresh queue" onClick={()=>run(async()=>setRows(await profileReviewApi('/queue')))}><RefreshCw size={18}/></button></div>
   <label className="admin-search"><Search size={16}/><input aria-label="Search pending profiles" placeholder="Search name or role" value={search} onChange={e=>setSearch(e.target.value)}/></label>
   <p className="tw-muted">Up to 100 profiles, oldest first.</p>
   {!rows.length&&<p>No profiles waiting for review.</p>}
   {!!rows.length&&!filtered.length&&<p>No matching profiles.</p>}
   {filtered.map(r=><div className={'admin-queue-row '+(selected?.profile.id===r.user_id?'is-selected':'')} key={r.user_id}><div className="admin-person"><UserRound size={20}/><div><h3>{r.profile.full_name}</h3><p>{r.profile.user_type==='investor'?'Investor':'Early-stage founder'} · Revision {r.revision}</p></div></div><div className="tw-row"><span className="review-badge">AI: {r.ai_status}</span><button onClick={()=>open(r.user_id)}>Review profile</button></div></div>)}
   </aside>
   {!selected&&<div className="admin-empty"><ClipboardCheck size={32}/><h2>Select a profile</h2><p>Profile details, evidence and review decisions appear here.</p></div>}
   {selected&&<section className="admin-detail">
    <header className="admin-detail-heading"><h2>{selected.profile.full_name}</h2><span className="review-badge">Revision {selected.review.revision}</span></header>
    <AIReviewReport analysis={selected.review}/>
    <details open className="admin-section"><summary>Basic profile</summary><Fields value={selected.profile}/></details>
    <details open className="admin-section"><summary>Role profile</summary><Fields value={selected.role}/></details>
    <h2 className="admin-evidence-heading">Uploaded evidence <span className="review-badge">{selected.evidence.length}</span></h2>
    {!selected.evidence.length&&<p>No private evidence uploaded.</p>}
    {selected.evidence.map(e=><article className="tw-item" key={e.id}><h3>{e.title}</h3><p>{e.claim}</p><p>Human evidence review: {e.review_status}</p>
     <button onClick={()=>run(()=>downloadEvidence(e.id))}><Download size={16}/> Download evidence</button><AIReviewReport analysis={e.analysis}/>
    </article>)}
    <form className="admin-decision" onSubmit={e=>{e.preventDefault();run(async()=>{await profileReviewApi('/profiles/'+selected.profile.id+'/decision',{revision:selected.review.revision,status,note});setSelected(null);setRows(await profileReviewApi('/queue'));window.dispatchEvent(new Event('profile:saved'));});}}>
     <h2>Review decision</h2>
     <label>Final decision<select value={status} onChange={e=>setStatus(e.target.value)}><option value="approved">Approve profile</option><option value="changes_requested">Request changes</option><option value="rejected">Reject profile</option></select></label>
     <label>Reason and review limitations (visible to the user)<textarea required minLength={20} maxLength={1500} value={note} onChange={e=>setNote(e.target.value)}/></label>
     <p className="tw-muted">Do not include private document contents in the decision note. You cannot approve your own profile.</p>
     <button className="tw-primary"><Save size={16}/> Save decision</button>
    </form>
   </section>}
  </fieldset>}
 </main>;
}
