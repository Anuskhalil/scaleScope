export default function CofounderConsentFields({value,onChange}) {
 const metadata=value.metadata || {};
 return <fieldset className="space-y-3 border-t border-gray-100 pt-4">
  <legend className="text-sm font-bold text-[#1B2D7F]">Joining another startup</legend>
  <label className="flex items-start gap-3 text-sm">
   <input type="checkbox" className="mt-1 accent-[#1B2D7F]" checked={metadata.open_to_joining === true}
    onChange={e=>onChange('metadata',{...metadata,open_to_joining:e.target.checked})}/>
   I am open to joining another startup as a Co-Founder
  </label>
  {metadata.open_to_joining === true && <label className="block text-sm">Commitment available
   <select className="sel mt-1" value={value.commitment_level || ''} onChange={e=>onChange('commitment_level',e.target.value)}>
    <option value="">Select commitment</option>
    {[...new Set(['Exploring','Casual (2-5 hrs/week)','Serious (5-15 hrs/week)','Full-time (15-30 hrs/week)',value.commitment_level].filter(Boolean))].map(x=><option key={x}>{x}</option>)}
   </select>
  </label>}
 </fieldset>;
}
