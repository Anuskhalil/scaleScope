import React from 'react';

// Landing Page Components
import Navbar from '../components/landing-page/Navbar';
import Hero from '../components/landing-page/Hero';
import UserType from '../components/landing-page/UserType';
import Features from '../components/landing-page/Features';
import HowItWorks from '../components/landing-page/HowItWorks';
import Testimonials from '../components/landing-page/Testimonials';
import CTA from '../components/landing-page/Cta';
import Footer from '../components/landing-page/Footer';

export default function LandingPage() {
  return (
    <div className="bg-white">
      <Navbar />

      <main>
        <Hero />
        <UserType />
        <HowItWorks />
        <Features />
        <Testimonials />
        <CTA />
      </main>

      <Footer />
    </div>
  );
}