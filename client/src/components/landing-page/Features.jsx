import React from 'react';
import { Brain } from 'lucide-react';
import { UserCheck } from 'lucide-react';
import { Target } from 'lucide-react';
import { TrendingUp } from 'lucide-react';
import { Lightbulb } from 'lucide-react';
import { MessageSquare } from 'lucide-react';
import { BarChart3 } from 'lucide-react';
import { Shield } from 'lucide-react';

const features = [
  {
    icon: <Brain className="w-6 h-6" />,
    title: "AI-Powered Smart Matching",
    description: "Our intelligent AI analyzes your profile, skills, goals, and startup vision to connect you with the perfect co-founders, mentors, and investors who align with your journey."
  },
  {
    icon: <UserCheck className="w-6 h-6" />,
    title: "Find Your Ideal Co-Founder",
    description: "Discover co-founders who complement your skills and share your passion. Our AI matches based on expertise, work style, commitment level, and vision alignment."
  },
  {
    icon: <Target className="w-6 h-6" />,
    title: "Connect with Expert Mentors",
    description: "Get paired with industry veterans and successful founders who understand your challenges. Schedule one-on-one sessions, group workshops, and ongoing guidance tailored to your needs."
  },
  {
    icon: <TrendingUp className="w-6 h-6" />,
    title: "Meet the Right Investors",
    description: "AI-driven introductions to investors actively seeking startups in your sector. Pitch directly, schedule meetings, and track your fundraising progress in real-time."
  },
  {
    icon: <Lightbulb className="w-6 h-6" />,
    title: "Idea Validation & Pitching",
    description: "Share your startup ideas, get constructive feedback from the community, refine your pitch, and attract collaborators who believe in your vision."
  },
  {
    icon: <MessageSquare className="w-6 h-6" />,
    title: "Seamless Communication",
    description: "Schedule meetings, conduct video calls, share documents, and collaborate in real-time. Everything you need to build relationships and move fast."
  },
  {
    icon: <BarChart3 className="w-6 h-6" />,
    title: "Track Your Growth",
    description: "Monitor your progress with real metrics. See connections made, meetings completed, feedback received, and milestones achieved on your entrepreneurial journey."
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Trust & Verification",
    description: "Every user is verified. View ratings, past collaborations, and success stories. Build trust through transparent profiles and community endorsements."
  }
];

export default function Features() {
  return (
    <section id="features" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
            Powerful Features That Drive Real Results
          </h2>
          <p className="text-xl text-slate-600 max-w-3xl mx-auto">
            Everything you need to find the right people, build trust, and grow your startup from idea to scale.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, idx) => (
            <div key={idx} className="bg-white rounded-2xl p-8 shadow-sm hover:shadow-xl transition-all border border-slate-100 group">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-xl flex items-center justify-center text-white mb-4 group-hover:scale-110 transition-transform">
                {feature.icon}
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-3">{feature.title}</h3>
              <p className="text-slate-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
