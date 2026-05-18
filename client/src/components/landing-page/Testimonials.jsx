import React, { useState } from 'react';
import { Star, Quote } from 'lucide-react';

const testimonials = [
  {
    quote:
      'The idea of matching students by skills, startup interest, and help-needed areas solves a real discovery problem for early builders.',
    author: 'Student Founder',
    role: 'AI / SaaS idea stage',
    rating: 5,
  },
  {
    quote:
      'A connection-first flow is important. It helps avoid random messaging and makes the platform feel more professional and trusted.',
    author: 'Early-Stage Founder',
    role: 'MVP stage',
    rating: 5,
  },
  {
    quote:
      'For mentors, the value is clear: discover students who actually need your expertise instead of manually searching through profiles.',
    author: 'Startup Mentor',
    role: 'Product & validation',
    rating: 5,
  },
];

export default function Testimonials() {
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const active = testimonials[activeTestimonial];

  return (
    <section id="testimonials" className="py-20 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="max-w-5xl mx-auto">
        <div className="text-center mb-14">
          <span className="inline-flex px-4 py-2 rounded-full bg-white border border-slate-200 text-[#1B2D7F] text-sm font-black mb-4">
            Early feedback
          </span>

          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-950 mb-4">
            Designed around real founder problems
          </h2>

          <p className="text-lg text-slate-600">
            Scale Scope is being built to make startup discovery more trusted,
            focused, and useful.
          </p>
        </div>

        <div className="relative">
          <div className="bg-white rounded-[2rem] p-8 md:p-12 border border-slate-100 shadow-sm">
            <Quote className="w-10 h-10 text-[#98DE38] mb-5" />

            <div className="flex items-center gap-1 mb-6">
              {[...Array(active.rating)].map((_, i) => (
                <Star
                  key={i}
                  className="w-5 h-5 fill-yellow-400 text-yellow-400"
                />
              ))}
            </div>

            <blockquote className="text-xl md:text-2xl text-slate-900 font-bold mb-8 leading-relaxed">
              “{active.quote}”
            </blockquote>

            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-[#1B2D7F] rounded-2xl flex items-center justify-center text-[#98DE38] font-black">
                {active.author.charAt(0)}
              </div>

              <div>
                <div className="font-black text-slate-900">{active.author}</div>
                <div className="text-slate-500 text-sm">{active.role}</div>
              </div>
            </div>
          </div>

          <div className="flex justify-center gap-2 mt-8">
            {testimonials.map((item, idx) => (
              <button
                key={item.author}
                type="button"
                onClick={() => setActiveTestimonial(idx)}
                aria-label={`Show testimonial ${idx + 1}`}
                className={`h-2 rounded-full transition-all ${
                  idx === activeTestimonial
                    ? 'bg-[#1B2D7F] w-8'
                    : 'bg-slate-300 w-2'
                }`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}