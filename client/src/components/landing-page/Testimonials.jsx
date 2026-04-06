import React from 'react';
import { Star } from 'lucide-react';
import { useState } from 'react';

const testimonials = [
  {
    quote: "Scale Scope's AI matched me with my co-founder in just two weeks. We've already launched our MVP and raised our first round. The platform's smart matching truly works!",
    author: "Sarah Chen",
    role: "Founder, EduTech Startup",
    rating: 5
  },
  {
    quote: "As a student with just an idea, I had no clue where to start. Scale Scope connected me with a mentor who guided me through validation, and now I'm building my first startup with an amazing team.",
    author: "Marcus Johnson",
    role: "Student Founder, HealthTech",
    rating: 5
  },
  {
    quote: "I've invested in three promising startups I discovered through Scale Scope. The quality of founders and the AI's ability to match my investment thesis is impressive.",
    author: "Rachel Park",
    role: "Angel Investor",
    rating: 5
  },
  {
    quote: "The platform helped me find not just one, but multiple mentors in different areas. Their guidance has been invaluable in navigating the early-stage challenges of building a company.",
    author: "David Kumar",
    role: "Early-Stage Founder",
    rating: 5
  }
];

export default function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);

  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-white">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-16">
          <h2 className="text-4xl lg:text-5xl font-black text-slate-900 mb-4">
            Real Success Stories
          </h2>
          <p className="text-xl text-slate-600">
            See how Scale Scope has helped thousands build their dream teams
          </p>
        </div>

        <div className="relative">
          <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl p-8 md:p-12">
            <div className="flex items-start gap-2 mb-6">
              {[...Array(testimonials[activeTestimonial].rating)].map((_, i) => (
                <Star key={i} className="w-5 h-5 fill-yellow-400 text-yellow-400" />
              ))}
            </div>

            <blockquote className="text-xl md:text-2xl text-slate-900 font-medium mb-8 leading-relaxed">
              "{testimonials[activeTestimonial].quote}"
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-indigo-600 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                {testimonials[activeTestimonial].author.charAt(0)}
              </div>
              <div>
                <div className="font-bold text-slate-900">{testimonials[activeTestimonial].author}</div>
                <div className="text-slate-600 text-sm">{testimonials[activeTestimonial].role}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setActiveTestimonial(idx)}
                className={`w-2 h-2 rounded-full transition-all ${idx === activeTestimonial ? 'bg-indigo-600 w-8' : 'bg-slate-300'}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}