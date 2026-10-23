// Browser plugin unavailable: Playwright isolated UI and service integration fixtures.
const {chromium}=require(process.env.PLAYWRIGHT_PATH);
const assert=require('node:assert/strict');
const fs=require('node:fs');
const origin='http://127.0.0.1:5181';
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();const errors=[];
  page.on('pageerror',e=>{errors.push(e.message);console.error(e.message)});
  await page.route('**/*',async route=>{
   const u=new URL(route.request().url());
   if(u.origin!==origin)return route.abort();
   if(u.pathname==='/src/lib/backendApi.js')return route.fulfill({contentType:'application/javascript',body:"export const backendApi={evaluateMatches:async ids=>ids.map(user_id=>({user_id,matchScore:0,eligible:false,status:'not_aligned',coverage:100,criteria:[],reasons:[],mismatches:['Not aligned'],unknowns:[],version:'foundation-1'}))};"});
   if(u.pathname==='/__phase1')return route.fulfill({contentType:'text/html',body:`<html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div><script type="module">
    import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;await import('/qa/phase1-entry.jsx');
   </script></body></html>`});
   return route.continue();
  });
  fs.mkdirSync('qa/artifacts',{recursive:true});
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:900});await page.goto(origin+'/__phase1');
   await page.locator('label').filter({hasText:/^Industry/}).locator('select').selectOption('must');
   await page.locator('summary').click();
   await page.getByText('Industry (must-have)',{exact:true}).waitFor();
   assert((await page.locator('summary').innerText()).includes('0/100'));
   await page.getByRole('checkbox').check();
   await page.getByLabel('Commitment available').selectOption('Exploring');
   assert.equal(await page.evaluate(()=>window.fixture.person.metadata.open_to_joining),true);
   await page.getByRole('checkbox').uncheck();
   assert.equal(await page.getByLabel('Commitment available').count(),0);
   assert.equal(await page.evaluate(()=>window.fixture.person.metadata.open_to_joining),false);
   await page.locator('label').filter({hasText:/^Industry/}).locator('select').selectOption('none');
   assert((await page.locator('summary').innerText()).includes('100/100'));
   assert.equal(await page.getByText('Industry (must-have)',{exact:true}).count(),0);
   await page.waitForFunction(()=>window.checkedResults);
   assert.deepEqual(await page.evaluate(()=>window.checkedResults.map(rows=>rows[0].matchScore)),[0,0]);
   assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
   await page.screenshot({path:'qa/artifacts/phase1-'+width+'.png',fullPage:true});
  }
  assert.deepEqual(errors,[]);console.log('PASS: preferences, missing/required explanations, consent on/off, server zero preserved, async investor ranking, 320-1440 layouts.');
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
