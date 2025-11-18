import React from 'react';
import { Link } from 'react-router-dom';

export default function Hero() {
  return (
    <div className="bg-white">
      <div className="max-w-7xl mx-auto py-20 px-4 sm:px-6 lg:px-8 text-center">

        <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900">
          <span className="bg-clip-text text-transparent bg-[#1B2D7F]">
            Empowering Innovators to
          </span>
          <span className="block text-[#98DE38]">Connect, Collaborate & Grow.</span>
        </h1>

        <p className="mt-6 max-w-2xl mx-auto text-lg text-slate-600">
          Scale Scope is an AI-powered ecosystem where students, founders, mentors, and investors come together to build startups, prepare for opportunities, and scale ideas into impact.
        </p>

        <div className="mt-8 flex justify-center space-x-4">
          <Link
            to="/register"
            className="px-8 py-3 text-base font-medium text-white bg-indigo-600 rounded-md hover:bg-indigo-700"
          >
            Get Started
          </Link>
          <a
            href="#features"
            className="px-8 py-3 text-base font-medium text-indigo-700 bg-indigo-100 rounded-md hover:bg-indigo-200"
          >
            Learn More
          </a>
        </div>
      </div>
    </div>
  );
}
