# Billing acceptance: 23 October 2026

## Observed hosted results

- Test variant 2016892: PKR 150 monthly checkout and provider configuration matched.
- Repeated checkout opening: one saved reservation and provider checkout ID observed.
- Purchase: reservation completed and mapped to subscription 2630871; Pro activated.
- Replayed webhook: HTTP 200; subscription and reservation timestamps unchanged.
- Immediate cancellation/expiry: canonical provider and database both expired; user confirmed Free and five-request allowance.
- Webhook 126629: correct store, test mode, all eleven handled subscription events selected (read-only API verification).

## Automated coverage, not hosted lifecycle proof

- Concurrent in-process and sequential checkout calls reuse one mocked provider checkout.
- Reservation failures stop checkout creation; ambiguous provider failures retain the lock.
- Canonical failed-payment, recovery, cancellation and expiry snapshots route through completion RPC.
- Failed renewal removes Pro allowance; recovery restores it while preserving usage.
- Cancelled subscription retains access until, but not at or after, the exact end instant.

## Remaining launch gates

- Independent-process hosted concurrency and database transaction race tests.
- Actual provider past_due -> active recovery. Simulated failed-payment notification left canonical provider state active; this was not a downgrade test.
- Actual future-end cancellation grace period. Observed dashboard cancellation expired immediately.
- Provider-side repeat payment against an issued checkout URL and duplicate-charge reconciliation. One local subscription mapping does not prove only one provider charge.
- Historical and out-of-order webhook checks against hosted completion RPC.
- Store activation and customer portal availability.
- Live products/variant IDs, finalized price, live API credentials and stable HTTPS webhook endpoint. No deployment or live-mode switch performed.

Do not repeatedly purchase or trigger events to force a pass. Do not auto-close uncertain reservations, or auto-refund/cancel provider subscriptions. Keep payment tests in Test Mode.
