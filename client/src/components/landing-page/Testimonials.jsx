import React from 'react';

// Placeholder data - replace with real testimonials
const testimonials = [
  {
    quote: "ConnectSphere's matching algorithm introduced me to my co-founder. We just closed our pre-seed round!",
    author: 'Jane Doe',
    title: 'Founder, Tech Innovate Inc.',
  },
  {
    quote: "As a student, the mentorship program has been invaluable. I'm learning directly from industry leaders.",
    author: 'John Smith',
    title: 'Computer Science Student',
  },
  {
    quote: 'An essential tool for any early-stage investor. The quality of startups pitching on this platform is unmatched.',
    author: 'Samantha Ray',
    title: 'Angel Investor',
  },
];

export default function Testimonials() {
  return (
    <section className="py-20 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Trusted by the Next Generation of Innovators
          </h2>
        </div>
        <div className="mt-12 grid gap-8 lg:grid-cols-3">
          {testimonials.map((testimonial) => (
            // Purpose: Using a blockquote for semantic HTML for testimonials.
            <blockquote key={testimonial.author} className="bg-slate-50 p-6 rounded-lg shadow-sm">
              <p className="text-slate-700">"{testimonial.quote}"</p>
              <footer className="mt-4">
                <p className="font-semibold text-slate-900">{testimonial.author}</p>
                <p className="text-sm text-slate-500">{testimonial.title}</p>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  );
}