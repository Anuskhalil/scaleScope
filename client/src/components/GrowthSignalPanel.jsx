import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowRight,
  CheckCircle,
  Loader,
  Lightbulb,
  Rocket,
  Shield,
  Sparkles,
  Target,
} from 'lucide-react';

import { getGrowthSignals } from '../services/growthSignalsService';
import { backendApi } from '../lib/backendApi';

function ScoreBar({ value }) {
  return (
    <div className="h-2.5 rounded-full bg-gray-100 overflow-hidden">
      <div
        className="h-full rounded-full bg-[#98DE38] transition-all"
        style={{ width: `${Math.max(0, Math.min(100, Number(value || 0)))}%` }}
      />
    </div>
  );
}

function ScoreCard({ icon, label, value, sub }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-9 h-9 rounded-xl bg-[#1B2D7F] text-white flex items-center justify-center flex-shrink-0">
            {icon}
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold text-gray-500 uppercase">{label}</p>
            <p className="text-xs text-gray-400 truncate">{sub}</p>
          </div>
        </div>
        <p className="text-2xl font-black text-gray-900">{value}%</p>
      </div>
      <div className="mt-3">
        <ScoreBar value={value} />
      </div>
    </div>
  );
}

export default function GrowthSignalPanel({
  profile,
  studentProfile,
  founderProfile,
  mentorProfile,
  investorProfile,
  role,
  compact = false,
  enableAI = false,
}) {
  const [aiState, setAiState] = useState({
    loading: false,
    plan: null,
    error: null,
  });

  const signals = useMemo(() => getGrowthSignals({
    profile,
    studentProfile,
    founderProfile,
    mentorProfile,
    investorProfile,
    role,
  }), [founderProfile, investorProfile, mentorProfile, profile, role, studentProfile]);

  const { trust, readiness, roadmap, nextAction } = signals;
  const visibleRoadmap = compact ? roadmap.slice(0, 3) : roadmap;

  useEffect(() => {
    let cancelled = false;

    async function loadAiPlan() {
      if (!enableAI || !profile?.id) return;

      try {
        setAiState({ loading: true, plan: null, error: null });
        const plan = await backendApi.getGrowthPlan({
          role: signals.role,
          trustScore: trust.score,
          readinessScore: readiness?.score || null,
          roadmap: roadmap.map((item) => ({
            id: item.id,
            title: item.title,
            status: item.status,
            priority: item.priority,
          })),
        });

        if (!cancelled) {
          setAiState({ loading: false, plan, error: null });
        }
      } catch (err) {
        if (!cancelled) {
          setAiState({
            loading: false,
            plan: null,
            error: err.message || 'AI plan unavailable',
          });
        }
      }
    }

    loadAiPlan();

    return () => {
      cancelled = true;
    };
  }, [enableAI, profile?.id, readiness?.score, roadmap, signals.role, trust.score]);

  return (
    <section className="bg-white rounded-2xl p-5 border border-gray-100 lift">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-4">
        <div>
          <h2 className="font-bold text-gray-900 flex items-center gap-2">
            <Sparkles className="w-5 text-[#1B2D7F]" />
            Growth Signals
          </h2>
          <p className="text-xs text-gray-500 mt-1">
            Research-based trust, readiness, and next action signals.
          </p>
        </div>

        {nextAction?.to && (
          <Link
            to={nextAction.to}
            className="inline-flex items-center justify-center gap-1 px-3 py-2 rounded-xl g-brand text-black text-xs font-black hover:opacity-90"
          >
            {nextAction.cta || 'Continue'}
            <ArrowRight className="w-3.5" />
          </Link>
        )}
      </div>

      <div className={`grid gap-3 ${readiness ? 'md:grid-cols-2' : 'md:grid-cols-1'}`}>
        <ScoreCard
          icon={<Shield className="w-4" />}
          label="Trust Score"
          value={trust.score}
          sub={trust.level}
        />

        {readiness && (
          <ScoreCard
            icon={<Rocket className="w-4" />}
            label="Startup Readiness"
            value={readiness.score}
            sub={readiness.stage}
          />
        )}
      </div>

      {nextAction && (
        <div className="mt-4 rounded-2xl border border-[#98DE38]/30 bg-[#98DE38]/10 p-4">
          <p className="text-xs font-bold uppercase text-[#1B2D7F] flex items-center gap-1">
            <Lightbulb className="w-3.5" />
            Next best action
          </p>
          <p className="text-sm font-black text-gray-900 mt-1">{nextAction.title}</p>
          <p className="text-xs text-gray-600 mt-1">{nextAction.description}</p>
        </div>
      )}

      {enableAI && (
        <div className="mt-4 rounded-2xl border border-[#1B2D7F]/10 bg-[#1B2D7F]/[0.03] p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-bold uppercase text-[#1B2D7F] flex items-center gap-1">
                <Sparkles className="w-3.5" />
                AI Growth Plan
              </p>
              <p className="text-xs text-gray-500 mt-1">
                Research-based guided plan, powered by backend AI when Gemini is configured.
              </p>
            </div>
            {aiState.loading && <Loader className="w-4 h-4 animate-spin text-[#1B2D7F] flex-shrink-0" />}
          </div>

          {aiState.plan ? (
            <div className="mt-3 space-y-3">
              <p className="text-sm font-black text-gray-900">{aiState.plan.headline}</p>

              <div className="grid md:grid-cols-3 gap-2">
                {(aiState.plan.weekly_plan || []).slice(0, 3).map((week) => (
                  <div key={`${week.week}-${week.focus}`} className="rounded-xl bg-white border border-gray-100 p-3">
                    <p className="text-[11px] font-black text-[#1B2D7F] uppercase">Week {week.week}</p>
                    <p className="text-xs font-bold text-gray-900 mt-1">{week.focus}</p>
                    <ul className="mt-2 space-y-1">
                      {(week.actions || []).slice(0, 3).map((action) => (
                        <li key={action} className="text-xs text-gray-500 flex gap-1.5">
                          <span className="text-[#98DE38] font-black">•</span>
                          <span>{action}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>

              {(aiState.plan.match_strategy || []).length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {aiState.plan.match_strategy.slice(0, 3).map((item) => (
                    <span key={item} className="px-3 py-1.5 rounded-full bg-white border border-gray-100 text-xs font-bold text-[#1B2D7F]">
                      {item}
                    </span>
                  ))}
                </div>
              )}

              <p className="text-[11px] text-gray-400">
                Source: {aiState.plan.ai_enabled ? 'Gemini backend AI' : 'Deterministic fallback'}
              </p>
            </div>
          ) : aiState.error ? (
            <p className="text-xs text-gray-400 mt-3">{aiState.error}</p>
          ) : (
            <p className="text-xs text-gray-400 mt-3">Preparing guided plan...</p>
          )}
        </div>
      )}

      <div className="mt-4 space-y-2">
        {visibleRoadmap.map((task) => {
          const done = task.status === 'done';
          return (
            <Link
              key={task.id}
              to={task.to || '#'}
              className="flex items-start gap-3 p-3 rounded-xl bg-gray-50 hover:bg-gray-100 transition"
            >
              <span className={`w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 ${
                done ? 'bg-green-100 text-green-700' : 'bg-[#1B2D7F]/10 text-[#1B2D7F]'
              }`}>
                {done ? <CheckCircle className="w-4" /> : <Target className="w-4" />}
              </span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900">{task.title}</p>
                <p className="text-xs text-gray-500">{task.description}</p>
              </div>
              <ArrowRight className="w-4 text-gray-400 mt-1 flex-shrink-0" />
            </Link>
          );
        })}
      </div>

      {trust.missing.length > 0 && (
        <p className="text-xs text-gray-400 mt-4">
          Improve trust next: {trust.missing.map((item) => item.label).join(', ')}.
        </p>
      )}
    </section>
  );
}
