# Phase D database security tests

Date: 2026-10-07. Target: scaleScope-Staging / sopklyxvzmungxwgboqs ONLY.
Phase C checkpoint ka matlab application ko stop karna nahi. Applied staging RPC
hardening active hai; next phase ke liye separate approval ka wait tha.

## Scope

security.sql existing Phase B/C schema par real PostgreSQL roles aur RLS use karta
hai, not mocks. All fixtures, role changes, temp helpers and test approvals roll back.
No schema migration, permission relaxation, new badge, public score or production write.
Known synthetic IDs + exact emails guard accidental targeting; operator MUST still
check Dashboard project reference. No production profiles may exist in this target.

Checks cover:
- RLS and table/column write/TRUNCATE privileges across five verification surfaces.
- New verification trigger/predicate and scoped RPC EXECUTE/path restrictions.
- Legacy owner reads, cross-owner hidden rows, raw Passport/browser privacy.
- Owner evidence flow is backend-mediated; baseline has no permissive direct-read
  trust_evidence policy, so owner direct SQL evidence SELECT returns no rows too.
- Browser cannot approve/forge actor/edit/delete/truncate audit.
- Service path supports valid claims and multi-claim evidence but cannot directly
  insert/change/delete/truncate audit. Trigger-driven audit writes succeed.
- Cross-owner links and evidence_grants sharing rejected, provenance immutable.
- Self-review, skipped transitions, stale/superseded/tombstoned claims, duplicate
  versions, rejection/needs_changes/revocation/expiry lifecycle, terminal revival.
- Audit events and raw fixture data absence. No blanket claim of anonymization:
  pseudonymous IDs and hashes remain private metadata with retention implications.

## Run

1. Open scaleScope-Staging SQL Editor, New query.
2. Run complete security.sql; do NOT replace ROLLBACK with COMMIT.
3. Expected final result: PHASE_D_SECURITY_PASS_ROLLED_BACK.
4. Share final result/error. Some clients show the preceding security_report JSON too;
   it lists every test. Local-results.json captures the complete local report/output.
5. Do not run old proposal security SQL or repeat baseline/migrations.

test_local.py reconstructs isolated baseline + B/C in network-disabled PostgreSQL17.6,
runs tests twice and asserts original row snapshots unchanged. No real files or keys.
All temporary testing identities use the existing synthetic fixture UUIDs only.

## Remaining and limits

Hosted Phase D execution is pending until user returns its result. SET ROLE SQL tests
do not test JWT cryptography or Storage endpoints; those require the actual API.
Phase E tests Storage; Phase F tests complete application/socket flows; Phase G tests
empty/data-bearing schema rollback; Phase H reviews deployment readiness.
This is not a comprehensive security audit of all unrelated legacy tables/RPCs.
Concurrent transaction races, backend reviewer allowlist/actor attribution and actual
file deletion are not proven by this single-session suite. Expiry transition/eligibility
tests do not establish a periodic expiry worker. No security-critical test is silently
skipped; scope limits above are explicit and must remain in the final review.
