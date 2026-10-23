# Production candidate - abhi live execution approved nahi

Target: gqkjvxcyetesvqmjkuus. Staging fixture/baseline SQL production mein run nahi karni.
Preflight schema guards project identity ka cryptographic proof nahi hain.

## Files aur scope
- 02_PREFLIGHT_READ_ONLY.sql: expected baseline, RLS aur bucket prerequisites.
- 03_APPLY_CANDIDATE_NOT_YET_APPROVED.sql: one transaction mein Passport schema,
  RPC hardening, atomic claim submission, retained-evidence quota aur review metadata.
- 04_POSTFLIGHT_READ_ONLY.sql: RPC permissions, Passport RLS/grants/indexes aur quota.
- manifest.json: generated artifacts ke SHA256 hashes.

No dummy users or existing claims approved. Existing legacy evidence remains legacy.
One-shot apply; partial/already-applied schema par STOP, blindly rerun nahi.
Transaction failure par ROLLBACK; error inspect karein. New candidate create karke rehearse karein.

## Live se pehlay required
1. Fresh backup/recovery evidence aur schema drift confirm. Local SQL restore PASS
   full Auth service/Storage API restore proof nahi hai.
2. Reviewer production identity allowlist aur verified MFA ready ho; staging email nahi.
3. Private-file retention policy aur message-attachments bucket limits finalize karein.
4. Launch-enabled signup/profile, matching, messaging, meeting/billing/AI regression
   scope confirm karein. Disabled staging features ko tested assume nahi karein.
5. Production backend/client diff and env review. Compatible backend must own conversation
   creation; older browser RPC callers break after hardening.

## Approved rollout order
1. Maintenance window: affected writes/workers drain/pause; backup captures se coordinate.
2. Backend production mode NODE_ENV=production, SCALESCOPE_STAGING unset/false.
   Initial PASSPORT_ENABLED=false, PASSPORT_WRITES_ENABLED=false.
   Frontend VITE_PASSPORT_ENABLED=false and VITE_PASSPORT_STAGING unset/false.
3. Run read-only preflight and review outputs. Explicit approval required before next step.
4. Approved SQL session mein scalescope.production_release_confirmation setting exact
   target reference par set karke candidate execute karna hai. Confirmation command
   sirf approved execution handoff mein diya jayega, abhi apply file run na karein.
5. Run postflight. PASSPORT_REVIEW_METADATA_ENABLED=true on compatible backend.
6. Reviewer MFA + role identities ke saath controlled canary. Production feature routes/UI
   enable karna public users ko expose karta hai: separate canary allowlist implemented nahi.
   Broader activation ko approval aur maintenance boundary ke baghair canary na kahein.
7. Tested configuration deploy hone par Passport reads, phir writes enable; monitor errors.

## Incident response
PASSPORT_WRITES_ENABLED=false + backend restart/deploy; in-flight requests drain.
Zaroorat par PASSPORT_ENABLED=false aur frontend flag false deploy karein.
Evidence, audit, schema aur hardened RPC grants retain karein. Insecure grants restore nahi.
Database restore last resort hai: post-backup writes loss aur Storage consistency assess karein.
Feature flags puri website ki writes pause nahi kartay; meetings/billing/AI ka separate control hai.
