function passportEnabled(env=process.env) {
 return env.SCALESCOPE_STAGING==='true'||env.PASSPORT_ENABLED==='true';
}
function passportWritesEnabled(env=process.env) {
 if(!passportEnabled(env))return false;
 if(env.SCALESCOPE_STAGING==='true'&&env.PASSPORT_WRITES_ENABLED===undefined)return true;
 return env.PASSPORT_WRITES_ENABLED==='true';
}
module.exports={passportEnabled,passportWritesEnabled};
