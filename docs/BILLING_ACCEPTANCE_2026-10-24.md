# Billing technical acceptance: 24 October 2026

## Newly verified against hosted database

Command: `node scripts/test-hosted-checkout-concurrency.cjs --run-synthetic` from backend.

The test creates a disposable synthetic founder, uses eight independent Node processes, and removes the fixture afterwards. It calls the deployed database RPCs. It does NOT create a Lemon Squeezy checkout, charge a card or simulate a provider delivery.

- Eight simultaneous reservation calls: one create, seven safely blocked, one reservation ID.
- Sequential retry after an unknown provider outcome remains blocked.
- Completion applies a synthetic subscription and binds its reservation.
- Wrong payment mode is rejected.
- Hosted active -> past_due -> active -> cancelled -> expired snapshots apply correctly.
- Application access policy removes/restores Pro appropriately and stops access at the exact cancellation end instant.
- Cancelled subscription blocks a second checkout during its grace period.
- Old revision replay returns duplicate_or_stale.
- A second subscription ID against the same reservation is rejected for reconciliation.
- After an expired subscription is replaced, a newer event for the old completed reservation is ignored and cannot overwrite the new mapping.
- Synthetic account, reservations and subscription are removed during cleanup.

## Still not proven by this test

- A real provider failed renewal and recovery; previous provider simulation left canonical state active.
- A real provider cancellation retaining a future ends_at date; previous dashboard action expired immediately.
- The provider refusing repeat payment against an already-issued checkout link. Database duplicate rejection detects a problem but cannot undo a provider charge.
- Live customer portal and live checkout: store identity verification/activation is pending.
- Final hosted URLs, live webhook/credentials/variant and controlled live smoke test.

Agreed launch price: PKR 150 per month. Existing variant 2016892 is TEST MODE ONLY. Do not use it as a live variant or assume test display flags configure live pricing.

Store approval does not automatically satisfy the remaining provider and deployment gates. Never present the gateway as live-ready until those have evidence.
