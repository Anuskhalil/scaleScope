const supabase = require('../config/supabase');

exports.sendRequest = async (senderId, receiverId, type, message) => {
  if (!receiverId) throw new Error('Receiver is required');
  if (senderId === receiverId) throw new Error('Cannot request yourself');

  const requestType = type || 'cofounder_request';

  if (!['mentor_request', 'cofounder_request', 'investor_contact'].includes(requestType)) {
    throw new Error('Invalid request type');
  }

  const { data: existing, error: existingError } = await supabase
    .from('connection_requests')
    .select('id, status, sender_id, receiver_id, type')
    .or(
      `and(sender_id.eq.${senderId},receiver_id.eq.${receiverId}),and(sender_id.eq.${receiverId},receiver_id.eq.${senderId})`
    )
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing?.status === 'pending') {
    return {
      id: existing.id,
      status: 'pending',
      alreadyPending: true,
      senderId: existing.sender_id,
      receiverId: existing.receiver_id,
    };
  }

  if (existing?.status === 'accepted') {
    return {
      id: existing.id,
      status: 'accepted',
      alreadyConnected: true,
      senderId: existing.sender_id,
      receiverId: existing.receiver_id,
    };
  }

  const { data, error } = await supabase
    .from('connection_requests')
    .insert({
      sender_id: senderId,
      receiver_id: receiverId,
      type: requestType,
      status: 'pending',
      message: message?.slice(0, 300) || null,
    })
    .select('id, status, created_at')
    .single();

  if (error) throw error;

  return data;
};

exports.respondRequest = async (requestId, action, userId) => {
  const normalizedAction =
    action === 'accepted' ? 'accept' :
    action === 'declined' ? 'decline' :
    action;

  if (!['accept', 'decline'].includes(normalizedAction)) {
    throw new Error('Invalid action');
  }

  const { data: req, error: fetchErr } = await supabase
    .from('connection_requests')
    .select('id, sender_id, receiver_id, type, status')
    .eq('id', requestId)
    .eq('receiver_id', userId)
    .maybeSingle();

  if (fetchErr) throw fetchErr;
  if (!req) throw new Error('Invalid or expired request');

  if (req.status !== 'pending') {
    return {
      status: req.status,
      senderId: req.sender_id,
      receiverId: req.receiver_id,
      alreadyProcessed: true,
      conversationId: null,
    };
  }

  const newStatus = normalizedAction === 'accept' ? 'accepted' : 'declined';

  const { error: updateErr } = await supabase
    .from('connection_requests')
    .update({
      status: newStatus,
      responded_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateErr) throw updateErr;

  let conversationId = null;

  if (normalizedAction === 'accept') {
    const [u1, u2] =
      req.sender_id < req.receiver_id
        ? [req.sender_id, req.receiver_id]
        : [req.receiver_id, req.sender_id];

    const { error: connErr } = await supabase
      .from('connections')
      .upsert(
        {
          user_1: u1,
          user_2: u2,
          connection_type: req.type,
          connected_at: new Date().toISOString(),
        },
        { onConflict: 'user_1,user_2' }
      );

    if (connErr) throw connErr;

    const { data: convId, error: convErr } = await supabase.rpc(
      'create_conversation_with_participants',
      {
        p_created_by: req.receiver_id,
        p_other_user: req.sender_id,
        p_type: 'direct',
      }
    );

    if (convErr) throw convErr;
    conversationId = convId;
  }

  return {
    status: newStatus,
    conversationId,
    senderId: req.sender_id,
    receiverId: req.receiver_id,
  };
};