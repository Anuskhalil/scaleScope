// src/pages/MentorRolePages/MentorDashboard.jsx
import React, { useState, useEffect, useCallback, useMemo, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchMentorDashboard,
  calcMentorCompletion,
  getMentorProfileNudges,
  rankFoundersForMentor,
  rankStudentsForMentor,
  respondToRequest,
  getOrCreateConversation,
  sendConnectionRequest,
} from '../../services/mentorService';
import {
  Rocket,
  Users,
  MessageSquare,
  UserPlus,
  Target,
  CheckCircle,
  Clock,
  GraduationCap,
  Shield,
  Edit3,
  Inbox,
  Loader,
  Settings,
  TrendingUp,
  Tag,
  X,
  Network,
  ArrowRight,
  BookOpen,
  Bell,
  Sparkles,
} from 'lucide-react';

const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --black: #000000;
    --white: #FFFFFF;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }

  .page-bg {
    background: var(--gray-50);
    background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px);
    background-size: 28px 28px;
  }

  .g-brand {
    background: linear-gradient(135deg, var(--primary), var(--primary-dark));
  }

  .g-sec {
    background: linear-gradient(135deg, var(--secondary), var(--secondary-light));
  }

  .lift {
    transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease;
    will-change: transform;
  }

  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(27,45,127,.12);
  }

  .shimmer {
    background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 12px;
  }

  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  .journey-item {
    border: 2px solid var(--gray-200);
    border-radius: 14px;
    padding: 14px;
    transition: all .2s;
  }

  .journey-item.done {
    border-color: #10B981;
    background: #F0FDF4;
  }

  .journey-item.active {
    border-color: var(--secondary);
    background: #F8FAFC;
  }

  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .idea-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 4px 10px;
    background: rgba(152,222,56,0.15);
    color: #1B2D7F;
    border-radius: 20px;
    font-size: 11px;
    font-weight: 600;
    text-transform: uppercase;
  }

  .idea-stage {
    display: inline-block;
    padding: 2px 8px;
    background: rgba(27,45,127,0.1);
    color: #1B2D7F;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 500;
  }

  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box{opacity:1;visibility:visible;transform:translateY(0)}
  .tooltip-box{opacity:0;visibility:hidden;transform:translateY(4px);transition:all .15s ease;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:#1e293b;color:#fff;font-size:11px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:240px;white-space:normal;text-align:left}
  .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;margin-left:-4px;border-width:4px;border-style:solid;border-color:#1e293b transparent transparent transparent}
`;

const initials = (name) => {
  if (!name) return '?';

  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const timeAgo = (iso) => {
  if (!iso) return '';

  const seconds = (Date.now() - new Date(iso)) / 1000;

  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;

  return `${Math.floor(seconds / 86400)}d`;
};

const Avatar = memo(({ name, path, grad = 'from-gray-400 to-gray-500', size = 'md' }) => {
  const [failed, setFailed] = useState(false);

  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
    xl: 'w-14 h-14',
  }[size];

  if (path && !failed) {
    return (
      <img
        src={path}
        alt=""
        className={`${sizeClass} object-cover rounded-xl`}
        loading="lazy"
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold rounded-xl`}
      aria-hidden="true"
    >
      {initials(name)}
    </div>
  );
});

const DASHBOARD_MIN_MATCH = 60;

function ConnectionActionNotice({ notice, onClose, onMessage }) {
  if (!notice) return null;

  const isAccepted = notice.type === 'accepted';
  const person = notice.person || {};
  const name = person.full_name || 'User';

  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 shadow-sm lift">
      <div className="flex items-start gap-3">
        <Avatar name={name} path={person.avatar_url} size="lg" grad="from-indigo-500 to-purple-500" />

        <div className="flex-1 min-w-0">
          <p className="font-bold text-gray-900 text-sm">
            {isAccepted ? `${name} is now a mentee.` : 'Invitation ignored.'}
          </p>

          <p className="text-xs text-gray-500 mt-1">
            {isAccepted
              ? 'You can now message each other in real time.'
              : `You won't see this request again.`}
          </p>

          {isAccepted && (
            <button
              type="button"
              onClick={() => onMessage?.(person.id)}
              className="px-3 py-2 rounded-xl bg-[#98DE38] text-black text-xs font-bold hover:opacity-90 mt-3"
            >
              Send a message to {name}
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onClose}
          className="w-8 h-8 rounded-lg hover:bg-gray-100 flex items-center justify-center flex-shrink-0"
          aria-label="Close notice"
        >
          <X className="w-4 text-gray-500" />
        </button>
      </div>
    </div>
  );
}

function MentorSuggestionCard({
  person,
  type,
  helpState,
  onOfferHelp,
  onOpenChat,
}) {
  const [loading, setLoading] = useState(false);
  const profile = person.profiles || {};
  const personId = person.user_id;
  const name = profile.full_name || person.full_name || (type === 'founder' ? 'Founder' : 'Student Founder');
  const score = Number(person._score || person.matchScore || 0);
  const title =
    person.company_name ||
    person.idea_title ||
    person.startup_idea_description ||
    (type === 'founder' ? 'Startup match' : 'Student with an idea');

  const handleConnect = async () => {
    if (!personId || helpState || loading) return;

    try {
      setLoading(true);
      await onOfferHelp(personId);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition lift">
      <div className="flex items-center gap-3 mb-3">
        <Avatar
          name={name}
          path={profile.avatar_url}
          size="lg"
          grad={type === 'founder' ? 'from-amber-500 to-orange-500' : 'from-indigo-500 to-blue-500'}
        />

        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">
            {name}
          </h3>

          <p className="text-xs text-gray-500 truncate">
            {profile.location || title || 'Mentor match'}
          </p>
        </div>

        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-indigo-50 text-indigo-700 flex-shrink-0">
          {score}% Match
        </span>
      </div>

      {title && (
        <p className="text-xs text-gray-600 mb-3 line-clamp-2">
          {title}
        </p>
      )}

      {person._matchReason && (
        <p className="text-xs text-gray-600 mb-4">
          {person._matchReason}
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link
          to={`/user-profile/${personId}`}
          className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold hover:bg-indigo-100 transition flex items-center justify-center"
        >
          View Profile
        </Link>

        <button
          type="button"
          onClick={() => onOpenChat?.(personId)}
          disabled={helpState !== 'accepted'}
          className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${helpState === 'accepted'
            ? 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
            : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
            }`}
        >
          <MessageSquare className="w-3.5 mr-1" />
          {helpState === 'accepted' ? 'Message' : 'Connect first'}
        </button>

        {helpState === 'sent' || helpState === 'pending' ? (
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
            onClick={handleConnect}
            disabled={loading}
            className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center disabled:opacity-60"
          >
            {loading ? (
              <Loader className="w-3.5 animate-spin mr-1" />
            ) : (
              <GraduationCap className="w-3.5 mr-1" />
            )}
            {loading ? 'Sending...' : 'Request'}
          </button>
        )}
      </div>
    </div>
  );
}

function MyMenteesCard({ mentees = [], onMessage }) {
  const visibleMentees = mentees.slice(0, 5);

  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-gray-900 flex items-center gap-2">
          <Network className="w-4 text-[#1B2D7F]" />
          My Mentees
        </h3>

        <span className="text-xs font-bold px-2 py-1 rounded-full bg-green-50 text-green-700">
          {mentees.length}
        </span>
      </div>

      {mentees.length === 0 ? (
        <div className="text-center py-6">
          <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gray-50 flex items-center justify-center">
            <Users className="w-5 text-gray-400" />
          </div>

          <p className="text-sm text-gray-700 font-bold">
            No mentees yet
          </p>

          <p className="text-xs text-gray-400 mt-1">
            Accept mentorship requests or connect with founders to build your network.
          </p>

          <Link
            to="/mentor/find-founders"
            className="inline-flex mt-4 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl hover:opacity-90"
          >
            Find Founders
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {visibleMentees.map((item) => {
            const person = item.user || item.sender || {};

            return (
              <div
                key={item.id || item.requestId || person.id}
                className="flex items-center gap-3 p-2 rounded-xl hover:bg-gray-50 transition"
              >
                <Avatar
                  name={person.full_name}
                  path={person.avatar_url}
                  size="md"
                />

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">
                    {person.full_name || 'User'}
                  </p>

                  <p className="text-xs text-gray-500 truncate capitalize">
                    {person.user_type?.replace(/-/g, ' ') || 'Mentee'}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => onMessage?.(person.id)}
                  className="px-2.5 py-1.5 text-xs font-bold rounded-lg border border-gray-200 hover:border-[#98DE38] hover:bg-[#98DE38]/10 transition"
                >
                  Message
                </button>
              </div>
            );
          })}
        </div>
      )}

      {mentees.length > 5 && (
        <Link
          to="/mentor/my-mentees"
          className="w-full mt-4 py-2 text-xs font-bold text-[#1B2D7F] hover:underline flex items-center justify-center gap-1"
        >
          View all mentees <ArrowRight className="w-3" />
        </Link>
      )}
    </div>
  );
}

export default function MentorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  const [data, setData] = useState({
    profile: {},
    mentorProfile: {},
    requests: [],
    mentees: [],
    founders: [],
    students: [],
    convos: [],
  });

  const [responding, setResponding] = useState({});
  const [helpStates, setHelpStates] = useState({});
  const [actionNotice, setActionNotice] = useState(null);

  const load = useCallback(async ({ silent = false } = {}) => {
    if (!user?.id) return;

    if (!silent) {
      setState({
        loading: true,
        error: null,
      });
    }

    try {
      const dashboard = await fetchMentorDashboard(user.id);
      const founders = rankFoundersForMentor(dashboard.founders || [], dashboard.mentorProfile || {});
      const students = rankStudentsForMentor(dashboard.students || [], dashboard.mentorProfile || {});

      setData({
        profile: dashboard.profile || {},
        mentorProfile: dashboard.mentorProfile || {},
        requests: dashboard.requests || [],
        mentees: dashboard.mentees || [],
        founders,
        students,
        convos: dashboard.convos || [],
      });

      setState({
        loading: false,
        error: null,
      });
    } catch (err) {
      console.error('Mentor dashboard load failed:', err);
      if (!silent) {
        setState({
          loading: false,
          error: 'Failed to load dashboard',
        });
      } else {
        setState((prev) => ({
          ...prev,
          loading: false,
        }));
      }
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const openConversationWith = useCallback(async (personId) => {
    if (!personId) return;

    try {
      const convId = await getOrCreateConversation(user.id, personId);
      navigate(convId ? `/mentor/messages?conv=${convId}` : '/mentor/messages');
    } catch (err) {
      console.error('Open mentor chat error:', err);
    }
  }, [navigate, user?.id]);

  const handleAccept = async (id) => {
    const req = data.requests.find((item) => item.id === id);
    const sender = req?.sender || {};
    const senderId = sender.id;

    if (!req || !senderId) return;

    const person = {
      id: senderId,
      full_name: sender.full_name || 'User',
      user_type: sender.user_type,
      avatar_url: sender.avatar_url,
      location: sender.location,
    };

    setResponding((prev) => ({
      ...prev,
      [id]: 'accepted',
    }));

    setData((prev) => ({
      ...prev,
      requests: prev.requests.filter((item) => item.id !== id),
      mentees: [
        {
          id,
          type: req.type,
          created_at: new Date().toISOString(),
          user: person,
        },
        ...(prev.mentees || []).filter((item) => {
          const mentee = item.user || item.sender || {};
          return mentee.id !== senderId;
        }),
      ],
    }));

    setActionNotice({
      type: 'accepted',
      requestId: id,
      person,
    });

    try {
      await respondToRequest(id, 'accepted');
      setTimeout(() => load({ silent: true }), 600);
    } catch (err) {
      console.error('Mentor accept request error:', err);
      setData((prev) => ({
        ...prev,
        requests: [req, ...prev.requests],
        mentees: prev.mentees.filter((item) => {
          const mentee = item.user || item.sender || {};
          return mentee.id !== senderId;
        }),
      }));
      setActionNotice(null);
    } finally {
      setResponding((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };

  const handleDecline = async (id) => {
    const req = data.requests.find((item) => item.id === id);
    const sender = req?.sender || {};

    if (!req) return;

    setResponding((prev) => ({
      ...prev,
      [id]: 'declined',
    }));

    setData((prev) => ({
      ...prev,
      requests: prev.requests.filter((item) => item.id !== id),
    }));

    setActionNotice({
      type: 'declined',
      requestId: id,
      person: {
        id: sender.id,
        full_name: sender.full_name || 'User',
        user_type: sender.user_type,
        avatar_url: sender.avatar_url,
        location: sender.location,
      },
    });

    try {
      await respondToRequest(id, 'declined');
      setTimeout(() => load({ silent: true }), 600);
    } catch (err) {
      console.error('Mentor decline request error:', err);
      setData((prev) => ({
        ...prev,
        requests: [req, ...prev.requests],
      }));
      setActionNotice(null);
    } finally {
      setResponding((prev) => ({
        ...prev,
        [id]: null,
      }));
    }
  };

  const handleOfferHelp = async (personId) => {
    if (!personId || helpStates[personId]) return;

    setHelpStates((prev) => ({
      ...prev,
      [personId]: 'pending',
    }));

    try {
      await sendConnectionRequest(
        user.id,
        personId,
        'mentor_offer',
        'Hi, your profile looks relevant to my mentorship experience. I would be happy to help where my background fits.'
      );
    } catch (err) {
      if (!err.message?.includes('23505')) {
        console.error('Mentor offer failed:', err);
        setHelpStates((prev) => ({
          ...prev,
          [personId]: null,
        }));
      }
    }
  };

  const hiddenConnectedIds = useMemo(() => {
    const ids = new Set();

    (data.mentees || []).forEach((item) => {
      const person = item.user || item.sender || {};
      if (person.id) ids.add(person.id);
    });

    return ids;
  }, [data.mentees]);

  const visibleFounders = useMemo(() => {
    return (data.founders || [])
      .filter((founder) => {
        const score = Number(founder._score || founder.matchScore || founder.match_score || founder.score || 0);
        return founder.user_id && !hiddenConnectedIds.has(founder.user_id) && score >= DASHBOARD_MIN_MATCH;
      })
      .sort((a, b) => Number(b._score || 0) - Number(a._score || 0))
      .slice(0, 5);
  }, [data.founders, hiddenConnectedIds]);

  const visibleStudents = useMemo(() => {
    return (data.students || [])
      .filter((student) => {
        const score = Number(student._score || student.matchScore || student.match_score || student.score || 0);
        return student.user_id && !hiddenConnectedIds.has(student.user_id) && score >= DASHBOARD_MIN_MATCH;
      })
      .sort((a, b) => Number(b._score || 0) - Number(a._score || 0))
      .slice(0, 5);
  }, [data.students, hiddenConnectedIds]);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center text-red-600">
        {state.error}
      </div>
    );
  }

  const { profile, mentorProfile, requests, mentees, convos } = data;
  const completion = calcMentorCompletion(profile, mentorProfile);
  const nudges = getMentorProfileNudges(profile, mentorProfile);
  const unread = (convos || []).reduce((sum, conv) => sum + Number(conv.unreadCount || 0), 0);
  const capacity = Number(mentorProfile.mentorship_capacity || 3);
  const activeCt = mentees.length;
  const spotsLeft = Math.max(0, capacity - activeCt);
  const currentRole = profile.user_type || 'mentor';

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl p-6 mb-6 border bg-white border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700">
                  {currentRole}
                </span>

                <h1 className="text-2xl sm:text-3xl font-black mt-3">
                  Welcome, {profile.full_name?.split(' ')[0] || 'there'}
                </h1>

                <p className="mt-2 text-sm max-w-lg text-gray-500">
                  Your mission control. Guide founders, review requests, and manage mentorship conversations.
                </p>
              </div>

              <div className="flex gap-2 flex-wrap">
                <Link
                  to="/mentor/find-founders"
                  className="px-4 py-2 g-brand text-black font-bold text-sm rounded-xl hover:opacity-90"
                >
                  Find Founders
                </Link>

                <Link
                  to="/mentor/my-mentees"
                  className="px-4 py-2 border-2 border-gray-200 font-semibold text-sm rounded-xl hover:bg-gray-50"
                >
                  Mentees
                </Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              {
                label: 'Profile',
                val: `${completion}%`,
                sub: completion > 70 ? 'Great' : 'Add more',
                Icon: Shield,
              },
              {
                label: 'Messages',
                val: convos.length,
                sub: unread ? `${unread} unread` : 'Active chats',
                Icon: MessageSquare,
              },
              {
                label: 'Requests',
                val: requests.length,
                sub: 'Pending review',
                Icon: Inbox,
              },
              {
                label: 'Mentees',
                val: activeCt,
                sub: `${spotsLeft} spots open`,
                Icon: GraduationCap,
              },
            ].map((stat, index) => (
              <div
                key={index}
                className="bg-white rounded-xl p-4 border border-gray-100 lift"
              >
                <div className="w-9 h-9 rounded-lg g-sec flex items-center justify-center text-white mb-2">
                  <stat.Icon className="w-4 h-4" />
                </div>

                <p className="font-black text-xl text-gray-900">
                  {stat.val}
                </p>

                <p className="text-xs text-gray-500">
                  {stat.label} · {stat.sub}
                </p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              <ConnectionActionNotice
                notice={actionNotice}
                onClose={() => setActionNotice(null)}
                onMessage={openConversationWith}
              />

              {requests.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                    <Inbox className="w-5 text-violet-500" />
                    Pending Requests
                  </h2>

                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div
                        key={request.id}
                        className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-xl"
                      >
                        <Avatar
                          name={request.sender?.full_name}
                          path={request.sender?.avatar_url}
                          size="md"
                        />

                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">
                            {request.sender?.full_name}
                          </p>

                          <p className="text-xs text-gray-500">
                            {request.type?.replace('_', ' ')} · {timeAgo(request.created_at)}
                          </p>
                        </div>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleAccept(request.id)}
                            disabled={!!responding[request.id]}
                            className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-60"
                          >
                            {responding[request.id] === 'accepted' ? 'Accepting...' : 'Accept'}
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDecline(request.id)}
                            disabled={!!responding[request.id]}
                            className="px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg hover:border-red-200 hover:text-red-600 disabled:opacity-60"
                          >
                            Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <Target className="w-5 text-[#1B2D7F]" />
                  Your Journey
                </h2>

                <div className="space-y-3">
                  <div className={`journey-item ${completion >= 70 ? 'done' : 'active'}`}>
                    <div className="flex justify-between items-start gap-3">
                      <div className="flex items-start gap-3 flex-1">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${completion >= 70 ? 'bg-green-100' : 'bg-indigo-100'}`}>
                          {completion >= 70 ? <CheckCircle className="w-4 text-green-600" /> : <Shield className="w-4 text-[#1B2D7F]" />}
                        </span>

                        <div className="min-w-0 flex-1">
                          <p className="font-semibold text-sm">
                            Mentor Profile
                          </p>

                          <p className="text-xs text-gray-500">
                            {completion >= 70 ? 'Profile ready for better matches' : 'Add expertise and availability'}
                          </p>

                          {nudges.length > 0 && (
                            <div className="flex flex-wrap gap-2 mt-2">
                              {nudges.map((nudge) => (
                                <span key={nudge.field} className="idea-badge">
                                  <Tag className="w-3" />
                                  {nudge.msg}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      <Link
                        to="/mentor/profile"
                        className="text-xs font-bold px-3 py-1.5 g-brand text-black rounded-lg hover:opacity-90 flex-shrink-0"
                      >
                        {completion >= 70 ? 'Edit' : 'Add'}
                      </Link>
                    </div>
                  </div>

                  <div className="journey-item active">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <Users className="w-4 text-gray-600" />
                        </span>

                        <div>
                          <p className="font-semibold text-sm">
                            Founder Guidance
                          </p>

                          <p className="text-xs text-gray-500">
                            Help builders move faster
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/mentor/find-founders"
                        className="text-xs font-bold px-3 py-1.5 g-brand text-black rounded-lg"
                      >
                        Find Founders
                      </Link>
                    </div>
                  </div>

                  <div className="journey-item">
                    <div className="flex justify-between items-center gap-3">
                      <div className="flex items-center gap-3">
                        <span className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center">
                          <MessageSquare className="w-4 text-gray-600" />
                        </span>

                        <div>
                          <p className="font-semibold text-sm">
                            Mentor Conversations
                          </p>

                          <p className="text-xs text-gray-500">
                            Keep guidance moving
                          </p>
                        </div>
                      </div>

                      <Link
                        to="/mentor/messages"
                        className="text-xs font-bold px-3 py-1.5 border-2 border-gray-200 text-gray-600 rounded-lg hover:bg-gray-50"
                      >
                        Browse
                      </Link>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <UserPlus className="w-5 text-indigo-500" />
                    AI Suggested Founders
                  </h2>

                  <Link
                    to="/mentor/find-founders"
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Browse all →
                  </Link>
                </div>

                {visibleFounders.length > 0 ? (
                  <div className="space-y-3">
                    {visibleFounders.map((founder) => (
                      <MentorSuggestionCard
                        key={founder.user_id || founder.id}
                        person={founder}
                        type="founder"
                        helpState={helpStates[founder.user_id]}
                        onOfferHelp={handleOfferHelp}
                        onOpenChat={openConversationWith}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-700">
                      No strong founder matches right now
                    </p>
                    <p className="text-xs text-gray-400 mt-1">
                      Dashboard only shows top founder matches with 60%+ score.
                    </p>

                    <Link
                      to="/mentor/find-founders"
                      className="inline-flex mt-3 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl"
                    >
                      Browse more
                    </Link>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2">
                    <GraduationCap className="w-5 text-indigo-500" />
                    AI Suggested Student Founders
                  </h2>

                  <Link
                    to="/mentor/find-founders"
                    className="text-xs text-indigo-600 font-semibold"
                  >
                    Browse all →
                  </Link>
                </div>

                {visibleStudents.length > 0 ? (
                  <div className="space-y-3">
                    {visibleStudents.map((student) => (
                      <MentorSuggestionCard
                        key={student.user_id || student.id}
                        person={student}
                        type="student"
                        helpState={helpStates[student.user_id]}
                        onOfferHelp={handleOfferHelp}
                        onOpenChat={openConversationWith}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-700">
                      No student founder matches right now
                    </p>

                    <p className="text-xs text-gray-400 mt-1">
                      Dashboard only shows top student founder matches with 60%+ score.
                    </p>

                    <Link
                      to="/mentor/find-founders"
                      className="inline-flex mt-3 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl"
                    >
                      Browse founders
                    </Link>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="g-sec rounded-2xl p-5 text-white">
                <h3 className="font-bold mb-4 flex items-center gap-2">
                  <Shield className="w-4" />
                  My Profile
                </h3>

                <div className="flex items-center gap-3 mb-4">
                  <Avatar
                    name={profile.full_name}
                    path={profile.avatar_url}
                    size="lg"
                  />

                  <div>
                    <p className="font-semibold">
                      {profile.full_name || 'Complete Profile'}
                    </p>

                    {mentorProfile.current_role && (
                      <p className="text-xs text-white/70">
                        {mentorProfile.current_role}
                        {mentorProfile.current_company ? ` · ${mentorProfile.current_company}` : ''}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex justify-between text-sm mb-1">
                  <span className="text-white/70">Complete</span>
                  <span className="font-bold">{completion}%</span>
                </div>

                <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4">
                  <div
                    className="h-full bg-white rounded-full"
                    style={{
                      width: `${completion}%`,
                    }}
                  />
                </div>

                <Link
                  to="/mentor/profile"
                  className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
                >
                  <Edit3 className="w-4" />
                  Edit Profile
                </Link>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">
                  Quick Links
                </h3>

                <nav className="space-y-1">
                  {[
                    {
                      label: 'Find Founders',
                      to: '/mentor/find-founders',
                      Icon: UserPlus,
                    },
                    {
                      label: 'My Mentees',
                      to: '/mentor/my-mentees',
                      Icon: GraduationCap,
                    },
                    {
                      label: 'Messages',
                      to: '/mentor/messages',
                      Icon: MessageSquare,
                    },
                    {
                      label: 'Discover',
                      to: '/mentor/discover',
                      Icon: Rocket,
                    },
                    {
                      label: 'Preferences',
                      to: '/mentor/settings',
                      Icon: Settings,
                    },
                  ].map((item) => (
                    <Link
                      key={item.to}
                      to={item.to}
                      className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"
                    >
                      <item.Icon className="w-4 text-gray-500" />
                      {item.label}
                    </Link>
                  ))}
                </nav>
              </div>

              <MyMenteesCard
                mentees={mentees}
                onMessage={openConversationWith}
              />
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}
