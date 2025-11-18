import React from 'react';
import { Link } from 'react-router-dom';

import NavbarLogo from '/src/assets/Anus Tech logo.PNG'

export default function Navbar() {
  return (

    <nav className="sticky top-0 z-50 bg-white/80 backdrop-blur-sm border-b border-slate-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">

          <div className="flex-shrink-0">
            <Link
              to="/"
              className="flex items-center focus:outline-none focus:ring-2 focus:ring-red-500 rounded"
              aria-label="Home"
              // onClick={closeAllMenus}
            >
              <img
                src={NavbarLogo}
                alt="Arts Council Logo"
                className="object-contain w-auto max-h-[300px] max-w-[300px] sm:max-h-[300px] lg:max-h-[300px]"
              />
            </Link>          </div>

          <div className="flex items-center space-x-4">
            <Link to="/login" className="text-sm font-medium text-slate-600 hover:text-indigo-600">
              Log In
            </Link>
            <Link
              to="/register"
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