import {useEffect,useState} from 'react';
import {Link} from 'react-router-dom';
import {profileReviewApi} from '../services/profileReviewApi';
export default function ProfileReviewGate({children}){
 const [review,setReview]=useState(null),[error,setError]=useState('');
 useEffect(()=>{
  let active=true;
  let loading=false;
  const refresh=async()=>{
   if(loading)return;
   loading=true;
   try {const v=await profileReviewApi('/me');if(active){setReview(v.review);setError('');}}
   catch(err){if(active){setReview(null);setError(err.message||'Review status unavailable. Please try again shortly.');}}
   finally {loading=false;}
  };
  refresh();const timer=setInterval(refresh,30000);window.addEventListener('focus',refresh);window.addEventListener('profile:saved',refresh);
  return()=>{active=false;clearInterval(timer);window.removeEventListener('focus',refresh);window.removeEventListener('profile:saved',refresh);};
 },[]);
 if(review?.interactions_allowed===true || (review?.interactions_allowed===undefined && review?.status==='approved'))return children;
 return <main className="max-w-3xl mx-auto px-5 py-12"><h1 className="text-2xl font-bold">Your profile review</h1>
 <p className="my-4">{error||(!review?'Checking profile status...':review.status==='pending'?'Your profile is under review. You can browse suggestions, but viewing other profiles, sending requests and messaging unlock after approval.':review.decision_note||'Please update your profile for another review.')}</p>
 <div className="flex flex-wrap gap-4"><Link className="text-[#1B2D7F] font-semibold" to="/discover">Explore profiles</Link><Link className="text-[#1B2D7F] font-semibold" to="/profile">Edit profile</Link><Link className="text-[#1B2D7F] font-semibold" to="/trust-workspace?tab=evidence">Your evidence</Link></div>
 </main>;
}
