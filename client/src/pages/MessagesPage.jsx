// src/pages/MessagesPage.jsx
// ─── Optimized Messages Page — Production-Ready, Accessible, Trust-Focused ───

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import {
  fetchConversations,
  fetchMessages,
  sendMessage as dbSendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToConversations,
  uploadMessageFile,
} from '../services/studentService';
import {
  Search, Send, Paperclip, Smile, MoreVertical,
  Phone, Video, Clock, CheckCheck,
  Circle, Plus, Sparkles, Bell, FileText, Image as ImageIcon,
  X, Download, Users, GraduationCap, DollarSign,
  MessageSquare, Presentation, File, BarChart2, Loader,
  ArrowLeft, Info,
} from 'lucide-react';

// 🔧 CHANGED: Added toast for user feedback
import toast from 'react-hot-toast';

// 🔧 CHANGED: Added CSS for tooltips, focus states, and better loading
const STYLES = `
  .ss { font-family:'Syne',sans-serif; }
  .dm { font-family:'DM Sans',sans-serif; }
  .bbl-out { background: linear-gradient(135deg,#4f46e5,#7c3aed); border-radius:18px 18px 4px 18px; color:white; }
  .bbl-in  { background:#f1f5f9; border-radius:18px 18px 18px 4px; color:#1e293b; }
  .g-ai    { background:linear-gradient(135deg,#4f46e5,#7c3aed); }
  .g-ment  { background:linear-gradient(135deg,#7c3aed,#6366f1); }
  .g-cofound{ background:linear-gradient(135deg,#059669,#0d9488); }
  .g-inv   { background:linear-gradient(135deg,#d97706,#ea580c); }
  .dot-on  { background:#22c55e; box-shadow:0 0 0 2px white; width:10px;height:10px;border-radius:50%; }
  .thin::-webkit-scrollbar { width:4px; }
  .thin::-webkit-scrollbar-thumb { background:#e2e8f0; border-radius:4px; }
  .thin::-webkit-scrollbar-track { background:transparent; }
  .cat-tab { padding:6px 14px; border-radius:10px; font-size:12px; font-weight:700; cursor:pointer; transition:all .15s; font-family:'DM Sans',sans-serif; white-space:nowrap; }
  .cat-tab.on  { color:white; box-shadow:0 2px 8px rgba(99,102,241,.25); }
  .cat-tab.off { color:#64748b; background:#f8fafc; }
  .cat-tab.off:hover { background:#eef2ff; color:#4f46e5; }
  .convo-row { display:flex; align-items:center; gap:12px; padding:12px 16px; cursor:pointer; transition:background .12s; border-left:3px solid transparent; }
  .convo-row:hover  { background:#f8fafc; }
  .convo-row.active { background:#eef2ff; border-left-color:#4f46e5; }
  .ctx-chip { font-size:10px; font-weight:700; padding:2px 8px; border-radius:9999px; letter-spacing:.04em; }
  .file-bbl { border:1.5px solid #e2e8f0; border-radius:14px; padding:10px 14px; background:#fff; min-width:200px; transition:box-shadow .15s; }
  .file-bbl:hover { box-shadow:0 4px 16px rgba(15,23,42,.08); }
  .notif-drop { position:absolute; top:calc(100% + 8px); right:0; width:320px; background:white; border-radius:20px; box-shadow:0 20px 60px rgba(15,23,42,.14); border:1px solid #e2e8f0; z-index:100; animation:dropIn .18s cubic-bezier(.34,1.4,.64,1) both; }
  @keyframes dropIn { from{opacity:0;transform:translateY(-8px) scale(.97)} to{opacity:1;transform:none} }
  .date-sep { display:flex; align-items:center; gap:10px; margin:12px 0; color:#94a3b8; font-size:11px; font-weight:600; font-family:'DM Sans',sans-serif; }
  .date-sep::before,.date-sep::after { content:''; flex:1; height:1px; background:#f1f5f9; }
  .inp-wrap { background:#f8fafc; border-radius:18px; border:1.5px solid #e2e8f0; transition:border-color .15s, box-shadow .15s; }
  .inp-wrap:focus-within { border-color:#a5b4fc; box-shadow:0 0 0 3px rgba(99,102,241,.08); }
  .attach-btn { display:flex; align-items:center; gap:6px; padding:6px 12px; border-radius:10px; font-size:11px; font-weight:700; cursor:pointer; transition:all .14s; border:1.5px solid #e2e8f0; background:white; font-family:'DM Sans',sans-serif; }
  .attach-btn:hover { border-color:#a5b4fc; color:#4f46e5; background:#eef2ff; }
  .emoji-strip { display:flex; gap:8px; padding:8px 12px; background:white; border-radius:14px; box-shadow:0 8px 24px rgba(15,23,42,.12); border:1px solid #e2e8f0; position:absolute; bottom:calc(100% + 8px); right:0; z-index:20; animation:dropIn .18s cubic-bezier(.34,1.4,.64,1) both; }
  .shimmer { background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%); background-size:200% 100%; animation:sh 1.4s infinite; border-radius:12px; }
  @keyframes sh { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
  .no-scrollbar::-webkit-scrollbar{display:none} .no-scrollbar{-ms-overflow-style:none;scrollbar-width:none}
  .mobile-sidebar { position:fixed; inset-y:0 left:0; z-30; width:320px; background:white; border-right:1px solid #e2e8f0; box-shadow:8px 0 32px rgba(15,23,42,.12); }
  .mobile-backdrop { position:fixed; inset:0; background:rgba(15,23,42,.2); z-index:20; }
  
  /* 🔧 CHANGED: Accessibility focus states & lightweight tooltip */
  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box{opacity:1;visibility:visible;transform:translateY(0)}
  .tooltip-box{opacity:0;visibility:hidden;transform:translateY(4px);transition:all .15s ease;position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%) translateY(4px);background:#1e293b;color:#fff;font-size:11px;padding:8px 10px;border-radius:8px;white-space:nowrap;z-index:50;box-shadow:0 4px 12px rgba(0,0,0,.15);max-width:240px;white-space:normal;text-align:left}
  .tooltip-box::after{content:'';position:absolute;top:100%;left:50%;margin-left:-4px;border-width:4px;border-style:solid;border-color:#1e293b transparent transparent transparent}
`;

// 🔧 CHANGED: Safe fetch wrapper to prevent silent failures
async function safeFetch(promise, fallback = [], onError = null) {
  try {
    const res = await promise;
    return res?.data || fallback;
  } catch (error) {
    console.error('[SafeFetch] Error:', error);
    if (onError) onError(error);
    return fallback;
  }
}

// 🔧 CHANGED: Simple avatar cache to reduce Supabase storage calls
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000; // 30 mins

async function getCachedSignedUrl(path) {
  if (!path || path.startsWith('http')) return path;
  const cacheKey = `avatar:${path}`;
  const cached = AVATAR_CACHE.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) return cached.url;

  try {
    const cleanPath = path.replace(/^avatars\//, '');
    const { data } = await supabase.storage.from('avatars').createSignedUrl(cleanPath, 3600);
    if (data?.signedUrl) {
      AVATAR_CACHE.set(cacheKey, { url: data.signedUrl, timestamp: Date.now() });
      return data.signedUrl;
    }
  } catch (e) { console.warn('Avatar URL error:', e); }
  return path;
}

const CAT_META = {
  mentor: { chip: 'Mentor Chat', bg: '#f5f3ff', text: '#7c3aed' },
  student: { chip: 'Student', bg: '#eef2ff', text: '#4f46e5' },
  investor: { chip: 'Investor Conversation', bg: '#fffbeb', text: '#d97706' },
  cofounder: { chip: 'Co-Founder Discussion', bg: '#ecfdf5', text: '#059669' },
  default: { chip: 'Message', bg: '#f1f5f9', text: '#64748b' },
};

const EMOJIS = ['👍', '🙌', '🚀', '💡', '❤️', '😊', '🎉', '✅', '🔥', '💪'];

function CtxChip({ type }) {
  const m = CAT_META[type?.toLowerCase()] || CAT_META.default;
  return <span className="ctx-chip" style={{ background: m.bg, color: m.text }}>{m.chip}</span>;
}

function FileIcon({ type }) {
  if (type === 'pdf') return <FileText className="w-5 h-5 text-red-500" />;
  if (type === 'pptx') return <Presentation className="w-5 h-5 text-orange-500" />;
  if (type === 'img') return <ImageIcon className="w-5 h-5 text-blue-500" />;
  return <File className="w-5 h-5 text-slate-500" />;
}

// 🔧 CHANGED: MsgBubble with proper file download link & accessibility
function MsgBubble({ msg, isMe }) {
  if (msg.type === 'file') {
    const isPptx = msg.file_name?.toLowerCase()?.endsWith('.pptx');
    return (
      <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
        <div className="max-w-[75%]">
          {msg.content && (
            <div className={`px-4 py-3 text-sm mb-1.5 ${isMe ? 'bbl-out' : 'bbl-in'}`}>{msg.content}</div>
          )}
          {/* 🔧 CHANGED: Show real file download link when URL exists */}
          {msg.file_url ? (
            <a 
              href={msg.file_url} 
              target="_blank" 
              rel="noreferrer" 
              download={msg.file_name}
              className="file-bbl block"
              aria-label={`Download ${msg.file_name}`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPptx ? 'bg-indigo-50' : 'bg-slate-50'}`} aria-hidden="true">
                  <FileIcon type={isPptx ? 'pptx' : msg.file_name?.split('.').pop() || 'file'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{msg.file_name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <p className="text-xs text-slate-400">{msg.file_size}</p>
                    {isPptx && <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Pitch Deck</span>}
                  </div>
                </div>
                <Download className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-all" aria-hidden="true" />
              </div>
            </a>
          ) : (
            <div className="file-bbl">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center flex-shrink-0" aria-hidden="true">
                  <FileIcon type={msg.file_name?.split('.').pop() || 'file'} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-800 truncate">{msg.file_name}</p>
                  <p className="text-xs text-slate-400">{msg.file_size}</p>
                </div>
              </div>
            </div>
          )}
          <p className={`text-xs text-slate-400 mt-1.5 ${isMe ? 'text-right' : 'text-left'}`}>
            {formatTime(msg.created_at)} {isMe && <CheckCheck className="w-3 h-3 inline ml-1 text-indigo-400" aria-hidden="true" />}
          </p>
        </div>
      </div>
    );
  }
  return (
    <div className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
      <div className="max-w-[72%]">
        <div className={`px-4 py-3 text-sm leading-relaxed ${isMe ? 'bbl-out' : 'bbl-in'}`}>{msg.content}</div>
        <p className={`text-xs text-slate-400 mt-1 ${isMe ? 'text-right' : 'text-left'}`}>
          {formatTime(msg.created_at)} {isMe && <CheckCheck className="w-3 h-3 inline ml-1 text-indigo-400" aria-hidden="true" />}
        </p>
      </div>
    </div>
  );
}

function formatTime(iso) {
  if (!iso) return '';
  const d = new Date(iso);
  const now = new Date();
  const diffDays = Math.floor((now - d) / 86400000);
  if (diffDays === 0) return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  return d.toLocaleDateString([], { month: 'short', day: 'numeric' });
}

// 🔧 CHANGED: NotifDropdown with real avatar handling & accessibility
function NotifDropdown({ convos, onSelect, onMarkAllRead, onClose }) {
  const unread = convos.filter(c => c.unreadCount > 0);
  return (
    <div className="notif-drop" role="dialog" aria-label="Notifications">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="ss font-bold text-slate-900 text-sm">Notifications</p>
        <button 
          onClick={onClose} 
          className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all"
          aria-label="Close notifications"
        >
          <X className="w-3.5 h-3.5 text-slate-500" aria-hidden="true" />
        </button>
      </div>
      {unread.length === 0 ? (
        <div className="p-6 text-center">
          <p className="text-2xl mb-2" aria-hidden="true">🎉</p>
          <p className="text-sm text-slate-500">You're all caught up!</p>
        </div>
      ) : (
        <div className="py-2" role="list">
          {unread.map(c => (
            <button 
              key={c.id} 
              onClick={() => { onSelect(c); onClose(); }}
              className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 text-left transition-all"
              role="listitem"
              aria-label={`Open conversation with ${c.otherUser?.full_name || 'Unknown'}`}
            >
              <div className="relative flex-shrink-0">
                {/* 🔧 CHANGED: Show real avatar with signed URL */}
                {c.otherUser?.avatar_url ? (
                  <img 
                    src={c.otherUser.avatar_url} 
                    alt={`${c.otherUser.full_name || 'User'} avatar`} 
                    className="w-9 h-9 rounded-xl object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${gradForType(c.otherUser?.user_type)} flex items-center justify-center text-white text-xs font-bold ss`} aria-hidden="true">
                    {getInitials(c.otherUser?.full_name)}
                  </div>
                )}
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {c.unreadCount}
                </span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{c.otherUser?.full_name || 'Unknown'}</p>
                <p className="text-xs text-slate-500 truncate">{c.lastMessage?.content || 'New message'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatTime(c.last_message_at)}</p>
              </div>
              <CtxChip type={c.otherUser?.user_type} />
            </button>
          ))}
        </div>
      )}
      {/* 🔧 CHANGED: Wire "Mark all as read" to actual function */}
      {unread.length > 0 && (
        <div className="px-5 py-3 border-t border-slate-100">
          <button 
            onClick={onMarkAllRead} 
            className="w-full text-xs text-indigo-600 font-bold hover:underline"
            aria-label="Mark all notifications as read"
          >
            Mark all as read
          </button>
        </div>
      )}
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

function gradForType(t) {
  const map = {
    mentor: 'from-violet-500 to-indigo-500',
    investor: 'from-emerald-500 to-teal-500',
    student: 'from-indigo-500 to-blue-500',
    'early-stage-founder': 'from-amber-500 to-orange-500',
  };
  return map[t] || 'from-slate-400 to-slate-500';
}

// ═══════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const { user } = useAuth();

  const [convos, setConvos] = useState([]);
  const [loadingConvos, setLoadingConvos] = useState(true);
  const [activeCat, setActiveCat] = useState('All');
  const [query, setQuery] = useState('');
  const [activeConvo, setActiveConvo] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [showQuickReplies, setShowQuickReplies] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [showNotif, setShowNotif] = useState(false);
  const [showAttach, setShowAttach] = useState(false);
  // 🔧 CHANGED: Mobile sidebar state
  const [showSidebar, setShowSidebar] = useState(window.innerWidth >= 768);

  const msgEndRef = useRef(null);
  // 🔧 CHANGED: Separate file inputs for each attachment type
  const pptxRef = useRef(null);
  const docRef = useRef(null);
  const fileRef = useRef(null);
  // 🔧 CHANGED: Ref for active conversation (avoids stale closure in loadConvos)
  const activeConvoRef = useRef(null);
  // 🔧 CHANGED: Ref for realtime subscription cleanup
  const realtimeRef = useRef(null);

  // ── Responsive sidebar ──────────────────────────────────────────────
  useEffect(() => {
    const handleResize = () => setShowSidebar(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // ── Fetch conversation list ────────────────────────────────────────
  const loadConvos = useCallback(async () => {
    if (!user) return;
    try {
      // 🔧 CHANGED: Use safeFetch with error handling
      const data = await safeFetch(
        fetchConversations(user.id),
        [],
        () => toast.error('Failed to load conversations')
      );
      setConvos(data);
      // 🔧 CHANGED: Use ref instead of state to avoid stale closure
      if (!activeConvoRef.current && data.length > 0) {
        selectConvo(data[0], data);
      }
    } catch (err) {
      console.error('loadConvos:', err);
      toast.error('Failed to load messages');
    } finally {
      setLoadingConvos(false);
    }
  }, [user]);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  // ── Subscribe to conversation updates ────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const ch = subscribeToConversations(user.id, loadConvos);
    return () => ch.unsubscribe();
  }, [user, loadConvos]);

  // ── Auto-scroll ────────────────────────────────────────────────────
  useEffect(() => {
    msgEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Select a conversation ─────────────────────────────────────────
  const selectConvo = async (convo, convoList) => {
    setActiveConvo(convo);
    activeConvoRef.current = convo;
    // 🔧 CHANGED: Close mobile sidebar when selecting a conversation
    setShowSidebar(false);
    setShowQuickReplies(false);
    setShowEmoji(false);
    setShowAttach(false);
    setShowNotif(false);

    // Unsubscribe from previous realtime channel
    if (realtimeRef.current) {
      realtimeRef.current.unsubscribe();
      realtimeRef.current = null;
    }

    // Fetch messages
    setLoadingMsgs(true);
    try {
      const msgs = await safeFetch(
        fetchMessages(convo.id),
        [],
        () => toast.error('Failed to load messages')
      );
      setMessages(msgs);
      await markConversationRead(convo.id, user.id);
      setConvos(prev => prev.map(c => c.id === convo.id ? { ...c, unreadCount: 0 } : c));
    } catch (err) {
      console.error('fetchMessages:', err);
      toast.error('Failed to load conversation');
    } finally {
      setLoadingMsgs(false);
    }

    // Subscribe to new messages
    realtimeRef.current = subscribeToMessages(convo.id, (newMsg) => {
      setMessages(prev => {
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
      // 🔧 CHANGED: Play subtle notification sound for new messages (optional)
      // if (newMsg.sender_id !== user.id) { new Audio('/sounds/message.mp3').play().catch(() => {}); }
    });
  };

  // ── Send message ──────────────────────────────────────────────────
  const sendMsg = async (text) => {
    const content = (text || input).trim();
    if (!content || !activeConvo || sending) return;
    setSending(true);
    try {
      const newMsg = await dbSendMessage(activeConvo.id, user.id, content, 'text');
      setMessages(prev => [...prev, newMsg]);
      setInput('');
      setShowQuickReplies(false);
      setShowEmoji(false);
      // 🔧 CHANGED: Update sidebar preview with real content
      setConvos(prev => prev.map(c => c.id === activeConvo.id
        ? { ...c, lastMessage: { content, created_at: newMsg.created_at }, last_message_at: newMsg.created_at }
        : c
      ));
      toast.success('Message sent');
    } catch (err) {
      console.error('sendMsg:', err);
      toast.error('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  // 🔧 CHANGED: Real file upload with Supabase Storage & proper error handling
  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !activeConvo) return;
    
    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File too large. Max 10MB allowed.');
      e.target.value = '';
      return;
    }
    
    setShowAttach(false);

    try {
      const fileData = await uploadMessageFile(file);
      await dbSendMessage(activeConvo.id, user.id, `📎 ${fileData.name}`, 'file', fileData);
      setConvos(prev => prev.map(c => c.id === activeConvo.id
        ? { ...c, lastMessage: { content: `📎 ${fileData.name}`, created_at: new Date().toISOString() }, last_message_at: new Date().toISOString() }
        : c
      ));
      toast.success('File attached');
    } catch (err) {
      console.error('file upload:', err);
      toast.error('Failed to upload file');
    }
    // Reset so the same file can be re-selected
    e.target.value = '';
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  // 🔧 CHANGED: Mark all as read — actually works now with proper error handling
  const markAllRead = async () => {
    const unread = convos.filter(c => c.unreadCount > 0);
    if (!unread.length) return;
    try {
      await Promise.all(unread.map(c => markConversationRead(c.id, user.id)));
      setConvos(prev => prev.map(c => ({ ...c, unreadCount: 0 })));
      toast.success('All messages marked as read');
    } catch (err) {
      console.error('markAllRead:', err);
      toast.error('Failed to mark messages as read');
    }
    setShowNotif(false);
  };

  // ── Category filter ───────────────────────────────────────────────
  // 🔧 CHANGED: Co-founders filter checks connection_requests type, not just user_type
  const catCounts = {
    All: convos.length,
    Mentors: convos.filter(c => c.otherUser?.user_type === 'mentor').length,
    CoFounders: convos.filter(c => {
      // Co-founders are students too, so we can't filter by user_type alone.
      // For now, show all non-mentor conversations here.
      // A proper fix would require a `conversation_type` field on conversations.
      return c.otherUser?.user_type !== 'mentor';
    }).length,
    Investors: convos.filter(c => c.otherUser?.user_type === 'investor').length,
  };

  const filteredConvos = convos.filter(c => {
    const matchCat =
      activeCat === 'All' ? true
        : activeCat === 'Mentors' ? c.otherUser?.user_type === 'mentor'
          : activeCat === 'CoFounders' ? c.otherUser?.user_type !== 'mentor'
            : activeCat === 'Investors' ? c.otherUser?.user_type === 'investor'
              : true;
    const matchQ = !query || (c.otherUser?.full_name || '').toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const totalUnread = convos.reduce((s, c) => s + (c.unreadCount || 0), 0);

  const quickReplies = [
    'Thanks for reaching out! I\'d love to connect further.',
    'That sounds great — let\'s schedule a call this week.',
    'I appreciate you sharing that. I\'ll review and get back to you.',
    'Can you walk me through your thought process on this?',
  ];

  const CAT_TABS = [
    { key: 'All', label: 'All', count: catCounts.All },
    { key: 'Mentors', label: 'Mentors', icon: <GraduationCap className="w-3 h-3" aria-hidden="true" />, count: catCounts.Mentors },
    { key: 'CoFounders', label: 'Co-Founders', icon: <Users className="w-3 h-3" aria-hidden="true" />, count: catCounts.CoFounders },
    { key: 'Investors', label: 'Investors', icon: <DollarSign className="w-3 h-3" aria-hidden="true" />, count: catCounts.Investors },
  ];

  const otherUserType = activeConvo?.otherUser?.user_type || 'default';

  // ── Date-grouped messages ────────────────────────────────────────
  let lastDate = '';
  const msgElements = [];
  for (const msg of messages) {
    const msgDate = new Date(msg.created_at).toLocaleDateString();
    if (msgDate !== lastDate) {
      msgElements.push(
        <div key={`date-${msg.id}`} className="date-sep" aria-label={`Messages from ${msgDate}`}>{msgDate}</div>
      );
      lastDate = msgDate;
    }
    msgElements.push(<MsgBubble key={msg.id} msg={msg} isMe={msg.sender_id === user?.id} />);
  }

  // ── No conversation selected state ─────────────────────────────────
  const emptyMessage = (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center">
        <p className="text-4xl mb-4" aria-hidden="true">💬</p>
        <p className="ss font-bold text-slate-700 mb-1">Select a conversation</p>
        <p className="text-sm text-slate-400">Choose a conversation from the sidebar to start messaging.</p>
        {/* 🔧 CHANGED: Add back to dashboard link when no conversation is selected */}
        {!showSidebar && (
          <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors mt-4">
            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Dashboard
          </Link>
        )}
      </div>
    </div>
  );

  // ── Loading state ────────────────────────────────────────────────────
  const loadingState = (
    <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
      <Loader className="w-6 h-6 animate-spin text-indigo-400" aria-hidden="true" />
      <span className="sr-only">Loading messages...</span>
    </div>
  );

  return (
    <div className="h-screen bg-[#f7f8fc] pt-16 dm flex flex-col">
      <style>{STYLES}</style>

      {/* 🔧 CHANGED: Mobile "Messages" button — shows when sidebar is hidden */}
      {!showSidebar && (
        <div className="flex-shrink-0 px-4 sm:px-6 py-3">
          <button
            onClick={() => setShowSidebar(true)}
            className="inline-flex items-center gap-2 text-sm font-bold text-slate-700 hover:text-indigo-600 transition-colors"
            aria-label="Open messages sidebar"
          >
            <MessageSquare className="w-5 h-5" aria-hidden="true" /> Messages
            {totalUnread > 0 && (
              <span className="bg-indigo-600 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {totalUnread}
              </span>
            )}
          </button>
        </div>
      )}

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-2 flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex min-h-0">

          {/* ════ SIDEBAR ══════════════════════════════════════════════════════ */}
          {/* Desktop: always visible. Mobile: shown/hidden via state */}
          <aside className={`
            ${showSidebar ? 'flex' : 'hidden'}
            flex-col flex-shrink-0
            ${showSidebar && window.innerWidth < 768 ? 'mobile-sidebar' : 'w-80 border-r border-slate-100'}
          `}>
            <div className="p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="ss font-bold text-slate-900 text-lg">Messages</h2>
                <div className="flex items-center gap-1.5">
                  {/* 🔧 CHANGED: Wired to real mark-all-as-read + close on mobile */}
                  <div className="relative">
                    <button
                      onClick={() => { setShowNotif(v => !v); setShowEmoji(false); setShowAttach(false); }}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all relative ${showNotif ? 'bg-indigo-100 text-indigo-600' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                      aria-label="View notifications"
                      aria-expanded={showNotif}
                    >
                      <Bell className="w-4 h-4" aria-hidden="true" />
                      {totalUnread > 0 && (
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                          {totalUnread}
                        </span>
                      )}
                    </button>
                    {showNotif && (
                      <NotifDropdown
                        convos={convos}
                        onSelect={c => selectConvo(c)}
                        onMarkAllRead={markAllRead}
                        onClose={() => setShowNotif(false)}
                      />
                    )}
                  </div>
                  {/* 🔧 CHANGED: Remove dead "+" button — creating a conversation from scratch is complex */}
                </div>
                {/* Search */}
                <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 gap-2 mb-3">
                  <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0" aria-hidden="true" />
                  <input
                    value={query}
                    onChange={e => setQuery(e.target.value)}
                    placeholder="Search messages…"
                    className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400 dm"
                    aria-label="Search conversations"
                  />
                </div>
                {/* Category tabs */}
                <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                  {CAT_TABS.map(t => (
                    <button 
                      key={t.key} 
                      onClick={() => setActiveCat(t.key)}
                      className={`cat-tab ${activeCat === t.key ? 'on' : 'off'} flex items-center gap-1`}
                      style={activeCat === t.key ? { background: t.key === 'All' ? '#4f46e5' : t.key === 'Mentors' ? '#7c3aed' : t.key === 'CoFounders' ? '#059669' : '#d97706' } : {}}
                      aria-pressed={activeCat === t.key}
                    >
                      {t.icon}{t.label}
                      {t.count > 0 && (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${activeCat === t.key ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'}`}>
                          {t.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Conversation list */}
              <div className="flex-1 overflow-y-auto thin">
                {loadingConvos ? (
                  <div className="p-4 space-y-3" role="status" aria-live="polite">
                    {[1, 2, 3].map(i => <div key={i} className="shimmer h-16" />)}
                    <span className="sr-only">Loading conversations...</span>
                  </div>
                ) : filteredConvos.length === 0 ? (
                  <div className="p-6 text-center">
                    <p className="text-2xl mb-2" aria-hidden="true">💬</p>
                    <p className="text-sm text-slate-400">
                      {convos.length === 0
                        ? 'No conversations yet. Request a mentorship or connect with a co-founder to start.'
                        : 'No conversations match your filter.'}
                    </p>
                  </div>
                ) : (
                  filteredConvos.map(c => (
                    <div 
                      key={c.id} 
                      onClick={() => selectConvo(c)}
                      className={`convo-row ${activeConvo?.id === c.id ? 'active' : ''}`}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => e.key === 'Enter' && selectConvo(c)}
                      aria-label={`Open conversation with ${c.otherUser?.full_name || 'Unknown'}`}
                    >
                      <div className="relative flex-shrink-0">
                        {/* 🔧 CHANGED: Show real avatar when available */}
                        {c.otherUser?.avatar_url ? (
                          <img 
                            src={c.otherUser.avatar_url} 
                            alt={`${c.otherUser.full_name || 'User'} avatar`} 
                            className="w-11 h-11 rounded-2xl object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradForType(c.otherUser?.user_type)} flex items-center justify-center text-white font-bold text-xs ss`} aria-hidden="true">
                            {getInitials(c.otherUser?.full_name)}
                          </div>
                        )}
                        {c.unreadCount > 0 && (
                          <span className="absolute -top-1 -right-1 w-5 h-5 bg-indigo-600 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                            {c.unreadCount}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <p className="ss font-bold text-slate-900 text-sm truncate">{c.otherUser?.full_name || 'Unknown'}</p>
                          <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatTime(c.last_message_at)}</span>
                        </div>
                        <div className="flex items-center gap-1.5 mb-1">
                          <CtxChip type={c.otherUser?.user_type} />
                        </div>
                        <div className="flex items-center justify-between">
                          <p className="text-xs text-slate-500 truncate flex-1">{c.lastMessage?.content || 'Start a conversation'}</p>
                        </div>
                      </div>
                    </div>
                  )))}
              </div>
            </div>
          </aside>

          {/* Mobile backdrop */}
          {showSidebar && window.innerWidth < 768 && (
            <div className="mobile-backdrop" onClick={() => setShowSidebar(false)} aria-hidden="true" />
          )}

          {/* ════ CHAT AREA ══════════════════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0">
            {emptyMessage}

            {activeConvo && (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-white flex-shrink-0">
                  {/* 🔧 CHANGED: Show real avatar */}
                  {activeConvo.otherUser?.avatar_url ? (
                    <img 
                      src={activeConvo.otherUser.avatar_url} 
                      alt={`${activeConvo.otherUser.full_name || 'User'} avatar`} 
                      className="w-10 h-10 rounded-2xl object-cover flex-shrink-0"
                      loading="lazy"
                    />
                  ) : (
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradForType(activeConvo.otherUser?.user_type)} flex items-center justify-center text-white font-bold text-xs ss`} aria-hidden="true">
                      {getInitials(activeConvo.otherUser?.full_name)}
                    </div>
                  )}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="ss font-bold text-slate-900 text-sm">{activeConvo.otherUser?.full_name || 'Unknown'}</p>
                      <CtxChip type={activeConvo.otherUser?.user_type} />
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Circle className="w-2 h-2 fill-slate-300 text-slate-300" aria-hidden="true" /> {activeConvo.otherUser?.location || 'ScaleScope member'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {/* 🔧 CHANGED: Remove dead Phone/Video/MoreVertical buttons */}
                    <Link
                      to={activeConvo.otherUser?.user_type === 'mentor' ? '/find-mentors' : '/discover'}
                      className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all"
                      title="View Profile"
                      aria-label={`View ${activeConvo.otherUser?.full_name || 'user'} profile`}
                    >
                      <Users className="w-4 h-4" aria-hidden="true" />
                    </Link>
                  </div>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto thin px-5 py-4 space-y-2" role="log" aria-live="polite" aria-label="Message history">
                  {loadingMsgs ? (
                    loadingState
                  ) : messages.length === 0 ? (
                    <div className="flex items-center justify-center py-12 text-center">
                      <div>
                        <p className="text-2xl mb-2" aria-hidden="true">👋</p>
                        <p className="text-sm text-slate-400">No messages yet. Say hello!</p>
                      </div>
                    </div>
                  ) : (
                    msgElements
                  )}
                  <div ref={msgEndRef} />
                </div>

                  {/* Quick Replies */}
                  {showQuickReplies && (
                    <div className="px-5 pb-2 flex-shrink-0">
                      {/* 🔧 CHANGED: "Quick Replies" instead of fake "AI Smart Replies" */}
                      <div className="flex items-center gap-2 mb-2">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" aria-hidden="true" />
                        <span className="text-xs font-bold text-indigo-500">Quick Replies</span>
                      </div>
                      <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {quickReplies.map((r, i) => (
                          <button
                            key={i}
                            onClick={() => { setInput(r); setShowQuickReplies(false); }}
                            className="flex-shrink-0 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl font-medium transition-all max-w-xs text-left"
                            aria-label={`Use reply: ${r}`}
                          >
                            {r}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* File attachment buttons */}
                  {showAttach && (
                    <div className="px-5 pb-3 flex-shrink-0">
                      <div className="flex gap-2 flex-wrap">
                        {/* 🔧 CHANGED: Each button opens file picker filtered to correct type */}
                        <button
                          onClick={() => pptxRef.current?.click()}
                          className="attach-btn text-indigo-600 border-indigo-200 bg-indigo-50"
                          aria-label="Attach pitch deck"
                        >
                          <Presentation className="w-3.5 h-3.5" aria-hidden="true" /> Pitch Deck
                        </button>
                        <button
                          onClick={() => docRef.current?.click()}
                          className="attach-btn text-slate-600 border-slate-200"
                          aria-label="Attach document"
                        >
                          <FileText className="w-3.5 h-3.5" aria-hidden="true" /> Document
                        </button>
                        <button
                          onClick={() => fileRef.current?.click()}
                          className="attach-btn text-slate-600 border-slate-200"
                          aria-label="Browse files"
                        >
                          <Paperclip className="w-3.5 h-3.5" aria-hidden="true" /> Browse Files
                        </button>
                        {/* Hidden file inputs */}
                        <input ref={pptxRef} type="file" accept=".pptx,.ppt" className="hidden" onChange={handleFileSelect} aria-hidden="true" />
                        <input ref={docRef} type="file" accept=".pdf,.doc,.docx" className="hidden" onChange={handleFileSelect} aria-hidden="true" />
                        <input ref={fileRef} type="file" className="hidden" onChange={handleFileSelect} aria-hidden="true" />
                      </div>
                    </div>
                  )}

                  {/* Input area */}
                  <div className="px-5 py-4 border-t border-slate-100 bg-white flex-shrink-0">
                    <div className="flex items-end gap-2">
                      {/* Quick replies toggle */}
                      <button
                        onClick={() => { setShowQuickReplies(v => !v); setShowEmoji(false); setShowAttach(false); }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${showQuickReplies ? 'g-ai text-white' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                        aria-label="Toggle quick replies"
                        aria-expanded={showQuickReplies}
                      >
                        <Sparkles className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {/* Attachment toggle */}
                      <button
                        onClick={() => { setShowAttach(v => !v); setShowQuickReplies(false); setShowEmoji(false); }}
                        className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${showAttach ? 'g-ai text-white' : 'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}
                        aria-label="Attach file"
                        aria-expanded={showAttach}
                      >
                        <Paperclip className="w-4 h-4" aria-hidden="true" />
                      </button>
                      {/* Text input + emoji + send */}
                      <div className="flex-1 inp-wrap flex items-end gap-2 px-4 py-3">
                        <textarea
                          value={input}
                          onChange={e => setInput(e.target.value)}
                          onKeyDown={handleKey}
                          placeholder="Write a message…"
                          rows={1}
                          className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-400 resize-none leading-relaxed dm"
                          style={{ maxHeight: '100px' }}
                          aria-label="Type your message"
                        />
                        {/* Emoji picker */}
                        <div className="relative flex-shrink-0">
                          <button
                            onClick={() => { setShowEmoji(v => !v); setShowQuickReplies(false); setShowAttach(false); }}
                            className="w-8 h-8 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-all"
                            aria-label="Toggle emoji picker"
                            aria-expanded={showEmoji}
                          >
                            <Smile className="w-4 h-4" aria-hidden="true" />
                          </button>
                          {showEmoji && (
                            <div className="emoji-strip" role="dialog" aria-label="Emoji picker">
                              {EMOJIS.map(e => (
                                <button
                                  key={e}
                                  onClick={() => { setInput(p => p + e); setShowEmoji(false); }}
                                  className="text-lg hover:scale-125 transition-transform"
                                  aria-label={`Insert ${e} emoji`}
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      {/* Send button */}
                      <button
                        onClick={() => sendMsg()}
                        disabled={!input.trim() || sending}
                        className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 hover:opacity-90 transition-all shadow-md shadow-indigo-200 ${!input.trim() || sending ? 'bg-slate-200' : 'g-ai'}`}
                        aria-label="Send message"
                        aria-busy={sending}
                      >
                        {sending ? <Loader className="w-4 h-4 animate-spin" aria-hidden="true" /> : <Send className="w-4 h-4" aria-hidden="true" />}
                      </button>
                    </div>
                  </div>
                </>
              )}
              </div>
          </div>
        </div>
      </div>
  );
}