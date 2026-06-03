// src/pages/MessagesPage.jsx
import React, { useState, useEffect, useCallback, memo, useRef, useMemo } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { getSocket, initSocket } from '../../lib/socketClient';
import { backendApi } from '../../lib/backendApi';
import {
  Search,
  Send,
  Paperclip,
  X,
  Loader,
  CheckCheck,
  MessageSquare,
  ArrowLeft,
  GraduationCap,
  DollarSign,
  Bot,
  MoreVertical,
  Pencil,
  Trash2,
  Video,
} from 'lucide-react';
import toast from 'react-hot-toast';

// 🎨 BRAND CSS
const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --white: #fff;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }

  .page-bg { background: var(--gray-50); }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }

  .bbl-out {
    background: var(--secondary);
    color: var(--white);
    border-radius: 18px 18px 4px 18px;
  }

  .bbl-in {
    background: var(--gray-100);
    color: var(--secondary);
    border-radius: 18px 18px 18px 4px;
  }

  .shimmer {
    background: linear-gradient(90deg, var(--gray-200) 25%, #ddd 50%, var(--gray-200) 75%);
    background-size: 200% 100%;
    animation: s 1.5s infinite;
    border-radius: 12px;
  }

  .ai-badge {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    padding: 2px 8px;
    background: rgba(27,45,127,0.1);
    color: #1B2D7F;
    border-radius: 12px;
    font-size: 10px;
    font-weight: 500;
  }

  @keyframes s {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      animation-duration: 0.01ms !important;
      transition-duration: 0.01ms !important;
    }
  }

  @media (max-width: 768px) {
    button, [role="button"] {
      min-height: 44px;
      min-width: 44px;
      padding: 10px 14px;
    }
  }
`;

// 🔧 UTILS
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function getCachedUrl(path) {
  if (!path || path.startsWith('http')) return path;

  const key = `av:${path}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

  try {
    const { data } = await supabase.storage
      .from('avatars')
      .createSignedUrl(path.replace('avatars/', ''), 3600);

    if (data?.signedUrl) {
      AVATAR_CACHE.set(key, {
        url: data.signedUrl,
        ts: Date.now(),
      });

      return data.signedUrl;
    }
  } catch (err) {
    console.warn('Avatar signed URL failed:', err);
  }

  return null;
}

const initials = (name) => {
  if (!name) return '?';

  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const formatTime = (iso) => {
  if (!iso) return '';

  const date = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);

  if (diffDays === 0) {
    return date.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  if (diffDays === 1) return 'Yesterday';

  return date.toLocaleDateString();
};

const gradForType = (type) => {
  return {
    mentor: 'from-violet-500 to-indigo-500',
    investor: 'from-emerald-500 to-teal-500',
    student: 'from-indigo-500 to-blue-500',
    'early-stage-founder': 'from-amber-500 to-orange-500',
  }[type] || 'from-gray-400 to-gray-500';
};

// 🧩 COMPONENTS
const Avatar = memo(({ name, path, grad = 'from-gray-400 to-gray-500', size = 'md' }) => {
  const [url, setUrl] = useState(null);

  useEffect(() => {
    let cancelled = false;

    getCachedUrl(path).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  const sizeClass = {
    sm: 'w-8 h-8',
    md: 'w-10 h-10',
    lg: 'w-12 h-12',
  }[size];

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className={`${sizeClass} rounded-xl object-cover`}
        loading="lazy"
        onError={() => setUrl(null)}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold`}
    >
      {initials(name)}
    </div>
  );
});

const MsgBubble = memo(({ msg, isMe, onEdit, onDelete }) => (
  <div className={`flex ${isMe ? 'justify-end' : 'justify-start'} mb-2 group`}>
    <div className={`relative max-w-[88%] sm:max-w-[75%] px-4 py-3 text-sm rounded-2xl ${isMe ? 'bbl-out' : 'bbl-in'}`}>
      {isMe && !msg.is_ai_generated && (
        <div className="absolute -left-10 top-2 opacity-0 group-hover:opacity-100 transition">
          <div className="relative">
            <button
              type="button"
              className="p-1.5 rounded-lg bg-white border border-gray-200 text-gray-500 hover:text-gray-800"
              aria-label="Message actions"
            >
              <MoreVertical className="w-4" />
            </button>

            <div className="absolute right-0 top-8 hidden group-hover:block bg-white border border-gray-200 rounded-xl shadow-lg overflow-hidden z-10 min-w-28">
              <button
                type="button"
                onClick={() => onEdit(msg)}
                className="w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2"
              >
                <Pencil className="w-3.5" /> Edit
              </button>
              <button
                type="button"
                onClick={() => onDelete(msg)}
                className="w-full px-3 py-2 text-xs text-red-600 hover:bg-red-50 flex items-center gap-2"
              >
                <Trash2 className="w-3.5" /> Delete
              </button>
            </div>
          </div>
        </div>
      )}

      <p className="whitespace-pre-wrap break-words">
        {msg.content}
      </p>

      {msg.updated_at && msg.updated_at !== msg.created_at && (
        <span className="text-[10px] opacity-60">
          edited
        </span>
      )}

      {msg.is_ai_generated && (
        <div className="ai-badge mt-1">
          <Bot className="w-3" /> Auto-reply while user was away
        </div>
      )}

      <p className={`text-xs mt-1 opacity-70 flex items-center gap-1 ${isMe ? 'justify-end' : ''}`}>
        {formatTime(msg.created_at)}
        {isMe && (
          <CheckCheck className={`w-3 h-3 ${msg.seen_by_other ? 'text-[#98DE38]' : 'opacity-50'}`} />
        )}
      </p>
    </div>
  </div>
));

// 🚀 MAIN COMPONENT
export default function MessagesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const convIdFromUrl = searchParams.get('conv');

  const [state, setState] = useState({
    loading: true,
    sidebar: window.innerWidth >= 768,
    loadingMessages: false,
  });

  const [data, setData] = useState({
    convos: [],
    messages: [],
    active: null,
  });

  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [meetingStarting, setMeetingStarting] = useState(false);
  const [editing, setEditing] = useState(null);
  const [filters, setFilters] = useState({
    cat: 'All',
    query: '',
  });

  const msgRef = useRef(null);
  const socketCleanupRef = useRef(null);
  const activeConversationRef = useRef(null);

  const scrollToBottom = useCallback(() => {
    setTimeout(() => {
      msgRef.current?.scrollIntoView({
        behavior: 'smooth',
      });
    }, 80);
  }, []);

  const setupSocketSubscription = useCallback(async (conversationId) => {
    if (!conversationId || !user?.id) return;

    let socket = getSocket();

    if (!socket) {
      socket = await initSocket(user.id);
    }

    if (!socket) return;

    socket.emit('join:conv', conversationId);

    const newHandler = (newMsg) => {
      if (newMsg.conversation_id !== conversationId) return;

      setData((prev) => {
        if (prev.messages.some((m) => m.id === newMsg.id)) {
          return prev;
        }

        return {
          ...prev,
          messages: [...prev.messages, newMsg],
          convos: prev.convos.map((convo) => {
            if (convo.id !== conversationId) return convo;

            return {
              ...convo,
              lastMessage: newMsg,
              last_message_at: newMsg.created_at,
            };
          }),
        };
      });

      if (newMsg.sender_id !== user.id) {
        backendApi.markConversationRead(conversationId).catch((err) => {
          console.warn('Auto mark read failed:', err);
        });
      }

      scrollToBottom();
    };

    const updateHandler = (updatedMsg) => {
      if (updatedMsg.conversation_id !== conversationId) return;

      setData((prev) => ({
        ...prev,
        messages: prev.messages.map((message) =>
          message.id === updatedMsg.id
            ? { ...message, ...updatedMsg }
            : message
        ),
        convos: prev.convos.map((convo) =>
          convo.id === conversationId && convo.lastMessage?.id === updatedMsg.id
            ? { ...convo, lastMessage: { ...convo.lastMessage, ...updatedMsg } }
            : convo
        ),
      }));
    };

    const deleteHandler = (deletedMsg) => {
      if (deletedMsg.conversation_id !== conversationId) return;

      setData((prev) => ({
        ...prev,
        messages: prev.messages.filter((message) => message.id !== deletedMsg.id),
        convos: prev.convos.map((convo) =>
          convo.id === conversationId && convo.lastMessage?.id === deletedMsg.id
            ? { ...convo, lastMessage: null }
            : convo
        ),
      }));
    };

    const readHandler = (payload) => {
      if (payload.conversation_id !== conversationId || payload.reader_id === user.id) return;

      setData((prev) => ({
        ...prev,
        messages: prev.messages.map((message) =>
          message.sender_id === user.id && new Date(message.created_at) <= new Date(payload.read_at)
            ? { ...message, seen_by_other: true }
            : message
        ),
      }));
    };

    const presenceHandler = (payload) => {
      setData((prev) => {
        if (prev.active?.otherUser?.id !== payload.userId) return prev;

        return {
          ...prev,
          active: {
            ...prev.active,
            otherUser: {
              ...prev.active.otherUser,
              isOnline: payload.online,
            },
          },
          convos: prev.convos.map((convo) =>
            convo.otherUser?.id === payload.userId
              ? {
                ...convo,
                otherUser: {
                  ...convo.otherUser,
                  isOnline: payload.online,
                },
              }
              : convo
          ),
        };
      });
    };

    socket.on('msg:new', newHandler);
    socket.on('msg:updated', updateHandler);
    socket.on('msg:deleted', deleteHandler);
    socket.on('conv:read', readHandler);
    socket.on('presence:update', presenceHandler);

    return () => {
      socket.off('msg:new', newHandler);
      socket.off('msg:updated', updateHandler);
      socket.off('msg:deleted', deleteHandler);
      socket.off('conv:read', readHandler);
      socket.off('presence:update', presenceHandler);
    };
  }, [user?.id, scrollToBottom]);

  const selectConvo = useCallback(async (conversation) => {
    if (!conversation?.id || !user?.id) return;

    activeConversationRef.current = conversation.id;

    setData((prev) => ({
      ...prev,
      active: conversation,
      messages: [],
    }));

    setState((prev) => ({
      ...prev,
      sidebar: window.innerWidth >= 768,
      loadingMessages: true,
    }));

    try {
      const response = await backendApi.getConversationMessages(conversation.id);
      const msgs = response.data || [];
      const meta = response.meta || {};

      setData((prev) => ({
        ...prev,
        active: {
          ...conversation,
          otherUser: {
            ...(conversation.otherUser || {}),
            isOnline: Boolean(meta.otherUserOnline ?? conversation.otherUser?.isOnline),
            last_read_at: meta.otherLastReadAt || conversation.otherUser?.last_read_at,
          },
        },
        messages: msgs,
        convos: prev.convos.map((item) =>
          item.id === conversation.id
            ? {
              ...item,
              unreadCount: 0,
            }
            : item
        ),
      }));

      await backendApi.markConversationRead(conversation.id);

      socketCleanupRef.current?.();
      socketCleanupRef.current = await setupSocketSubscription(conversation.id);

      scrollToBottom();
    } catch (err) {
      console.error('Failed to load messages:', err);
      toast.error(err.message || 'Failed to load messages');
    } finally {
      setState((prev) => ({
        ...prev,
        loadingMessages: false,
      }));
    }
  }, [user?.id, setupSocketSubscription, scrollToBottom]);

  const loadConvos = useCallback(async () => {
    if (!user?.id) return;

    try {
      setState((prev) => ({
        ...prev,
        loading: true,
      }));

      const response = await backendApi.getConversations();
      const conversations = response.data || [];

      setData((prev) => ({
        ...prev,
        convos: conversations,
      }));

      if (conversations.length > 0) {
        const target =
          conversations.find((conversation) => conversation.id === convIdFromUrl) ||
          conversations[0];

        if (target && activeConversationRef.current !== target.id) {
          await selectConvo(target);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
      toast.error(err.message || 'Failed to load conversations');
    } finally {
      setState((prev) => ({
        ...prev,
        loading: false,
      }));
    }
  }, [user?.id, convIdFromUrl, selectConvo]);

  useEffect(() => {
    loadConvos();
  }, [loadConvos]);

  useEffect(() => {
    const handleResize = () => {
      setState((prev) => ({
        ...prev,
        sidebar: window.innerWidth >= 768,
      }));
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  useEffect(() => {
    return () => {
      socketCleanupRef.current?.();
    };
  }, []);

  const startMeeting = async () => {
    const activeConversation = data.active;
    const targetUser = activeConversation?.otherUser;

    if (!activeConversation?.id || meetingStarting) {
      toast.error('Open a conversation first');
      return;
    }

    try {
      setMeetingStarting(true);
      const response = await backendApi.createMeeting({
        conversationId: activeConversation.id,
        title: `Meeting with ${targetUser?.full_name || 'ScaleScope user'}`,
      });

      const meetingId = response.data?.id;
      if (!meetingId) throw new Error('Meeting was created without an id');

      navigate(`/meetings/${meetingId}`);
    } catch (err) {
      console.error('Create meeting failed:', err);
      toast.error(err.message || 'Could not start meeting');
    } finally {
      setMeetingStarting(false);
    }
  };

  const sendMsg = async () => {
    const text = input.trim();

    if (!text || !data.active || sending || !user?.id) return;

    setSending(true);

    try {
      if (editing) {
        const response = await backendApi.editConversationMessage(data.active.id, editing.id, text);
        const updatedMsg = response.data;

        setData((prev) => ({
          ...prev,
          messages: prev.messages.map((message) =>
            message.id === updatedMsg.id
              ? { ...message, ...updatedMsg }
              : message
          ),
          convos: prev.convos.map((convo) =>
            convo.id === data.active.id && convo.lastMessage?.id === updatedMsg.id
              ? { ...convo, lastMessage: { ...convo.lastMessage, ...updatedMsg } }
              : convo
          ),
        }));

        setEditing(null);
        setInput('');
        return;
      }

      const socket = getSocket();

      if (socket?.connected) {
        socket.emit('msg:send', {
          convId: data.active.id,
          content: text,
        });
      } else {
        const response = await backendApi.sendConversationMessage(data.active.id, text);
        const newMsg = response.data;

        setData((prev) => ({
          ...prev,
          messages: [...prev.messages, newMsg],
          convos: prev.convos.map((convo) =>
            convo.id === data.active.id
              ? {
                ...convo,
                lastMessage: newMsg,
                last_message_at: newMsg.created_at,
              }
              : convo
          ),
        }));
      }

      setInput('');
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send:', err);
      toast.error('Failed to send');
    } finally {
      setSending(false);
    }
  };

  const startEdit = (message) => {
    setEditing(message);
    setInput(message.content || '');
  };

  const cancelEdit = () => {
    setEditing(null);
    setInput('');
  };

  const deleteMessage = async (message) => {
    if (!data.active?.id || !message?.id) return;

    const confirmed = window.confirm('Delete this message?');
    if (!confirmed) return;

    try {
      await backendApi.deleteConversationMessage(data.active.id, message.id);

      setData((prev) => ({
        ...prev,
        messages: prev.messages.filter((item) => item.id !== message.id),
        convos: prev.convos.map((convo) =>
          convo.id === data.active.id && convo.lastMessage?.id === message.id
            ? { ...convo, lastMessage: null }
            : convo
        ),
      }));

      toast.success('Message deleted');
    } catch (err) {
      console.error('Delete message failed:', err);
      toast.error(err.message || 'Could not delete message');
    }
  };

  const filtered = useMemo(() => {
    return data.convos.filter((convo) => {
      const userType = convo.otherUser?.user_type;

      const matchCategory =
        filters.cat === 'All' ||
        (filters.cat === 'Mentors' && userType === 'mentor') ||
        (filters.cat === 'Investors' && userType === 'investor');

      const matchQuery =
        !filters.query ||
        convo.otherUser?.full_name
          ?.toLowerCase()
          .includes(filters.query.toLowerCase());

      return matchCategory && matchQuery;
    });
  }, [data.convos, filters]);

  const totalUnread = data.convos.reduce((sum, convo) => {
    return sum + (convo.unreadCount || 0);
  }, 0);

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin" style={{ color: '#1B2D7F' }} />
      </div>
    );
  }

  const { messages, active } = data;

  return (
    <>
      <style>{CSS}</style>

      <div className="h-screen page-bg pt-16 flex flex-col">
        {!state.sidebar && (
          <div className="px-4 py-3 border-b border-gray-200 bg-white flex items-center gap-3">
            <button
              type="button"
              onClick={() =>
                setState((prev) => ({
                  ...prev,
                  sidebar: true,
                }))
              }
              className="p-2 hover:bg-gray-100 rounded-lg"
              aria-label="Open sidebar"
            >
              <MessageSquare className="w-5" />
            </button>

            <span className="font-bold text-gray-900">
              Messages
            </span>

            {totalUnread > 0 && (
              <span className="ml-auto bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </div>
        )}

        <div className="flex-1 max-w-6xl mx-auto w-full px-2 sm:px-4 py-2 flex gap-3 sm:gap-4 min-h-0">
          {/* SIDEBAR */}
          <aside
            className={`${state.sidebar ? 'flex' : 'hidden'
              } md:flex flex-col w-full md:w-80 md:flex-shrink-0 bg-white rounded-2xl border border-gray-200 overflow-hidden`}
          >
            <div className="p-4 border-b border-gray-100">
              <div className="flex items-center gap-2 bg-gray-50 rounded-xl px-3 py-2 mb-3">
                <Search className="w-4 text-gray-400" />

                <input
                  value={filters.query}
                  onChange={(e) =>
                    setFilters((prev) => ({
                      ...prev,
                      query: e.target.value,
                    }))
                  }
                  placeholder="Search…"
                  className="flex-1 bg-transparent outline-none text-sm"
                  aria-label="Search conversations"
                />

                {filters.query && (
                  <button
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        query: '',
                      }))
                    }
                  >
                    <X className="w-4 text-gray-400" />
                  </button>
                )}
              </div>

              <div className="flex gap-1 overflow-x-auto pb-1">
                {[
                  {
                    key: 'All',
                    label: 'All',
                    icon: null,
                  },
                  {
                    key: 'Mentors',
                    label: 'Mentors',
                    icon: <GraduationCap className="w-3" />,
                  },
                  {
                    key: 'Investors',
                    label: 'Investors',
                    icon: <DollarSign className="w-3" />,
                  },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    type="button"
                    onClick={() =>
                      setFilters((prev) => ({
                        ...prev,
                        cat: tab.key,
                      }))
                    }
                    className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap flex items-center gap-1 ${filters.cat === tab.key
                      ? 'g-brand text-black'
                      : 'bg-gray-50 text-gray-600'
                      }`}
                  >
                    {tab.icon}
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto">
              {filtered.map((convo) => (
                <button
                  key={convo.id}
                  type="button"
                  onClick={() => selectConvo(convo)}
                  className={`w-full flex items-center gap-3 p-3 hover:bg-gray-50 transition ${active?.id === convo.id
                    ? 'bg-green-50 border-l-4 border-green-400'
                    : ''
                    }`}
                  aria-label={`Open chat with ${convo.otherUser?.full_name || 'User'}`}
                >
                  <Avatar
                    name={convo.otherUser?.full_name}
                    path={convo.otherUser?.avatar_url}
                    grad={gradForType(convo.otherUser?.user_type)}
                    size="md"
                  />

                  <div className="flex-1 min-w-0 text-left">
                    <p className="font-semibold text-gray-900 truncate text-sm">
                      {convo.otherUser?.full_name || 'User'}
                    </p>

                    <p className="text-xs text-gray-500 truncate">
                      {convo.lastMessage?.content || 'Start chatting'}
                    </p>
                  </div>

                  {convo.unreadCount > 0 && (
                    <span className="bg-green-500 text-black text-xs font-bold px-2 py-0.5 rounded-full">
                      {convo.unreadCount}
                    </span>
                  )}
                </button>
              ))}

              {filtered.length === 0 && (
                <p className="p-4 text-center text-sm text-gray-500">
                  No conversations found.
                </p>
              )}
            </div>
          </aside>

          {/* CHAT AREA */}
          <div className={`${state.sidebar ? 'hidden md:flex' : 'flex'} flex-1 flex-col bg-white rounded-2xl border border-gray-200 overflow-hidden min-w-0`}>
            {active ? (
              <>
                <div className="flex items-center gap-3 p-3 sm:p-4 border-b border-gray-100">
                  <Avatar
                    name={active.otherUser?.full_name}
                    path={active.otherUser?.avatar_url}
                    grad={gradForType(active.otherUser?.user_type)}
                    size="md"
                  />

                  <div className="min-w-0">
                    <p className="font-bold text-gray-900">
                      {active.otherUser?.full_name || 'User'}
                    </p>

                    <p className="text-xs text-gray-500 flex items-center gap-1">
                      <span
                        className={`w-2 h-2 rounded-full ${active.otherUser?.isOnline ? 'bg-green-500' : 'bg-gray-300'}`}
                        aria-hidden="true"
                      />
                      {active.otherUser?.isOnline ? 'Online' : active.otherUser?.location || 'Offline'}
                    </p>
                  </div>

                  <div className="ml-auto flex items-center gap-2 flex-shrink-0">
                    <button
                      type="button"
                      onClick={startMeeting}
                      disabled={meetingStarting}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition g-brand text-black hover:opacity-90 disabled:opacity-60"
                      title="Start a LiveKit meeting room"
                    >
                      {meetingStarting ? <Loader className="w-4 animate-spin" /> : <Video className="w-4" />}
                      {meetingStarting ? 'Starting' : 'Meeting'}
                    </button>

                    <Link
                      to="/dashboard"
                      className="hidden sm:flex text-sm text-gray-500 hover:text-gray-700 items-center gap-1"
                    >
                      <ArrowLeft className="w-4" />
                      Back
                    </Link>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2" role="log" aria-live="polite">
                  {state.loadingMessages ? (
                    <div className="h-full flex items-center justify-center">
                      <Loader className="w-6 h-6 animate-spin text-[#1B2D7F]" />
                    </div>
                  ) : (
                    <>
                      {messages.map((msg) => (
                        <MsgBubble
                          key={msg.id}
                          msg={msg}
                          isMe={msg.sender_id === user?.id}
                          onEdit={startEdit}
                          onDelete={deleteMessage}
                        />
                      ))}

                      {messages.length === 0 && (
                        <div className="h-full flex items-center justify-center text-center text-gray-500">
                          <div>
                            <p className="text-3xl mb-2">👋</p>
                            <p className="font-semibold">
                              Start the conversation
                            </p>
                            <p className="text-sm">
                              Send your first message below.
                            </p>
                          </div>
                        </div>
                      )}

                      <div ref={msgRef} />
                    </>
                  )}
                </div>

                {editing && (
                  <div className="px-4 py-2 border-t border-gray-100 bg-indigo-50 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-indigo-700">Editing message</p>
                      <p className="text-xs text-indigo-600 truncate">{editing.content}</p>
                    </div>
                    <button
                      type="button"
                      onClick={cancelEdit}
                      className="p-1.5 rounded-lg hover:bg-white/70 text-indigo-700"
                      aria-label="Cancel editing"
                    >
                      <X className="w-4" />
                    </button>
                  </div>
                )}

                <div className="p-3 sm:p-4 border-t border-gray-100 flex items-end gap-2">
                  <button
                    type="button"
                    className="p-2 hover:bg-gray-100 rounded-lg"
                    aria-label="Attach file"
                  >
                    <Paperclip className="w-5 text-gray-500" />
                  </button>

                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        sendMsg();
                      }
                    }}
                    placeholder="Type a message…"
                    className="flex-1 bg-gray-50 rounded-2xl px-4 py-3 text-sm outline-none resize-none max-h-24"
                    rows={1}
                    aria-label="Type your message"
                  />

                  <button
                    type="button"
                    onClick={sendMsg}
                    disabled={!input.trim() || sending}
                    className={`p-3 rounded-xl text-white ${!input.trim() || sending
                      ? 'bg-gray-300'
                      : 'g-brand'
                      } hover:opacity-90 transition`}
                    aria-label="Send message"
                  >
                    {sending ? (
                      <Loader className="w-4 animate-spin" />
                    ) : (
                      editing ? <Pencil className="w-4" /> : <Send className="w-4" />
                    )}
                  </button>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center text-gray-500">
                <div>
                  <p className="text-4xl mb-2">💬</p>
                  <p className="font-semibold">
                    Select a conversation
                  </p>
                  <p className="text-sm">
                    Choose from the sidebar to start messaging.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
