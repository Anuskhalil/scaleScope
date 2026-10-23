const {z}=require('zod');
const fail=(message,status)=>Object.assign(new Error(message),{status});
function createPassportWithdrawal(db){
 return async(actor,id,input)=>{
  if(!z.string().uuid().safeParse(id).success||!z.object({confirm:z.literal(true)}).strict().safeParse(input).success)throw fail('Confirm evidence withdrawal',400);
  const found=await db.from('trust_evidence').select('id,owner_id,passport_private,deleted_at').eq('id',id).maybeSingle();
  if(found.error)throw found.error;
  if(!found.data||found.data.owner_id!==actor||!found.data.passport_private)throw fail('Evidence unavailable',404);
  if(found.data.deleted_at)return {id,status:'withdrawn'};
  // Database tombstone trigger invalidates linked claims in this same update.
  const result=await db.from('trust_evidence').update({deleted_at:'now'}).eq('id',id).eq('owner_id',actor).eq('passport_private',true).is('deleted_at',null).select('id').maybeSingle();
  if(result.error)throw result.error;
  if(!result.data)throw fail('Evidence changed. Refresh before retrying.',409);
  return {id,status:'withdrawn'};
 };
}
module.exports={createPassportWithdrawal};

