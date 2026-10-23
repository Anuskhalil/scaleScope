const KINDS = new Set(['account_control','professional','education','startup','firm','traction','investment_history']);
const FIELDS = 'id,claim_kind,passport_state,passport_claim,decided_at,expires_at';
function safeClaim(row, current, now=Date.now()) {
  if (current !== true || row.passport_claim !== true || row.passport_state !== 'supported' || !KINDS.has(row.claim_kind)) return null;
  const expiry=Date.parse(row.expires_at), decided=Date.parse(row.decided_at);
  if (!Number.isFinite(expiry) || !Number.isFinite(decided) || expiry<=now || decided>now || decided>=expiry) return null;
  return {kind:row.claim_kind,status:'supported',reviewedAt:row.decided_at,expiresAt:row.expires_at};
}
function createPassportSummary(db) {
  return async function ownSummary(userId) {
    const {data,error}=await db.from('profile_verification_checks').select(FIELDS)
      .eq('user_id',userId).eq('passport_claim',true).eq('passport_state','supported').order('submitted_at',{ascending:false}).limit(100);
    if(error) throw error;
    const claims=[];
    for(const row of data||[]) {
      // Database predicate checks consent, current version, active owner and evidence.
      const result=await db.rpc('passport_claim_is_current',{p_check:row.id});
      if(result.error) throw result.error;
      const claim=safeClaim(row,result.data);
      if(claim) claims.push(claim);
    }
    return {claims,scope:'claim-specific',publicBadgesEnabled:false};
  };
}
module.exports={createPassportSummary,safeClaim};
