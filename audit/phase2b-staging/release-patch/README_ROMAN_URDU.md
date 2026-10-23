# Staging release patch

Target ONLY: scaleScope-Staging, sopklyxvzmungxwgboqs.
Do not run on production gqkjvxcyetesvqmjkuus.
No hosted SQL was executed by preparation.

1. Stop local staging backend or set PASSPORT_WRITES_ENABLED=false and restart it.
   Keep PASSPORT_REVIEW_METADATA_ENABLED=false until apply finishes. Drain in-flight requests.
2. In staging SQL Editor run 01_REHEARSAL_STAGING_ONLY.sql.
   Expected RELEASE_PATCH_REHEARSAL_PASS_ROLLED_BACK; no persistent schema change.
   If error: ROLLBACK; report error. Do not run apply.
3. After rehearsal passes, run 02_APPLY_STAGING_ONLY.sql.
   Expected RELEASE_PATCH_STAGING_APPLIED.
4. Run 03_VERIFY_READ_ONLY.sql. All four values must be true.
5. Set backend/.env.staging PASSPORT_REVIEW_METADATA_ENABLED=true and restore intended
   PASSPORT_WRITES_ENABLED=true, then restart npm run start:staging.
6. Hosted API checks must pass before any production package/activation.

Identity guards are not cryptographic target proof. Confirm dashboard project reference.
Apply is deliberately non-idempotent to detect partial/previous application.
Both changes are in one transaction; no evidence or history is deleted.
Existing retained counts >50 are preserved, future uploads denied until retention review.
Rollback rehearsal verifies schema/counter/ACL checks, not all live workflow behavior.
Concurrency and claim lifecycle are tested separately in disposable local PostgreSQL.
Production remains default-off.

Still-required release decisions/checks:
- Reviewer MFA/session policy and private-file retention/cleanup policy.
- Signup/profile-edit regressions, enabled meeting/billing/AI scope.
- Production schema inventory and DB/Storage backup restoration availability.
- Hosted withdrawal, review reasons, clock handling and upload-limit integration.
Do not mark these complete from compilation or mock-browser tests.

