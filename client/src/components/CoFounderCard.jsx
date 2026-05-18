import { useEffect, useState } from 'react';
import { MessageSquare, UserPlus, CheckCircle, Clock, Loader } from 'lucide-react';
import { backendApi } from '../lib/backendApi';
import { Link } from 'react-router-dom';
import toast from 'react-hot-toast';

export default function CofounderCard({
  user: c,
  matchScore = 0,
  reasons = [],
  connectionStatus,
  onStatusChange,
  onOpenChat,
}) {
  const [loading, setLoading] = useState(false);
  const [localStatus, setLocalStatus] = useState(connectionStatus || null);

  useEffect(() => {
    if (connectionStatus) {
      setLocalStatus(connectionStatus);
    }
  }, [connectionStatus]);

  const getUserId = () => {
    return c?.profile_id || c?.user_id || c?.id || c?.profiles?.id;
  };

  const getName = () => {
    return c?.full_name || c?.name || c?.profiles?.full_name || 'there';
  };

  const setStatusEverywhere = (targetId, status) => {
    setLocalStatus(status);
    onStatusChange?.(targetId, status);
  };

  const handleConnect = async () => {
    const targetId = getUserId();

    if (!targetId) {
      toast.error('Could not find user id for this cofounder');
      console.error('Missing cofounder target id:', c);
      return;
    }

    try {
      setLoading(true);

      const res = await backendApi.sendConnect(
        targetId,
        `Hi ${getName()}, our profiles match ${matchScore || 0}%. Let's connect.`,
        'cofounder_request'
      );

      if (res.alreadyConnected || res.status === 'accepted') {
        setStatusEverywhere(targetId, 'accepted');
        toast.success('Already connected');
        return;
      }

      setStatusEverywhere(targetId, 'pending');
      toast.success(res.alreadyPending ? 'Request already pending' : 'Connection request sent');

    } catch (err) {
      console.error('Connect error:', err);

      const msg = err.message?.toLowerCase() || '';

      if (msg.includes('already connected')) {
        setStatusEverywhere(targetId, 'accepted');
        toast.success('Already connected');
        return;
      }

      if (msg.includes('already pending') || msg.includes('request already pending')) {
        setStatusEverywhere(targetId, 'pending');
        toast.success('Request already pending');
        return;
      }

      toast.error(err.message || 'Could not send request');
    } finally {
      setLoading(false);
    }
  };

  const handleMsg = async () => {
    const targetId = getUserId();

    if (!targetId) {
      toast.error('Cannot open chat: User ID missing');
      return;
    }

    try {
      const res = await backendApi.getOrCreateConversation(targetId);
      const conversationId = res.conversationId || res.id || res.data?.id;
      onOpenChat?.(conversationId);
    } catch (e) {
      console.error('Chat error:', e);
      toast.error('Could not open chat');
    }
  };

  const renderConnectButton = () => {
    if (localStatus === 'accepted') {
      return (
        <button
          type="button"
          disabled
          className="flex-1 py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center cursor-default"
        >
          <CheckCircle className="w-3.5 mr-1" /> Connected
        </button>
      );
    }

    if (localStatus === 'pending') {
      return (
        <button
          type="button"
          disabled
          className="flex-1 py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center cursor-default"
        >
          <Clock className="w-3.5 mr-1" /> Pending
        </button>
      );
    }

    return (
      <button
        type="button"
        onClick={handleConnect}
        disabled={loading}
        className="flex-1 py-2 bg-[#98DE38] text-black rounded-xl text-xs font-bold hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
      >
        {loading ? (
          <>
            <Loader className="w-3.5 mr-1 animate-spin" /> Sending...
          </>
        ) : (
          <>
            <UserPlus className="w-3.5 mr-1" /> Connect
          </>
        )}
      </button>
    );
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition lift">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-12 h-12 bg-gradient-to-br from-indigo-400 to-purple-500 rounded-xl flex items-center justify-center text-white font-bold text-lg">
          {getName()?.[0]?.toUpperCase() || '?'}
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">
            {getName()}
          </h3>
          <p className="text-xs text-gray-500 truncate">
            {c?.university || c?.degree || 'Student'}
          </p>
        </div>

        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-[#98DE38]/20 text-[#1B2D7F] flex-shrink-0">
          {matchScore}% Match
        </span>
      </div>

      {reasons?.length > 0 && (
        <p className="text-xs text-gray-600 mb-4">
          {reasons.join(' • ')}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
        <Link
          to={`/user-profile/${personId}`}
          className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
        >
          View Profile
        </Link>

        <button
          type="button"
          onClick={() => {
            if (connectionStatus === 'accepted') {
              onMessage(personId);
            }
          }}
          disabled={connectionStatus !== 'accepted'}
          title={
            connectionStatus === 'accepted'
              ? 'Message this connection'
              : 'Connect first to send messages'
          }
          className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${connectionStatus === 'accepted'
              ? 'border-gray-200 hover:border-gray-300 text-gray-800'
              : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
        >
          <MessageSquare className="w-3.5 mr-1" />
          {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
        </button>

        {buttonState === 'accepted' ? (
          <button
            type="button"
            disabled
            className="py-2 bg-green-50 border border-green-200 text-green-700 rounded-xl text-xs font-bold flex items-center justify-center"
          >
            <CheckCircle className="w-3.5 mr-1" />
            Connected
          </button>
        ) : buttonState === 'pending' || buttonState === 'sent' ? (
          <button
            type="button"
            disabled
            className="py-2 bg-amber-50 border border-amber-200 text-amber-700 rounded-xl text-xs font-bold flex items-center justify-center"
          >
            <Clock className="w-3.5 mr-1" />
            Pending
          </button>
        ) : (
          <button
            type="button"
            onClick={() => onConnect(candidate)}
            disabled={buttonState === true}
            className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
          >
            {buttonState === true ? (
              <Loader className="w-3.5 animate-spin mr-1" />
            ) : (
              <UserPlus className="w-3.5 mr-1" />
            )}
            {buttonState === true ? 'Sending...' : 'Connect'}
          </button>
        )}
      </div>
    </div>
  );
}