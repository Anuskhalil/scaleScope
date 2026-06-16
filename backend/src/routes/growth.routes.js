const express = require('express');
const auth = require('../middlewares/auth.middleware');
const { getGrowthPlan } = require('../services/growthPlan.service');
const supabase = require('../config/supabase');

const router = express.Router();
const hits = new Map();
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const isUuid = (value) => UUID_RE.test(String(value || ''));

router.use(auth);

function rateLimit(req, res, next) {
  const key = req.user.id;
  const now = Date.now();
  const windowMs = 60 * 1000;
  const max = 8;
  const bucket = (hits.get(key) || []).filter((ts) => now - ts < windowMs);

  if (bucket.length >= max) {
    return res.status(429).json({
      error: 'Too many AI requests. Please wait a minute and try again.',
    });
  }

  bucket.push(now);
  hits.set(key, bucket);
  return next();
}

router.post('/plan', rateLimit, async (req, res, next) => {
  try {
    const signals = req.body?.signals && typeof req.body.signals === 'object'
      ? req.body.signals
      : {};

    const plan = await getGrowthPlan(req.user.id, signals);
    return res.json({ data: plan });
  } catch (err) {
    return next(err);
  }
});

router.post('/match-outcome', async (req, res, next) => {
  try {
    const {
      targetUserId,
      context = 'profile_view',
      outcome,
      rating,
      reasonTags = [],
      notes,
    } = req.body || {};

    const validOutcomes = new Set([
      'good_fit',
      'poor_fit',
      'no_response',
      'met_off_platform',
      'not_ready',
    ]);

    if (!isUuid(targetUserId)) {
      return res.status(400).json({ error: 'Valid targetUserId is required' });
    }

    if (targetUserId === req.user.id) {
      return res.status(400).json({ error: 'You cannot review yourself' });
    }

    if (!validOutcomes.has(outcome)) {
      return res.status(400).json({ error: 'Invalid match outcome' });
    }

    const safeRating = rating === null || rating === undefined || rating === ''
      ? null
      : Math.max(1, Math.min(5, Number(rating)));

    const safeTags = Array.isArray(reasonTags)
      ? reasonTags.map((tag) => String(tag).trim()).filter(Boolean).slice(0, 8)
      : [];

    const { error } = await supabase
      .from('match_outcomes')
      .insert({
        reviewer_id: req.user.id,
        target_user_id: targetUserId,
        context: String(context || 'profile_view').slice(0, 80),
        outcome,
        rating: Number.isFinite(safeRating) ? safeRating : null,
        reason_tags: safeTags,
        notes: notes ? String(notes).trim().slice(0, 500) : null,
      });

    if (error) throw error;

    return res.json({ success: true });
  } catch (err) {
    if (err.message?.includes('match_outcomes')) {
      return res.status(501).json({
        error: 'Match feedback table is missing. Please run sql/phase3_feedback_loop.sql first.',
      });
    }

    return next(err);
  }
});

module.exports = router;
