const crypto = require('crypto');
const supabase = require('../config/supabase');
const rules = require('./trustRules');
const BUCKET = 'trust-evidence';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const fail = (message,status=400) => Object.assign(new Error(message),{status});
function id(value) { if(!UUID.test(String(value))) throw fail('Invalid ID'); return value; }
function parse(schema,input) { const r=schema.safeParse(input); if(!r.success)throw fail(r.error.issues[0].message); return r.data; }
async function result(query) { const {data,error}=await query; if(error)throw error; return data; }
function createTrustService(db=supabase, reviewerIds=null, matching=require('./matching.service')) {
 const reviewer = async actor => reviewerIds ? reviewerIds().includes(actor) : require('./adminAccess').isAdminId(actor);
 async function account(actor) {
  const p=await result(db.from('profiles').select('id,user_type').eq('id',actor).is('deleted_at',null).maybeSingle());
  if(!p || !['early-stage-founder','investor'].includes(p.user_type))throw fail('Active founder or investor required',403);
  return p;
 }
 async function evidence(eid) {
  const row=await result(db.from('trust_evidence').select('*').eq('id',id(eid)).maybeSingle());
  if(!row || row.deleted_at)throw fail('Evidence not found',404); return row;
 }
 async function owned(actor,eid) { const e=await evidence(eid); if(e.owner_id!==actor)throw fail('Evidence not found',404); return e; }
 async function connected(actor,target) {
  id(target); if(actor===target)throw fail('Choose another connected user');
  const rows=await result(db.from('connections').select('user_1,user_2').or('user_1.eq.'+actor+',user_2.eq.'+actor));
  if(!(rows||[]).some(r=>r.user_1===target||r.user_2===target))throw fail('Connect before sharing',403);
  await account(target);
 }
 async function member(actor,meetingId) {
  const row=await result(db.from('meeting_participants').select('meeting_id').eq('meeting_id',id(meetingId)).eq('user_id',actor).maybeSingle());
  if(!row)throw fail('Meeting not found',404);
 }
 async function upload(actor,input,buffer,mime,passportPrivate=false) {
  const p=await account(actor),meta=parse(rules.evidenceInput,input),file=rules.inspectFile(buffer,mime);
  const count=await db.from('trust_evidence').select('id',{count:'exact',head:true}).eq('owner_id',actor);
  if(count.error)throw count.error;
  if(count.count>=50)throw fail('Evidence storage limit reached. Contact support for a retention review. Withdrawing evidence does not remove retained files or free storage.',409);
  const eid=crypto.randomUUID(),path=(p.user_type==='investor'?'investors':'founders')+'/'+actor+'/'+meta.category+'/'+eid+'.'+file.extension;
  await result(db.storage.from(BUCKET).upload(path,buffer,{contentType:mime,upsert:false}));
  try {
   return await result(db.from('trust_evidence').insert({id:eid,owner_id:actor,...meta,object_path:path,sha256:file.sha256,byte_size:file.byte_size,mime_type:mime,...(passportPrivate?{passport_private:true}:{})}).select('id,title,category,review_status,technical_status').single());
  } catch(e) {
   const cleanup=await db.storage.from(BUCKET).remove([path]);
   if(cleanup.error)throw fail('Upload could not be saved and file cleanup needs support review. Do not repeat the upload yet.',503);
   if(e.code==='P0001'&&e.message==='Evidence retained-file quota exceeded')throw fail('Evidence storage limit reached. Contact support for a retention review.',409);
   throw e;
  }
 }
 async function list(actor) {
  const own=await result(db.from('trust_evidence').select('*').eq('owner_id',actor).is('deleted_at',null).order('created_at',{ascending:false}).limit(100));
  const incoming=await result(db.from('evidence_grants').select('evidence_id,expires_at').eq('recipient_id',actor).is('revoked_at',null).gt('expires_at',new Date().toISOString()).limit(100));
  const shared=incoming.length?await result(db.from('trust_evidence').select('id,owner_id,title,claim,category,review_status,review_note,technical_status,created_at').in('id',incoming.map(g=>g.evidence_id)).eq('passport_private',false).is('deleted_at',null)):[];
  const grants=own.length?await result(db.from('evidence_grants').select('*').in('evidence_id',own.map(e=>e.id))):[];
  const ids=[...own,...shared].map(e=>e.id);
  const analysis=ids.length?await result(db.from('evidence_ai_reviews').select('evidence_id,ai_status,ai_report').in('evidence_id',ids)):[];
  return {own:own.map(({object_path,sha256,...e})=>({...e,analysis:analysis.find(a=>a.evidence_id===e.id)})),shared:shared.map(e=>({...e,analysis:analysis.find(a=>a.evidence_id===e.id),expires_at:incoming.find(g=>g.evidence_id===e.id).expires_at})),grants,reviewer:await reviewer(actor)};
 }
 async function read(actor,eid) {
  const e=await evidence(eid);
  const admin=await reviewer(actor);
  const grant=e.owner_id===actor||admin?null:await result(db.from('evidence_grants').select('*').eq('evidence_id',e.id).eq('recipient_id',actor).maybeSingle());
  if(!rules.mayRead(actor,e,grant,admin))throw fail('Document access expired or unavailable',403);
  const blob=await result(db.storage.from(BUCKET).download(e.object_path));
  return {buffer:Buffer.from(await blob.arrayBuffer()),mime:e.mime_type};
 }
 async function share(actor,eid,input) {
  const e=await owned(actor,eid);
  if(e.passport_private)throw fail('Passport evidence cannot be shared',403);
  const v=parse(rules.grantInput,input); await connected(actor,v.recipientId);
  return result(db.from('evidence_grants').upsert({evidence_id:e.id,recipient_id:v.recipientId,expires_at:new Date(Date.now()+v.days*86400000).toISOString(),revoked_at:null},{onConflict:'evidence_id,recipient_id'}));
 }
 async function revoke(actor,eid,target) {
  await owned(actor,eid); id(target);
  return result(db.from('evidence_grants').update({revoked_at:new Date().toISOString()}).eq('evidence_id',eid).eq('recipient_id',target));
 }
 async function remove(actor,eid) {
  const e=await owned(actor,eid);
  if(e.passport_private)throw fail('Passport evidence requires the protected retention workflow',409);
  // Revoke first: a storage failure must not leave recipient access open.
  await result(db.from('evidence_grants').update({revoked_at:new Date().toISOString()}).eq('evidence_id',eid));
  await result(db.storage.from(BUCKET).remove([e.object_path]));
  await result(db.from('trust_evidence').delete().eq('id',eid).eq('owner_id',actor));
 }
 async function reviewQueue(actor) {
  if(!await reviewer(actor))throw fail('Reviewer access required',403);
  return result(db.from('trust_evidence').select('id,owner_id,title,claim,category,review_status,created_at').eq('review_status','pending').eq('passport_private',false).is('deleted_at',null).neq('owner_id',actor).order('created_at').limit(50));
 }
 async function review(actor,eid,input) {
  if(!await reviewer(actor))throw fail('Reviewer access required',403);
  const e=await evidence(eid); if(e.owner_id===actor)throw fail('Self-review is not permitted',403);
  if(e.passport_private)throw fail('Passport evidence requires the claim review workflow',409);
  const v=parse(rules.reviewInput,input);
  return result(db.rpc('record_evidence_review',{p_evidence:e.id,p_reviewer:actor,p_status:v.status,p_note:v.note}));
 }
 async function connections(actor) {
  const rows=await result(db.from('connections').select('user_1,user_2').or('user_1.eq.'+actor+',user_2.eq.'+actor).limit(500));
  const ids=[...new Set(rows.map(r=>r.user_1===actor?r.user_2:r.user_1))];
  return ids.length?result(db.from('profiles').select('id,full_name,user_type').in('id',ids).is('deleted_at',null).in('user_type',['early-stage-founder','investor'])):[];
 }
 async function inbox(actor) {
  const rows=await result(db.from('connection_requests').select('id,sender_id,type,message,created_at').eq('receiver_id',actor).eq('status','pending').order('created_at',{ascending:false}).limit(100));
  const ids=[...new Set(rows.map(r=>r.sender_id))];
  if(!ids.length)return [];
  const people=await result(db.from('profiles').select('id,full_name,user_type').in('id',ids).is('deleted_at',null));
  const fits=await matching.evaluate(actor,ids);
  return rows.filter(r=>people.some(p=>p.id===r.sender_id)).map(r=>({...r,person:people.find(p=>p.id===r.sender_id),fit:fits.find(f=>f.user_id===r.sender_id)||null}))
   .sort((a,b)=>(b.fit?.matchScore||0)-(a.fit?.matchScore||0));
 }
 async function meetings(actor) {
  const participants=await result(db.from('meeting_participants').select('meeting_id').eq('user_id',actor).order('created_at',{ascending:false}).limit(100));
  const rows=participants.length?await result(db.from('meetings').select('id,host_id,title,status,scheduled_at,started_at,ended_at').in('id',participants.map(p=>p.meeting_id)).order('created_at',{ascending:false})):[];
  const followups=await result(db.from('meeting_followups').select('*').eq('user_id',actor).order('due_at',{ascending:true,nullsFirst:false}).limit(100));
  return {meetings:rows,followups};
 }
 async function followup(actor,mid,input) {
  await member(actor,mid); const v=parse(rules.followupInput,input);
  const meeting=await result(db.from('meetings').select('status').eq('id',mid).single());
  if(!['ended','cancelled'].includes(meeting.status))throw fail('Follow-up is available after the meeting ends',409);
  return result(db.from('meeting_followups').upsert({meeting_id:mid,user_id:actor,...v,updated_at:new Date().toISOString()},{onConflict:'meeting_id,user_id'}));
 }
 return {account,upload,list,read,share,revoke,remove,reviewQueue,review,connections,inbox,meetings,followup};
}
module.exports={createTrustService,id,...createTrustService()};
