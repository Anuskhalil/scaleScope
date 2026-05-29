// src/pages/FounderRolePages/FindTeamPage.jsx
// Source: student_profiles WHERE looking_for contains 'Co-Founder' OR 'Startup'
// Founder invites a student to their team â†’ creates connection_request (type: 'team_invite')

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import {
  fetchTeamCandidates,
  fetchFounderProfile,
  sendConnectionRequest,
  getMyConnections,
  getOrCreateConversation,
} from '../../services/founderService';
import {
  Search, Users, MessageSquare, UserPlus, CheckCircle,
  MapPin, Clock, Info, ArrowRight, SlidersHorizontal,
  Loader, AlertTriangle, RefreshCw, Sparkles, X,
  Rocket, Zap, Code, BarChart2, Palette, BookOpen,
} from 'lucide-react';
import toast from 'react-hot-toast';

const CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700;800;900&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap');
  :root{--primary:#98DE38;--primary-dark:#7EC42E;--secondary:#1B2D7F;--secondary-light:#2A3F8F;--gray-50:#F9FAFB;--gray-200:#E5E7EB}
  .ss{font-family:'Syne',sans-serif}.dm{font-family:'DM Sans',sans-serif}
  .lift{transition:transform .22s cubic-bezier(.22,.68,0,1.2),box-shadow .22s ease}
  .lift:hover{transform:translateY(-3px);box-shadow:0 16px 44px rgba(27,45,127,.12)}
  .g-brand{background:linear-gradient(135deg,var(--primary),var(--primary-dark))}
  .g-found{background:linear-gradient(135deg,var(--primary),var(--primary-dark))}
  .g-sec,.g-vi{background:linear-gradient(135deg,var(--secondary),var(--secondary-light))}
  .page-bg{background-color:var(--gray-50);background-image:radial-gradient(circle,rgba(152,222,56,.08) 1px,transparent 1px);background-size:28px 28px}
  .slide-in{animation:si .28s cubic-bezier(.32,.72,0,1) both}
  @keyframes si{from{opacity:0;transform:translateX(24px)}to{opacity:1;transform:none}}
  .f0{animation:fu .32s ease both}.f1{animation:fu .32s .06s ease both}
  .f2{animation:fu .32s .12s ease both}.f3{animation:fu .32s .18s ease both}
  @keyframes fu{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:none}}
  .shimmer{background:linear-gradient(90deg,#f1f5f9 25%,#e2e8f0 50%,#f1f5f9 75%);background-size:200% 100%;animation:sh 1.4s infinite;border-radius:12px}
  @keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}
  .modal-pop{animation:mp .22s cubic-bezier(.34,1.4,.64,1) both}
  @keyframes mp{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  .inp{width:100%;padding:10px 14px;border:1.5px solid #e2e8f0;border-radius:12px;font-size:13px;outline:none;font-family:'DM Sans',sans-serif;transition:border-color .14s;background:#fff}
  .inp:focus{border-color:#98DE38}
  .lf-badge{display:inline-flex;align-items:center;gap:3px;padding:3px 9px;border-radius:999px;font-size:11px;font-weight:600}
  .tooltip-wrap{position:relative}
  .tooltip-wrap:hover .tooltip-box,.tooltip-wrap:focus-within .tooltip-box{opacity:1;visibility:visible;transform:translateX(-50%) translateY(0)}
  .tooltip-box{position:absolute;bottom:calc(100% + 8px);left:50%;z-index:20;width:260px;padding:10px 12px;border-radius:10px;background:#1B2D7F;color:#fff;font-size:12px;opacity:0;visibility:hidden;transform:translateX(-50%) translateY(4px);transition:all .15s ease;box-shadow:0 8px 24px rgba(0,0,0,.2)}
`;

const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function getCachedUrl(path) {
  if (!path || path.startsWith('http')) return path || null;

  const cleanPath = path.replace(/^avatars\//, '').replace(/^\/+/, '');
  const key = `team-av:${cleanPath}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) {
    return cached.url;
  }

  try {
    const { data, error } = await supabase.storage
      .from('avatars')
      .createSignedUrl(cleanPath, 3600);

    if (error) {
      console.warn('Team avatar signed URL error:', error.message);
      return null;
    }

    if (data?.signedUrl) {
      AVATAR_CACHE.set(key, { url: data.signedUrl, ts: Date.now() });
      return data.signedUrl;
    }
  } catch (err) {
    console.warn('Team avatar load failed:', err);
  }

  return null;
}

const ROLE_FILTERS = [
  { val: 'Co-Founder', icon: <Rocket className="w-3 h-3" />, col: 'from-amber-500 to-orange-500' },
  { val: 'Startup', icon: <Zap className="w-3 h-3" />, col: 'from-indigo-500 to-violet-500' },
  { val: 'Developer', icon: <Code className="w-3 h-3" />, col: 'from-blue-500 to-indigo-500' },
  { val: 'Marketer', icon: <BarChart2 className="w-3 h-3" />, col: 'from-green-500 to-emerald-500' },
  { val: 'Designer', icon: <Palette className="w-3 h-3" />, col: 'from-rose-500 to-pink-500' },
];
function initials(name) {
  if (!name) return '?';
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
}
function gradFor(uid) {
  const g = ['from-amber-500 to-orange-500', 'from-violet-500 to-indigo-500',
    'from-emerald-500 to-teal-500', 'from-rose-500 to-pink-500',
    'from-blue-500 to-indigo-500', 'from-cyan-500 to-teal-500'];
  return g[((uid || '').charCodeAt?.(0) || 0) % g.length];
}

function Avatar({ name, path, userId }) {
  const [url, setUrl] = useState(null);
  const [loading, setLoading] = useState(Boolean(path));

  useEffect(() => {
    let cancelled = false;

    if (!path) {
      setUrl(null);
      setLoading(false);
      return () => {
        cancelled = true;
      };
    }

    setLoading(true);

    getCachedUrl(path).then((signedUrl) => {
      if (!cancelled) {
        setUrl(signedUrl);
        setLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [path]);

  if (loading) {
    return <div className="w-14 h-14 rounded-xl shimmer flex-shrink-0" aria-hidden="true" />;
  }

  if (url) {
    return (
      <img
        src={url}
        alt=""
        className="w-14 h-14 rounded-xl object-cover flex-shrink-0"
        loading="lazy"
        onError={() => setUrl(null)}
      />
    );
  }

  return (
    <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${gradFor(userId)} flex items-center justify-center text-white font-bold ss flex-shrink-0`}>
      {initials(name)}
    </div>
  );
}
function lfBadge(val) {
  const map = {
    'Co-Founder': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
    'Startup': 'bg-indigo-50 text-indigo-700 border border-indigo-200',
  };
  return map[val] || 'bg-slate-50 text-slate-600 border border-slate-200';
}

// â”€â”€ Candidate Card â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
function CandidateCard({ candidate, onInvite, onMessage, inviteState }) {
  const skills = candidate.skills || [];
  const lf = candidate.looking_for || [];
  const ideaContext = candidate.startup_idea_description || candidate.idea_title || candidate.company_name;
  const isAccepted = inviteState === 'accepted';
  const isPending = inviteState === 'pending' || inviteState === 'sent';
  const isSending = inviteState === 'sending';

  return (
    <article className="bg-white rounded-2xl p-5 border border-slate-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-found" aria-hidden="true" />
        <Avatar name={candidate.name} path={candidate.avatar} userId={candidate.user_id} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900 ss leading-tight">{candidate.name || 'Unnamed'}</p>
              <p className="text-xs text-slate-500 mt-0.5">
                {candidate.candidate_type === 'founder' ? 'Early-stage founder collaborator' : 'Student team candidate'}
                {candidate.idea_domain || candidate.industry ? ` Â· ${candidate.idea_domain || candidate.industry}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <span className="text-xs font-black px-2.5 py-3 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                {candidate.matchScore || 20}% Match
              </span>
              <span className="text-xs font-bold px-2.5 py-3 rounded-full bg-indigo-50 text-indigo-700">
                {candidate.candidate_type === 'founder' ? 'Founder' : 'Student'}
              </span>
            </div>
          </div>

          <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
            {candidate.location && <p className="text-xs text-slate-400 flex items-center gap-1"><MapPin className="w-3" />{candidate.location}</p>}
            {candidate.commitment && <p className="text-xs text-slate-400 flex items-center gap-1"><Clock className="w-3" />{candidate.commitment}</p>}
          </div>

          {candidate.bio && <p className="text-sm text-slate-600 mt-2 line-clamp-2">{candidate.bio}</p>}

          {ideaContext && (
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl mt-3">
              <p className="text-xs font-bold text-indigo-600 flex items-center gap-1 mb-1">
                <BookOpen className="w-3" /> Team / Idea Context
              </p>
              <p className="text-sm text-slate-700 line-clamp-2">{ideaContext}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-3">
            {lf.slice(0, 2).map((value) => <span key={value} className={`lf-badge ${lfBadge(value)}`}>{value}</span>)}
            {skills.slice(0, 4).map((skill) => <span key={skill} className="text-xs px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">{skill}</span>)}
          </div>

          {(candidate.interests || []).length > 0 && (
            <p className="text-xs text-slate-500 mt-2">Interests: {candidate.interests.slice(0, 3).join(', ')}</p>
          )}

          <div className="tooltip-wrap mt-3 inline-block">
            <button type="button" className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
              <Info className="w-3" /> Why this match?
            </button>
            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Reasons:</p>
              <ul className="list-disc list-inside space-y-1">
                {(candidate.reasons || ['Available profile data shows a possible team fit']).map((reason) => <li key={reason}>{reason}</li>)}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <Link to={`/user-profile/${candidate.user_id}`} className="py-2 border-2 border-indigo-100 bg-indigo-50 text-indigo-700 rounded-xl text-xs font-bold flex items-center justify-center hover:bg-indigo-100">
              View Profile
            </Link>
            <button
              type="button"
              onClick={() => {
                if (isAccepted) onMessage();
              }}
              disabled={!isAccepted}
              title={isAccepted ? 'Message this connection' : 'Connect first to send messages'}
              className={`py-2 border-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 transition ${
                isAccepted
                  ? 'border-slate-200 text-slate-700 hover:border-[#98DE38] hover:text-[#1B2D7F] bg-white'
                  : 'border-slate-100 bg-slate-50 text-slate-400 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-3.5" /> {isAccepted ? 'Message' : 'Connect first'}
            </button>
            <button
              type="button"
              onClick={onInvite}
              disabled={isAccepted || isPending || isSending}
              className={`py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1 ${
                isAccepted
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : isPending
                    ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                    : isSending
                      ? 'g-found text-black opacity-70'
                    : 'g-brand text-black hover:opacity-90'
              }`}
            >
              {isAccepted ? (
                <><CheckCircle className="w-3.5" />Connected</>
              ) : isPending ? (
                <><Clock className="w-3.5" />Pending</>
              ) : isSending ? (
                <><Loader className="w-3.5 animate-spin" />Sending</>
              ) : (
                <><UserPlus className="w-3.5" />Connect</>
              )}
            </button>
          </div>
        </div>
      </div>
    </article>
  );
}

// â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•â•
export default function FindTeamPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [candidates, setCandidates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [commFilter, setCommFilter] = useState('');
  const [skillFilter, setSkillFilter] = useState('');
  const [matchBand, setMatchBand] = useState('all');
  const [invStates, setInvStates] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});
  const [founderProfile, setFounderProfile] = useState({});

  const load = useCallback(async (role = roleFilter) => {
    if (!user?.id) return;
    setLoading(true); setError('');
    try {
      const founderData = founderProfile.user_id
        ? founderProfile
        : (await fetchFounderProfile(user?.id)).founderProfile || {};

      if (!founderProfile.user_id) setFounderProfile(founderData);

      const [data, connectionsRes] = await Promise.all([
        fetchTeamCandidates({
          role,
          excludeUserId: user?.id,
          founderProfile: founderData,
          limit: 30,
        }),
        getMyConnections(),
      ]);

      const statusMap = {};

      (connectionsRes?.data || []).forEach((connection) => {
        if (connection.otherUser?.id) {
          statusMap[connection.otherUser.id] = 'accepted';
        }
      });

      setConnStatusMap(statusMap);
      setCandidates(data);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [roleFilter, user?.id, founderProfile]);

  useEffect(() => { load(); }, [load]);

  const handleInvite = async (candidate) => {
    const targetUserId = candidate.user_id;
    if (!targetUserId || invStates[targetUserId] || connStatusMap[targetUserId] === 'accepted') return;

    setInvStates(p => ({ ...p, [targetUserId]: 'sending' }));

    try {
      const response = await sendConnectionRequest(
        user.id,
        targetUserId,
        'team_invite',
        `Hi ${candidate.name || 'there'}, your profile looks relevant to my startup team needs. I would like to connect and explore collaboration.`
      );

      if (response.alreadyConnected || response.status === 'accepted') {
        setConnStatusMap((prev) => ({ ...prev, [targetUserId]: 'accepted' }));
        setInvStates((prev) => ({ ...prev, [targetUserId]: 'accepted' }));
        toast.success('Already connected');
        return;
      }

      setInvStates(p => ({ ...p, [targetUserId]: 'pending' }));
      toast.success(response.alreadyPending ? 'Team invite already pending' : 'Team invite sent', {
        style: { background: '#98DE38', color: '#000' },
      });
    } catch (e) {
      setInvStates(p => ({ ...p, [targetUserId]: null }));
      toast.error(e.message || 'Could not send team invite');
    }
  };

  const handleMessage = async (candidate) => {
    const targetUserId = candidate.user_id;

    if (!targetUserId) {
      toast.error('User ID missing');
      return;
    }

    if (connStatusMap[targetUserId] !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    try {
      const convId = await getOrCreateConversation(user.id, targetUserId);
      navigate(convId ? `/messages?conv=${convId}` : '/messages');
    } catch (err) {
      console.error('Open team message failed:', err);
      toast.error('Could not open conversation');
    }
  };

  const commitmentOptions = useMemo(() => {
    return ['', ...new Set(candidates.map((candidate) => candidate.commitment).filter(Boolean))];
  }, [candidates]);

  const skillOptions = useMemo(() => {
    return ['', ...new Set(candidates.flatMap((candidate) => candidate.skills || []).filter(Boolean))].slice(0, 13);
  }, [candidates]);

  const shown = candidates.filter(c => {
    if (search) {
      const q = search.toLowerCase();
      if (!(c.name || '').toLowerCase().includes(q) &&
        !(c.bio || '').toLowerCase().includes(q) &&
        !(c.skills || []).some(s => s.toLowerCase().includes(q))) return false;
    }
    if (commFilter && c.commitment !== commFilter) return false;
    if (skillFilter) {
      if (!(c.skills || []).some(s => s.toLowerCase().includes(skillFilter.toLowerCase()))) return false;
    }
    if (matchBand === '60plus' && Number(c.matchScore || 0) < 60) return false;
    if (matchBand === 'below60' && Number(c.matchScore || 0) >= 60) return false;
    return true;
  });

  const strongCount = candidates.filter((candidate) => Number(candidate.matchScore || 0) >= 60).length;
  const exploreCount = candidates.length - strongCount;

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('');
    setCommFilter('');
    setSkillFilter('');
    setMatchBand('all');
    load('');
  };

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg dm">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-24">

          {/* Header */}
          <div className="mb-8 f0">
            <div className="inline-flex items-center gap-2 text-xs font-bold uppercase text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-full mb-3">
              <UserPlus className="w-3.5 h-3.5" /> Find Team
            </div>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4">
              <div>
                <h1 className="ss font-black text-4xl text-slate-900 mb-2">Build Your Core Team</h1>
                <p className="text-slate-600 text-sm max-w-xl">
                  Students and early-stage founders matched to your skill gaps, hiring roles, startup focus, and commitment.
                </p>
              </div>
              <Link to="/founder/profile" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50">
                Improve Matching <ArrowRight className="w-4" />
              </Link>
            </div>
          </div>

          <section className="grid sm:grid-cols-3 gap-3 mb-6 f1">
            <div className="bg-white rounded-2xl p-4 border border-slate-100"><p className="text-xs text-slate-500">Available team matches</p><p className="text-2xl font-black text-slate-900">{candidates.length}</p></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100"><p className="text-xs text-slate-500">Explore matches below 60%</p><p className="text-2xl font-black text-slate-900">{exploreCount}</p></div>
            <div className="bg-white rounded-2xl p-4 border border-slate-100"><p className="text-xs text-slate-500">Strong matches 60%+</p><p className="text-2xl font-black text-slate-900">{strongCount}</p></div>
          </section>

          <section className="bg-white border border-slate-200 rounded-2xl p-4 mb-6 f1">
            <div className="flex items-center gap-2">
              <Search className="w-5 text-slate-400" />
              <input className="flex-1 outline-none text-sm" placeholder="Search by name, skill, bio, or idea..." value={search} onChange={e => setSearch(e.target.value)} />
              {search && <button type="button" onClick={() => setSearch('')} className="p-1 hover:bg-slate-100 rounded"><X className="w-4 text-slate-400" /></button>}
            </div>
            <div className="grid md:grid-cols-5 gap-3 mt-4">
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Match band</label><select value={matchBand} onChange={e => setMatchBand(e.target.value)} className="inp"><option value="all">All matches</option><option value="60plus">60%+</option><option value="below60">Below 60%</option></select></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Role</label><select value={roleFilter} onChange={e => { setRoleFilter(e.target.value); load(e.target.value); }} className="inp"><option value="">All candidates</option>{ROLE_FILTERS.map(role => <option key={role.val} value={role.val}>{role.val}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Skill</label><select value={skillFilter} onChange={e => setSkillFilter(e.target.value)} className="inp">{skillOptions.map(skill => <option key={skill || 'all'} value={skill}>{skill || 'All'}</option>)}</select></div>
              <div><label className="text-xs font-bold text-slate-500 mb-1 block">Availability</label><select value={commFilter} onChange={e => setCommFilter(e.target.value)} className="inp">{commitmentOptions.map(item => <option key={item || 'all'} value={item}>{item || 'All'}</option>)}</select></div>
              <div className="flex items-end gap-2"><button onClick={resetFilters} className="w-full py-2 rounded-xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2"><SlidersHorizontal className="w-4" />Reset</button><button onClick={() => load(roleFilter)} className="p-2.5 border border-slate-200 rounded-xl text-slate-500 hover:text-[#1B2D7F]"><RefreshCw className="w-4" /></button></div>
            </div>
          </section>

          <div className="f2">
              {/* Search + count */}
              <div className="hidden">
                <div className="flex-1 relative">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input className="inp pl-10" placeholder="Search by name, skill, or keywordâ€¦"
                    value={search} onChange={e => setSearch(e.target.value)} />
                </div>
                  <button onClick={() => load(roleFilter)}
                  className="p-2.5 bg-white border border-slate-200 rounded-xl text-slate-500 hover:text-[#1B2D7F] hover:border-[#98DE38] transition-all">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {/* Count */}
              {!loading && (
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
                  <p className="text-sm text-slate-500">Showing <span className="font-bold text-slate-900">{shown.length}</span> results</p>
                  <p className="text-xs text-slate-400">Message unlocks after accepted connection.</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 bg-red-50 border border-red-200 rounded-2xl px-5 py-4 mb-5">
                  <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />
                  <p className="text-sm text-red-700 flex-1">{error}</p>
                  <button onClick={() => load(roleFilter)} className="text-red-500 hover:text-red-700">
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>
              )}

              {loading ? (
                <div className="grid lg:grid-cols-2 gap-4">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
                      <div className="flex gap-3"><div className="shimmer w-11 h-11 flex-shrink-0" /><div className="flex-1 space-y-2"><div className="shimmer h-4 w-28" /><div className="shimmer h-3 w-20" /></div></div>
                      <div className="shimmer h-3 w-full" />
                      <div className="shimmer h-3 w-4/5" />
                      <div className="flex gap-2"><div className="shimmer h-8 flex-1" /><div className="shimmer h-8 flex-1" /></div>
                    </div>
                  ))}
                </div>
              ) : shown.length === 0 ? (
                <div className="py-20 text-center">
                  <div className="w-16 h-16 bg-green-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
                    <Users className="w-8 h-8 text-[#1B2D7F]" />
                  </div>
                  <h3 className="ss font-bold text-slate-900 text-xl mb-2">No candidates found</h3>
                  <p className="text-slate-500 text-sm mb-4">
                    {(roleFilter || commFilter || skillFilter || search || matchBand !== 'all')
                      ? 'Try different filters'
                      : 'Students who select "Co-Founder" or "Startup" on their profile appear here.'}
                  </p>
                  {(roleFilter || commFilter || skillFilter || search || matchBand !== 'all') && (
                    <button onClick={resetFilters}
                      className="text-sm font-semibold text-indigo-600 hover:underline">
                      Clear all filters
                    </button>
                  )}
                </div>
              ) : (
                <div className="grid lg:grid-cols-2 gap-4">
                  {shown.map((c, i) => (
                    <div key={c.id || i} className={`slide-in`} style={{ animationDelay: `${Math.min(i, 8) * 0.05}s` }}>
                      <CandidateCard
                        candidate={c}
                        onInvite={() => handleInvite(c)}
                        onMessage={() => handleMessage(c)}
                        inviteState={connStatusMap[c.user_id] || invStates[c.user_id]} />
                    </div>
                  ))}
                </div>
              )}
            </div>
        </div>
      </div>

    </>
  );
}
