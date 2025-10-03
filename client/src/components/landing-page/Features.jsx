import React from 'react';
// Purpose: Importing specific icons from the react-icons library.
import { FaUserFriends, FaLightbulb, FaRocket } from 'react-icons/fa';

const features = [
  {
    name: 'Smart Matching',
    description: 'Our AI connects you with the perfect co-founders, mentors, or investors based on your skills, goals, and vision.',
    icon: FaUserFriends,
  },
  {
    name: 'Idea Pitching Hub',
    description: 'A dedicated space to pitch your startup ideas, get feedback, and find collaborators to bring your vision to life.',
    icon: FaLightbulb,
  },
  {
    name: 'Growth Resources',
    description: 'Access tailored strategies, interview prep tools, and a library of resources to accelerate your career or startup growth.',
    icon: FaRocket,
  },
];

export default function Features() {
  return (
    // Purpose: 'id="features"' allows the "Learn More" button to link directly to this section.
    <section id="features" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Everything You Need to Succeed
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
            From the first line of code to the final funding round.
          </p>
        </div>

        {/* Purpose: Creates a responsive grid that shows 1, 2, or 3 columns depending on screen size. */}
        <div className="mt-12 grid gap-10 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            // Purpose: Individual card for each feature with modern styling.
            <div key={feature.name} className="bg-white p-8 rounded-lg shadow-md text-center">
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-lg font-medium text-slate-900">{feature.name}</h3>
              <p className="mt-2 text-base text-slate-600">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}