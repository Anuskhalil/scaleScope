const supabase = require('../config/supabase');

const VALID_REQUEST_TYPES = [
  'cofounder_request',
  'investor_contact',
  'investor_interest',
  'team_invite',
];

exports.sendRequest = async (senderId, receiverId, type, message) => {
  if (!senderId) throw new Error('Sender is required');
  if (!receiverId) throw new Error('Receiver is required');
  if (senderId === receiverId) throw new Error('Cannot request yourself');
  const { data: participants, error: roleError } = await supabase.from('profiles')
    .select('id,user_type').in('id', [senderId, receiverId]);
  if (roleError) throw roleError;
  if (participants?.length !== 2 || participants.some(p => !['early-stage-founder', 'investor'].includes(p.user_type))) {
    throw new Error('Connections are available between Early Founders and Investors.');
  }

  const requestType = type || 'cofounder_request';

  if (!VALID_REQUEST_TYPES.includes(requestType)) {
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
      type: existing.type,
    };
  }

  if (existing?.status === 'accepted') {
    return {
      id: existing.id,
      status: 'accepted',
      alreadyConnected: true,
      senderId: existing.sender_id,
      receiverId: existing.receiver_id,
      type: existing.type,
    };
  }

  await require('./profileReview.service').assertApproved(receiverId);
  const billing = await require('./billing.service').getUserSubscription(senderId);
  const { data, error } = await supabase.rpc('send_connection_with_allowance', {
    p_sender: senderId, p_receiver: receiverId, p_type: requestType,
    p_message: message?.slice(0, 500) || null,
    p_limit: billing.entitlements.connection_requests,
  });
  if (error) throw Object.assign(new Error('Connection service is temporarily unavailable. Please try again later.'), { status: 503 });
  if (data?.limited) throw Object.assign(new Error('Monthly connection request allowance reached. Existing conversations remain available.'), {
    status: 402, code: 'USAGE_LIMIT_REACHED', used: data.used, limit: data.limit,
    upgradePath: billing.plan.code === 'free' && billing.role === 'early-stage-founder' ? '/pricing' : '/billing',
  });
  if (!data?.id) throw Object.assign(new Error('Connection request could not be confirmed.'), { status: 503 });

  return {
    id: data.id,
    status: data.status,
    senderId: data.sender_id,
    receiverId: data.receiver_id,
    type: data.type,
    alreadyPending: Boolean(data.alreadyPending),
    alreadyConnected: Boolean(data.alreadyConnected),
  };
};

exports.respondRequest = async (requestId, action, userId) => {
  const normalizedAction =
    action === 'accepted' ? 'accept' :
    action === 'declined' ? 'decline' :
    action === 'rejected' ? 'decline' :
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
      updated_at: new Date().toISOString(),
    })
    .eq('id', requestId);

  if (updateErr) throw updateErr;

  let conversationId = null;

  if (normalizedAction === 'accept') {
    const [u1, u2] =
      req.sender_id < req.receiver_id
        ? [req.sender_id, req.receiver_id]
        : [req.receiver_id, req.sender_id];

    const { data: existingConnection, error: existingConnectionErr } = await supabase
      .from('connections')
      .select('id')
      .eq('user_1', u1)
      .eq('user_2', u2)
      .maybeSingle();

    if (existingConnectionErr) throw existingConnectionErr;

    if (!existingConnection) {
      const { error: connErr } = await supabase
        .from('connections')
        .insert({
          user_1: u1,
          user_2: u2,
          connection_type: req.type,
          connected_at: new Date().toISOString(),
        });

      if (connErr) throw connErr;
    }

    const { data: convId, error: convErr } = await supabase.rpc(
      'create_conversation_with_participants',
      {
        p_created_by: req.receiver_id,
        p_other_user: req.sender_id,
        p_type: 'direct',
      }
    );

    if (convErr) {
      throw new Error(
        `Connection accepted, but conversation setup failed. Please run the create_conversation_with_participants SQL function. ${convErr.message}`
      );
    }

    conversationId = convId;
  }

  return {
    status: newStatus,
    conversationId,
    senderId: req.sender_id,
    receiverId: req.receiver_id,
  };
};
