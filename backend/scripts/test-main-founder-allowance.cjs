// Explicitly authorized synthetic fixtures in the main project. Never approves profiles.
const crypto = require('node:crypto');
const db = require('../src/config/supabase');
const { createClient } = require('@supabase/supabase-js');
const mode = process.argv[2];
const expected = 'gqkjvxcyetesvqmjkuus.supabase.co';
if (new URL(process.env.SUPABASE_URL).hostname !== expected || !['prepare','send','concurrent','security'].includes(mode)) {
  throw new Error('Use prepare, send, concurrent or security with the explicitly authorized main project only.');
}
const fixtures = [
  { email:'qa-allowance-founder@example.invalid', name:'QA Allowance Founder', role:'early-stage-founder' },
  ...Array.from({length:6}, (_,i)=>({email:`qa-allowance-recipient-${i+1}@example.invalid`,name:`QA Allowance ${i<3?'Investor':'CoFounder'} ${i+1}`,role:i<3?'investor':'early-stage-founder'})),
];
const result = async query => {const {data,error}=await query;if(error)throw error;return data;};
async function main() {
 const accounts=[];
 for(const item of fixtures) {
  let profile=await result(db.from('profiles').select('id,email,full_name,user_type').eq('email',item.email).maybeSingle());
  if(!profile && mode==='prepare') {
   const {data,error}=await db.auth.admin.createUser({email:item.email,password:crypto.randomBytes(40).toString('base64url'),email_confirm:true,
    user_metadata:{full_name:item.name,user_type:item.role},app_metadata:{qa_fixture:'founder-allowance-20261020'}});
   if(error)throw error;
   profile={id:data.user.id,email:item.email,full_name:item.name,user_type:item.role};
   await result(db.from('profiles').upsert({...profile,bio:'Synthetic ScaleScope QA account for allowance testing only. Not a real founder or investor.',location:'Karachi, Pakistan'},{onConflict:'id'}));
  }
  if(!profile)throw new Error(`Fixture missing: ${item.name}. Run prepare first.`);
  const {data:identity,error:identityError}=await db.auth.admin.getUserById(profile.id);
  if(identityError)throw identityError;
  if(identity.user.app_metadata?.qa_fixture!=='founder-allowance-20261020' || profile.user_type!==item.role)throw new Error('Fixture ownership marker mismatch; refusing to modify this account.');
  if(mode==='prepare') {
   const table=item.role==='investor'?'investor_profiles':'founder_profiles';
   const saved=await result(db.from(table).select('user_id').eq('user_id',profile.id).maybeSingle());
   if(!saved) {
    const common={user_id:profile.id,is_active:true,is_public:true,onboarding_completed:true,metadata:{qa_fixture:'founder-allowance-20261020',founder_background:'professional',founder_intent:'building',open_to_joining:true}};
    const details=item.role==='investor'?{firm_name:'Synthetic QA Fund - not a real fund',investor_type:'Angel',investment_stage:['Pre-seed'],industries_of_interest:['SaaS'],ticket_size_min:1000,ticket_size_max:10000,geographic_focus:'Pakistan',investment_thesis:'Synthetic QA profile only; no real investment offer.',accepting_pitches:true}:{company_name:'Synthetic QA Startup - not a real business',industry:'SaaS',startup_stage:'MVP Built',problem_statement:'Synthetic startup profile used only to test ScaleScope connection allowances.',target_market:'Synthetic test users only',solution_description:'Controlled QA fixture, not a real startup offering.',founder_skills:['React','Sales','Leadership'],looking_for:['Investor','Co-Founder'],founder_role:'Solo Founder',team_size:1};
    await result(db.from(table).insert({...common,...details}));
   }
  }
  const review=await result(db.from('profile_reviews').select('status').eq('user_id',profile.id).maybeSingle());
  accounts.push({...item,id:profile.id,status:review?.status||'missing'});
 }
 console.table(accounts.map(({name,email,status})=>({name,email,status})));
 if(mode==='prepare') {console.log('Fixtures ready. Approve these profiles manually in /admin; no connection requests sent.');return;}
 if(accounts.some(a=>a.status!=='approved'))throw new Error('Manual profile approval required for all seven fixtures. No requests sent.');
 if(mode==='concurrent') accounts.unshift(accounts.pop());
 const health=await fetch('http://localhost:3001/health').then(r=>r.json());
 if(!health.ok||health.service!=='ScaleScope API'||health.mode==='isolated-staging')throw new Error('Main local backend not confirmed');
 // Generate an internal sign-in link without delivering email; exchange only in memory.
 const {data:link,error:linkError}=await db.auth.admin.generateLink({type:'magiclink',email:accounts[0].email});
 if(linkError)throw linkError;
 const client=createClient(process.env.SUPABASE_URL,process.env.SUPABASE_SERVICE_KEY,{auth:{persistSession:false,autoRefreshToken:false}});
 const {data:login,error:loginError}=await client.auth.verifyOtp({token_hash:link.properties.hashed_token,type:'magiclink'});
 if(loginError)throw loginError;
 if(login.user.id!==accounts[0].id)throw new Error('Synthetic sender mismatch');
 const api=async(path,body)=>{
  const response=await fetch('http://localhost:3001/api/'+path,{method:body?'POST':'GET',headers:{Authorization:`Bearer ${login.session.access_token}`,'Content-Type':'application/json'},body:body?JSON.stringify(body):undefined});
  return {status:response.status,body:await response.json()};
 };
 if(mode==='security') {
  if(login.user.role!=='authenticated')throw new Error('Ordinary authenticated session required');
  // Deliberately invalid/self targets guarantee no valid request even if privileges regress.
  const checks=[
   ['direct allowance RPC',()=>client.rpc('send_connection_with_allowance',{p_sender:accounts[0].id,p_receiver:accounts[0].id,p_type:'cofounder_request',p_message:'QA permission probe',p_limit:5})],
   ['direct subscription RPC',()=>client.rpc('apply_lemon_subscription_snapshot',{p_snapshot:{}})],
   ['direct request insertion',()=>client.from('connection_requests').insert({sender_id:accounts[0].id,receiver_id:accounts[0].id,type:'cofounder_request',status:'pending'})],
   ['direct subscription update',()=>client.from('user_subscriptions').update({plan_code:'free'}).eq('user_id','00000000-0000-4000-8000-000000000000')],
   ['direct usage update',()=>client.from('usage_counters').update({used_count:0}).eq('user_id','00000000-0000-4000-8000-000000000000')],
  ];
  const outcomes=[];
  for(const [name,run] of checks) {
   const {error}=await run();
   if(error?.code!=='42501')throw new Error(`${name}: expected permission denied, received ${error?.code||'success'}`);
   console.log(`PASS: ${name} denied for ordinary account`);outcomes.push({name,result:'DENIED'});
  }
  const plans=await fetch('http://localhost:3001/api/billing/plans?role=early-stage-founder').then(r=>r.json());
  if(!plans.success||plans.data.some(p=>p.checkout_intervals?.length))throw new Error('Expected paid checkout to remain disabled');
  console.log('PASS: paid checkout remains disabled');
  const fs=require('node:fs'),path=require('node:path');const directory=path.resolve(__dirname,'../../audit/billing');fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'main-allowance-security.json'),JSON.stringify({time:new Date().toISOString(),project:expected,result:'PASS',checks:outcomes,checkoutEnabled:false},null,2));
  await client.auth.signOut({scope:'local'});return;
 }
 const before=await api('billing/usage/connection_requests');
 if(before.status!==200||before.body.data.limit.used!==0||before.body.data.limit.limit!==5)throw new Error('Expected unused Free fixture. Stopping without resetting history.');
 if(mode==='concurrent') {
  const send=account=>api('connections/request',{receiverId:account.id,type:account.role==='investor'?'investor_contact':'cofounder_request',message:'Synthetic concurrent allowance test only. Please accept or decline manually.'});
  for(const account of accounts.slice(1,5)) {
   const sent=await send(account);
   if(sent.status!==201)throw new Error(`Concurrency setup request failed: ${sent.status}`);
  }
  const boundary=await api('billing/usage/connection_requests');
  if(boundary.status!==200||boundary.body.data.limit.used!==4)throw new Error('Expected 4/5 before concurrent sends');
  console.log('PASS: separate QA founder reached 4/5 without resetting any history');
  const responses=await Promise.all(accounts.slice(5).map(send));
  if(responses.filter(r=>r.status===201).length!==1||responses.filter(r=>r.status===402).length!==1)throw new Error(`Concurrency boundary failed: ${responses.map(r=>r.status).join(',')}`);
  const after=await api('billing/usage/connection_requests');
  if(after.status!==200||after.body.data.limit.used!==5)throw new Error('Concurrent sends did not preserve exact allowance');
  const rows=await result(db.from('connection_requests').select('id,receiver_id,status').eq('sender_id',accounts[0].id));
  if(rows.length!==5||rows.some(row=>!accounts.slice(1).some(a=>a.id===row.receiver_id)))throw new Error('Unexpected synthetic connection rows');
  console.log('PASS: concurrent sends returned exactly one 201 and one 402');
  console.log('PASS: database contains exactly five synthetic requests and usage remains 5/5');
  const fs=require('node:fs'),path=require('node:path');
  const directory=path.resolve(__dirname,'../../audit/billing');fs.mkdirSync(directory,{recursive:true});
  fs.writeFileSync(path.join(directory,'main-allowance-concurrency.json'),JSON.stringify({time:new Date().toISOString(),project:expected,syntheticOnly:true,sender:accounts[0].email,statuses:responses.map(r=>r.status),usage:after.body.data.limit.used,requestCount:rows.length,result:'PASS',pendingAcceptance:true},null,2));
  await client.auth.signOut({scope:'local'});
  return;
 }
 for(let i=1;i<accounts.length;i++) {
  const sent=await api('connections/request',{receiverId:accounts[i].id,type:accounts[i].role==='investor'?'investor_contact':'cofounder_request',message:'Synthetic QA allowance test only. Please accept or decline manually.'});
  const expectedStatus=i<=5?201:402;
  if(sent.status!==expectedStatus)throw new Error(`Request ${i}: expected ${expectedStatus}, received ${sent.status}: ${sent.body.error||'unexpected result'}`);
  console.log(`PASS: request ${i} ${sent.status===201?'sent to '+accounts[i].name:'blocked at Free limit'}`);
 }
 const repeated=await api('connections/request',{receiverId:accounts[1].id,type:'investor_contact',message:'Synthetic duplicate retry'});
 if(repeated.status!==200||!repeated.body.alreadyPending)throw new Error('Duplicate retry did not preserve the pending request');
 const after=await api('billing/usage/connection_requests');
 if(after.status!==200||after.body.data.limit.used!==5)throw new Error('Expected exactly five consumed requests');
 console.log('PASS: duplicate consumed no additional allowance. Five requests remain pending for manual acceptance.');
 console.log('Concurrency and paid checkout were not exercised by this test.');
 await client.auth.signOut({scope:'local'});
}
main().catch(error=>{console.error('STOP:',error.message);process.exitCode=1;});
