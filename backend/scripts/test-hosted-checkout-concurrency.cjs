const { fork } = require('node:child_process');
const { randomUUID } = require('node:crypto');
const assert = require('node:assert/strict');
const db = require('../src/config/supabase');

async function reserve(userId) {
  const result = await db.rpc('reserve_billing_checkout', {
    p_user_id: userId, p_test_mode: true, p_variant_id: '2016892', p_interval: 'monthly',
  });
  if (result.error) throw Error(result.error.message);
  return { action: result.data.action, id: result.data.reservation?.id };
}

if (process.argv[2] === '--worker') {
  process.on('message', async userId => {
    try { process.send({ result: await reserve(userId) }); }
    catch (e) { process.send({ error: e.message }); }
    finally { process.disconnect(); }
  });
  process.send({ ready: true });
} else {
  (async () => {
    if (process.argv[2] !== '--run-synthetic' || process.env.LEMONSQUEEZY_TEST_MODE !== 'true') throw Error('Explicit synthetic test flag and test mode required');
    const email = `billing-race-${randomUUID()}@example.invalid`;
    let userId;
    const children = [];
    try {
      const created = await db.auth.admin.createUser({ email, password: randomUUID() + randomUUID(), email_confirm: true, user_metadata: { full_name: 'Synthetic Billing Race', user_type: 'early-stage-founder' } });
      if (created.error) throw created.error;
      userId = created.data.user.id;
      const profile = await db.from('profiles').select('id,user_type').eq('id', userId).single();
      if (profile.error || profile.data.user_type !== 'early-stage-founder') throw Error('Synthetic founder profile missing');
      const workers = Array.from({ length: 8 }, () => {
        const child = fork(__filename, ['--worker'], { stdio: ['ignore', 'ignore', 'ignore', 'ipc'] });
        children.push(child);
        let readyResolve;
        const ready = new Promise(resolve => { readyResolve = resolve; });
        const result = new Promise((resolve, reject) => {
          const timeout = setTimeout(() => { child.kill(); reject(Error('Worker timed out')); }, 30000);
          child.on('message', message => {
            if (message.ready) readyResolve();
            else { clearTimeout(timeout); message.error ? reject(Error(message.error)) : resolve(message.result); }
          });
          child.on('error', e => { clearTimeout(timeout); reject(e); });
        });
        return { child, ready, result };
      });
      await Promise.all(workers.map(w => w.ready));
      workers.forEach(w => w.child.send(userId));
      const results = await Promise.all(workers.map(w => w.result));
      assert.equal(results.filter(x => x.action === 'create').length, 1);
      assert.equal(results.filter(x => x.action === 'reconcile').length, 7);
      assert.equal(new Set(results.map(x => x.id)).size, 1);
      assert.equal((await reserve(userId)).action, 'reconcile');
      const rows = await db.from('billing_checkout_reservations').select('id').eq('user_id', userId);
      if (rows.error) throw rows.error;
      assert.equal(rows.data.length, 1);
      console.log('PASS: eight independent processes produced one reservation; seven blocked safely');
      console.log('PASS: sequential retry stays blocked while provider outcome is unknown');
      const firstReservation = results[0].id;
      const subscriptionId = '9' + Date.now();
      let revision = Date.now();
      const snapshot = status => ({
        user_id: userId, provider: 'lemonsqueezy', plan_code: 'founder_pro', status,
        provider_subscription_id: subscriptionId, provider_customer_id: subscriptionId,
        current_period_start: new Date().toISOString(),
        current_period_end: new Date(Date.now() + 86400000).toISOString(),
        cancel_at_period_end: status === 'cancelled',
        metadata: { test_mode: true, variant_id: '2016892', provider_updated_at: new Date(++revision).toISOString() },
      });
      const complete = (value, reservation = firstReservation) => db.rpc('complete_billing_checkout', { p_snapshot: value, p_reservation_id: reservation });
      const initial = snapshot('active');
      const wrongMode = await complete({ ...initial, metadata: { ...initial.metadata, test_mode: false } });
      assert.match(wrongMode.error?.message || '', /mismatch/);
      for (const status of ['active', 'past_due', 'active', 'cancelled', 'expired']) {
        const value = snapshot(status);
        const applied = await complete(value);
        if (applied.error) throw applied.error;
        assert.equal(applied.data, 'applied');
        const row = await db.from('user_subscriptions').select('*').eq('user_id', userId).single();
        if (row.error) throw row.error;
        assert.equal(row.data.status, status);
        assert.equal(require('../src/services/billingPolicy').hasPaidAccess(row.data, true), ['active', 'cancelled'].includes(status));
        if (status === 'cancelled') {
          assert.equal((await reserve(userId)).action, 'subscription_exists');
          assert.equal(require('../src/services/billingPolicy').hasPaidAccess(row.data, true, Date.parse(row.data.current_period_end)), false);
        }
      }
      assert.equal((await complete(initial)).data, 'duplicate_or_stale');
      const duplicate = await complete({ ...snapshot('active'), provider_subscription_id: subscriptionId + '1' });
      assert.match(duplicate.error?.message || '', /Duplicate purchase/);
      const next = await reserve(userId);
      assert.equal(next.action, 'create');
      const replacement = await complete({ ...snapshot('active'), provider_subscription_id: subscriptionId + '2' }, next.id);
      if (replacement.error) throw replacement.error;
      assert.equal(replacement.data, 'applied');
      assert.equal((await complete(snapshot('active'))).data, 'historical_subscription_ignored');
      const current = await db.from('user_subscriptions').select('provider_subscription_id').eq('user_id', userId).single();
      if (current.error) throw current.error;
      assert.equal(current.data.provider_subscription_id, subscriptionId + '2');
      console.log('PASS: hosted synthetic completion, failure/recovery and future-end cancellation access');
      console.log('PASS: wrong mode, stale revision, duplicate purchase and historical replacement guards');
      console.log('No provider checkout or payment created');
    } finally {
      children.forEach(child => { if (child.connected) child.kill(); });
      if (userId) {
        const removed = await db.auth.admin.deleteUser(userId);
        if (removed.error) throw Error('Synthetic auth cleanup failed: ' + removed.error.message);
        const rows = await db.from('billing_checkout_reservations').select('id').eq('user_id', userId);
        if (rows.error || rows.data.length) throw Error('Synthetic reservation cleanup needs attention');
        const subscriptions = await db.from('user_subscriptions').select('user_id').eq('user_id', userId);
        if (subscriptions.error || subscriptions.data.length) throw Error('Synthetic subscription cleanup needs attention');
        console.log('PASS: synthetic account, reservations and subscription removed');
      }
    }
  })().catch(e => { console.error(e.message); process.exitCode = 1; });
}
