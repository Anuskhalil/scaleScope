// Browser plugin not available: isolated real edit-form fixture; no live data writes.
const { chromium } = require(process.env.PLAYWRIGHT_PATH);
const assert = require('node:assert/strict');
const fs = require('node:fs');
const origin = 'http://127.0.0.1:5180';
(async () => {
 const browser = await chromium.launch({channel:'msedge',headless:true});
 try {
 const page = await browser.newPage(); const errors=[];
 page.on('pageerror', e=>{errors.push(e.message); console.error(e.message)});
 await page.route('**/*', async route=>{
  const u=new URL(route.request().url());
  if(u.origin!==origin)return route.abort();
  if(u.pathname==='/src/pages/InvestorProfile.jsx'){
   const r=await route.fetch();
   return route.fulfill({response:r,body:(await r.text())+'\nexport { EditMode, STYLES };'});
  }
  if(u.pathname==='/__investor')return route.fulfill({contentType:'text/html',body:`
   <html><head><meta name="viewport" content="width=device-width,initial-scale=1"></head><body><div id="root"></div>
   <script type="module">
   import RefreshRuntime from '/@react-refresh';
   RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
   const ReactModule=await import('/node_modules/.vite/deps/react.js');
   const React=ReactModule.default || ReactModule;
   const DOMModule=await import('/node_modules/.vite/deps/react-dom_client.js');
   const {createRoot}=DOMModule.default || DOMModule;
   const {EditMode,STYLES}=await import('/src/pages/InvestorProfile.jsx');
   const style=document.createElement('style');style.textContent=STYLES;document.head.appendChild(style);
   await import('/src/index.css');
   function Fixture(){
    const [form,setForm]=React.useState({metadata:{},investor_type:'Angel Investor',minimum_traction_required:'Existing custom traction requirement'});
    window.form=form;
    return React.createElement('main',{style:{maxWidth:850,margin:'auto',padding:16}},React.createElement(EditMode,{
     formData:form,updateField:(key,value)=>setForm(p=>({...p,[key]:value})),
     toggleArrayField:(key,value)=>setForm(p=>({...p,[key]:(p[key]||[]).includes(value)?p[key].filter(v=>v!==value):[...(p[key]||[]),value]})),
     onFileUpload:()=>{window.uploaded=true},uploading:false
    }));
   }
   createRoot(document.getElementById('root')).render(React.createElement(Fixture));
   </script></body></html>`});
  return route.continue();
 });
 for(const width of [390,1440]){
  await page.setViewportSize({width,height:900});
  await page.goto(origin+'/__investor');
  await page.getByLabel('What progress do you expect?').waitFor();
  assert.equal(await page.getByText('Traction Requirement Template / Notes').count(),0);
  assert.equal(await page.locator('textarea').filter({hasText:'Existing custom traction requirement'}).count(),1);
  await page.getByLabel('What progress do you expect?').selectOption('Working MVP');
  assert.equal(await page.evaluate(()=>window.form.minimum_traction_required),'Working MVP');
  await page.getByLabel('What progress do you expect?').selectOption('Other');
  await page.getByPlaceholder('For example: a tested prototype and feedback from potential customers. Revenue is not required.').fill('Paid pilot customers');
  assert.equal(await page.evaluate(()=>window.form.minimum_traction_required),'Paid pilot customers');
  await page.getByText('Advanced Requirements (optional)',{exact:true}).click();
  await page.getByText('Upload checklist',{exact:true}).waitFor();
  await page.getByLabel('Firm / Fund Website input').fill('https://example.com');
  await page.getByLabel('Investment Portfolio / Investor Profile input').fill('https://example.com/portfolio');
  assert.equal(await page.evaluate(()=>window.form.website_url),'https://example.com');
  assert.equal(await page.evaluate(()=>window.form.portfolio_url),'https://example.com/portfolio');
  assert.equal(await page.getByLabel('Investor Video URL input').count(),0);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  await page.getByLabel('What progress do you expect?').scrollIntoViewIfNeeded();
  fs.mkdirSync('qa/artifacts',{recursive:true});
  await page.screenshot({path:'qa/artifacts/investor-requirements-'+width+'.png'});
 }
 assert.deepEqual(errors,[]);
 console.log('PASS: custom legacy value, preset/Other, optional checklist, canonical links and 390/1440 layouts.');
 } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
