import React from 'react';

export default function UserDashboard({ user }) {
  const role = user.user_metadata.user_type;
  const fullName = user.user_metadata.full_name;

  // Helper function to render cards based on role-specific logic
  const renderFeatures = () => {
    switch (role) {
      case 'student':
        return (
          <>
            <ActionCard title="💡 Pitch an Idea" desc="Submit your startup concept for feedback." color="indigo" />
            <ActionCard title="🤝 Find Smart Team" desc="Use AI to match with technical or business partners." color="blue" />
            <ActionCard title="🎓 Skill Development" desc="Find mentors to guide your learning journey." color="purple" />
          </>
        );
      case 'early-stage-startup':
        return (
          <>
            <ActionCard title="🚀 Active Pitches" desc="Manage your active pitch decks and updates." color="green" />
            <ActionCard title="💰 Find Investors" desc="Connect with angel investors interested in your sector." color="emerald" />
            <ActionCard title="🛠️ Team Builder" desc="Scale your startup by finding talented students." color="indigo" />
          </>
        );
      case 'mentor':
        return (
          <>
            <ActionCard title="🧑‍🏫 Pending Requests" desc="Review students and startups asking for guidance." color="orange" />
            <ActionCard title="🗓️ Office Hours" desc="Set your availability for virtual mentoring sessions." color="amber" />
            <ActionCard title="📈 Impact Tracking" desc="See how your advice is helping ideas scale." color="blue" />
          </>
        );
      case 'investor':
        return (
          <>
            <ActionCard title="💎 Deal Flow" desc="Browse AI-vetted startup pitches and business plans." color="rose" />
            <ActionCard title="📊 Portfolio" desc="Track the progress of startups you've connected with." color="pink" />
            <ActionCard title="🔍 Advanced Search" desc="Filter by industry, revenue, or team background." color="indigo" />
          </>
        );
      default:
        return <ActionCard title="✨ Exploring" desc="Explore the scaleScope hub features." color="slate" />;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8 bg-white min-h-screen mt-20">
      {/* Header Section */}
      <header className="mb-12 border-b border-slate-100 pb-8 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">
            Hello, {fullName.split(' ')[0]} 👋
          </h1>
          <p className="text-slate-500 mt-2 text-lg">
            Welcome to your <span className="font-semibold text-indigo-600 capitalize">{role.replace('-', ' ')}</span> command center.
          </p>
        </div>
        <div className="flex gap-3">
          <button className="px-4 py-2 bg-slate-100 text-slate-700 rounded-lg font-medium hover:bg-slate-200 transition-colors">
            Account Settings
          </button>
          <button className="px-4 py-2 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 shadow-sm shadow-indigo-200 transition-all">
            New Project +
          </button>
        </div>
      </header>

      {/* Stats/Overview Row (Optional but looks great) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-12">
        <StatItem label="Connections" value="12" />
        <StatItem label="Messages" value="5" />
        <StatItem label="Active Pitches" value="2" />
        <StatItem label="Profile Views" value="84" />
      </div>

      {/* Main Feature Grid */}
      <div>
        <h2 className="text-xl font-bold text-slate-800 mb-6">Your Toolkit</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {renderFeatures()}
        </div>
      </div>
    </div>
  );
}

// Sub-component for clean code
function ActionCard({ title, desc, color }) {
  const colorMap = {
    indigo: "border-indigo-500 bg-indigo-50 text-indigo-900",
    blue: "border-blue-500 bg-blue-50 text-blue-900",
    purple: "border-purple-500 bg-purple-50 text-purple-900",
    green: "border-green-500 bg-green-50 text-green-900",
    emerald: "border-emerald-500 bg-emerald-50 text-emerald-900",
    orange: "border-orange-500 bg-orange-50 text-orange-900",
    amber: "border-amber-500 bg-amber-50 text-amber-900",
    rose: "border-rose-500 bg-rose-50 text-rose-900",
    pink: "border-pink-500 bg-pink-50 text-pink-900",
    slate: "border-slate-500 bg-slate-50 text-slate-900",
  };

  return (
    <div className={`p-6 rounded-2xl border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer group ${colorMap[color] || colorMap.indigo}`}>
      <h3 className="text-xl font-bold mb-2 group-hover:translate-x-1 transition-transform">{title}</h3>
      <p className="text-sm opacity-80">{desc}</p>
      <div className="mt-4 text-xs font-bold uppercase tracking-wider flex items-center">
        Launch Action <span className="ml-2">→</span>
      </div>
    </div>
  );
}

function StatItem({ label, value }) {
  return (
    <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
      <p className="text-xs text-slate-500 uppercase font-bold tracking-widest">{label}</p>
      <p className="text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}