import React from 'react';

// A simple logo component - you can replace this with your own SVG or Image
const Logo = () => (
  <div className="text-center mb-8">
    <h1 className="text-3xl font-bold text-indigo-600 tracking-wider">
      ConnectSphere
    </h1>
    <p className="text-sm text-slate-500">Your Startup & Networking Hub</p>
  </div>
);

export default function AuthLayout({ title, children }) {
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col justify-center items-center p-4">
      <div className="w-full max-w-md">
        <Logo />
        <div className="bg-white p-8 rounded-2xl shadow-lg">
          <h2 className="text-center text-2xl font-bold tracking-tight text-slate-900 mb-6">
            {title}
          </h2>
          {children}
        </div>
      </div>
    </div>
  );
}