const router=require('express').Router();
const auth=require('../middlewares/auth.middleware');
const matching=require('../services/matching.service');
router.use(auth);
router.post('/evaluate',async(req,res,next)=>{
 try {res.json({data:await matching.evaluate(req.user.id,req.body?.candidateIds)});}
 catch(error){next(error);}
});
module.exports=router;
