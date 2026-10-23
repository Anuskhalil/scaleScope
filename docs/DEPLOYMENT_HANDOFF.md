# ScaleScope deployment handoff

## Verified on 23 October 2026

- Backend: 107 automated tests passed.
- Frontend: production build passed; ESLint error check passed (`npm run lint -- --quiet`).
- Build warning: main JS bundle is approximately 990 kB uncompressed. Performance optimization remains advisable.
- Production CORS now permits only explicitly configured FRONTEND_URL/FRONTEND_URLS origins; development preview matching is not permitted in production.
- Hosted billing purchase, activation, replay and immediate-expiry downgrade observed. See BILLING_ACCEPTANCE_2026-10-23.md for limits.

This is not a certification that every page, hosted integration, database race, recovery path or payment lifecycle has been verified.

## Render backend

- Root directory: backend. Install: npm ci. Start: npm start. Health endpoint: /health.
- NODE_ENV=production.
- FRONTEND_URL must be the exact final HTTPS Vercel/custom domain. Optional FRONTEND_URLS is a comma-separated list of explicitly trusted origins, not wildcards.
- Set SUPABASE_URL and SUPABASE_SERVICE_KEY privately in Render. Never expose service-role or provider secrets as VITE variables.
- Set ADMIN_REVIEW_EMAILS to the intended reviewers. Verify reviewer MFA and unauthorized denial after deploying.
- Copy required feature/provider settings deliberately from the reviewed local configuration; never upload .env to Git.
- Run `node scripts/check-deployment.cjs` in the deployed environment. It is read-only and prints no credential values. Passing does not replace manual gates below.

## Vercel frontend

- Root directory: client. Build: npm run build. Output: dist.
- Set VITE_BACKEND_URL to the final HTTPS Render backend, not localhost.
- Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY for the main project.
- Set VITE_PASSPORT_ENABLED=true if launching Trust Passport. Do not use the staging flag for production.
- Existing client/vercel.json provides routing configuration; verify deep-link refresh on /admin, /billing, /messages and /trust-workspace.
- Redeploy after changing VITE variables; they are compiled into the build.
- Update Supabase Site URL and allowed auth redirect URLs to the final frontend. Test signup confirmation, reviewer email link and MFA there.

## Paid launch is still blocked

Keep BILLING_CHECKOUT_ENABLED=false on a public deployment until payment gates are completed. Do not present test subscriptions as paid live subscriptions. A deployment with checkout disabled is not a paid-launch approval.

Before enabling paid sales:

1. Activate the Lemon Squeezy store and verify customer portal access.
2. Finalize actual price, live product/variant IDs and live credentials. Test variants do not identify live products.
3. Set LEMONSQUEEZY_TEST_MODE=false, BILLING_TEST_PRICE_150_PKR=false, BILLING_DURABLE_CHECKOUT_ENABLED=true and BILLING_PRICING_FINALIZED=true only after reviewing live settings.
4. Configure a live webhook at https://YOUR-BACKEND/api/billing/webhook with its correct signing secret and all eleven handled subscription events. The temporary ngrok endpoint is not a deployment endpoint.
5. Complete actual failed-renewal/recovery and future-period-end cancellation checks; simulations observed so far did not prove those transitions.
6. Complete independent-process hosted checkout race, historical-webhook and duplicate-provider-charge reconciliation checks. Do not bypass canonical provider validation to make simulations appear successful.
7. Verify backup recovery, logging/alerts and handling of blocked/uncertain reservations. Never close a reservation solely because its URL expired.

## Hosted smoke test before opening access

Test founder/investor login, approval gate, matching, connections, realtime messages, private evidence owner/reviewer permissions, unrelated-user denial, reviewer MFA and profile/claim review. Confirm data persists after refresh and no browser requests point at localhost.

No deployment, live payment, provider cancellation/refund or SQL migration was executed as part of this handoff.
