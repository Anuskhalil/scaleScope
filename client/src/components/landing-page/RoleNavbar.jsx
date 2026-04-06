import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Menu, X, LogOut, User, Settings, Search, 
  MessageSquare, Bell, Home, Users, TrendingUp,
  GraduationCap, Rocket, Briefcase, UserCheck
} from 'lucide-react';
import { useAuth } from '../../auth/AuthContext';
import { supabase } from '../../lib/supabaseClient';
import ScalScopeLogo from '../../assets/Anus Tech logo.png';

export default function RoleNavbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [profileData, setProfileData] = useState(null);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  const userRole = user?.user_metadata?.user_type;

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (user) fetchProfile();
  }, [user]);

  const fetchProfile = async () => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url')
        .eq('id', user.id)
        .single();
      
      if (data) setProfileData(data);
    } catch (error) {
      console.error('Error fetching profile:', error);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // Role-specific navigation items
  const getRoleNavItems = () => {
    const baseItems = [
      { icon: <Home className="w-4 h-4" />, label: 'Dashboard', path: '/dashboard' },
      { icon: <Search className="w-4 h-4" />, label: 'Discover', path: '/discover' },
      { icon: <MessageSquare className="w-4 h-4" />, label: 'Messages', path: '/messages' },
    ];

    switch(userRole) {
      case 'student':
        return [
          ...baseItems,
          { icon: <Users className="w-4 h-4" />, label: 'Find Mentors', path: '/find-mentors' },
          { icon: <Rocket className="w-4 h-4" />, label: 'Find Co-Founders', path: '/find-cofounders' },
        ];
      
      case 'early-stage-founder':
        return [
          ...baseItems,
          { icon: <Users className="w-4 h-4" />, label: 'Find Team', path: '/find-team' },
          { icon: <Briefcase className="w-4 h-4" />, label: 'Find Investors', path: '/find-investors' },
          { icon: <UserCheck className="w-4 h-4" />, label: 'Find Mentors', path: '/find-mentors' },
        ];
      
      case 'mentor':
        return [
          ...baseItems,
          { icon: <GraduationCap className="w-4 h-4" />, label: 'My Mentees', path: '/my-mentees' },
          { icon: <Users className="w-4 h-4" />, label: 'Find Founders', path: '/find-founders' },
        ];
      
      case 'investor':
        return [
          ...baseItems,
          { icon: <TrendingUp className="w-4 h-4" />, label: 'Deal Flow', path: '/deal-flow' },
          { icon: <Rocket className="w-4 h-4" />, label: 'Startups', path: '/startups' },
        ];
      
      default:
        return baseItems;
    }
  };

  const navItems = getRoleNavItems();

  // Get role icon
  const getRoleIcon = () => {
    switch(userRole) {
      case 'student': return <GraduationCap className="w-4 h-4" />;
      case 'early-stage-founder': return <Rocket className="w-4 h-4" />;
      case 'mentor': return <UserCheck className="w-4 h-4" />;
      case 'investor': return <Briefcase className="w-4 h-4" />;
      default: return <User className="w-4 h-4" />;
    }
  };

  // Get avatar or initials
  const getAvatarDisplay = () => {
    if (profileData?.avatar_url) {
      return <img src={profileData.avatar_url} alt="Profile" className="w-full h-full object-cover" />;
    }
    
    const name = profileData?.full_name || user?.email || 'U';
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    return <span className="text-sm font-bold text-white">{initials}</span>;
  };

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md' : 'bg-white/95 backdrop-blur-lg'
    } border-b border-slate-200`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center mt-5">
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src={ScalScopeLogo} 
                alt="Scale Scope Logo" 
                className="h-auto w-60 md:h-14 lg:h-16 object-cover" 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-1">
            {navItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                className="flex items-center gap-2 px-4 py-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all font-medium text-sm"
              >
                {item.icon}
                <span>{item.label}</span>
              </Link>
            ))}
          </div>

          {/* Desktop Right Section */}
          <div className="hidden md:flex items-center gap-4">
            {/* Notifications */}
            <button className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all relative">
              <Bell className="w-5 h-5" />
              <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
            </button>

            {/* Profile Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowProfileMenu(!showProfileMenu)}
                className="flex items-center gap-3 p-2 pr-4 hover:bg-slate-50 rounded-full transition-all"
              >
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                  {getAvatarDisplay()}
                </div>
                <div className="text-left">
                  <div className="text-sm font-semibold text-slate-800 leading-tight">
                    {profileData?.full_name || 'User'}
                  </div>
                  <div className="text-xs text-slate-500 flex items-center gap-1">
                    {getRoleIcon()}
                    {userRole?.replace('-', ' ')}
                  </div>
                </div>
              </button>

              {/* Profile Dropdown Menu */}
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
                    </div>
                    
                    <Link
                      to="/profile"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <User className="w-4 h-4" />
                      <span className="text-sm font-medium">My Profile</span>
                    </Link>
                    
                    <Link
                      to="/settings"
                      onClick={() => setShowProfileMenu(false)}
                      className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 transition-all"
                    >
                      <Settings className="w-4 h-4" />
                      <span className="text-sm font-medium">Settings</span>
                    </Link>
                    
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
            className="md:hidden p-2 text-slate-600"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200">
          <div className="px-4 py-4 space-y-2">
            {/* Profile Section */}
            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl mb-4">
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-600 to-purple-600 flex items-center justify-center">
                {getAvatarDisplay()}
              </div>
              <div>
                <p className="text-sm font-bold text-slate-800">
                  {profileData?.full_name || 'User'}
                </p>
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  {getRoleIcon()}
                  {userRole?.replace('-', ' ')}
                </p>
              </div>
            </div>

            {/* Navigation Items */}
            {navItems.map((item, idx) => (
              <Link
                key={idx}
                to={item.path}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                {item.icon}
                <span className="font-medium">{item.label}</span>
              </Link>
            ))}

            <div className="border-t border-slate-200 mt-4 pt-4 space-y-2">
              <Link
                to="/profile"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <User className="w-4 h-4" />
                <span className="font-medium">My Profile</span>
              </Link>
              
              <Link
                to="/settings"
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-3 px-4 py-3 text-slate-700 hover:bg-slate-50 rounded-xl transition-all"
              >
                <Settings className="w-4 h-4" />
                <span className="font-medium">Settings</span>
              </Link>
              
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
  );
}