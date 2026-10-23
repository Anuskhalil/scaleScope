export const MATCH_VERSION = 'foundation-1.1';
const norm = v => typeof v === 'string' ? v.trim().toLowerCase().replace(/[-_\u2013\u2014]/g, ' ').replace(/\s+/g, ' ') : '';
const values = v => (Array.isArray(v) ? v : typeof v === 'string' ? v.split(/[,;\n]/) : []).map(norm).filter(Boolean);
const num = v => v === '' || v == null || typeof v === 'boolean' ? null : Number.isFinite(Number(v)) && Number(v) >= 0 ? Number(v) : null;
const product = v => ({mvp:'mvp built','working mvp':'mvp built','just an idea':'idea','idea stage welcome':'idea','live product':'live','getting users':'live','active users':'live','paying customers':'revenue','revenue generating':'revenue'})[norm(v)] || norm(v);
const same = (a,b) => values(a).some(x => values(b).includes(x));
const aliases = (primary, legacy) => values(primary).length ? primary : legacy;
const regions = new Intl.DisplayNames(['en'], {type:'region'});
const countryNames = new Set();
for(let a=65;a<=90;a++)for(let b=65;b<=90;b++){
 const code=String.fromCharCode(a,b),name=regions.of(code);
 if(name && name!==code)countryNames.add(norm(name));
}
const country = v => ({pk:'pakistan',us:'united states',usa:'united states',uk:'united kingdom',uae:'united arab emirates'})[norm(v)] || norm(v);
export function cofounderConsent(viewer = {}, candidate = {}) {
 const joining = x => x.metadata?.open_to_joining === true || x.metadata?.founder_intent === 'joining';
 const recruiting = x => (x.looking_for || []).includes('Co-Founder');
 return (recruiting(viewer) && joining(candidate)) || (joining(viewer) && recruiting(candidate));
}
function finish(criteria, eligibility, extra = []) {
 const active=criteria.filter(c=>c.mode!=='none'),total=active.reduce((s,c)=>s+c.weight,0);
 const known=active.filter(c=>c.state!=='unknown'),hard=active.filter(c=>c.mode==='must'&&c.state==='mismatch');
 const pending=active.filter(c=>c.mode==='must'&&c.state==='unknown');
 const score=total?Math.round(active.reduce((s,c)=>s+(c.state==='match'?c.weight:0),0)/total*100):0;
 return {version:MATCH_VERSION,matchScore:eligibility&&!hard.length?score:0,eligible:eligibility&&!hard.length,
 status:!eligibility||hard.length?'not_aligned':pending.length||!known.length?'needs_clarification':'potential_fit',
 coverage:total?Math.round(known.reduce((s,c)=>s+c.weight,0)/total*100):0,
 criteria:active.map(({weight,...c})=>c),
 reasons:active.filter(c=>c.state==='match').map(c=>c.label+': matches'),
 mismatches:[...extra,...active.filter(c=>c.state==='mismatch').map(c=>c.label+(c.mode==='must'?': required criterion does not match':': outside preference'))],
 unknowns:active.filter(c=>c.state==='unknown').map(c=>c.label+': needs clarification')};
}
export function investmentMatch(founder = {}, investor = {}) {
 const modes=investor.metadata?.matching_modes||{},criteria=[];
 const add=(key,label,weight,result)=>criteria.push({key,label,weight,mode:['must','prefer','none'].includes(modes[key])?modes[key]:'prefer',state:result==null?'unknown':result?'match':'mismatch'});
 const industry=values(founder.industry),industries=values(aliases(investor.preferred_industries,investor.industries_of_interest));
 add('industry','Industry',25,industry.length&&industries.length?same(industry,industries):null);
 const stages=values(aliases(investor.preferred_stages,investor.investment_stage)).map(product),fStages=[product(founder.startup_stage || founder.company_stage),norm(founder.funding_stage)].filter(Boolean);
 add('stage','Startup / funding stage',20,stages.length&&fStages.length?same(stages,fStages):null);
 const min=num(founder.metadata?.desired_check_min),max=num(founder.metadata?.desired_check_max),imin=num(investor.check_range_min ?? investor.ticket_size_min),imax=num(investor.check_range_max ?? investor.ticket_size_max);
 const currency=norm(founder.metadata?.funding_currency),icurrency=norm(investor.metadata?.check_currency||'USD');
 const valid=[min,max,imin,imax].every(v=>v!==null)&&min<=max&&imin<=imax&&max>0&&imax>0;
 add('check','Individual check range',20,valid&&currency&&currency===icurrency?max>=imin&&min<=imax:null);
 const fc=country(founder.metadata?.startup_country),geos=values(aliases(investor.geography_focus,investor.geographic_focus)).map(country);
 add('geography','Investment geography',15,geos.some(g=>['global','worldwide','anywhere'].includes(g))?true:fc&&countryNames.has(fc)&&geos.length&&geos.every(g=>countryNames.has(g))?geos.includes(fc):null);
 const models=values(investor.preferred_business_models),model=values(founder.revenue_model);
 add('business_model','Business model',10,models.length&&model.length?same(models,model):null);
 const requirement=product(investor.minimum_traction_required),stage=product(founder.startup_stage);
 let traction=null;
 if(requirement==='idea')traction=true;
 if(requirement==='prototype')traction=stage?['prototype','building mvp','mvp built','live','growing','revenue'].includes(stage):null;
 if(requirement==='mvp built')traction=stage?['mvp built','live','growing','revenue'].includes(stage):null;
 if(requirement==='live')traction=num(founder.active_users)>0?true:null;
 if(requirement==='revenue')traction=num(founder.monthly_revenue)>0?true:null;
 add('traction','Progress (self-reported)',10,traction);
 const reasons=[];
 if(founder.metadata?.founder_intent && founder.metadata.founder_intent!=='building')reasons.push('Founder is not currently building a startup');
 if(founder.metadata?.fundraising_status==='not_raising')reasons.push('Founder is not raising investment');
 if(investor.accepting_pitches===false)reasons.push('Investor is not accepting pitches');
 return finish(criteria,!reasons.length,reasons);
}
export function cofounderMatch(viewer={},candidate={}) {
 const recruiting=(viewer.looking_for||[]).includes('Co-Founder')&&(candidate.metadata?.open_to_joining===true||candidate.metadata?.founder_intent==='joining');
 const recruiter=recruiting?viewer:candidate,joiner=recruiting?candidate:viewer;
 const skills=values(joiner.founder_skills),needs=values(recruiter.skills_needed),own=values(recruiter.founder_skills);
 const item=(key,label,weight,result)=>({key,label,weight,mode:'prefer',state:result==null?'unknown':result?'match':'mismatch'});
 const criteria=[
 item('skills','Required skills',40,needs.length&&skills.length?same(needs,skills):null),
 item('complement','Complementary skills',20,own.length&&skills.length?skills.some(s=>!own.includes(s)):null),
 item('industry','Industry',20,viewer.industry&&candidate.industry?same(viewer.industry,candidate.industry):null),
 item('commitment','Working commitment',20,viewer.commitment_level&&candidate.commitment_level?norm(viewer.commitment_level)===norm(candidate.commitment_level):null)];
 const consent=cofounderConsent(viewer,candidate);
 return finish(criteria,consent,consent?[]:['Co-founder joining consent is not mutually aligned']);
}
