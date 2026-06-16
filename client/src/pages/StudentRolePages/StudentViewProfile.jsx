// src/pages/UserProfileViewPage.jsx
import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  MapPin,
  GraduationCap,
  Lightbulb,
  Briefcase,
  ShieldCheck,
  UserPlus,
  MessageSquare,
  Building2,
  Clock,
  DollarSign,
  Globe,
  Heart,
  Link as LinkIcon,
  Rocket,
  Shield,
  Star,
  Target,
  Users,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabaseClient';
import { backendApi } from '../../lib/backendApi';
import GrowthSignalPanel from '../../components/GrowthSignalPanel';
import MatchOutcomeFeedback from '../../components/MatchOutcomeFeedback';
import { useAuth } from '../../auth/AuthContext';

const CSS = `
  :root {
    --primary: #98DE38;
    --primary-dark: #7EC42E;
    --secondary: #1B2D7F;
    --secondary-light: #2A3F8F;
    --gray-50: #F9FAFB;
    --gray-100: #F3F4F6;
    --gray-200: #E5E7EB;
  }
  .page-bg {
    background: var(--gray-50);
    background-image: radial-gradient(circle, rgba(152,222,56,.06) 1px, transparent 1px);
    background-size: 28px 28px;
  }
  .g-brand { background: linear-gradient(135deg, var(--primary), var(--primary-dark)); }
  .g-sec { background: linear-gradient(135deg, var(--secondary), var(--secondary-light)); }
  .lift { transition: transform .2s cubic-bezier(.22,.68,0,1.2), box-shadow .2s ease; }
  .lift:hover { transform: translateY(-2px); box-shadow: 0 12px 32px rgba(27,45,127,.12); }
  button:focus-visible, a:focus-visible { outline: 2px solid var(--primary); outline-offset: 2px; }
`;

const AVATAR_CACHE = new Map();
const CACHE_TTL = 30 * 60 * 1000;

async function getCachedAvatarUrl(path) {
  if (!path) return '';
  if (path.startsWith('http')) return path;

  const cleanPath = path.replace(/^avatars\//, '').replace(/^\/+/, '');
  const key = `avatar:${cleanPath}`;
  const cached = AVATAR_CACHE.get(key);

  if (cached && Date.now() - cached.ts < CACHE_TTL) return cached.url;

  const { data, error } = await supabase.storage
    .from('avatars')
    .createSignedUrl(cleanPath, 60 * 60);

  if (error || !data?.signedUrl) return '';

  AVATAR_CACHE.set(key, { url: data.signedUrl, ts: Date.now() });
  return data.signedUrl;
}

const safeArray = (value) => (Array.isArray(value) ? value : []);
const hasText = (value) => String(value || '').trim().length > 0;
const formatMoney = (value) => {
  if (value === null || value === undefined || value === '') return '';
  const number = Number(value);
  if (!Number.isFinite(number)) return String(value);
  return new Intl.NumberFormat('en-US', { maximumFractionDigits: 0 }).format(number);
};
const fieldValue = (value) => {
  if (Array.isArray(value)) return value.length ? value.join(', ') : '';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  return value ?? '';
};
const normalizeSkill = (skill) => {
  if (!skill) return '';
  if (typeof skill === 'string') return skill;
  return [skill.skill || skill.name || skill.title, skill.level].filter(Boolean).join(' · ');
};

function Section({ title, icon, children }) {
  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 lift">
      <h2 className="font-black text-gray-900 mb-4 flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldGrid({ items }) {
  const visible = items.filter((item) => {
    const value = fieldValue(item.value);
    return value !== '' && value !== null && value !== undefined;
  });

  if (!visible.length) return <p className="text-sm text-gray-400 italic">No details added yet.</p>;

  return (
    <div className="grid md:grid-cols-2 gap-3">
      {visible.map((item) => {
        const Icon = item.Icon || Shield;
        return (
          <div key={item.label} className="flex items-start gap-3 p-4 bg-gray-50 rounded-xl">
            <div className="p-2 bg-gray-100 rounded-lg text-[#1B2D7F]">
              <Icon className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-0.5">
                {item.label}
              </p>
              <p className="text-sm font-semibold text-gray-800 break-words">
                {fieldValue(item.value)}
              </p>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ChipGroup({ title, values = [], tone = 'blue' }) {
  const clean = values.map(normalizeSkill).filter(Boolean);
  if (!clean.length) return null;

  const style = tone === 'green'
    ? { background: 'rgba(152,222,56,0.12)', color: '#1B2D7F', borderColor: '#98DE38' }
    : { background: 'rgba(27,45,127,0.08)', color: '#1B2D7F', borderColor: 'rgba(27,45,127,0.2)' };

  return (
    <div>
      <p className="text-xs font-bold text-gray-400 uppercase tracking-wide mb-2">{title}</p>
      <div className="flex flex-wrap gap-2">
        {clean.map((item, index) => (
          <span key={`${item}-${index}`} className="px-3 py-2 rounded-full text-xs font-semibold border" style={style}>
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

function LinksSection({ profile, founder, student, mentor, investor }) {
  const links = [
    { label: 'LinkedIn', url: profile.linkedin_url },
    { label: 'GitHub', url: profile.github_url },
    { label: 'Twitter', url: profile.twitter_url },
    { label: 'Resume', url: student?.resume_url },
    { label: 'Portfolio', url: student?.portfolio_url || investor?.portfolio_url },
    { label: 'Website', url: founder?.website_url || investor?.website_url },
    { label: 'Pitch Deck', url: founder?.pitch_deck_url },
    { label: 'Pitch Video', url: founder?.pitch_video_url },
    { label: 'Demo', url: founder?.demo_url },
    { label: 'Booking', url: mentor?.booking_url || investor?.booking_url },
  ].filter((item) => hasText(item.url));

  if (!links.length) return null;

  return (
    <Section title="Links & Assets" icon={<LinkIcon className="w-5 text-[#1B2D7F]" />}>
      <div className="grid md:grid-cols-2 gap-3">
        {links.map((item) => (
          <a
            key={`${item.label}-${item.url}`}
            href={item.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 p-4 rounded-xl bg-gray-50 text-[#1B2D7F] hover:bg-gray-100 transition"
          >
            <LinkIcon className="w-4 h-4 flex-shrink-0" />
            <div className="min-w-0">
              <p className="text-xs font-bold uppercase tracking-wide">{item.label}</p>
              <p className="text-xs truncate opacity-80">{item.url.replace(/^https?:\/\//, '')}</p>
            </div>
          </a>
        ))}
      </div>
    </Section>
  );
}

function StudentDetails({ student }) {
  if (!student) return null;

  return (
    <>
      <Section title="Education" icon={<GraduationCap className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'University', value: student.university, Icon: GraduationCap },
            { label: 'Degree', value: student.degree, Icon: GraduationCap },
            { label: 'Major', value: student.major, Icon: GraduationCap },
            { label: 'Current Year', value: student.current_year, Icon: Clock },
            { label: 'Graduation Year', value: student.graduation_year_int, Icon: GraduationCap },
            { label: 'Career Goals', value: student.career_goals, Icon: Target },
            { label: 'City / Campus', value: student.city_or_campus, Icon: MapPin },
          ]}
        />
      </Section>

      <Section title="Student Collaboration" icon={<Users className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'Looking For', value: student.looking_for, Icon: Users },
            { label: 'Preferred Role', value: student.preferred_role, Icon: Briefcase },
            { label: 'Commitment', value: student.commitment_level, Icon: Clock },
            { label: 'Hours Per Week', value: student.hours_per_week, Icon: Clock },
            { label: 'Collaboration Preference', value: student.collaboration_preference, Icon: Users },
            { label: 'Availability Status', value: student.availability_status, Icon: Clock },
            { label: 'Has Co-Founder', value: student.has_cofounder, Icon: Users },
            { label: 'Open to Internship', value: student.open_to_internship, Icon: Briefcase },
            { label: 'Open to Co-Founder', value: student.open_to_cofounder, Icon: Users },
            { label: 'Mentor Bio', value: student.short_bio_for_mentors, Icon: Lightbulb },
          ]}
        />
        <div className="space-y-4 mt-4">
          <ChipGroup title="Skills" values={safeArray(student.skills_with_levels)} />
          <ChipGroup title="Interests" values={safeArray(student.interests)} tone="green" />
          <ChipGroup title="Preferred Industries" values={safeArray(student.preferred_industries)} />
          <ChipGroup title="Help Needed" values={safeArray(student.help_needed)} tone="green" />
          <ChipGroup title="Languages" values={safeArray(student.languages)} />
          <ChipGroup title="Projects" values={safeArray(student.projects)} />
          <ChipGroup title="Launch Risk Flags" values={safeArray(student.launch_risk_flags)} />
        </div>
      </Section>

      {student.has_startup_idea && (
        <Section title="Startup Idea" icon={<Lightbulb className="w-5 text-[#1B2D7F]" />}>
          <FieldGrid
            items={[
              { label: 'Idea Title', value: student.idea_title, Icon: Rocket },
              { label: 'Domain', value: student.idea_domain, Icon: Target },
              { label: 'Stage', value: student.idea_stage, Icon: Clock },
              { label: 'Target Audience', value: student.target_audience, Icon: Users },
              { label: 'Unique Value', value: student.unique_value_prop, Icon: Star },
              { label: 'Description', value: student.startup_idea_description, Icon: Lightbulb },
            ]}
          />
        </Section>
      )}
    </>
  );
}

function FounderDetails({ founder }) {
  if (!founder) return null;

  return (
    <>
      <Section title="Founder Startup" icon={<Rocket className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'Company Name', value: founder.company_name, Icon: Building2 },
            { label: 'Idea Title', value: founder.idea_title, Icon: Lightbulb },
            { label: 'Industry', value: founder.industry, Icon: Target },
            { label: 'Startup Stage', value: founder.startup_stage || founder.company_stage, Icon: Clock },
            { label: 'Product Status', value: founder.product_status, Icon: Rocket },
            { label: 'Startup Location', value: founder.startup_location, Icon: MapPin },
            { label: 'Legal Status', value: founder.legal_status, Icon: Shield },
            { label: 'Launch Timeline', value: founder.launch_timeline, Icon: Clock },
            { label: 'Founding Year', value: founder.founding_year, Icon: Clock },
          ]}
        />
      </Section>

      <Section title="Problem, Market & Strategy" icon={<Target className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'Problem Statement', value: founder.problem_statement || founder.problem_solving, Icon: Target },
            { label: 'Solution', value: founder.solution_description, Icon: Lightbulb },
            { label: 'Unique Value', value: founder.unique_value_proposition, Icon: Star },
            { label: 'Target Market', value: founder.target_market || founder.target_audience, Icon: Users },
            { label: 'Market Size', value: founder.market_size, Icon: Target },
            { label: 'Competitors', value: founder.competitors, Icon: Building2 },
            { label: 'Revenue Model', value: founder.revenue_model, Icon: DollarSign },
            { label: 'Business Model Details', value: founder.business_model_details, Icon: DollarSign },
            { label: 'Go-To-Market Strategy', value: founder.go_to_market_strategy, Icon: Rocket },
            { label: 'Current Challenges', value: founder.current_challenges, Icon: Shield },
          ]}
        />
      </Section>

      <Section title="Traction, Funding & Team" icon={<DollarSign className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'Team Size', value: founder.team_size, Icon: Users },
            { label: 'Founder Role', value: founder.founder_role, Icon: Briefcase },
            { label: 'Commitment', value: founder.commitment_level, Icon: Clock },
            { label: 'Weekly Hours', value: founder.weekly_hours, Icon: Clock },
            { label: 'Validation Status', value: founder.validation_status, Icon: ShieldCheck },
            { label: 'Customer Validation', value: founder.customer_validation, Icon: ShieldCheck },
            { label: 'Traction Summary', value: founder.traction_summary, Icon: Star },
            { label: 'Monthly Revenue', value: formatMoney(founder.monthly_revenue), Icon: DollarSign },
            { label: 'Active Users', value: founder.active_users, Icon: Users },
            { label: 'Customer Count', value: founder.customer_count, Icon: Users },
            { label: 'Funding Stage', value: founder.funding_stage, Icon: DollarSign },
            { label: 'Funding Raised', value: formatMoney(founder.funding_raised), Icon: DollarSign },
            { label: 'Ask Amount', value: founder.ask_amount, Icon: DollarSign },
            { label: 'Use of Funds', value: founder.use_of_funds, Icon: DollarSign },
            { label: 'Investment Readiness', value: founder.investment_readiness, Icon: DollarSign },
            { label: 'Incubator / Accelerator', value: founder.incubator_or_accelerator, Icon: Rocket },
            { label: 'Next 6 Month Milestones', value: founder.milestones_next_6_months, Icon: Target },
            { label: 'Co-Founder Status', value: founder.cofounder_status, Icon: Users },
            { label: 'Equity Available', value: founder.equity_available, Icon: DollarSign },
            { label: 'Co-Founder Requirements', value: founder.cofounder_requirements, Icon: Users },
          ]}
        />
        <div className="space-y-4 mt-4">
          <ChipGroup title="Founder Skills" values={safeArray(founder.founder_skills)} />
          <ChipGroup title="Looking For" values={safeArray(founder.looking_for)} tone="green" />
          <ChipGroup title="Help Needed" values={safeArray(founder.help_needed)} />
          <ChipGroup title="Skills Needed" values={safeArray(founder.skills_needed)} />
          <ChipGroup title="Hiring Roles" values={safeArray(founder.hiring_roles)} />
          <ChipGroup title="Tech Stack" values={safeArray(founder.tech_stack)} />
          <ChipGroup title="Key Risks" values={safeArray(founder.key_risks)} />
        </div>
      </Section>
    </>
  );
}

function MentorDetails({ mentor }) {
  if (!mentor) return null;

  return (
    <>
      <Section title="Mentor Expertise" icon={<Star className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'Current Role', value: mentor.current_role, Icon: Briefcase },
            { label: 'Current Company', value: mentor.current_company, Icon: Building2 },
            { label: 'Years Experience', value: mentor.years_experience, Icon: Clock },
            { label: 'Successful Exits', value: mentor.successful_exits, Icon: Star },
            { label: 'Mentorship Style', value: mentor.mentorship_style, Icon: Lightbulb },
            { label: 'Capacity', value: mentor.mentorship_capacity, Icon: Users },
            { label: 'Current Mentees', value: mentor.current_mentees, Icon: Users },
            { label: 'Rate', value: mentor.is_pro_bono ? 'Pro Bono' : mentor.hourly_rate ? `$${mentor.hourly_rate}/hr` : '', Icon: DollarSign },
            { label: 'Availability Hours', value: mentor.availability_hours, Icon: Clock },
            { label: 'Timezone', value: mentor.timezone, Icon: Clock },
            { label: 'Mentorship Mode', value: mentor.mentorship_mode, Icon: Users },
            { label: 'Success Stories', value: mentor.success_stories, Icon: Star },
          ]}
        />
        <div className="space-y-4 mt-4">
          <ChipGroup title="Expertise Areas" values={safeArray(mentor.expertise_areas)} />
          <ChipGroup title="Can Help With" values={safeArray(mentor.can_help_with)} tone="green" />
          <ChipGroup title="Available For" values={safeArray(mentor.available_for)} />
          <ChipGroup title="Preferred Mentees" values={safeArray(mentor.preferred_mentees)} />
          <ChipGroup title="Industries Supported" values={safeArray(mentor.industries_supported)} />
          <ChipGroup title="Languages" values={safeArray(mentor.languages)} />
          <ChipGroup title="Companies Worked" values={safeArray(mentor.companies_worked)} />
          <ChipGroup title="Companies Founded" values={safeArray(mentor.companies_founded)} />
        </div>
      </Section>
    </>
  );
}

function InvestorDetails({ investor }) {
  if (!investor) return null;

  return (
    <>
      <Section title="Investor Profile" icon={<DollarSign className="w-5 text-[#1B2D7F]" />}>
        <FieldGrid
          items={[
            { label: 'Investor Type', value: investor.investor_type, Icon: DollarSign },
            { label: 'Firm / Fund', value: investor.fund_name || investor.firm_name, Icon: Building2 },
            { label: 'Check Range Min', value: formatMoney(investor.check_range_min || investor.ticket_size_min), Icon: DollarSign },
            { label: 'Check Range Max', value: formatMoney(investor.check_range_max || investor.ticket_size_max), Icon: DollarSign },
            { label: 'Geography Focus', value: investor.geography_focus || investor.geographic_focus, Icon: Globe },
            { label: 'Total Investments', value: investor.total_investments || investor.portfolio_count, Icon: Briefcase },
            { label: 'Exits', value: investor.exits || investor.successful_exits, Icon: Star },
            { label: 'Investment Frequency', value: investor.investment_frequency, Icon: Clock },
            { label: 'Lead or Follow', value: investor.lead_or_follow, Icon: Target },
            { label: 'Response Time', value: investor.response_time, Icon: Clock },
            { label: 'Accepting Pitches', value: investor.accepting_pitches, Icon: MessageSquare },
            { label: 'Preferred Contact', value: investor.preferred_contact_method, Icon: MessageSquare },
            { label: 'Typical Involvement', value: investor.typical_involvement, Icon: Users },
            { label: 'Verified', value: investor.is_verified, Icon: ShieldCheck },
            { label: 'Minimum Traction Required', value: investor.minimum_traction_required, Icon: Target },
            { label: 'Due Diligence Requirements', value: investor.due_diligence_requirements, Icon: Shield },
            { label: 'Investment Thesis', value: investor.what_i_look_for || investor.investment_thesis, Icon: Lightbulb },
            { label: 'Notable Investments', value: investor.notable_investments, Icon: Star },
          ]}
        />
        <div className="space-y-4 mt-4">
          <ChipGroup title="Preferred Stages" values={safeArray(investor.preferred_stages || investor.investment_stage)} />
          <ChipGroup title="Preferred Industries" values={safeArray(investor.preferred_industries || investor.industries_of_interest)} tone="green" />
          <ChipGroup title="Preferred Business Models" values={safeArray(investor.preferred_business_models)} />
        </div>
      </Section>
    </>
  );
}

export default function StudentViewProfile() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [state, setState] = useState({ loading: true, error: null });
  const [data, setData] = useState({
    profile: null,
    student: null,
    founder: null,
    mentor: null,
    investor: null,
  });
  const [avatarUrl, setAvatarUrl] = useState('');
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!userId) return;

      try {
        setState({ loading: true, error: null });

        const [profileRes, studentRes, founderRes, mentorRes, investorRes, connectionsRes] = await Promise.allSettled([
          supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
          supabase.from('student_profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('founder_profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('mentor_profiles').select('*').eq('user_id', userId).maybeSingle(),
          supabase.from('investor_profiles').select('*').eq('user_id', userId).maybeSingle(),
          backendApi.getMyConnections(),
        ]);

        if (profileRes.status !== 'fulfilled' || profileRes.value.error) {
          throw profileRes.value?.error || new Error('Profile not found');
        }

        const profile = profileRes.value.data;
        if (!profile) throw new Error('Profile not found');

        const connections = connectionsRes.status === 'fulfilled'
          ? connectionsRes.value?.data || []
          : [];

        setData({
          profile,
          student: studentRes.status === 'fulfilled' ? studentRes.value.data : null,
          founder: founderRes.status === 'fulfilled' ? founderRes.value.data : null,
          mentor: mentorRes.status === 'fulfilled' ? mentorRes.value.data : null,
          investor: investorRes.status === 'fulfilled' ? investorRes.value.data : null,
        });
        setAvatarUrl(await getCachedAvatarUrl(profile.avatar_url));
        setConnectionStatus(connections.some((conn) => conn.otherUser?.id === userId) ? 'accepted' : null);
        setState({ loading: false, error: null });
      } catch (err) {
        console.error('User profile load failed:', err);
        setState({ loading: false, error: err.message || 'Could not load profile' });
      }
    }

    load();
  }, [userId]);

  const sendConnect = async () => {
    try {
      setBusy(true);
      const res = await backendApi.sendConnect(
        userId,
        `Hi ${data.profile?.full_name || 'there'}, I viewed your profile and would like to connect.`,
        'profile_connection'
      );

      if (res.alreadyConnected || res.status === 'accepted') {
        setConnectionStatus('accepted');
        toast.success('Already connected');
        return;
      }

      setConnectionStatus('pending');
      toast.success('Connection request sent');
    } catch (err) {
      toast.error(err.message || 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  const openMessage = async () => {
    if (connectionStatus !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    try {
      setBusy(true);
      const res = await backendApi.getOrCreateConversation(userId);
      const convId = res.conversationId || res.id || res.data?.id;
      navigate(convId ? `/messages?conv=${convId}` : '/messages');
    } catch (err) {
      toast.error(err.message || 'Could not open messages');
    } finally {
      setBusy(false);
    }
  };

  const { profile, student, founder, mentor, investor } = data;
  const roleLabel = profile?.user_type?.replace(/-/g, ' ') || 'User';
  const headline = useMemo(() => {
    if (founder?.company_name) return founder.company_name;
    if (founder?.idea_title) return founder.idea_title;
    if (student?.idea_title) return student.idea_title;
    if (mentor?.current_role) return mentor.current_role;
    if (investor?.firm_name || investor?.fund_name) return investor.fund_name || investor.firm_name;
    return roleLabel;
  }, [founder, investor, mentor, roleLabel, student]);

  if (state.loading) {
    return (
      <>
        <style>{CSS}</style>
        <div className="min-h-screen flex items-center justify-center">
          <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
        </div>
      </>
    );
  }

  if (state.error) {
    return (
      <>
        <style>{CSS}</style>
        <div className="min-h-screen flex items-center justify-center px-4 page-bg">
          <div className="bg-white rounded-2xl border p-6 text-center">
            <p className="font-bold text-red-600">{state.error}</p>
            <button type="button" onClick={() => navigate(-1)} className="text-sm text-[#1B2D7F] mt-3 inline-block font-bold">
              Back
            </button>
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <style>{CSS}</style>
      <div className="min-h-screen page-bg pt-20 pb-16 px-4">
        <div className="max-w-5xl mx-auto">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5"
          >
            <ArrowLeft className="w-4" />
            Back
          </button>

          <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm lift">
            <div className="flex flex-col sm:flex-row gap-5">
              <div className="w-24 h-24 rounded-2xl g-brand flex items-center justify-center text-white text-2xl font-black overflow-hidden flex-shrink-0">
                {avatarUrl ? (
                  <img src={avatarUrl} alt={profile.full_name || 'Profile'} className="w-full h-full object-cover" />
                ) : (
                  profile.full_name?.[0]?.toUpperCase() || '?'
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                      {profile.full_name || 'User'}
                    </h1>
                    <p className="text-sm text-gray-500 capitalize mt-1">{roleLabel}</p>
                    <p className="text-sm font-semibold text-[#1B2D7F] mt-1">{headline}</p>
                    {profile.location && (
                      <p className="text-sm text-gray-500 flex items-center gap-1 mt-2">
                        <MapPin className="w-4" />
                        {profile.location}
                      </p>
                    )}
                  </div>

                  <div className="flex flex-col sm:flex-row gap-2">
                    <button
                      type="button"
                      onClick={openMessage}
                      disabled={connectionStatus !== 'accepted' || busy}
                      className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
                        connectionStatus === 'accepted'
                          ? 'bg-[#98DE38] text-black'
                          : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      }`}
                    >
                      <MessageSquare className="w-4" />
                      {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
                    </button>

                    {connectionStatus === 'accepted' ? (
                      <button type="button" disabled className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center justify-center gap-2">
                        <ShieldCheck className="w-4" />
                        Connected
                      </button>
                    ) : connectionStatus === 'pending' ? (
                      <button type="button" disabled className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold">
                        Pending
                      </button>
                    ) : (
                      <button type="button" onClick={sendConnect} disabled={busy} className="px-4 py-2 rounded-xl bg-[#98DE38] text-black text-sm font-black flex items-center justify-center gap-2">
                        <UserPlus className="w-4" />
                        Connect
                      </button>
                    )}
                  </div>
                </div>

                {profile.bio && <p className="text-gray-600 mt-4 leading-relaxed">{profile.bio}</p>}
              </div>
            </div>
          </div>

          <div className="space-y-5 mt-5">
            <GrowthSignalPanel
              profile={profile}
              studentProfile={student}
              founderProfile={founder}
              mentorProfile={mentor}
              investorProfile={investor}
              role={profile.user_type}
              compact
            />
            {user?.id !== profile.id && (
              <MatchOutcomeFeedback
                targetUserId={profile.id}
                connectionStatus={connectionStatus}
                context="profile_view"
              />
            )}
            <StudentDetails student={student} />
            <FounderDetails founder={founder} />
            <MentorDetails mentor={mentor} />
            <InvestorDetails investor={investor} />
            <LinksSection profile={profile} student={student} founder={founder} mentor={mentor} investor={investor} />
          </div>
        </div>
      </div>
    </>
  );
}
