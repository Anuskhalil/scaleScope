export default function MatchExplanation({fit}) {
 if(!fit)return null;
 if(fit.status==='review_pending')return <p className="mt-3 text-xs text-gray-600">Profile review pending. Personalized fit is not available yet.</p>;
 const status={potential_fit:'Potential fit',needs_clarification:'Clarification needed',not_aligned:'Not currently aligned'}[fit.status] || 'Not scored';
 return <details className="mt-3 border-t border-gray-100 pt-3 text-xs">
  <summary className="cursor-pointer font-bold text-[#1B2D7F] break-words">Why this match? {fit.matchScore}/100 - {status}</summary>
  <p className="text-gray-600 mt-2">Information coverage: {fit.coverage}%. Compatibility, not verification or a funding prediction.</p>
  <ul className="space-y-2 mt-3">{(fit.criteria||[]).map(c=><li key={c.key} className="flex flex-wrap justify-between gap-2">
   <span>{c.label}{c.mode==='must'?' (must-have)':''}</span>
   <span className={c.state==='match'?'text-green-700':c.state==='mismatch'?'text-red-700':'text-gray-600'}>
    {c.state==='match'?'Matches':c.state==='mismatch'?'Does not match':'Needs clarification'}
   </span>
  </li>)}</ul>
  {(fit.mismatches||[]).filter(x=>!x.includes(':')).map(x=><p key={x} className="mt-2 text-gray-700">{x}</p>)}
  <p className="text-gray-500 mt-3">Based on saved profile information. Missing information is not proof of a poor fit.</p>
 </details>;
}
