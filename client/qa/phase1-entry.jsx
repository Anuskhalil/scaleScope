import React, {useState} from 'react';
import {createRoot} from 'react-dom/client';
import MatchingPreferenceFields from '../src/components/MatchingPreferenceFields';
import CofounderConsentFields from '../src/components/CofounderConsentFields';
import MatchExplanation from '../src/components/MatchExplanation';
import {investmentMatch} from '../../shared/matching.mjs';
import {attachServerMatches} from '../src/services/serverMatching';
import {rankStartupsForInvestor} from '../src/services/investorService';
import '../src/index.css';
const founder={industry:'SaaS',startup_stage:'MVP Built',revenue_model:'Subscription',metadata:{startup_country:'Pakistan',funding_currency:'USD',desired_check_min:100,desired_check_max:200}};
const initial={preferred_industries:['Gaming'],preferred_stages:['Working MVP'],preferred_business_models:['Subscription'],geography_focus:'Pakistan',check_range_min:100,check_range_max:300,minimum_traction_required:'Working MVP',metadata:{}};
export function App(){
 const [investor,setInvestor]=useState(initial),[person,setPerson]=useState({metadata:{}});
 const update=(key,value)=>setInvestor(p=>({...p,[key]:value}));
 window.fixture={investor,person};
 return <main className="max-w-2xl mx-auto p-4 space-y-6">
 <style>{'.sel,.inp {width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;background:#fff;} *{box-sizing:border-box}'}</style>
 <h1 className="text-xl font-bold">Matching Preferences</h1>
 <MatchingPreferenceFields value={investor} onChange={update}/>
 <CofounderConsentFields value={person} onChange={(key,value)=>setPerson(p=>({...p,[key]:value}))}/>
 <MatchExplanation fit={investmentMatch(founder,investor)}/>
 </main>;
}
window.serviceResults=Promise.all([
 attachServerMatches([{user_id:'00000000-0000-4000-8000-000000000002',matchScore:99}]),
 rankStartupsForInvestor([{user_id:'00000000-0000-4000-8000-000000000002',_score:99}])
]).then(result=>{window.checkedResults=result;return result});
createRoot(document.getElementById('root')).render(<App/>);
