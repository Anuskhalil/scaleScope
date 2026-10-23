// Isolated UI audit: no live database writes, credentials, or AI calls.
const fs = require('node:fs');
const path = require('node:path');
const {chromium} = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const base = 'http://localhost:5173';
const pages = [
 ['founder-dashboard','EarlyStageFounderRolePages/EarlyStageDashboard.jsx','early-stage-founder'],
 ['investor-dashboard','InvestorRolePages/InvestorDashboard.jsx','investor'],
 ['founder-discover','StudentRolePages/DiscoverPage.jsx','early-stage-founder'],
 ['investor-discover','StudentRolePages/DiscoverPage.jsx','investor'],
 ['find-investors','EarlyStageFounderRolePages/FindInvestorsPage.jsx','early-stage-founder'],
 ['find-startups','InvestorRolePages/FindStartupsPage.jsx','investor'],
 ['find-team','EarlyStageFounderRolePages/FindTeamPage.jsx','early-stage-founder'],
 ['founder-profile','EarlyStageFounderRolePages/FounderProfile.jsx','early-stage-founder'],
 ['investor-profile','InvestorProfile.jsx','investor'],
 ['public-founder','StudentRolePages/StudentViewProfile.jsx','investor'],
 ['public-investor','StudentRolePages/StudentViewProfile.jsx','early-stage-founder'],
 ['navigation','../components/landing-page/RoleNavbar.jsx','early-stage-founder'],
 ['messages','StudentRolePages/MessagesPage.jsx','early-stage-founder'],
 ['ai-mentor','AIMentorPage.jsx','early-stage-founder'],
 ['requests','StudentRolePages/ConnectionRequestsPage.jsx','early-stage-founder'],
 ['trust','TrustWorkspacePage.jsx','early-stage-founder'],
 ['passport','../components/PassportWorkspace.jsx','early-stage-founder'],
 ['admin','AdminReviewPage.jsx','early-stage-founder'],
 ['mfa-setup','../components/MfaSetup.jsx','early-stage-founder'],
 ['mfa-challenge','../components/MfaChallenge.jsx','early-stage-founder'],
 ['login','../auth/LoginPage.jsx','early-stage-founder'],
 ['register','../auth/RegisterPage.jsx','early-stage-founder'],
 ['forgot-password','../auth/ForgotPasswordPage.jsx','early-stage-founder'],
 ['pricing','PricingPage.jsx','investor'],
 ['billing','BillingPage.jsx','investor'],
 ['founder-pricing','PricingPage.jsx','early-stage-founder'],
 ['founder-billing','BillingPage.jsx','early-stage-founder'],
 ['landing','LandingPage.jsx','early-stage-founder'],
];
const dir = path.resolve(process.env.TEMP || '.', 'scalescope-profile-audit');
const selectedPages=process.env.AUDIT_PAGES?.split(',');
fs.mkdirSync(dir,{recursive:true});
const fixtures = `
const founderId='00000000-0000-4000-8000-000000000101',investorId='00000000-0000-4000-8000-000000000401';
const role=window.auditRole,id=role==='investor'?investorId:founderId;
const person=(uid,type,name)=>({id:uid,user_type:type,full_name:name,email:'private@example.invalid',location:'Karachi, Pakistan',bio:'Synthetic profile for isolated matching tests only.',avatar_url:'https://fixture.invalid/avatar.png',linkedin_url:'https://linkedin.com/in/synthetic',github_url:'https://github.com/synthetic'});
const fp=person(founderId,'early-stage-founder','Test Founder'),ip=person(investorId,'investor','Test Investor');
const metadata={founder_background:'student',university:'Test University',degree:'Computer Science',founder_intent:'building',open_to_joining:true,startup_country:'Pakistan',fundraising_status:'raising',funding_currency:'USD',desired_check_min:100,desired_check_max:200,check_currency:'USD'};
const founder={id:founderId,user_id:founderId,profiles:fp,company_name:'Test Startup',idea_title:'Test Startup',industry:'SaaS',startup_stage:'MVP Built',funding_stage:'Pre-seed',revenue_model:'Subscription',problem_statement:'A synthetic problem statement for profile tests.',target_market:'Small businesses',founder_skills:['React','Sales','Leadership'],skills_needed:['React'],looking_for:['Investor','Co-Founder'],commitment_level:'Full-time',is_public:true,is_active:true,profile_completion:90,onboarding_completed:true,metadata,...metadata};
const investor={id:investorId,user_id:investorId,profile_id:investorId,profiles:ip,firm_name:'Test Fund',fund_name:'Test Fund',preferred_industries:['SaaS'],preferred_stages:['MVP Built'],preferred_business_models:['Subscription'],check_range_min:100,check_range_max:300,geography_focus:'Pakistan',minimum_traction_required:'Working MVP',accepting_pitches:true,is_public:true,is_active:true,profile_completion:90,onboarding_completed:true,metadata};
export const current=role==='investor'?ip:fp;
export const fit={version:'foundation-1.1',matchScore:100,coverage:100,eligible:true,status:'potential_fit',criteria:[{key:'industry',label:'Industry',state:'match',mode:'prefer'}],reasons:['Industry: matches'],mismatches:[],unknowns:[]};
const tables={profiles:[fp,ip],founder_profiles:[founder],investor_profiles:[investor]};
function query(table){let rows=[...(tables[table]||[])];let single=false;const q=new Proxy({}, {get(_,key){if(key==='then')return resolve=>resolve({data:single?rows[0]||null:rows,error:null,count:rows.length});return (...args)=>{if(key==='eq')rows=rows.filter(r=>r[args[0]]===args[1]);if(key==='neq')rows=rows.filter(r=>r[args[0]]!==args[1]);if(key==='in')rows=rows.filter(r=>args[1].includes(r[args[0]]));if(key==='single'||key==='maybeSingle')single=true;return q;};}});return q;}
export const supabase={from:query,auth:{getSession:async()=>({data:{session:{user:current,access_token:'synthetic'}}}),getUser:async()=>({data:{user:current}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}})},storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:'https://fixture.invalid/avatar.png'}})})},channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){},rpc:async()=>({data:[],error:null})};
const billingPlans=[{code:'free',name:'Free',role_scope:['early-stage-founder','investor'],limits:{connection_requests:5},features:{included:['Profile matching','Messaging after accepted connections']}},{code:'founder_pro',name:'Founder Pro',role_scope:['early-stage-founder'],price_monthly:15,price_yearly:144,currency:'USD',checkout_intervals:['monthly','yearly'],limits:{connection_requests:50},features:{included:['Higher monthly connection request allowance']}}];
export const backendApi=new Proxy({}, {get(_,key){return async (...args)=>{if(key==='evaluateMatches')return args[0].filter(uid=>uid!==id).map(uid=>({user_id:uid,...fit}));if(key==='getBillingPlans')return billingPlans.filter(p=>p.code==='free'||!args[0]||p.role_scope.includes(args[0]));if(key==='getMyBilling')return {role,plan:billingPlans[0],subscription:{status:'free'},plans:billingPlans};if(key==='getBillingUsage')return {limit:{used:2,limit:5}};return {data:[],success:true};};}});
export const auth={user:current,profile:current,session:{user:current,access_token:'synthetic'},loading:false,isAuthenticated:true,emailVerified:true,refreshAuth:async()=>{}};
supabase.auth.mfa={listFactors:async()=>({data:{totp:[{id:'synthetic',status:'verified'}]}}),challenge:async()=>({data:{id:'synthetic'}}),getAuthenticatorAssuranceLevel:async()=>({data:{currentLevel:'aal2',nextLevel:'aal2'}})};
`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});const results=[];
 try{for(const [name,file,role] of pages.filter(([name])=>!selectedPages||selectedPages.includes(name)))for(const width of [1440,768,360]){
  const context=await browser.newContext({viewport:{width,height:900}});const page=await context.newPage();const errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(({role,name})=>{window.auditRole=role;window.auditName=name;},{role,name});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.hostname==='fixture.invalid')return route.fulfill({contentType:'image/png',body:Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Y9Zl1sAAAAASUVORK5CYII=','base64')});
   if(!['localhost','127.0.0.1'].includes(u.hostname))return route.fulfill({status:200,contentType:'application/json',body:'{}'});
   if(u.port!=='5173'){
    let data={status:'approved',isAdmin:true,canInteract:true};
    if(u.pathname.startsWith('/api/trust/'))data=u.pathname.endsWith('/evidence')?{own:[],shared:[],grants:[],reviewer:true}:[];
    if(u.pathname.includes('/api/passport/'))data={evidence:[],claims:[],queue:[],history:[],reviewer:true,mutationsEnabled:true};
    if(u.pathname.endsWith('/queue'))data=[];
    return route.fulfill({contentType:'application/json',body:JSON.stringify({data,success:true})});
   }
   return route.continue();
  });
  await page.route('**/__audit_fixtures.js',r=>r.fulfill({contentType:'application/javascript',body:fixtures}));
  for(const [pattern,body] of [
   ['**/src/auth/AuthContext*',"import {auth} from '/__audit_fixtures.js';export const useAuth=()=>auth;"],
   ['**/src/lib/supabaseClient*',"export {supabase} from '/__audit_fixtures.js';"],
   ['**/src/lib/backendApi*',"export {backendApi} from '/__audit_fixtures.js';"],
   ['**/src/lib/socketClient*',"export const initSocket=async()=>null;export const getSocket=()=>null;"],
   ['**/src/utils/avatarStorage*',"export const getSignedAvatarUrl=async()=> 'https://fixture.invalid/avatar.png';export const extractAvatarPath=x=>x;export const getAvatarStoragePath=x=>x;export const uploadRoleAvatar=async()=>{throw Error('Writes disabled in audit')};"],
  ])await page.route(pattern,r=>r.fulfill({contentType:'application/javascript',body}));
  const transformed=await (await fetch(base+'/src/pages/'+file)).text();
  const routerSource=transformed.includes('react-router-dom')?transformed:await (await fetch(base+'/src/components/landing-page/Hero.jsx')).text();
  const router=routerSource.match(/from\s*["']([^"']*react-router-dom[^"']*)["']/)?.[1];
  const target=name==='public-investor'?'00000000-0000-4000-8000-000000000401':'00000000-0000-4000-8000-000000000101';
  await page.route('**/__audit_page',r=>r.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"/></head><body><div id="root"></div><script type="module">import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/src/index.css');const{default:R}=await import('/node_modules/.vite/deps/react.js');const{default:D}=await import('/node_modules/.vite/deps/react-dom_client.js');const RR=await import(${JSON.stringify(router||'/node_modules/.vite/deps/react-router-dom.js')});const C=(await import('/src/pages/${file}')).default;D.createRoot(document.getElementById('root')).render(R.createElement(RR.MemoryRouter,{initialEntries:['/user-profile/${target}']},R.createElement(RR.Routes,null,R.createElement(RR.Route,{path:'/user-profile/:userId',element:R.createElement(C)}))));</script></body></html>`}));
  await page.goto(base+'/__audit_page');await page.waitForTimeout(2200);
  await page.evaluate(()=>document.fonts.ready);
  const typography=await page.evaluate(()=>({body:getComputedStyle(document.body).fontFamily,heading:document.querySelector('h1,h2')?getComputedStyle(document.querySelector('h1,h2')).fontFamily:null,fonts:[...document.fonts].filter(f=>f.status==='loaded').map(f=>f.family)}));
  if(!typography.body.includes('Inter'))errors.push('Body font is not Inter');
  if(typography.heading&&!typography.heading.includes('Jakarta'))errors.push('Heading font is not Plus Jakarta Sans');
  const body=await page.locator('body').innerText();
  if(name.startsWith('public-') && body.includes('private@example.invalid'))errors.push('Public view exposed private email');
  if(name==='public-founder' && (!body.includes('Test University') || body.indexOf('Education')>body.indexOf('Founder Startup')))errors.push('Education missing or ordered after startup');
  const images=await page.locator('img').evaluateAll(async nodes=>{
   await Promise.all(nodes.map(async n=>{n.loading='eager';try{await n.decode();}catch{ /* Record failed images below. */ }}));
   return nodes.map(n=>({loaded:n.complete&&n.naturalWidth>0,src:n.currentSrc}));
  });
  if(images.some(n=>!n.loaded))errors.push('Profile image failed to load');
  if(name==='find-investors'){
   const search=page.getByPlaceholder('Search by investor, fund, industry, or thesis...');
   await search.fill('no-such-investor-fixture');
   await page.waitForTimeout(350);
   if((await page.locator('body').innerText()).includes('Test Investor'))errors.push('Investor search did not filter candidate');
   await search.fill('');
   await page.waitForTimeout(350);
   if(!(await page.locator('body').innerText()).includes('Test Investor'))errors.push('Clearing search did not restore candidate');
  }
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);
  if(name==='navigation'){
   const ask=()=>page.evaluate(()=>{window.confirmResult=null;window.dispatchEvent(new CustomEvent('scalescope:confirm-request',{detail:{resolve:value=>{window.confirmResult=value;},handled:false}}));});
   await ask();await page.getByRole('dialog').waitFor();
   await page.getByRole('button',{name:'Send request',exact:true}).waitFor();
   if(!(await page.getByRole('dialog').innerText()).includes('3 remaining'))errors.push('Request allowance missing');
   await page.screenshot({path:path.join(dir,`request-confirm-${width}.png`)});
   await page.getByRole('button',{name:'Cancel',exact:true}).click();
   if(await page.evaluate(()=>window.confirmResult)!==false)errors.push('Cancel did not resolve without sending');
   await ask();await page.getByRole('button',{name:'Send request',exact:true}).click();
   if(await page.evaluate(()=>window.confirmResult)!==true)errors.push('Confirm did not resolve');
  }
  if(name==='navigation'&&width<1440){
   await page.getByRole('button',{name:'Toggle navigation menu'}).click();
   if(!(await page.getByRole('link',{name:'Two-factor authentication'}).isVisible()))errors.push('Mobile account navigation missing');
  }
  if(name==='messages'&&width<768&&!(await page.getByRole('textbox',{name:'Search conversations'}).isVisible()))errors.push('Mobile conversation list missing');
  await page.screenshot({path:path.join(dir,`${name}-${width}.png`),fullPage:true});
  const rendered=name==='navigation'?await page.locator('nav').count()>0:body.length>30;
  results.push({name,width,errors,overflow,typography,images,rendered,text:body.slice(0,220)});
  await context.close();
 }
 }finally{await browser.close();fs.writeFileSync(path.join(dir,'results.json'),JSON.stringify(results,null,2));}
 console.log(JSON.stringify(results,null,2));
 if(results.some(r=>r.errors.length||r.overflow||!r.rendered))process.exitCode=1;
})().catch(e=>{console.error(e.message);process.exitCode=1});
