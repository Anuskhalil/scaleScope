// cofounder.controller.js
exports.getMatches = async (req, res) => {
    try { const m = await require('../services/aiMatcher.service').getCoFounderMatches(req.user.id); res.json({success:true,data:m}); }
    catch(e){ res.status(500).json({error:e.message}); }
  };