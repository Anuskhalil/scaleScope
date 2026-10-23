const supabase = require('../config/supabase');
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ACTIVE = ['early-stage-founder', 'investor'];
const fail = (message, status=400) => Object.assign(new Error(message), {status});
function validateIds(ids, actor) {
 if (!Array.isArray(ids) || ids.length > 100 || ids.some(id => typeof id !== 'string' || !UUID.test(id))) throw fail('Provide at most 100 valid candidate IDs');
 return [...new Set(ids)].filter(id=>id!==actor);
}
function createMatchingService(db=supabase) {
 let warned=false;
 async function record(rows) {
  if (!rows.length) return;
  try {
  const {error}=await db.from('matching_events').upsert(rows,{onConflict:'actor_id,target_id,event_type,reference',ignoreDuplicates:true});
  if(error && !warned){warned=true; console.warn('Matching event capture unavailable; apply phase1_matching.sql:',error.code);}
  } catch { if(!warned){warned=true;console.warn('Matching event capture temporarily unavailable');} }
 }
 async function evaluate(actor, candidateIds) {
  const ids=validateIds(candidateIds,actor);
  if(!ids.length)return [];
  const {data:people,error}=await db.from('profiles').select('id,user_type').in('id',[actor,...ids]).is('deleted_at',null);
  if(error)throw error;
  const viewer=people?.find(p=>p.id===actor);
  if(!viewer||!ACTIVE.includes(viewer.user_type))throw fail('Active founder or investor account required',403);
  const validPeople=people.filter(p=>ACTIVE.includes(p.user_type)),allIds=validPeople.map(p=>p.id);
  const [f,i]=await Promise.all([
   db.from('founder_profiles').select('*').in('user_id',allIds),
   db.from('investor_profiles').select('*').in('user_id',allIds)]);
  if(f.error||i.error)throw f.error||i.error;
  const founders=new Map((f.data||[]).map(x=>[x.user_id,x])),investors=new Map((i.data||[]).map(x=>[x.user_id,x]));
  const own=(viewer.user_type==='investor'?investors.get(actor):founders.get(actor)) || {};
  const {investmentMatch,cofounderMatch}=await import('../../../shared/matching.mjs');
  const results=[];
  for(const person of validPeople){
   if(person.id===actor)continue;
   const target=person.user_type==='investor'?investors.get(person.id):founders.get(person.id);
   if(!target||target.is_public!==true||target.is_active!==true)continue;
   let fit;
   if(viewer.user_type==='investor'&&person.user_type==='early-stage-founder')fit=investmentMatch(target,own);
   else if(viewer.user_type==='early-stage-founder'&&person.user_type==='investor')fit=investmentMatch(own,target);
   else if(viewer.user_type==='early-stage-founder'&&person.user_type==='early-stage-founder')fit=cofounderMatch(own,target);
   else continue;
   results.push({user_id:person.id,...fit});
  }
  await record(results.filter(r=>r.status!=='review_pending').map(r=>({actor_id:actor,target_id:r.user_id,event_type:'recommendation_generated',reference:r.version+':'+new Date().toISOString().slice(0,10),payload:{version:r.version,score:r.matchScore,status:r.status,coverage:r.coverage}})));
  return results;
 }
 return {evaluate,record};
}
module.exports={createMatchingService,validateIds,...createMatchingService()};
