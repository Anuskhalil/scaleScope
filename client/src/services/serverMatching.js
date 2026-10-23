import { backendApi } from '../lib/backendApi';
export async function attachServerMatches(items = []) {
 const ids=[...new Set(items.map(x=>x.user_id || x.profile_id).filter(Boolean))];
 const matches=[];
 for(let offset=0;offset<ids.length;offset+=100) matches.push(...await backendApi.evaluateMatches(ids.slice(offset,offset+100)));
 const byId=new Map(matches.map(m=>[m.user_id,m]));
 return items.filter(item=>byId.has(item.user_id||item.profile_id)).map(item=>{
  const fit=byId.get(item.user_id||item.profile_id);
  return {...item,serverMatch:fit,matchScore:fit.matchScore,smartScore:fit.matchScore,_score:fit.matchScore,
   reasons:[...fit.mismatches,...fit.unknowns,...fit.reasons],_matchReason:[...fit.mismatches,...fit.unknowns,...fit.reasons].slice(0,2).join('. ')};
 }).sort((a,b)=>b.matchScore-a.matchScore);
}
