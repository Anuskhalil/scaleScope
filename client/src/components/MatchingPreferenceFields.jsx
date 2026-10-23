const CRITERIA = [
 ['industry','Industry'],['stage','Startup / funding stage'],['check','Check range'],
 ['geography','Investment geography'],['business_model','Business model'],['traction','Expected progress'],
];
export default function MatchingPreferenceFields({value,onChange}) {
 const metadata=value.metadata || {},modes=metadata.matching_modes || {};
 return <fieldset className="space-y-3 mt-4">
  <legend className="font-bold text-sm text-[#1B2D7F]">Matching Preferences</legend>
  <div className="grid sm:grid-cols-2 gap-3">{CRITERIA.map(([key,label])=><label key={key} className="text-sm">{label}
   <select className="sel mt-1" value={modes[key] || 'prefer'} onChange={e=>onChange('metadata',{...metadata,matching_modes:{...modes,[key]:e.target.value}})}>
    <option value="prefer">Preference</option><option value="must">Must-have</option><option value="none">No restriction</option>
   </select>
  </label>)}</div>
 </fieldset>;
}
