const {AsyncLocalStorage}=require('node:async_hooks');
const sessions=new AsyncLocalStorage();
function requiresMfa(env=process.env){
 return env.NODE_ENV==='production'||env.REVIEWER_MFA_REQUIRED==='true';
}
// Call only after auth.getUser has validated this same bearer token remotely.
function withValidatedSession(token,user,next){
 let session={id:user.id,aal:null,expires:0};
 try{
  const claims=JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());
  if(claims.sub===user.id && Number.isFinite(claims.exp))session={id:user.id,aal:claims.aal,expires:claims.exp};
 }catch{}
 return sessions.run(session,next);
}
function reviewerSessionAllowed(id,env=process.env){
 if(!requiresMfa(env))return true;
 const session=sessions.getStore();
 return !!(session?.id===id && session.aal==='aal2' && session.expires>Date.now()/1000);
}
module.exports={requiresMfa,withValidatedSession,reviewerSessionAllowed};
