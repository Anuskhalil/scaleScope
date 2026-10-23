import {useCallback,useEffect,useRef,useState} from 'react';
import {Upload,RefreshCw,Download,Check,X,Eye,ShieldCheck,AlertCircle} from 'lucide-react';
import {supabase} from '../lib/supabaseClient';
import {downloadEvidence} from '../services/trustApi';
import './PassportWorkspace.css';
const base=import.meta.env.VITE_BACKEND_URL;
async function api(path,body,file){
 const {data}=await supabase.auth.getSession();
 if(!data.session)throw new Error('Please sign in again.');
 const headers={Authorization:'Bearer '+data.session.access_token};
 if(file){headers['Content-Type']=file.type;headers['X-Evidence-Metadata']=encodeURIComponent(JSON.stringify(body));}
 else if(body)headers['Content-Type']='application/json';
 const response=await fetch(base+'/api/passport'+path,{method:body?'POST':'GET',headers,body:file||(body?JSON.stringify(body):undefined),cache:'no-store'});
 const value=await response.json().catch(()=>({}));
 if(!response.ok)throw new Error(value.error||'Request failed. Please try again.');
 return value.data;
}
const categories={professional:'experience',education:'education',startup:'product',firm:'investment_history',traction:'traction',investment_history:'investment_history'};
const label=value=>value.replaceAll('_',' ').replace(/^./,c=>c.toUpperCase());
const outcomes={in_review:'Review started',supported:'Claim supported',needs_changes:'Changes requested',rejected:'Claim rejected'};
const hints={submitted:'Awaiting reviewer assessment.',in_review:'A reviewer is assessing this claim.',supported:'Evidence supports this specific claim. This is not whole-profile approval.',needs_changes:'Updated evidence and a new claim version are needed.',rejected:'This claim was not supported. New evidence can be submitted for a new assessment.',stale:'Evidence is no longer current. Submit updated evidence.',revoked:'This claim is no longer supported.',expired:'This assessment has expired.'};
export default function PassportWorkspace({reviewOnly=false}){
 const [data,setData]=useState(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[notice,setNotice]=useState(null);
 const [kind,setKind]=useState('startup'),[title,setTitle]=useState(''),[statement,setStatement]=useState(''),[file,setFile]=useState(null),[selected,setSelected]=useState(''),[consent,setConsent]=useState(false),[context,setContext]=useState(null),[request,setRequest]=useState(null),[view,setView]=useState('mine'),[confirm,setConfirm]=useState(null);
 const [reason,setReason]=useState('');
 useEffect(()=>{setView(reviewOnly?'queue':'mine');setContext(null);},[reviewOnly]);
 useEffect(()=>{setReason('');},[confirm]);
 const fileInput=useRef(null),detail=useRef(null),dialog=useRef(null),lock=useRef(false);
 const load=useCallback(async()=>setData(await api('/workspace')),[]);
 useEffect(()=>{let active=true;api('/workspace').then(v=>{if(active)setData(v);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[]);
 useEffect(()=>{if(confirm)dialog.current?.showModal();else dialog.current?.close();},[confirm]);
 useEffect(()=>{if(context)detail.current?.focus();},[context]);
 useEffect(()=>{if(!notice||notice.type==='error')return;const timer=setTimeout(()=>setNotice(null),6000);return()=>clearTimeout(timer);},[notice]);
 async function run(name,fn,message,reload=false){
  if(lock.current)return;
  lock.current=true;setBusy(name);setError('');setNotice(null);
  try{
   await fn();
   setNotice({type:'success',text:message});
   if(reload)try{await load();}catch{setError('Action completed, but the list could not refresh. Refresh the list before repeating the action.');}
  }catch(e){setError(e.message);setNotice({type:'error',text:e.message});}
  finally{lock.current=false;setBusy('');}
 }
 function reset(){setTitle('');setStatement('');setFile(null);setSelected('');setConsent(false);setRequest(null);if(fileInput.current)fileInput.current.value='';}
 function cancel(){reset();setError('');setNotice({type:'info',text:'Draft cleared. Uploaded evidence and submitted claims are unchanged.'});setConfirm(null);}
 const evidence=data?.evidence.find(e=>e.id===selected);
 const own=context&&data?.claims.some(c=>c.id===context.id);
 const readOnly=data?.mutationsEnabled===false;
 const actions=reviewOnly&&!readOnly&&data?.reviewer&&!own&&context?(context.status==='submitted'?['in_review']:context.status==='in_review'?['supported','needs_changes','rejected']:[]):[];
 const rows=data?(view==='queue'?data.queue:view==='history'?data.history||[]:data.claims):[];
 async function open(id){await run('open',async()=>{setContext(null);setContext(await api('/claims/'+id+'/context'));},'Claim details loaded.');}
 return <section className="passport">
 <header className="pp-heading"><div><h2><ShieldCheck size={22}/>Trust Passport</h2><p>Private evidence / Claim-specific assessment</p></div><button disabled={!!busy} title="Refresh Passport" aria-label="Refresh Passport" onClick={()=>run('refresh',load,'Passport updated.')}><RefreshCw size={18}/></button></header>
 {notice&&<div className={'pp-toast pp-'+notice.type} role={notice.type==='error'?'alert':'status'}><span>{notice.text}</span><button title="Dismiss notification" aria-label="Dismiss notification" onClick={()=>setNotice(null)}><X size={16}/></button></div>}
 {error&&<p className="pp-error" role="alert"><AlertCircle size={18}/>{error}</p>}
 {!data?<div><p>{error?'Passport could not load.':'Loading Passport...'}</p>{error&&<button onClick={()=>run('retry',load,'Passport loaded.')}>Try again</button>}</div>:<>
 <fieldset disabled={!!busy} className="pp-body">
 {readOnly&&<p role="status">Trust Passport is temporarily read-only. Existing claims and authorized downloads remain available.</p>}
 {!reviewOnly&&<fieldset className="pp-body pp-columns" disabled={readOnly||!!busy}>
 <form onSubmit={e=>{e.preventDefault();run('upload',async()=>{
  if(!file||file.size>5242880||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PDF, PNG or JPEG up to 5 MB.');
  if(statement.trim().length<20||!title.trim())throw new Error('Add a title and a statement of at least 20 characters.');
  const uploaded=await api('/evidence',{category:categories[kind],title:title.trim(),claim:statement.trim()},file);
  setSelected(uploaded.id);setConsent(false);setRequest(null);setFile(null);if(fileInput.current)fileInput.current.value='';
  window.dispatchEvent(new Event('profile:saved'));
 },'Evidence uploaded. Confirm consent to submit your claim.',true);}}>
 <h3>1. Private evidence</h3>
 <label>Claim type<select value={kind} onChange={e=>{setKind(e.target.value);setSelected('');setConsent(false);setRequest(null);}}>{Object.keys(categories).map(k=><option key={k} value={k}>{label(k)}</option>)}</select></label>
 <label>Evidence title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
 <label>Claim statement<textarea required minLength={20} maxLength={1000} rows={4} value={statement} onChange={e=>setStatement(e.target.value)}/><small>{statement.length}/1000 characters</small></label>
 <label>Evidence file<input ref={fileInput} required type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/><small>PDF, PNG or JPEG / Maximum 5 MB</small></label>
 <div className="pp-actions"><button className="tw-primary"><Upload size={16}/>{busy==='upload'?'Uploading...':'Upload evidence'}</button><button type="button" onClick={()=>setConfirm('cancel')}><X size={16}/>Cancel draft</button></div>
 </form>
 <form onSubmit={e=>{e.preventDefault();run('submit',async()=>{
  if(!evidence||!consent)throw new Error('Select evidence and confirm consent.');
  const requestId=request||crypto.randomUUID();setRequest(requestId);
  await api('/claims',{requestId,kind,statement:evidence.claim,evidenceIds:[selected],consent});
  reset();setView('mine');setContext(null);
 },'Claim submitted. Awaiting reviewer assessment.',true);}}>
 <h3>2. Submit for review</h3>
 <label>Evidence<select required value={selected} onChange={e=>{setSelected(e.target.value);setConsent(false);setRequest(null);}}><option value="">Select private evidence</option>{data.evidence.filter(e=>e.category===categories[kind]).map(e=><option key={e.id} value={e.id}>{e.title}</option>)}</select></label>
 {evidence?<><button type="button" onClick={()=>setConfirm('withdraw')}><X size={16}/>Withdraw selected evidence</button><p className="pp-statement">{evidence.claim}</p></>:<p className="pp-muted">No evidence selected.</p>}
 <label className="pp-consent"><input type="checkbox" required checked={consent} onChange={e=>setConsent(e.target.checked)}/><span>I consent to authorized reviewers examining this claim and its private evidence.</span></label>
 <button className="tw-primary" disabled={!evidence||!consent}><Check size={16}/>{busy==='submit'?'Submitting...':'Submit claim'}</button>
 </form>
 </fieldset>}
 <section className="pp-list">
 <nav className="pp-tabs" aria-label="Claim lists">{(reviewOnly?(data.reviewer?[['queue','Review queue'],['history','Reviewed history']]:[]):[['mine','Your claims']]).map(([id,text])=><button key={id} aria-pressed={view===id} onClick={()=>{setView(id);setContext(null);}}>{text}</button>)}</nav>
 {!rows.length&&<p className="pp-muted">No claims in this list.</p>}
 {rows.map(c=><article className="pp-claim" key={c.id}><div><strong>{label(c.claim_kind)}</strong><small>Version {c.claim_version}</small></div><span className={'pp-status pp-status-'+c.passport_state}>{label(c.passport_state)}</span><button onClick={()=>open(c.id)}><Eye size={16}/>Open claim</button></article>)}
 </section>
 {context&&<section className="pp-detail" ref={detail} tabIndex={-1}>
 <div className="pp-heading"><h3>{label(context.kind)} / Version {context.version}</h3><button title="Close claim" aria-label="Close claim" onClick={()=>{setContext(null);setNotice({type:'info',text:'Claim details closed. No changes made.'});}}><X size={18}/></button></div>
 <span className={'pp-status pp-status-'+context.status}>{label(context.status)}</span><p>{hints[context.status]}</p><p className="pp-statement">{context.statement}</p>
 {context.reason&&<section><h4>Reviewer feedback</h4><p className="pp-statement">{context.reason}</p></section>}
 <div className="pp-actions">{context.evidence.map(e=><button key={e.id} onClick={()=>run('download',()=>downloadEvidence(e.id),'Download started. Check your browser downloads.')}><Download size={16}/>Download {e.title}</button>)}</div>
 {actions.length>0&&<div className="pp-actions pp-decisions">{actions.map(action=><button key={action} className={action==='supported'?'tw-primary':''} onClick={()=>setConfirm(action)}>{action==='in_review'?'Start review':action==='needs_changes'?'Request changes':label(action)}</button>)}</div>}
 </section>}
 </fieldset>
 {busy&&<p role="status" className="pp-muted">Processing...</p>}
 </>}
 <dialog ref={dialog} className="pp-dialog" onCancel={e=>{e.preventDefault();setConfirm(null);setNotice({type:'info',text:'Action cancelled. No changes made.'});}}>
 <h3>{confirm==='withdraw'?'Withdraw private evidence?':confirm==='cancel'?'Clear unsaved draft?':'Confirm review decision'}</h3>
 <p>{confirm==='withdraw'?'Withdraw this evidence from all linked claims? Their support will become stale and downloads will be blocked for everyone. Files and audit records remain retained; this cannot be undone here.':confirm==='cancel'?'Uploaded files and submitted claims will remain unchanged.':confirm==='supported'?'Mark this specific claim as supported by its evidence? This does not approve the whole profile.':confirm==='in_review'?'Start assessing this claim and its private evidence?':confirm==='needs_changes'?'Return this claim for updated evidence and a new version?':'Reject this claim based on the reviewed evidence?'}</p>
 {data?.reviewFeedbackEnabled&&['supported','needs_changes','rejected'].includes(confirm)&&<label>Feedback for the owner<textarea rows={4} maxLength={700} minLength={10} value={reason} onChange={e=>setReason(e.target.value)} required={confirm!=='supported'}/><small>{reason.length}/700 characters</small></label>}
 <div className="pp-actions"><button disabled={!!busy} onClick={()=>{setConfirm(null);setNotice({type:'info',text:'Action cancelled. No changes made.'});}}>Keep unchanged</button><button disabled={!!busy||(data?.reviewFeedbackEnabled&&['needs_changes','rejected'].includes(confirm)&&reason.trim().length<10)} className="tw-primary" onClick={()=>{if(confirm==='cancel'){cancel();return;}if(confirm==='withdraw'){setConfirm(null);run('withdraw',async()=>{await api('/evidence/'+selected+'/withdraw',{confirm:true});setSelected('');setConsent(false);setRequest(null);setContext(null);},'Evidence withdrawn. Linked claims are no longer current; audit history is retained.',true);return;}const action=confirm;setConfirm(null);run('decision',async()=>{await api('/claims/'+context.id+'/decision',{version:context.version,action,...(data.reviewFeedbackEnabled&&reason.trim()?{reason:reason.trim()}:{})});setContext({...context,status:action,reason:reason.trim()||null});},outcomes[action]+'.',true);}}>Confirm</button></div>
 </dialog>
 </section>;
}
