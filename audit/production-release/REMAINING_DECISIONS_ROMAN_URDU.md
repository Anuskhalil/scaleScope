# Release decisions

Production preflight PASS user reported. Live apply remains unexecuted.

## Attachment protection candidate
Private message-attachments: 5MB; PDF/JPEG/PNG only for future uploads.
No active caller targeting this bucket found in repository search. This restriction
could affect external/older clients; files already present remain untouched.
MIME checks do not establish content safety. No upload route or broader grants added.
Candidate SQL is tested on restored production locally, not the hosted Storage API.

## Decisions requiring operator input
- Production reviewer: confirmed account email already enrolled in MFA. Do not use
  passport-reviewer@example.invalid in production. No OTP/secret should be shared.
- Retention: choose a documented private-file retention period before enabling
  production Passport uploads. Existing code withdraws access but retains bytes and
  audit history; automatic physical deletion has NOT been implemented.
- Launch scope: existing billing/meetings/AI stay unverified by isolated staging.
  Either explicitly defer them with tested controls or test them before activation.

## Recovery status
Local SQL restore and all 74 COPY counts PASS, five file hashes and paths match.
Full Auth/Storage service recovery remains untested. Backup is local, not an offsite
copy. Before live rollout secure an additional private copy off this machine.
