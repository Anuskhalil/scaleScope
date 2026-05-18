<<<<<<< HEAD
// src/pages/student/ConnectionRequestsPage.jsx — Optimized, Brand-Aligned, Production-Ready
import React, { useState, useEffect, useCallback, memo } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import { backendApi } from '../../lib/backendApi';
import { useRealtime } from '../../hooks/useRealtime';
import { fetchIncomingRequests, fetchSentRequests, respondToRequest } from '../../services/studentService';
import { Inbox, Send, UserCheck, UserX, Clock, CheckCircle, XCircle, ArrowRight, MapPin, Users, UserPlus, Briefcase, AlertCircle, Loader, ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';

// 🎨 BRAND CSS
const CSS = `
  :root { --primary: #98DE38; --primary-dark: #7EC42E; --secondary: #1B2D7F; --secondary-light: #2A3F8F; --white: #fff; --gray-50: #F9FAFB; --gray-100: #F3F4F6; --gray-200: #E5E7EB; }
  .page-bg { background: var(--gray-50); background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px); background-size: 28px 28px; }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
  .shimmer { background: linear-gradient(90deg, var(--gray-200) 25%, #ddd 50%, var(--gray-200) 75%); background-size: 200% 100%; animation: s 1.5s infinite; border-radius: 12px; }
  @keyframes s { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  @media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }
  @media (max-width: 768px) { button, [role="button"] { min-height: 44px; min-width: 44px; padding: 10px 14px; } }
`;

// 🔧 UTILS
const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;
async function getCachedUrl(path) {
    if (!path || path.startsWith('http')) return path;
    const key = `av:${path}`;
    const cached = AVATAR_CACHE.get(key);
    if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;
    try {
        const { d } = await supabase.storage.from('avatars').createSignedUrl(path.replace('avatars/', ''), 3600);
        if (d?.signedUrl) { AVATAR_CACHE.set(key, { url: d.signedUrl, ts: Date.now() }); return d.signedUrl; }
    } catch { }
    return null;
}
const initials = (n) => n ? n.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase() : '?';
const timeAgo = (iso) => {
=======
// src/pages/student/ConnectionRequestsPage.jsx
// ─── Optimized Connection Requests Page — Accessible, Trust-Focused, Production-Ready ───
// Tabs: Incoming (accept/decline) | Sent (track status)
// ───────────────────────────────────────────────────────────────────────

import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';
import { useAuth } from '../../auth/AuthContext';
import {
    fetchIncomingRequests,
    fetchSentRequests,
    respondToRequest,
    withdrawRequest,
} from '../../services/studentService';
import {
    Inbox, Send, UserCheck, UserX, Clock, CheckCircle,
    XCircle, ArrowRight, MapPin, MessageSquare, Users,
    UserPlus, Shield, Briefcase, AlertCircle, Loader,
    ChevronRight, GraduationCap, ArrowLeft,
} from 'lucide-react';

// 🔧 CHANGED: Added toast for user feedback
import toast from 'react-hot-toast';

const CSS = `
  .page-bg{background-color:#f4f5fb;background-image:radial-gradient(circle,#c7d2fe 1px,transparent 1px);background-size:28px 28px}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-2px);box-shadow:0 12px 36px rgba(79,70,229,.1)}
  .g-ind{background:linear-gradient(135deg,#4f46e5,#7c3aed)}
  .g-em{background:linear-gradient(135deg,#059669,#0891b2)}
  .f0{animation:fu .3s ease both}
  .f1{animation:fu .3s .06s ease both}
  .f2{animation:fu .3s .12s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:none}}
  
  /* 🔧 CHANGED: Accessibility focus states */
  button:focus-visible, a:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
  
  /* Mobile optimizations */
  @media (max-width: 1024px) {
    .lift:hover { transform: none; box-shadow: none; }
  }
  @media (prefers-reduced-motion: reduce) {
    * { animation-duration: 0.01ms !important; animation-iteration-count: 1 !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important; }
  }
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

function roleGrad(t) {
    return {
        mentor: 'from-violet-500 to-indigo-500',
        investor: 'from-emerald-500 to-teal-500',
        student: 'from-indigo-500 to-violet-500',
        'early-stage-founder': 'from-amber-500 to-orange-500',
    }[t] || 'from-slate-400 to-slate-500';
}

function initials(name) {
    if (!name) return '?';
    return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}

// 🔧 CHANGED: Avatar component with caching + error handling
function Avatar({ name, avatarPath, grad, size = 'md' }) {
    const [url, setUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    
    useEffect(() => {
        let cancelled = false;
        const resolve = async () => {
            setLoading(true);
            const resolved = await getCachedSignedUrl(avatarPath);
            if (!cancelled) { setUrl(resolved); setLoading(false); }
        };
        resolve();
        return () => { cancelled = true; };
    }, [avatarPath]);

    const sizeMap = {
        sm: 'w-9 h-9 text-xs rounded-xl',
        md: 'w-12 h-12 text-sm rounded-xl',
        lg: 'w-14 h-14 text-base rounded-2xl',
    };
    
    if (loading) return <div className={`${sizeMap[size]} bg-slate-200 animate-pulse rounded-xl`} />;
    if (url) return <img src={url} alt={name || 'User'} className={`${sizeMap[size]} object-cover flex-shrink-0`} loading="lazy" onError={() => setUrl(null)} />;
    return <div className={`${sizeMap[size]} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`} aria-hidden="true">{initials(name)}</div>;
}

function typeBadge(type) {
    const map = {
        mentor_request: { label: 'Mentorship', cls: 'bg-violet-100 text-violet-700', icon: Users },
        cofounder_request: { label: 'Co-Founder', cls: 'bg-indigo-100 text-indigo-700', icon: UserPlus },
        investor_contact: { label: 'Investor', cls: 'bg-emerald-100 text-emerald-700', icon: Briefcase },
    };
    return map[type] || { label: type, cls: 'bg-slate-100 text-slate-600', icon: Shield };
}

function statusBadge(status) {
    const map = {
        pending: { label: 'Pending', cls: 'bg-amber-100 text-amber-700', Icon: Clock },
        accepted: { label: 'Accepted', cls: 'bg-emerald-100 text-emerald-700', Icon: CheckCircle },
        declined: { label: 'Declined', cls: 'bg-red-100 text-red-700', Icon: XCircle },
        withdrawn: { label: 'Withdrawn', cls: 'bg-slate-100 text-slate-500', Icon: XCircle },
    };
    return map[status] || { label: status, cls: 'bg-slate-100 text-slate-600', Icon: Clock };
}

function timeAgo(iso) {
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
    if (!iso) return '';
    const s = (Date.now() - new Date(iso)) / 1000;
    return s < 60 ? 'just now' : s < 3600 ? `${Math.floor(s / 60)}m` : s < 86400 ? `${Math.floor(s / 3600)}h` : `${Math.floor(s / 86400)}d`;
};
const roleGrad = (t) => ({ mentor: 'from-violet-500 to-indigo-500', investor: 'from-emerald-500 to-teal-500', student: 'from-indigo-500 to-blue-500', 'early-stage-founder': 'from-amber-500 to-orange-500' }[t] || 'from-gray-400 to-gray-500');
const typeBadge = (type) => {
    const map = { mentor_request: { l: 'Mentorship', c: 'bg-indigo-50 text-indigo-700', i: Users }, cofounder_request: { l: 'Co-Founder', c: 'bg-purple-50 text-purple-700', i: UserPlus }, investor_contact: { l: 'Investor', c: 'bg-green-50 text-green-700', i: Briefcase } };
    return map[type] || { l: type, c: 'bg-gray-50 text-gray-700', i: Users };
};
const statusBadge = (status) => {
    const map = { pending: { l: 'Pending', c: 'bg-amber-50 text-amber-700', i: Clock }, accepted: { l: 'Accepted', c: 'bg-green-50 text-green-700', i: CheckCircle }, declined: { l: 'Declined', c: 'bg-red-50 text-red-700', i: XCircle }, withdrawn: { l: 'Withdrawn', c: 'bg-gray-50 text-gray-700', i: XCircle } };
    return map[status] || { l: status, c: 'bg-gray-50 text-gray-700', i: Clock };
};

// 🧩 MEMOIZED COMPONENTS
const Avatar = memo(({ name, path, grad, size = 'md' }) => {
    const [url, setUrl] = useState(null);
    const [loading, setLoading] = useState(true);
    useEffect(() => { let c = false; getCachedUrl(path).then(u => { if (!c) { setUrl(u); setLoading(false); } }); return () => c = true; }, [path]);
    const sz = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12' }[size];
    if (loading) return <div className={`${sz} rounded-xl shimmer`} aria-hidden="true" />;
    return url ? <img src={url} alt="" className={`${sz} rounded-xl object-cover`} loading="lazy" onError={() => setUrl(null)} /> : <div className={`${sz} rounded-xl bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold`} aria-hidden="true">{initials(name)}</div>;
});

export default function ConnectionRequestsPage() {
    const { user } = useAuth();
    const [state, setState] = useState({ loading: true, tab: 'incoming', error: null, action: null });
    const [data, setData] = useState({ incoming: [], sent: [] });

    // ✅ NEW: Real-time hook for instant request notifications
    useRealtime({
        onConnectionRequest: (payload) => {
            // Refresh incoming requests when new one arrives
            if (state.tab === 'incoming') {
                load();
            }
            toast.info(`🤝 New request from ${payload.senderName}`);
        }
    });

    const load = useCallback(async () => {
        if (!user) return;
        setState(p => ({ ...p, loading: true, error: null }));
        try {
            // ✅ Use backend API for consistency (or keep Supabase for now)
            const [inRes, sentRes] = await Promise.all([
<<<<<<< HEAD
                fetchIncomingRequests(user.id),
                fetchSentRequests(user.id)
=======
                safeFetch(fetchIncomingRequests(user.id), [], () => toast.error('Failed to load incoming requests')),
                safeFetch(fetchSentRequests(user.id), [], () => toast.error('Failed to load sent requests')),
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
            ]);
            setData({ incoming: inRes || [], sent: sentRes || [] });
        } catch (err) {
<<<<<<< HEAD
            console.error(err);
            setState(p => ({ ...p, error: 'Failed to load requests' }));
            toast.error('Could not load requests');
=======
            console.error('[ConnectionRequests]', err);
            setError('Failed to load requests.');
            toast.error('Failed to load requests');
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
        } finally {
            setState(p => ({ ...p, loading: false }));
        }
    }, [user]);

    useEffect(() => { load(); }, [load]);

    // ✅ UPDATED: Handle actions via backend API
    const handleAction = async (requestId, action, type) => {
        if (state.action) return;
        setState(p => ({ ...p, action: requestId }));
        try {
<<<<<<< HEAD
            if (type === 'respond') {
                await backendApi.respondConnect(requestId, action);
            }
            else await withdrawRequest(requestId);

            if (state.tab === 'incoming') {
                setData(p => ({ ...p, incoming: p.incoming.filter(r => r.id !== requestId) }));
            } else {
                if (action === 'withdraw') {
                    setData(p => ({ ...p, sent: p.sent.map(r => r.id === requestId ? { ...r, status: 'withdrawn' } : r) }));
                }
            }
            toast.success(
                action === 'accepted' ? 'Request accepted!' :
                    action === 'declined' ? 'Request declined' :
                        'Request withdrawn',
                { style: { background: '#98DE38', color: '#000' } }
            );
        } catch (err) {
            toast.error(err.message || 'Failed to process request');
=======
            await respondToRequest(requestId, 'accepted');
            setIncoming(prev => prev.filter(r => r.id !== requestId));
            toast.success('Request accepted!');
        } catch (err) {
            setError(err.message || 'Failed to accept request.');
            toast.error('Failed to accept request');
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
        } finally {
            setState(p => ({ ...p, action: null }));
        }
    };
    if (state.loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin" style={{ color: '#1B2D7F' }} /></div>;

<<<<<<< HEAD
    const { incoming, sent } = data;
    const { tab, error, action } = state;
    const pendingCount = incoming.filter(r => r.status === 'pending').length;
=======
    const handleDecline = async (requestId) => {
        setActionLoading(requestId);
        setError('');
        try {
            await respondToRequest(requestId, 'declined');
            setIncoming(prev => prev.filter(r => r.id !== requestId));
            toast.success('Request declined');
        } catch (err) {
            setError(err.message || 'Failed to decline request.');
            toast.error('Failed to decline request');
        } finally {
            setActionLoading(null);
        }
    };

    const handleWithdraw = async (requestId) => {
        setActionLoading(requestId);
        setError('');
        try {
            await withdrawRequest(requestId);
            setSent(prev => prev.map(r => r.id === requestId ? { ...r, status: 'withdrawn' } : r));
            toast.success('Request withdrawn');
        } catch (err) {
            setError(err.message || 'Failed to withdraw request.');
            toast.error('Failed to withdraw request');
        } finally {
            setActionLoading(null);
        }
    };

    const pendingIncomingCount = incoming.length;
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f

    return (
        <>
            <style>{CSS}</style>
            <div className="min-h-screen page-bg pt-20 pb-16 px-4">
                <div className="max-w-4xl mx-auto">
                    {/* HEADER */}
                    <header className="mb-6 flex items-center justify-between">
                        <Link to="/dashboard" className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"><ArrowLeft className="w-4" /> Back</Link>
                        <h1 className="text-2xl font-black text-gray-900">Connection Requests</h1>
                        <div className="w-20" /> {/* Spacer for centering */}
                    </header>

<<<<<<< HEAD
                    {/* TABS */}
                    <div className="flex gap-1 bg-white rounded-xl border border-gray-200 p-1 mb-6">
                        {[{ k: 'incoming', l: 'Incoming', i: Inbox, c: pendingCount }, { k: 'sent', l: 'Sent', i: Send, c: sent.length }].map(t => (
                            <button key={t.k} onClick={() => setState(p => ({ ...p, tab: t.k }))} className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold ${tab === t.k ? 'g-brand text-black' : 'text-gray-600 hover:bg-gray-50'}`} aria-pressed={tab === t.k}>
                                <t.i className="w-4" />{t.l}{t.c > 0 && <span className={`text-xs font-bold px-1.5 py-0.5 rounded-full ${tab === t.k ? 'bg-black/10' : 'bg-gray-200'}`}>{t.c}</span>}
                            </button>
                        ))}
                    </div>

                    {/* ERROR */}
                    {error && <div className="p-3 mb-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-center gap-2" role="alert"><AlertCircle className="w-4" />{error}</div>}

                    {/* INCOMING TAB */}
                    {tab === 'incoming' && (
                        <>
                            {incoming.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                    <Inbox className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="font-semibold text-gray-900 mb-1">No pending requests</p>
                                    <p className="text-sm text-gray-500 mb-6">When mentors or students send you a request, it will appear here.</p>
                                    <div className="flex gap-2 justify-center">
                                        <Link to="/find-mentors" className="px-4 py-2 g-brand text-black text-sm font-bold rounded-xl">Find Mentors</Link>
                                        <Link to="/find-cofounders" className="px-4 py-2 border border-gray-200 text-sm font-bold rounded-xl">Find Co-Founders</Link>
=======
                    {/* ── Back to dashboard ─────────────────────────────────────── */}
                    <header className="mb-4 f0">
                        <Link to="/dashboard" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600 transition-colors">
                            <ArrowLeft className="w-4 h-4" aria-hidden="true" /> Back to Dashboard
                        </Link>
                    </header>

                    {/* ── Header ─────────────────────────────────────────────── */}
                    <div className="mb-6 f0">
                        <h1 className="text-2xl sm:text-3xl font-black text-slate-900 mb-1">Connection Requests</h1>
                        <p className="text-slate-500 text-sm">Manage mentorship, co-founder, and investor requests.</p>
                    </div>

                    {/* ── Tabs ───────────────────────────────────────────────── */}
                    <div className="flex gap-1 bg-white rounded-xl border border-slate-200 p-1 mb-6 f0">
                        <button
                            onClick={() => setActiveTab('incoming')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'incoming'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            aria-pressed={activeTab === 'incoming'}
                        >
                            <Inbox className="w-4 h-4" aria-hidden="true" />
                            Incoming
                            {pendingIncomingCount > 0 && (
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${activeTab === 'incoming' ? 'bg-white/20 text-white' : 'bg-red-500 text-white'
                                    }`}>
                                    {pendingIncomingCount}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => setActiveTab('sent')}
                            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all ${activeTab === 'sent'
                                    ? 'bg-indigo-600 text-white shadow-sm'
                                    : 'text-slate-600 hover:bg-slate-50'
                                }`}
                            aria-pressed={activeTab === 'sent'}
                        >
                            <Send className="w-4 h-4" aria-hidden="true" />
                            Sent
                            {sent.length > 0 && (
                                <span className={`inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 rounded-full text-xs font-bold ${activeTab === 'sent' ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {sent.length}
                                </span>
                            )}
                        </button>
                    </div>

                    {/* ── Error ──────────────────────────────────────────────── */}
                    {error && (
                        <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl" role="alert">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" aria-hidden="true" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* ── Loading ────────────────────────────────────────────── */}
                    {loading && (
                        <div className="space-y-4" role="status" aria-live="polite">
                            {[1, 2, 3].map(i => (
                                <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5">
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 bg-slate-100 rounded-xl animate-pulse" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-4 bg-slate-100 rounded-lg w-1/3 animate-pulse" />
                                            <div className="h-3 bg-slate-100 rounded-lg w-2/3 animate-pulse" />
                                        </div>
                                        <div className="h-9 w-20 bg-slate-100 rounded-lg animate-pulse" />
                                    </div>
                                </div>
                            ))}
                            <span className="sr-only">Loading requests...</span>
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
              INCOMING TAB
          ══════════════════════════════════════════════════════════ */}
                    {!loading && activeTab === 'incoming' && (
                        <>
                            {incoming.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center f1">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                                        <Inbox className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-1">No pending requests</h3>
                                    <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                                        When mentors or students send you a connection request, it will appear here.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                                        <Link
                                            to="/find-mentors"
                                            className="inline-flex items-center justify-center gap-2 g-ind text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                                        >
                                            Find Mentors <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                        </Link>
                                        <Link
                                            to="/find-cofounders"
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50"
                                        >
                                            Find Co-Founders <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                        </Link>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3" aria-live="polite">
                                    {incoming.map(req => {
                                        const sender = req.sender || {};
                                        const t = typeBadge(req.type);
                                        return (
<<<<<<< HEAD
                                            <article key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4 lift">
                                                <div className="flex gap-4">
                                                    <Avatar name={sender.full_name} path={sender.avatar_url} grad={roleGrad(sender.user_type)} size="md" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-gray-900">{sender.full_name}</p>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.c}`}>{t.l}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2"><MapPin className="w-3" />{sender.location || 'Remote'} · {timeAgo(req.created_at)}</p>
                                                        {sender.bio && <p className="text-sm text-gray-600 mt-2 line-clamp-2">{sender.bio}</p>}
                                                        {req.message && <div className="mt-3 p-3 bg-indigo-50 border border-indigo-100 rounded-xl"><p className="text-xs font-bold text-indigo-600 mb-1">Message</p><p className="text-sm text-gray-700">"{req.message}"</p></div>}
                                                        <div className="flex gap-2 mt-4">
                                                            <button
                                                                onClick={() => handleAction(req.id, 'accept', 'respond')}
                                                                disabled={action === req.id}
                                                                className={`flex-1 py-2 text-white rounded-xl text-xs font-bold ${action === req.id ? 'bg-gray-300' : 'bg-green-600'} hover:opacity-90 transition`}
                                                            >
                                                                {action === req.id ? <Loader className="w-3.5 animate-spin inline mr-1" /> : <UserCheck className="w-3.5 inline mr-1" />}
                                                                Accept
                                                            </button>
                                                            <button
                                                                onClick={() => handleAction(req.id, 'decline', 'respond')}
                                                                disabled={action === req.id}
                                                                className="flex-1 py-2 border-2 border-gray-200 rounded-xl text-xs font-bold hover:border-red-200 hover:text-red-600 transition"
                                                            >
                                                                <UserX className="w-3.5 inline mr-1" />Decline
                                                            </button>
                                                        </div>
                                                    </div>
=======
                                            <div
                                                key={req.id}
                                                className={`bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 lift f${Math.min(i, 2)}`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                                    {/* Avatar + Info */}
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <Avatar
                                                            name={sender.full_name}
                                                            avatarPath={sender.avatar_url}
                                                            grad={roleGrad(sender.user_type)}
                                                            size="md"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                                <Link
                                                                    to={sender.user_type === 'mentor' ? `/find-mentors` : `/find-cofounders`}
                                                                    className="font-bold text-slate-900 hover:text-indigo-600 transition-colors"
                                                                >
                                                                    {sender.full_name || 'Someone'}
                                                                </Link>
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tBadge.cls}`}>
                                                                    {tBadge.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-1.5">
                                                                <span className="capitalize">{sender.user_type || 'User'}</span>
                                                                {sender.location && (
                                                                    <span className="flex items-center gap-0.5">
                                                                        <MapPin className="w-3 h-3" aria-hidden="true" />{sender.location}
                                                                    </span>
                                                                )}
                                                                <span>{timeAgo(req.created_at)}</span>
                                                            </div>
                                                            {sender.bio && (
                                                                <p className="text-xs text-slate-500 line-clamp-2 mb-1">{sender.bio}</p>
                                                            )}
                                                            {sender.skills?.length > 0 && (
                                                                <div className="flex flex-wrap gap-1 mb-1">
                                                                    {sender.skills.slice(0, 4).map((sk, si) => (
                                                                        <span key={si} className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">{sk}</span>
                                                                    ))}
                                                                </div>
                                                            )}
                                                            {req.message && (
                                                                <div className="mt-2 p-3 bg-indigo-50 border border-indigo-100 rounded-xl">
                                                                    <p className="text-xs text-indigo-800 font-medium mb-0.5">Message:</p>
                                                                    <p className="text-sm text-slate-700 leading-relaxed">"{req.message}"</p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Actions */}
                                                    <div className="flex sm:flex-col gap-2 flex-shrink-0 sm:ml-2">
                                                        <button
                                                            onClick={() => handleAccept(req.id)}
                                                            disabled={actionLoading === req.id}
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                                                            aria-label={`Accept request from ${sender.full_name || 'user'}`}
                                                        >
                                                            {actionLoading === req.id ? (
                                                                <Loader className="w-4 h-4 animate-spin" aria-hidden="true" />
                                                            ) : (
                                                                <UserCheck className="w-4 h-4" aria-hidden="true" />
                                                            )}
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleDecline(req.id)}
                                                            disabled={actionLoading === req.id}
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-600 text-sm font-bold rounded-xl border-2 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed min-h-[44px]"
                                                            aria-label={`Decline request from ${sender.full_name || 'user'}`}
                                                        >
                                                            <UserX className="w-4 h-4" aria-hidden="true" />
                                                            Decline
                                                        </button>
                                                    </div>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* SENT TAB */}
                    {tab === 'sent' && (
                        <>
                            {sent.length === 0 ? (
<<<<<<< HEAD
                                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="font-semibold text-gray-900 mb-1">No sent requests</p>
                                    <p className="text-sm text-gray-500 mb-6">You haven't sent any connection requests yet.</p>
                                    <div className="flex gap-2 justify-center">
                                        <Link to="/find-mentors" className="px-4 py-2 g-brand text-black text-sm font-bold rounded-xl">Find Mentors</Link>
                                        <Link to="/find-cofounders" className="px-4 py-2 border border-gray-200 text-sm font-bold rounded-xl">Find Co-Founders</Link>
=======
                                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center f1">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4" aria-hidden="true">
                                        <Send className="w-8 h-8 text-slate-300" />
                                    </div>
                                    <h3 className="font-bold text-slate-900 text-lg mb-1">No sent requests</h3>
                                    <p className="text-slate-500 text-sm max-w-sm mx-auto mb-6">
                                        You haven't sent any connection requests yet. Find mentors or co-founders to get started.
                                    </p>
                                    <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
                                        <Link
                                            to="/find-mentors"
                                            className="inline-flex items-center justify-center gap-2 g-ind text-white px-5 py-2.5 rounded-xl text-sm font-bold"
                                        >
                                            Find Mentors <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                        </Link>
                                        <Link
                                            to="/find-cofounders"
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50"
                                        >
                                            Find Co-Founders <ArrowRight className="w-4 h-4" aria-hidden="true" />
                                        </Link>
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3" aria-live="polite">
                                    {sent.map(req => {
                                        const receiver = req.receiver || {};
                                        const t = typeBadge(req.type);
                                        const s = statusBadge(req.status);
                                        return (
<<<<<<< HEAD
                                            <article key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4 lift">
                                                <div className="flex gap-4">
                                                    <Avatar name={receiver.full_name} path={receiver.avatar_url} grad={roleGrad(receiver.user_type)} size="md" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-gray-900">{receiver.full_name}</p>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.c}`}>{t.l}</span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${s.c}`}><s.i className="w-3" />{s.l}</span>
=======
                                            <div
                                                key={req.id}
                                                className={`bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 lift f${Math.min(i, 2)}`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                                    {/* Avatar + Info */}
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <Avatar
                                                            name={receiver.full_name}
                                                            avatarPath={receiver.avatar_url}
                                                            grad={roleGrad(receiver.user_type)}
                                                            size="md"
                                                        />
                                                        <div className="flex-1 min-w-0">
                                                            <div className="flex items-center gap-2 flex-wrap mb-0.5">
                                                                <p className="font-bold text-slate-900">{receiver.full_name || 'Someone'}</p>
                                                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${tBadge.cls}`}>
                                                                    {tBadge.label}
                                                                </span>
                                                                <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${sBadge.cls}`}>
                                                                    <SIcon className="w-3 h-3" aria-hidden="true" />{sBadge.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
                                                                <span className="capitalize">{receiver.user_type || 'User'}</span>
                                                                {receiver.location && (
                                                                    <span className="flex items-center gap-0.5">
                                                                        <MapPin className="w-3 h-3" aria-hidden="true" />{receiver.location}
                                                                    </span>
                                                                )}
                                                                <span>Sent {timeAgo(req.created_at)}</span>
                                                            </div>
                                                            {req.message && (
                                                                <p className="text-xs text-slate-500 italic mt-1">"{req.message}"</p>
                                                            )}
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2"><MapPin className="w-3" />{receiver.location || 'Remote'} · Sent {timeAgo(req.created_at)}</p>
                                                        {req.message && <p className="text-sm text-gray-600 mt-2 italic">"{req.message}"</p>}
                                                        {req.status === 'pending' && (
                                                            <button onClick={() => handleAction(req.id, 'withdraw', 'withdraw')} disabled={action === req.id} className="mt-3 text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"><XCircle className="w-3" />Withdraw request</button>
                                                        )}
                                                    </div>
<<<<<<< HEAD
=======

                                                    {/* Withdraw button (only for pending) */}
                                                    {isPending && (
                                                        <button
                                                            onClick={() => handleWithdraw(req.id)}
                                                            disabled={actionLoading === req.id}
                                                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-500 text-xs font-bold rounded-xl border-2 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0 min-h-[44px]"
                                                            aria-label={`Withdraw request to ${receiver.full_name || 'user'}`}
                                                        >
                                                            {actionLoading === req.id ? (
                                                                <Loader className="w-3.5 h-3.5 animate-spin" aria-hidden="true" />
                                                            ) : (
                                                                <XCircle className="w-3.5 h-3.5" aria-hidden="true" />
                                                            )}
                                                            Withdraw
                                                        </button>
                                                    )}
>>>>>>> 236542ff5c8b1c13469939b6a0bde2bae8b5b45f
                                                </div>
                                            </article>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}
                </div>
            </div>
        </>
    );
}