import React from 'react';
import { Link } from 'react-router-dom';

export default function Navbar() {
  return (
    // Purpose: The main navigation container.
    // 'sticky top-0 z-50': Makes the navbar stick to the top of the viewport when scrolling.
    // 'bg-white/80 backdrop-blur-sm': Creates a modern, semi-transparent frosted glass effect.
    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo Section */}
          <div className="flex-shrink-0">
            <Link to="/" className="text-2xl font-bold text-indigo-600">
              ConnectSphere
            </Link>
          </div>

          {/* Authentication Buttons Section */}
          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              Log In
            </Link>
            <Link
              to="/register"
              // Purpose: Primary Call-to-Action button style.
              className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
            >
              Sign Up
            </Link>
          </div>
        </div>
      </div>
    </nav>
  );
}