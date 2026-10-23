# Checkout reservation rollout

Status: backend integration prepared, disabled pending database rehearsal. Not live-ready.

1. Keep `BILLING_DURABLE_CHECKOUT_ENABLED` unset while preparing. No environment changes have been made automatically.
2. Review root `billing_checkout_reservations.sql`. Rehearse a copy with its final COMMIT replaced by ROLLBACK. Do not run against an already-created reservation table.
3. After successful rehearsal and review, apply the original migration. It adds isolated infrastructure and a service-role-only completion RPC. It does not rewrite existing subscriptions.
4. Set `BILLING_DURABLE_CHECKOUT_ENABLED=true` in backend/.env and restart the backend only after migration success. All replicas must use the same setting.
5. In test mode verify simultaneous requests from two backend instances and sequential retries return a single checkout ID. Verify provider timeout/persistence failure blocks further checkout creation.
6. Complete one test purchase. Verify reservation completion, account ownership, mode binding and Pro activation. Replay its webhook; it must not create a second subscription mapping.
7. Verify an old subscription webhook cannot replace a newer subscription. A different subscription for the same reservation must fail for manual reconciliation, not silently grant access.
8. Test period-end cancellation, failed renewal and recovery separately. Immediate expiry is not a period-end cancellation test.

Do not close stale reservations merely because their URL expired. Confirm provider orders/subscriptions and pending payments first. No automatic refunds or cancellations are implemented.

Existing subscription events without a reservation are accepted only for the currently mapped subscription. Old untracked purchases require manual reconciliation. The snapshot RPC may reject a replacement with an older provider revision; investigate rather than bypass this guard.

This prevents duplicate checkout creation across instances when enabled. It does not prove the provider cannot accept repeated payments against a previously issued URL. Provider-side duplicate-charge prevention and incident recovery remain acceptance gates.

Rollback: disable new checkout creation (`BILLING_CHECKOUT_ENABLED=false`); retain the durable flag, reservation data and completion RPC so incoming payments remain traceable. Do not drop the table or revert to unprotected checkout while issued links exist.
