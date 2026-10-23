import {useEffect,useState,useRef} from 'react';
import {ShieldCheck,X,ArrowUpRight} from 'lucide-react';
import {Link,useLocation} from 'react-router-dom';
import {useAuth} from '../auth/AuthContext';
import {profileReviewApi} from '../services/profileReviewApi';
import AIReviewReport from './AIReviewReport';
import './ReviewUI.css';
export default function ProfileReviewStatus(){
 const {user,emailVerified,needsMfa}=useAuth(),location=useLocation();
 const [data,setData]=useState(null),[error,setError]=useState('');
 const dialog=useRef(null);
 useEffect(()=>{
  if(!user||!emailVerified||needsMfa)return;
  let active=true;
  const refresh=()=>profileReviewApi('/me').then(v=>{if(active){setData(v);setError('');}}).catch(()=>{if(active){setData(null);setError('Review status is unavailable. You can browse suggestions; profile viewing, requests and messaging remain locked until it can be checked.');}});
  refresh();const timer=setInterval(refresh,30000);
  window.addEventListener('focus',refresh);window.addEventListener('profile:saved',refresh);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('profile:saved',refresh);};
 },[user?.id,emailVerified,needsMfa,location.pathname]); // eslint-disable-line react-hooks/exhaustive-deps
 if(!user||!emailVerified||needsMfa)return null;
 if(!data&&!error)return null;
 const status=data?.review?.status,approved=status==='approved';
 const title=error?'Review unavailable':approved?'Profile approved':status==='changes_requested'?'Changes requested':status==='rejected'?'Profile not approved':'Profile under review';
 return <>
 <button className="review-launcher" onClick={()=>dialog.current?.showModal()} aria-label="Open profile review status" aria-haspopup="dialog"><ShieldCheck size={18}/><span>{approved?'Approved':'Review status'}</span><span className={approved?'review-dot approved':'review-dot'}/></button>
 <dialog ref={dialog} className="review-drawer" aria-labelledby="review-drawer-title" onClick={e=>{if(e.target===dialog.current)dialog.current.close();}}>
 <div className="review-drawer-body">
 <header className="review-drawer-header"><span className="review-eyebrow">ACCOUNT REVIEW</span><button className="review-icon" title="Close review status" aria-label="Close review status" onClick={()=>dialog.current.close()}><X size={20}/></button></header>
 <div className="review-status-symbol"><ShieldCheck size={26}/></div>
 <h2 id="review-drawer-title">{title}</h2>
  <p style={{fontSize:13,margin:'6px 0'}}>{error|| (approved?'Profile viewing, connection requests and messaging are enabled.':data?.review?.interactions_allowed?'Your profile is still under review. Profile viewing, connection requests and messaging are temporarily available. This does not mean your profile is verified.':'Your profile is saved. Suggestions and tabs remain available. Viewing other profiles, sending requests and messaging unlock after approval.')}</p>
  {data?.review?.decision_note&&<section className="review-note"><h3>Reviewer feedback</h3><p>{data.review.decision_note}</p></section>}
  {data?.review&&<AIReviewReport analysis={data.review}/>}
  {!approved&&data&&<p className="review-disclosure">{!data.aiEnabled?'Automatic analysis is not enabled. ':''}Saved profile information and uploaded evidence may be processed by Gemini. Analysis is not proof of authenticity.</p>}
  <footer className="review-drawer-footer"><Link to="/trust-workspace?tab=evidence" onClick={()=>dialog.current.close()}>Your evidence <ArrowUpRight size={16}/></Link>{data?.isAdmin&&<Link to="/admin" onClick={()=>dialog.current.close()}>Review administration <ArrowUpRight size={16}/></Link>}</footer>
 </div></dialog></>;
}
