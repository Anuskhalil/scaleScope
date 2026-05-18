import React from 'react';
import {
  Users,
  Sparkles,
  Rocket,
  TrendingUp,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';

const howItWorks = [
  {
    step: '01',
    title: 'Create a detailed profile',
    description:
      'Add your education, skills, startup idea, looking-for goals, help-needed areas, and commitment level.',
    icon: Users,
  },
  {
    step: '02',
    title: 'AI analyzes fit',
    description:
      'Scale Scope compares profile intent, skill gaps, help-needed areas, domain, and commitment to suggest realistic matches.',
    icon: Sparkles,
  },
  {
    step: '03',
    title: 'Connect before messaging',
    description:
      'Review full profiles, send a connection request, and start messaging only after both users are connected.',
    icon: ShieldCheck,
  },
  {
    step: '04',
    title: 'Collaborate and grow',
    description:
      'Chat in real time, discover mentors and opportunities, and track growth from your role-based dashboard.',
    icon: TrendingUp,
  },
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex px-4 py-2 rounded-full bg-white border border-slate-200 text-[#1B2D7F] text-sm font-black mb-4">
            How it works
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-4">
            From profile to trusted connection
          </h2>

          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            The platform is designed to reduce random networking and make every
            suggestion explainable, relevant, and useful.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
          {howItWorks.map((item, idx) => {
            const Icon = item.icon;

            return (
              <div key={item.step} className="relative">
                <div className="h-full bg-white rounded-3xl p-7 border border-slate-100 shadow-sm hover:shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-5">
                    <span className="text-5xl font-black text-[#1B2D7F]/10">
                      {item.step}
                    </span>

                    <div className="w-12 h-12 rounded-2xl bg-[#98DE38]/20 text-[#1B2D7F] flex items-center justify-center">
                      <Icon className="w-6 h-6" />
                    </div>
                  </div>

                  <h3 className="text-xl font-black text-slate-900 mb-3">
                    {item.title}
                  </h3>

                  <p className="text-slate-600 leading-relaxed">
                    {item.description}
                  </p>
                </div>

                {idx < howItWorks.length - 1 && (
                  <div className="hidden lg:block absolute top-1/2 -right-4 -translate-y-1/2 z-10">
                    <div className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center">
                      <ArrowRight className="w-4 h-4 text-[#1B2D7F]" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}