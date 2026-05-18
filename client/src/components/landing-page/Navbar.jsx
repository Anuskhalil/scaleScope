import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X, ArrowRight } from 'lucide-react';
import ScalScopeLogo from '../../assets/Anus Tech logo.png';

const navItems = [
  { label: 'Features', href: '#features' },
  { label: 'How It Works', href: '#how-it-works' },
  { label: 'For Users', href: '#user-types' },
  { label: 'Stories', href: '#testimonials' },
];

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    handleScroll();

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    const handleEscape = (event) => {
      if (event.key === 'Escape') setMobileMenuOpen(false);
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${scrolled
        ? 'bg-white/95 shadow-sm border-b border-slate-100'
        : 'bg-white/80 backdrop-blur-xl'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center mt-5">
            <Link to="/" className="flex items-center gap-2 group"> <img src={ScalScopeLogo} alt="Scale Scope Logo" className="h-auto w-60 md:h-14 lg:h-16 object-cover" /> </Link> </div>

          <div className="hidden md:flex items-center gap-7">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-semibold text-slate-600 hover:text-[#1B2D7F] transition-colors"
              >
                {item.label}
              </a>
            ))}
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link
              to="/login"
              className="px-4 py-2 text-sm font-bold text-slate-700 hover:text-[#1B2D7F] transition-colors"
            >
              Log In
            </Link>

            <Link
              to="/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-[#98DE38] text-black text-sm font-black hover:shadow-lg hover:shadow-lime-300/40 transition-all"
            >
              Get Started
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Toggle navigation menu"
            aria-expanded={mobileMenuOpen}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6 text-slate-800" />
            ) : (
              <Menu className="w-6 h-6 text-slate-800" />
            )}
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-100 shadow-xl">
          <div className="px-4 py-5 space-y-2">
            {navItems.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={closeMobileMenu}
                className="block px-3 py-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50"
              >
                {item.label}
              </a>
            ))}

            <div className="pt-3 border-t border-slate-100 space-y-3">
              <Link
                to="/login"
                onClick={closeMobileMenu}
                className="block px-3 py-3 rounded-xl text-slate-700 font-bold hover:bg-slate-50"
              >
                Log In
              </Link>

              <Link
                to="/register"
                onClick={closeMobileMenu}
                className="flex items-center justify-center gap-2 w-full px-5 py-3 rounded-full bg-[#98DE38] text-black font-black"
              >
                Get Started
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      )}
    </nav>
  );
}