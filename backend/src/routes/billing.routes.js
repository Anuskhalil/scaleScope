const express = require('express');
const auth = require('../middlewares/auth.middleware');
const {
  checkUsageLimit,
  createCheckout,
  getBillingPortal,
  getPlans,
  getUsage,
  getUserSubscription,
  handleLemonWebhook,
} = require('../services/billing.service');

const router = express.Router();

router.get('/plans', async (req, res, next) => {
  try {
    const role = req.query.role || null;
    const plans = await getPlans({ role });

    res.json({
      success: true,
      data: plans,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/webhook', async (req, res, next) => {
  try {
    const result = await handleLemonWebhook({
      rawBody: req.rawBody,
      signature: req.get('X-Signature'),
      payload: req.body,
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
});

router.use(auth);

router.get('/me', async (req, res, next) => {
  try {
    const billing = await getUserSubscription(req.user.id);

    res.json({
      success: true,
      data: billing,
    });
  } catch (error) {
    next(error);
  }
});

router.get('/usage/:featureKey', async (req, res, next) => {
  try {
    const usage = await getUsage(req.user.id, req.params.featureKey);
    const limit = await checkUsageLimit(req.user.id, req.params.featureKey);

    res.json({
      success: true,
      data: {
        usage,
        limit,
      },
    });
  } catch (error) {
    next(error);
  }
});

router.post('/checkout', async (req, res, next) => {
  try {
    const checkout = await createCheckout({
      userId: req.user.id,
      planCode: req.body?.planCode,
      interval: req.body?.interval || 'monthly',
    });

    res.json({
      success: true,
      data: checkout,
    });
  } catch (error) {
    next(error);
  }
});

router.post('/portal', async (req, res, next) => {
  try {
    const portal = await getBillingPortal(req.user.id);

    res.json({
      success: true,
      data: portal,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
