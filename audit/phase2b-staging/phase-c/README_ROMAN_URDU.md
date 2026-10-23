# Phase C: RPC security hardening

Target: scaleScope-Staging (sopklyxvzmungxwgboqs), 2026-10-07.
Production par kuch execute/deploy nahi hua. Hosted Phase C rehearsal/apply pending.

## Kyun zaroori hai

Browser ko arbitrary users ki conversation create karne aur doosre user ka login
counter change karne ka direct RPC access nahi milna chahiye. Ye phase un entry
points ko restrict karta hai; AI matching scores ya Passport badges change nahi karta.

## Exact changes / callers

1. create_conversation_with_participants(uuid,uuid,text): SECURITY DEFINER se
   SECURITY INVOKER, fixed empty search_path, browser EXECUTE revoked, service_role
   allowed. Active distinct users + existing connection required. Direct rooms only,
   pair advisory lock duplicate parallel creation prevent karta hai. Backend caller
   authorization remains auth middleware + profile review gate + connection check.
   Callers: backend/src/routes/conversation.routes.js and
   backend/src/services/connection.service.js. Legacy browser helper in
   client/src/services/studentService.js now uses existing backendApi route.
2. increment_login_tracking(uuid): DEFINER retained to write tracking under RLS,
   empty path, own auth.uid() + active profile required. Only authenticated EXECUTE.
   Current caller client/src/auth/LoginPage.jsx unchanged. service_role execution
   deliberately removed: no service caller found; a bare service token is not a user.
3. get_user_profile(uuid): browser EXECUTE removed; empty path. No repository caller.
   Legacy body refers to missing user_profiles; this phase quarantines, not repairs it.
4. soft_delete_user(uuid): browser EXECUTE removed; empty path. No repository caller.
   Legacy body refers to absent profile fields; it remains retired/unrepaired.
5. refresh_matching_scores(): browser EXECUTE removed; empty path. No caller found.
   Missing materialized view is not recreated; existing matching implementation intact.

All five functions retain owner postgres. No unrelated function ACL changed.
rpc-before-after.json contains exact signatures, owner, source, DEFINER/INVOKER,
path, PUBLIC/anon/authenticated/service privileges from LOCAL baseline reconstruction.
inventory.sql lets the operator capture the same inventory on hosted staging.

## Files / testing

changes.sql + postflight.sql + smoke.sql + build.py generate:
- 01_REHEARSAL_ROLLBACK.sql (test + rollback)
- 202610070002_rpc_hardening_STAGING.sql (separate committed migration)

Do not run fragments individually. Only staging SQL Editor with project reference
checked. Synthetic identity guard is defense-in-depth, NOT cryptographic project ID.
Rerun deliberately refuses. Existing rows are not changed by the migration. Smoke
temporarily approves two synthetic test profiles and creates a connection/message,
but EVERYTHING in the smoke savepoint rolls back, including approval/login counters.

test_local.py tests baseline + Phase B + Phase C in a network-disabled disposable
PostgreSQL container. Rehearsal restores all function definitions/ACLs and row snapshots;
local committed apply changes exactly the five scoped functions and no existing data.
Client VM helper test checks backend routing. backend/test/rpcHardening.test.cjs
tests actual Express route with mocked DB/Auth and accepted-connection service path.

Remaining: real hosted Auth founder/investor login and API requests; full socket
messaging, MFA/session, concurrent transaction tests and full application regression.
SQL message insertion is NOT a substitute for actual API or socket tests. This phase
cannot be called fully complete until relevant hosted behavioral checks also pass.

## Manual sequence

1. Run 01_REHEARSAL_ROLLBACK.sql ONLY on scaleScope-Staging.
2. Share PHASE_C_REHEARSAL_PASS_ROLLED_BACK (or exact error).
3. Do NOT run committed migration yet. Next: hosted apply guidance + authenticated
   staging API/login smoke tests with the synthetic accounts. Never share passwords,
   user access tokens or service keys in chat.
4. Client helper change must be included in the staging app before testing old pages.
   Existing founder/investor helpers already use backend-mediated conversations.
5. Phase D needs separate approval after this phase acceptance.

Full database security matrix: Phase D. Actual Storage API security: Phase E.
Full app integration/regression: Phase F. Rollback cases: Phase G. Final review and
production deployment plan: Phase H. Production execution needs explicit approval.
