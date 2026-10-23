// Browser plugin unavailable; isolated Playwright fixture, no live user data.
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin='http://127.0.0.1:5182';
const mock=`
const evidence={own:[{id:'e1',title:'Product evidence',category:'product',claim:'A working product demo for our startup',technical_status:'format_checked',review_status:'pending'}],shared:[],grants:[],reviewer:false};
const meetings={meetings:[{id:'m1',title:'Investor introduction',status:'ended',host_id:'me'}],followups:[]};
const inbox=[{id:'r1',sender_id:'p1',type:'investor_contact',message:'Can we discuss product-market fit?',created_at:new Date().toISOString(),person:{full_name:'Demo Founder'},fit:{matchScore:75,coverage:75,status:'potential_fit',criteria:[{key:'stage',label:'Startup stage',mode:'must',state:'unknown'}],mismatches:[]}}];
window.actions=[];
export async function trustApi(path,opts={}){
 if(opts.method){window.actions.push({path,...opts,file:!!opts.file});if(path.includes('/share'))evidence.grants=[{evidence_id:'e1',recipient_id:'p1',expires_at:new Date(Date.now()+86400000).toISOString(),revoked_at:opts.method==='DELETE'?new Date().toISOString():null}];return null;}
 if(path==='/evidence')return structuredClone(evidence);
 if(path==='/connections')return [{id:'p1',full_name:'Connected Investor'}];
 if(path==='/inbox')return inbox;
 if(path==='/meetings')return meetings;
 return [];
}
export async function downloadEvidence(id){window.actions.push({download:id});}
`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/src/services/trustApi.js')return route.fulfill({contentType:'application/javascript',body:mock});
   if(u.pathname==='/src/auth/AuthContext.jsx')return route.fulfill({contentType:'application/javascript',body:"export const useAuth=()=>({user:{id:'me'}});"});
   if(u.pathname==='/src/lib/backendApi.js')return route.fulfill({contentType:'application/javascript',body:"export const backendApi={respondConnect:async(id,action)=>window.actions.push({id,action}),endMeeting:async()=>{}};"});
   if(u.pathname==='/__phase2')return route.fulfill({contentType:'text/html',body:'<html><head><title>Trust workspace QA</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import("/qa/phase2-entry.jsx");</script></body></html>'});
   return route.continue();
  });
  fs.mkdirSync('qa/artifacts',{recursive:true});
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(origin+'/__phase2');
   await page.getByRole('heading',{name:'Incoming requests'}).waitFor();
   await page.locator('summary').click();
   await page.getByText('Startup stage (must-have)').waitFor();
   await page.getByRole('button',{name:'Accept',exact:true}).click();
   await page.waitForFunction(()=>window.actions.some(a=>a.action==='accept'));
   await page.getByRole('button',{name:'Evidence',exact:true}).click();
   await page.getByRole('button',{name:'Manage sharing'}).click();
   await page.getByLabel('Connected recipient').selectOption('p1');
   await page.getByRole('button',{name:'Grant access'}).click();
   await page.getByRole('button',{name:'Revoke',exact:true}).waitFor();
   await page.getByRole('button',{name:'Revoke',exact:true}).click();
   await page.getByText('Connected Investor: Revoked').waitFor();
   await page.getByLabel('Document title').fill('Demo proof');
   await page.getByLabel('Specific claim').fill('Our MVP has a working checkout flow');
   await page.getByLabel('Evidence file').setInputFiles({name:'demo.pdf',mimeType:'application/pdf',buffer:Buffer.from('%PDF-1.7 example')});
   await page.getByRole('button',{name:'Upload evidence'}).click();
   await page.waitForFunction(()=>window.actions.some(a=>a.path==='/evidence'&&a.file));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:'qa/artifacts/phase2-evidence-'+width+'.png',fullPage:true});
   await page.getByRole('button',{name:'Follow-ups',exact:true}).click();
   await page.getByText('Notes and next action',{exact:true}).click();
   await page.getByLabel('Private notes').fill('Discussed pricing; send a follow-up.');
   await page.getByLabel('Next action',{exact:true}).fill('Share product demo');
   await page.getByRole('button',{name:'Save follow-up'}).click();
   await page.waitForFunction(()=>window.actions.some(a=>a.path==='/meetings/m1/followup'&&a.body.notes));
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:'qa/artifacts/phase2-followup-'+width+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: inbox fit/accept, evidence upload/share/revoke, private follow-up, mobile/desktop overflow and runtime checks.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
