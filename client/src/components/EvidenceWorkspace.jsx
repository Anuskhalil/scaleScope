import { useState } from 'react';
import { Download, Trash2, Share2, Upload, LockKeyhole, ShieldCheck, Clock } from 'lucide-react';
import { trustApi, downloadEvidence } from '../services/trustApi';
import AIReviewReport from './AIReviewReport';
const labels={pending:'Awaiting review',supported:'Evidence supports this claim',needs_changes:'Changes requested',rejected:'Claim not supported'};
export default function EvidenceWorkspace({data,connections,queue=[],run,reviewOnly=false}) {
 const [category,setCategory]=useState('product'),[title,setTitle]=useState(''),[claim,setClaim]=useState(''),[file,setFile]=useState(null);
 const [uploadKey,setUploadKey]=useState(0),[selected,setSelected]=useState(''),[recipient,setRecipient]=useState(''),[days,setDays]=useState(7);
 const [reviewId,setReviewId]=useState(''),[status,setStatus]=useState('supported'),[note,setNote]=useState('');
 async function upload(e) {
  e.preventDefault();
  if(!file || file.size>5242880)return run(()=>Promise.reject(new Error('Choose a PDF, PNG or JPEG up to 5 MB')));
  const ok=await run(()=>trustApi('/evidence',{method:'POST',body:{category,title,claim},file}));
  if(ok){setTitle('');setClaim('');setFile(null);setUploadKey(v=>v+1);window.dispatchEvent(new Event('profile:saved'));}
 }
 const all=[...data.own,...data.shared].filter(e=>!e.passport_private);
 return <div>
  {!reviewOnly&&<><form onSubmit={upload} className="tw-section">
   <h2><LockKeyhole size={18}/> Private evidence</h2>
   <div className="tw-grid">
    <label>Claim category<select value={category} onChange={e=>setCategory(e.target.value)}>{['identity','education','experience','product','traction','investment_history'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
    <label>Document title<input required maxLength={120} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   </div>
   <label>Specific claim this document supports<textarea required minLength={10} maxLength={1000} value={claim} onChange={e=>setClaim(e.target.value)} placeholder="Example: Our product had 25 paying customers in August 2026."/></label>
   <label>Evidence file (PDF, PNG, JPEG; up to 5 MB)<input key={uploadKey} required type="file" accept=".pdf,.png,.jpg,.jpeg" onChange={e=>setFile(e.target.files?.[0]||null)}/></label>
   <p className="tw-muted">Private to you and authorized reviewers until you grant access. Redact unrelated personal or financial details. File checks do not establish authenticity or malware safety.</p>
   <button className="tw-primary"><Upload size={16}/> Upload evidence</button>
  </form>
  <section className="tw-section"><h2>Documents</h2>
   {!all.length&&<p>No evidence uploaded or shared with you.</p>}
   <div className="tw-list">{all.map(e=><article key={e.id} className="tw-item">
    <div className="tw-row"><h3>{e.title}</h3><span>{e.category.replaceAll('_',' ')}</span></div>
    <p>{e.claim}</p><p className="flex items-center gap-2">{e.review_status==='supported'?<ShieldCheck size={15}/>:<Clock size={15}/>} {labels[e.review_status]||'Awaiting review'}</p>
    <p className="tw-muted">File signature and size checked. This is not a full file scan or authenticity check.</p>
    {e.review_note&&<p>Review: {e.review_note}</p>}
    <AIReviewReport analysis={e.analysis}/>
    {e.expires_at&&<p>Access expires: {new Date(e.expires_at).toLocaleString()}</p>}
    <div className="tw-actions">
     <button type="button" onClick={()=>run(()=>downloadEvidence(e.id),false)}><Download size={16}/> Download</button>
     {data.own.some(x=>x.id===e.id)&&<>
      <button type="button" onClick={()=>{setSelected(selected===e.id?'':e.id);setRecipient('');}}><Share2 size={16}/> Manage sharing</button>
      <button type="button" onClick={()=>{if(window.confirm('Permanently delete this evidence and revoke access?'))run(()=>trustApi('/evidence/'+e.id,{method:'DELETE'}));}}><Trash2 size={16}/> Delete</button>
     </>}
    </div>
    {selected===e.id&&<form className="tw-sharing" onSubmit={event=>{event.preventDefault();run(()=>trustApi('/evidence/'+e.id+'/share',{method:'POST',body:{recipientId:recipient,days:Number(days)}}));}}>
     <div className="tw-grid"><label>Connected recipient<select required value={recipient} onChange={event=>setRecipient(event.target.value)}><option value="">Select connection</option>{connections.map(c=><option key={c.id} value={c.id}>{c.full_name}</option>)}</select></label>
     <label>Access duration (days)<input type="number" required min={1} max={30} value={days} onChange={event=>setDays(event.target.value)}/></label></div>
     <p className="tw-muted">Recipients can keep downloaded copies. Revocation prevents future downloads.</p>
     <button className="tw-primary"><Share2 size={16}/> Grant access</button>
     {data.grants.filter(g=>g.evidence_id===e.id).map(g=><div className="tw-row" key={g.recipient_id}>
      <span>{connections.find(c=>c.id===g.recipient_id)?.full_name||'Former connection'}: {g.revoked_at?'Revoked':Date.parse(g.expires_at)<=Date.now()?'Expired':'Until '+new Date(g.expires_at).toLocaleDateString()}</span>
      {!g.revoked_at&&<button type="button" onClick={()=>run(()=>trustApi('/evidence/'+e.id+'/share/'+g.recipient_id,{method:'DELETE'}))}>Revoke</button>}
     </div>)}
    </form>}
   </article>)}</div>
  </section>
  </>}
  {reviewOnly&&data.reviewer&&<section className="tw-section"><h2>Evidence review queue</h2>
   <p className="tw-muted">Review only the stated claim. Record the source, checks and limitations; do not infer whole-profile authenticity.</p>
   {!queue.length&&<p>No pending evidence.</p>}
   {queue.map(e=><article key={e.id} className="tw-item"><h3>{e.title}</h3><p>{e.claim}</p>
    <div className="tw-actions"><button onClick={()=>run(()=>downloadEvidence(e.id),false)}><Download size={16}/> Download evidence</button><button onClick={()=>{setReviewId(e.id);setNote('');}}>Review claim</button></div>
    {reviewId===e.id&&<form onSubmit={event=>{event.preventDefault();run(()=>trustApi('/evidence/'+e.id+'/review',{method:'POST',body:{status,note}}));}}>
     <label>Decision<select value={status} onChange={event=>setStatus(event.target.value)}><option value="supported">Evidence supports the stated claim</option><option value="needs_changes">Needs more evidence</option><option value="rejected">Evidence does not support the claim</option></select></label>
     <label>Checks, source and limitations<textarea required minLength={20} maxLength={1000} value={note} onChange={event=>setNote(event.target.value)}/></label>
     <button className="tw-primary">Save review</button>
    </form>}
   </article>)}
  </section>}
 </div>;
}
