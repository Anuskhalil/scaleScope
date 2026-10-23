const {hashStatement}=require('./passportContext');
const {z}=require('zod');
const schema=z.object({requestId:z.string().uuid(),kind:z.enum(['professional','education','startup','firm','traction','investment_history']),statement:z.string().trim().min(20).max(1000),evidenceIds:z.array(z.string().uuid()).min(1).max(10),consent:z.literal(true)}).strict();
function createPassportSubmission(db) {
 return async(actor,input)=>{
  const parsed=schema.safeParse(input);
  if(!parsed.success || new Set(input.evidenceIds).size!==input.evidenceIds.length) throw Object.assign(new Error('Provide consent, claim details and unique private evidence IDs'),{status:400});
  const v=parsed.data;
  const evidence=await db.from('trust_evidence').select('id,claim').in('id',v.evidenceIds).eq('owner_id',actor).eq('passport_private',true).is('deleted_at',null);
  if(evidence.error) throw Object.assign(new Error('Evidence lookup unavailable'),{status:503});
  if(evidence.data?.length!==v.evidenceIds.length || !evidence.data.some(e=>e.claim?.trim()===v.statement)) throw Object.assign(new Error('Statement must match the claim text of your current private evidence'),{status:400});
  const hash=hashStatement(v.kind,v.statement);
  const {data,error}=await db.rpc('submit_passport_claim',{p_user:actor,p_request:v.requestId,p_kind:v.kind,p_hash:hash,p_evidence:v.evidenceIds,p_consent:true});
  if(error) {
   const status=error.code==='22023'?400:error.code==='42501'?403:['23505','P0001','40001','40P01'].includes(error.code)?409:503;
   throw Object.assign(new Error(status===503?'Claim submission unavailable':'Claim or evidence is invalid or changed. Reload before submitting.'),{status});
  }
  return {id:data.id,version:data.version,status:data.status};
 };
}
module.exports={createPassportSubmission};
