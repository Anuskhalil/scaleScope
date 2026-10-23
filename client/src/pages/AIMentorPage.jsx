import { Link } from 'react-router-dom';
import { Sparkles } from 'lucide-react';

export default function AIMentorPage() {
  return (
    <main className="min-h-screen bg-gray-50 px-4 pt-24 pb-10">
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-bold text-[#1B2D7F] flex items-center gap-2"><Sparkles aria-hidden="true" />AI Mentor</h1>
        <p role="status" className="text-gray-600 mt-4">AI mentorship is being prepared. Personalised mentoring conversations are not available yet.</p>
        <Link to="/founder/profile" className="inline-flex mt-6 px-4 py-2 rounded-lg bg-[#98DE38] font-semibold">My Profile</Link>
      </div>
    </main>
  );
}
