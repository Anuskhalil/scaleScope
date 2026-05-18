import {
    Award,
    Rocket,
    Users,
    TrendingUp,
    CheckCircle,
    ArrowRight,
  } from 'lucide-react';
  import { Link } from 'react-router-dom';
  
  const userTypes = [
    {
      title: 'Students',
      label: 'Idea to first team',
      description:
        'Students can turn an idea into action by finding co-founders, mentors, startup guidance, and opportunity discovery.',
      icon: Award,
      benefits: [
        'Find compatible co-founders',
        'Discover mentors based on help-needed areas',
        'Explore internships, hackathons, and funding',
        'Build a trusted startup profile',
      ],
    },
    {
      title: 'Early-Stage Founders',
      label: 'Build and grow faster',
      description:
        'Founders can fill team gaps, find mentors, discover investors, and track startup growth from one dashboard.',
      icon: Rocket,
      benefits: [
        'Find team members and co-founders',
        'Connect with relevant mentors',
        'Prepare for investor discovery',
        'Track milestones and startup progress',
      ],
    },
    {
      title: 'Mentors',
      label: 'Guide the right builders',
      description:
        'Mentors can discover students and founders who need their exact experience, skills, and guidance.',
      icon: Users,
      benefits: [
        'Get matched with relevant founders',
        'Support ideas in your domain',
        'Schedule focused conversations',
        'Build impact and network',
      ],
    },
    {
      title: 'Investors',
      label: 'Discover early potential',
      description:
        'Investors can discover student ideas and early-stage startups aligned with their sectors and interests.',
      icon: TrendingUp,
      benefits: [
        'Find emerging startups',
        'Review founder profiles and traction',
        'Connect with promising teams',
        'Track future investment opportunities',
      ],
    },
  ];
  
  export default function UserType() {
    return (
      <section id="user-types" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <span className="inline-flex px-4 py-2 rounded-full bg-[#98DE38]/20 text-[#1B2D7F] text-sm font-black mb-4">
              Built for the startup ecosystem
            </span>
  
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-4">
              One platform, four connected roles
            </h2>
  
            <p className="text-lg text-slate-600 max-w-3xl mx-auto">
              Scale Scope connects people by intent: students with ideas, founders
              building teams, mentors giving guidance, and investors discovering future opportunities.
            </p>
          </div>
  
          <div className="grid md:grid-cols-2 gap-6">
            {userTypes.map((type) => {
              const Icon = type.icon;
  
              return (
                <div
                  key={type.title}
                  className="group bg-slate-50 rounded-3xl p-7 sm:p-8 border border-slate-100 hover:bg-white hover:shadow-xl transition-all"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-14 h-14 rounded-2xl bg-[#1B2D7F] text-[#98DE38] flex items-center justify-center flex-shrink-0 group-hover:scale-105 transition-transform">
                      <Icon className="w-7 h-7" />
                    </div>
  
                    <div>
                      <p className="text-xs font-black uppercase tracking-wider text-[#1B2D7F] mb-1">
                        {type.label}
                      </p>
                      <h3 className="text-2xl font-black text-slate-900 mb-2">
                        For {type.title}
                      </h3>
                      <p className="text-slate-600 leading-relaxed">
                        {type.description}
                      </p>
                    </div>
                  </div>
  
                  <ul className="grid sm:grid-cols-2 gap-3 mt-6">
                    {type.benefits.map((benefit) => (
                      <li
                        key={benefit}
                        className="flex items-start gap-2 text-sm text-slate-700"
                      >
                        <CheckCircle className="w-5 h-5 text-[#98DE38] flex-shrink-0" />
                        <span className="font-semibold">{benefit}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
  
          <div className="text-center mt-10">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#98DE38] text-black font-black hover:shadow-lg transition-all"
            >
              Choose your role
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>
    );
  }