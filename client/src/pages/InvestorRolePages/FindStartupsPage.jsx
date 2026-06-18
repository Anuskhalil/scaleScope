// src/pages/InvestorRolePages/FindStartupsPage.jsx
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchStartupsForInvestor,
  fetchInvestorProfile,
  rankStartupsForInvestor,
  sendConnectionRequest,
  getOrCreateConversation,
} from '../../services/investorService';
import { backendApi } from '../../lib/backendApi';
import IntelligentMatchPanel from '../../components/IntelligentMatchPanel';
import {
  DISCOVERY_INDUSTRIES,
  DISCOVERY_LOCATIONS,
  STARTUP_STAGE_OPTIONS,
  mergeFilterOptions,
} from '../../constants/discoveryFilters';
import {
  Search,
  Rocket,
  MessageSquare,
  MapPin,
  X,
  Loader,
  CheckCircle,
  Info,
  ArrowRight,
  SlidersHorizontal,
  Sparkles,
  ShieldCheck,
  BookOpen,
  Building2,
  Send,
  DollarSign,
  FileText,
  Globe,
  UserPlus,
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
  .page-bg { background: var(--gray-50); background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px); background-size: 28px 28px; }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
  .shimmer { background: linear-gradient(90deg, var(--gray-200) 25%, #ddd 50%, var(--gray-200) 75%); background-size: 200% 100%; animation: s 1.5s infinite; border-radius: 12px; }
  @keyframes s { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  button:focus-visible, a:focus-visible, input:focus-visible, select:focus-visible, textarea:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
  .tooltip-wrap { position: relative; }
  .tooltip-wrap:focus-within .tooltip-box, .tooltip-wrap:hover .tooltip-box { opacity: 1; visibility: visible; transform: translateX(-50%) translateY(0); }
  .tooltip-box { opacity: 0; visibility: hidden; transform: translateX(-50%) translateY(4px); transition: all .15s ease; position: absolute; bottom: calc(100% + 8px); left: 50%; background: var(--secondary); color: var(--white); font-size: 12px; padding: 10px 12px; border-radius: 10px; z-index: 100; box-shadow: 0 8px 24px rgba(0,0,0,.2); width: 260px; white-space: normal; }
  .tooltip-box::after { content: ''; position: absolute; top: 100%; left: 50%; margin-left: -5px; border: 5px solid transparent; border-top-color: var(--secondary); }
`;

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
};

const getScore = (item) => Number(item?._score || item?.matchScore || item?.score || 0);
const profileOf = (item) => item?.profiles || item?.profile || {};

function StartupCard({ startup, investorProfile, expressState, connectionStatus, onExpress, onMessage }) {
  const p = profileOf(startup);
  const name = startup.company_name || startup.idea_title || 'Unnamed Startup';
  const stage = startup.funding_stage || startup.startup_stage || startup.company_stage || '';
  const score = getScore(startup);
  const reason = startup._matchReason || 'Matches your investment focus';
  const summary = startup.problem_solving || startup.problem_statement || startup.unique_value_proposition || p.bio || '';
  const sourceLabel = startup.source_label || (startup.source_role === 'student' ? 'Student Idea' : 'Founder Startup');
  const ownerLabel = startup.source_role === 'student' ? 'Student Founder' : 'Founder';

  return (
    <article className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="hidden sm:block w-1 rounded-full self-stretch g-brand" aria-hidden="true" />
        <div className="w-14 h-14 rounded-xl g-sec flex items-center justify-center text-white font-bold flex-shrink-0">{initials(name)}</div>
        <div className="flex-1 min-w-0">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
            <div>
              <p className="font-bold text-gray-900 truncate">{name}</p>
              <p className="text-xs text-gray-500">
                {p.full_name || ownerLabel}
                {startup.industry ? ` · ${startup.industry}` : ''}
                {stage ? ` · ${stage}` : ''}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-black px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F]">{score}% Match</span>
              <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#1B2D7F]/5 text-[#1B2D7F]">{sourceLabel}</span>
            </div>
          </div>

          {p.location && <p className="text-xs text-gray-400 flex items-center gap-1 mt-1"><MapPin className="w-3" />{p.location}</p>}

          {summary && (
            <div className="p-3 bg-gray-50 border border-gray-100 rounded-xl mt-3">
              <p className="text-xs font-bold text-[#1B2D7F] flex items-center gap-1 mb-1"><BookOpen className="w-3" />Startup Context</p>
              <p className="text-sm text-gray-700 line-clamp-2">{summary}</p>
            </div>
          )}

          <div className="flex flex-wrap gap-1.5 mt-3">
            {startup.industry && <span className="text-xs px-2 py-0.5 rounded-full bg-[#98DE38]/10 text-[#1B2D7F] border border-[#98DE38]/30">{startup.industry}</span>}
            {stage && <span className="text-xs px-2 py-0.5 rounded-full bg-[#1B2D7F]/5 text-[#1B2D7F] border border-[#1B2D7F]/10">{stage}</span>}
            {startup.team_size && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">{startup.team_size} members</span>}
            {startup.university && <span className="text-xs px-2 py-0.5 rounded-full bg-gray-50 text-gray-700 border border-gray-200">{startup.university}</span>}
          </div>

          <div className="flex flex-wrap items-center gap-3 mt-3">
            {startup.pitch_deck_url && <a href={startup.pitch_deck_url} target="_blank" rel="noreferrer" className="text-xs text-[#1B2D7F] font-bold hover:underline flex items-center gap-1"><FileText className="w-3" />Pitch Deck</a>}
            {startup.demo_url && <a href={startup.demo_url} target="_blank" rel="noreferrer" className="text-xs text-[#1B2D7F] font-bold hover:underline flex items-center gap-1"><Globe className="w-3" />Demo</a>}
          </div>

          <IntelligentMatchPanel
            currentProfile={investorProfile}
            candidate={startup}
            context="investor-to-startup"
          />

          <div className="tooltip-wrap mt-3 inline-block">
            <button type="button" className="text-xs text-[#1B2D7F] hover:underline flex items-center gap-1" aria-label="Why recommended?"><Info className="w-3" />Why this match?</button>
            <div className="tooltip-box"><p className="font-semibold mb-1">Match Reason:</p><p>{reason}</p></div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 mt-4">
            <Link to={`/user-profile/${startup.user_id || p.id}`} className="py-2 border-2 border-[#1B2D7F]/10 bg-[#1B2D7F]/5 text-[#1B2D7F] rounded-xl text-xs font-bold hover:bg-[#1B2D7F]/10 transition flex items-center justify-center">View Profile</Link>
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
            {expressState === 'sent' ? (
              <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center"><CheckCircle className="w-3.5 mr-1" />Interested</button>
            ) : expressState === 'pending' ? (
              <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center"><CheckCircle className="w-3.5 mr-1" />Pending</button>
            ) : expressState === 'accepted' ? (
              <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center"><CheckCircle className="w-3.5 mr-1" />Connected</button>
            ) : expressState === 'sending' ? (
              <button type="button" disabled className="py-2 g-brand text-black rounded-xl text-xs font-black flex items-center justify-center opacity-70"><Loader className="w-3.5 animate-spin mr-1" />Sending...</button>
            ) : (
              <button type="button" onClick={onExpress} className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center"><UserPlus className="w-3.5 mr-1" />Interest</button>
            )}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function FindStartupsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: null });
  const [startups, setStartups] = useState([]);
  const [profile, setProfile] = useState(null);
  const [filters, setFilters] = useState({ query: '', matchBand: 'all', industry: '', stage: '', location: '', source: '' });
  const [expressStates, setExpressStates] = useState({});
  const [connStatusMap, setConnStatusMap] = useState({});
  const [msgModal, setMsgModal] = useState(null);
  const [msgText, setMsgText] = useState('');
  const [sending, setSending] = useState(false);

  const load = useCallback(async () => {
    if (!user?.id) return;
    setState({ loading: true, error: null });
    try {
      const [rows, profileData] = await Promise.all([
        fetchStartupsForInvestor({ limit: 80 }),
        profile ? Promise.resolve({ investorProfile: profile }) : fetchInvestorProfile(user.id),
      ]);
      const investorProfile = profile || profileData.investorProfile;
      if (!profile) setProfile(investorProfile);
      setStartups(rankStartupsForInvestor(rows, investorProfile));
      const myConnections = await backendApi.getMyConnections().catch((err) => {
        console.warn('Investor startup connection status load failed:', err);
        return { data: [] };
      });
      const statusMap = {};
      (myConnections?.data || []).forEach((connection) => {
        if (connection.otherUser?.id) statusMap[connection.otherUser.id] = 'accepted';
      });
      setConnStatusMap(statusMap);
      setState({ loading: false, error: null });
    } catch (err) {
      console.error('Find startups load failed:', err);
      setState({ loading: false, error: err.message || 'Failed to load startups' });
      toast.error('Failed to load startups');
    }
  }, [profile, user?.id]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    return startups.filter((startup) => {
      const p = profileOf(startup);
      const score = getScore(startup);
      const stage = startup.funding_stage || startup.startup_stage || startup.company_stage || '';
      const searchText = [
        startup.company_name,
        startup.idea_title,
        startup.industry,
        startup.source_label,
        startup.university,
        p.full_name,
        p.bio,
        startup.problem_solving,
        startup.problem_statement,
        startup.unique_value_proposition,
        startup.target_market,
        stage,
      ].filter(Boolean).join(' ').toLowerCase();
      return (
        (!filters.query || searchText.includes(filters.query.toLowerCase())) &&
        (!filters.industry || String(startup.industry || '').toLowerCase().includes(filters.industry.toLowerCase())) &&
        (!filters.stage || stage.toLowerCase() === filters.stage.toLowerCase()) &&
        (!filters.location || String(p.location || startup.startup_location || '').toLowerCase().includes(filters.location.toLowerCase())) &&
        (!filters.source || startup.source_role === filters.source) &&
        (filters.matchBand === 'all' || (filters.matchBand === '60plus' && score >= 60) || (filters.matchBand === 'below60' && score < 60))
      );
    }).sort((a, b) => getScore(b) - getScore(a));
  }, [filters, startups]);

  const handleExpress = async (startup) => {
    if (expressStates[startup.user_id]) return;
    setExpressStates((prev) => ({ ...prev, [startup.user_id]: 'sending' }));
    try {
      await sendConnectionRequest(user.id, startup.user_id, 'investor_interest', 'Hi, I reviewed your startup profile and would like to learn more about your company.');
      setExpressStates((prev) => ({ ...prev, [startup.user_id]: 'sent' }));
      setConnStatusMap((prev) => ({ ...prev, [startup.user_id]: prev[startup.user_id] || 'pending' }));
      toast.success('Investor interest sent', { style: { background: '#98DE38', color: '#000' } });
    } catch (err) {
      console.error('Investor interest failed:', err);
      setExpressStates((prev) => ({ ...prev, [startup.user_id]: undefined }));
      toast.error(err.message || 'Could not send interest');
    }
  };

  const openMessageModal = (startup) => {
    if (connStatusMap[startup.user_id] !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }
    const name = startup.profiles?.full_name?.split(' ')[0] || 'there';
    setMsgModal(startup);
    setMsgText(`Hi ${name}, I came across your startup${startup.company_name ? ` "${startup.company_name}"` : ''} on ScaleScope. It looks relevant to my investment focus and I would like to learn more. Are you open to connecting?`);
  };

  const handleSendMessage = async () => {
    if (!msgModal || !msgText.trim() || sending) return;
    setSending(true);
    try {
      const convId = await getOrCreateConversation(user.id, msgModal.user_id);
      if (convId) await backendApi.sendConversationMessage(convId, msgText.trim());
      setMsgModal(null);
      setMsgText('');
      toast.success('Message sent', { style: { background: '#98DE38', color: '#000' } });
      navigate(convId ? `/investor/messages?conv=${convId}` : '/investor/messages');
    } catch (err) {
      console.error('Investor message failed:', err);
      toast.error(err.message || 'Could not send message');
    } finally {
      setSending(false);
    }
  };

  const industryOptions = useMemo(() => mergeFilterOptions(
    DISCOVERY_INDUSTRIES,
    startups.map((startup) => startup.industry)
  ), [startups]);
  const stageOptions = useMemo(() => mergeFilterOptions(
    STARTUP_STAGE_OPTIONS,
    startups.map((startup) => startup.funding_stage || startup.startup_stage || startup.company_stage)
  ), [startups]);
  const locationOptions = useMemo(() => mergeFilterOptions(
    DISCOVERY_LOCATIONS,
    startups.flatMap((startup) => [profileOf(startup).location, startup.startup_location])
  ), [startups]);

  const resetFilters = () => setFilters({ query: '', matchBand: 'all', industry: '', stage: '', location: '', source: '' });
  const strongCount = startups.filter((startup) => getScore(startup) >= 60).length;
  const below60Count = startups.length - strongCount;

  if (state.loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" /></div>;

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-6xl mx-auto">
          <header className="mb-8">
            <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase px-3 py-1 rounded-full bg-[#98DE38]/15 text-[#1B2D7F] border border-[#98DE38]/40"><Rocket className="w-3.5" />Find Startups</span>
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mt-3">
              <div>
                <h1 className="text-3xl sm:text-4xl font-black text-gray-900">Startup Deal Flow</h1>
                <p className="text-gray-500 text-sm max-w-xl mt-2">Discover founder startups and student startup ideas. Match quality is based on your preferred stages, industries, and thesis.</p>
              </div>
              <Link to="/investor/profile" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl border border-gray-200 bg-white text-sm font-bold text-gray-700 hover:bg-gray-50">Improve Matching <ArrowRight className="w-4" /></Link>
            </div>
          </header>

          <section className="grid sm:grid-cols-3 gap-3 mb-6">
            <Stat label="Available startup matches" value={startups.length} />
            <Stat label="Explore matches below 60%" value={below60Count} />
            <Stat label="Strong matches 60%+" value={strongCount} />
          </section>

          <section className="bg-white border border-gray-200 rounded-2xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <Search className="w-5 text-gray-400" />
              <input type="text" value={filters.query} onChange={(event) => setFilters((prev) => ({ ...prev, query: event.target.value }))} placeholder="Search by startup, student idea, founder, industry, problem..." className="flex-1 outline-none text-sm" />
              {filters.query && <button type="button" onClick={() => setFilters((prev) => ({ ...prev, query: '' }))} className="p-1 hover:bg-gray-100 rounded" aria-label="Clear search"><X className="w-4 text-gray-400" /></button>}
            </div>
            <div className="grid sm:grid-cols-2 lg:grid-cols-6 gap-3 mt-4">
              <SelectFilter label="Match band" value={filters.matchBand} onChange={(value) => setFilters((prev) => ({ ...prev, matchBand: value }))}><option value="all">All matches</option><option value="60plus">60%+</option><option value="below60">Below 60%</option></SelectFilter>
              <SelectFilter label="Industry" value={filters.industry} onChange={(value) => setFilters((prev) => ({ ...prev, industry: value }))}><option value="">All industries</option>{industryOptions.map((item) => <option key={item} value={item}>{item}</option>)}</SelectFilter>
              <SelectFilter label="Stage" value={filters.stage} onChange={(value) => setFilters((prev) => ({ ...prev, stage: value }))}><option value="">All stages</option>{stageOptions.map((item) => <option key={item} value={item}>{item}</option>)}</SelectFilter>
              <SelectFilter label="Location" value={filters.location} onChange={(value) => setFilters((prev) => ({ ...prev, location: value }))}><option value="">All locations</option>{locationOptions.map((item) => <option key={item} value={item}>{item}</option>)}</SelectFilter>
              <SelectFilter label="Source" value={filters.source} onChange={(value) => setFilters((prev) => ({ ...prev, source: value }))}><option value="">Students & founders</option><option value="student">Student ideas</option><option value="founder">Founder startups</option></SelectFilter>
              <div className="flex items-end"><button type="button" onClick={resetFilters} className="w-full py-2 rounded-xl border border-gray-200 text-sm font-bold text-gray-600 hover:bg-gray-50 flex items-center justify-center gap-2"><SlidersHorizontal className="w-4" />Reset</button></div>
            </div>
          </section>

          {state.error && <div className="bg-white border border-red-100 rounded-2xl p-4 mb-4 text-sm text-red-600">{state.error}</div>}

          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
            <p className="text-sm text-gray-500">Showing <span className="font-bold text-gray-900">{filtered.length}</span> results</p>
            <p className="text-xs text-gray-400">Message unlocks after accepted connection.</p>
          </div>

          {filtered.length > 0 ? (
            <div className="grid lg:grid-cols-2 gap-4" aria-live="polite">
              {filtered.map((startup) => (
                <StartupCard
                  key={startup.id || startup.user_id}
                  startup={startup}
                  investorProfile={profile}
                  expressState={expressStates[startup.user_id] || connStatusMap[startup.user_id]}
                  connectionStatus={connStatusMap[startup.user_id]}
                  onExpress={() => handleExpress(startup)}
                  onMessage={() => openMessageModal(startup)}
                />
              ))}
            </div>
          ) : (
            <div className="py-14 text-center bg-white rounded-2xl border border-gray-200 text-gray-500">
              <div className="w-14 h-14 rounded-full bg-gray-50 mx-auto mb-4 flex items-center justify-center"><Sparkles className="w-6 text-gray-400" /></div>
              <p className="font-bold text-gray-800">No startup matches found.</p>
              <p className="text-sm text-gray-500 mt-1">Try changing filters or improve your investor profile for better matching.</p>
              <button type="button" onClick={resetFilters} className="mt-4 px-4 py-2 g-brand text-black rounded-xl text-sm font-black">Clear filters</button>
            </div>
          )}

          <aside className="mt-8 bg-white rounded-2xl p-5 border border-gray-100">
            <h3 className="font-bold text-gray-900 mb-2 flex items-center gap-2"><ShieldCheck className="w-4 text-[#1B2D7F]" />Matching tip</h3>
            <p className="text-sm text-gray-600">Add preferred stages, industry focus, check range, and thesis to get better founder startup and student idea matches.</p>
            <Link to="/investor/profile" className="inline-flex items-center gap-1 text-xs font-bold text-[#1B2D7F] mt-3 hover:underline">Edit Profile <ArrowRight className="w-3" /></Link>
          </aside>
        </div>
      </div>

      {msgModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-3xl p-7 max-w-md w-full shadow-2xl">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-black text-xl text-gray-900">Message {msgModal.profiles?.full_name?.split(' ')[0] || 'Founder'}</h3>
              <button type="button" onClick={() => setMsgModal(null)} className="p-1.5 hover:bg-gray-100 rounded-xl text-gray-400" aria-label="Close message modal"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-gray-400 mb-3">A personalized message helps founders understand why you are interested.</p>
            <textarea className="w-full p-4 bg-gray-50 border-2 border-gray-200 rounded-2xl text-sm outline-none resize-none focus:border-[#98DE38] transition-colors" rows={6} value={msgText} onChange={(event) => setMsgText(event.target.value)} maxLength={500} />
            <p className="text-xs text-gray-400 text-right mt-1 mb-4">{msgText.length}/500</p>
            <div className="flex gap-3">
              <button type="button" onClick={() => setMsgModal(null)} className="flex-1 py-3 bg-gray-100 text-gray-700 rounded-xl font-bold text-sm hover:bg-gray-200">Cancel</button>
              <button type="button" onClick={handleSendMessage} disabled={!msgText.trim() || sending} className="flex-1 py-3 g-brand text-black rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-50">{sending ? <Loader className="w-4 h-4 animate-spin" /> : <><Send className="w-4" />Send Interest</>}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function Stat({ label, value }) {
  return <div className="bg-white rounded-2xl p-4 border border-gray-100"><p className="text-xs text-gray-500">{label}</p><p className="text-2xl font-black text-gray-900">{value}</p></div>;
}

function SelectFilter({ label, value, onChange, children }) {
  return (
    <div>
      <label className="text-xs font-bold text-gray-500 mb-1 block">{label}</label>
      <select value={value} onChange={(event) => onChange(event.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-xl px-3 py-2 text-sm">{children}</select>
    </div>
  );
}
