const express = require('express');
const supabase = require('../config/supabase');

const router = express.Router();

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post('/check-account', async (req, res, next) => {
  try {
    const email = normalizeEmail(req.body?.email);

    if (!EMAIL_RE.test(email)) {
      return res.status(400).json({
        success: false,
        error: 'Enter a valid email address.',
      });
    }

    const { data, error } = await supabase
      .from('profiles')
      .select('id, user_type')
      .eq('email', email)
      .maybeSingle();

    if (error) throw error;

    return res.json({
      success: true,
      data: {
        exists: Boolean(data?.id && data?.user_type),
        userType: data?.user_type || null,
      },
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
