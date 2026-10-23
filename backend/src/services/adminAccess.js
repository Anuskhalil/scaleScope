const supabase=require('../config/supabase');
function isReviewAdmin(user,emails=require('../config/reviewerEmails').reviewerEmails()) {
 const allowed=emails.split(',').map(x=>x.trim().toLowerCase()).filter(Boolean);
 return !!(user?.email_confirmed_at && user?.email && allowed.includes(user.email.toLowerCase()) && require('./reviewerSession').reviewerSessionAllowed(user.id));
}
async function isAdminId(id) {
 const {data,error}=await supabase.auth.admin.getUserById(id);
 return !error && isReviewAdmin(data?.user);
}
module.exports={isReviewAdmin,isAdminId};
