import React from 'react';
import Navbar from '../components/landing-page/Navbar';
import Hero from '../components/landing-page/Hero';
import Features from '../components/landing-page/Features';
import Testimonials from '../components/landing-page/Testimonials';
import CTA from '../components/landing-page/Cta';
import Footer from '../components/landing-page/Footer';

export default function LandingPage() {
  return (
    <div className="bg-white">
      <Navbar />
      <main>
        <Hero />
        <Features />

        {/* --- Promo Video Section --- */}
        <section className="py-20 bg-slate-50">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl font-extrabold text-slate-900">
              See How It Works
            </h2>
            <p className="mt-4 text-lg text-slate-600">
              Watch our quick demo to see the power of connection in action.
            </p>
            {/* Purpose: Responsive video container using the aspect-ratio plugin. */}
            <div className="mt-8 aspect-w-16 aspect-h-9 rounded-lg shadow-2xl overflow-hidden">
              <iframe
                src="https://www.youtube.com/embed/dQw4w9WgXcQ" // Replace with your promo video URL
                title="Promo Video"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>
        </section>

        <Testimonials />
        <CTA />
      </main>
      <Footer />
    </div>
  );
}