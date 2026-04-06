import React from 'react';
import { useAuth } from '../auth/AuthContext';

// Landing Page Components
import Navbar from '../components/landing-page/Navbar';
import Hero from '../components/landing-page/Hero';
import UserType from '../components/landing-page/UserType';
import Features from '../components/landing-page/Features';
import HowItWorks from '../components/landing-page/HowItWorks';
import Testimonials from '../components/landing-page/Testimonials';
import CTA from '../components/landing-page/Cta';
import Footer from '../components/landing-page/Footer';

// Role-Based Navbar and Dashboard
import RoleNavbar from '../components/landing-page/RoleNavbar';
import UserDashboard from '../components/platform/UserDashboard';

export default function LandingPage() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* CONDITIONAL NAVBAR - Show RoleNavbar when logged in, regular Navbar when logged out */}
      {user ? <RoleNavbar /> : <Navbar />}
      
      <main>
        {user ? (
          <div className="animate-in fade-in duration-700">
            <UserDashboard user={user} />
          </div>
        ) : (
          <>
            <Hero />
            <UserType />
            <HowItWorks />
            <Features />
            <Testimonials />
            <CTA />
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}