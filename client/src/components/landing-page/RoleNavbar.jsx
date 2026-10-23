import React, { useState, useEffect, useCallback } from 'react';
import { FounderRequestConfirmation } from '../FounderAllowance';
import { Link, useNavigate } from 'react-router-dom';
import {
  Menu, X, LogOut, User, Settings, Search, ShieldCheck,
  MessageSquare, Bell, Home, Users, TrendingUp,
  GraduationCap, Rocket, Briefcase, UserCheck
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { normalizeRole } from '../../utils/roles';
import { supabase } from '../../lib/supabaseClient';
import { backendApi } from '../../lib/backendApi';
import { initSocket } from '../../lib/socketClient';
import { getSignedAvatarUrl } from '../../utils/avatarStorage';
import toast from 'react-hot-toast';
import ScalScopeLogo from '../../assets/Anus Tech logo.png';

export default function RoleNavbar() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [billing, setBilling] = useState(null);
  const [unreadMessages, setUnreadMessages] = useState(0);

  useEffect(() => {
    if (!user?.id) return;
    let active = true, socket;
    const seen = new Set();
    async function refresh(notification) {
      try {
        const response = await backendApi.getConversations();
        if (!active) return;
        const rows = response.data || [];
        setUnreadMessages(rows.reduce((sum, row) => sum + Number(row.unreadCount || 0), 0));
        if (!notification?.id || seen.has(notification.id)) return;
        seen.add(notification.id);
        if (seen.size > 200) seen.delete(seen.values().next().value);
        const row = rows.find(item => item.id === notification.conversation_id);
        if (!row) return;
        toast(t => <button onClick={() => {toast.dismiss(t.id); navigate('/messages');}}>
          New message from {row.otherUser?.full_name || 'your connection'}. Open Messages
        </button>, {id: notification.id, duration: 6000});
      } catch { if (active) setUnreadMessages(0); }
    }
    const onMessage = notification => refresh(notification);
    const onRefresh = () => refresh();
    initSocket(user.id).then(value => {
      if (!active || !value) return;
      socket = value;
      socket.on('message:notification', onMessage);
      socket.on('connect', onRefresh);
      socket.on('conv:read', onRefresh);
    });
    refresh();
    const timer = setInterval(onRefresh, 15000);
    window.addEventListener('focus', onRefresh);
    return () => {
      active = false; clearInterval(timer);
      window.removeEventListener('focus', onRefresh);
      socket?.off('message:notification', onMessage);
      socket?.off('connect', onRefresh);
      socket?.off('conv:read', onRefresh);
    };
  }, [user?.id, navigate]);
  // ✅ NEW: Separate state for the resolved avatar URL
  const [avatarUrl, setAvatarUrl] = useState(null);

  const userRole = normalizeRole(
    profileData?.user_type ||
    profile?.user_type ||
    null);

  const fetchProfile = useCallback(async () => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          full_name,
          user_type,
          avatar_url
        `)
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfileData({
          full_name: data.full_name,
          user_type: data.user_type,
          avatar_url: data.avatar_url,
        });

        setAvatarUrl(await getSignedAvatarUrl(data.avatar_url));
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  }, [user?.id]);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user, fetchProfile]);

  useEffect(() => {
    let cancelled = false;

    async function loadBilling() {
      if (!user?.id) {
        setBilling(null);
        return;
      }

      try {
        const data = await backendApi.getMyBilling();
        if (!cancelled) setBilling(data);
      } catch (error) {
        if (!cancelled) setBilling(null);
        console.warn('Billing status unavailable:', error.message);
      }
    }

    loadBilling();
    window.addEventListener('focus', loadBilling);
    window.addEventListener('scalescope:billing-updated', loadBilling);

    return () => {
      cancelled = true;
      window.removeEventListener('focus', loadBilling);
      window.removeEventListener('scalescope:billing-updated', loadBilling);
    };
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return undefined;

    let socket;
    let mounted = true;

    const handleMeetingInvite = (payload = {}) => {
      const meetingTitle = payload.title || 'ScaleScope Meeting';

      toast.custom((t) => (
        <div className="bg-white p-4 rounded-2xl shadow-xl border border-slate-200 max-w-sm">
          <p className="text-sm font-black text-slate-900">Meeting started</p>
          <p className="text-xs text-slate-500 mt-1 line-clamp-2">{meetingTitle}</p>
          <div className="flex gap-2 mt-3">
            <button
              type="button"
              onClick={() => {
                toast.dismiss(t.id);
                navigate(payload.joinPath || `/meetings/${payload.meetingId}`);
              }}
              className="flex-1 py-2 rounded-xl bg-[#98DE38] text-black text-xs font-black"
            >
              Join Meeting
            </button>
            <button
              type="button"
              onClick={() => toast.dismiss(t.id)}
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs font-bold text-slate-600"
            >
              Later
            </button>
          </div>
        </div>
      ), { duration: 30000 });
    };

    async function setupMeetingSocket() {
      socket = await initSocket(user.id);
      if (!mounted || !socket) return;
      socket.on('meeting:invited', handleMeetingInvite);
    }

    setupMeetingSocket();

    return () => {
      mounted = false;
      socket?.off('meeting:invited', handleMeetingInvite);
    };
  }, [navigate, user?.id]);

  const getRoleBasePath = (role) => {
    switch (role) {
      case 'student':
        return '/student';

      case 'early-stage-founder':
        return '/founder';

      case 'mentor':
        return '/mentor';

      case 'investor':
        return '/investor';

      default:
        return '/login';
    }
  };

  const roleBase = getRoleBasePath(userRole);
  const plan = billing?.plan || {};
  const subscription = billing?.subscription || {};
  const hasProPlan = plan.code === 'founder_pro';
  useEffect(() => {
    const showLimit = (event) => toast((notification) => (
      <div className="text-sm max-w-xs">
        <p>{event.detail?.message || 'Monthly connection request limit reached.'}</p>
        <Link to={userRole === 'early-stage-founder' && !hasProPlan ? '/pricing' : '/billing'} onClick={() => toast.dismiss(notification.id)} className="mt-2 inline-block font-semibold underline">
          {userRole === 'early-stage-founder' && !hasProPlan ? 'Compare Founder Pro' : 'View billing and limits'}
        </Link>
      </div>
    ), { id: 'billing-limit', duration: 10000 });
    window.addEventListener('scalescope:usage-limit', showLimit);
    return () => window.removeEventListener('scalescope:usage-limit', showLimit);
  }, [userRole, hasProPlan]);
  const ecosystemAccess =
    plan.metadata?.ecosystem_access ||
    userRole === 'investor';
  const planLabel = ecosystemAccess ? 'Access' : hasProPlan ? 'Pro' : 'Free';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const getRoleNavItems = () => {
    const baseItems = [
      { icon: <Home className="w-3 h-4" />, label: 'Dashboard', path: `${roleBase}/dashboard` },
      { icon: <Search className="w-4 h-4" />, label: 'Discover', path: `${roleBase}/discover` },
      { icon: <MessageSquare className="w-4 h-4" />, label: 'Messages', path: `${roleBase}/messages` },
      { icon: <UserCheck className="w-4 h-4" />, label: 'Trust & connections', path: '/trust-workspace' },
    ];

    switch (userRole) {
      case 'student':
        return [
          ...baseItems,
          { icon: <Users className="w-3 h-4" />, label: 'Find Mentors', path: '/student/find-mentors' },
          { icon: <Rocket className="w-3 h-4" />, label: 'Find Co-Founders', path: '/student/find-cofounders' },
        ];

      case 'early-stage-founder':
        return [
          ...baseItems,
          { icon: <Users className="w-3 h-4" />, label: 'Find Team', path: '/founder/find-team' },
          { icon: <Briefcase className="w-3 h-4" />, label: 'Find Investors', path: '/founder/find-investors' },
          { icon: <UserCheck className="w-3 h-4" />, label: 'AI Mentor', path: '/founder/ai-mentor' },
        ];

      case 'mentor':
        return [
          ...baseItems,
          { icon: <GraduationCap className="w-3 h-4" />, label: 'My Mentees', path: '/mentor/my-mentees' },
          { icon: <Users className="w-3 h-4" />, label: 'Find Founders', path: '/mentor/find-founders' },
        ];

      case 'investor':
        return [
          ...baseItems,
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Startups', path: '/investor/find-startups' },
        ];

      default:
        return baseItems;
    }
  };

  const navItems = getRoleNavItems();

  const getRoleIcon = () => {
    switch (userRole) {
      case 'student': return <GraduationCap className="w-4 h-4" />;
      case 'early-stage-founder': return <Rocket className="w-4 h-4" />;
      case 'mentor': return <UserCheck className="w-4 h-4" />;
      case 'investor': return <Briefcase className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };
  const getAvatarDisplay = () => {
    if (avatarUrl) {
      return <img src={avatarUrl} alt="Profile" className="w-full h-full object-cover rounded-full" />;
    }

    const name = profileData?.full_name || user?.email || 'U';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return <span className="text-sm font-bold text-white">{initials}</span>;
  };

  return (
    <>
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-lg'
      } border-b border-slate-200`}>
      <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 gap-3">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center min-w-0">
            <Link to={`${roleBase}/dashboard`} className="flex items-center gap-2 group min-w-0">
              <img
                src={ScalScopeLogo}
                alt="Scale Scope Logo"
                className="w-36 sm:w-44 h-12 object-cover"
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden min-[1440px]:flex items-center gap-1">
            {navItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                className="flex shrink-0 whitespace-nowrap items-center gap-1.5 px-2 py-2 text-slate-600 hover:text-[#1B2D7F] hover:bg-[#98DE38]/15 rounded-lg transition-all font-medium text-sm"
              >
                {item.icon}
                <span>{item.label}</span>
                {item.label === 'Messages' && unreadMessages > 0 && <span aria-label={`${unreadMessages} unread messages`} className="rounded-full bg-[#98DE38] px-1.5 text-xs text-black">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
              </Link>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden min-[1440px]:flex shrink-0 items-center gap-2">
            {/* <button className="p-2 text-slate-600 hover:text-[#1B2D7F] hover:bg-[#98DE38]/15 rounded-lg transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button> */}

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-2 pr-4 hover:bg-slate-50 rounded-full transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1B2D7F] to-[#2A3F8F] flex items-center justify-center overflow-hidden">
                  {getAvatarDisplay()}
                </div>
                <div className="text-left min-w-0 max-w-44">
                  <div className="text-sm font-semibold text-slate-800 leading-tight truncate">
                    {profileData?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-slate-500 flex flex-wrap items-center gap-1">
                    {getRoleIcon()}
                    {userRole?.replace('-', ' ')}
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                      hasProPlan || ecosystemAccess ? 'bg-[#98DE38]/25 text-[#1B2D7F]' : 'bg-slate-100 text-slate-500'
                    }`}>
                      {planLabel}
                    </span>
                  </div>
                </div>
              </button>

              {showProfileMenu && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setShowProfileMenu(false)}
                  ></div>
                  <div className="absolute right-0 mt-2 w-64 bg-white rounded-2xl shadow-xl border border-slate-200 py-2 z-20">
                    <div className="px-4 py-3 border-b border-slate-100">
                      <p className="text-sm font-bold text-slate-800">
                        {profileData?.full_name || user?.email}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">{user?.email}</p>
                      <div className="mt-2 inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-slate-50 border border-slate-100">
                        <span className="text-[11px] font-black text-[#1B2D7F] uppercase">
                          {plan.name || 'Free'}
                        </span>
                        <span className={`text-[10px] font-black uppercase ${
                          hasProPlan || ecosystemAccess ? 'text-green-700' : 'text-slate-400'
                        }`}>
                          {ecosystemAccess ? 'free' : subscription.status || 'free'}
                        </span>
                      </div>
                    </div>

                    <Link
                      to={roleBase === '/login' ? '/login' : `${roleBase}/profile`}
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">My Profile</span>
                    </Link>

                    <Link
                      to="/mfa/setup"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <ShieldCheck className="w-4 h-4 shrink-0" />
                      <span className="text-sm font-medium">Two-factor authentication</span>
                    </Link>

                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Settings</span>
                    </Link>

                    <Link
                      to="/billing"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Briefcase className="w-4 h-4" />
                      <span className="text-sm font-medium">Billing</span>
                    </Link>
                    {userRole === 'early-stage-founder' && !hasProPlan && <Link to="/pricing" onClick={() => setShowProfileMenu(false)} className="flex items-center gap-3 px-4 py-3 bg-[#98DE38]/20 text-[#1B2D7F] font-semibold"><Rocket className="w-4 h-4"/>Explore Founder Pro</Link>}

                    <div className="border-t border-slate-100 mt-2 pt-2">
                      <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 transition-all w-full"
                      >
                        <LogOut className="w-4 h-4" />
                        <span className="text-sm font-medium">Sign Out</span>
                      </button>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="min-[1440px]:hidden shrink-0 p-2 text-slate-600"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
            aria-controls="role-mobile-menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div id="role-mobile-menu" className="min-[1440px]:hidden max-h-[calc(100dvh-4rem)] overflow-y-auto bg-white border-t border-slate-200">
          <div className="px-4 py-4 space-y-2">
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-[#1B2D7F] to-[#2A3F8F] flex items-center justify-center overflow-hidden">
                {getAvatarDisplay()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {profileData?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {getRoleIcon()}
                  {userRole?.replace('-', ' ')}
                  <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                    hasProPlan || ecosystemAccess ? 'bg-[#98DE38]/25 text-[#1B2D7F]' : 'bg-white text-slate-500'
                  }`}>
                    {planLabel}
                  </span>
                </p>
              </div>
            </div>

            {navItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
                {item.label === 'Messages' && unreadMessages > 0 && <span aria-label={`${unreadMessages} unread messages`} className="rounded-full bg-[#98DE38] px-1.5 text-xs text-black">{unreadMessages > 99 ? '99+' : unreadMessages}</span>}
              </Link>
            ))}

            <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
              <Link
                to={roleBase === '/login' ? '/login' : `${roleBase}/profile`}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <User className="w-4 h-4" />
                <span className="font-medium">My Profile</span>
              </Link>

              <Link
                to="/mfa/setup"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <ShieldCheck className="w-4 h-4 shrink-0" />
                <span className="font-medium">Two-factor authentication</span>
              </Link>

              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Settings</span>
              </Link>

              <Link
                to="/billing"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <Briefcase className="w-4 h-4" />
                <span className="font-medium">Billing</span>
              </Link>
              {userRole === 'early-stage-founder' && !hasProPlan && <Link to="/pricing" onClick={() => setMobileMenuOpen(false)} className="flex items-center gap-3 px-4 py-3 bg-[#98DE38]/20 rounded-lg text-[#1B2D7F] font-semibold"><Rocket className="w-4 h-4"/>Explore Founder Pro</Link>}

              <button
                onClick={handleLogout}
                className="flex items-center gap-3 px-4 py-3 text-red-600 hover:bg-red-50 rounded-xl transition-all w-full"
              >
                <LogOut className="w-4 h-4" />
                <span className="font-medium">Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </nav>
    <FounderRequestConfirmation enabled={userRole === 'early-stage-founder'} />
    </>
  );
}
