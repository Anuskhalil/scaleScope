import { supabase } from '../lib/supabaseClient';
const BASE = import.meta.env.VITE_BACKEND_URL || 'http://localhost:3001';
export async function trustApi(path, {method='GET',body,file,download=false}={}) {
 const {data,error}=await supabase.auth.getSession();
 if(error || !data.session?.access_token)throw new Error('Please sign in again');
 const headers={Authorization:'Bearer '+data.session.access_token};
 if(file){headers['Content-Type']=file.type;headers['X-Evidence-Metadata']=encodeURIComponent(JSON.stringify(body));}
 else if(body)headers['Content-Type']='application/json';
 const response=await fetch(BASE+'/api/trust'+path,{method,headers,body:file || (body?JSON.stringify(body):undefined)});
 if(!response.ok){const value=await response.json().catch(()=>({}));throw new Error(value.error||'Request failed');}
 if(download)return {blob:await response.blob(),filename:response.headers.get('content-disposition')?.match(/filename="(evidence\.(?:pdf|png|jpg))"/)?.[1]||'evidence'};
 return (await response.json()).data;
}
export async function downloadEvidence(id) {
 const {blob,filename}=await trustApi('/evidence/'+id+'/download',{download:true});
 const url=URL.createObjectURL(blob),a=document.createElement('a');
 a.href=url;a.download=filename;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
}
