import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, ShieldCheck } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-[#1B2D7F] relative overflow-hidden">
      <div className="absolute -top-32 -left-24 w-72 h-72 bg-[#98DE38]/20 rounded-full blur-3xl" />
      <div className="absolute -bottom-32 -right-24 w-72 h-72 bg-white/10 rounded-full blur-3xl" />

      <div className="relative max-w-4xl mx-auto text-center">
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/10 text-[#98DE38] text-sm font-black mb-6">
          <ShieldCheck className="w-4 h-4" />
          Start with a trusted profile
        </div>

        <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white mb-6">
          Ready to discover your next co-founder, mentor, or opportunity?
        </h2>

        <p className="text-lg sm:text-xl text-white/75 mb-10 max-w-2xl mx-auto">
          Create your Scale Scope profile and let AI help you find people who match
          your skills, goals, startup idea, and collaboration needs.
        </p>

        <Link
          to="/register"
          className="inline-flex w-full sm:w-auto items-center justify-center gap-3 px-7 sm:px-9 py-4 bg-[#98DE38] text-black rounded-full font-black text-base sm:text-lg hover:shadow-2xl hover:shadow-lime-300/30 transition-all"
        >
          Create Free Account
          <ArrowRight className="w-5 h-5" />
        </Link>

        <p className="text-white/60 mt-6 text-sm">
          Free to join · Role-based profile · AI-powered matching
        </p>
      </div>
    </section>
  );
}
