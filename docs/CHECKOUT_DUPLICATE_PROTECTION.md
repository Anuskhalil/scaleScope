# Durable checkout protection: prepared, not deployed

The existing single-process guard only coalesces overlapping requests. It does not
prevent separate checkout links, multi-server races, or repeat provider purchases.

## Prepared SQL

`billing_checkout_reservations.sql` adds a private service-role-only table and
SECURITY INVOKER reservation function. Row locking serializes founder reservations;
a partial unique index enforces one unresolved reservation per account and mode.
Signed checkout URLs must never be exposed through browser database access.
No reservation expires automatically. A provider timeout may have created a valid
checkout; treating that timeout as permission to retry would be unsafe.

Do not apply yet. Backend integration and executable recovery tests remain.
For an eventual SQL rehearsal replace the final COMMIT with ROLLBACK; run the
entire transaction. Permission assertions alone are not a concurrency test.
Before application rollback, disable checkout and stop reservation writers.
Preserve unresolved reservations for reconciliation; dropping this table while
provider links remain usable is not a safe rollback.

## Required next integration

1. Reserve before POST /checkouts; only the `create` winner calls the provider.
2. Attach reservation ID in checkout custom data. Persist validated URL, ID and
   provider expiry using a conditional reserved-to-ready update.
3. Reuse a ready matching reservation. Block other selections and ambiguous states.
4. On timeout or persistence failure mark uncertain where possible; never generate
   a replacement without checking provider state. Process death leaves reserved,
   which is also blocked pending reconciliation.
5. Webhook processing must bind the subscription to reservation/account/mode and
   atomically complete it. Preserve historical subscription ownership: old events
   must not overwrite a newer subscription for the same founder.
6. Reconcile provider subscriptions before closing expired reservations. Expired
   checkout links do not prove that no payment succeeded just before expiration.
7. Detect duplicate provider subscriptions and surface an operational alert.
   Do not auto-refund, auto-cancel, or claim the second charge was prevented.

## Acceptance gates

- Two independent backend processes: one provider checkout creation.
- Sequential clicks: same unexpired checkout reused.
- Crash before/after provider POST: blocked until reconciliation.
- A delayed webhook and an old subscription event cannot replace current access.
- Signature, account, store, variant and test/live checks remain mandatory.
- Repeated purchase of the same provider checkout URL must be tested explicitly.
  A reservation cannot by itself make a provider URL single-use.
- Hosted failed-payment and period-end cancellation tests remain separate gates.

Full launch readiness is not established until these gates pass. No absolute
guarantee against provider-side duplicate charges is made.
