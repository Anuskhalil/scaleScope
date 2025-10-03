// src/pages/ProfilePage.jsx
import { useState } from "react";                                      // React state
import { useNavigate } from "react-router-dom";                        // Redirect after deletion/sign-out
import { useAuth } from "../auth/AuthContext";                         // Get current user/session
import { supabase } from "../lib/supabaseClient";                      // Client-side Supabase SDK
import ProfileForm from "../dashboard/ProfileForm";                               // Your existing profile form
import ConfirmDeleteModal from "../components/ConfirmDeleteModal";     // Confirmation modal

export default function ProfilePage() {
  const { user } = useAuth();                                          // Current authenticated user
  const navigate = useNavigate();                                      // Router navigation
  const [showDelete, setShowDelete] = useState(false);                 // Controls modal visibility
  const [deleteError, setDeleteError] = useState("");                  // Displays delete errors if any

  // If the user signed up with email/password, require password re-entry; skip for OAuth
  const requirePassword = user?.app_metadata?.provider === "email";    // "github"/"google" won't have password

  // Handles the confirmed delete from modal. Optionally re-auths, then calls backend, then signs out.
  const handleDeleteConfirmed = async (password) => {
    try {
      setDeleteError("");

      // Optional re-auth for email/password accounts (extra safety — recent auth)
      if (requirePassword && password) {
        const { error: reauthErr } = await supabase.auth.signInWithPassword({
          email: user.email,
          password,
        });
        if (reauthErr) {
          setDeleteError(`Re-authentication failed: ${reauthErr.message}`);
          return;
        }
      }

      // Get a fresh access token to authorize our backend delete call
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;
      if (!token) {
        setDeleteError("No active session. Please log in again.");
        return;
      }

      // Call your secure backend route to delete the account server-side
      const resp = await fetch(
        `${import.meta.env.VITE_API_URL || "http://localhost:3001"}/api/me/account`,
        {
          method: "DELETE",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,                           // Pass token for server validation
          },
        }
      );

      if (!resp.ok) {
        const body = await resp.json().catch(() => ({}));
        setDeleteError(body.error || "Failed to delete account.");
        return;
      }

      // On success: sign out locally and take user home
      await supabase.auth.signOut();
      navigate("/");
    } catch (err) {
      setDeleteError(`Unexpected error: ${err.message}`);
    } finally {
      setShowDelete(false);                                             // Close modal in all cases
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Card wrapper */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          {/* Card content */}
          <div className="p-8">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-8">
              <div>
                <h1 className="text-3xl font-bold text-gray-900">Your Profile</h1>
                <p className="mt-2 text-gray-600">
                  Signed in as{" "}
                  <span className="font-medium text-blue-600">{user?.email}</span>
                </p>
              </div>
              <div className="mt-4 md:mt-0 space-x-3">
                {/* Optional: sign out from here as well */}
                <button
                  onClick={async () => {
                    await supabase.auth.signOut();                      // Clear session
                    navigate("/login");                                 // Go to login
                  }}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 rounded-lg text-gray-700 font-medium transition-all"
                >
                  Sign out
                </button>
              </div>
            </div>

            {/* Profile form section (your existing form) */}
            <div className="mt-2">
              <h2 className="text-xl font-semibold text-gray-800 mb-4">Profile Information</h2>
              <ProfileForm />                                          {/* Keeps your current form behavior */}
            </div>

            {/* Divider */}
            <hr className="my-8" />

            {/* Danger Zone: delete account */}
            <div className="mt-2">
              <h2 className="text-xl font-semibold text-red-700 mb-2">Danger Zone</h2>
              <p className="text-sm text-gray-600">
                Deleting your account will permanently remove your profile and credentials. This action cannot be undone.
              </p>
              {deleteError && (
                <p className="mt-3 text-sm text-red-600">{deleteError}</p>
              )}
              <div className="mt-4">
                <button
                  onClick={() => setShowDelete(true)}                   // Open the modal
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-all"
                >
                  Delete my account
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Confirmation modal */}
      <ConfirmDeleteModal
        isOpen={showDelete}                                             // Controls modal open/close
        onClose={() => setShowDelete(false)}                            // Close handler
        onConfirm={handleDeleteConfirmed}                               // Callback to perform deletion
        requirePassword={requirePassword}                               // Ask for pwd only for email/password users
        userEmail={user?.email}                                         // For label context
      />
    </div>
  );
}