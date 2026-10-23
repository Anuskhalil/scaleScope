const crypto = require('crypto');
const { z } = require('zod');
const evidenceInput = z.object({
 category: z.enum(['identity','education','experience','product','traction','investment_history']),
 title: z.string().trim().min(1).max(120),
 claim: z.string().trim().min(10).max(1000),
}).strict();
const grantInput = z.object({ recipientId: z.string().uuid(), days: z.number().int().min(1).max(30) }).strict();
const reviewInput = z.object({ status: z.enum(['supported','needs_changes','rejected']), note: z.string().trim().min(20).max(1000) }).strict();
const followupInput = z.object({
 outcome: z.enum(['attended','no_show','reschedule','not_held']),
 notes: z.string().trim().max(2000).default(''),
 next_action: z.string().trim().max(300).default(''),
 due_at: z.string().datetime().nullable().default(null),
 completed: z.boolean().default(false),
}).strict().refine(v => !v.due_at || !!v.next_action, {message:'A due date requires a next action'});
function inspectFile(buffer, mime) {
 if (!Buffer.isBuffer(buffer) || !buffer.length || buffer.length>5242880) throw Object.assign(new Error('Upload a file up to 5 MB'),{status:400});
 const signatures = {
  'application/pdf': buffer.subarray(0,5).toString()==='%PDF-',
  'image/png': buffer.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])),
  'image/jpeg': buffer[0]===255 && buffer[1]===216 && buffer[2]===255,
 };
 if(!signatures[mime]) throw Object.assign(new Error('File format does not match PDF, PNG or JPEG'),{status:400});
 return {sha256:crypto.createHash('sha256').update(buffer).digest('hex'),byte_size:buffer.length,mime_type:mime,extension:({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'})[mime]};
}
function mayRead(actor, evidence, grant, reviewer=false, now=Date.now()) {
 if(evidence.deleted_at) return false;
 if(evidence.passport_private) return evidence.owner_id===actor || reviewer;
 return evidence.owner_id===actor || reviewer || !!(grant && grant.evidence_id===evidence.id && grant.recipient_id===actor && !grant.revoked_at && Date.parse(grant.expires_at)>now);
}
module.exports={evidenceInput,grantInput,reviewInput,followupInput,inspectFile,mayRead};
