const {z}=require('zod');
const {createPassportContext}=require('./passportContext');
const inputSchema=z.object({
 version:z.number().int().positive(),
 action:z.enum(['in_review','supported','needs_changes','rejected']),
 reason:z.string().trim().min(10).max(700).optional(),
}).strict();
const idSchema=z.string().uuid();
const failure=(message,status)=>Object.assign(new Error(message),{status});
function createPassportReview(db,isAdmin,clock=()=>new Date(),getContext=createPassportContext(db,isAdmin)) {
 return async function decide(actor,claimId,input) {
  if(!idSchema.safeParse(claimId).success || !inputSchema.safeParse(input).success) throw failure('Provide a valid claim, version and action',400);
  const metadataEnabled=process.env.PASSPORT_REVIEW_METADATA_ENABLED==='true';
  if(input.reason&&!metadataEnabled)throw failure('Review feedback is not enabled yet',503);
  if(input.action==='in_review'&&input.reason)throw failure('Feedback belongs to a final review decision',400);
  if(metadataEnabled&&['needs_changes','rejected'].includes(input.action)&&!input.reason)throw failure('Explain the required changes or rejection in 10 to 700 characters',400);
  if(!await isAdmin(actor)) throw failure('Reviewer access required',403);
  const account=await db.from('profiles').select('id').eq('id',actor).is('deleted_at',null).maybeSingle();
  if(account.error) throw account.error;
  if(!account.data){const identity=await db.auth.admin.getUserById(actor);if(identity.error||identity.data?.user?.app_metadata?.reviewer_only!==true)throw failure('Active reviewer required',403);}
  const found=await db.from('profile_verification_checks').select('id,user_id,claim_version,passport_state,passport_claim')
   .eq('id',claimId).eq('passport_claim',true).maybeSingle();
  if(found.error) throw found.error;
  const row=found.data;
  if(!row) throw failure('Claim not found',404);
  if(row.user_id===actor) throw failure('Self-review is not permitted',403);
  const expected=input.action==='in_review'?'submitted':'in_review';
  if(row.claim_version!==input.version || row.passport_state!==expected) throw failure('Claim changed. Reload before reviewing.',409);
  await getContext(actor,claimId);
  const patch={passport_state:input.action};
  if(metadataEnabled&&input.action!=='in_review')patch.decision_reason=input.reason?.trim()||null;
  if(input.action!=='in_review') {
   const now=clock();
   // PostgreSQL resolves this timestamp literal using its own transaction clock.
   // A workstation clock slightly ahead must not create a future decision time.
   Object.assign(patch,{decision_actor:actor,decided_at:'now',source_kind:'manual_evidence',
    expires_at:input.action==='supported'?new Date(now.getTime()+30*86400000).toISOString():null});
   if(metadataEnabled){patch.decided_at=null;patch.expires_at=null;}
  }
  // One database UPDATE: lifecycle guards and append-only audit execute in the same transaction.
  const changed=await db.from('profile_verification_checks').update(patch).eq('id',claimId)
   .eq('passport_claim',true).eq('claim_version',input.version).eq('passport_state',expected)
   .select('id,claim_version,passport_state').maybeSingle();
  if(changed.error) {
   if(changed.error.code==='P0001' && changed.error.message==='Invalid decision timestamp') throw failure('Database rejected the decision timestamp. Check server clock configuration.',409);
   if(['P0001','23514','40001','40P01'].includes(changed.error.code)) throw failure('Claim or evidence changed, or transition is not allowed. Reload and review again.',409);
   throw changed.error;
  }
  if(!changed.data) throw failure('Claim changed. Reload before reviewing.',409);
  return {id:changed.data.id,version:changed.data.claim_version,status:changed.data.passport_state};
 };
}
module.exports={createPassportReview};
