# Phase F: initial regression audit (2026-10-08)

Status: IN PROGRESS, not accepted or production-ready.

## Automated Passport UI follow-up

- Located bundled Playwright outside the project; Browser plugin unavailable. Used headless Edge with isolated mocked API/session responses. No hosted claim or production writes.
- PASS at 390px and 1440px: draft cancel confirmation preserves values when dismissed; confirmed cancel clears draft; rejected upload preserves inputs; retry upload succeeds; consent/submission; owner context and download action; no horizontal overflow.
- PASS: reviewer starts review, cancels rejection without a write, confirms rejection, then opens reviewed history. Two decision writes total. Zero uncaught page errors. Expected mocked HTTP 400 and local-network-blocked Vite HMR console messages occurred; not a clean-console claim.
- Found mobile toast covering Open claim indefinitely. Success/info notices now expire after six seconds; errors remain dismissible and inline. Re-ran interaction checks successfully.
- Screenshot inspected for the isolated mobile component. This is not full authenticated app-layout or real download-byte testing. Existing hosted download/security tests remain separate evidence.
- Next: resolve remaining Phase F security/regression findings and prepare Phase G rollback proposal. No rollback or production approval implied.

## Consolidated update: 2026-10-10

- Latest backend suite: 55/55 PASS.
- Latest frontend/shared/staging-isolation tests: 33/33 PASS.
- Client lint PASS after removing two unused bindings and exporting the QA fixture component.
- Client build PASS; approximately 972 KB main bundle warning remains.
- User reported hosted lifecycle 45/45 PASS with cleanup, including private claim context, hash binding, safe summaries and tombstone invalidation.
- User reported founder/investor realtime messages without refresh and persistence after refresh.
- Passport submission/reviewer/context/owner-summary APIs now implemented, staging-only. Earlier missing-API notes below describe the initial audit, not current API state.
- Staging private upload, submission and reviewer queue UI are implemented. User confirmed founder submission, reviewer Supported decision and founder display of startup Version 5 supported. User also confirmed founder claim context and evidence download through the UI. These are user-reported browser results, separate from automated tests that seed private evidence using the service account.
- Owner Open claim and reviewer Reviewed claims history were added. Latest focused Passport unit tests: 16/16 PASS; client build PASS. Reviewer history download and investor-specific browser submission still require confirmation. An empty investor claim list alone is not an authorization test.
- User subsequently confirmed investor firm Version 1 Needs changes with private context, followed by successful corrected resubmission/review. Founder evidence download confirmed. These reports predate the latest feedback/dialog UI redesign.
- Latest fresh regression run: backend 55/55 PASS; shared matching/profileMatching/discoverSources command 28/28 PASS (not including separately recorded session/isolation tests).
- Upload/submission steps, action notifications, decision confirmation, draft cancellation and separate claim lists implemented. Latest lint/build passed; rendered desktop/mobile and cancellation/error flows remain unverified. Browser plugin absent; project-local Playwright unavailable. Compilation is not UI acceptance.
- Next browser scenario: cancel rejection without changing the claim, then confirm rejection on a separate synthetic claim; confirm owner sees Rejected. Do not supersede existing Supported startup/firm claims just for this test; use an unused claim kind.
- No message-attachments/uploadAttachment references found by current source search in client/src and backend/src. This does NOT prove bucket grants/policies are safe; bucket hardening remains open.
- Public badges remain disabled. New-user signup, MFA-sensitive behavior, meeting regressions, full hosted matching parity and concurrency coverage still require explicit coverage/acceptance.
- No hosted migration/deployment performed in this consolidated batch. Phase F acceptance and Phase G approval have not occurred.

## Verified locally

- Backend: node --test test/*.test.cjs, 37 baseline tests passed, 39 after two new regression tests.
- Frontend/shared: node --test shared/*.test.mjs client/src/utils/profileMatching.test.js client/src/services/discoverSources.test.js, 27 passed.
- Client npm run build passed; main JS bundle about 970 KB, chunk-size warning remains.
- Client npm run lint failed with three existing-in-this-batch errors:
  - client/qa/phase1-entry.jsx:12 react-refresh/only-export-components
  - client/src/pages/StudentRolePages/MessagesPage.jsx:4 unused supabase
  - client/src/utils/avatarStorage.js:24 unused error
- No frontend files changed in this batch. These lint failures predate this batch, not necessarily all earlier project work.

## Changes

- Evidence owner list excludes tombstones.
- Shared evidence list explicitly excludes Passport-private and tombstoned evidence, in addition to existing grant filtering.
- Legacy review queue excludes Passport-private/tombstoned evidence.
- Legacy review action rejects Passport-private evidence with 409, preventing a legacy evidence decision from standing in for a versioned claim decision.
- Added tests for the list filters and review boundary.

## Important gaps

- No backend Passport claim lifecycle API or safe public-summary contract found in current backend/src and client/src search. Database lifecycle tests are not API integration proof.
- Public Passport badges remain disabled/not introduced. Legacy is_verified is not promoted by this work.
- Owner evidence workspace is not a public Passport DTO. Its AI report requires separate schema/PII review before any public reuse.
- Account admission remains separate; matching implementation unchanged. Current unit tests are not a hosted before/after matching comparison.
- Hosted signup/logout/session/MFA, profile edits, matching parity, realtime sockets and applicable meeting regressions remain pending.
- Staging launcher currently restricts APIs and disables meetings/AI; browser regression needs deliberate isolated frontend/backend setup, not production .env reuse.
- Earlier message timestamp discrepancy remains open: application created_at and database-default updated_at can differ due to clock sources.
- message-attachments bucket size/MIME hardening remains an open finding, not resolved by baseline parity.
- Backend unit imports loaded dotenv defaults in their logs; tests used mocks, but a hermetic runner should prevent ambient credential loading in future runs.

## Boundaries

No migration, deployment, production database call or hosted fixture mutation performed in this batch. Client build is compilation only, not a browser smoke test. Phase G is not authorized by Phase F approval.
