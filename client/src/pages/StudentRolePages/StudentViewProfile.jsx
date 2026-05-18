// src/pages/UserProfileViewPage.jsx
import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Loader,
  MapPin,
  GraduationCap,
  Lightbulb,
  Briefcase,
  ShieldCheck,
  UserPlus,
  MessageSquare,
} from 'lucide-react';
import toast from 'react-hot-toast';

import { supabase } from '../../lib/supabaseClient';
import { backendApi } from '../../lib/backendApi';

export default function StudentViewProfile() {
  const { userId } = useParams();

  const [state, setState] = useState({
    loading: true,
    error: null,
  });

  const [profile, setProfile] = useState(null);
  const [student, setStudent] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    async function load() {
      if (!userId) return;

      try {
        setState({ loading: true, error: null });

        const [profileRes, studentRes, connectionsRes] = await Promise.allSettled([
          supabase
            .from('profiles')
            .select('id, full_name, email, user_type, avatar_url, bio, location')
            .eq('id', userId)
            .maybeSingle(),

          supabase
            .from('student_profiles')
            .select(`
              user_id,
              university,
              degree,
              major,
              current_year,
              skills_with_levels,
              help_needed,
              looking_for,
              commitment_level,
              has_startup_idea,
              idea_title,
              idea_domain,
              startup_idea_description,
              target_audience,
              unique_value_prop
            `)
            .eq('user_id', userId)
            .maybeSingle(),

          backendApi.getMyConnections(),
        ]);

        const profileData =
          profileRes.status === 'fulfilled' ? profileRes.value.data : null;

        const studentData =
          studentRes.status === 'fulfilled' ? studentRes.value.data : null;

        if (!profileData) {
          throw new Error('Profile not found');
        }

        const connections =
          connectionsRes.status === 'fulfilled'
            ? connectionsRes.value?.data || []
            : [];

        const isConnected = connections.some((conn) => {
          return conn.otherUser?.id === userId;
        });

        setProfile(profileData);
        setStudent(studentData);
        setConnectionStatus(isConnected ? 'accepted' : null);

        setState({ loading: false, error: null });
      } catch (err) {
        console.error('User profile load failed:', err);
        setState({
          loading: false,
          error: err.message || 'Could not load profile',
        });
      }
    }

    load();
  }, [userId]);

  const sendConnect = async () => {
    try {
      setBusy(true);

      const res = await backendApi.sendConnect(
        userId,
        `Hi ${profile?.full_name || 'there'}, I viewed your profile and would like to connect.`,
        'cofounder_request'
      );

      if (res.alreadyConnected || res.status === 'accepted') {
        setConnectionStatus('accepted');
        toast.success('Already connected');
        return;
      }

      setConnectionStatus('pending');
      toast.success('Connection request sent');
    } catch (err) {
      toast.error(err.message || 'Could not send request');
    } finally {
      setBusy(false);
    }
  };

  const openMessage = async () => {
    if (connectionStatus !== 'accepted') {
      toast.error('Connect first to send messages');
      return;
    }

    try {
      setBusy(true);

      const res = await backendApi.getOrCreateConversation(userId);
      const convId = res.conversationId || res.id || res.data?.id;

      window.location.href = convId
        ? `/messages?conv=${convId}`
        : '/messages';
    } catch (err) {
      toast.error(err.message || 'Could not open messages');
    } finally {
      setBusy(false);
    }
  };

  if (state.loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader className="w-8 h-8 animate-spin text-[#1B2D7F]" />
      </div>
    );
  }

  if (state.error) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl border p-6 text-center">
          <p className="font-bold text-red-600">{state.error}</p>
          <Link to="/find-cofounders" className="text-sm text-indigo-600 mt-3 inline-block">
            Back to Find CoFounder
          </Link>
        </div>
      </div>
    );
  }

  const skills = student?.skills_with_levels || [];

  return (
    <div className="min-h-screen bg-gray-50 pt-20 pb-16 px-4">
      <div className="max-w-4xl mx-auto">
        <Link
          to="/find-cofounders"
          className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-5"
        >
          <ArrowLeft className="w-4" />
          Back
        </Link>

        <div className="bg-white rounded-3xl border border-gray-100 p-6 shadow-sm">
          <div className="flex flex-col sm:flex-row gap-5">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center text-white text-2xl font-black overflow-hidden">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={profile.full_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                profile.full_name?.[0] || '?'
              )}
            </div>

            <div className="flex-1">
              <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
                <div>
                  <h1 className="text-2xl sm:text-3xl font-black text-gray-900">
                    {profile.full_name}
                  </h1>

                  <p className="text-sm text-gray-500 capitalize mt-1">
                    {profile.user_type?.replace(/-/g, ' ') || 'User'}
                  </p>

                  {profile.location && (
                    <p className="text-sm text-gray-500 flex items-center gap-1 mt-2">
                      <MapPin className="w-4" />
                      {profile.location}
                    </p>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row gap-2">
                  <button
                    type="button"
                    onClick={openMessage}
                    disabled={connectionStatus !== 'accepted' || busy}
                    className={`px-4 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 ${
                      connectionStatus === 'accepted'
                        ? 'bg-[#98DE38] text-black'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    <MessageSquare className="w-4" />
                    {connectionStatus === 'accepted' ? 'Message' : 'Connect first'}
                  </button>

                  {connectionStatus === 'accepted' ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-xl bg-green-50 border border-green-200 text-green-700 text-sm font-bold flex items-center justify-center gap-2"
                    >
                      <ShieldCheck className="w-4" />
                      Connected
                    </button>
                  ) : connectionStatus === 'pending' ? (
                    <button
                      type="button"
                      disabled
                      className="px-4 py-2 rounded-xl bg-amber-50 border border-amber-200 text-amber-700 text-sm font-bold"
                    >
                      Pending
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={sendConnect}
                      disabled={busy}
                      className="px-4 py-2 rounded-xl bg-[#98DE38] text-black text-sm font-black flex items-center justify-center gap-2"
                    >
                      <UserPlus className="w-4" />
                      Connect
                    </button>
                  )}
                </div>
              </div>

              {profile.bio && (
                <p className="text-gray-600 mt-4">
                  {profile.bio}
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-5 mt-5">
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
              <GraduationCap className="w-5 text-[#1B2D7F]" />
              Education
            </h2>

            <p className="text-sm text-gray-700">
              {student?.university || 'University not added'}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              {[student?.degree, student?.major, student?.current_year]
                .filter(Boolean)
                .join(' · ') || 'Degree details not added'}
            </p>
          </div>

          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
              <Briefcase className="w-5 text-[#1B2D7F]" />
              Collaboration
            </h2>

            <p className="text-sm text-gray-700">
              Commitment: {student?.commitment_level || 'Not added'}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              Looking for: {student?.looking_for?.join?.(', ') || 'Not added'}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
          <h2 className="font-black text-gray-900 mb-3">
            Skills
          </h2>

          {skills.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {skills.map((skill, index) => (
                <span
                  key={index}
                  className="px-3 py-1 rounded-full bg-indigo-50 text-indigo-700 text-xs font-bold"
                >
                  {skill.skill || skill.name || skill}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500">No skills added yet.</p>
          )}
        </div>

        {student?.has_startup_idea && (
          <div className="bg-white rounded-2xl border border-gray-100 p-5 mt-5">
            <h2 className="font-black text-gray-900 mb-3 flex items-center gap-2">
              <Lightbulb className="w-5 text-[#1B2D7F]" />
              Startup Idea
            </h2>

            <p className="text-lg font-bold text-gray-900">
              {student.idea_title || 'Startup Idea'}
            </p>

            <p className="text-sm text-gray-500 mt-1">
              {student.idea_domain || 'Domain not added'}
            </p>

            <p className="text-sm text-gray-600 mt-3">
              {student.startup_idea_description || 'No description added.'}
            </p>

            {student.target_audience && (
              <p className="text-sm text-gray-600 mt-3">
                <span className="font-bold">Target audience:</span>{' '}
                {student.target_audience}
              </p>
            )}

            {student.unique_value_prop && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-bold">Unique value:</span>{' '}
                {student.unique_value_prop}
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}