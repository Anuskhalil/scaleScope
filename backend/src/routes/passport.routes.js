const router=require('express').Router();
const {passportWritesEnabled,createPassportWriteGate}=require('../middlewares/passportWrites');
const auth=require('../middlewares/auth.middleware');
const db=require('../config/supabase');
const trust=require('../services/trust.service');
const summary=require('../services/passportSummary').createPassportSummary(db);
const decide=require('../services/passportReview').createPassportReview(db,require('../services/adminAccess').isAdminId);
const submit=require('../services/passportSubmission').createPassportSubmission(db);
const withdraw=require('../services/passportWithdrawal').createPassportWithdrawal(db);
const context=require('../services/passportContext').createPassportContext(db,require('../services/adminAccess').isAdminId);
router.use(auth);
router.use(createPassportWriteGate());
router.use(async(req,res,next)=>{try{const reviewRoute=(req.method==='GET'&&(req.path==='/workspace'||/^\/claims\/[0-9a-f-]+\/context$/i.test(req.path)))||(req.method==='POST'&&/^\/claims\/[0-9a-f-]+\/decision$/i.test(req.path));if(reviewRoute&&require('../services/adminAccess').isReviewAdmin(req.user))return next();await trust.account(req.user.id);next();}catch{res.status(403).json({error:'Active founder or investor required'});}});
router.get('/workspace',async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try {
  const reviewer=await require('../services/adminAccess').isAdminId(req.user.id);
  const evidence=await db.from('trust_evidence').select('id,title,claim,category').eq('owner_id',req.user.id).eq('passport_private',true).is('deleted_at',null).order('created_at',{ascending:false}).limit(50);
  const claims=await db.from('profile_verification_checks').select('id,claim_kind,claim_version,passport_state').eq('user_id',req.user.id).eq('passport_claim',true).order('submitted_at',{ascending:false}).limit(100);
  const queue=reviewer?await db.from('profile_verification_checks').select('id,claim_kind,claim_version,passport_state').eq('passport_claim',true).neq('user_id',req.user.id).in('passport_state',['submitted','in_review']).order('submitted_at').limit(100):{data:[]};
  const history=reviewer?await db.from('profile_verification_checks').select('id,claim_kind,claim_version,passport_state').eq('passport_claim',true).eq('decision_actor',req.user.id).neq('user_id',req.user.id).in('passport_state',['supported','needs_changes','rejected','stale','revoked','expired']).order('decided_at',{ascending:false}).limit(100):{data:[]};
  for(const result of [evidence,claims,queue,history])if(result.error)throw result.error;
  res.json({data:{evidence:evidence.data,claims:claims.data,queue:queue.data,history:history.data,reviewer,reviewFeedbackEnabled:process.env.PASSPORT_REVIEW_METADATA_ENABLED==='true',mutationsEnabled:passportWritesEnabled()}});
 }catch{res.status(503).json({error:'Passport workspace unavailable'});}
});
router.post('/evidence',require('express').raw({type:['application/pdf','image/png','image/jpeg'],limit:'5mb'}),async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try {
  let meta;try{meta=JSON.parse(decodeURIComponent(req.get('x-evidence-metadata')||'{}'));}catch{return res.status(400).json({error:'Invalid evidence metadata'});}
  res.status(201).json({data:await trust.upload(req.user.id,meta,req.body,req.get('content-type')?.split(';')[0],true)});
 }catch(error){res.status(error.status||503).json({error:error.status?error.message:'Private upload unavailable'});}
});
router.get('/claims/:id/context',async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try {res.json({data:await context(req.user.id,req.params.id)});}
 catch(error) {const status=error.status||503;res.status(status).json({error:status<500?error.message:'Claim context unavailable'});}
});
router.post('/evidence/:id/withdraw',async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try{res.json({data:await withdraw(req.user.id,req.params.id,req.body)});}
 catch(error){const status=error.status||503;res.status(status).json({error:status<500?error.message:'Evidence withdrawal unavailable'});}
});
router.post('/claims',async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try {res.status(201).json({data:await submit(req.user.id,req.body)});}
 catch(error) {const status=error.status||503;res.status(status).json({error:status<500?error.message:'Claim submission unavailable'});}
});
// Owner-only foundation endpoint. No arbitrary subject ID and no public badge route.
router.get('/me/summary',async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try {
  await trust.account(req.user.id);
  res.json({data:await summary(req.user.id)});
 } catch(error) {
  res.status(error.status===403?403:503).json({error:error.status===403?'Active founder or investor required':'Trust Passport summary unavailable'});
 }
});
module.exports=router;
router.post('/claims/:id/decision',async(req,res)=>{
 res.set('Cache-Control','private, no-store');
 try {res.json({data:await decide(req.user.id,req.params.id,req.body)});}
 catch(error) {
  const status=error.status||503;
  res.status(status).json({error:status<500?error.message:'Trust Passport review unavailable'});
 }
});
