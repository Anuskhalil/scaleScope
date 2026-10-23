const test=require('node:test');
const assert=require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_SERVICE_KEY='test-key-not-real';
const rules=require('../src/services/trustRules');
const {createTrustService}=require('../src/services/trust.service');
const actor='00000000-0000-4000-8000-000000000001',other='00000000-0000-4000-8000-000000000002',eid='00000000-0000-4000-8000-000000000003';
function mock(tables={}) {
 const calls=[];
 const db={calls,from(table){
  const q={table,filters:[],op:'read'};
  for(const method of ['select','eq','neq','is','gt','in','or','order','limit','maybeSingle','single','update','insert','upsert','delete'])
   q[method]=(...args)=>{if(['update','insert','upsert','delete'].includes(method))q.op=method;q.filters.push([method,...args]);return q;};
  q.then=(resolve,reject)=>{calls.push(q);const value=typeof tables[table]==='function'?tables[table](q):tables[table];return Promise.resolve(value||{data:[],error:null}).then(resolve,reject);};
  return q;
 },storage:{from(){return {download:async()=>{calls.push({download:true});return {data:{arrayBuffer:async()=>Buffer.from('test')},error:null};}};}},rpc:async(name,payload)=>{calls.push({name,payload});return {data:null,error:null};}};
 return db;
}
test('file signature, size and hash checks do not claim factual verification',()=>{
 const f=rules.inspectFile(Buffer.from('%PDF-1.7 test'),'application/pdf');
 assert.equal(f.sha256.length,64);assert.equal(f.extension,'pdf');assert.equal(f.review_status,undefined);
 assert.throws(()=>rules.inspectFile(Buffer.from('<script>'),'application/pdf'));
 assert.throws(()=>rules.inspectFile(Buffer.alloc(5242881),'image/png'));
 assert.throws(()=>rules.inspectFile(Buffer.from('abc'),'text/html'));
});
test('metadata rejects forged statuses, invalid grants and invalid follow-up dates',()=>{
 assert.equal(rules.evidenceInput.safeParse({title:'Demo',claim:'A detailed product claim',category:'product',review_status:'supported'}).success,false);
 assert.equal(rules.grantInput.safeParse({recipientId:other,days:31}).success,false);
 assert.equal(rules.followupInput.safeParse({outcome:'attended',due_at:'bad'}).success,false);
 assert.equal(rules.followupInput.safeParse({outcome:'attended',due_at:new Date().toISOString()}).success,false);
});
test('grant access requires correct evidence, recipient, expiry and non-revocation',()=>{
 const e={id:eid,owner_id:actor},grant={evidence_id:eid,recipient_id:other,expires_at:new Date(Date.now()+100000).toISOString()};
 assert.equal(rules.mayRead(other,e,grant),true);
 assert.equal(rules.mayRead(other,e,{...grant,revoked_at:new Date().toISOString()}),false);
 assert.equal(rules.mayRead(other,e,{...grant,expires_at:'2000-01-01'}),false);
 assert.equal(rules.mayRead(other,e,{...grant,evidence_id:actor}),false);
 assert.equal(rules.mayRead(actor,e,null),true);
});
test('unauthorized download never touches storage',async()=>{
 const db=mock({trust_evidence:{data:{id:eid,owner_id:actor,object_path:'private'},error:null},evidence_grants:{data:null,error:null}});
 await assert.rejects(createTrustService(db,()=>[]).read(other,eid),{status:403});
 assert.equal(db.calls.some(c=>c.download),false);
});
test('owner download is allowed without a share grant',async()=>{
 const db=mock({trust_evidence:{data:{id:eid,owner_id:actor,object_path:'private',mime_type:'application/pdf'},error:null}});
 assert.equal((await createTrustService(db,()=>[]).read(actor,eid)).buffer.toString(),'test');
});

test('Passport evidence ignores sharing grants and tombstones deny every reader',()=>{
 const e={id:eid,owner_id:actor,passport_private:true};
 const grant={evidence_id:eid,recipient_id:other,expires_at:new Date(Date.now()+100000).toISOString()};
 assert.equal(rules.mayRead(other,e,grant),false);
 assert.equal(rules.mayRead(actor,e,null),true);
 assert.equal(rules.mayRead(other,e,null,true),true);
 assert.equal(rules.mayRead(actor,{...e,deleted_at:new Date().toISOString()},null),false);
 assert.equal(rules.mayRead(other,{...e,deleted_at:new Date().toISOString()},null,true),false);
});
test('Passport sharing and deletion fail before touching grants or storage',async()=>{
 const db=mock({trust_evidence:{data:{id:eid,owner_id:actor,passport_private:true},error:null}});
 const service=createTrustService(db,()=>[]);
 await assert.rejects(service.share(actor,eid,{recipientId:other,days:1}),{status:403});
 await assert.rejects(service.remove(actor,eid),{status:409});
 assert.equal(db.calls.some(c=>c.table!=='trust_evidence'||c.op!=='read'),false);
});
test('non-owner cannot share or delete evidence',async()=>{
 const db=mock({trust_evidence:{data:{id:eid,owner_id:actor},error:null}});
 const service=createTrustService(db,()=>[]);
 await assert.rejects(service.share(other,eid,{recipientId:actor,days:1}),{status:404});
 await assert.rejects(service.remove(other,eid),{status:404});
 assert.equal(db.calls.some(c=>c.op!=='read'),false);
});
test('reviewer allowlist and no-self-review are enforced',async()=>{
 const db=mock({trust_evidence:{data:{id:eid,owner_id:actor},error:null}});
 await assert.rejects(createTrustService(db,()=>[]).review(other,eid,{status:'supported',note:'Reviewed original source and claim scope'}),{status:403});
 await assert.rejects(createTrustService(db,()=>[actor]).review(actor,eid,{status:'supported',note:'Reviewed original source and claim scope'}),{status:403});
 await createTrustService(db,()=>[other]).review(other,eid,{status:'supported',note:'Reviewed original source and claim scope'});
 assert.equal(db.calls.find(c=>c.name)?.name,'record_evidence_review');
});
test('non-participant cannot save follow-up; live meeting cannot be marked attended',async()=>{
 let db=mock({meeting_participants:{data:null,error:null}});
 await assert.rejects(createTrustService(db,()=>[]).followup(actor,eid,{outcome:'attended'}),{status:404});
 db=mock({meeting_participants:{data:{meeting_id:eid},error:null},meetings:{data:{status:'live'},error:null}});
 await assert.rejects(createTrustService(db,()=>[]).followup(actor,eid,{outcome:'attended'}),{status:409});
});
test('follow-up writes own identity, never a caller-supplied identity',async()=>{
 const db=mock({meeting_participants:{data:{meeting_id:eid},error:null},meetings:{data:{status:'ended'},error:null}});
 const service=createTrustService(db,()=>[]);
 await assert.rejects(service.followup(actor,eid,{outcome:'attended',user_id:other}),{status:400});
 await service.followup(actor,eid,{outcome:'attended',notes:'Private notes'});
 const write=db.calls.find(c=>c.table==='meeting_followups').filters.find(f=>f[0]==='upsert')[1];
 assert.equal(write.user_id,actor);assert.equal(write.notes,'Private notes');
});
test('sharing requires an accepted connection and active target account',async()=>{
 const base={trust_evidence:{data:{id:eid,owner_id:actor},error:null}};
 let db=mock({...base,connections:{data:[],error:null}});
 await assert.rejects(createTrustService(db,()=>[]).share(actor,eid,{recipientId:other,days:7}),{status:403});
 db=mock({...base,connections:{data:[{user_1:actor,user_2:other}],error:null},profiles:{data:{id:other,user_type:'investor'},error:null}});
 await createTrustService(db,()=>[]).share(actor,eid,{recipientId:other,days:7});
 const row=db.calls.find(c=>c.table==='evidence_grants').filters.find(f=>f[0]==='upsert')[1];
 assert.equal(row.evidence_id,eid);assert.equal(row.recipient_id,other);assert.equal(row.revoked_at,null);
 assert(Date.parse(row.expires_at)>Date.now());
});
test('revocation checks ownership and updates only the chosen recipient',async()=>{
 const db=mock({trust_evidence:{data:{id:eid,owner_id:actor},error:null}});
 await createTrustService(db,()=>[]).revoke(actor,eid,other);
 const q=db.calls.find(c=>c.table==='evidence_grants');
 assert(q.filters.some(f=>f[0]==='eq'&&f[1]==='evidence_id'&&f[2]===eid));
 assert(q.filters.some(f=>f[0]==='eq'&&f[1]==='recipient_id'&&f[2]===other));
});
test('retired or deleted accounts cannot access the workspace',async()=>{
 const db=mock({profiles:{data:null,error:null}});
 await assert.rejects(createTrustService(db,()=>[]).account(actor),{status:403});
 assert(db.calls[0].filters.some(f=>f[0]==='is'&&f[1]==='deleted_at'&&f[2]===null));
});

test('legacy evidence lists exclude tombstones and shared Passport evidence',async()=>{
 const db=mock({trust_evidence:{data:[],error:null},evidence_grants:{data:[{evidence_id:eid,expires_at:'2099-01-01'}],error:null}});
 await createTrustService(db,()=>[]).list(actor);
 const reads=db.calls.filter(c=>c.table==='trust_evidence');
 assert.equal(reads.length,2);
 for(const q of reads) assert(q.filters.some(f=>f[0]==='is'&&f[1]==='deleted_at'&&f[2]===null));
 assert(reads[1].filters.some(f=>f[0]==='eq'&&f[1]==='passport_private'&&f[2]===false));
});

test('legacy reviewer queue excludes private claims and cannot decide them',async()=>{
 const db=mock({trust_evidence:q=>({data:q.filters.some(f=>f[0]==='maybeSingle')?{id:eid,owner_id:actor,passport_private:true}:[],error:null})});
 const service=createTrustService(db,()=>[other]);
 await service.reviewQueue(other);
 assert(db.calls[0].filters.some(f=>f[0]==='eq'&&f[1]==='passport_private'&&f[2]===false));
 assert(db.calls[0].filters.some(f=>f[0]==='is'&&f[1]==='deleted_at'&&f[2]===null));
 await assert.rejects(service.review(other,eid,{status:'supported',note:'Synthetic reviewer decision must not be applied'}),{status:409});
 assert.equal(db.calls.some(c=>c.name==='record_evidence_review'),false);
});
