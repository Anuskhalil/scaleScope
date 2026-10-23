// A provider timeout is ambiguous: never release a reservation automatically.
async function reservedCheckout({ db, userId, testMode, variantId, interval, create }) {
  const { data, error } = await db.rpc('reserve_billing_checkout', {
    p_user_id: userId, p_test_mode: testMode,
    p_variant_id: String(variantId), p_interval: interval,
  });
  if (error) throw Object.assign(new Error('Checkout protection is unavailable. Please contact support.'), { status: 503, cause: error });
  const reservation = data?.reservation;
  if (data?.action === 'reuse' && reservation?.checkout_url) {
    return { url: reservation.checkout_url, checkoutId: reservation.provider_checkout_id };
  }
  if (data?.action !== 'create' || !reservation?.id) {
    throw Object.assign(new Error('An existing checkout or subscription needs reconciliation. Please contact support before paying again.'), { status: 409 });
  }
  const checkout = await create(reservation.id);
  const result = await db.from('billing_checkout_reservations').update({
    state: 'ready', provider_checkout_id: checkout.checkoutId,
    checkout_url: checkout.url, expires_at: checkout.expiresAt,
    updated_at: new Date().toISOString(),
  }).eq('id', reservation.id).eq('state', 'reserved').select('id').maybeSingle();
  if (result.error || !result.data) {
    throw Object.assign(new Error('Checkout confirmation is pending. Do not start another payment; contact support.'), { status: 503 });
  }
  return checkout;
}

module.exports = { reservedCheckout };
