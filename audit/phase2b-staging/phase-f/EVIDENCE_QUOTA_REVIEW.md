# Retained evidence quota proposal

Status: LOCAL TESTED; NOT APPLIED TO HOSTED STAGING OR PRODUCTION.

## CREATE decision
evidence_storage_quotas is a private transactional counter per existing profile.
A row counter is needed because count-then-insert in application code races.
Counter rows cannot be read/modified directly by anon/authenticated/service_role.
The narrowly scoped SECURITY DEFINER trigger has empty search_path and revoked EXECUTE.
RLS enabled, no browser policies. Existing evidence and audit tables remain authoritative.

## Behavior
50 retained evidence records per owner, across legacy and Passport evidence.
Tombstones still count: withdrawal does not remove retained Storage bytes.
Existing owners already over 50 are preserved but cannot upload more.
Migration locks trust_evidence while backfilling counts and creating the trigger.
INSERT increments conditionally; failed insert rolls back counter changes.
Physical DELETE decrements; existing Passport deletion restrictions are not removed.
Owner transfer is now rejected. No current supported transfer workflow was identified.
DB trigger serializes competing inserts on the same counter, across backend instances.
This protects committed evidence rows, NOT transient Storage upload bytes.
Storage upload still precedes row insert; failed row insert attempts Storage cleanup.
Cleanup failure is surfaced, but orphan reconciliation/retention remains required.

## Local evidence
Disposable network-disabled PostgreSQL baseline + Passport + submission migration.
Two sessions at count 49: one successful insert, one quota rejection, rows/counter=50.
Tombstones keep count=50; client counter reads and service counter writes denied.
Existing submission idempotency and conditional review concurrency tests also passed.
63 backend tests pass; new hosted migration and API concurrency test still required.

## Review before any hosted apply
Exact existing table/owner nullability, current grants/triggers, table owner and deployed
upload cleanup behavior must be checked. This proposal assumes migration owner postgres.
Inspect retained counts; schedule lock window. Apply in staging first with approval.
Do not run this proposal on production from this document.

## Rollback approach
Prefer disable uploads and keep quota enforcement/counters.
If removing this migration is explicitly approved, first pause all upload writers,
drain in-flight uploads, capture counts, then in one transaction lock trust_evidence,
drop only evidence_storage_quota_trg, enforce_evidence_storage_quota(), and
evidence_storage_quotas (no CASCADE). No evidence/audit/storage deletion.
Removal reintroduces quota races, so uploads must stay paused until a replacement exists.
Counter rollback execution and hosted recovery are not yet tested.

