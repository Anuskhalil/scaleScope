import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import ScalScopeLogo from '../../assets/Anus Tech logo.png';

export default function Navbar() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Close mobile menu when clicking a link
  const closeMobileMenu = () => setMobileMenuOpen(false);

  return (
    <nav className={`fixed top-0 w-full z-50 transition-all duration-300 ${
      scrolled ? 'bg-white shadow-md' : 'bg-white/80 backdrop-blur-lg'
    }`}>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16 md:h-20">
          {/* Logo */}
          <div className="flex-shrink-0 flex items-center mt-5">
            <Link to="/" className="flex items-center gap-2 group">
              <img 
                src={ScalScopeLogo} 
                alt="Scale Scope Logo" 
                className="h-auto w-60 md:h-14 lg:h-16 object-cover" 
              />
            </Link>
          </div>

          {/* Desktop Navigation */}
          <div className="hidden md:flex items-center gap-6">
            <a 
              href="#features" 
              className="text-slate-700 hover:text-indigo-600 font-medium transition-colors"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              className="text-slate-700 hover:text-indigo-600 font-medium transition-colors"
            >
              How It Works
            </a>
            <a 
              href="#testimonials" 
              className="text-slate-700 hover:text-indigo-600 font-medium transition-colors"
            >
              Success Stories
            </a>
            
            {/* Login Button */}
            <Link 
              to="/login" 
              className="text-slate-700 hover:text-indigo-600 font-medium transition-colors"
            >
              Log In
            </Link>
            
            {/* Get Started Button */}
            <Link 
              to="/register" 
              className="px-6 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold hover:shadow-lg hover:shadow-indigo-500/50 transition-all transform hover:scale-105"
            >
              Get Started Free
            </Link>
          </div>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2"
            aria-label="Toggle menu"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden bg-white border-t border-slate-200 shadow-lg">
          <div className="px-4 py-6 space-y-4">
            <a 
              href="#features" 
              onClick={closeMobileMenu}
              className="block text-slate-700 font-medium py-2"
            >
              Features
            </a>
            <a 
              href="#how-it-works" 
              onClick={closeMobileMenu}
              className="block text-slate-700 font-medium py-2"
            >
              How It Works
            </a>
            <a 
              href="#testimonials" 
              onClick={closeMobileMenu}
              className="block text-slate-700 font-medium py-2"
            >
              Success Stories
            </a>
            
            {/* Mobile Login Link */}
            <Link 
              to="/login" 
              onClick={closeMobileMenu}
              className="block w-full text-left text-slate-700 font-medium py-2"
            >
              Log In
            </Link>
            
            {/* Mobile Get Started Button */}
            <Link 
              to="/register" 
              onClick={closeMobileMenu}
              className="block w-full px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-full font-semibold text-center"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      )}
    </nav>
  );
}