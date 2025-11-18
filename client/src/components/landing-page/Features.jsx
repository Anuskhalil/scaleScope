import React from 'react';
import {
  FaUserFriends,
  FaLightbulb,
  FaRocket,
  FaChalkboardTeacher,
  FaHandshake,
  FaComments,
  FaBrain
} from 'react-icons/fa';

const features = [
  {
    name: 'Smart Matching',
    description:
      'Our AI connects you with ideal co-founders, mentors, or investors by aligning your skills, goals, and startup vision.',
    icon: FaUserFriends,
  },
  {
    name: 'Idea Pitching Hub',
    description:
      'Pitch your startup ideas, receive real-time feedback, and discover collaborators who share your mission and energy.',
    icon: FaLightbulb,
  },
  {
    name: 'AI-Guided Interview Preparation',
    description:
      'Practice with intelligent interview simulations, personalized feedback, and curated learning paths to boost your confidence and success rate.',
    icon: FaBrain,
  },
  {
    name: 'Mentorship & Expert Guidance',
    description:
      'Learn directly from industry experts and founders who can guide you through startup challenges and help you scale with clarity.',
    icon: FaChalkboardTeacher,
  },
  {
    name: 'Collaboration Workspace',
    description:
      'Create teams, manage projects, share updates, and track progress — all within an integrated, startup-focused workspace.',
    icon: FaComments,
  },
  {
    name: 'Investment Opportunities',
    description:
      'Get discovered by investors, explore funding options, and take your startup from concept to company with real-world backing.',
    icon: FaHandshake,
  },
  {
    name: 'Growth Resources',
    description:
      'Access tailored strategies, AI tools, and an ever-growing library of resources designed to accelerate your personal and startup growth.',
    icon: FaRocket,
  },
];

export default function Features() {
  return (
    <section id="features" className="py-20 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <h2 className="text-3xl font-extrabold text-slate-900">
            Everything You Need to Succeed
          </h2>
          <p className="mt-4 max-w-2xl mx-auto text-lg text-slate-600">
            Scale Scope brings together innovation, mentorship, and AI to help you grow — from the first idea to real-world impact.
          </p>
        </div>

        <div className="mt-12 grid gap-10 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <div
              key={feature.name}
              className="bg-white p-8 rounded-lg shadow-md text-center hover:shadow-lg transition-shadow duration-300"
            >
              <div className="flex items-center justify-center h-12 w-12 rounded-md bg-indigo-500 text-white mx-auto">
                <feature.icon className="h-6 w-6" aria-hidden="true" />
              </div>
              <h3 className="mt-6 text-lg font-semibold text-slate-900">
                {feature.name}
              </h3>
              <p className="mt-3 text-base text-slate-600">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
