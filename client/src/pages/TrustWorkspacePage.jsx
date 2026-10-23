import { useCallback, useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { RefreshCw, Check, X, UserRound, Inbox, LockKeyhole, CalendarClock } from 'lucide-react';
import { trustApi } from '../services/trustApi';
import { backendApi } from '../lib/backendApi';
import EvidenceWorkspace from '../components/EvidenceWorkspace';
import MeetingFollowups from '../components/MeetingFollowups';
import PassportWorkspace from '../components/PassportWorkspace';
import {passportVisible} from '../utils/passportFlags.mjs';
import MatchExplanation from '../components/MatchExplanation';
import './TrustWorkspace.css';
export default function TrustWorkspacePage() {
 const [params,setParams]=useSearchParams();
 const showPassport=passportVisible(import.meta.env);
 const requestedTab=params.get('tab')||'inbox';
 const tab=requestedTab==='passport'&&!showPassport?'inbox':requestedTab;
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[notice,setNotice]=useState('');
 const [filter,setFilter]=useState('all');
 const load=useCallback(async()=>{
  const [evidence,connections,inbox,meetings]=await Promise.all([trustApi('/evidence'),trustApi('/connections'),trustApi('/inbox'),trustApi('/meetings')]);
  const queue=[];
  return {evidence,connections,inbox,meetings,queue};
 },[]);
 useEffect(()=>{let active=true;load().then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message);}).finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[load]);
 async function run(fn,reload=true) {
  setBusy(true);setError('');setNotice('');
  try{await fn();if(reload)setData(await load());setNotice('Done');return true;}catch(e){setError(e.message);return false;}finally{setBusy(false);}
 }
 const requests=data?.inbox.filter(r=>filter==='all'||(filter==='aligned'?r.fit?.status==='potential_fit'&&r.fit.matchScore>=60:!r.fit||r.fit.status!=='potential_fit'||r.fit.matchScore<60))||[];
 return <main className="trust-workspace">
  <header className="tw-row"><h1>Trust & connections</h1><button disabled={busy||loading} onClick={()=>run(async()=>setData(await load()),false)} title="Refresh workspace" aria-label="Refresh workspace"><RefreshCw size={18}/></button></header>
  <nav aria-label="Workspace views" className="tw-tabs">{[{id:'inbox',label:'Requests',icon:<Inbox size={16}/>},{id:'evidence',label:'Evidence',icon:<LockKeyhole size={16}/>},{id:'meetings',label:'Follow-ups',icon:<CalendarClock size={16}/>},...(showPassport?[{id:'passport',label:'Trust Passport',icon:<LockKeyhole size={16}/>}]:[])].map(({id,label,icon})=><button key={id} aria-current={tab===id?'page':undefined} onClick={()=>setParams({tab:id})}>{icon}{label}</button>)}</nav>
  {error&&<p className="tw-error" role="alert">{error}</p>}{notice&&<p role="status">{notice}</p>}
  {loading&&<p role="status">Loading workspace...</p>}
  {showPassport&&tab==='passport'&&<PassportWorkspace/>}
  {data&&tab!=='passport'&&<fieldset disabled={busy} className="tw-body">
   {tab==='evidence'?<EvidenceWorkspace data={data.evidence} connections={data.connections} queue={data.queue} run={run}/>:tab==='meetings'?<MeetingFollowups data={data.meetings} run={run}/>:<section className="tw-section">
    <div className="tw-row"><h2>Incoming requests</h2><label>Show<select value={filter} onChange={e=>setFilter(e.target.value)}><option value="all">All requests</option><option value="aligned">Potential fit (60%+)</option><option value="clarify">Other / needs clarification</option></select></label></div>
    <p className="tw-muted">Latest 100 pending requests, ordered by profile fit. A fit score is not a verification badge.</p>
    {!requests.length&&<p>No requests in this view.</p>}
    {requests.map(r=><article className="tw-item" key={r.id}>
     <div className="tw-row"><h3>{r.person.full_name}</h3><span>{new Date(r.created_at).toLocaleDateString()}</span></div>
     <p>{r.type.replaceAll('_',' ')}</p>{r.message&&<p>{r.message}</p>}
     {r.fit?<MatchExplanation fit={r.fit}/>:<p>Fit unavailable. Review the profile before deciding.</p>}
     <div className="tw-actions"><Link to={'/user-profile/'+r.sender_id}><UserRound size={16}/> View profile</Link>
      <button className="tw-primary" onClick={()=>run(()=>backendApi.respondConnect(r.id,'accept'))}><Check size={16}/> Accept</button>
      <button onClick={()=>run(()=>backendApi.respondConnect(r.id,'decline'))}><X size={16}/> Decline</button>
     </div>
    </article>)}
   </section>}
  </fieldset>}
 </main>;
}
