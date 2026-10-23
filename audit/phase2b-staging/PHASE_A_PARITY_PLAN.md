# Phase A: Staging Baseline Parity Plan
Date: 2026-10-04

## Decision
STOP: schema parity is not met. Do not run Phase 2B proposal migrations.
Production: gqkjvxcyetesvqmjkuus. Staging: sopklyxvzmungxwgboqs.
Identity is based on the user's export labels, not an authenticated connection.

## Evidence
Production files (12)-(23) map to Q01-Q12.
Staging files (24)-(32) map to Q01,Q02,Q03,Q05,Q06,Q07,Q08,Q09,Q11.
User explicitly reported empty Q04,Q10,Q12; no CSV was supplied for these.
Production has 43 public tables; staging has none.
All 23 inventoried public functions are absent from staging.
Production has 117 inventoried policies; staging has none in the queried scope.
Production has five private buckets; staging has none.
Q09 contains 29 vs 8 trigger records. Managed triggers must not be blindly replaced.
Q11 matches only migration table columns; it does NOT prove migration history parity.
See snapshot-comparison.json for source hashes and per-query differences.
Managed schema column/default-ACL differences require separate assessment, not copying entire managed schemas.

## Safe manual baseline plan (approval required before preparation/application)
1. Preserve production unchanged. Work only in the staging dashboard; confirm URL reference before every script.
2. Prepare version-controlled BASELINE SQL from exported columns, constraints, functions, triggers, policies and ACLs, cross-checked with repository definitions. Do not use the passport proposal as a baseline.
3. Resolve missing catalog coverage (extensions/versions, event triggers, sequence properties, custom types beyond enums, publications and dependencies) with additional read-only SQL if needed. These exports are inventory, not a guaranteed restorable dump.
4. Recreate application objects in dependency order: required extensions/types, tables/defaults, functions and foreign keys, indexes, RLS/policies/grants, then custom triggers. Review circular dependencies explicitly.
5. Preserve platform-owned auth/storage/realtime objects. Recreate only application-owned customizations, including the signup trigger and Storage policies, after dependency review.
6. Create only empty bucket configurations matching production. Never copy users, documents, object records or provider secrets. Keep buckets private.
7. Review unsafe legacy RPC EXECUTE grants explicitly: exact reproduction would retain known vulnerabilities. Restrict staging exposure and use synthetic data only; document any intentional deviation rather than calling it exact parity. RPC hardening remains a separate approved phase.
8. Re-export staging Q01-Q12; compare application dependencies, RLS and privileges. Document managed-platform differences separately.
9. Once baseline is verified, prepare synthetic founder/investor/reviewer accounts with staging-only credentials; verify signup trigger role handling first. No real records or files.
10. Stop after Phase A acceptance and request approval for Phase B rehearsal.

## Not established
No database connection or SQL execution occurred. No user/file rows were inspected.
Staging Auth/provider settings, record counts, API isolation and synthetic identities are not verified by these catalogs.
Temporary live access and matching logic were not changed.
