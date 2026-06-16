import { AlertTriangle, CheckCircle, Sparkles } from 'lucide-react';

const visibleItems = (items = [], limit = 6) => items.filter((item) => !item.condition).slice(0, limit);

export default function AIProfileQualityChecker({
  roleLabel = 'Profile',
  completion,
  requiredItems = [],
  recommendedItems = [],
}) {
  const requiredMissing = visibleItems(requiredItems);
  const recommendedMissing = visibleItems(recommendedItems, 5);
  const completionValue =
    typeof completion === 'number'
      ? completion
      : Number(completion?.percentage || completion || 0);

  const isReady = requiredMissing.length === 0;

  return (
    <section className="bg-white rounded-3xl shadow-sm border border-gray-100 p-5 lift">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <p className="sec-label mb-2">
            <Sparkles className="w-4 h-4" />
            AI Profile Quality Checker
          </p>
          <h3 className="text-lg font-black text-gray-900 ss">
            {isReady ? `${roleLabel} is AI-ready` : `${roleLabel} needs core details`}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            These fields power match scores, suggestions, profile ranking, and AI message drafts.
          </p>
        </div>

        {/* <div className="text-left sm:text-right">
          <div className="text-3xl font-black ss" style={{ color: '#1B2D7F' }}>
            {completionValue}%
          </div>
          <p className="text-xs text-gray-400">AI quality</p>
        </div> */}
      </div>

      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden mt-4">
        <div
          className="h-full rounded-full transition-all g-brand"
          style={{ width: `${Math.max(0, Math.min(100, completionValue))}%` }}
        />
      </div>

      <div className="grid md:grid-cols-2 gap-3 mt-4">
        <div className={`rounded-2xl p-4 border ${isReady ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
          <p className={`text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 ${isReady ? 'text-green-700' : 'text-red-700'}`}>
            {isReady ? <CheckCircle className="w-4 h-4" /> : <AlertTriangle className="w-4 h-4" />}
            Required before saving
          </p>
          {isReady ? (
            <p className="text-sm text-green-700 mt-2">All core matching fields are complete.</p>
          ) : (
            <ul className="mt-2 space-y-1.5">
              {requiredMissing.map((item) => (
                <li key={item.field || item.label} className="text-sm text-red-700">
                  {item.label}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl p-4 border border-gray-100 bg-gray-50">
          <p className="text-xs font-bold uppercase tracking-wide text-[#1B2D7F]">
            Recommended for stronger AI
          </p>
          {recommendedMissing.length > 0 ? (
            <ul className="mt-2 space-y-1.5">
              {recommendedMissing.map((item) => (
                <li key={item.field || item.label} className="text-sm text-gray-600">
                  {item.label}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-600 mt-2">Nice. Your profile has strong ranking signals.</p>
          )}
        </div>
      </div>
    </section>
  );
}
