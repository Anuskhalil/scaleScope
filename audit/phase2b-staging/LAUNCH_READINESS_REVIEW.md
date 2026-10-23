# Trust Passport: launch readiness review

Decision: NO-GO for production Passport activation.
Scope: repository inspection plus recorded test evidence, not a fresh production schema audit.
No production changes, no schema execution, no hosted feature toggle changed in this review.

## Confirmed evidence

- Evidence follow-up: owner-only POST /api/passport/evidence/:id/withdraw added.
  Strict confirmation and ownership/private-purpose checks; database-clock tombstone
  only, no Storage removal. Existing trigger invalidates linked claims. Pause gate
  applies. UI confirms impact and preserves files/audit. 63 backend tests and lint
  passed; mocked browser cancel/confirm withdrawal passed. Hosted endpoint integration
  not yet tested; running backend requires restart before new route is active.
  Quota message corrected; retained 50-file limit unchanged. Atomic quota enforcement
  and retention cleanup policy are still open, not resolved by withdrawal.

- Follow-up supersedes finding 1 below: default-off production wiring is implemented,
  not activated. Backend PASSPORT_ENABLED=true mounts routes; non-staging writes also
  require PASSPORT_WRITES_ENABLED=true. Frontend VITE_PASSPORT_ENABLED=true exposes UI.
  Staging defaults preserved. No env files, deployed settings or production data changed.
  Backend 60/60, frontend flag test, lint and enabled/default builds passed.
  Production migration/canary validation is still required; flags must remain off.
  Next unresolved work: evidence lifecycle/quota and review policy.

- Isolated backend suite: 58 tests passed.
- Hosted synthetic claim lifecycle: user-reported 45 checks passed.
- Browser: owner upload/context, supported claim, investor needs-changes and corrected resubmission reported by user.
- Mocked Playwright: 390/1440 viewport interactions; draft cancel, upload failure/retry,
  submission, download action, reject cancellation/confirmation/history passed.
- Local disposable PostgreSQL: identical concurrent request deduplicated;
  conditional competing decisions had one winner. Not complete race coverage.
- Temporary API against hosted staging: pause/resume report has 21 passing entries.
  Claims/evidence/audit canonical snapshots unchanged, owner/reviewer bytes unchanged,
  anonymous denied; invalid resumed submission rejected. Auth sign-ins changed login records.
- Lint/build passed. Main bundle size warning remains. Production build currently omits
  staging-only Passport UI, so build success is NOT production Passport integration proof.

## Blocking findings and exact next changes

### 1. Production wiring is not implemented

backend/src/app.js mounts /api/passport only with SCALESCOPE_STAGING=true.
client/src/pages/TrustWorkspacePage.jsx shows Passport only with VITE_PASSPORT_STAGING=true.
backend/src/middlewares/passportWrites.js permits writes only in staging.
Do NOT set SCALESCOPE_STAGING=true on Render: this also changes backend binding,
route allowlist and workers. A separate default-off production feature flag is required.
Next: prepare isolated production configuration/route tests with feature OFF by default,
then a production migration package reconciled against a fresh read-only inventory.

### 2. Evidence lifecycle / quota contradiction

backend/src/services/trust.service.js upload counts all evidence, including tombstones,
checks count before inserting (not atomic), then caps at 50 with advice to remove a document.
Passport evidence cannot use legacy deletion, so this advice is not actionable.
Next: define active-file vs retained-audit quota and authorized withdrawal/tombstone flow.
Keep append-only history and do not physically delete evidence without retention policy.
Concurrent quota enforcement requires a database-side reservation/transaction, not just UI.

### 3. Review policy is provisional

backend/src/services/passportReview.js uses fixed 30-day expiry from application clock,
while decided_at uses PostgreSQL time. Reviewer decision reasons are not stored.
adminAccess checks confirmed email allowlist; no reviewer AAL2 requirement here.
Next: agree claim expiry/retention policy, use DB clock consistently, record reasons for
needs-changes/rejection, and define reviewer MFA/session enforcement and test it.
Do not market manual evidence review as identity, investment legitimacy or whole-profile proof.

### 4. Full release regression is incomplete

Staging disables meetings, billing and automatic AI; successful Passport checks do not
validate those workflows. Fresh signup, full investor profile edit, MFA-sensitive flows,
hosted matching parity, different-request supersession/evidence-removal races remain.
Next: test applicable enabled launch routes against staging, or explicitly keep excluded
features off for a scoped beta. Document each accepted exclusion.

### 5. Recovery and storage readiness incomplete

Feature pause/resume is tested; backup restore, Storage object restore, in-flight request
drain, and old-build compatibility with hardened RPCs are NOT proven.
message-attachments baseline lacks bucket MIME/size limits; absence of a current UI caller
does not prove that direct Storage policies are harmless.
Next: review existing bucket privileges/policies and upload callers before targeted hardening;
verify DB and Storage recovery separately. Never loosen RPC grants as an emergency rollback.

## Nonblocking polish / scope-controlled limitations

- Component-only screenshots do not establish full authenticated navigation/mobile layout.
- Claim list/history have fixed 100-row limits, no pagination.
- Frontend offers claim kinds for both roles; backend rejects role-incompatible kinds.
- Current support status in history is not a live public verification badge.
- Bundle optimization is pending but not evidence of authorization failure.

## Deployment sequence, after blockers are resolved

1. Preserve and verify current production DB + Storage recovery paths.
2. Capture fresh production inventory read-only; compare exact dependencies.
3. Review default-off production migration and application diff; obtain explicit approval.
4. Apply approved additive migration; keep feature off, verify RLS/function ACLs.
5. Deploy backend/frontend with production-specific flags, never staging credentials.
6. Authorized canary accounts only; verify errors, audit records, privacy and messaging.
7. Enable wider access after canary acceptance. On incident pause Passport mutations,
   retain evidence/audit and hardened grants; drain requests before declaring pause complete.

## Next work order

First prepare default-off production wiring and tests WITHOUT enabling/deploying it.
Then resolve evidence lifecycle/quota and review-policy requirements.
Hosted rollout is not authorized by this report. No further manual user test is required
just to repeat the already-recorded supported/needs-changes/rejected claim flow.
