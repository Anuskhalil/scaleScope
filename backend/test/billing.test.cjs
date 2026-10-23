const { test } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const {hasPaidAccess,safePaymentUrl} = require('../src/services/billingPolicy');
const db = require('../src/config/supabase');
const billing = require('../src/services/billing.service');
const user = '00000000-0000-4000-8000-000000000001';

test('paid access requires a current, mode-bound provider subscription', () => {
 const sub={provider:'lemonsqueezy',provider_subscription_id:'123',metadata:{test_mode:true},current_period_end:'2030-01-01',status:'active'};
 for(const status of ['active','on_trial','cancelled']) assert.equal(hasPaidAccess({...sub,status},true,0),true);
 for(const status of ['expired','paused','past_due','unpaid','free']) assert.equal(hasPaidAccess({...sub,status},true,0),false);
 assert.equal(hasPaidAccess(sub,false,0),false);
 assert.equal(hasPaidAccess(sub,true,Date.parse('2031-01-01')),false);
 assert.equal(hasPaidAccess({...sub,current_period_end:null},true,0),false);
 assert.equal(hasPaidAccess({...sub,provider:'manual'},true,0),false);
});
test('only HTTPS Lemon Squeezy URLs are accepted',()=>{
 assert.ok(safePaymentUrl('https://shop.lemonsqueezy.com/checkout/test'));
 for(const url of ['javascript:alert(1)','https://lemonsqueezy.com.evil.invalid','http://shop.lemonsqueezy.com','https://user@shop.lemonsqueezy.com']) assert.equal(safePaymentUrl(url),null);
});

test('period-end cancellation retains access until the exact end instant',()=>{
 const end=Date.parse('2026-11-23T11:15:30Z');
 const sub={provider:'lemonsqueezy',provider_subscription_id:'123',metadata:{test_mode:true},status:'cancelled',current_period_end:new Date(end).toISOString()};
 assert.equal(hasPaidAccess(sub,true,end-1),true);
 assert.equal(hasPaidAccess(sub,true,end),false);
 assert.equal(hasPaidAccess(sub,true,end+1),false);
 assert.equal(hasPaidAccess({...sub,current_period_end:'invalid'},true,end-1),false);
});
test('billing service with synthetic provider and database',async t=>{
 const previousFetch=global.fetch, previousFrom=db.from, previousRpc=db.rpc;
 const previousPricing=process.env.BILLING_PRICING_FINALIZED;
 const previousDurable=process.env.BILLING_DURABLE_CHECKOUT_ENABLED;
 process.env.BILLING_DURABLE_CHECKOUT_ENABLED='false';
 process.env.BILLING_PRICING_FINALIZED='true';
 const keys={BILLING_CHECKOUT_ENABLED:'true',LEMONSQUEEZY_API_KEY:'synthetic',LEMONSQUEEZY_STORE_ID:'10',LEMONSQUEEZY_WEBHOOK_SECRET:'synthetic-secret',LEMONSQUEEZY_TEST_MODE:'true',LEMONSQUEEZY_FOUNDER_PRO_VARIANT_ID:'101',LEMONSQUEEZY_FOUNDER_PRO_YEARLY_VARIANT_ID:'102'};
 const prior=Object.fromEntries(Object.keys(keys).map(k=>[k,process.env[k]])); Object.assign(process.env,keys);
 let role='early-stage-founder', subscription=null, snapshot, calls=[], usedCount=0;
 db.from=table=>{
  const chain={select(){return this;},eq(){return this;},order(){return Promise.resolve({data:[]});},maybeSingle(){return Promise.resolve({data:table==='profiles'?{id:user,user_type:role,email:'test@example.invalid'}:table==='usage_counters'?{used_count:usedCount}:subscription});}};
  return chain;
 };
 db.rpc=async(name,args)=>{assert.equal(name,'apply_lemon_subscription_snapshot');snapshot=args.p_snapshot;return {data:'applied'};};
 global.fetch=async(url,options)=>{
  calls.push({url,options});
  let data;
  if(url.includes('/variants/')) data={attributes:{is_subscription:true,interval:url.endsWith('102')?'year':'month',interval_count:1,test_mode:true}};
  else if(url.endsWith('/checkouts')) data={id:'999',attributes:{url:'https://shop.lemonsqueezy.com/checkout/test'}};
  else data={id:'123',type:'subscriptions',attributes:{store_id:10,variant_id:102,customer_id:20,test_mode:true,status:'active',created_at:'2026-01-01',updated_at:'2026-10-17',renews_at:'2030-01-01',urls:{customer_portal:'https://shop.lemonsqueezy.com/billing/test'}}};
  return {ok:true,json:async()=>({data})};
 };
 const signed=payload=>{const rawBody=Buffer.from(JSON.stringify(payload));return {rawBody,signature:crypto.createHmac('sha256',keys.LEMONSQUEEZY_WEBHOOK_SECRET).update(rawBody).digest('hex')};};
 try {
  await t.test('free founder is allowed below five and blocked at five',async()=>{
   usedCount=4;let state=await billing.checkUsageLimit(user,'connection_requests');assert.equal(state.allowed,true);assert.equal(state.remaining,1);
   usedCount=5;state=await billing.checkUsageLimit(user,'connection_requests');assert.equal(state.allowed,false);assert.equal(state.limit,5);assert.equal(state.remaining,0);usedCount=0;
  });
  await t.test('current Pro has fifty requests; downgrade preserves used count',async()=>{
   subscription={provider:'lemonsqueezy',provider_subscription_id:'123',plan_code:'founder_pro',status:'active',current_period_end:'2030-01-01',metadata:{test_mode:true}};
   usedCount=49;let state=await billing.checkUsageLimit(user,'connection_requests');assert.equal(state.limit,50);assert.equal(state.remaining,1);assert.equal(state.allowed,true);
   usedCount=50;assert.equal((await billing.checkUsageLimit(user,'connection_requests')).allowed,false);
   subscription.status='cancelled';usedCount=7;assert.equal((await billing.checkUsageLimit(user,'connection_requests')).limit,50);
   subscription.current_period_end='2020-01-01';state=await billing.checkUsageLimit(user,'connection_requests');assert.equal(state.limit,5);assert.equal(state.used,7);assert.equal(state.allowed,false);
   subscription=null;usedCount=0;
  });
  await t.test('investors retain free ecosystem allowance',async()=>{
   role='investor';const state=await billing.checkUsageLimit(user,'connection_requests');assert.equal(state.billing.plan.code,'free');assert.equal(state.limit,9999);role='early-stage-founder';
  });
  await t.test('failed renewal removes Pro allowance and recovery restores it without resetting usage',async()=>{
   subscription={provider:'lemonsqueezy',provider_subscription_id:'123',plan_code:'founder_pro',status:'past_due',current_period_end:'2030-01-01',metadata:{test_mode:true}};
   usedCount=7;
   try {
    const failed=await billing.checkUsageLimit(user,'connection_requests');
    assert.equal(failed.limit,5);assert.equal(failed.used,7);assert.equal(failed.allowed,false);
    subscription.status='active';
    const recovered=await billing.checkUsageLimit(user,'connection_requests');
    assert.equal(recovered.limit,50);assert.equal(recovered.used,7);assert.equal(recovered.remaining,43);
   } finally {subscription=null;usedCount=0;}
  });
  await t.test('unfinalized pricing cannot create a checkout',async()=>{
   process.env.BILLING_PRICING_FINALIZED='false';const before=calls.length;
   assert.equal((await billing.createCheckout({userId:user,planCode:'founder_pro'})).url,null);assert.equal(calls.length,before);
   process.env.BILLING_PRICING_FINALIZED='true';
  });
  await t.test('yearly checkout sends yearly variant and bound user',async()=>{
   const result=await billing.createCheckout({userId:user,planCode:'founder_pro',interval:'yearly'});
   assert.ok(result.url); const body=JSON.parse(calls.at(-1).options.body);
   assert.equal(body.data.relationships.variant.data.id,'102'); assert.equal(body.data.attributes.checkout_data.custom.user_id,user);
  });
  await t.test('invalid interval and investor purchase denied',async()=>{
   await assert.rejects(billing.createCheckout({userId:user,planCode:'founder_pro',interval:'weekly'}),{status:400});
   role='investor';await assert.rejects(billing.createCheckout({userId:user,planCode:'founder_pro'}),{status:403});role='early-stage-founder';
  });
  await t.test('existing subscription cannot start another checkout',async()=>{
   subscription={provider_subscription_id:'123',status:'cancelled'};
   await assert.rejects(billing.createCheckout({userId:user,planCode:'founder_pro'}),{status:409});subscription=null;
  });
  await t.test('disabled checkout makes no provider request',async()=>{
   process.env.BILLING_CHECKOUT_ENABLED='false';const count=calls.length;
   assert.equal((await billing.createCheckout({userId:user,planCode:'founder_pro'})).url,null);assert.equal(calls.length,count);process.env.BILLING_CHECKOUT_ENABLED='true';
  });
  await t.test('invalid signatures and order events never grant access',async()=>{
   await assert.rejects(billing.handleLemonWebhook({rawBody:Buffer.from('{}'),signature:'bad'}),{status:400});
   assert.equal((await billing.handleLemonWebhook(signed({meta:{event_name:'order_created'}}))).ignored,true);
  });
  await t.test('invoice fetches canonical subscription, ignores caller plan and parsed body',async()=>{
   const payload={meta:{event_name:'subscription_payment_success',test_mode:true,custom_data:{user_id:user,plan_code:'forged'}},data:{type:'subscription-invoices',id:'9999',attributes:{subscription_id:123}}};
   await billing.handleLemonWebhook({...signed(payload),payload:{meta:{custom_data:{user_id:'forged'}}}});
   assert.equal(snapshot.provider_subscription_id,'123');assert.equal(snapshot.plan_code,'founder_pro');assert.equal(snapshot.user_id,user);
  });
  await t.test('wrong mode ignored; owner substitution rejected',async()=>{
   const payload={meta:{event_name:'subscription_updated',custom_data:{user_id:user}},data:{type:'subscriptions',id:'123',attributes:{test_mode:false}}};
   assert.equal((await billing.handleLemonWebhook(signed(payload))).reason,'wrong_mode');
   payload.data.attributes.test_mode=true;subscription={user_id:'different'};
   await assert.rejects(billing.handleLemonWebhook(signed(payload)),{status:409});subscription=null;
  });
  await t.test('portal URL is refreshed and tied to customer',async()=>{
   subscription={provider:'lemonsqueezy',provider_subscription_id:'123',provider_customer_id:'20'};
   assert.equal((await billing.getBillingPortal(user)).url,'https://shop.lemonsqueezy.com/billing/test');
   subscription.provider_customer_id='21';await assert.rejects(billing.getBillingPortal(user),{status:403});
  });
  await t.test('durable service reuses checkout across concurrent and sequential requests',async()=>{
   subscription=null;
   process.env.BILLING_DURABLE_CHECKOUT_ENABLED='true';
   const from=db.from, rpc=db.rpc;
   let reservation=null;
   const reservationId='00000000-0000-4000-8000-000000000002';
   const before=calls.filter(c=>c.url.endsWith('/checkouts')).length;
   db.rpc=async(name,args)=>{
    assert.equal(name,'reserve_billing_checkout');assert.equal(args.p_user_id,user);
    assert.equal(args.p_test_mode,true);assert.equal(args.p_variant_id,'101');
    if(reservation) return {data:{action:'reuse',reservation}};
    reservation={id:reservationId};return {data:{action:'create',reservation}};
   };
   db.from=table=>{
    if(table!=='billing_checkout_reservations') return from(table);
    return {update(values){Object.assign(reservation,values);const chain={eq(){return chain;},select(){return chain;},async maybeSingle(){return {data:{id:reservationId}};}};return chain;}};
   };
   try {
    const results=await Promise.all(Array.from({length:6},()=>billing.createCheckout({userId:user,planCode:'founder_pro'})));
    results.push(await billing.createCheckout({userId:user,planCode:'founder_pro'}));
    assert.ok(results.every(r=>r.checkoutId==='999' && r.url===results[0].url));
    assert.equal(calls.filter(c=>c.url.endsWith('/checkouts')).length-before,1);
    const post=calls.findLast(c=>c.url.endsWith('/checkouts'));
    assert.equal(JSON.parse(post.options.body).data.attributes.checkout_data.custom.checkout_reservation_id,reservationId);
   } finally {db.from=from;db.rpc=rpc;}
  });
  await t.test('durable webhook binds reservation and applies canonical failed-payment and recovery status',async()=>{
   const fetch=global.fetch,rpc=db.rpc;
   const reservationId='00000000-0000-4000-8000-000000000002';
   try {
    for(const [event,status] of [['subscription_payment_failed','past_due'],['subscription_payment_recovered','active'],['subscription_cancelled','cancelled'],['subscription_expired','expired']]) {
     global.fetch=async(...args)=>{const response=await fetch(...args);const body=await response.json();body.data.attributes.status=status;return {ok:true,json:async()=>body};};
     db.rpc=async(name,args)=>{
      assert.equal(name,'complete_billing_checkout');assert.equal(args.p_reservation_id,reservationId);
      assert.equal(args.p_snapshot.status,status);
      assert.equal(hasPaidAccess(args.p_snapshot,true,Date.parse('2026-10-23')),['active','cancelled'].includes(status));
      return {data:'applied'};
     };
     const payload={meta:{event_name:event,test_mode:true,custom_data:{user_id:user,checkout_reservation_id:reservationId}},data:{type:'subscriptions',id:'123',attributes:{test_mode:true}}};
     assert.equal((await billing.handleLemonWebhook(signed(payload))).result,'applied');
    }
    db.rpc=async()=>({error:new Error('Duplicate purchase requires reconciliation')});
    await assert.rejects(billing.handleLemonWebhook(signed({meta:{event_name:'subscription_updated',test_mode:true,custom_data:{user_id:user}},data:{type:'subscriptions',id:'123',attributes:{test_mode:true}}})),/reconciliation/);
   } finally {global.fetch=fetch;db.rpc=rpc;}
  });
 } finally {
  if(previousDurable===undefined)delete process.env.BILLING_DURABLE_CHECKOUT_ENABLED;else process.env.BILLING_DURABLE_CHECKOUT_ENABLED=previousDurable;
  global.fetch=previousFetch;db.from=previousFrom;db.rpc=previousRpc;
  if(previousPricing===undefined)delete process.env.BILLING_PRICING_FINALIZED;else process.env.BILLING_PRICING_FINALIZED=previousPricing;
  for(const [key,value] of Object.entries(prior)) if(value===undefined)delete process.env[key];else process.env[key]=value;
 }
});
