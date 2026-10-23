// Isolated UI tests: all auth/data modules are mocked, no live accounts are used.
const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const fs = require('node:fs');
const assert = require('node:assert/strict');
const origin = process.env.QA_ORIGIN || 'http://127.0.0.1:5175';
const out = require('node:path').join(__dirname, 'artifacts');
fs.mkdirSync(out, { recursive: true });
const auth = `
const role = new URLSearchParams(location.search).get('role') || 'early-stage-founder';
export const user = {id:'test-user', email:'test@example.com',user_metadata:{user_type:role}};
export const profile = {id:user.id, full_name:'Founder With A Long Display Name',email:user.email,user_type:role,bio:'Building a useful startup with a committed team.',location:'Karachi'};
const value={user,profile,loading:false,refreshAuth:async()=>{},signOut:async()=>{}};
export const useAuth=()=>value;
export const AuthProvider=({children})=>children;
`;
const db = `
import {user,profile} from '/src/auth/AuthContext.jsx';
const founder={user_id:user.id,metadata:{},founder_skills:['Engineering','Sales','Design'],looking_for:[],industry:'SaaS',startup_stage:'Idea'};
const chain=table=>{
 const result={data:table==='profiles'?profile:table==='founder_profiles'?founder:[],error:null};
 const q=new Proxy({}, {get:(_,key)=>key==='then'?(ok,bad)=>Promise.resolve(result).then(ok,bad):()=>q});
 return q;
};
export const supabase={
 from:chain,
 auth:{getSession:async()=>({data:{session:{access_token:'qa'}}}),signUp:async()=>({data:{user:{id:'test',identities:[{}]},session:null}}),onAuthStateChange:()=>({data:{subscription:{unsubscribe(){}}}}),signOut:async()=>({})},
 channel:()=>({on(){return this},subscribe(){return this}}),removeChannel(){},
 storage:{from:()=>({createSignedUrl:async()=>({data:{signedUrl:''}})})}
};
`;
async function main() {
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();
  const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   const js=body=>route.fulfill({contentType:'application/javascript',body});
   if(url.origin!==origin) return route.abort();
   if(url.pathname==='/src/auth/AuthContext.jsx')return js(auth);
   if(url.pathname==='/src/lib/supabaseClient.js')return js(db);
   if(url.pathname==='/src/lib/backendApi.js')return js("export const backendApi=new Proxy({}, {get:()=>async()=>({plan:{},subscription:{},data:[]})});");
   if(url.pathname==='/src/lib/socketClient.js')return js("export const initSocket=async()=>({on(){},off(){}});export const disconnectSocket=()=>{};");
   if(url.pathname==='/__qa')return route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>ScaleScope UI QA</title></head><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
await import('/qa/ui-entry.jsx');
</script></body></html>`});
   if(url.pathname==='/src/__qa-entry.js')return js(`
import React from '/node_modules/.vite/deps/react.js';
import ReactDOM from '/node_modules/.vite/deps/react-dom_client.js';
const {createRoot}=ReactDOM;
import {MemoryRouter} from '/node_modules/.vite/deps/react-router-dom.js';
import '/src/index.css';
import Founder from '/src/pages/EarlyStageFounderRolePages/FounderProfile.jsx';
import Register from '/src/auth/RegisterPage.jsx';
import Navbar from '/src/components/landing-page/Navbar.jsx';
import RoleNavbar from '/src/components/landing-page/RoleNavbar.jsx';
const mode=new URLSearchParams(location.search).get('mode');
const content=mode==='register'?React.createElement(React.Fragment,null,React.createElement(Navbar),React.createElement('main',{className:'pt-24'},React.createElement(Register))):mode==='nav'?React.createElement(RoleNavbar):React.createElement(Founder);
createRoot(document.getElementById('root')).render(React.createElement(MemoryRouter,null,content));
`);
   return route.continue();
  });
  await page.setViewportSize({width:390,height:844});
  await page.goto(origin+'/__qa');
  await page.getByRole('button',{name:'Edit Profile',exact:true}).click();
  await page.getByText('Founder Background',{exact:true}).waitFor();
  assert.equal(await page.getByRole('radio',{name:'student',exact:true}).isChecked(),true);
  await page.getByLabel('University / Institute').waitFor();
  await page.getByLabel('University / Institute').fill('Student University');
  assert.equal(await page.getByText('Help Needed',{exact:true}).count(),0);
  await page.getByText('Startup Information',{exact:true}).waitFor();
  assert.equal(await page.getByRole('radio',{name:/Joining|Exploring/}).count(),0);
  assert.equal(await page.getByLabel('Relevant Experience (years)').count(),0);
  await page.getByRole('radio',{name:'professional',exact:true}).check();
  assert.equal(await page.getByLabel('Current role',{exact:true}).inputValue(),'');
  await page.getByLabel('Relevant Experience (years)').fill('3');
  assert.equal(await page.getByLabel('Relevant Experience (years)').inputValue(),'3');
  await page.getByRole('radio',{name:'professional',exact:true}).check();
  assert.equal(await page.getByLabel('University / Institute').count(),0);
  await page.getByLabel('Current role',{exact:true}).fill('Engineer');
  assert.equal(await page.getByText('Help Needed',{exact:true}).count(),0);
  await page.getByRole('button',{name:/Co-Founder.*Build together/}).click();
  await page.getByLabel('Equity Available',{exact:true}).waitFor();
  assert.equal(await page.getByLabel('Investor Requirements',{exact:true}).count(),0);
  await page.getByRole('button',{name:/Investor.*Funding and strategic support/}).click();
  await page.getByLabel('Investor Requirements',{exact:true}).waitFor();
  await page.getByRole('button',{name:/Co-Founder.*Build together/}).click();
  assert.equal(await page.getByLabel('Equity Available',{exact:true}).count(),0);
  const assets=page.locator('section').filter({has:page.getByText('Links & Assets',{exact:true})}).last();
  assert.equal(await assets.locator('input').count(),3);
  for(const width of [320,390,768,1024,1440,1920]){
   await page.setViewportSize({width,height:900});
   await page.screenshot({path:out+'/founder-'+width+'.png',fullPage:true});
   const overflowing=await page.evaluate(()=>[...document.querySelectorAll('input,select,textarea,button,nav a')].filter(e=>e.getClientRects().length).filter(e=>{const r=e.getBoundingClientRect();return r.right>innerWidth+1||r.left < -1}).map(e=>e.textContent||e.tagName));
   assert.deepEqual(overflowing,[], 'overflow at '+width);
  }
  for(const role of ['early-stage-founder','investor']){
   for(const width of [320,768,1280,1440,1920]){
    await page.setViewportSize({width,height:900});
    await page.goto(origin+'/__qa?mode=nav&role='+role);
    await page.locator('nav').waitFor();
    if(width<1440)await page.getByRole('button',{name:'Toggle navigation menu'}).click();
    await page.screenshot({path:out+'/nav-'+role+'-'+width+'.png'});
    assert.equal(await page.evaluate(()=>[...document.querySelectorAll('nav a')].filter(e=>e.getClientRects().length).some(e=>e.getBoundingClientRect().right>innerWidth+1)),false);
   }
  }
  await page.goto(origin+'/__qa?mode=register');
  await page.locator('input[type="text"]').first().fill('Test Founder');
  await page.locator('input[type="email"]').fill('qa@example.com');
  await page.locator('input[type="password"]').nth(0).fill('TestPassword123!');
  await page.locator('input[type="password"]').nth(1).fill('TestPassword123!');
  await page.locator('select').selectOption('early-stage-founder');
  await page.getByRole('button',{name:/Create Account/i}).click();
  await page.getByRole('status').waitFor();
  assert.equal(await page.getByRole('status').evaluate(e=>getComputedStyle(e).backgroundColor),'rgb(152, 222, 56)');
  await page.screenshot({path:out+'/registration-success.png',fullPage:true});
  assert.deepEqual(errors,[]);
  console.log('PASS: background gating, numeric experience, conditional requirements, assets, registration success, both role navbars; viewport checks 320-1920.');
 } finally {await browser.close();}
}
main().catch(e=>{console.error(e);process.exitCode=1});
