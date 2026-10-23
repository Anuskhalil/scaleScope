import {useEffect,useState} from 'react';
import {useAuth} from '../auth/AuthContext';
import {supabase} from '../lib/supabaseClient';
import {ShieldCheck,Mail} from 'lucide-react';
import AdminReviewPage from './AdminReviewPage';
import MfaSetup from '../components/MfaSetup';
import MfaChallenge from '../components/MfaChallenge';
const base=import.meta.env.VITE_BACKEND_URL||'http://localhost:3001';
export default function AdminEntryPage(){
 const {session,loading,authError}=useAuth();
 const userId=session?.user?.id,accessToken=session?.access_token;
 const [authorizedUserId,setAuthorizedUserId]=useState(null);
 const [email,setEmail]=useState(''),[state,setState]=useState('checking'),[message,setMessage]=useState(''),[busy,setBusy]=useState(false);
 useEffect(()=>{
  let active=true,inFlight=false;const controller=new AbortController();
  if(loading)return;
  if(!accessToken||!userId){setAuthorizedUserId(null);setState('email');setMessage(authError?'Sign-in could not be completed. Request a fresh link and open it once in this browser.':'');return;}
  // Revalidate refreshed tokens without unmounting the current review draft.
  if(authorizedUserId!==userId)setState('checking');
  async function check(){
   if(inFlight)return;inFlight=true;
   try{
    const r=await fetch(base+'/api/reviewer-auth/status',{headers:{Authorization:'Bearer '+accessToken},cache:'no-store',signal:controller.signal});
    if(!active)return;
    if(!r.ok){setMessage(r.status===403?'Reviewer access denied or revoked.': 'Reviewer access check unavailable. Please try again.');setState('denied');return;}
    const v=await r.json();
    if(v.data.authorized){if(active){setAuthorizedUserId(userId);setMessage('');setState('ready');}return;}
    const {data,error}=await supabase.auth.mfa.listFactors();if(error)throw error;
    if(active){setMessage('');setState(data.totp?.some(f=>f.status==='verified')?'challenge':'setup');}
   }catch{if(active){setMessage('Reviewer access check unavailable. Please try again.');setState('denied');}}
   finally{inFlight=false;}
  }
  check();const timer=setInterval(check,15000);window.addEventListener('focus',check);
  return()=>{active=false;controller.abort();clearInterval(timer);window.removeEventListener('focus',check);};
 },[userId,accessToken,loading,authError,authorizedUserId]);
 if(state==='ready'&&accessToken&&authorizedUserId===userId)return <><header className="flex justify-end p-4 border-b bg-white"><button className="border rounded px-4 py-2" onClick={()=>supabase.auth.signOut()}>Sign out</button></header><AdminReviewPage/></>;
 if(state==='setup')return <MfaSetup returnTo="/admin"/>;
 if(state==='challenge')return <MfaChallenge returnTo="/admin"/>;
 return <main className="min-h-screen flex items-center justify-center bg-gray-50 px-4"><section className="w-full max-w-md rounded-lg border bg-white p-6"><ShieldCheck size={28}/><h1 className="text-2xl font-bold mt-4">Reviewer access</h1>
 {state==='checking'||loading?<p role="status">Checking access...</p>:state==='denied'?<><p role="alert">{message||'This account is not authorized for reviewer access.'}</p><button className="mt-4 border rounded px-4 py-2" onClick={()=>supabase.auth.signOut()}>Use another email</button></>:<form onSubmit={async e=>{e.preventDefault();setBusy(true);setMessage('');try{const r=await fetch(base+'/api/reviewer-auth/link',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email})});const v=await r.json();setMessage(r.ok?v.message:v.error||'Request failed.');}catch{setMessage('Could not reach the server. Please try again.');}finally{setBusy(false);}}}><label className="block mt-4">Email<input className="block border rounded w-full p-3 mt-2" type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)}/></label><button disabled={busy} className="flex items-center gap-2 mt-4 rounded bg-lime-400 px-4 py-3 font-semibold"><Mail size={18}/>{busy?'Sending...':'Send sign-in link'}</button><p role="status" className="mt-4">{message}</p></form>}
 </section></main>;
}
