# Phase 2A Reconciliation + Phase 2B Proposal

**Status: PROPOSAL ONLY. Koi migration, SQL test ya database write execute nahi hua.**
Existing application code bhi unchanged hai. Sirf offline CSV analysis aur proposal artifacts banaye gaye.

## A. Live Access Confirmation

Ye findings aapke supplied Supabase exports par based hain, direct live connection par nahi. Export ka timestamp/project identifier CSV mein nahi, is liye snapshot ke baad ki changes confirm nahi. Export complete row counts 100-row limit par stop nahi hotay. Q01-Q12 headers se mapping confirm hui:

| Query | Filename suffix | Rows |
| --- | --- | --- |
| Q01 relations | no suffix | 104 |
| Q02 columns | (1) | 624 |
| Q03 constraints/indexes | (2) | 443 |
| Q04 policies | (3) | 117 |
| Q05 effective privileges | (4) | 2943 |
| Q06 ACL/roles/schema | (5) | 113 |
| Q07 routine security | (6) | 43 |
| Q08 routine definitions | (7) | 43 |
| Q09 triggers | (8) | 29 |
| Q10 buckets | (9) | 5 |
| Q11 migration catalog | (10) | 4 |
| Q12 status/dependencies | (11) | 196 |

Exact normalized inventory, row counts aur SHA256 provenance: `INVENTORY_RECONCILIATION.json`. Original Q08 remains function-source evidence; derived JSON source bodies duplicate nahi karta. Offline reproducible script: `reconcile_exports.py`.

## B. Live Core Schema Inventory

All ten requested core tables snapshot mein exist karti hain. RLS enabled aur FORCE RLS false hai. Existing verification tables Phase 1 repository audit mein absent thin, lekin live exports mein present hain:

- `profile_verifications`: UUID PK, unique user_id -> profiles ON DELETE CASCADE; role, status, trust_score, required_passed, summary, failures/warnings, link counts, timestamps.
- Header status constraint: pending/verified/partially_verified/needs_review/failed. Trust score 0-100 legacy hai.
- `profile_verification_checks`: UUID PK, user_id -> profiles CASCADE, nullable verification_id -> profile_verifications CASCADE; role, check_type, target_key/label/value, status, score, message, metadata, timestamps.
- Check status constraint: passed/failed/warning/skipped. Existing table claim lifecycle ko directly represent nahi karti.
- `trust_evidence`: owner auth FK, immutable-intended hash/path but no existing immutability trigger, category/claim, size/MIME, technical status, reviewer outcome.
- `evidence_grants`: evidence+recipient composite PK, expiry/revocation; evidence deletion CASCADE.
- `evidence_reviews`: evidence FK CASCADE; file deletion existing review history remove kar sakti hai.
- `profile_reviews`, `profile_review_history`, `evidence_ai_reviews`: account-admission and AI queue, not claim passport.
- `meeting_followups`: unrelated relationship workflow, unchanged.

Additional live tables: `profile_evidence_files`, `connected_identity_accounts`, `trust_scores`, `startup_readiness_scores`, `matching_preferences`, `audit_log`, `user_auth_tracking`, retired role tables and other collaboration/billing tables. Full exact columns/defaults/FKs/indexes are in inventory Q02/Q03, not approximated from code.

`connected_identity_accounts` already has provider/user identifier, email/name/profile URL, verified_at and metadata. Ye existing identity-link storage reuse candidate hai, lekin OAuth code/claim semantics re-check honge; populated rows/authenticity assume nahi ki.

## C. Live RLS Matrix

| Table group | Browser access policy | Implication |
| --- | --- | --- |
| profiles | authenticated reads non-deleted rows or own | Eligible row ka email/social columns bhi readable; UI hiding privacy control nahi |
| founder_profiles | public OR own; role-aware restrictive writes | Public full row including metadata exposed to authenticated reader; active flag SELECT mein required nahi |
| investor_profiles | public+active OR own; role-aware writes | Metadata/financial preferences same full-row boundary |
| profile_verifications/checks | authenticated owner SELECT | No deployed client write policy found; grants still overly broad |
| profile_evidence_files | owner ALL | Client editable verification_status ko authority na banayein |
| connected_identity_accounts | owner SELECT | Ownership-link data not public; legacy values not automatically trusted |
| trust/evidence grant/review + admission tables | no browser table grants | Backend authorization required; service role bypasses RLS |
| storage.objects/trust-evidence | restrictive deny anon/auth for this bucket | Browser cannot bypass backend download gate |

Policies + effective privileges both inspected. FORCE RLS false alone bug nahi, lekin SECURITY DEFINER postgres owner can bypass ordinary table RLS. Service role deliberately privileged hai.

## D. Database Grants & RPC Security

### Highest priority: callable arbitrary-user functions

1. **create_conversation_with_participants(uuid,uuid,text)**: SECURITY DEFINER postgres, anon/auth EXECUTE true. Caller identity, approval and connection validation body mein absent; caller-supplied participant IDs insert hote hain. Supplied triggers mein conversations par admission guard nahi. **High: unauthorized conversation construction**. Proposal revokes browser execution; backend service role keeps it.
2. **increment_login_tracking(uuid)**: SECURITY DEFINER, empty search_path configuration, anon/auth EXECUTE. Any supplied user ID mutate kar sakta hai. **Medium: activity integrity**. Self-only wrapper proposed; current LoginPage call remains supported.
3. **get_user_profile(uuid)**: SECURITY DEFINER, no fixed search_path, anon/auth EXECUTE, row_to_json full rows without owner checks. However body refers to `public.user_profiles`, which Q01 does not list. **High-risk latent disclosure contract, currently appears broken**, not a proven successful data leak. Revoke public execution; do not restore by simply creating that view.
4. **soft_delete_user(uuid)**: SECURITY DEFINER, arbitrary user UUID, anon/auth EXECUTE. Body references profiles.onboarding_completed and metadata, absent in Q02. **High-risk latent destructive contract, currently appears broken**. Revoke execution; do not test on real users.
5. **refresh_matching_scores()**: SECURITY DEFINER, anon/auth EXECUTE. Target matching_candidate_scores absent in Q01. **Medium latent workload/availability risk**, not proven functioning refresh. Revoke browser execution.

### Existing guarded paths

- current_profile_approved: fixed empty search_path, authenticated execute, no caller-supplied ID; returns own approval boolean. Keep.
- claim_review_job, decide_profile_review, record_evidence_review: service-only execute, SECURITY INVOKER. Keep separate from passport.
- queue_profile_review, queue_evidence_analysis, guard_reviewed_connection, capture_matching_request_event: fixed-path trigger functions, browser execute revoked.
- handle_new_user and log_profile_changes: trigger-returning functions with broad EXECUTE. Normal RPC invocation cannot execute them like scalar functions; do not exaggerate as equivalent to arbitrary-user RPCs.
- rls_auto_enable returns event_trigger, not normal RPC. Registration/DDL attachment is separate from execute grant.
- 19 Storage routines shown are SECURITY INVOKER. Do not bulk revoke platform helpers needed by Storage policies.
- Other update/sync trigger helpers are not evidence of an admin API.

### Broad table grants

Q05 shows anon/auth TRUNCATE and other unnecessary privileges on legacy verification tables. RLS does not govern TRUNCATE. This is excessive privilege even though PostgREST does not offer an ordinary truncate endpoint; **not proof of an anonymously callable truncate HTTP route**. Proposal narrows only reused verification tables. Similar legacy grants on profile_evidence_files and other tables need separate scoped review; not silently changed.

## E. Storage Security Inventory

| Bucket | Public | Limit | Pipeline |
| --- | --- | --- | --- |
| trust-evidence | false | 5 MiB | PDF/PNG/JPEG; backend byte checks; grant-based access |
| profile-documents | false | 15 MiB | Office/PDF/images/text/CSV/spreadsheets; client role forms; path policies |
| profile-evidence | false | 10 MiB | Older Office/PDF/image pipeline and owner path policies |
| avatars | false | 5 MiB | Multiple public/auth SELECT policies; test actual avatar retrieval path |
| message-attachments | false | no configured limit/types | Outside passport scope; review separately |

No document opened/downloaded. Private bucket does not mean equivalent upload validation. trust-evidence server checks signature/size/hash; malware clearance still absent. Profile-documents forms use client validation (10 MiB) while bucket accepts 15 MiB. Its multiple permissive owner-path rules include suffix matching; stricter new rule alone would not neutralize older permissive rules.

Recommendation: **extend trust-evidence**, do not migrate/copy existing documents automatically. Passport evidence needs a fresh explicit private-purpose upload, not reclassification of a previously shared document.

## F. Existing Verification/Review Infrastructure

### Reuse answers

1. Claim-specific verification: checks table can be extended; add many-to-many evidence links.
2. Owner/admin-only evidence: private bucket and backend pipeline support it, but new purpose guard necessary.
3. Connected users currently can receive evidence grants: yes.
4. Prohibit passport sharing: new immutable private-purpose flag + DB grant trigger + backend denial.
5. Existing history survives file deletion: evidence_reviews currently cascades, so no.
6. One file/multiple claims: new relation provides it, no duplicate file upload table.
7. Existing immutable provenance: hash stored, but source mutation not currently blocked; proposed trigger locks hash/path/owner/type/size for passport purpose.
8. Minimal changes: header consent, check lifecycle, evidence purpose/tombstone, link relation, durable minimal audit.

Current reviewer outcome on evidence is NOT automatically passport support. Existing AI queue remains assessment only. No grandfathering legacy verified=true/trust_score into badges.

### Admin authority

No dedicated app admin allowlist table evident in relevant catalog. PostgreSQL platform roles are not product reviewers. Current backend verified Auth email allowlist stays sole reviewer authority. DB receives trusted service calls; proposed decision_actor is not proof of admin access by itself. Backend must validate it from authenticated actor, never request body.

## G. Repository vs Live Schema Drift

Offline comparison found all locally CREATE-defined tables present and ten local function bodies equal after whitespace/comment normalization. This is source comparison, not proof every migration statement/version ran.

| Repository file | Snapshot reconciliation |
| --- | --- |
| phase1_matching.sql | matching_events + capture_matching_request_event present; body matches |
| phase2_trust_workflow.sql | 4 tables, grant/review FKs, private bucket, restrictive policy, review RPC present; RPC body matches |
| profile_review_gate.sql | 3 tables, 5 functions and profile/evidence triggers present; bodies match |
| profile_review_actions.sql | current_profile_approved body matches; current action policies visible |
| supabase_security_hardening_v1.sql | guard_client_profile_fields body matches and profile triggers present |
| supabase_two_role_migration.sql | role enforcement body matches; legacy tables retained |
| supabase_profile_matching_v2.sql | structured role metadata and matching infrastructure present; cannot prove historical backfill without user-data inspection |
| *_tests.sql / *_security_check.sql | Test scripts are not deployed objects; past execution not inferred |

**Live-without-local-definition:** profile_verifications, profile_verification_checks, profile_evidence_files, connected_identity_accounts and several baseline/legacy tables/functions. No authoritative base migration for these exists in current checkout. Do not CREATE replacements.

**Broken compatibility references:** user_profiles and matching_candidate_scores not found; soft_delete_user references absent base columns. handle_new_user is attached to auth.users and defaults missing role to student, while two-role registration trigger rejects that role. This is a registration regression risk for missing metadata, not something to fix inside passport DDL.

Q11 only reports Storage migration table structure. It does not supply application migration version rows or a ledger of manual SQL Editor executions. No definitive migration timestamp/version claim is made.

Review-reset concern confirmed: queue_profile_review excludes four top-level fields only. metadata.format_checked_at remains part of comparison, so metadata-only format timestamps can reset account review. Passport tables have no such profile trigger attached; proposed changes will not reset account approval by themselves.

## H. Privacy/Security Risks

**Critical:** No confirmed critical exploit demonstrated; no live exploit attempted.

**High:** arbitrary participant creation RPC; unsafe latent profile-read/delete RPC contracts; authenticated full-row profile metadata exposure; passport private lifecycle would be unsafe if enabled before backend deletion/sharing changes.

**Medium:** arbitrary login tracking; unnecessary table grants; absent malware scanning; whole-profile timestamp requeue; legacy mutable profile_evidence_files verification field; unsupported legacy dependencies/default student trigger.

**Low/operational:** large old policy surface, migration history ambiguity, chunk/build debt outside this phase.

No actual breach, exfiltration or successful malicious invocation is claimed.

## I. Trust Passport Schema Decision

| Component | Decision | Why |
| --- | --- | --- |
| verification_requests | DO NOT CREATE | Extend per-user header + versioned check rows |
| profile_verifications | EXTEND EXISTING | Add optional consent timestamp; keep unique user_id |
| profile_verification_checks | EXTEND EXISTING | Independent passport lifecycle, field hash/version, source/date/expiry |
| trust_evidence | EXTEND EXISTING | Private purpose, immutable provenance, tombstone |
| profile_verification_evidence | CREATE NEW | Existing evidence_grants is recipient sharing, not a claim-evidence relationship |
| verification_badges | DO NOT CREATE | Backend derives safe current badges from supported, fresh checks |
| verification_audit_logs | CREATE NEW | Existing evidence_reviews cascades; account review history has different semantics |
| professional_email_challenges | DO NOT CREATE IN 2B | Email sending/challenge feature deferred; no unused schema now |
| connected_identity_accounts | REUSE LATER | Existing provider link record, not a challenge/token table |
| profile_evidence_files | DO NOT REPURPOSE | Separate legacy pipeline with editable status; no automatic trusted import |

Only **two new tables** proposed. No numeric passport score. AI Match percentage unchanged.

## J. Proposed Phase 2B Schema

Files 01-04 are proposals, not auto-run migrations. Scope is secure schema foundation, **not a working passport feature rollout**.

### State model

Legacy header/check statuses stay untouched. New checks marked passport_claim use status=skipped and score=0 exclusively to avoid asserting legacy success. New passport_state: submitted -> in_review -> supported/needs_changes/rejected; stale/revoked/expired as applicable. A resubmission creates the next immutable claim version. Old rows remain legacy forever.

Header lock serializes version assignment. Existing user+header mismatch rejected. Decision stage requires non-self actor, source and date; supported requires expiry. Manual evidence support requires linked current private evidence. Reviewer admin authorization remains backend responsibility.

Claim hash includes exact canonical relevant fields, normalized source identity, and mapping-version identifier. This hash is generated server-side, not trusted from the browser.

### Privacy/lifecycle

Existing owner reads of legacy checks remain; passport check rows backend-only via restrictive SELECT. New audit/link tables no browser grants/policies. Audit inserts only fixed-path trigger; service_role no mutate/truncate/insert privilege. PostgreSQL owner can administer tables: append-only is an application privilege boundary, not tamper-proof against database administrators.

Audit retains subject/check IDs and hashes, no raw document/claim/financial/email content. IDs are still personal data: retention/deletion obligations need policy approval. No cascading audit FK. Retention purge is separate privileged procedure, not exposed yet.

Fresh passport evidence immutable-purpose true; cannot convert shared old file. Recipient grants reject it. Soft-delete/tombstone invalidates supported claims in future service transaction before storage removal. External object deletion still needs reconciliation; SQL cannot observe Storage bytes magically.

### Public summary: backend DTO only

No public SQL view or client RPC in this phase. Proposed batch DTO:
- subjectId
- claim kind and precise scope label
- source class
- checkedAt / expiresAt
- status (supported/current only)

Must omit raw target_value, documents/paths, private emails, reviewer IDs/notes, hashes and provider payloads. Only latest version per field qualifies; current profile hash must match; expiry must be future; required evidence present and not tombstoned; profile visibility/deletion must permit display. Unknown/stale is not supported. Max batch100 with authorization/rate limits.

Use precise labels: Linked account control is NOT Identity Verified. Startup evidence reviewed is NOT guaranteed company legitimacy. Traction evidence reviewed is NOT financial audit. Universal badges require an explicit documented bundle of required claims, not a single passed URL.

### Mandatory application gates before enablement

The schema can be reviewed now, but **do not enable passport submissions until these are implemented/tested**:
1. API verifies subject from session and reviewer via existing adminAccess; MFA requirement chosen for admin; actor never browser supplied.
2. Atomic compare-and-set decision by expected state/version. Trigger validates transitions but does not replace request idempotency/admin check.
3. Field-specific hash comparison at every summary read; edit marks only affected claim stale. Do not tie it to whole-profile admission revision.
4. trust.service list/read/share ignores grants for private-purpose evidence. Delete must tombstone/invalidate before deleting storage; current implementation deletes storage before DB row.
5. reviewWorker must not send private-purpose evidence to Gemini without recorded processing consent; new analysis queue handling required.
6. Latest-version/expiry/evidence filters mandatory. No badge rendering until these tests pass.
7. Old verification writers elsewhere must not delete/upsert passport rows in bulk. Repo has no current references, but deployed legacy workers/functions outside checkout need operator confirmation.

Account-admission approval stays separate; optional passport never blocks matching/suggestions. Existing interaction gates stay unchanged.

## K. Phase 2B File Plan

### Proposal artifacts created now

- 01_schema_PROPOSAL.sql: extend 3 existing tables, 2 relations, RLS/grants/triggers.
- 02_rpc_hardening_PROPOSAL.sql: separately approved legacy callable RPC containment; login self-only.
- 03_rollback_PROPOSAL.sql: empty-state rollback, refuses nonempty data; ends ROLLBACK by default; security narrowing retained.
- 04_security_tests_PROPOSAL.sql: catalog assertions + dedicated staging fixture behavior tests; always ROLLBACK.
- INVENTORY_RECONCILIATION.json and reconcile_exports.py: offline evidence reconciliation.
- PROPOSAL_ROMAN_URDU.md: this document.

### Future existing application files (NOT changed)

- backend/src/app.js: mount passport router only after gates.
- backend/src/services/adminAccess.js: reuse verified-email authority, no duplicate admin list.
- backend/src/services/trust.service.js and trustRules.js: private-purpose read/share/delete + provenance.
- backend/src/services/reviewWorker.js and reviewAI.js: explicit consent, claim-scoped analysis, no auto approval.
- client/src/pages/AdminReviewPage.jsx: version-safe review UI; only API-derived actions.
- client/src/pages/EarlyStageFounderRolePages/FounderProfile.jsx and client/src/pages/InvestorProfile.jsx: optional claim submissions.
- client/src/components/ProfileReviewStatus.jsx: admission vs passport separation.
- client/src/pages/EarlyStageFounderRolePages/FindInvestorsPage.jsx: remove accepting_pitches-as-verification icon.
- client/src/pages/StudentRolePages/StudentViewProfile.jsx: safe summary only.
- client/src/App.jsx: optional verification workspace routes.
- client/src/services/founderService.js and investorService.js: field hash invalidation integration without alias renaming.
- client/src/services/intelligentMatching.js: retire latent verification boost paths, preserve authoritative score.
- client/src/auth/LoginPage.jsx: regression-test self-only tracking RPC, not auth redesign.
- client/src/services/studentService.js: retired direct conversation RPC consumer cleanup before RPC revoke rollout.

### Future new application files

- backend/src/routes/verification.routes.js
- backend/src/services/verification.service.js
- backend/src/services/verificationRules.js
- backend/test/verification.test.cjs
- backend/test/verificationRoutes.test.cjs
- client/src/services/verificationApi.js
- client/src/pages/VerificationPage.jsx
- client/src/components/VerificationSummary.jsx

shared/matching.mjs weights and account-admission migration bodies do not change.

## L. Blockers, Regressions and Validation

### Rollout order after approval

1. Confirm CSV snapshot project/environment, backup and no external legacy writer.
2. Fix/test backend private evidence lifecycle and reader gates in staging.
3. Separately approve RPC containment; test founder/investor connection-to-conversation path and self-only login tracking.
4. Apply reviewed schema in disposable staging only, then run security tests.
5. Approve privacy/retention/AI processing, test full owner/admin flows, then schedule production rollout separately.

### Expected regression risks

- Legacy direct-client conversation RPC call loses access; server-mediated active flows keep service execution.
- Legacy broad reads see only legacy checks; owner passport DTO needed before UI enablement.
- Old verification workers deleting all checks could break new history; no deployment until ownership contract confirmed.
- Whole-profile evidence AI trigger still exists; separate private-purpose consent handling required.
- Proposed evidence link RESTRICT prevents orphan deletion, but storage-first current delete is unsafe; cannot solve cross-system deletion with FK alone.
- Rollback after any passport data intentionally refuses to drop it. Disable feature and retain schema for forward fix.
- Empty-state rollback does not restore unsafe old grants/RPC exposure.
- Matching/current account approval/legacy is_verified unchanged. No existing user upgraded automatically.

### Tests delivered vs executed

Executed: offline CSV parser/reconciler only. No SQL, migration, rollback, destructive assertion, Auth fixture creation or Storage call executed. No PostgreSQL parser/server available for runtime syntax/behavior validation in this session. SQL is reviewable proposal, not production-validated.

Delivered staging SQL tests check grants/RLS/private bucket, client RPC denial, audit privilege narrowing, dedicated fixtures, invalid transitions, self-review, private-sharing denial, immutable hashes, owner isolation and audit events. Staging fixture emails must be example.invalid; script aborts instead of selecting real users.

Additional required application/concurrency tests before release:
- owner/nonowner/admin/self-review and revoked admin;
- newer version supersedes previous supported claim;
- concurrent reviewer decisions: one succeeds, stale request409;
- expired/revoked/stale hash absent from DTO;
- linked evidence cross-owner denied and deletion immediately hides badge;
- deleted profile/account cannot publish badge, audit retained according to policy;
- no raw evidence/email/provider data in DTO/errors/logs;
- rollback pre-data returns compatible old UI; post-data refuses;
- matching parity before/after, unchanged admission restrictions;
- OAuth control != employment/identity; AI cannot supply decision actor/status.

**Stop: proposal ready for review. Phase 2B execution or application implementation requires your explicit approval.**
