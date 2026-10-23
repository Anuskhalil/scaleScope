import {Sparkles,ChevronDown,CheckCircle2,AlertCircle,FileQuestion} from 'lucide-react';
import './ReviewUI.css';
const labels={consistent:'Consistent',mismatch:'Needs attention',insufficient_evidence:'More evidence needed'};
const states={queued:'Queued',running:'Analyzing',complete:'Complete',failed:'Unavailable'};
export default function AIReviewReport({analysis}){
 if(!analysis)return null;
 const report=analysis.ai_report,findings=report?.findings||[];
 return <details className="ai-review">
  <summary><span className="ai-review-title"><Sparkles size={17}/> AI analysis</span><span className="review-badge">{states[analysis.ai_status]||'Pending'}</span><ChevronDown size={16} className="review-chevron"/></summary>
  <div className="ai-review-content">
   {!report&&<p>{analysis.ai_status==='failed'?'Analysis is unavailable. A reviewer can still assess your profile.':analysis.ai_status==='running'?'Your information is being analyzed.':'Analysis is waiting to start.'}</p>}
   {report&&<>
    <p className="ai-review-summary">{report.summary}</p>
    {!!findings.length&&<div className="ai-review-counts"><span>{findings.filter(f=>f.assessment==='consistent').length} consistent</span><span>{findings.filter(f=>f.assessment!=='consistent').length} to review</span></div>}
    <ul className="ai-findings">{findings.map((f,i)=>{
     const Icon=f.assessment==='consistent'?CheckCircle2:f.assessment==='mismatch'?AlertCircle:FileQuestion;
     return <li key={i} className={'ai-finding '+f.assessment}><Icon size={18}/><div><h4>{f.field.replaceAll('_',' ')}</h4><span className="ai-assessment">{labels[f.assessment]||'Needs review'}</span><p>{f.explanation}</p>{f.source&&<small>Source: {f.source}</small>}</div></li>;
    })}</ul>
    {!!report.limitations?.length&&<section className="ai-limitations"><h4>Review limitations</h4><ul>{report.limitations.map((l,i)=><li key={i}>{l}</li>)}</ul></section>}
   </>}
   <p className="review-disclosure">AI findings are advisory, not an authenticity guarantee or approval.</p>
  </div>
 </details>;
}
