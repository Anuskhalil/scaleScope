// Browser plugin not available: isolated Playwright fixtures, no live account/data.
const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const origin=process.env.QA_ORIGIN || 'http://127.0.0.1:5179';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
 const page=await browser.newPage(); const errors=[];let calls=0;
 page.on('pageerror',e=>errors.push(e.message));
 await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/src/auth/AuthContext.jsx')return route.fulfill({contentType:'application/javascript',body:"export const useAuth=()=>({user:{id:'test-user'}});"});
   if(u.pathname==='/src/lib/backendApi.js')return route.fulfill({contentType:'application/javascript',body:"export const backendApi={getGrowthPlan:async()=>{const r=await fetch('/__plan');if(!r.ok)throw Error('unavailable');return r.json();}};"});
   if(u.pathname==='/__plan'){calls++;return route.fulfill({status:503,contentType:'application/json',body:'{}'});}
   if(u.pathname==='/__growth')return route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
await import('/qa/growth-entry.jsx');
</script></body></html>`});
   return route.continue();
 });
 fs.mkdirSync(path.join(__dirname,'artifacts'),{recursive:true});
 for(const role of ['early-stage-founder','investor']){
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});
   await page.goto(origin+'/__growth?role='+role);
   await page.getByText('Server unavailable. Showing profile-based guidance.').waitFor();
   await page.getByText('Profile clarity breakdown',{exact:true}).click();
   assert.equal(await page.getByText('Private to you',{exact:true}).count(),1);
   assert.equal(await page.getByText('Trust Score',{exact:true}).count(),0);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   assert(await page.locator('ol > li').count()>=2);
   await page.screenshot({path:path.join(__dirname,'artifacts',`growth-${role}-${width}.png`),fullPage:true});
  }
 }
 const before=calls;
 await page.goto(origin+'/__growth?other=1');
 await page.waitForTimeout(500);
 assert.equal(await page.getByText('Growth Signals',{exact:true}).count(),0);
 assert.equal(calls,before);
 await page.goto(origin+'/__growth?stage=Idea');
 await page.getByText('Understand the customer problem',{exact:true}).waitFor();
 await page.getByText('Server unavailable. Showing profile-based guidance.').waitFor();
 const requests=calls;
 await page.getByRole('button',{name:'Refresh growth guidance'}).click();
 await page.waitForFunction(()=>document.body.textContent.includes('Server unavailable.'));
 assert.equal(calls,requests+1);
 assert.deepEqual(errors,[]);
 console.log('PASS: both role guidance, responsive 320-1440, fallback, retry, breakdown, stage action, private-profile guard.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});

