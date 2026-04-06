import React from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, ArrowRight, CheckCircle } from 'lucide-react';

const stats = [
  { value: "10K+", label: "Active Users" },
  { value: "2,500+", label: "Successful Matches" },
  { value: "500+", label: "Expert Mentors" },
  { value: "98%", label: "Satisfaction Rate" }
];

export default function Hero() {
  return (
    <div>
      {/* Hero Section */}
      <section className="pt-32 pb-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-50 via-purple-50 to-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-100 rounded-full text-indigo-700 font-semibold text-sm mb-6">
              <Sparkles className="w-4 h-4" />
              AI-Powered Startup Ecosystem
            </div>

            {/* Main Heading */}
            <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 mb-6">
              Connect with Your
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Perfect Co-Founder,
              </span>
              <span className="block bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
                Mentor & Investor
              </span>
            </h1>

            {/* Subheading */}
            <p className="text-xl text-slate-600 mb-10 max-w-3xl mx-auto leading-relaxed">
              Scale Scope uses advanced AI to match students and early-stage founders with the perfect co-founders, mentors, and investors. Build meaningful relationships, validate your ideas, and grow your startup with confidence.
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {/* Primary CTA - Routes to Register */}
              <Link 
                to="/register" 
                className="px-8 py-4 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-bold text-lg hover:shadow-xl hover:shadow-indigo-500/50 transition-all transform hover:scale-105 flex items-center justify-center gap-2"
              >
                Start Matching Now <ArrowRight className="w-5 h-5" />
              </Link>
              
              {/* Secondary CTA - Smooth scroll to features */}
              <a 
                href="#how-it-works" 
                className="px-8 py-4 bg-white text-slate-900 rounded-full font-bold text-lg border-2 border-slate-200 hover:border-indigo-600 hover:bg-slate-50 transition-all"
              >
                Watch Demo
              </a>
            </div>

            {/* Trust Indicators */}
            <div className="mt-12 flex flex-wrap items-center justify-center gap-6 sm:gap-8 text-sm text-slate-600">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Free to join</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>AI-powered matching</span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <span>Verified profiles</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-white border-y border-slate-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8">
            {stats.map((stat, idx) => (
              <div key={idx} className="text-center">
                <div className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent mb-2">
                  {stat.value}
                </div>
                <div className="text-slate-600 font-medium">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}