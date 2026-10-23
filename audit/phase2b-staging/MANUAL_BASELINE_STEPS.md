# Manual Baseline Preparation
Status: awaiting dependency supplement. No SQL has been executed by the assistant.

## Run now (read-only)
1. Open production SQL Editor:
   https://supabase.com/dashboard/project/gqkjvxcyetesvqmjkuus/sql/new
2. Paste 00_dependency_inventory_READ_ONLY.sql and run.
3. Export the one-row result as production-dependencies.csv.
4. Open staging SQL Editor:
   https://supabase.com/dashboard/project/sopklyxvzmungxwgboqs/sql/new
5. Run the SAME query and export staging-dependencies.csv.
6. Send both files. If an error occurs, send the exact error; do not change database objects.
Review custom function source for embedded secrets before sharing.

One row containing JSON is intentional. No limit is unnecessary for this
single-row query, but nested result truncation must be checked after export.

## Why this supplement
Q01-Q12 omit extension installation/version, event triggers, replica identity,
publication membership, explicit column collations, sequence properties and
constraint-to-index links. user_auth_tracking.id specifically calls
uuid_generate_v4(). A baseline that guesses the extension schema can fail.
Realtime publication membership affects chat regressions. Constraint-owned
indexes must not be created twice.

## Planned SQL deliverables after supplement review
01 baseline preflight + required supported extensions/types.
02 application tables, defaults, constraints and indexes.
03 application functions, RLS, exact reviewed privileges and custom triggers.
04 empty private bucket configuration and application Storage policies.
05 baseline catalog postflight and rollback-only synthetic security checks.

Final file grouping may be consolidated into one transaction to avoid
exposing partially protected tables. These are planned files, not runnable
migrations yet. All mutation scripts will be staging-only and version-controlled.
The Supabase SQL Editor project URL must be checked manually; a project-ref
comment alone cannot prevent execution in the wrong database. Preflight must
also refuse any populated/nonempty application schema. Do not alter production
to make staging pass this guard.

Do not copy platform-owned auth/storage/realtime schemas or managed routines.
Review managed-schema differences separately. Do not copy real user records.
Do not run Trust Passport proposals before baseline parity and Phase A approval.
Do not change .env, Render, Vercel, billing, OAuth or temporary live access.
