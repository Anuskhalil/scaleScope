import React, { useMemo } from 'react';
import { ShieldCheck, Activity, Sparkles } from 'lucide-react';
import { buildMatchIntelligence } from '../services/intelligentMatching';

export default function IntelligentMatchPanel({
  currentProfile = {},
  candidate = {},
  context = 'cofounder',
  compact = false,
}) {
  const intelligence = useMemo(
    () => buildMatchIntelligence({ currentProfile, candidate, context }),
    [currentProfile, candidate, context]
  );

  const topBreakdown = intelligence.scoreBreakdown.slice(0, compact ? 2 : 4);

  return (
    <div className="mt-3 rounded-xl border border-[#1B2D7F]/10 bg-[#1B2D7F]/[0.03] p-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs font-black text-[#1B2D7F] flex items-center gap-1.5">
          <Sparkles className="w-3.5" />
          Intelligent fit: {intelligence.smartScore}%
        </p>

        <span className="text-[11px] font-bold text-gray-500 flex items-center gap-1">
          <Activity className="w-3" />
          {intelligence.activityLabel}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-2">
        {topBreakdown.map((item) => (
          <div key={item.label}>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[10px] font-bold uppercase text-gray-400 truncate">
                {item.label}
              </span>
              <span className="text-[10px] font-black text-[#1B2D7F]">{item.value}%</span>
            </div>
            <div className="h-1.5 rounded-full bg-gray-200 overflow-hidden">
              <div
                className="h-full rounded-full bg-[#98DE38]"
                style={{ width: `${item.value}%` }}
              />
            </div>
          </div>
        ))}
      </div>

      {intelligence.proofBadges.length > 0 ? (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {intelligence.proofBadges.map((badge) => (
            <span
              key={badge}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white border border-[#98DE38]/40 text-[10px] font-bold text-[#1B2D7F]"
            >
              <ShieldCheck className="w-3" />
              {badge}
            </span>
          ))}
        </div>
      ) : (
        <p className="text-[11px] text-gray-400 mt-3">
          No proof links yet. Prioritize verified profiles for higher trust.
        </p>
      )}

      {!compact && (
        <p className="text-[11px] text-gray-500 mt-2">
          {intelligence.outreachSuggestion}
        </p>
      )}
    </div>
  );
}
