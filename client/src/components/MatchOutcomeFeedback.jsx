import React, { useState } from 'react';
import { CheckCircle, Loader, MessageSquare, Star } from 'lucide-react';
import toast from 'react-hot-toast';

import { backendApi } from '../lib/backendApi';

const OUTCOMES = [
  { value: 'good_fit', label: 'Good fit' },
  { value: 'poor_fit', label: 'Poor fit' },
  { value: 'not_ready', label: 'Not ready' },
  { value: 'no_response', label: 'No response' },
  { value: 'met_off_platform', label: 'Met off-platform' },
];

const TAGS = [
  'Skills matched',
  'Complementary fit',
  'Clear profile',
  'Needs proof',
  'Weak traction',
  'Wrong stage',
  'Good mentor fit',
  'Good investor fit',
];

export default function MatchOutcomeFeedback({
  targetUserId,
  connectionStatus,
  context = 'profile_view',
}) {
  const [outcome, setOutcome] = useState('good_fit');
  const [rating, setRating] = useState(4);
  const [reasonTags, setReasonTags] = useState([]);
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const canSubmit = Boolean(targetUserId);
  const connected = connectionStatus === 'accepted';

  const toggleTag = (tag) => {
    setReasonTags((prev) => (
      prev.includes(tag)
        ? prev.filter((item) => item !== tag)
        : [...prev, tag]
    ));
  };

  const submit = async () => {
    if (!canSubmit || saving) return;

    try {
      setSaving(true);
      await backendApi.submitMatchOutcome({
        targetUserId,
        context,
        outcome,
        rating,
        reasonTags,
        notes,
      });

      setSaved(true);
      toast.success('Match feedback saved', {
        style: {
          background: '#98DE38',
          color: '#000',
        },
      });
    } catch (err) {
      toast.error(err.message || 'Could not save feedback');
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="bg-white rounded-2xl border border-gray-100 p-5 lift">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="font-black text-gray-900 flex items-center gap-2">
            <MessageSquare className="w-5 text-[#1B2D7F]" />
            Match Feedback
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Help ScaleScope improve recommendations after profile reviews or conversations.
          </p>
        </div>

        {saved && (
          <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-green-50 text-green-700 text-xs font-bold">
            <CheckCircle className="w-3.5" />
            Saved
          </span>
        )}
      </div>

      {!connected && (
        <div className="mt-4 rounded-xl bg-gray-50 border border-gray-100 p-3">
          <p className="text-xs text-gray-500">
            Message stays locked until connection is accepted, but you can still save whether this profile looks relevant.
          </p>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-4 mt-4">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
            Outcome
          </label>
          <div className="flex flex-wrap gap-2">
            {OUTCOMES.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setOutcome(item.value)}
                className={`px-3 py-2 rounded-xl text-xs font-bold border transition ${
                  outcome === item.value
                    ? 'bg-[#98DE38]/20 border-[#98DE38] text-[#1B2D7F]'
                    : 'bg-white border-gray-200 text-gray-600 hover:border-[#98DE38]/60'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
            Rating
          </label>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => setRating(value)}
                className={`w-9 h-9 rounded-xl border flex items-center justify-center ${
                  value <= rating
                    ? 'bg-[#98DE38]/20 border-[#98DE38] text-[#1B2D7F]'
                    : 'bg-white border-gray-200 text-gray-300'
                }`}
                aria-label={`${value} star rating`}
              >
                <Star className="w-4" />
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
          Reason tags
        </label>
        <div className="flex flex-wrap gap-2">
          {TAGS.map((tag) => (
            <button
              key={tag}
              type="button"
              onClick={() => toggleTag(tag)}
              className={`px-3 py-1.5 rounded-full text-xs font-bold border ${
                reasonTags.includes(tag)
                  ? 'bg-[#1B2D7F] border-[#1B2D7F] text-white'
                  : 'bg-gray-50 border-gray-100 text-gray-600 hover:border-[#98DE38]'
              }`}
            >
              {reasonTags.includes(tag) ? 'Selected' : '+'} {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4">
        <label className="text-xs font-bold text-gray-500 uppercase block mb-2">
          Notes
        </label>
        <textarea
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          maxLength={500}
          rows={3}
          className="w-full rounded-xl border-2 border-gray-100 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-[#98DE38] focus:bg-white"
          placeholder="What made this match useful or not useful?"
        />
      </div>

      <button
        type="button"
        onClick={submit}
        disabled={!canSubmit || saving}
        className="mt-4 inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl g-brand text-black text-sm font-black disabled:opacity-60"
      >
        {saving && <Loader className="w-4 animate-spin" />}
        {saving ? 'Saving...' : 'Save Feedback'}
      </button>
    </section>
  );
}
