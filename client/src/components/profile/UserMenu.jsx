import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabaseClient';

export default function UserMenu({ user }) {
  const [isOpen, setIsOpen] = useState(false);
  const menuRef = useRef();
  const navigate = useNavigate();
  const role = user?.user_metadata?.user_type;

  // Role-Specific Action Links
  const roleLinks = {
    student: { label: "💡 My Pitch", path: "/my-pitch" },
    'early-stage-founder': { label: "🚀 Startup Deck", path: "/startup-deck" },
    mentor: { label: "🧑‍🏫 Requests", path: "/mentor-requests" },
    investor: { label: "💎 Deal Flow", path: "/deal-flow" }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  return (
    <div className="relative" ref={menuRef}>
      <button 
        onClick={() => setIsOpen(!isOpen)} 
        className="flex items-center gap-3 p-1 rounded-full hover:bg-slate-100 transition-all focus:outline-none"
      >
        <div className="text-right hidden lg:block">
          <p className="text-sm font-bold text-slate-900 leading-none">{user.user_metadata.full_name}</p>
          <p className="text-[10px] font-black uppercase tracking-widest text-indigo-500 mt-1">{role?.replace('-', ' ')}</p>
        </div>
        <img 
          src={`https://api.dicebear.com/7.x/initials/svg?seed=${user.user_metadata.full_name}`} 
          className="w-10 h-10 rounded-full border-2 border-white shadow-sm"
        />
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-3 w-64 bg-white rounded-3xl shadow-2xl border border-slate-100 py-4 z-50 animate-in fade-in slide-in-from-top-2">
          {/* Section 1: Role Quick Link */}
          <div className="px-4 mb-3">
            <Link 
              to={roleLinks[role]?.path || "/"} 
              className="block w-full text-center bg-indigo-50 text-indigo-600 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider hover:bg-indigo-600 hover:text-white transition-all"
            >
              {roleLinks[role]?.label || "Dashboard"}
            </Link>
          </div>

          {/* Section 2: General Links */}
          <div className="border-t border-slate-50 pt-2">
            <Link to="/profile" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-all">
               👤 View Profile
            </Link>
            <Link to="/settings" className="block px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 font-bold transition-all">
               ⚙️ Settings
            </Link>
          </div>

          {/* Section 3: Sign Out */}
          <div className="border-t border-slate-50 mt-2 pt-2">
            <button 
              onClick={handleSignOut}
              className="w-full text-left px-4 py-2.5 text-red-500 font-black text-xs uppercase tracking-widest hover:bg-red-50 transition-all"
            >
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
    
  );
  
}