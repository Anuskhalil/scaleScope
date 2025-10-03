import { useAuth } from '../auth/AuthContext';
import ProfileForm from './ProfileForm';

export default function Dashboard() {
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="p-8">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
                <p className="mt-2 text-gray-600">
                  Welcome back, <span className="font-medium text-blue-600">{user?.email}</span>
                </p>
              </div>
              <div className="mt-4 md:mt-0">
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-all">
                  Settings
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-blue-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-blue-800 mb-2">Profile Completion</h3>
                <div className="h-2 bg-blue-200 rounded-full mb-4">
                  <div className="h-2 bg-blue-600 rounded-full w-3/4"></div>
                </div>
                <p className="text-sm text-blue-700">75% complete</p>
              </div>

              <div className="bg-indigo-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-indigo-800 mb-2">Recent Activity</h3>
                <p className="text-sm text-indigo-700">Last login: Today, 10:30 AM</p>
              </div>

              <div className="bg-purple-50 rounded-xl p-6">
                <h3 className="text-lg font-medium text-purple-800 mb-2">Notifications</h3>
                <p className="text-sm text-purple-700">You have 3 unread messages</p>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
              <ProfileForm />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}