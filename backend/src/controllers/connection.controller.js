// connection.controller.js
const {sendRequest, respondRequest} = require('../services/connection.service');


const {getIO} = require('../config/socket');
exports.send = async (req, res) => {
  try { const r = await sendRequest(req.user.id, req.body.receiverId, req.body.type, req.body.message); getIO().to(`user:${req.body.receiverId}`).emit('conn:request',{id:r.id,senderId:req.user.id}); res.status(201).json({success:true,requestId:r.id}); }
  catch(e){ res.status(400).json({error:e.message}); }
};
exports.respond = async (req, res) => {
  try { const r = await respondRequest(req.body.requestId, req.body.action, req.user.id); getIO().to(`user:${r.senderId}`).emit('conn:response',{action:req.body.action,requestId:req.body.requestId}); if(r.conversationId) getIO().to(`user:${req.user.id}`).to(`user:${r.senderId}`).emit('conv:created',{id:r.conversationId,with:r.senderId}); res.json({success:true,status:r.status,conversationId:r.conversationId}); }
  catch(e){ res.status(400).json({error:e.message}); }
};