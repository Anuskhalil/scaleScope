import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

export default function CTA() {
  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600">
      <div className="max-w-4xl mx-auto text-center">
        {/* Heading */}
        <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
          Ready to Find Your Perfect Match?
        </h2>
        
        {/* Subheading */}
        <p className="text-xl text-indigo-100 mb-10">
          Join thousands of students, founders, mentors, and investors building the future together.
        </p>
        
        {/* CTA Button - Routes to Register */}
        <Link 
          to="/register" 
          className="inline-flex items-center gap-3 px-10 py-5 bg-white text-indigo-600 rounded-full font-bold text-lg hover:shadow-2xl transition-all transform hover:scale-105"
        >
          Get Started Free <ArrowRight className="w-5 h-5" />
        </Link>
        
        {/* Trust Line */}
        <p className="text-indigo-100 mt-6 text-sm">
          No credit card required • Free forever • Cancel anytime
        </p>
      </div>
    </section>
  );
}