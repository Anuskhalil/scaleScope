# Staging Baseline Rehearsal
## Findings
- Production PostgreSQL 17.4; staging PostgreSQL 17.6. Same major version, not identical environments.
- Five extensions match exactly, including uuid-ossp 1.1 in extensions.
- Production's public.ensure_rls event trigger is absent in staging.
- Production's public.user_role enum is absent in staging; preserve legacy labels for schema parity, not new registration choices.
- Realtime application publication contains only public.conversation_participants. Preserve this membership; do not assume messages belongs.
- Platform-owned publication supabase_realtime_messages_publication and managed event-trigger tags differ. Do not copy or downgrade managed internals.

## Ab kya run karna hai
1. Sirf scaleScope-Staging SQL Editor open karein:
   https://supabase.com/dashboard/project/sopklyxvzmungxwgboqs/sql/new
2. Role postgres rakhein. Project reference URL se confirm karein.
3. 01_BASELINE_REHEARSAL_STAGING_ONLY.sql poori file paste karein.
4. No limit select karein. Koi text select na rakhein; poori script ek sath Run karein.
5. Result CSV ya exact error bhej dein. Error par alag blocks run na karein.
6. Expected result: BASELINE_REHEARSAL_PASS_ROLLED_BACK.
7. Tables baad mein nazar na aana normal hai: ROLLBACK ne changes undo ki hain.

## Important
ROLLBACK ko COMMIT se replace mat karein. Abhi permanent baseline approved nahi.
Production SQL Editor par ye script nahi chalani. Empty-public-schema guard current production ko refuse karega, lekin ye project identity authentication ka replacement nahi.
Script 43 tables, 551 columns, 23 functions, 204 constraints, 121 standalone indexes,
117 policies, 21 application triggers, one custom event trigger and five empty private
bucket configurations ko transaction ke andar recreate karti hai.
No Auth users, application rows, Storage objects, private files or API keys are copied.

## Tests aur limitations
Offline generation and artifact checks are not database execution tests.
Actual hosted rehearsal is pending your SQL Editor result.
Legacy function bodies, duplicate legacy triggers, old role enum labels and unsafe
RPC grants are preserved only inside this rollback transaction for baseline fidelity.
Known broken legacy routines are not repaired here. Function body validation is
temporarily off during function CREATE, as in schema restore workflows; runtime
correctness is NOT implied.
No persistent unsafe RPC exposure is approved by this rehearsal.
No new Trust Passport feature, production fix or application deployment is included.
No default ACLs, platform-owned functions/publications or schema grants are overwritten.
Those differences still need explicit parity review before declaring Phase A complete.
Account fixtures, actual RLS/API tests, matching regressions and Storage tests remain pending.

## Next
Successful rehearsal ke baad result review hoga. Phir controlled persistent
baseline aur remaining differences ka plan approve karenge.
Do not run Phase 2B proposal migrations yet.
