// src/pages/StudentRolePages/ConnectionRequestsPage.jsx
// ─── Connection Requests — Student view ─────────────────────────────────
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
    ChevronRight, GraduationCap,
} from 'lucide-react';

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
`;

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

function Avatar({ name, avatar, grad, size = 'md' }) {
    const sizeMap = {
        sm: 'w-9 h-9 text-xs rounded-xl',
        md: 'w-12 h-12 text-sm rounded-xl',
        lg: 'w-14 h-14 text-base rounded-2xl',
    };
    if (avatar) {
        return <img src={avatar} alt={name || ''} className={`${sizeMap[size]} object-cover flex-shrink-0`} />;
    }
    return (
        <div className={`${sizeMap[size]} bg-gradient-to-br ${grad} flex items-center justify-center text-white font-bold flex-shrink-0`}>
            {initials(name)}
        </div>
    );
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
    if (!iso) return '';
    const s = (Date.now() - new Date(iso)) / 1000;
    if (s < 60) return 'just now';
    if (s < 3600) return `${Math.floor(s / 60)}m ago`;
    if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
    return `${Math.floor(s / 86400)}d ago`;
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN PAGE
// ═══════════════════════════════════════════════════════════════════════════
export default function ConnectionRequestsPage() {
    const { user } = useAuth();

    const [activeTab, setActiveTab] = useState('incoming');
    const [incoming, setIncoming] = useState([]);
    const [sent, setSent] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null); // request id being acted on
    const [error, setError] = useState('');

    const loadRequests = useCallback(async () => {
        if (!user) return;
        setLoading(true);
        setError('');
        try {
            const [inRes, sentRes] = await Promise.all([
                fetchIncomingRequests(user.id).catch(e => { console.warn(e.message); return []; }),
                fetchSentRequests(user.id).catch(e => { console.warn(e.message); return []; }),
            ]);
            setIncoming(inRes);
            setSent(sentRes);
        } catch (err) {
            console.error('[ConnectionRequests]', err);
            setError('Failed to load requests.');
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => { loadRequests(); }, [loadRequests]);

    const handleAccept = async (requestId) => {
        setActionLoading(requestId);
        setError('');
        try {
            await respondToRequest(requestId, 'accepted');
            setIncoming(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            setError(err.message || 'Failed to accept request.');
        } finally {
            setActionLoading(null);
        }
    };

    const handleDecline = async (requestId) => {
        setActionLoading(requestId);
        setError('');
        try {
            await respondToRequest(requestId, 'declined');
            setIncoming(prev => prev.filter(r => r.id !== requestId));
        } catch (err) {
            setError(err.message || 'Failed to decline request.');
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
        } catch (err) {
            setError(err.message || 'Failed to withdraw request.');
        } finally {
            setActionLoading(null);
        }
    };

    const pendingIncomingCount = incoming.length;

    return (
        <>
            <style>{CSS}</style>
            <div className="min-h-screen page-bg">
                <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-20 pb-8 lg:py-24">

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
                        >
                            <Inbox className="w-4 h-4" />
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
                        >
                            <Send className="w-4 h-4" />
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
                        <div className="flex items-start gap-2 p-3 mb-4 bg-red-50 border border-red-200 rounded-xl">
                            <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                            <p className="text-sm text-red-700">{error}</p>
                        </div>
                    )}

                    {/* ── Loading ────────────────────────────────────────────── */}
                    {loading && (
                        <div className="space-y-4">
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
                        </div>
                    )}

                    {/* ══════════════════════════════════════════════════════════
              INCOMING TAB
          ══════════════════════════════════════════════════════════ */}
                    {!loading && activeTab === 'incoming' && (
                        <>
                            {incoming.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center f1">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                                            Find Mentors <ArrowRight className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            to="/find-cofounders"
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50"
                                        >
                                            Find Co-Founders <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {incoming.map((req, i) => {
                                        const sender = req.sender || {};
                                        const tBadge = typeBadge(req.type);
                                        return (
                                            <div
                                                key={req.id}
                                                className={`bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 lift f${Math.min(i, 2)}`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                                    {/* Avatar + Info */}
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <Avatar
                                                            name={sender.full_name}
                                                            avatar={sender.avatar_url}
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
                                                                        <MapPin className="w-3 h-3" />{sender.location}
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
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-emerald-600 text-white text-sm font-bold rounded-xl hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            {actionLoading === req.id ? (
                                                                <Loader className="w-4 h-4 animate-spin" />
                                                            ) : (
                                                                <UserCheck className="w-4 h-4" />
                                                            )}
                                                            Accept
                                                        </button>
                                                        <button
                                                            onClick={() => handleDecline(req.id)}
                                                            disabled={actionLoading === req.id}
                                                            className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-600 text-sm font-bold rounded-xl border-2 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                                        >
                                                            <UserX className="w-4 h-4" />
                                                            Decline
                                                        </button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </>
                    )}

                    {/* ══════════════════════════════════════════════════════════
              SENT TAB
          ══════════════════════════════════════════════════════════ */}
                    {!loading && activeTab === 'sent' && (
                        <>
                            {sent.length === 0 ? (
                                <div className="bg-white rounded-2xl border border-slate-100 p-12 text-center f1">
                                    <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
                                            Find Mentors <ArrowRight className="w-4 h-4" />
                                        </Link>
                                        <Link
                                            to="/find-cofounders"
                                            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 border-2 border-slate-200 text-slate-700 rounded-xl text-sm font-bold hover:bg-slate-50"
                                        >
                                            Find Co-Founders <ArrowRight className="w-4 h-4" />
                                        </Link>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-3">
                                    {sent.map((req, i) => {
                                        const receiver = req.receiver || {};
                                        const tBadge = typeBadge(req.type);
                                        const sBadge = statusBadge(req.status);
                                        const SIcon = sBadge.Icon;
                                        const isPending = req.status === 'pending';

                                        return (
                                            <div
                                                key={req.id}
                                                className={`bg-white rounded-2xl border border-slate-100 p-4 sm:p-5 lift f${Math.min(i, 2)}`}
                                            >
                                                <div className="flex flex-col sm:flex-row sm:items-start gap-4">
                                                    {/* Avatar + Info */}
                                                    <div className="flex items-start gap-3 flex-1 min-w-0">
                                                        <Avatar
                                                            name={receiver.full_name}
                                                            avatar={receiver.avatar_url}
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
                                                                    <SIcon className="w-3 h-3" />{sBadge.label}
                                                                </span>
                                                            </div>
                                                            <div className="flex items-center gap-3 text-xs text-slate-500 mb-1">
                                                                <span className="capitalize">{receiver.user_type || 'User'}</span>
                                                                {receiver.location && (
                                                                    <span className="flex items-center gap-0.5">
                                                                        <MapPin className="w-3 h-3" />{receiver.location}
                                                                    </span>
                                                                )}
                                                                <span>Sent {timeAgo(req.created_at)}</span>
                                                            </div>
                                                            {req.message && (
                                                                <p className="text-xs text-slate-500 italic mt-1">"{req.message}"</p>
                                                            )}
                                                        </div>
                                                    </div>

                                                    {/* Withdraw button (only for pending) */}
                                                    {isPending && (
                                                        <button
                                                            onClick={() => handleWithdraw(req.id)}
                                                            disabled={actionLoading === req.id}
                                                            className="flex items-center justify-center gap-1.5 px-4 py-2.5 bg-white text-slate-500 text-xs font-bold rounded-xl border-2 border-slate-200 hover:bg-red-50 hover:border-red-200 hover:text-red-600 transition-all disabled:opacity-50 disabled:cursor-not-allowed flex-shrink-0"
                                                        >
                                                            {actionLoading === req.id ? (
                                                                <Loader className="w-3.5 h-3.5 animate-spin" />
                                                            ) : (
                                                                <XCircle className="w-3.5 h-3.5" />
                                                            )}
                                                            Withdraw
                                                        </button>
                                                    )}
                                                </div>
                                            </div>
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