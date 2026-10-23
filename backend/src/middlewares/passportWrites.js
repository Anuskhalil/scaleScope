const {passportWritesEnabled}=require('../config/passport');
function createPassportWriteGate(env=process.env) {
 return (req,res,next)=>{
  if(['GET','HEAD','OPTIONS'].includes(req.method)||passportWritesEnabled(env))return next();
  res.set('Cache-Control','private, no-store');
  return res.status(503).json({code:'PASSPORT_READ_ONLY',error:'Trust Passport is temporarily read-only. Existing claims and authorized downloads remain available.'});
 };
}
module.exports={passportWritesEnabled,createPassportWriteGate};
