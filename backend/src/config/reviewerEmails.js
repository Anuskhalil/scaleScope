const fs=require('node:fs');
const path=require('node:path');
const dotenv=require('dotenv');
function reviewerEmails(env=process.env,read=()=>fs.readFileSync(path.resolve(__dirname,'../../.env'),'utf8')) {
 let value=env.ADMIN_REVIEW_EMAILS||'';
 // Local operator edits take effect on the next request; never read local files in hosted production.
 if(env.NODE_ENV!=='production'&&env.NODE_ENV!=='test'&&env.SCALESCOPE_STAGING!=='true') {
  try{value=dotenv.parse(read()).ADMIN_REVIEW_EMAILS||'';}catch{return '';}
 }
 return value;
}
function reviewerEmailAllowed(email){return !!email&&reviewerEmails().split(',').some(x=>x.trim().toLowerCase()===email.toLowerCase());}
module.exports={reviewerEmails,reviewerEmailAllowed};
