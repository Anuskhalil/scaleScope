import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Save, CalendarClock } from 'lucide-react';
import { trustApi } from '../services/trustApi';
import { backendApi } from '../lib/backendApi';
import { useAuth } from '../auth/AuthContext';
function FollowupForm({meeting,saved,run}) {
 const [outcome,setOutcome]=useState(saved?.outcome||'attended'),[notes,setNotes]=useState(saved?.notes||''),[action,setAction]=useState(saved?.next_action||'');
 const localDate=saved?.due_at?new Date(Date.parse(saved.due_at)-new Date(saved.due_at).getTimezoneOffset()*60000).toISOString().slice(0,16):'';
 const [due,setDue]=useState(localDate),[completed,setCompleted]=useState(saved?.completed||false);
 return <form onSubmit={e=>{e.preventDefault();run(()=>trustApi('/meetings/'+meeting.id+'/followup',{method:'PUT',body:{outcome,notes,next_action:action,due_at:due?new Date(due).toISOString():null,completed}}));}}>
  <label>Your meeting outcome<select value={outcome} onChange={e=>setOutcome(e.target.value)}>{['attended','no_show','reschedule','not_held'].map(x=><option key={x} value={x}>{x.replaceAll('_',' ')}</option>)}</select></label>
  <label>Private notes<textarea maxLength={2000} value={notes} onChange={e=>setNotes(e.target.value)}/></label>
  <div className="tw-grid"><label>Next action<input maxLength={300} required={!!due} value={action} onChange={e=>setAction(e.target.value)}/></label>
  <label>Follow up on<input type="datetime-local" value={due} onChange={e=>setDue(e.target.value)}/></label></div>
  <label className="tw-check"><input type="checkbox" checked={completed} onChange={e=>setCompleted(e.target.checked)}/> Action completed</label>
  <button className="tw-primary"><Save size={16}/> Save follow-up</button>
 </form>;
}
export default function MeetingFollowups({data,run}) {
 const {user}=useAuth();
 const due=data.followups.filter(f=>!f.completed&&f.due_at&&Date.parse(f.due_at)<=Date.now());
 return <section className="tw-section"><h2><CalendarClock size={18}/> Meeting follow-up</h2>
  <p className="tw-muted">Notes are private to you. Outcomes are self-reported, not confirmed attendance. Reminders appear here; no email is sent.</p>
  {due.length>0&&<div role="status" className="tw-reminder">{due.length} follow-up{due.length===1?'':'s'} due{due.map(f=><p key={f.meeting_id}>{f.next_action}</p>)}</div>}
  {!data.meetings.length&&<p>No meetings yet.</p>}
  {data.meetings.map(m=><article key={m.id} className="tw-item"><div className="tw-row"><h3>{m.title}</h3><span>{m.status}</span></div>
   {['ended','cancelled'].includes(m.status)?<details><summary>Notes and next action</summary><FollowupForm key={m.id+ (data.followups.find(f=>f.meeting_id===m.id)?.updated_at||'')} meeting={m} saved={data.followups.find(f=>f.meeting_id===m.id)} run={run}/></details>:<div className="tw-actions"><Link to={'/meetings/'+m.id}>Open meeting</Link>{m.host_id===user?.id&&<button onClick={()=>{if(window.confirm('Mark this meeting record as finished? Do this after everyone has left the call.'))run(()=>backendApi.endMeeting(m.id));}}>Mark meeting finished</button>}</div>}
  </article>)}
 </section>;
}
