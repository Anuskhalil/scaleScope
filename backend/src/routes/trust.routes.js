const express = require('express');
const auth = require('../middlewares/auth.middleware');
const service = require('../services/trust.service');
const router = express.Router();
const hits = new Map();
function metadata(req) {
 try { return JSON.parse(decodeURIComponent(req.get('x-evidence-metadata')||'{}')); }
 catch { throw Object.assign(new Error('Invalid evidence metadata'),{status:400}); }
}
router.use(auth);
router.use(async (req,res,next) => {
 try {const reviewRoute=(req.method==='GET'&&(req.path==='/review-queue'||/^\/evidence\/[0-9a-f-]+\/download$/i.test(req.path)))||(req.method==='POST'&&/^\/evidence\/[0-9a-f-]+\/review$/i.test(req.path));if(reviewRoute&&require('../services/adminAccess').isReviewAdmin(req.user))return next();await service.account(req.user.id); next(); } catch(e) { next(e); }
});
router.use((req,res,next) => {
 if(req.method==='GET')return next();
 const now=Date.now(),key=req.user.id,entry=hits.get(key);
 if(!entry || entry.until<=now)hits.set(key,{until:now+60000,count:1});
 else if(++entry.count>15)return res.status(429).json({error:'Please wait a minute before making more changes'});
 if(hits.size>10000)for(const [k,v] of hits)if(v.until<=now)hits.delete(k);
 next();
});
const run = fn => async(req,res,next) => { try { res.set('Cache-Control','no-store'); res.json({data:await fn(req)}); } catch(e){next(e);} };
router.get('/evidence',run(req=>service.list(req.user.id)));
router.get('/connections',run(req=>service.connections(req.user.id)));
router.get('/inbox',run(req=>service.inbox(req.user.id)));
router.get('/meetings',run(req=>service.meetings(req.user.id)));
router.get('/review-queue',run(req=>service.reviewQueue(req.user.id)));
router.post('/evidence',express.raw({type:['application/pdf','image/png','image/jpeg'],limit:'5mb'}),run(req=>
 service.upload(req.user.id,metadata(req),req.body,req.get('content-type')?.split(';')[0])));
router.get('/evidence/:id/download',async(req,res,next)=>{
 try {
  const file=await service.read(req.user.id,req.params.id);
  res.set({'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="evidence.'+({'application/pdf':'pdf','image/png':'png','image/jpeg':'jpg'})[file.mime]+'"','Cache-Control':'private, no-store','X-Content-Type-Options':'nosniff'});
  res.send(file.buffer);
 }catch(e){next(e);}
});
router.post('/evidence/:id/share',run(req=>service.share(req.user.id,req.params.id,req.body)));
router.delete('/evidence/:id/share/:recipient',run(req=>service.revoke(req.user.id,req.params.id,req.params.recipient)));
router.delete('/evidence/:id',run(req=>service.remove(req.user.id,req.params.id)));
router.post('/evidence/:id/review',run(req=>service.review(req.user.id,req.params.id,req.body)));
router.put('/meetings/:id/followup',run(req=>service.followup(req.user.id,req.params.id,req.body)));
router.use((err,req,res,next)=>{
 if(res.headersSent)return next(err);
 console.error('Trust workflow request failed:',err.code||err.status||'unknown');
 const status=err.status||500;
 res.status(status).json({error:status<500?err.message:'Trust workspace unavailable. Check Phase 2 migration and try again.'});
});
module.exports=router;
