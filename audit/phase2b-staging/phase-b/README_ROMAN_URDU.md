# Phase B: Trust Passport foundation

Date: 2026-10-07
Target: scaleScope-Staging / sopklyxvzmungxwgboqs ONLY.
Production gqkjvxcyetesvqmjkuus par koi execution nahi hui.

## Status aur agla manual step

Local network-disabled PostgreSQL 17.6 par rollback rehearsal aur local committed
apply test kiye gaye. Exact results `local-results.json` mein hain. Hosted staging
rehearsal/apply ABHI PENDING hain. Is phase ko complete ya production-ready nahi kehte.

1. Supabase Dashboard mein staging project reference verify karein.
2. SQL Editor mein `01_REHEARSAL_ROLLBACK.sql` poori run karein.
3. Expected final result: `PHASE_B_REHEARSAL_PASS_ROLLED_BACK`.
4. Result share karein. Error aaye to COMMIT file run na karein; exact error share karein.
5. Hosted rehearsal pass hone ke baad reviewed migration
   `202610070001_trust_passport_STAGING.sql` ka staging apply step diya jayega.
   Is file ko abhi run nahi karna. `ROLLBACK` ko manually `COMMIT` se replace na karein.

Dashboard project selection is mandatory. SQL fixture guards identify known synthetic
accounts and reject unexpected public profiles; they do NOT authenticate the project
reference cryptographically. No secret or database URL is stored in these artifacts.

## CREATE / EXTEND kyun

- `profile_verifications`: sirf opt-in timestamp add; legacy numeric score unchanged.
- `profile_verification_checks`: version, hash, independent claim state, source,
  decision actor, decision time aur expiry add. Existing status/score preserved.
- `trust_evidence`: private Passport purpose aur deletion timestamp add. Existing
  pipeline reused; old files/rows ko private Passport evidence mein convert nahi kiya.
- `profile_verification_evidence`: naya many-to-many relation; aik evidence multiple
  claims support kar sakta hai, magar owner match aur private/current evidence lazmi.
- `verification_audit_history`: nayi minimal append-only history, no raw document,
  email, financial details, free-text note or provider response. Pseudonymous UUIDs
  aur hashes bhi sensitive metadata hain, is liye browser access nahi.

Duplicate requests/badges/email-challenge tables nahi banay. Legacy investor
`is_verified` ko promote nahi kiya. Public trust percentage/badge launch nahi hua.

## Safety behavior

Claims submitted -> in_review -> supported/needs_changes/rejected ja sakte hain.
Allowed invalidations stale/revoked/expired hain. Supported claim ki future expiry,
non-self actor aur valid source required. New version old live version ko stale karta
hai. Expiry read predicate mein bhi check hoti hai; no automatic scheduling claimed.
Tombstoned linked evidence claims ko stale karta hai; reviewed links immutable hain.
Direct claim deletion retained history ke liye blocked; parent deletion cascade par
minimal audit survives. Version sequence submitted audit se tracked hai.

Browser INSERT/UPDATE/DELETE/TRUNCATE aur column-level write grants removed on the
verification surfaces. Legacy authenticated reads remain subject to old owner RLS.
Raw Passport claims direct browser SELECT mein hidden. Evidence owner-only restrictive
policy additional protection hai; no evidence_grants sharing for Passport evidence.
New trigger functions fixed empty search_path and no browser EXECUTE. Only the
service-role current-claim predicate is executable, and it is SECURITY INVOKER.
Service role does NOT have direct audit INSERT/UPDATE/DELETE/TRUNCATE permissions.

Reviewer allowlist/authentication is a BACKEND responsibility. Database can prevent
self-review and invalid states, but shared service credentials cannot identify the
human reviewer. This phase does not grant reviewer powers to the fixture account.

## Regression / rollout gates

- One-shot migration: rerun deliberately refuses; no silent IF NOT EXISTS drift.
- Existing IDs, FKs, row values, public functions, matching and admission definitions
  untouched. No application code, .env, deployment or legacy RPC hardening changed.
- Later backend writes must filter legacy checks with passport_claim=false. A bulk
  check DELETE must not erase new claim history. No current caller was found by
  repository search outside audit; external/older deployed callers remain unverified.
- Existing evidence list/review/delete services need Passport-aware DTO/retention
  integration in Phase F before enabling real Passport writes. Service role bypasses
  RLS; database SELECT policy alone does not secure a service-mediated response.
- This schema is dormant: no opt-ins, Passport claims or badges are inserted by the
  migration. Smoke records live only inside the rolled-back rehearsal.
- API/RLS attack matrix, Storage API, concurrent reviews/tombstones, deletion cascades,
  authentication, matching score parity and full application regression remain later
  phases. Do not interpret local smoke as completion of C/D/E/F/G.
- Phase G empty/data-bearing DOWN-migration testing is separate. Current rehearsal
  tests transactional rollback, not a production rollback after real Passport data.

## Files and reproducibility

`build.py` freezes the original proposal plus reviewed corrections into exact SQL.
`preflight.sql`, `safeguards.sql`, `postflight.sql`, `smoke.sql` are source fragments;
do not run them individually. `manifest.json` records generated SQL hashes.
`test_local.py` reconstructs saved baseline in disposable Docker (--network none,
no published ports), creates only synthetic fixtures, checks rehearsal, local commit,
repeat refusal, legacy preservation and lifecycle/browser denials. Container is stopped
in finally. `local-schema.diff` and `local-results.json` capture local changes/output.

Managed Auth/Storage are minimal local stubs. Supabase Vault guard is omitted ONLY
from local baseline bootstrap. Hosted event triggers/ownership and SQL Editor are not
reproduced. Therefore hosted staging rehearsal is mandatory before hosted commit.

Files are prepared in the repository, not automatically git-committed or deployed.
Prior proposals/baseline files remain unchanged. Phase C waits for separate approval.
