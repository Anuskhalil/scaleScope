import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    // Purpose: The main container for the hero section with a light gray background.
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center">
        {/* Main Headline */}
        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          {/* Purpose: Creates a visually striking gradient text effect. */}
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 to-purple-500">
            Connect, Collaborate, and Create
          </span>
          <span className="block">The Future of Startups.</span>
        </h1>

        {/* Sub-headline */}
        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
          The ultimate platform for students, founders, and investors to network, pitch ideas, and build the next big thing together.
        </p>

        {/* Call-to-Action Buttons */}
        <div className="mt-8 flex justify-center space-x-4">
          <Link
            to="/register"
            className="px-8 py-3 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Get Started
          </Link>
          <a
            href="#features" // This links to the features section below
            className="px-8 py-3 text-base font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}