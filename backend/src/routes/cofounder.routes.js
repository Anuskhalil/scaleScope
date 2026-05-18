const express = require('express');
const auth = require('../middlewares/auth.middleware');
const { getCoFounderMatches } = require('../services/aiMatcher.service');

const router = express.Router();
router.use(auth);

router.get('/', async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 8;
    const matches = await getCoFounderMatches(req.user.id, limit);
    res.json({ success: true, data: matches });
  } catch (e) {
    console.error('Cofounder route error:', e);
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;