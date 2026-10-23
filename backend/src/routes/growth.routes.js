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
  for (const [id, timestamps] of hits) {
    if (!timestamps.some(ts => now - ts < windowMs)) hits.delete(id);
  }
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
    // Never trust client-supplied role, scores, user ID or task completion.
    const plan = await getGrowthPlan(req.user.id);
    return res.json({ data: plan });
  } catch (err) {
    return next(err);
  }
});

router.post('/match-outcome', rateLimit, async (req, res, next) => {
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

    const { data: target, error: targetError } = await supabase.from('profiles')
      .select('id,user_type').eq('id', targetUserId).is('deleted_at', null).maybeSingle();
    if (targetError) throw targetError;
    if (!target || !['early-stage-founder','investor'].includes(target.user_type)) return res.status(404).json({error:'Profile unavailable'});
    const table = target.user_type === 'investor' ? 'investor_profiles' : 'founder_profiles';
    const {data: visible,error: visibilityError}=await supabase.from(table).select('user_id').eq('user_id',targetUserId).eq('is_public',true).eq('is_active',true).maybeSingle();
    if(visibilityError)throw visibilityError;
    if(!visible)return res.status(404).json({error:'Profile unavailable'});
    if(rating !== null && rating !== undefined && rating !== '' && (!Number.isFinite(Number(rating)) || Number(rating)<1 || Number(rating)>5)) {
      return res.status(400).json({error:'Rating must be between 1 and 5'});
    }
    const safeRating = rating === null || rating === undefined || rating === ''
      ? null
      : Math.max(1, Math.min(5, Number(rating)));

    const safeTags = Array.isArray(reasonTags)
      ? reasonTags.map((tag) => String(tag).trim().slice(0,80)).filter(Boolean).slice(0, 8)
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

    await require('../services/matching.service').record([{
      actor_id:req.user.id,target_id:targetUserId,event_type:'feedback_reported',
      reference:outcome+':'+new Date().toISOString().slice(0,10),
      payload:{outcome,rating:safeRating,reason_tags:safeTags,source:'user_report',confirmed:false}
    }]);
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
