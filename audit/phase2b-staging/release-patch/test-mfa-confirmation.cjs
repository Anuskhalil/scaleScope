// Mocked component UI check; never enrolls or changes a real MFA factor.
const {chromium}=require('C:/Users/Anus Khalil/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try{
  const page=await browser.newPage();
  const errors=[];page.on('pageerror',e=>{errors.push(e.message);console.error(e.message);});
  await page.route('**/*',async route=>{
   const url=new URL(route.request().url());
   if(url.hostname!=='127.0.0.1')return route.abort();
   if(url.pathname==='/node_modules/.vite/deps/react-router-dom.js')return route.fulfill({contentType:'application/javascript',body:'export const BrowserRouter=({children})=>children; export const useNavigate=()=>path=>window.history.pushState({},"",path);'});
   if(url.pathname==='/__mfa_test')return route.fulfill({contentType:'text/html',body:`<div id="root"></div><script type="module">
import RefreshRuntime from '/@react-refresh';RefreshRuntime.injectIntoGlobalHook(window);window.$RefreshReg$=()=>{};window.$RefreshSig$=()=>type=>type;window.__vite_plugin_react_preamble_installed__=true;
const R=await import('/node_modules/.vite/deps/react.js');const React=R.default||R;const D=await import('/node_modules/.vite/deps/react-dom_client.js');const createRoot=D.createRoot||D.default.createRoot;const {BrowserRouter}=await import('/node_modules/.vite/deps/react-router-dom.js');const {default:Setup}=await import('/src/components/MfaSetup.jsx');createRoot(document.getElementById('root')).render(React.createElement(BrowserRouter,null,React.createElement(Setup)));
</script>`});
   if(url.pathname==='/src/lib/supabaseClient.js')return route.fulfill({contentType:'application/javascript',body:`export const supabase={auth:{mfa:{listFactors:async()=>({data:{totp:[]}}),enroll:async()=>({data:{id:'synthetic',totp:{qr_code:'',secret:''}}}),challenge:async()=>({data:{id:'challenge'}}),verify:async()=>({error:null})}}};`});
   if(url.pathname==='/src/auth/AuthContext.jsx')return route.fulfill({contentType:'application/javascript',body:'export const useAuth=()=>({refreshMfaLevel:async()=>{}});'});
   return route.continue();
  });
  await page.goto('http://127.0.0.1:5174/__mfa_test');
  await page.getByPlaceholder('123456').fill('123456');
  await page.getByRole('button',{name:'Verify and Enable'}).click();
  await page.getByRole('heading',{name:'Two-factor authentication enabled'}).waitFor();
  await page.waitForTimeout(1800);
  if(!page.url().endsWith('/__mfa_test'))throw new Error('Unexpected automatic redirect');
  if(!(await page.getByRole('status').innerText()).includes('enabled successfully'))throw new Error('Missing success');
  await page.getByRole('button',{name:'Continue',exact:true}).click();
  if(!page.url().endsWith('/dashboard'))throw new Error('Continue navigation failed');
  if(errors.length)throw new Error('Component runtime error');
  console.log('PASS: mocked verification stays on confirmation; Continue navigates; no page errors');
 }finally{await browser.close();}
})().catch(e=>{console.error(e.message);process.exitCode=1;});
