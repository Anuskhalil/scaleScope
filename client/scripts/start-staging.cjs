const fs=require('node:fs');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createRequire}=require('node:module');
const root=path.resolve(__dirname,'..');
const backendRequire=createRequire(path.resolve(root,'../backend/package.json'));
const dotenv=backendRequire('dotenv');
const url='https://sopklyxvzmungxwgboqs.supabase.co';
function publicKey(key) {
 if(!key) throw new Error('STAGING_PUBLIC_KEY missing in backend/.env.staging-tests');
 if(key.startsWith('sb_publishable_')) return key;
 let payload; try {payload=JSON.parse(Buffer.from(key.split('.')[1],'base64url').toString());} catch {}
 if(payload?.role!=='anon'||payload?.ref!=='sopklyxvzmungxwgboqs') throw new Error('Only approved staging anon/publishable key is allowed');
 return key;
}
function childEnvironment(key,port,inherited=process.env) {
 const env={};
 for(const [k,v] of Object.entries(inherited)) if(['path','systemroot','windir','comspec','temp','tmp','home','userprofile','localappdata'].includes(k.toLowerCase())) env[k]=v;
 return {...env,NODE_ENV:'development',VITE_PASSPORT_STAGING:'true',VITE_SUPABASE_URL:url,VITE_SUPABASE_ANON_KEY:publicKey(key),VITE_BACKEND_URL:'http://127.0.0.1:'+port};
}
async function main() {
 const values=dotenv.parse(fs.readFileSync(path.resolve(root,'../backend/.env.staging')));
 const {buildEnvironment}=backendRequire('./scripts/start-staging.cjs');
 const backend=buildEnvironment(values);
 const input=dotenv.parse(fs.readFileSync(path.resolve(root,'../backend/.env.staging-tests')));
 const env=childEnvironment(input.STAGING_PUBLIC_KEY,backend.PORT);
 const health=await fetch(env.VITE_BACKEND_URL+'/health',{signal:AbortSignal.timeout(8000)});
 const data=await health.json();
 if(!health.ok||data.mode!=='isolated-staging'||data.supabaseProject!=='sopklyxvzmungxwgboqs'||data.backgroundWorkers!==false) throw new Error('Backend must be the isolated staging server');
 const settings=await fetch(url+'/auth/v1/settings',{headers:{apikey:env.VITE_SUPABASE_ANON_KEY},signal:AbortSignal.timeout(10000)});
 if(!settings.ok) throw new Error('Staging rejected the public key');
 const child=spawn(process.execPath,[path.join(__dirname,'staging-vite.mjs')],{cwd:root,env,stdio:'inherit'});
 child.on('error',()=>{console.error('Staging frontend launch failed');process.exitCode=1;});
 child.on('exit',code=>{process.exitCode=code??1;});
 for(const signal of ['SIGINT','SIGTERM']) process.on(signal,()=>child.kill(signal));
}
if(require.main===module) main().catch(()=>{console.error('Staging launch refused. Check staging backend health and local staging public-key configuration.');process.exitCode=1;});
module.exports={childEnvironment,publicKey};
