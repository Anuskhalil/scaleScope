import React from 'react';
import { Link } from 'react-router-dom';

export default function CTA() {
  return (
    // Purpose: A high-contrast section to grab the user's final attention.
    <section className="bg-indigo-700">
      <div className="max-w-4xl mx-auto text-center py-16 px-4 sm:py-20 sm:px-6 lg:px-8">
        <h2 className="text-3xl font-extrabold text-white sm:text-4xl">
          <span className="block">Ready to build the future?</span>
        </h2>
        <p className="mt-4 text-lg leading-6 text-indigo-200">
          Join a thriving community of builders, dreamers, and innovators today.
        </p>
        <Link
          to="/register"
          className="mt-8 w-full inline-flex items-center justify-center px-6 py-3 border border-transparent rounded-md shadow-sm text-base font-medium text-indigo-600 bg-white hover:bg-indigo-50 sm:w-auto"
        >
          Sign Up for Free
        </Link>
      </div>
    </section>
  );
}