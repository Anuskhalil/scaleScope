# Founder Free / Pro workflow

## Implemented scope

- Free: 5 new outgoing requests per UTC calendar month; Pro: 50 combined requests.
- Investors, founders and co-founders share the same outgoing allowance.
- Stats, Growth Signals, journey, discovery, matching reasons and profile access use the same rules for both plans.
- AI Mentor remains coming soon, not a paid benefit.
- Messaging/meetings for accepted eligible connections are not paywalled.
- Trust review, approvals, evidence privacy and review decisions remain independent of payment.
- Dashboard shows used/allowed requests. Founder send buttons open a confirmation dialog with remaining allowance.
- Limit reached: Compare Pro (Free) or View limits (Pro). Users can also wait for next calendar month.
- Account menu contains Billing and Explore Founder Pro; billing and pricing remain accessible.
- Existing/duplicate pending or accepted requests are returned without another charge.
- Declined/withdrawn requests do not refund allowance. Failed inserts roll back the counter increment.
- Pro expiry uses the Free limit against this month's existing usage; it does not erase connections or messages.
- Pricing has NOT been finalized. Old stored prices are not advertised as final; checkout stays disabled.

## Manual SQL order (Codex has not executed any SQL)

1. Review/back up main database. If not already applied, rehearse then apply `billing_payment_hardening.sql`.
2. Review `founder_allowance.sql`. Rehearse the whole file by replacing final COMMIT with ROLLBACK.
3. After successful rehearsal, apply the original file with COMMIT.
4. Restart the main backend. New request creation requires this RPC; until applied, it returns 503,
   rather than allowing unmetered inserts. Existing connections and messages are unaffected.
5. Keep `BILLING_CHECKOUT_ENABLED=false` and `BILLING_PRICING_FINALIZED=false` until pricing/payment release checks finish.

The new SECURITY INVOKER RPC is service-role-only. Browser INSERT on connection_requests is revoked;
read/respond/withdraw policies are unchanged. Backend checks profile approval before creating requests.
The transaction locks both profile rows in UUID order, checks existing requests, locks the UTC-month
counter, inserts the request and increments usage together. Same-sender concurrent requests serialize.
The service role supplies the server-calculated limit; this RPC is not a public or authenticated client API.

## Acceptance tests after SQL

Use approved test accounts only. Avoid sending unsolicited requests to real users.
1. Free founder: send 5 distinct requests across relevant roles. Sixth is blocked with Compare Pro.
2. Cancel the confirmation dialog: no request/counter change.
3. Retry existing pending/accepted request: same request, unchanged counter (including at the limit).
4. Decline/withdraw: usage remains consumed; incoming acceptance does not consume receiver allowance.
5. At 4/5, send two concurrent requests to different test users: only one new request should succeed.
6. At 5/5, existing messaging remains available; approval restrictions still apply to both plans.
7. Pro test subscription: 50 allowance; downgrade with more than 5 used means wait until next UTC month.
8. SQL failure, missing RPC or insert constraint failure must not create an unmetered request.

Main-project hosted checks completed on 2026-10-20 using only the seven marked QA fixtures:
- Five outgoing requests succeeded; sixth was blocked; duplicate retry kept usage at five.
- A separate QA founder reached 4/5; concurrent sends returned one 201 and one 402, with exactly five saved requests.
- Ordinary authenticated account was denied direct request INSERT, allowance RPC, subscription RPC and billing/usage UPDATE.
- Paid checkout remained disabled. Reports: `audit/billing/main-allowance-concurrency.json` and `main-allowance-security.json`.
- Ten synthetic requests remain pending across the two QA senders. No real-user allowance was changed.

Actual Pro payment/expiry, month rollover and post-acceptance UI behavior were not exercised by these hosted checks.
Backend unit tests cover Pro/Free entitlement boundaries with mocked database/provider responses.
Existing usage history is retained, not reset. Historical missed counts are not automatically reconstructed.
Duplicate provider checkout sessions and real hosted payment lifecycle testing remain separate release gates.
