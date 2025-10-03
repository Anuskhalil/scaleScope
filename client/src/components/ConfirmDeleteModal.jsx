// src/components/ConfirmDeleteModal.jsx
import { useState } from "react";                                    // React state hook

// Reusable modal asking the user to confirm destructive actions
export default function ConfirmDeleteModal({
  isOpen,                                                            // Controls visibility
  onClose,                                                           // Called to close modal
  onConfirm,                                                         // Called when user confirms
  requirePassword = true,                                            // Whether to request password
  userEmail,                                                         // For context in label
}) {
  const [confirmText, setConfirmText] = useState("");                // Stores "DELETE" input
  const [password, setPassword] = useState("");                      // Stores re-auth password
  const [error, setError] = useState("");                            // Local error state
  const [submitting, setSubmitting] = useState(false);               // Button loading state

  // Reset and close modal
  const handleClose = () => {
    setConfirmText("");
    setPassword("");
    setError("");
    onClose();
  };

  // Validate and pass control to parent
  const handleConfirm = async () => {
    // Require user to type DELETE to avoid accidental clicks
    if (confirmText !== "DELETE") {
      setError("Please type DELETE to confirm.");
      return;
    }
    // If password is required, make sure it's provided
    if (requirePassword && !password) {
      setError("Please enter your password.");
      return;
    }
    setSubmitting(true);
    await onConfirm(password);                                       // Parent handles deletion
    setSubmitting(false);
  };

  if (!isOpen) return null;                                          // Render nothing if closed

  return (
    // Overlay container centered on screen
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Dimmed background; clicking it also closes modal */}
      <div className="absolute inset-0 bg-black/50" onClick={handleClose} />
      {/* Modal content card */}
      <div className="relative bg-white w-full max-w-md rounded-xl shadow-xl p-6">
        <h3 className="text-lg font-semibold text-slate-900">Delete Account</h3>
        <p className="mt-2 text-sm text-slate-600">
          This will permanently delete your account and associated data. This action cannot be undone.
        </p>

        {/* Confirmation text input */}
        <div className="mt-4">
          <label className="block text-sm font-medium text-slate-700">Type DELETE to confirm</label>
          <input
            className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
            value={confirmText}
            onChange={(e) => setConfirmText(e.target.value)}
            placeholder="DELETE"
          />
        </div>

        {/* Optional password input for re-auth */}
        {requirePassword && (
          <div className="mt-4">
            <label className="block text-sm font-medium text-slate-700">
              Re-enter your password for {userEmail}
            </label>
            <input
              type="password"
              className="mt-1 w-full border border-slate-300 rounded-md px-3 py-2"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Your password"
            />
          </div>
        )}

        {/* Inline error if any */}
        {error && <p className="mt-3 text-sm text-red-600">{error}</p>}

        {/* Actions */}
        <div className="mt-6 flex justify-end space-x-3">
          <button
            onClick={handleClose}
            className="px-4 py-2 text-slate-700 bg-slate-100 rounded-md hover:bg-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={submitting}
            className="px-4 py-2 text-white bg-red-600 rounded-md hover:bg-red-700 disabled:opacity-60"
          >
            {submitting ? "Deleting..." : "Delete permanently"}
          </button>
        </div>
      </div>
    </div>
  );
}