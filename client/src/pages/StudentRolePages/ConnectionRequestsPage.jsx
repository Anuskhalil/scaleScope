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
                fetchIncomingRequests(user.id),
                fetchSentRequests(user.id)
            ]);
            setData({ incoming: inRes || [], sent: sentRes || [] });
        } catch (err) {
            console.error(err);
            setState(p => ({ ...p, error: 'Failed to load requests' }));
            toast.error('Could not load requests');
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
        } finally {
            setState(p => ({ ...p, action: null }));
        }
    };
    if (state.loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin" style={{ color: '#1B2D7F' }} /></div>;

    const { incoming, sent } = data;
    const { tab, error, action } = state;
    const pendingCount = incoming.filter(r => r.status === 'pending').length;

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
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3" aria-live="polite">
                                    {incoming.map(req => {
                                        const sender = req.sender || {};
                                        const t = typeBadge(req.type);
                                        return (
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
                                <div className="bg-white rounded-2xl border border-gray-200 p-12 text-center">
                                    <Send className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                                    <p className="font-semibold text-gray-900 mb-1">No sent requests</p>
                                    <p className="text-sm text-gray-500 mb-6">You haven't sent any connection requests yet.</p>
                                    <div className="flex gap-2 justify-center">
                                        <Link to="/find-mentors" className="px-4 py-2 g-brand text-black text-sm font-bold rounded-xl">Find Mentors</Link>
                                        <Link to="/find-cofounders" className="px-4 py-2 border border-gray-200 text-sm font-bold rounded-xl">Find Co-Founders</Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3" aria-live="polite">
                                    {sent.map(req => {
                                        const receiver = req.receiver || {};
                                        const t = typeBadge(req.type);
                                        const s = statusBadge(req.status);
                                        return (
                                            <article key={req.id} className="bg-white rounded-2xl border border-gray-100 p-4 lift">
                                                <div className="flex gap-4">
                                                    <Avatar name={receiver.full_name} path={receiver.avatar_url} grad={roleGrad(receiver.user_type)} size="md" />
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 flex-wrap">
                                                            <p className="font-bold text-gray-900">{receiver.full_name}</p>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.c}`}>{t.l}</span>
                                                            <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${s.c}`}><s.i className="w-3" />{s.l}</span>
                                                        </div>
                                                        <p className="text-xs text-gray-500 mt-1 flex items-center gap-2"><MapPin className="w-3" />{receiver.location || 'Remote'} · Sent {timeAgo(req.created_at)}</p>
                                                        {req.message && <p className="text-sm text-gray-600 mt-2 italic">"{req.message}"</p>}
                                                        {req.status === 'pending' && (
                                                            <button onClick={() => handleAction(req.id, 'withdraw', 'withdraw')} disabled={action === req.id} className="mt-3 text-xs text-gray-500 hover:text-red-600 flex items-center gap-1"><XCircle className="w-3" />Withdraw request</button>
                                                        )}
                                                    </div>
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