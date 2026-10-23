# Reviewer passwordless setup

Implemented: /admin email entry, generic sign-in-link response, backend allowlist,
rate limiting (3 attempts/IP and email/15 minutes per process), MFA gate and no role
onboarding. Review endpoints continue to check authorization and prevent self-review.
Existing founder/investor accounts remain unchanged. No schema SQL executed here.

## Required setup for new reviewer identities
1. Back up public.handle_new_user() and public.passport_check_guard() definitions.
2. Review/run REVIEWER_ONLY_AUTH.sql in the main database. It skips public profile
   creation only for server-owned app_metadata.reviewer_only=true and permits that
   identity as a Passport decision actor. It does NOT grant reviewer authorization.
   Backend email allowlist + MFA remain mandatory. This patch has not been executed
   or rehearsed against the hosted database. Unexpected function shape stops it.
3. After success set REVIEWER_ONLY_PROVISIONING_ENABLED=true in backend/.env and
   restart the backend. Do not enable before SQL success. It creates only allowlisted
   Auth identities, unconfirmed and with no password. Existing users are not overwritten.
4. Supabase Authentication URL Configuration: add exact http://localhost:5173/admin
   to redirect URLs. Keep TOTP enrollment AND verification enabled.
5. Magic Link email template must retain {{ .ConfirmationURL }} for this server-side
   implicit link flow. Existing custom PKCE-only templates need separate review;
   do not replace templates blindly. Use working SMTP; default delivery restrictions
   or rate limits may prevent arbitrary reviewer inbox delivery.
6. Open /admin signed out. Enter allowlisted email, open the received link, set up
   MFA if new, then verify the authenticator code. No role selection form is required.

Never share email links, session tokens, QR secrets or OTPs. Non-allowlisted email
gets the same generic response but no email. Logged-in unapproved accounts are denied.
Removing email from ADMIN_REVIEW_EMAILS and restarting revokes review access even
with an existing session. Local limits reset on restart; multi-instance deployments
need a shared gateway limiter. Do not log magic link contents or expose service keys.

Rollback: turn REVIEWER_ONLY_PROVISIONING_ENABLED=false; disable link requests if
needed and restore backed-up function definitions only after checking existing
reviewer-only identities. Do not delete accounts or audit history as rollback.

Live mailbox delivery, expired/reused links, hosted signup trigger behavior and full
reviewer-only claim decisions remain acceptance checks after operator setup.
