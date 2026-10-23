# Main ScaleScope release handoff

## Current status - 2026-10-15

This section supersedes the historical preparation notes below. Do not rerun
the production migration just because the older notes say it is pending.

- User reported main database migration and postflight successful.
- User confirmed main reviewer magic-link login, MFA and review flow work.
- Reviewer focus/session refresh regression fixed locally; mocked browser checks
  preserve the review draft and still deny revoked access. These are not live
  authenticated security tests.
- Today: 70 isolated backend unit tests passed; frontend production build passed.
  The large JavaScript chunk warning remains.
- No hosted deployment performed. User will deploy after local acceptance.

### Next main-project acceptance test

Use two separate browser profiles with real test founder/investor accounts.
1. Reviewer approves each account in Profile reviews (Passport support is separate).
2. Founder opens investor from Discover and sends a connection request.
3. Investor accepts; both accounts open the resulting conversation.
4. Send messages both ways, confirm delivery without refresh and persistence after
   refresh, then switch browser focus and verify no draft or conversation reset.
5. With an unapproved test account confirm suggestions remain visible but profile
   opening, connection requests and messaging are denied.
Record actual results; earlier staging passes do not prove main-project acceptance.
Do not modify a user's profile or approval just to manufacture a passing test.

### Remaining before public launch

- Custom SMTP: built-in provider throttling observed; successful single delivery
  does not establish reliable registration/reviewer email delivery.
- Private-file retention decision and physical cleanup remain unresolved.
- Billing, meetings and AI launch scope/end-to-end verification remain unresolved.
- Offsite backup and full Auth/Storage service recovery remain unconfirmed.

## Historical preparation notes (2026-10-13; not current execution instructions)

Updated: 2026-10-13. Local staging servers stopped; hosted staging retained.
Source: D:/Users/AnusD/Documents/scaleScope-new/scaleScope

## Verified today
- Main backend isolated unit tests: 67 passed, 0 failed.
- Main frontend production build: passed. Large JS chunk warning remains.
- These checks do not establish hosted production deployment or end-to-end readiness.
- Trust Passport UI, API, reviewer MFA and migration candidates are in this repository.
- Production Passport migration and activation remain unexecuted.

## Prepare Render settings, without activating Passport
Preserve existing production credentials; never copy staging secrets.

```dotenv
NODE_ENV=production
SCALESCOPE_STAGING=false
SUPABASE_URL=https://gqkjvxcyetesvqmjkuus.supabase.co
FRONTEND_URL=https://scale-scope-nine.vercel.app
PASSPORT_ENABLED=false
PASSPORT_WRITES_ENABLED=false
REVIEWER_MFA_REQUIRED=true
```

ADMIN_REVIEW_EMAILS must contain only operator-approved real production reviewer
emails with confirmed accounts and enrolled MFA. No staging fixture emails.
Do not replace the service key, Render PORT, or unrelated feature settings.

## Prepare Vercel settings
Confirm the canonical domain is still scale-scope-nine.vercel.app before release.

```dotenv
VITE_BACKEND_URL=https://scalescope-m6g1.onrender.com
VITE_PASSPORT_ENABLED=false
VITE_PASSPORT_STAGING=false
```

Keep production Supabase URL/public key; no service key belongs in client settings.
Vite settings require a new build/deployment. Local build success alone is not deploy.

## Activation sequence
1. Operator supplies production reviewer email and verifies MFA. Decide retention
   and launch-enabled features; do not silently disable existing customer features.
2. Secure fresh backup and separate private copy. Confirm production schema drift,
   maintenance/write pause and compatible backend deployment per RUNBOOK_ROMAN_URDU.md.
3. Obtain explicit approval for the exact production migration candidate.
4. Execute approved migration and read-only postflight, not staging baseline SQL.
5. Set PASSPORT_REVIEW_METADATA_ENABLED=true on compatible backend after schema apply.
6. In the approved release window enable PASSPORT_ENABLED and VITE_PASSPORT_ENABLED;
   rebuild frontend. Keep PASSPORT_WRITES_ENABLED=false until read/access checks pass.
7. Enable writes only after retention handling and release approval; test a controlled
   claim, reviewer MFA, unauthorized access, withdrawal, connections and messaging.
8. Monitor failures. Disable Passport writes first if an incident occurs; do not
   restore insecure RPC permissions or delete evidence/audit tables.

## Still unresolved
- Production reviewer email/MFA confirmation.
- Withdrawn-file retention period and physical cleanup implementation. Current
  withdrawal denies access but retains bytes; no automatic deletion promise.
- Billing, meetings and AI launch scope; isolated staging did not validate these.
- Backup offsite copy and full Auth/Storage service recovery not confirmed.

Do not treat pending decisions, passing preflight, or local build as production approval.
