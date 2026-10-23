const router=require('express').Router();
const db=require('../config/supabase');
const auth=require('../middlewares/auth.middleware');
const {isReviewAdmin}=require('../services/adminAccess');
const {reviewerEmailAllowed:eligible}=require('../config/reviewerEmails');
const hits=new Map();
router.post('/link',async(req,res)=>{
 const email=String(req.body?.email||'').trim().toLowerCase();
 if(email.length>254||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))return res.status(400).json({error:'Enter a valid email address.'});
 const now=Date.now();
 for(const[k,v]of hits)if(v.until<=now)hits.delete(k);
 const keys=['ip:'+req.ip,'email:'+email];
 if(keys.some(k=>(hits.get(k)?.count||0)>=3))return res.status(429).json({error:'Please wait before requesting another link.'});
 if(hits.size>10000)return res.status(429).json({error:'Please try again later.'});
 keys.forEach(k=>{const v=hits.get(k)||{count:0,until:now+900000};v.count++;hits.set(k,v);});
 const response={message:'If this email is authorized, a sign-in link will arrive shortly.'};
 // Do not disclose membership, provider errors or one-time credentials.
 res.status(202).json(response);
 if(!eligible(email))return;
 try {
  if(process.env.REVIEWER_ONLY_PROVISIONING_ENABLED==='true'){
   const created=await db.auth.admin.createUser({email,email_confirm:false,app_metadata:{reviewer_only:true}});
   if(created.error&&!['email_exists','user_already_exists'].includes(created.error.code))throw created.error;
  }
  const redirect=new URL('/admin',process.env.FRONTEND_URL).href;
  const {error}=await db.auth.signInWithOtp({email,options:{shouldCreateUser:false,emailRedirectTo:redirect}});
  if(error)throw error;
 }catch(error){console.warn('Reviewer email delivery failed:',String(error.code||'unknown').replace(/[^a-z0-9_]/gi,''),'Check Auth delivery logs and reviewer provisioning.');}
});
router.get('/status',auth,(req,res)=>{
 res.set('Cache-Control','no-store');
 if(!req.user.email_confirmed_at||!eligible(req.user.email?.toLowerCase()))return res.status(403).json({error:'Reviewer access denied.'});
 res.json({data:{authorized:isReviewAdmin(req.user),mfaRequired:!isReviewAdmin(req.user)}});
});
module.exports=router;
