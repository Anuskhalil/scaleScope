import test from 'node:test';
import assert from 'node:assert/strict';
import {investmentMatch,cofounderMatch} from './matching.mjs';
const f={industry:'SaaS',startup_stage:'MVP Built',revenue_model:'Subscription',metadata:{startup_country:'Pakistan',funding_currency:'USD',desired_check_min:100,desired_check_max:200}};
const i={preferred_industries:['SaaS'],preferred_stages:['Working MVP'],preferred_business_models:['Subscription'],geography_focus:'Pakistan',check_range_min:100,check_range_max:300,minimum_traction_required:'Working MVP',metadata:{check_currency:'USD'}};

test('Passport state, legacy verification and admission do not alter investment or cofounder fit',()=>{
 const a={looking_for:['Co-Founder'],skills_needed:['React'],founder_skills:['Sales'],industry:'SaaS',commitment_level:'Exploring'};
 const b={metadata:{open_to_joining:true},founder_skills:['React'],industry:'SaaS',commitment_level:'Exploring'};
 for(const state of ['submitted','supported','stale','revoked','expired']) {
  const extra={passport_state:state,is_verified:true,trust_score:100,review_status:'approved'};
  assert.deepEqual(investmentMatch({...f,...extra},{...i,...extra}),investmentMatch(f,i));
  assert.deepEqual(cofounderMatch({...a,...extra},{...b,...extra}),cofounderMatch(a,b));
 }
});
test('same full criteria yields a complete fit, not verification',()=>{
 const r=investmentMatch(f,i);assert.equal(r.matchScore,100);assert.equal(r.coverage,100);assert.equal(r.version,'foundation-1.1');assert.equal(r.is_verified,undefined);
});
test('must-have mismatch excludes recommendation without hiding discovery data',()=>{
 const r=investmentMatch({...f,industry:'Gaming'},{...i,metadata:{matching_modes:{industry:'must'}}});
 assert.equal(r.eligible,false);assert.equal(r.matchScore,0);assert.equal(r.criteria[0].state,'mismatch');
});
test('missing must-have is unknown, not a fabricated match',()=>{
 const r=investmentMatch({...f,industry:null},{...i,metadata:{matching_modes:{industry:'must'}}});
 assert.equal(r.status,'needs_clarification');assert.equal(r.coverage,75);assert.equal(r.criteria[0].state,'unknown');
});
test('no restriction removes criterion; preferences do not hard-block',()=>{
 assert.equal(investmentMatch({...f,industry:'Gaming'},i).eligible,true);
 assert.equal(investmentMatch({...f,industry:'Gaming'},{...i,metadata:{matching_modes:{industry:'none'}}}).matchScore,100);
});
test('currency mismatch, inverted/zero range are not matching money',()=>{
 for(const metadata of [{...f.metadata,funding_currency:'PKR'},{...f.metadata,desired_check_min:300,desired_check_max:100},{...f.metadata,desired_check_min:0,desired_check_max:0}]){
  assert.equal(investmentMatch({...f,metadata},i).criteria.find(c=>c.key==='check').state,'unknown');
 }
});
test('paused investor and not-raising founder are unaligned',()=>{
 assert.equal(investmentMatch(f,{...i,accepting_pitches:false}).eligible,false);
 assert.equal(investmentMatch({...f,metadata:{...f.metadata,fundraising_status:'not_raising'}},i).eligible,false);
});
test('legacy custom traction is unknown and absence is not confirmed zero',()=>{
 assert.equal(investmentMatch(f,{...i,minimum_traction_required:'10 signed LOIs'}).criteria.at(-1).state,'unknown');
 assert.equal(investmentMatch({...f,monthly_revenue:0},{...i,minimum_traction_required:'Paying customers'}).criteria.at(-1).state,'unknown');
});
test('cofounder scoring requires explicit intent and works both ways',()=>{
 const a={looking_for:['Co-Founder'],skills_needed:['React'],founder_skills:['Sales'],industry:'SaaS',commitment_level:'Exploring'};
 const b={metadata:{open_to_joining:true},founder_skills:['React'],industry:'SaaS',commitment_level:'Exploring'};
 assert.equal(cofounderMatch(a,b).matchScore,100);
 assert.equal(cofounderMatch(b,a).matchScore,100);
 assert.equal(cofounderMatch(a,{...b,metadata:{open_to_joining:false}}).eligible,false);
});
test('safe empty criteria never imply fully known fit',()=>{
 assert.equal(investmentMatch().matchScore,0);assert.equal(investmentMatch().coverage,0);
 assert.equal(investmentMatch().status,'needs_clarification');
});

test('legacy investor aliases provide the same evidence as canonical fields',()=>{
 const legacy={...i,preferred_industries:[],industries_of_interest:i.preferred_industries,
 preferred_stages:[],investment_stage:i.preferred_stages,check_range_min:null,check_range_max:null,
 ticket_size_min:100,ticket_size_max:300,geography_focus:'',geographic_focus:'Pakistan'};
 assert.deepEqual(investmentMatch(f,legacy),investmentMatch(f,i));
});

test('explicit canonical investor fields win over conflicting legacy aliases',()=>{
 assert.deepEqual(investmentMatch(f,{...i,industries_of_interest:['Gaming'],ticket_size_min:9999}),investmentMatch(f,i));
});
