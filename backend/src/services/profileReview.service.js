const db=require('../config/supabase');
const {z}=require('zod');
const {id}=require('./trust.service');
const decision=z.object({revision:z.number().int().positive(),status:z.enum(['approved','changes_requested','rejected']),note:z.string().trim().min(20).max(1500)}).strict();
async function result(q){const {data,error}=await q;if(error)throw error;return data;}
async function own(userId) {
 const review=await result(db.from('profile_reviews').select('user_id,revision,status,decision_note,ai_status,ai_report,reviewed_at,updated_at').eq('user_id',userId).maybeSingle()) || {status:'pending',ai_status:'queued'};
 const access=await db.rpc('can_use_profile_interactions',{p_user:userId});
 // Deploy-compatible fallback: absent migration never opens pending accounts.
 if(access.error && !['PGRST202','42883'].includes(access.error.code))throw access.error;
 return {...review,interactions_allowed:access.error?review.status==='approved':access.data===true};
}
async function assertApproved(userId){
 const r=await own(userId);
 if(!r.interactions_allowed)throw Object.assign(new Error('Your profile is under review. You can browse suggestions. Profile viewing, connection requests and messaging unlock after approval.'),{status:403});
}
async function detail(userId) {
 id(userId);
 const before=await own(userId);
 const profile=await result(db.from('profiles').select('*').eq('id',userId).is('deleted_at',null).maybeSingle());
 if(!profile||!['investor','early-stage-founder'].includes(profile.user_type))throw Object.assign(new Error('Profile unavailable'),{status:404});
 const role=await result(db.from(profile.user_type==='investor'?'investor_profiles':'founder_profiles').select('*').eq('user_id',userId).maybeSingle());
 const review=await own(userId);
 const evidence=await result(db.from('trust_evidence').select('id,title,claim,category,review_status,review_note,created_at').eq('owner_id',userId));
 const reports=evidence.length?await result(db.from('evidence_ai_reviews').select('evidence_id,ai_status,ai_report').in('evidence_id',evidence.map(e=>e.id))):[];
 const after=await own(userId);
 if(before.revision!==after.revision)throw Object.assign(new Error('Profile changed while loading. Please reload.'),{status:409});
 return {profile,role,review,evidence:evidence.map(e=>({...e,analysis:reports.find(r=>r.evidence_id===e.id)||null}))};
}
async function queue() {
 const reviews=await result(db.from('profile_reviews').select('*').eq('status','pending').order('updated_at').limit(100));
 const people=reviews.length?await result(db.from('profiles').select('id,full_name,user_type').in('id',reviews.map(r=>r.user_id)).is('deleted_at',null)):[];
 return reviews.filter(r=>people.some(p=>p.id===r.user_id)).map(r=>({...r,profile:people.find(p=>p.id===r.user_id)}));
}
async function decide(actor,userId,input){
 id(userId);const v=decision.safeParse(input);
 if(!v.success)throw Object.assign(new Error('Provide a decision, current revision and a reason of 20-1500 characters'),{status:400});
 if(actor===userId)throw Object.assign(new Error('An administrator cannot approve their own profile'),{status:403});
 const current=await detail(userId);
 if(v.data.status==='approved'&&!current.role)throw Object.assign(new Error('A role profile must be saved before approval'),{status:400});
 // No AI output is ever used as an authorization decision.
 const changed=await result(db.rpc('decide_profile_review',{p_user:userId,p_revision:v.data.revision,p_admin:actor,p_status:v.data.status,p_note:v.data.note}));
 if(!changed)throw Object.assign(new Error('Profile changed or was already reviewed. Reload before deciding.'),{status:409});
 return {success:true};
}
module.exports={own,assertApproved,detail,queue,decide,result};
