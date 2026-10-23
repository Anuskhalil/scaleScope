// Browser plugin unavailable; fixtures isolate UI from live auth and private evidence.
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
const assert=require('node:assert/strict'),fs=require('node:fs');
const origin='http://127.0.0.1:5182';
const mock=`
window.reviewStatus='pending';window.decisions=[];
const row={user_id:'candidate',revision:4,status:'pending',ai_status:'complete',profile:{full_name:'Demo Founder',user_type:'early-stage-founder'}};
const report={summary:'Reporting period is missing',findings:[{field:'traction',assessment:'insufficient_evidence',explanation:'Add a reporting period',source:'profile.monthly_revenue'}],limitations:['Not an authenticity guarantee']};
export async function profileReviewApi(path,body){
 if(path==='/me')return {isAdmin:location.search.includes('admin=1'),aiEnabled:true,review:{status:window.reviewStatus,ai_status:'complete',ai_report:report}};
 if(path==='/queue')return window.decisions.length?[]:[row];
 if(body){window.decisions.push(body);return {success:true};}
 return {profile:{id:'candidate',full_name:'Demo Founder',bio:'Founder building a product'},role:{industry:'SaaS',metadata:{founder_background:'student',education:'Computer science'}},review:{...row,ai_report:report},evidence:[{id:'e1',title:'Product demo',claim:'MVP is working',review_status:'pending',analysis:{ai_status:'complete',ai_report:report}}]};
}`;
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/src/auth/AuthContext.jsx')return route.fulfill({contentType:'application/javascript',body:"export function useAuth(){return {user:{id:'test'},emailVerified:true,needsMfa:false};}"});
   if(u.pathname==='/src/services/profileReviewApi.js')return route.fulfill({contentType:'application/javascript',body:mock});
   if(u.pathname==='/src/services/trustApi.js')return route.fulfill({contentType:'application/javascript',body:'export async function downloadEvidence(){}'});
   if(u.pathname==='/__adminreview')return route.fulfill({contentType:'text/html',body:'<html><head><title>Review QA</title><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">import R from "/@react-refresh";R.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import("/qa/admin-review-entry.jsx");</script></body></html>'});
   return route.continue();
  });
  await page.goto(origin+'/__adminreview');
  await page.getByRole('alert').waitFor();
  assert.equal(await page.getByRole('button',{name:'Review profile',exact:true}).count(),0);
  assert.equal(await page.getByTestId('suggestions').count(),1);
  assert.equal(await page.getByTestId('protected-action').count(),0);
  fs.mkdirSync('qa/artifacts',{recursive:true});
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(origin+'/__adminreview?admin=1');
   await page.getByRole('button',{name:'Review profile',exact:true}).click();
   await page.getByText('Role profile',{exact:true}).waitFor();
   await page.locator('.admin-detail summary').filter({hasText:'AI analysis'}).first().click();
   await page.locator('.admin-detail').getByText('Reporting period is missing').first().waitFor();
   assert.equal(await page.getByTestId('suggestions').count(),1);
   assert.equal(await page.getByTestId('protected-action').count(),0);
   await page.getByLabel('Reason and review limitations').fill('Checked saved profile and source evidence; account approved for matching.');
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:'qa/artifacts/admin-review-'+width+'.png',fullPage:true});
   await page.getByRole('button',{name:'Open profile review status'}).click();
   await page.getByRole('dialog').waitFor();
   await page.getByRole('dialog').locator('summary').click();
   assert.equal(await page.getByRole('dialog').evaluate(el=>el.scrollWidth>el.clientWidth),false);
   const box=await page.getByRole('dialog').boundingBox();
   assert.equal(Math.round(box.y),0);
   await page.screenshot({path:'qa/artifacts/review-drawer-'+width+'.png'});
   await page.keyboard.press('Escape');
   await page.getByRole('dialog').waitFor({state:'hidden'});
   await page.getByRole('button',{name:'Save decision'}).click();
   await page.getByText('No profiles waiting for review.').waitFor();
   assert.equal(await page.evaluate(()=>window.decisions[0].revision),4);
   await page.evaluate(()=>{window.reviewStatus='approved';window.dispatchEvent(new Event('focus'));});
   await page.getByTestId('protected-action').waitFor();
  }
  assert.deepEqual(errors,[]);
  console.log('PASS: suggestions visible while pending, protected content blocked, unauthorized admin hidden, admin approval unlocks content, responsive 320-1440.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
