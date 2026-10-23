const db=require('../config/supabase');
const {detail,result}=require('./profileReview.service');
const {analyze}=require('./reviewAI');
const {inspectFile}=require('./trustRules');
async function processJob(kind) {
 const job=await result(db.rpc('claim_review_job',{p_kind:kind}));
 if(!job)return;
 const table=kind==='profile'?'profile_reviews':'evidence_ai_reviews',key=kind==='profile'?'user_id':'evidence_id';
 let update;
 try{
  let report;
  if(kind==='profile'){
   const current=await detail(job.user_id);
   if(current.review.revision!==job.revision)return;
   report=await analyze({profile:current.profile,role:current.role,evidence_manifest:current.evidence.map(e=>({id:e.id,title:e.title,claim:e.claim,category:e.category})),scope:'Saved profile fields only. Evidence files are analyzed in separate jobs.'});
  }else{
   const evidence=await result(db.from('trust_evidence').select('*').eq('id',job.evidence_id).maybeSingle());
   if(!evidence)return;
   const blob=await result(db.storage.from('trust-evidence').download(evidence.object_path));
   const buffer=Buffer.from(await blob.arrayBuffer());
   const check=inspectFile(buffer,evidence.mime_type);
   if(check.sha256!==evidence.sha256)throw new Error('Stored evidence integrity mismatch');
   report=await analyze({claim:evidence.claim,category:evidence.category,title:evidence.title,scope:'Only this uploaded evidence and claim; do not infer whole-profile authenticity.'},{buffer,mime:evidence.mime_type});
  }
  update={ai_status:'complete',ai_report:report,lease_until:null,updated_at:new Date().toISOString()};
 }catch{
  update={ai_status:'failed',ai_report:{summary:'Automatic analysis could not be completed. Human review remains available.',findings:[],limitations:['Analysis unavailable; do not treat this as a failed authenticity check.']},lease_until:null,available_at:new Date(Date.now()+60000).toISOString(),updated_at:new Date().toISOString()};
 }
 let q=db.from(table).update(update).eq(key,job[key]).eq('attempts',job.attempts).eq('lease_until',job.lease_until);
 if(kind==='profile')q=q.eq('revision',job.revision);
 await result(q);
}
function startReviewWorker(){
 if(process.env.PROFILE_REVIEW_AI_ENABLED!=='true'||!process.env.GEMINI_API_KEY)return ()=>{};
 let stopped=false,timer;
 async function tick(){
  try{await processJob('profile');if(!stopped)await processJob('evidence');}
  catch(e){console.warn('Profile review worker unavailable:',e.code||'request_failed');}
  if(!stopped){timer=setTimeout(tick,10000);timer.unref();}
 }
 timer=setTimeout(tick,1000);timer.unref();
 return ()=>{stopped=true;clearTimeout(timer);};
}
module.exports={startReviewWorker,processJob};
