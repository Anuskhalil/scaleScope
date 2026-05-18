import React from 'react';
import {
  Brain,
  UserCheck,
  Target,
  TrendingUp,
  Lightbulb,
  MessageSquare,
  BarChart3,
  Shield,
} from 'lucide-react';

const features = [
  {
    icon: Brain,
    title: 'Explainable AI matching',
    description:
      'Matches are based on skills, help-needed areas, commitment, startup domain, profile completeness, and collaboration intent.',
  },
  {
    icon: UserCheck,
    title: 'Co-founder discovery',
    description:
      'Students and founders can find people who complement their strengths and match their startup-building goals.',
  },
  {
    icon: Target,
    title: 'Mentor discovery',
    description:
      'Find mentors based on the exact areas you need help with, such as product strategy, validation, pitch deck, or growth.',
  },
  {
    icon: TrendingUp,
    title: 'Investor readiness',
    description:
      'Help promising ideas become discoverable to investors through stronger profiles, traction signals, and growth tracking.',
  },
  {
    icon: Lightbulb,
    title: 'Startup idea profile',
    description:
      'Showcase your idea title, domain, stage, target audience, value proposition, and the help you need.',
  },
  {
    icon: MessageSquare,
    title: 'Connection-first messaging',
    description:
      'Users can view profiles first, send requests, accept connections, and then start real-time conversations.',
  },
  {
    icon: BarChart3,
    title: 'Role-based dashboard',
    description:
      'Each user sees relevant suggestions, connections, requests, messages, profile progress, and growth indicators.',
  },
  {
    icon: Shield,
    title: 'Trust-focused flow',
    description:
      'Verified auth, profile completion, clear match reasons, and controlled messaging make the platform safer and more credible.',
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex px-4 py-2 rounded-full bg-[#98DE38]/20 text-[#1B2D7F] text-sm font-black mb-4">
            Platform features
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-4">
            Built to create better startup matches
          </h2>

          <p className="text-lg text-slate-600 max-w-3xl mx-auto">
            Scale Scope focuses on realistic matching, trust, and actual collaboration
            instead of random networking.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
          {features.map((feature) => {
            const Icon = feature.icon;

            return (
              <div
                key={feature.title}
                className="group bg-slate-50 rounded-3xl p-6 border border-slate-100 hover:bg-white hover:shadow-xl transition-all"
              >
                <div className="w-12 h-12 bg-[#1B2D7F] rounded-2xl flex items-center justify-center text-[#98DE38] mb-5 group-hover:scale-105 transition-transform">
                  <Icon className="w-6 h-6" />
                </div>

                <h3 className="text-lg font-black text-slate-900 mb-2">
                  {feature.title}
                </h3>

                <p className="text-sm text-slate-600 leading-relaxed">
                  {feature.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}