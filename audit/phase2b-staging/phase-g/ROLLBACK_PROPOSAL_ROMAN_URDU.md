# Phase G: rollback proposal, not execution

Status: PREPARATION ONLY. Hosted staging aur production par koi rollback execute nahi hua.
Phase F acceptance abhi pending hai. Is document ko SQL run instruction na samjhein.

## Recommended rollback: feature off, evidence retained

Passport frontend visibility aur backend Passport mutation endpoints dono disable karein.
Sirf frontend hide karna rollback nahi: API ko server-side reject bhi karna hoga.
Existing profile-review admission gate ko bypass/approve na karein.
Private evidence download ka owner/reviewer authorization intact rakhein.
Claims, versions, evidence links, audit history aur private Storage files preserve karein.
Automated deletion, DROP COLUMN, DROP TABLE, TRUNCATE ya bucket public karna forbidden.

Current Passport routes staging-only hain. Staging launcher ab optional
PASSPORT_WRITES_ENABLED=false ko backend tak pass karta hai. Backend authenticated
Passport mutations ko 503 PASSPORT_READ_ONLY se deny karta hai; reads unchanged.
Workspace response se frontend forms/review actions disable hote hain.
Unset staging value true preserves current behavior; invalid values deny writes.
Config change backend restart ke baad effective hai; already-running writes ko
cancel nahi karta. In-flight requests drain karna rehearsal ka separate step hai.
Production feature-toggle rollout abhi implement/verify karna baqi hai.

Local validation: isolated backend suite 58/58 PASS. New HTTP middleware test
blocks POST/PUT/PATCH/DELETE with zero handler writes, retains reads, and resumes
when enabled. This is not hosted database rollback/recovery proof. No .env changed.

Local PostgreSQL follow-up: submission rehearsal rollback and committed local apply
passed in a disposable network-disabled postgres:17.6 container. Two concurrent
sessions submitted the same request: one claim/version remained. Two conditional
review decisions competed: one row updated, the other zero, first decision preserved.
First transaction was observed waiting in pg_sleep before competing query started.
Container stopped after tests. See phase-f/submission-local-results.json.
Hosted concurrency, different-request supersession races, and in-flight pause drain
remain separate gaps; these tests do not establish complete race freedom.

## Security hardening stays

Phase C RPC EXECUTE restrictions aur SECURITY INVOKER protections revert na karein.
Old app build deploy karne se pehlay hardened conversation RPC compatibility test karein.
Phase B private evidence, tombstone, immutability aur audit safeguards retained rahenge.
New schema additive reh sakti hai; emergency application rollback ko schema deletion ki zaroorat nahi.

## Rehearsal acceptance cases

1. Snapshot exact schema/function ACLs, relevant row counts and selected synthetic audit history.
2. Disable Passport submissions/reviews; direct API attempts must fail without writes.
3. Existing approved founder/investor login, connection and messaging still work.
4. Pending profile restrictions stay enforced.
5. Owner and authorized reviewer private downloads still work; investor/anonymous denied.
6. Re-enable feature; previous claims, versions, evidence bytes and audit history unchanged.
7. Repeated requests remain idempotent; no old pending decision overwrites a newer decision.
8. Restore application configuration; compare snapshots and record pass/fail.

Rehearsal disposable local clone first; hosted staging execution needs separate approval.
Real customer data, keys and uploaded documents must not be copied into local test fixtures.
Database restore availability and Storage-file recovery must be checked separately before production.

## Remaining blockers before rollout

- Authenticated full-app mobile/desktop UI acceptance beyond mocked Passport component.
- New signup, investor profile update, MFA-sensitive reviewer/session regressions.
- Hosted before/after matching parity and concurrent claim/review tests.
- Applicable meetings/AI regression or explicit disabled-launch scope.
- message-attachments size/MIME policy and application compatibility review.
- Approved claim-expiry policy (current review service uses provisional 30 days).
- Test expiry clock consistency; decision uses database clock, expiry uses application clock.
- Reviewer decision reason is not currently collected/stored; product decision pending.

No production-ready claim until each item has evidence or an explicit scoped deferral.
