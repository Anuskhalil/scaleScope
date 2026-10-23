# Profile and matching audit

## Scope

Main project source, not a staging deployment. Eleven page components at 1366px and 390px: founder/investor dashboards, founder/investor Discover, Find Investors, Find Startups, Find Team, founder/investor own profiles, and both public profile views.

## Corrections

- Preserve a real zero match score instead of substituting 20 percent.
- Render saved founder avatars in investor dashboard suggestions.
- Fetch public founder education fields and render education before startup details.
- Restrict public profile queries to selected fields instead of whole rows; stop querying retired student/mentor tables.
- Remove legacy investor verified label; matching and verification remain distinct.
- Include investor booking link in public links.
- Guard realtime initialization against missing sockets and unmount during asynchronous initialization.

Related matching work includes canonical/legacy alias handling, unknown-data treatment, server-owned explanations, avatar fallback, and removal of invented match explanations.

## Verification

- Shared matching tests: 12 passed.
- Backend unit tests: 70 passed.
- Client lint and production build passed. Build still warns about a roughly 983 kB main JavaScript chunk; performance optimization is separate from functional correctness.
- Repeatable browser audit: `client/scripts/audit-profile-pages.cjs`. Results and screenshots are written to `%TEMP%/scalescope-profile-audit`.
- Browser checks cover rendering, JavaScript page errors, horizontal overflow, image decoding, public-email absence, education placement, and investor search exclusion/restoration.
- Main backend health responded successfully.

## Boundaries

The browser harness uses synthetic Supabase/backend fixtures and real page components. It does not run the complete application router/navbar/authentication guards, mutate hosted data, send real requests/messages, test live signed-avatar expiry, or prove hosted RLS/column authorization. Find Team includes an empty candidate case. Matching calculations are tested separately; browser match responses are fixtures. No migration was executed. Existing real-user approvals, messaging and review tests reported by the user are separate evidence, not a fresh full authenticated audit.

Public query projection reduces fetched data but is not itself database authorization. Do not describe this audit as a penetration test or a guarantee that every production feature is defect-free.
