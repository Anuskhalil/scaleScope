import React from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Sparkles,
  ShieldCheck,
  Users,
  Brain,
} from 'lucide-react';

const trustPoints = [
  'Free to join',
  'Profile-based AI matching',
  'Connection-first messaging',
];

const platformSignals = [
  { value: '4', label: 'User roles', sub: 'Students, founders, mentors, investors' },
  { value: 'AI', label: 'Smart matching', sub: 'Skills, needs, goals, commitment' },
  { value: '1:1', label: 'Real connections', sub: 'Connect, accept, then message' },
  { value: 'Live', label: 'Growth dashboard', sub: 'Track profile and connections' },
];

export default function Hero() {
  return (
    <div>
      <section className="relative overflow-hidden pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-[#F8FFE9] via-white to-[#EEF2FF]">
        <div className="absolute -top-32 -left-32 w-72 h-72 bg-[#98DE38]/30 rounded-full blur-3xl" />
        <div className="absolute top-24 -right-32 w-80 h-80 bg-[#1B2D7F]/10 rounded-full blur-3xl" />

        <div className="relative max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <div className="text-center lg:text-left">
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-white border border-lime-200 rounded-full text-[#1B2D7F] font-black text-sm mb-6 shadow-sm">
                <Sparkles className="w-4 h-4 text-[#98DE38]" />
                AI-powered startup matching platform
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-7xl font-black tracking-tight text-slate-950 mb-6 leading-[1.03]">
                Find the right people to build your startup with.
              </h1>

              <p className="text-lg sm:text-xl text-slate-600 mb-8 max-w-2xl mx-auto lg:mx-0 leading-relaxed">
                Scale Scope helps students and early-stage founders discover trusted
                co-founders, mentors, and investors through profile-based AI matching,
                connection requests, and real-time collaboration.
              </p>

              <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                <Link
                  to="/register"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-[#98DE38] text-black rounded-full font-black text-lg hover:shadow-xl hover:shadow-lime-300/50 transition-all"
                >
                  Start Free
                  <ArrowRight className="w-5 h-5" />
                </Link>

                <a
                  href="#how-it-works"
                  className="inline-flex items-center justify-center gap-2 px-8 py-4 bg-white text-[#1B2D7F] rounded-full font-black text-lg border-2 border-slate-200 hover:border-[#98DE38] transition-all"
                >
                  See How It Works
                </a>
              </div>

              <div className="mt-10 flex flex-wrap items-center justify-center lg:justify-start gap-5 text-sm text-slate-600">
                {trustPoints.map((point) => (
                  <div key={point} className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-[#98DE38]" />
                    <span className="font-semibold">{point}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              <div className="bg-white rounded-[2rem] border border-slate-100 shadow-2xl p-5 sm:p-6">
                <div className="flex items-center justify-between mb-5">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wider text-slate-400">
                      AI Match Preview
                    </p>
                    {/* <h3 className="text-xl font-black text-slate-900">
                      Co-Founder Fit
                    </h3> */}
                  </div>
                  {/* <div className="w-12 h-12 rounded-2xl bg-[#98DE38]/20 flex items-center justify-center">
                    <Brain className="w-6 h-6 text-[#1B2D7F]" />
                  </div> */}
                </div>

                <div className="space-y-4">
                  {/* <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-slate-900">Usman Ali Shah</p>
                      <span className="px-2.5 py-1 rounded-full bg-[#98DE38]/20 text-[#1B2D7F] text-xs font-black">
                        72% Match
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Strong technical complement · Similar commitment · Startup-active
                    </p>
                  </div> */}

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="flex items-center justify-between mb-2">
                      <p className="font-bold text-slate-900">Mentor Suggestion</p>
                      <span className="px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-black">
                        Relevant
                      </span>
                    </div>
                    <p className="text-sm text-slate-500">
                      Matches your help-needed areas: product strategy and validation.
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl bg-[#1B2D7F] text-white">
                      <Users className="w-5 h-5 mb-2 text-[#98DE38]" />
                      <p className="text-xs text-white/70">Connection flow</p>
                      <p className="font-black">Request → Accept → Chat</p>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#98DE38] text-black">
                      <ShieldCheck className="w-5 h-5 mb-2" />
                      <p className="text-xs text-black/60">Trust layer</p>
                      <p className="font-black">Profile-first matching</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="absolute -bottom-10 -left-5 hidden sm:block bg-white rounded-2xl shadow-xl border border-slate-100 p-4">
                <p className="text-xs text-slate-500">Dashboard shows</p>
                <p className="text-lg font-black text-[#1B2D7F]">Top 5 best matches</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 bg-white border-y border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-2 lg:grid-cols-4 gap-6">
          {platformSignals.map((stat) => (
            <div key={stat.label} className="text-center lg:text-left">
              <div className="text-3xl lg:text-4xl font-black text-[#1B2D7F]">
                {stat.value}
              </div>
              <div className="font-black text-slate-900">{stat.label}</div>
              <div className="text-sm text-slate-500 mt-1">{stat.sub}</div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}