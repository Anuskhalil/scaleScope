const crypto=require('node:crypto');
const {z}=require('zod');
const hashStatement=(kind,statement)=>crypto.createHash('sha256').update(JSON.stringify({kind,statement:statement.trim()})).digest('hex');
const fail=(message,status)=>Object.assign(new Error(message),{status});
function createPassportContext(db,isAdmin) {
 return async(actor,id)=>{
  if(!z.string().uuid().safeParse(id).success) throw fail('Invalid claim ID',400);
  const feedback=process.env.PASSPORT_REVIEW_METADATA_ENABLED==='true';
  const found=await db.from('profile_verification_checks').select('id,user_id,claim_kind,claim_version,claim_value_hash,passport_state'+(feedback?',decision_reason,decided_at,expires_at':'')).eq('id',id).eq('passport_claim',true).maybeSingle();
  if(found.error) throw found.error;
  const c=found.data;
  if(!c || (c.user_id!==actor && !await isAdmin(actor))) throw fail('Claim unavailable',404);
  const links=await db.from('profile_verification_evidence').select('evidence_id').eq('check_id',id);
  if(links.error) throw links.error;
  if(!links.data?.length) throw fail('Claim evidence context unavailable',409);
  const result=await db.from('trust_evidence').select('id,title,claim,category,mime_type,byte_size,owner_id,passport_private,deleted_at').in('id',links.data.map(l=>l.evidence_id));
  if(result.error) throw result.error;
  const rows=result.data||[];
  if(rows.length!==links.data.length || rows.some(e=>e.owner_id!==c.user_id||!e.passport_private||e.deleted_at)) throw fail('Claim evidence context is no longer current',409);
  const matching=rows.filter(e=>typeof e.claim==='string' && hashStatement(c.claim_kind,e.claim)===c.claim_value_hash);
  if(!matching.length) throw fail('Claim statement cannot be reconstructed from immutable evidence. Resubmission required.',409);
  return {id:c.id,kind:c.claim_kind,version:c.claim_version,status:c.passport_state,...(feedback?{reason:c.decision_reason||null,reviewedAt:c.decided_at,expiresAt:c.expires_at}:{}),statement:matching[0].claim.trim(),evidence:rows.map(e=>({id:e.id,title:e.title,category:e.category,mimeType:e.mime_type,byteSize:e.byte_size}))};
 };
}
module.exports={createPassportContext,hashStatement};
