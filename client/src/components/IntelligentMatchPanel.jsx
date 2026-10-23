import MatchExplanation from './MatchExplanation';

export default function IntelligentMatchPanel({candidate = {}}) {
  if (candidate.serverMatch) return <MatchExplanation fit={candidate.serverMatch} />;
  return <p className="mt-3 text-xs text-gray-600" role="status">
    Match assessment unavailable. Profile details are self-reported unless a specific claim has been reviewed.
  </p>;
}
