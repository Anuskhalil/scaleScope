const supabase = require('../config/supabase');
const { getGeminiModel } = require('../config/gemini');
const { createHash } = require('node:crypto');

function createGrowthPlanService({ db = supabase, modelFactory = getGeminiModel,
  loadRules = () => import('../../../shared/growthGuidance.mjs'),
  aiEnabled = () => Boolean(process.env.GEMINI_API_KEY), timeoutMs = 10000 } = {}) {
  const cache = new Map();
  return async function getGrowthPlan(userId) {
    const { getGrowthGuidance, applyActionOrder } = await loadRules();
    const base = await db.from('profiles').select('id, user_type, bio, location, updated_at, deleted_at').eq('id', userId).maybeSingle();
    if (base.error) throw base.error;
    if (!base.data || base.data.deleted_at) throw new Error('Active profile not found');
    const role = base.data.user_type;
    if (!['early-stage-founder', 'investor'].includes(role)) throw new Error('Growth guidance is available for founders and investors');
    const roleRes = await db.from(role === 'investor' ? 'investor_profiles' : 'founder_profiles').select('*').eq('user_id', userId).maybeSingle();
    if (roleRes.error) throw roleRes.error;
    const signals = getGrowthGuidance({ profile: base.data, role, [role === 'investor' ? 'investorProfile' : 'founderProfile']: roleRes.data });
    const enabled = aiEnabled();
    const key = userId + ':' + createHash('sha256').update(JSON.stringify([signals, enabled])).digest('hex');
    const now = Date.now();
    for (const [k,v] of cache) if (v.expires <= now) cache.delete(k);
    if (cache.has(key)) return cache.get(key).promise;
    if (cache.size >= 200) cache.delete(cache.keys().next().value);
    const promise = (async () => {
      const fallback = { signals, ai_enabled: false, source: 'rules', generated_at: new Date().toISOString() };
      if (!enabled) return { ...fallback, reason: 'AI is not configured; stage-based guidance remains available.' };
      let timer;
      try {
        // Send no free-text profile, identity, files or financial figures to the model.
        const context = { role, stage: signals.stageKey, missing: signals.clarity.missing.map(c => c.id),
          actions: signals.actions.map(a => ({ id: a.id, title: a.title, priority: a.priority })) };
        const model = modelFactory({ temperature: 0, maxTokens: 350 });
        const request = model.generateContent('Order the supplied startup guidance actions by usefulness. Return ONLY JSON {"action_ids":["id"]}, containing every supplied ID exactly once. Never create IDs. This is prioritization, not verification or investment advice. Context: ' + JSON.stringify(context));
        const result = await Promise.race([request, new Promise((_, reject) => {
          timer = setTimeout(() => reject(new Error('AI timeout')), timeoutMs);
        })]);
        const raw = (await result.response).text().trim().replace(/^\x60\x60\x60(?:json)?\s*/i, '').replace(/\s*\x60\x60\x60$/, '');
        if (raw.length > 4000) throw new Error('AI response too large');
        const parsed = JSON.parse(raw);
        const ordered = applyActionOrder(signals, parsed.action_ids);
        if (!ordered) throw new Error('Invalid action IDs');
        return { signals: ordered, ai_enabled: true, source: 'ai_prioritized_rules', generated_at: new Date().toISOString() };
      } catch {
        return { ...fallback, reason: 'AI prioritization unavailable; using the standard stage-based order.' };
      } finally { clearTimeout(timer); }
    })();
    cache.set(key, { promise, expires: now + 120000 });
    return promise;
  };
}
exports.createGrowthPlanService = createGrowthPlanService;
exports.getGrowthPlan = createGrowthPlanService();

