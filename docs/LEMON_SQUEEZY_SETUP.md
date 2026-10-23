# ScaleScope Lemon Squeezy setup

## Current status

Code audit aur fixes prepare hain; live payment launch approved/verified nahi hai.
Koi payment, subscription, hosted database migration ya deployment is work mein execute nahi ki gayi.
Backend `.env` mein API key, store ID, webhook secret aur monthly variant configured hain.
Yearly variant missing hai. Secrets ki validity ya provider dashboard settings abhi verify nahi ki gayi.
`BILLING_CHECKOUT_ENABLED` default false hai aur test mode enabled hai.

## SQL pehle review karein

1. Main project ki database backup lein. Root `billing_payment_hardening.sql` review karein.
2. Rehearsal ke liye us file ki LAST `COMMIT;` line ko `ROLLBACK;` karke poori query run karein.
3. Expected result `BILLING_HARDENING_CHECKS_PASS` hai. Yeh catalog permission assertions hain, full hosted payment test nahi.
4. Rehearsal successful ho to original file final `COMMIT;` ke saath manually run karein.
5. Agar unexpected write policy ya duplicate subscription error ho, stop karein aur result share karein; policies blindly delete na karein.
6. Apply ke baad `billing_security_rehearsal.sql` run karein. Yeh duplicate/stale/new snapshot tests
   ke temporary writes rollback karta hai; expected `BILLING_SECURITY_REHEARSAL_PASS_ROLLED_BACK`.

Existing SELECT policies preserve hain. Browser roles billing rows edit nahi kar sakte.
RPC SECURITY INVOKER hai, SECURITY DEFINER nahi; sirf service_role ko EXECUTE diya hai.
Atomic updates same-account concurrent webhook calls serialize karti hain aur duplicate/older revisions ignore karti hain.
RPC server ke verified provider snapshot par depend karta hai; browser ko service key kabhi na dein.
Migration run na hone par new webhook writes fail/retry hongi; checkout tab tak disabled rakhein.
Committed rollback ke liye checkout disable karke reviewed backup/grants restore plan use karein;
client write grants ko blindly wapas kholna safe rollback nahi hai.

## Lemon Squeezy dashboard

1. Test mode mein Founder Pro subscription product verify/create karein.
2. Monthly variant: har 1 month recurring. Yearly variant: har 1 year recurring.
3. App ke subscription_plans prices aur Lemon prices/currency consistent rakhein.
   Current fallback prices USD 15/month aur USD 144/year hain; actual DB/catalog ko confirm karein.
4. Dono variant IDs copy karein. Monthly ID ko yearly ID ki jagah use na karein.
5. Backend `.env` mein hi settings rakhein:

```dotenv
LEMONSQUEEZY_API_KEY=<test API key>
LEMONSQUEEZY_STORE_ID=<store ID>
LEMONSQUEEZY_FOUNDER_PRO_VARIANT_ID=<monthly variant ID>
LEMONSQUEEZY_FOUNDER_PRO_YEARLY_VARIANT_ID=<yearly variant ID>
LEMONSQUEEZY_WEBHOOK_SECRET=<webhook signing secret>
LEMONSQUEEZY_TEST_MODE=true
BILLING_CHECKOUT_ENABLED=false
BILLING_PRICING_FINALIZED=false
FRONTEND_URL=http://localhost:5173
```

API key/signing secret `VITE_` variables, git ya chat mein na rakhein.
Yearly variant missing ho to yearly checkout unavailable rahega, monthly mein silently convert nahi hoga.

## Webhook

Lemon Squeezy ko publicly reachable HTTPS backend URL chahiye:
`https://YOUR-BACKEND/api/billing/webhook`.
Localhost par provider directly deliver nahi kar sakta. Local test ke liye controlled HTTPS tunnel
ya test deployment use karna hoga; is work mein koi tunnel expose nahi kiya gaya.
Dashboard webhook signing secret aur backend secret exactly same rakhein.
Events: subscription_created, subscription_updated, subscription_cancelled, subscription_resumed,
subscription_expired, subscription_paused, subscription_unpaused, subscription_plan_changed,
subscription_payment_success, subscription_payment_failed, subscription_payment_recovered.
`order_created` se paid access grant nahi hota.

## App flow

Founder account menu -> Explore Founder Pro -> monthly/yearly -> Lemon Squeezy checkout.
Connection request limit hit ho to Compare Founder Pro link milta hai.
Billing -> View Plans se bhi pricing khulti hai. Investors ka access free rehta hai.
Checkout return URL se Pro activate nahi hota: signed webhook aur current subscription required hain.
Billing page confirmation poll karti hai; Manage Billing fresh provider portal kholta hai.
Cancelled subscription paid period end tak rehti hai. Expired/paused/past_due/unpaid par free access hota hai.
Past-due grace period abhi intentionally offer nahi kiya; business decision badle to policy/tests update karein.
Payment se profile approval, verification, match ranking ya private evidence access nahi milta.

## Required checks before enabling payments

1. Billing SQL rehearsal/apply aur permissions verify karein.
2. `founder_allowance.sql` rehearse/apply karein. Request creation aur usage increment ab atomic RPC
   use karte hain. Hosted concurrency test abhi baqi hai; `docs/FOUNDER_PLAN_WORKFLOW.md` follow karein.
3. Prices finalize aur catalog se match karne ke baad `BILLING_PRICING_FINALIZED=true` karein.
   Test backend mein `BILLING_CHECKOUT_ENABLED=true` sirf controlled payment testing ke liye karein, restart karein.
4. Test founder se monthly aur yearly test checkout complete karein; provider dashboard total verify karein.
5. Signed webhook 200, effective Founder Pro, correct renewal date aur quota verify karein.
6. Refresh/duplicate webhook se extra grant na ho. Another account ya investor ko paid access na mile.
7. Portal open, cancellation grace, expiry, failed payment, wrong test/live mode verify karein.
8. Existing subscription par second purchase blocked hona chahiye. Multiple pre-created checkout links
   ko parallel purchase karne ka scenario abhi covered nahi: provider subscriptions reconcile/refund manually;
   checkout creation idempotency is a remaining release gate.
9. Test credentials/variants ko LIVE equivalents se replace, `LEMONSQUEEZY_TEST_MODE=false`, live webhook configure,
   real frontend URL aur deployment secrets set karein. Live transaction sirf owner ke explicit approval se karein.

Unit tests mocked provider/database ke saath hain; real hosted checkout, refund, tax aur renewal tests pending hain.
Old subscription rows missing mode/end/revision metadata automatically Pro nahi banti;
provider dashboard se reconcile/replay karein, manually status forge na karein.

## References

- https://docs.lemonsqueezy.com/guides/developer-guide/webhooks
- https://docs.lemonsqueezy.com/guides/developer-guide/testing-going-live
- https://docs.lemonsqueezy.com/guides/developer-guide/customer-portal
- https://docs.lemonsqueezy.com/api/subscriptions/the-subscription-object
