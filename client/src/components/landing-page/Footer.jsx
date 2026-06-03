import React from 'react';
import { Link } from 'react-router-dom';
import ScalScopeLogo from '../../assets/Anus Tech logo.png';
import { Zap } from 'lucide-react';

const year = new Date().getFullYear();

export default function Footer() {
  return (
    <footer className="bg-slate-950 text-slate-400 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div className="md:col-span-2">
            <div className="flex items-center gap-2 mb-4">
              {/* Logo */}
              <div className="flex-shrink-0 flex items-center mt-2 md:mt-5 min-w-0">
                <Link to="/" className="flex items-center gap-2 group min-w-0">
                  <img
                    src={ScalScopeLogo}
                    alt="Scale Scope Logo"
                    className="h-auto w-40 sm:w-52 md:w-60 md:h-14 lg:h-16 object-cover"
                  />
                </Link>
              </div>
            </div>

            <p className="text-slate-400 max-w-md leading-relaxed">
              AI-powered platform helping students, founders, mentors, and investors
              discover trusted startup connections and opportunities.
            </p>
          </div>

          <div>
            <h4 className="text-white font-black mb-4">Platform</h4>
            <ul className="space-y-2">
              <li>
                <a href="#features" className="hover:text-[#98DE38] transition-colors">
                  Features
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#98DE38] transition-colors">
                  How It Works
                </a>
              </li>
              <li>
                <a href="#user-types" className="hover:text-[#98DE38] transition-colors">
                  User Roles
                </a>
              </li>
              <li>
                <a href="#testimonials" className="hover:text-[#98DE38] transition-colors">
                  Stories
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-white font-black mb-4">Get Started</h4>
            <ul className="space-y-2">
              <li>
                <Link to="/register" className="hover:text-[#98DE38] transition-colors">
                  Create Account
                </Link>
              </li>
              <li>
                <Link to="/login" className="hover:text-[#98DE38] transition-colors">
                  Log In
                </Link>
              </li>
              <li>
                <a href="#features" className="hover:text-[#98DE38] transition-colors">
                  Explore Matching
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-[#98DE38] transition-colors">
                  Learn More
                </a>
              </li>
            </ul>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm">
            © {year} Scale Scope. All rights reserved.
          </p>

          <div className="flex flex-wrap justify-center gap-5 text-sm">
            <a href="#" className="hover:text-[#98DE38] transition-colors">
              Privacy Policy
            </a>
            <a href="#" className="hover:text-[#98DE38] transition-colors">
              Terms of Service
            </a>
            <a href="#" className="hover:text-[#98DE38] transition-colors">
              Contact
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
