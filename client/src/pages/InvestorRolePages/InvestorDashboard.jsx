// src/pages/InvestorRolePages/InvestorDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext';
import {
  fetchInvestorDashboard,
  calcInvestorCompletion,
  getInvestorProfileNudges,
  rankStartupsForInvestor,
  respondToRequest,
  getOrCreateConversation,
  sendConnectionRequest,
  formatTicketSize,
} from '../../services/investorService';
import {
  DollarSign,
  Rocket,
  MessageSquare,
  CheckCircle,
  X,
  Edit3,
  MapPin,
  Inbox,
  ArrowRight,
  Loader,
  Sparkles,
  Shield,
  Search,
  Settings,
  Briefcase,
  TrendingUp,
  UserPlus,
  Clock,
} from 'lucide-react';
import toast from 'react-hot-toast';

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
  .page-bg { background: var(--gray-50); background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px); background-size: 28px 28px; }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; will-change: transform; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
  .shimmer { background: linear-gradient(90deg, var(--gray-100) 25%, var(--gray-200) 50%, var(--gray-100) 75%); background-size: 200% 100%; animation: shimmer 1.5s infinite; border-radius: 12px; }
  @keyframes shimmer { 0% { background-position: 200% 0; } 100% { background-position: -200% 0; } }
  .journey-item { border: 2px solid var(--gray-200); border-radius: 14px; padding: 14px; transition: all .2s; }
  .journey-item.done { border-color: #10B981; background: #F0FDF4; }
  .journey-item.active { border-color: var(--secondary); background: #F8FAFC; }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
`;

const initials = (name) => {
  if (!name) return '?';
  return name.split(' ').map((word) => word[0]).join('').slice(0, 2).toUpperCase();
};

const timeAgo = (iso) => {
  if (!iso) return '';
  const seconds = (Date.now() - new Date(iso)) / 1000;
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h`;
  return `${Math.floor(seconds / 86400)}d`;
};

const getScore = (item) => Number(item?._score || item?.matchScore || item?.score || 0);

function Avatar({ name, src, size = 'md' }) {
  const sizeClass = { sm: 'w-8 h-8', md: 'w-10 h-10', lg: 'w-12 h-12', xl: 'w-14 h-14' }[size];
  if (src) return <img src={src} alt="" className={`${sizeClass} object-cover rounded-xl`} loading="lazy" />;
  return <div className={`${sizeClass} g-sec flex items-center justify-center text-white font-bold rounded-xl`} aria-hidden="true">{initials(name)}</div>;
}

function StartupSuggestionCard({ startup, status, onExpress, onMessage }) {
  const profile = startup.profiles || {};
  const name = startup.company_name || startup.idea_title || 'Startup';
  const stage = startup.funding_stage || startup.startup_stage || startup.company_stage || '';
  const score = getScore(startup);

  return (
    <div className="bg-white rounded-2xl p-4 border border-gray-100 hover:shadow-md transition lift">
      <div className="flex items-center gap-3 mb-3">
        <Avatar name={name} size="lg" />
        <div className="flex-1 min-w-0">
          <h3 className="font-bold text-gray-900 truncate">{name}</h3>
          <p className="text-xs text-gray-500 truncate">{startup.industry || profile.location || 'Startup match'}{stage ? ` · ${stage}` : ''}</p>
        </div>
        <span className="px-2 py-1 text-[10px] font-bold rounded-full bg-[#98DE38]/20 text-[#1B2D7F] flex-shrink-0">{score}% Match</span>
      </div>
      {(startup.problem_solving || startup.problem_statement) && <p className="text-xs text-gray-600 mb-3 line-clamp-2">{startup.problem_solving || startup.problem_statement}</p>}
      {startup._matchReason && <p className="text-xs text-gray-600 mb-4">{startup._matchReason}</p>}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <Link to={`/user-profile/${startup.user_id}`} className="py-2 border-2 border-[#1B2D7F]/10 bg-[#1B2D7F]/5 text-[#1B2D7F] rounded-xl text-xs font-bold hover:bg-[#1B2D7F]/10 transition flex items-center justify-center">View Profile</Link>
        <button type="button" onClick={onMessage} className="py-2 border-2 border-gray-200 hover:border-gray-300 text-gray-800 bg-white rounded-xl text-xs font-bold transition flex items-center justify-center"><MessageSquare className="w-3.5 mr-1" />Message</button>
        {status === 'sent' ? (
          <button type="button" disabled className="py-2 bg-[#98DE38]/10 border border-[#98DE38]/40 text-[#1B2D7F] rounded-xl text-xs font-bold flex items-center justify-center"><CheckCircle className="w-3.5 mr-1" />Interested</button>
        ) : status === 'sending' ? (
          <button type="button" disabled className="py-2 g-brand text-black rounded-xl text-xs font-black flex items-center justify-center opacity-70"><Loader className="w-3.5 animate-spin mr-1" />Sending...</button>
        ) : (
          <button type="button" onClick={onExpress} className="py-2 g-brand text-black rounded-xl text-xs font-black hover:opacity-90 transition flex items-center justify-center"><DollarSign className="w-3.5 mr-1" />Interest</button>
        )}
      </div>
    </div>
  );
}

export default function InvestorDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState({});
  const [interestStates, setInterestStates] = useState({});

  const load = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const dashboard = await fetchInvestorDashboard(user.id);
      dashboard.startups = rankStartupsForInvestor(dashboard.startups, dashboard.investorProfile);
      setData(dashboard);
    } catch (err) {
      console.error('[InvestorDashboard]', err);
      toast.error('Failed to load investor dashboard');
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => { load(); }, [load]);

  const handleRespond = async (requestId, status) => {
    setResponding((prev) => ({ ...prev, [requestId]: status }));
    try {
      await respondToRequest(requestId, status);
      setData((prev) => ({ ...prev, requests: prev.requests.filter((request) => request.id !== requestId) }));
      toast.success(status === 'accepted' ? 'Pitch accepted' : 'Pitch declined', { style: { background: '#98DE38', color: '#000' } });
      if (status === 'accepted') load();
    } catch (err) {
      console.error('Investor response failed:', err);
      toast.error(err.message || 'Could not respond');
      setResponding((prev) => ({ ...prev, [requestId]: null }));
    }
  };

  const handleMessage = async (targetId) => {
    if (!targetId) return;
    try {
      const convId = await getOrCreateConversation(user.id, targetId);
      navigate(convId ? `/investor/messages?conv=${convId}` : '/investor/messages');
    } catch (err) {
      console.error('Investor message failed:', err);
      toast.error('Could not open conversation');
    }
  };

  const handleExpress = async (startup) => {
    if (interestStates[startup.user_id]) return;
    setInterestStates((prev) => ({ ...prev, [startup.user_id]: 'sending' }));
    try {
      await sendConnectionRequest(user.id, startup.user_id, 'investor_interest', 'Hi, I reviewed your startup profile and would like to learn more.');
      setInterestStates((prev) => ({ ...prev, [startup.user_id]: 'sent' }));
      toast.success('Investor interest sent', { style: { background: '#98DE38', color: '#000' } });
    } catch (err) {
      console.error('Investor interest failed:', err);
      setInterestStates((prev) => ({ ...prev, [startup.user_id]: undefined }));
      toast.error(err.message || 'Could not send interest');
    }
  };

  if (loading) return <div className="min-h-screen flex items-center justify-center"><Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" /></div>;

  const { profile = {}, investorProfile = {}, requests = [], startups = [], convos = [] } = data || {};
  const firstName = profile.full_name?.split(' ')[0] || 'Investor';
  const completion = calcInvestorCompletion(profile, investorProfile);
  const nudges = getInvestorProfileNudges(profile, investorProfile);
  const ticket = formatTicketSize(investorProfile.ticket_size_min, investorProfile.ticket_size_max);
  const strongStartups = startups.filter((startup) => getScore(startup) >= 60).slice(0, 5);

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-7xl mx-auto">
          <div className="rounded-2xl p-6 mb-6 border bg-white border-gray-200">
            <div className="flex flex-col sm:flex-row justify-between items-start gap-4">
              <div>
                <span className="inline-block px-3 py-1 rounded-full text-xs font-bold uppercase bg-green-100 text-green-700">investor</span>
                <h1 className="text-2xl sm:text-3xl font-black mt-3">Welcome, {firstName}</h1>
                <p className="mt-2 text-sm max-w-lg text-gray-500">Your investor mission control. Review pitches, discover startups, and manage deal-flow conversations.</p>
              </div>
              <div className="flex gap-2 flex-wrap">
                <Link to="/investor/find-startups" className="px-4 py-2 g-brand text-black font-bold text-sm rounded-xl hover:opacity-90">Find Startups</Link>
                <Link to="/investor/profile" className="px-4 py-2 border-2 border-gray-200 font-semibold text-sm rounded-xl hover:bg-gray-50">Profile</Link>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
            {[
              { label: 'Profile', val: `${completion}%`, sub: completion > 70 ? 'Great' : 'Add more', Icon: Shield },
              { label: 'Pitches', val: requests.length, sub: 'Pending review', Icon: Inbox },
              { label: 'Startups', val: strongStartups.length, sub: '60%+ matches', Icon: Rocket },
              { label: 'Messages', val: convos.length, sub: 'Active chats', Icon: MessageSquare },
            ].map((stat) => (
              <div key={stat.label} className="bg-white rounded-xl p-4 border border-gray-100 lift">
                <div className="w-9 h-9 rounded-lg g-sec flex items-center justify-center text-white mb-2"><stat.Icon className="w-4 h-4" /></div>
                <p className="font-black text-xl text-gray-900">{stat.val}</p>
                <p className="text-xs text-gray-500">{stat.label} · {stat.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-6">
              {requests.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Inbox className="w-5 text-[#1B2D7F]" />Incoming Pitches</h2>
                  <div className="space-y-3">
                    {requests.map((request) => (
                      <div key={request.id} className="flex flex-col sm:flex-row sm:items-center gap-3 p-3 bg-gray-50 rounded-xl">
                        <Avatar name={request.sender?.full_name} src={request.sender?.avatar_url} size="md" />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm truncate">{request.sender?.full_name || 'Founder'}</p>
                          <p className="text-xs text-gray-500">{request.type?.replace('_', ' ')} · {timeAgo(request.created_at)}</p>
                          {request.message && <p className="text-xs text-gray-500 line-clamp-1 mt-1">{request.message}</p>}
                        </div>
                        <div className="flex gap-2">
                          <button type="button" onClick={() => handleRespond(request.id, 'accepted')} disabled={!!responding[request.id]} className="px-3 py-1.5 bg-green-600 text-white text-xs font-bold rounded-lg hover:bg-green-700 disabled:opacity-60">{responding[request.id] === 'accepted' ? 'Saving...' : 'Interested'}</button>
                          <button type="button" onClick={() => handleRespond(request.id, 'declined')} disabled={!!responding[request.id]} className="px-3 py-1.5 border border-gray-200 text-xs font-bold rounded-lg hover:border-red-200 hover:text-red-600 disabled:opacity-60">Decline</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TargetIcon />Investor Journey</h2>
                <div className="space-y-3">
                  <JourneyItem done={completion >= 70} title="Investor Profile" text={completion >= 70 ? 'Strong profile' : 'Add thesis, ticket size, and focus areas'} to="/investor/profile" action={completion >= 70 ? 'Edit' : 'Complete'} />
                  <JourneyItem active title="Deal Flow" text="Discover startups aligned with your thesis" to="/investor/find-startups" action="Find Startups" />
                  <JourneyItem title="Pitch Review" text="Review founder requests and start conversations" to="/investor/messages" action="Messages" />
                </div>
              </div>

              {nudges.length > 0 && (
                <div className="bg-white rounded-2xl p-5 border border-gray-100">
                  <h2 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><Shield className="w-5 text-[#1B2D7F]" />Profile Strength</h2>
                  <div className="space-y-2">
                    {nudges.map((nudge) => (
                      <Link key={nudge.field} to="/investor/profile" className="flex items-center gap-3 p-3 bg-gray-50 rounded-xl hover:bg-gray-100 transition">
                        <Sparkles className="w-4 text-[#1B2D7F]" />
                        <p className="text-sm text-gray-700 flex-1">{nudge.msg}</p>
                        <ArrowRight className="w-4 text-gray-400" />
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="font-bold text-gray-900 flex items-center gap-2"><Rocket className="w-5 text-[#1B2D7F]" />AI Suggested Startups</h2>
                  <Link to="/investor/find-startups" className="text-xs text-[#1B2D7F] font-semibold">Browse all</Link>
                </div>
                {strongStartups.length > 0 ? (
                  <div className="space-y-3">
                    {strongStartups.map((startup) => <StartupSuggestionCard key={startup.id || startup.user_id} startup={startup} status={interestStates[startup.user_id]} onExpress={() => handleExpress(startup)} onMessage={() => handleMessage(startup.user_id)} />)}
                  </div>
                ) : (
                  <div className="py-8 text-center bg-gray-50 rounded-xl border border-gray-100">
                    <p className="text-sm font-bold text-gray-700">No strong startup matches right now</p>
                    <p className="text-xs text-gray-400 mt-1">Dashboard only shows top startup matches with 60%+ score.</p>
                    <p className="text-xs text-gray-400 mt-1">Add investment stages, industry focus, ticket size, and thesis to improve suggestions.</p>
                    <Link to="/investor/find-startups" className="inline-flex mt-3 px-4 py-2 g-brand text-black text-xs font-bold rounded-xl">Browse startups</Link>
                  </div>
                )}
              </div>
            </div>

            <aside className="space-y-6">
              <div className="g-sec rounded-2xl p-5 text-white">
                <h3 className="font-bold mb-4 flex items-center gap-2"><Shield className="w-4" />My Profile</h3>
                <div className="flex items-center gap-3 mb-4">
                  <Avatar name={profile.full_name} src={profile.avatar_url} size="lg" />
                  <div>
                    <p className="font-semibold">{profile.full_name || 'Complete Profile'}</p>
                    <p className="text-xs text-white/70">{investorProfile.firm_name || investorProfile.investor_type || 'Investor'}</p>
                  </div>
                </div>
                <div className="flex justify-between text-sm mb-1"><span className="text-white/70">Complete</span><span className="font-bold">{completion}%</span></div>
                <div className="h-2 bg-white/20 rounded-full overflow-hidden mb-4"><div className="h-full bg-white rounded-full" style={{ width: `${completion}%` }} /></div>
                <Link to="/investor/profile" className="w-full py-2 bg-white/20 hover:bg-white/30 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"><Edit3 className="w-4" />Edit Profile</Link>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4">Quick Links</h3>
                <nav className="space-y-1">
                  {[
                    { label: 'Find Startups', to: '/investor/find-startups', Icon: Search },
                    { label: 'Messages', to: '/investor/messages', Icon: MessageSquare },
                    { label: 'Edit Profile', to: '/investor/profile', Icon: Edit3 },
                    { label: 'Discover', to: '/investor/discover', Icon: Rocket },
                    { label: 'Preferences', to: '/settings', Icon: Settings },
                  ].map((item) => <Link key={item.to} to={item.to} className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-gray-50 text-sm font-medium"><item.Icon className="w-4 text-gray-500" />{item.label}</Link>)}
                </nav>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-gray-100">
                <h3 className="font-bold text-gray-900 mb-4 flex items-center gap-2"><TrendingUp className="w-4 text-[#1B2D7F]" />Investor Stats</h3>
                <div className="space-y-3">
                  <InfoRow label="Ticket Size" value={ticket} />
                  <InfoRow label="Portfolio" value={`${investorProfile.portfolio_count || 0} companies`} />
                  <InfoRow label="Exits" value={`${investorProfile.successful_exits || 0}`} />
                  <InfoRow label="Accepting" value={investorProfile.accepting_pitches !== false ? 'Yes' : 'Paused'} />
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </>
  );
}

function JourneyItem({ done, active, title, text, to, action }) {
  return (
    <div className={`journey-item ${done ? 'done' : active ? 'active' : ''}`}>
      <div className="flex justify-between items-center gap-3">
        <div className="flex items-center gap-3">
          <span className={`w-8 h-8 rounded-full flex items-center justify-center ${done ? 'bg-green-100' : 'bg-gray-100'}`}>{done ? '✓' : <Briefcase className="w-4" />}</span>
          <div><p className="font-semibold text-sm">{title}</p><p className="text-xs text-gray-500">{text}</p></div>
        </div>
        <Link to={to} className={`text-xs font-bold px-3 py-1.5 rounded-lg ${active || done ? 'g-brand text-black' : 'border-2 border-gray-200 text-gray-600 hover:bg-gray-50'}`}>{action}</Link>
      </div>
    </div>
  );
}

function InfoRow({ label, value }) {
  return <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-xl"><span className="text-xs text-gray-500">{label}</span><span className="text-xs font-bold text-gray-800">{value}</span></div>;
}

function TargetIcon() {
  return <DollarSign className="w-5 text-[#1B2D7F]" />;
}
