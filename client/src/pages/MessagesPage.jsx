import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  fetchConversations,
  fetchMessages,
  sendMessage as dbSendMessage,
  markConversationRead,
  subscribeToMessages,
  subscribeToConversations,
  getOrCreateConversation,
} from '../services/studentService';
import { supabase } from '../lib/supabaseClient';
import {
  Search, Send, Paperclip, Smile, MoreVertical,
  Phone, Video, Clock, CheckCheck,
  Circle, Plus, Sparkles, Bell, FileText, Image as ImageIcon,
  X, Download, Users, GraduationCap, DollarSign,
  MessageSquare, Presentation, File, BarChart2, Loader,
} from 'lucide-react';

// ─── Design system (unchanged from previous version) ─────────────────────
const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:ital,opsz,wght@0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
  .ss { font-family:'Syne',sans-serif; }
  .dm { font-family:'DM Sans',sans-serif; }
  .bbl-out { background: linear-gradient(135deg,#4f46e5,#7c3aed); border-radius: 18px 18px 4px 18px; color: white; }
  .bbl-in  { background: #f1f5f9; border-radius: 18px 18px 18px 4px; color: #1e293b; }
  .g-ai    { background: linear-gradient(135deg,#4f46e5,#7c3aed); }
  .g-ment  { background: linear-gradient(135deg,#7c3aed,#6366f1); }
  .g-cofound{ background: linear-gradient(135deg,#059669,#0d9488); }
  .g-inv   { background: linear-gradient(135deg,#d97706,#ea580c); }
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
  .deck-bbl { border:2px solid #a5b4fc; border-radius:14px; padding:12px 14px; background:#fafafe; min-width:220px; transition:box-shadow .15s; }
  .deck-bbl:hover { box-shadow:0 4px 16px rgba(79,70,229,.12); }
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
`;

// ─── Category meta ────────────────────────────────────────────────────────
const CAT_META = {
  mentor:    { chip:'Mentor Chat',           bg:'#f5f3ff', text:'#7c3aed' },
  student:   { chip:'Student',               bg:'#eef2ff', text:'#4f46e5' },
  investor:  { chip:'Investor Conversation', bg:'#fffbeb', text:'#d97706' },
  cofounder: { chip:'Co-Founder Discussion', bg:'#ecfdf5', text:'#059669' },
  default:   { chip:'Message',               bg:'#f1f5f9', text:'#64748b' },
};

const EMOJIS = ['👍','🙌','🚀','💡','❤️','😊','🎉','✅','🔥','💪'];

// ─── Helpers ──────────────────────────────────────────────────────────────
function CtxChip({ type }) {
  const m = CAT_META[type?.toLowerCase()] || CAT_META.default;
  return <span className="ctx-chip" style={{background:m.bg, color:m.text}}>{m.chip}</span>;
}

function FileIcon({ type }) {
  if (type==='pdf')  return <FileText className="w-5 h-5 text-red-500"/>;
  if (type==='pptx') return <Presentation className="w-5 h-5 text-orange-500"/>;
  if (type==='img')  return <ImageIcon className="w-5 h-5 text-blue-500"/>;
  return <File className="w-5 h-5 text-slate-500"/>;
}

function MsgBubble({ msg, isMe }) {
  if (msg.type === 'file') {
    const isPptx = msg.file_name?.endsWith('.pptx');
    return (
      <div className={`flex ${isMe?'justify-end':'justify-start'}`}>
        <div className="max-w-[75%]">
          {msg.content && (
            <div className={`px-4 py-3 text-sm mb-1.5 ${isMe?'bbl-out':'bbl-in'}`}>{msg.content}</div>
          )}
          <div className={isPptx?'deck-bbl':'file-bbl'}>
            <div className="flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isPptx?'bg-indigo-50':'bg-slate-50'}`}>
                <FileIcon type={isPptx?'pptx':msg.file_name?.split('.').pop()||'file'}/>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-800 truncate">{msg.file_name}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <p className="text-xs text-slate-400">{msg.file_size}</p>
                  {isPptx&&<span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full">Pitch Deck</span>}
                </div>
              </div>
              {msg.file_url&&(
                <a href={msg.file_url} target="_blank" rel="noreferrer"
                  className="w-8 h-8 rounded-xl bg-slate-50 hover:bg-slate-100 flex items-center justify-center flex-shrink-0 transition-all">
                  <Download className="w-3.5 h-3.5 text-slate-500"/>
                </a>
              )}
            </div>
          </div>
          <p className={`text-xs text-slate-400 mt-1.5 ${isMe?'text-right':'text-left'}`}>
            {formatTime(msg.created_at)} {isMe&&<CheckCheck className="w-3 h-3 inline ml-1 text-indigo-400"/>}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex ${isMe?'justify-end':'justify-start'}`}>
      <div className="max-w-[72%]">
        <div className={`px-4 py-3 text-sm leading-relaxed ${isMe?'bbl-out':'bbl-in'}`}>{msg.content}</div>
        <p className={`text-xs text-slate-400 mt-1 ${isMe?'text-right':'text-left'}`}>
          {formatTime(msg.created_at)} {isMe&&<CheckCheck className="w-3 h-3 inline ml-1 text-indigo-400"/>}
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
  if (diffDays === 0) return d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  if (diffDays === 1) return `Yesterday, ${d.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'})}`;
  return d.toLocaleDateString([], {month:'short', day:'numeric'});
}

function NotifDropdown({ convos, onSelect, onClose }) {
  const unread = convos.filter(c=>c.unreadCount>0);
  return (
    <div className="notif-drop">
      <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
        <p className="ss font-bold text-slate-900 text-sm">Notifications</p>
        <button onClick={onClose} className="w-7 h-7 rounded-xl bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-all">
          <X className="w-3.5 h-3.5 text-slate-500"/>
        </button>
      </div>
      {unread.length===0 ? (
        <div className="p-6 text-center"><p className="text-2xl mb-2">🎉</p><p className="text-sm text-slate-500">You're all caught up!</p></div>
      ) : (
        <div className="py-2">
          {unread.map(c=>(
            <button key={c.id} onClick={()=>{onSelect(c);onClose();}}
              className="w-full flex items-start gap-3 px-5 py-3 hover:bg-slate-50 text-left transition-all">
              <div className="relative flex-shrink-0">
                <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${c.otherUser?.grad||'from-slate-400 to-slate-500'} flex items-center justify-center text-white text-xs font-bold ss`}>
                  {getInitials(c.otherUser?.full_name)}
                </div>
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{c.unreadCount}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-slate-800">{c.otherUser?.full_name||'Unknown'}</p>
                <p className="text-xs text-slate-500 truncate">{c.lastMessage?.content||'New message'}</p>
                <p className="text-xs text-slate-400 mt-0.5">{formatTime(c.last_message_at)}</p>
              </div>
              <CtxChip type={c.otherUser?.user_type}/>
            </button>
          ))}
        </div>
      )}
      <div className="px-5 py-3 border-t border-slate-100">
        <button className="w-full text-xs text-indigo-600 font-bold hover:underline">Mark all as read</button>
      </div>
    </div>
  );
}

function getInitials(name) {
  if (!name) return '?';
  return name.split(' ').map(w=>w[0]).join('').slice(0,2).toUpperCase();
}

// ─── Gradient by user_type ───────────────────────────────────────────────
function gradForType(t) {
  const map = {
    mentor: 'from-violet-500 to-indigo-500',
    investor: 'from-emerald-500 to-teal-500',
    student: 'from-indigo-500 to-blue-500',
    'early-stage-founder': 'from-amber-500 to-orange-500',
  };
  return map[t] || 'from-slate-400 to-slate-500';
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════
export default function MessagesPage() {
  const { user } = useAuth();

  const [convos,       setConvos]       = useState([]);
  const [loadingConvos,setLoadingConvos]= useState(true);
  const [activeCat,    setActiveCat]    = useState('All');
  const [query,        setQuery]        = useState('');
  const [activeConvo,  setActiveConvo]  = useState(null);
  const [messages,     setMessages]     = useState([]);
  const [loadingMsgs,  setLoadingMsgs]  = useState(false);
  const [input,        setInput]        = useState('');
  const [sending,      setSending]      = useState(false);
  const [showAI,       setShowAI]       = useState(false);
  const [showEmoji,    setShowEmoji]    = useState(false);
  const [showNotif,    setShowNotif]    = useState(false);
  const [showAttach,   setShowAttach]   = useState(false);

  const msgEndRef    = useRef(null);
  const fileRef      = useRef(null);
  const realtimeRef  = useRef(null);

  // ── Fetch conversation list ────────────────────────────────────────
  const loadConvos = useCallback(async () => {
    if (!user) return;
    try {
      const data = await fetchConversations(user.id);
      setConvos(data);
      // Auto-select first if none active
      if (!activeConvo && data.length > 0) {
        selectConvo(data[0], data);
      }
    } catch (err) {
      console.error('loadConvos:', err);
    } finally {
      setLoadingConvos(false);
    }
  }, [user]);

  useEffect(() => { loadConvos(); }, [loadConvos]);

  // ── Subscribe to conversation updates (new messages update sidebar) ─
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
    setShowAI(false); setShowEmoji(false); setShowAttach(false); setShowNotif(false);

    // Unsubscribe from previous realtime channel
    if (realtimeRef.current) {
      realtimeRef.current.unsubscribe();
      realtimeRef.current = null;
    }

    // Fetch messages
    setLoadingMsgs(true);
    try {
      const msgs = await fetchMessages(convo.id);
      setMessages(msgs);
      await markConversationRead(convo.id, user.id);
      // Update unread count locally
      setConvos(prev => prev.map(c => c.id===convo.id ? {...c, unreadCount:0} : c));
    } catch (err) {
      console.error('fetchMessages:', err);
    } finally {
      setLoadingMsgs(false);
    }

    // Subscribe to new messages in this conversation
    realtimeRef.current = subscribeToMessages(convo.id, (newMsg) => {
      setMessages(prev => {
        // Avoid duplicates
        if (prev.find(m => m.id === newMsg.id)) return prev;
        return [...prev, newMsg];
      });
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
      setShowAI(false); setShowEmoji(false);
      // Update sidebar preview
      setConvos(prev => prev.map(c => c.id===activeConvo.id
        ? {...c, lastMessage:{content, created_at:new Date().toISOString()}, last_message_at:new Date().toISOString()}
        : c));
    } catch (err) {
      console.error('sendMsg:', err);
    } finally {
      setSending(false);
    }
  };

  // ── Send file (local optimistic, no real upload yet) ──────────────
  const sendFile = async (fileName, fileSize, fileType, isPitchDeck=false) => {
    if (!activeConvo) return;
    try {
      const content = isPitchDeck ? 'Here is my pitch deck:' : `File: ${fileName}`;
      const newMsg = await dbSendMessage(activeConvo.id, user.id, content, 'file', {
        name: fileName, size: fileSize,
      });
      setMessages(prev => [...prev, newMsg]);
      setShowAttach(false);
    } catch (err) {
      console.error('sendFile:', err);
    }
  };

  const handleKey = (e) => {
    if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); sendMsg(); }
  };

  // ── Category filter ───────────────────────────────────────────────
  const catCounts = {
    All:        convos.length,
    Mentors:    convos.filter(c=>c.otherUser?.user_type==='mentor').length,
    CoFounders: convos.filter(c=>c.otherUser?.user_type==='student').length,
    Investors:  convos.filter(c=>c.otherUser?.user_type==='investor').length,
  };

  const filteredConvos = convos.filter(c => {
    const matchCat =
      activeCat==='All'        ? true :
      activeCat==='Mentors'    ? c.otherUser?.user_type==='mentor' :
      activeCat==='CoFounders' ? c.otherUser?.user_type==='student' :
      activeCat==='Investors'  ? c.otherUser?.user_type==='investor' : true;
    const matchQ = !query || (c.otherUser?.full_name||'').toLowerCase().includes(query.toLowerCase());
    return matchCat && matchQ;
  });

  const totalUnread = convos.reduce((s,c)=>s+(c.unreadCount||0), 0);

  // ── AI replies — context-sensitive ───────────────────────────────
  const aiReplies = [
    'Thanks for reaching out! I\'d love to connect further.',
    'That sounds great — let\'s schedule a call this week.',
    'I appreciate you sharing that. I\'ll review and get back to you.',
  ];

  const CAT_TABS = [
    {key:'All',        label:'All',          icon:null,                                  count:catCounts.All},
    {key:'Mentors',    label:'Mentors',       icon:<GraduationCap className="w-3 h-3"/>, count:catCounts.Mentors},
    {key:'CoFounders', label:'Co-Founders',   icon:<Users className="w-3 h-3"/>,         count:catCounts.CoFounders},
    {key:'Investors',  label:'Investors',     icon:<DollarSign className="w-3 h-3"/>,    count:catCounts.Investors},
  ];

  const otherUserType = activeConvo?.otherUser?.user_type || 'default';

  return (
    <div className="h-screen bg-[#f7f8fc] pt-16 dm flex flex-col">
      <style>{STYLES}</style>

      <div className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 py-4 flex flex-col min-h-0">
        <div className="flex-1 bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden flex min-h-0">

          {/* ════ SIDEBAR ══════════════════════════════════════════════ */}
          <div className="w-80 border-r border-slate-100 flex flex-col flex-shrink-0">
            <div className="p-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center justify-between mb-3">
                <h2 className="ss font-bold text-slate-900 text-lg">Messages</h2>
                <div className="flex items-center gap-1.5">
                  <div className="relative">
                    <button onClick={()=>{setShowNotif(v=>!v); setShowEmoji(false); setShowAttach(false);}}
                      className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all relative ${showNotif?'bg-indigo-100 text-indigo-600':'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                      <Bell className="w-4 h-4"/>
                      {totalUnread>0&&(
                        <span className="absolute -top-1 -right-1 w-4 h-4 bg-indigo-600 text-white text-[9px] font-bold rounded-full flex items-center justify-center">{totalUnread}</span>
                      )}
                    </button>
                    {showNotif&&<NotifDropdown convos={convos} onSelect={c=>{selectConvo(c);}} onClose={()=>setShowNotif(false)}/>}
                  </div>
                  <button className="w-8 h-8 bg-indigo-50 hover:bg-indigo-100 rounded-xl flex items-center justify-center transition-all">
                    <Plus className="w-4 h-4 text-indigo-600"/>
                  </button>
                </div>
              </div>
              <div className="flex items-center bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 gap-2 mb-3">
                <Search className="w-3.5 h-3.5 text-slate-400 flex-shrink-0"/>
                <input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search messages…"
                  className="flex-1 text-xs bg-transparent outline-none text-slate-700 placeholder-slate-400 dm"/>
              </div>
              <div className="flex gap-1.5 overflow-x-auto pb-0.5 no-scrollbar">
                {CAT_TABS.map(t=>(
                  <button key={t.key} onClick={()=>setActiveCat(t.key)}
                    className={`cat-tab ${activeCat===t.key?'on':'off'} flex items-center gap-1`}
                    style={activeCat===t.key?{background:t.key==='All'?'#4f46e5':t.key==='Mentors'?'#7c3aed':t.key==='CoFounders'?'#059669':'#d97706'}:{}}>
                    {t.icon}{t.label}
                    {t.count>0&&(
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none ${activeCat===t.key?'bg-white/25 text-white':'bg-slate-200 text-slate-600'}`}>{t.count}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto thin">
              {loadingConvos ? (
                <div className="p-4 space-y-3">{[1,2,3].map(i=><div key={i} className="shimmer h-16"/>)}</div>
              ) : filteredConvos.length===0 ? (
                <div className="p-6 text-center">
                  <p className="text-2xl mb-2">💬</p>
                  <p className="text-sm text-slate-400">
                    {convos.length===0 ? 'No conversations yet. Request a mentorship or connect with a co-founder to start.' : 'No conversations match your filter.'}
                  </p>
                </div>
              ) : filteredConvos.map(c=>(
                <div key={c.id} onClick={()=>selectConvo(c)}
                  className={`convo-row ${activeConvo?.id===c.id?'active':''}`}>
                  <div className="relative flex-shrink-0">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${gradForType(c.otherUser?.user_type)} flex items-center justify-center text-white font-bold text-xs ss`}>
                      {getInitials(c.otherUser?.full_name)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <p className="ss font-bold text-slate-900 text-sm truncate">{c.otherUser?.full_name||'Unknown'}</p>
                      <span className="text-[10px] text-slate-400 flex-shrink-0 ml-2">{formatTime(c.last_message_at)}</span>
                    </div>
                    <div className="flex items-center gap-1.5 mb-1"><CtxChip type={c.otherUser?.user_type}/></div>
                    <div className="flex items-center justify-between">
                      <p className="text-xs text-slate-500 truncate flex-1">{c.lastMessage?.content||'Start a conversation'}</p>
                      {c.unreadCount>0&&(
                        <span className="ml-2 w-5 h-5 bg-indigo-600 text-white text-[10px] rounded-full flex items-center justify-center flex-shrink-0 font-bold">{c.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* ════ CHAT AREA ══════════════════════════════════════════════ */}
          <div className="flex-1 flex flex-col min-w-0">
            {!activeConvo ? (
              <div className="flex-1 flex items-center justify-center">
                <div className="text-center">
                  <p className="text-4xl mb-4">💬</p>
                  <p className="ss font-bold text-slate-700 mb-1">Select a conversation</p>
                  <p className="text-sm text-slate-400">Choose a conversation from the sidebar to start messaging.</p>
                </div>
              </div>
            ) : (
              <>
                {/* Chat header */}
                <div className="flex items-center gap-3 px-5 py-3.5 border-b border-slate-100 bg-white flex-shrink-0">
                  <div className="relative flex-shrink-0">
                    <div className={`w-10 h-10 rounded-2xl bg-gradient-to-br ${gradForType(activeConvo.otherUser?.user_type)} flex items-center justify-center text-white font-bold text-xs ss`}>
                      {getInitials(activeConvo.otherUser?.full_name)}
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="ss font-bold text-slate-900 text-sm">{activeConvo.otherUser?.full_name||'Unknown'}</p>
                      <CtxChip type={activeConvo.otherUser?.user_type}/>
                    </div>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                      <Circle className="w-2 h-2 fill-slate-300 text-slate-300"/> {activeConvo.otherUser?.location||'ScalScope member'}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all"><Phone className="w-4 h-4"/></button>
                    <button className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all"><Video className="w-4 h-4"/></button>
                    <button className="w-9 h-9 rounded-xl hover:bg-slate-50 flex items-center justify-center text-slate-400 transition-all"><MoreVertical className="w-4 h-4"/></button>
                  </div>
                </div>

                {/* Messages scroll */}
                <div className="flex-1 overflow-y-auto thin px-5 py-4 space-y-2">
                  {loadingMsgs ? (
                    <div className="flex items-center justify-center py-12">
                      <Loader className="w-6 h-6 animate-spin text-indigo-400"/>
                    </div>
                  ) : messages.length===0 ? (
                    <div className="flex items-center justify-center py-12 text-center">
                      <div>
                        <p className="text-2xl mb-2">👋</p>
                        <p className="text-sm text-slate-400">No messages yet. Say hello!</p>
                      </div>
                    </div>
                  ) : (
                    <>
                      <div className="date-sep">Earlier</div>
                      {messages.map(msg=>(
                        <MsgBubble key={msg.id} msg={msg} isMe={msg.sender_id===user?.id}/>
                      ))}
                    </>
                  )}
                  <div ref={msgEndRef}/>
                </div>

                {/* AI suggestions */}
                {showAI&&(
                  <div className="px-5 pb-2 flex-shrink-0">
                    <div className="flex items-center gap-2 mb-2"><Sparkles className="w-3.5 h-3.5 text-indigo-500"/><span className="text-xs font-bold text-indigo-500">AI Smart Replies</span></div>
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                      {aiReplies.map((r,i)=>(
                        <button key={i} onClick={()=>{setInput(r); setShowAI(false);}}
                          className="flex-shrink-0 text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 hover:bg-indigo-100 px-3 py-2 rounded-xl font-medium transition-all max-w-xs text-left">
                          {r}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Attachment quick buttons */}
                {showAttach&&(
                  <div className="px-5 pb-3 flex-shrink-0">
                    <div className="flex gap-2 flex-wrap">
                      <button onClick={()=>sendFile('Pitch_Deck_v4.pptx','3.1 MB','pptx',true)}
                        className="attach-btn text-indigo-600 border-indigo-200 bg-indigo-50">
                        <Presentation className="w-3.5 h-3.5"/> Share Pitch Deck
                      </button>
                      <button onClick={()=>sendFile('Financial_Model.xlsx','1.2 MB','xlsx')}
                        className="attach-btn text-emerald-600 border-emerald-200 bg-emerald-50">
                        <BarChart2 className="w-3.5 h-3.5"/> Financial Model
                      </button>
                      <button onClick={()=>sendFile('Executive_Summary.pdf','420 KB','pdf')}
                        className="attach-btn text-red-500 border-red-200 bg-red-50">
                        <FileText className="w-3.5 h-3.5"/> Executive Summary
                      </button>
                      <button onClick={()=>fileRef.current?.click()} className="attach-btn">
                        <Paperclip className="w-3.5 h-3.5"/> Browse Files
                      </button>
                      <input ref={fileRef} type="file" className="hidden"
                        onChange={e=>{ const f=e.target.files?.[0]; if(f) sendFile(f.name,`${(f.size/1024).toFixed(0)} KB`,f.name.split('.').pop()); }}
                      />
                    </div>
                  </div>
                )}

                {/* Input area */}
                <div className="px-5 py-4 border-t border-slate-100 bg-white flex-shrink-0">
                  <div className="flex items-end gap-2">
                    <button onClick={()=>{setShowAI(v=>!v); setShowEmoji(false); setShowAttach(false);}}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${showAI?'g-ai text-white':'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                      <Sparkles className="w-4 h-4"/>
                    </button>
                    <button onClick={()=>{setShowAttach(v=>!v); setShowEmoji(false); setShowAI(false);}}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 transition-all ${showAttach?'g-ai text-white':'bg-slate-50 text-slate-500 hover:bg-indigo-50 hover:text-indigo-600'}`}>
                      <Paperclip className="w-4 h-4"/>
                    </button>
                    <div className="flex-1 inp-wrap flex items-end gap-2 px-4 py-3">
                      <textarea value={input} onChange={e=>setInput(e.target.value)} onKeyDown={handleKey}
                        placeholder="Write a message…" rows={1}
                        className="flex-1 bg-transparent text-sm text-slate-800 outline-none placeholder-slate-400 resize-none leading-relaxed dm"
                        style={{maxHeight:'100px'}}/>
                      <div className="relative flex-shrink-0">
                        <button onClick={()=>{setShowEmoji(v=>!v); setShowAI(false); setShowAttach(false);}}
                          className="w-8 h-8 rounded-xl hover:bg-slate-200 flex items-center justify-center text-slate-400 transition-all">
                          <Smile className="w-4 h-4"/>
                        </button>
                        {showEmoji&&(
                          <div className="emoji-strip">
                            {EMOJIS.map(e=>(
                              <button key={e} onClick={()=>{setInput(p=>p+e); setShowEmoji(false);}} className="text-lg hover:scale-125 transition-transform">{e}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                    <button onClick={()=>sendMsg()} disabled={!input.trim()||sending}
                      className={`w-10 h-10 rounded-2xl flex items-center justify-center text-white flex-shrink-0 hover:opacity-90 transition-all shadow-md shadow-indigo-200 ${!input.trim()||sending?'bg-slate-200':'g-ai'}`}>
                      {sending ? <Loader className="w-4 h-4 animate-spin"/> : <Send className="w-4 h-4"/>}
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