# Review feedback and database-clock proposal

Status: IMPLEMENTED BEHIND DEFAULT-OFF FLAG; LOCAL TESTED; HOSTED NOT APPLIED.
Do not enable PASSPORT_REVIEW_METADATA_ENABLED until review_metadata_PROPOSAL.sql
has been reviewed/applied on staging and post-apply checks pass.

Adds one nullable decision_reason column to existing profile_verification_checks.
No parallel review table. Existing reasonless historical decisions remain intact.
A BEFORE trigger ordered before the existing guard derives decided_at and expires_at
from PostgreSQL clock at final decision. Existing 30-day duration is preserved, not a
newly approved business retention/expiry policy.
Needs-changes/rejected decisions require 10-700 character reason; supported optional.
Reason cannot be rewritten on unchanged state or invalidation. Existing decision audit
event remains; reason is retained on the immutable reviewed claim, not copied to a
public DTO or generic metadata. New claim versions carry fresh assessment.
Owner/authorized reviewer context returns reason only after existing access checks.
No reason in public summary. UI confirms decision and shows feedback to owner.

Migration changes trigger behavior globally after apply. Enable updated application
flag immediately during a controlled review-write pause; old callers without a
reason will fail for needs-changes/rejected. Never silently fall back if column missing.
The default-off app remains compatible with current hosted schema before migration.

Tests: backend 64/64 and lint PASS; disposable PostgreSQL migration plus existing
submission/tombstone/concurrency/quota checks PASS. Browser mock tests cover reason
required before confirming rejection; this does not replace hosted API acceptance.
Pending: hosted owner-only reason disclosure, old-client rejection, reviewer session/MFA,
and final duration/privacy/retention policy. No hosted migrations or flags changed.
Rollback: pause writes first; preserve decision_reason records. Do not drop feedback
or weaken audit guards just to restore an old application build. Prefer forward repair.

