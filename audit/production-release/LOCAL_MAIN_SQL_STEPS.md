# Main local project: SQL handoff and testing

2026-10-13: Read-only production REST schema checks found passport_claim and
passport_private missing (42703), and the three Passport link/audit/quota tables
unavailable (PGRST205). Source code already includes the tested Passport components.
Do not copy staging accounts, evidence, baseline tables or credentials.

## Before SQL
Main project is gqkjvxcyetesvqmjkuus, not sopklyxvzmungxwgboqs.
Local 5173/3001 uses the MAIN hosted database; local is not a separate database.
The same SQL affects the existing hosted website. Coordinate a maintenance window
and stop affected writes/workers first. Confirm compatible conversation API code is
deployed before RPC hardening; older hosted browser RPC callers may break.
Keep a fresh private database + Storage backup and an additional protected copy.
Do not run the apply candidate just to preview the UI while live users are active.

## SQL Editor order (operator executes, not the assistant)
1. Run all of 02_PREFLIGHT_READ_ONLY.sql. Expect PRODUCTION_PREFLIGHT_PASS.
2. Review 03_APPLY_CANDIDATE_NOT_YET_APPROVED.sql. It extends existing verification
   tables, adds evidence linkage/audit/quota, tightens RPC permissions, and sets
   future message attachment limits to 5MB PDF/PNG/JPEG. No demo profiles are copied.
3. Once the above release conditions and exact migration are approved, open the
   entire apply file in ONE SQL Editor query. Immediately AFTER its initial BEGIN;
   add the following transaction-local confirmation line:

```sql
SET LOCAL scalescope.production_release_confirmation = 'gqkjvxcyetesvqmjkuus';
```

Run the WHOLE query, not a highlighted subset. Expect PRODUCTION_PASSPORT_APPLIED.
This setting records operator confirmation; it does not verify project identity.
If any error occurs, stop and share the error; do not remove guards or retry blindly.
4. Run all of 04_POSTFLIGHT_READ_ONLY.sql. Expect PRODUCTION_POSTFLIGHT_PASS.
   Already-applied schemas intentionally fail preflight; do not reapply.

## After SQL passes
Backend local settings (do not change main Supabase credentials):

```dotenv
PASSPORT_ENABLED=true
PASSPORT_REVIEW_METADATA_ENABLED=true
PASSPORT_WRITES_ENABLED=false
REVIEWER_MFA_REQUIRED=true
```

Client local setting: VITE_PASSPORT_ENABLED=true; VITE_PASSPORT_STAGING=false.
SCALESCOPE_STAGING must remain false/unset. Restart local backend and frontend.
Reads first; keep writes disabled until reviewer identity/MFA and private evidence
retention handling are agreed. Current withdrawal blocks access but retains bytes.
Only then set PASSPORT_WRITES_ENABLED=true for approved controlled testing.
Use real main-project founder/investor accounts; reviewer email must be explicitly
approved in ADMIN_REVIEW_EMAILS. Never paste passwords, OTPs or tokens into chat.

## Local acceptance checklist
- Signup/email confirmation/login/logout; refresh keeps the session.
- Founder student/professional profile save and reload; investor profile save/reload.
- Discover, matching explanations and CoFounder consent/preferences.
- Profile admission review restrictions and permitted actions after approval.
- Connection request/accept; messages received without refresh and persist on reload.
- MFA: password-only reviewer access denied; MFA-authenticated reviewer permitted.
- Passport: owner summary/workspace; upload/consent/claim; needs-changes/resubmit;
  supported summary; unrelated account cannot download; withdrawal removes support.
- Mobile layouts and menu navigation for both roles.
- AI, billing and meetings require separate enabled-feature checks; staging isolation
  did not validate their production integrations. Do not use real charges casually.

## Checks performed
Main backend: 67 isolated unit tests passed in preceding preparation.
Main frontend: production build passed in preceding preparation (large chunk warning).
Today: frontend lint passed and 32 client/shared tests passed.
No authenticated main-account UI walkthrough or live Passport lifecycle passed yet.
No database migration, deployment or feature activation performed by this handoff.
