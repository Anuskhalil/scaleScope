// src/pages/MentorRolePages/FindFoundersPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchFoundersForMentor,
  fetchStudentsWithIdeas,
  fetchMentorProfile,
  rankFoundersForMentor,
  rankStudentsForMentor,
  sendConnectionRequest,
  getOrCreateConversation,
} from '../../services/mentorService';
import { backendApi } from '../../lib/backendApi';
import {
  Search,
  Users,
  UserPlus,
  MessageSquare,
  MapPin,
  X,
  Loader,
  CheckCircle,
  Clock,
  Info,
  ArrowRight,
  Award,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  GraduationCap,
  BookOpen,
  Target,
  Rocket,
  Building2,
  Send,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  }

  .lift:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 32px rgba(27,45,127,.12);
  }

  .shimmer {
    background: linear-gradient(90deg, var(--gray-200) 25%, #ddd 50%, var(--gray-200) 75%);
    background-size: 200% 100%;
    animation: s 1.5s infinite;
    border-radius: 12px;
  }

  @keyframes s {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  button:focus-visible,
  a:focus-visible,
  input:focus-visible,
  select:focus-visible,
  textarea:focus-visible {
    outline: 2px solid var(--primary);
    outline-offset: 2px;
  }

  .tooltip-wrap {
    position: relative;
  }

  .tooltip-wrap:focus-within .tooltip-box,
  .tooltip-wrap:hover .tooltip-box {
    opacity: 1;
    visibility: visible;
    transform: translateX(-50%) translateY(0);
  }

  .tooltip-box {
    opacity: 0;
    visibility: hidden;
    transform: translateX(-50%) translateY(4px);
    transition: all .15s ease;
    position: absolute;
    bottom: calc(100% + 8px);
    left: 50%;
    background: var(--secondary);
    color: var(--white);
    font-size: 12px;
    padding: 10px 12px;
    border-radius: 10px;
    z-index: 100;
    box-shadow: 0 8px 24px rgba(0,0,0,.2);
    width: 260px;
    white-space: normal;
  }

  .tooltip-box::after {
    content: '';
    position: absolute;
    top: 100%;
    left: 50%;
    margin-left: -5px;
    border: 5px solid transparent;
    border-top-color: var(--secondary);
  }
`;

const INDUSTRIES = ['EdTech', 'HealthTech', 'FinTech', 'SaaS', 'AgriTech', 'CleanTech', 'LegalTech', 'HRTech', 'AI / ML', 'Social Impact'];
const STAGES = ['Just an Idea', 'Researching', 'Building MVP', 'MVP Built', 'Growing'];
const HELP_AREAS = ['Fundraising', 'Marketing', 'Technical', 'Product', 'Legal', 'Finance', 'Design', 'Sales'];

const initials = (name) => {
  if (!name) return '?';
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
};

const getScore = (item) => Number(item?._score || item?.matchScore || item?.score || 0);

const profileOf = (item) => item?.profiles || item?.profile || {};

function Avatar({ name }) {
  return (
    <div className="w-14 h-14 rounded-xl g-sec flex items-center justify-center text-white font-bold flex-shrink-0">
      {initials(name)}
    </div>
  );
}

function MatchCard({ item, type, offerState, connectionStatus, onOffer, onMessage }) {
  const p = profileOf(item);
  const score = getScore(item);
  const isFounder = type === 'founder';
  const title = isFounder
    ? item.company_name || item.idea_title || 'Startup'
    : item.idea_title || 'Student startup idea';
  const stage = item.startup_stage || item.company_stage || item.commitment_level || '';
  const summary = item.problem_solving || item.problem_statement || item.startup_idea_description || p.bio || '';
  const helpNeeded = item.help_needed || [];
  const reason = item._matchReason || 'Profile alignment based on available data';
  const targetId = item.user_id || p.id;

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-brand" aria-hidden="true" />

        <Avatar name={p.full_name} />

        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="font-bold text-gray-900 truncate">{p.full_name || 'Founder'}</p>
              <p className="text-xs text-gray-500">
                {title}
                {item.industry ? ` · ${item.industry}` : ''}
                {stage ? ` · ${stage}` : ''}
              </p>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">
                {score}% Match
              </span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1B2D7F]/5 text-[#1B2D7F]">
                {isFounder ? 'Founder' : 'Student'}
              </span>
            </div>
          </div>

          {p.location && (
            <p className="text-xs text-gray-400 flex items-center gap-1 mt-1">
              <MapPin className="w-3" />
              {p.location}
            </p>
          )}

          {summary && (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl mt-3">
              <p className="text-xs font-bold text-[#1B2D7F] flex items-center gap-1 mb-1">
                {isFounder ? <Building2 className="w-3" /> : <BookOpen className="w-3" />}
                {isFounder ? 'Startup Context' : 'Idea Context'}
              </p>
              <p className="text-sm text-gray-700 line-clamp-2">{summary}</p>
            </div>
          )}

          {helpNeeded.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-3">
              {helpNeeded.slice(0, 5).map((help) => (
                <span key={help} className="text-xs px-2 py-0.5 rounded-full bg-[#98DE38]/10 text-[#1B2D7F] border border-[#98DE38]/30">
                  {help}
                </span>
              ))}
            </div>
          )}

          <div className="tooltip-wrap mt-3 inline-block">
            <button type="button" className="text-xs text-[#1B2D7F] hover:underline flex items-center gap-1" aria-label="Why recommended?">
              <Info className="w-3" />
              Why this match?
            </button>
            <div className="tooltip-box">
              <p className="font-semibold mb-1">Match Reason:</p>
              <p>{reason}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <Link
              to={`/user-profile/${targetId}`}
              className="py-2 border-2 border-[#1B2D7F]/10 bg-[#1B2D7F]/5 text-[#1B2D7F] rounded-xl text-xs font-bold hover:bg-[#1B2D7F]/10 transition flex items-center justify-center"
            >
              View Profile
            </Link>

            <button
              type="button"
              onClick={onMessage}
              disabled={connectionStatus !== 'accepted'}
              title={connectionStatus === 'accepted' ? 'Message this connection' : 'Connect first to send messages'}
              className={`py-2 border-2 rounded-xl text-xs font-bold transition flex items-center justify-center ${
                connectionStatus === 'accepted'
                  ? 'border-gray-200 hover:border-gray-300 text-gray-800 bg-white'
                  : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed'
              }`}
            >
              <MessageSquare className="w-3.5 mr-1" />
              {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
            </button>

            {offerState === 'sent' ? (
              <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center">
                <CheckCircle className="w-3.5 mr-1" />
                Offered
              </button>
            ) : offerState === 'pending' ? (
              <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center">
                <Clock className="w-3.5 mr-1" />
                Pending
              </button>
            ) : offerState === 'accepted' ? (
              <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center">
                <CheckCircle className="w-3.5 mr-1" />
                Connected
              </button>
            ) : offerState === 'sending' ? (
              <button type="button" disabled className="py-2 g-brand text-black rounded-xl text-xs font-black flex items-center justify-center opacity-70">
                <Loader className="w-3.5 animate-spin mr-1" />
                Sending...
              </button>
            ) : (
              <button type="button" onClick={onOffer} className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center">
                <UserPlus className="w-3.5 mr-1" />
                Connect
              </button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FindFoundersPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({ founders: [], students: [] });
  const [filters, setFilters] = useState({
    type: 'founders',
    query: '',
    matchBand: 'all',
    industry: '',
    stage: '',
    helpArea: '',
  });
  const [offerStates, setOfferStates] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});
  const [msgModal, setMsgModal] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;

    setState({ loading: true, error: null });

    try {
      const [{ mentorProfile }, founderRows, studentRows] = await Promise.all([
        fetchMentorProfile(user.id),
        fetchFoundersForMentor({ limit: 80 }),
        fetchStudentsWithIdeas({ limit: 80 }),
      ]);

      setData({
        founders: rankFoundersForMentor(founderRows, mentorProfile),
        students: rankStudentsForMentor(studentRows, mentorProfile),
      });

      const myConnections = await backendApi.getMyConnections().catch((err) => {
        console.warn('Mentor founder connection status load failed:', err);
        return { data: [] };
      });
      const statusMap = {};
      (myConnections?.data || []).forEach((connection) => {
        if (connection.otherUser?.id) statusMap[connection.otherUser.id] = 'accepted';
      });
      setConnStatusMap(statusMap);

      setState({ loading: false, error: null });
    } catch (err) {
      console.error('Find founders load failed:', err);
      setState({ loading: false, error: err.message || 'Failed to load founders' });
      toast.error('Failed to load founders');
    }
  }, [user?.id]);

  useEffect(() => {
    load();
  }, [load]);

  const allItems = useMemo(() => [...data.founders, ...data.students], [data.founders, data.students]);

  const filtered = useMemo(() => {
    const source = filters.type === 'founders' ? data.founders : data.students;

    return source
      .filter((item) => {
        const p = profileOf(item);
        const score = getScore(item);
        const searchText = [
          p.full_name,
          p.bio,
          p.location,
          item.company_name,
          item.idea_title,
          item.industry,
          item.startup_stage,
          item.company_stage,
          item.problem_solving,
          item.problem_statement,
          item.startup_idea_description,
          item.commitment_level,
          (item.help_needed || []).join(' '),
          (item.interests || []).join(' '),
        ].filter(Boolean).join(' ').toLowerCase();

        const matchQuery = !filters.query || searchText.includes(filters.query.toLowerCase());
        const matchIndustry = !filters.industry || item.industry === filters.industry;
        const matchStage = !filters.stage || item.startup_stage === filters.stage || item.company_stage === filters.stage;
        const matchHelp = !filters.helpArea || (item.help_needed || []).some((help) => help.toLowerCase().includes(filters.helpArea.toLowerCase()));
        const matchBand = filters.matchBand === 'all'
          || (filters.matchBand === '60plus' && score >= 60)
          || (filters.matchBand === 'below60' && score < 60);

        return matchQuery && matchIndustry && matchStage && matchHelp && matchBand;
      })
      .sort((a, b) => getScore(b) - getScore(a));
  }, [data.founders, data.students, filters]);

  const handleOffer = async (targetId) => {
    if (!targetId || offerStates[targetId]) return;

    setOfferStates((prev) => ({ ...prev, [targetId]: 'sending' }));

    try {
      await sendConnectionRequest(
        user.id,
        targetId,
        'mentor_offer',
        'Hi, I reviewed your profile and would be happy to help where my experience fits.'
      );

      setOfferStates((prev) => ({ ...prev, [targetId]: 'sent' }));
      setConnStatusMap((prev) => ({ ...prev, [targetId]: prev[targetId] || 'pending' }));
      toast.success('Mentor offer sent', {
        style: {
          background: '#98DE38',
          color: '#000',
        },
      });
    } catch (err) {
      console.error('Mentor offer failed:', err);
      setOfferStates((prev) => ({ ...prev, [targetId]: undefined }));
      toast.error(err.message || 'Could not send offer');
    }
  };

  const openMessageModal = (item) => {
    if (connStatusMap[item.user_id] !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    const p = profileOf(item);
    const name = p.full_name?.split(' ')[0] || 'there';
    setMsgModal({ ...item, _name: name });
    setMsgText(`Hi ${name}, I reviewed your profile and think my mentorship experience could help with your next startup step. Would you be open to connecting?`);
  };

  const handleSendMessage = async () => {
    if (!msgModal || !msgText.trim() || sending) return;

    setSending(true);

    try {
      const convId = await getOrCreateConversation(user.id, msgModal.user_id);
      if (convId) await backendApi.sendConversationMessage(convId, msgText.trim());
      setMsgModal(null);
      setMsgText('');
      toast.success('Message sent', {
        style: {
          background: '#98DE38',
          color: '#000',
        },
      });
      navigate(convId ? `/mentor/messages?conv=${convId}` : '/mentor/messages');
    } catch (err) {
      console.error('Message offer failed:', err);
      toast.error(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const resetFilters = () => {
    setFilters({
      type: 'founders',
      query: '',
      matchBand: 'all',
      industry: '',
      stage: '',
      helpArea: '',
    });
  };

  const totalMatches = allItems.length;
  const below60Count = allItems.filter((item) => getScore(item) < 60).length;
  const strongCount = allItems.filter((item) => getScore(item) >= 60).length;

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border border-gray-100 p-6 text-center max-w-md">
          <p className="font-bold text-[#1B2D7F] mb-2">Could not load founders</p>
          <p className="text-sm text-gray-500 mb-4">{state.error}</p>
          <button type="button" onClick={load} className="px-4 py-2 g-brand text-black rounded-xl text-sm font-bold">
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <style>{CSS}</style>

      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-[#98DE38]/15 text-[#1B2D7F] border border-[#98DE38]/40">
              <Users className="w-3.5" />
              Find Founders
            </span>

            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Startup Guidance</h1>
                <p className="text-gray-500 text-sm max-w-xl mt-2">
                  Discover founders and students who need guidance. Match quality is based on your expertise, help areas, and startup context.
                </p>
              </div>

              <Link
                to="/mentor/profile"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50"
              >
                Improve Matching
                <ArrowRight className="w-4" />
              </Link>
            </div>
          </header>

          <section className="grid sm:grid-cols-3 gap-3 mb-6">
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Available founder matches</p>
              <p className="text-2xl font-black text-gray-900">{totalMatches}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Explore matches below 60%</p>
              <p className="text-2xl font-black text-gray-900">{below60Count}</p>
            </div>
            <div className="bg-white rounded-2xl p-4 border border-gray-100">
              <p className="text-xs text-gray-500">Strong matches 60%+</p>
              <p className="text-2xl font-black text-gray-900">{strongCount}</p>
            </div>
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 text-gray-400" />
              <input
                type="text"
                value={filters.query}
                onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))}
                placeholder="Search by name, industry, idea, or help needed..."
                className="flex-1 outline-none text-sm"
                aria-label="Search founders"
              />
              {filters.query && (
                <button type="button" onClick={() => setFilters((prev) => ({ ...prev, query: '' }))} className="p-1 hover:bg-gray-100 rounded" aria-label="Clear search">
                  <X className="w-4 text-gray-400" />
                </button>
              )}
            </div>

            <div className="grid md:grid-cols-6 gap-3 mt-4">
              <SelectFilter label="Type" value={filters.type} onChange={(value) => setFilters((prev) => ({ ...prev, type: value }))}>
                <option value="founders">Startups & Founders</option>
                <option value="students">Students with Ideas</option>
              </SelectFilter>

              <SelectFilter label="Match band" value={filters.matchBand} onChange={(value) => setFilters((prev) => ({ ...prev, matchBand: value }))}>
                <option value="all">All matches</option>
                <option value="60plus">60%+</option>
                <option value="below60">Below 60%</option>
              </SelectFilter>

              <SelectFilter label="Industry" value={filters.industry} onChange={(value) => setFilters((prev) => ({ ...prev, industry: value }))}>
                <option value="">All</option>
                {INDUSTRIES.map((industry) => <option key={industry} value={industry}>{industry}</option>)}
              </SelectFilter>

              <SelectFilter label="Stage" value={filters.stage} onChange={(value) => setFilters((prev) => ({ ...prev, stage: value }))}>
                <option value="">All</option>
                {STAGES.map((stage) => <option key={stage} value={stage}>{stage}</option>)}
              </SelectFilter>

              <SelectFilter label="Help Area" value={filters.helpArea} onChange={(value) => setFilters((prev) => ({ ...prev, helpArea: value }))}>
                <option value="">All</option>
                {HELP_AREAS.map((area) => <option key={area} value={area}>{area}</option>)}
              </SelectFilter>

              <div className="flex items-end">
                <button type="button" onClick={resetFilters} className="w-full py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2">
                  <SlidersHorizontal className="w-4" />
                  Reset
                </button>
              </div>
            </div>
          </section>

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <p className="text-sm text-gray-500">
              Showing <span className="font-bold text-gray-900">{filtered.length}</span> results
            </p>
            <p className="text-xs text-gray-400">Message unlocks after accepted connection.</p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4" aria-live="polite">
              {filtered.map((item) => {
                const targetId = item.user_id || profileOf(item).id;
                return (
                  <MatchCard
                    key={`${filters.type}-${targetId || item.id}`}
                    item={item}
                    type={filters.type === 'founders' ? 'founder' : 'student'}
                    offerState={offerStates[targetId] || connStatusMap[targetId]}
                    connectionStatus={connStatusMap[targetId]}
                    onOffer={() => handleOffer(targetId)}
                    onMessage={() => openMessageModal(item)}
                  />
                );
              })}
            </div>
          ) : (
            <div className="py-14 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
              <div className="w-14 h-14 rounded-full bg-gray-50 mx-auto mb-4 flex items-center justify-center">
                <Sparkles className="w-6 text-gray-400" />
              </div>
              <p className="font-bold text-gray-800">No founder matches found.</p>
              <p className="text-sm text-gray-500 mt-1">Try changing filters or improve your mentor profile for better matching.</p>
              <button type="button" onClick={resetFilters} className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black">
                Clear filters
              </button>
            </div>
          )}

          <aside className="mt-8 bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2">
              <ShieldCheck className="w-4 text-[#1B2D7F]" />
              Matching tip
            </h3>
            <p className="text-sm text-gray-600">
              Add expertise areas, can-help-with fields, companies, and mentorship style to get better founder matches.
            </p>
            <Link to="/mentor/profile" className="inline-flex items-center gap-1 text-xs font-bold text-[#1B2D7F] mt-3 hover:underline">
              Edit Profile <ArrowRight className="w-3" />
            </Link>
          </aside>
        </div>
      </div>

      {msgModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl text-gray-900">Connect with {msgModal._name}</h3>
              <button type="button" onClick={() => setMsgModal(null)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400" aria-label="Close message modal">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-gray-400 mb-3">A personalized message helps founders understand how you can support them.</p>
            <textarea
              className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm outline-none resize-none focus:border-[#98DE38] transition-colors"
              rows={6}
              value={msgText}
              onChange={(event) => setMsgText(event.target.value)}
              maxLength={500}
            />
            <p className="text-xs text-gray-400 text-right mt-1 mb-4">{msgText.length}/500</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setMsgModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200">
                Cancel
              </button>
              <button type="button" onClick={handleSendMessage} disabled={!msgText.trim() || sending} className="flex-1 py-3 g-brand text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">
                {sending ? <Loader className="w-4 h-4 animate-spin" /> : <><Send className="w-4" />Send & Offer</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SelectFilter({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm"
      >
        {children}
      </select>
    </div>
  );
}
