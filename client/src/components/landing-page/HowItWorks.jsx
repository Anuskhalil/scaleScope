import React from 'react';
import { Users } from 'lucide-react';
import { Sparkles } from 'lucide-react';
import { Rocket } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

const howItWorks = [
  {
    step: "01",
    title: "Create Your Profile",
    description: "Tell us about your skills, experience, startup idea, and what you're looking for. The more detailed, the better the matches.",
    icon: <Users className="w-8 h-8" />
  },
  {
    step: "02",
    title: "AI Finds Your Matches",
    description: "Our intelligent algorithm analyzes thousands of profiles to find co-founders, mentors, and investors who are perfect for you.",
    icon: <Sparkles className="w-8 h-8" />
  },
  {
    step: "03",
    title: "Connect & Collaborate",
    description: "Review matches, schedule meetings, pitch your ideas, and start building meaningful relationships that drive your startup forward.",
    icon: <Rocket className="w-8 h-8" />
  },
  {
    step: "04",
    title: "Grow & Scale Together",
    description: "Track progress, celebrate milestones, and watch your startup grow with the right team, guidance, and funding in place.",
    icon: <TrendingUp className="w-8 h-8" />
  }
];

export default function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
            How Scale Scope Works
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Our AI-powered platform makes finding the right connections simple, realistic, and effective.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {howItWorks.map((item, idx) => (
            <div key={idx} className="relative">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 h-full">
                <div className="text-6xl font-black text-indigo-200 mb-4">{item.step}</div>
                <div className="text-indigo-600 mb-4">{item.icon}</div>
                <h3 className="text-xl font-bold text-slate-900 mb-3">{item.title}</h3>
                <p className="text-slate-600">{item.description}</p>
              </div>
              {idx < howItWorks.length - 1 && (
                <div className="hidden lg:block absolute top-1/2 -right-4 transform -translate-y-1/2">
                  <ArrowRight className="w-8 h-8 text-indigo-300" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}