const INVESTOR_SUPPORT = ['Fundraising strategy', 'Follow-on funding', 'Industry expertise', 'Customer introductions', 'Strategic partnerships', 'International expansion', 'Financial planning', 'Board guidance'];

export default function FounderRequirementsFields({ value, onChange, skillSuggestions = [], readOnly = false }) {
  const cofounder = (value.looking_for || []).includes('Co-Founder');
  const investor = (value.looking_for || []).includes('Investor');
  const metadata = value.metadata || {};
  const updateMeta = (key, next) => onChange('metadata', { ...metadata, [key]: next });
  const choices = (options, selected, change) => <div className="flex flex-wrap gap-2">
    {[...new Set([...options, ...selected])].map(item => readOnly
      ? (selected.includes(item) && <span key={item} className="px-3 py-2 text-xs border border-[#98DE38] rounded-lg text-[#1B2D7F]">{item}</span>)
      : <button key={item} type="button" aria-pressed={selected.includes(item)} onClick={() => change(selected.includes(item) ? selected.filter(entry => entry !== item) : [...selected, item])} className={`px-3 py-2 text-xs rounded-lg border ${selected.includes(item) ? 'bg-[#98DE38]/15 border-[#98DE38] text-[#1B2D7F]' : 'border-gray-200 text-gray-700'}`}>{item}</button>)}
  </div>;
  const textField = (label, text, change, multiline = false, placeholder = '') => readOnly && !text ? null : <label className="block text-sm">
    {label}
    {readOnly ? <p className="mt-1 text-gray-700 whitespace-pre-wrap">{text || 'Not provided'}</p> : multiline
      ? <textarea className="ta mt-1" placeholder={placeholder} rows={3} maxLength={1000} value={text || ''} onChange={event => change(event.target.value)} />
      : <input className="inp mt-1" placeholder={placeholder} maxLength={200} value={text || ''} onChange={event => change(event.target.value)} />}
  </label>;
  return <div className="space-y-6">
    {cofounder && <fieldset className="space-y-4">
      <legend className="font-bold mb-3 text-[#1B2D7F]">Your Ideal Co-Founder</legend>
      <p className="text-sm text-gray-700">Skills your co-founder should bring</p>
      {choices(skillSuggestions, value.skills_needed || [], next => onChange('skills_needed', next))}
      {!readOnly && <label className="block text-sm">Other skill<input className="inp mt-1" placeholder="Type a skill and press Enter" onKeyDown={event => {
        if (event.key !== 'Enter') return;
        event.preventDefault();
        const skill = event.currentTarget.value.trim();
        if (skill) onChange('skills_needed', [...new Set([...(value.skills_needed || []), skill])]);
        event.currentTarget.value = '';
      }} /></label>}
      {textField('Equity Available', value.equity_available, next => onChange('equity_available', next), false, 'e.g. 10-20% or open to discussion')}
      {textField('Co-Founder Requirements', value.cofounder_requirements, next => onChange('cofounder_requirements', next), true, 'e.g. A technical co-founder who can build our app, work 15 hours a week, and collaborate remotely.')}
    </fieldset>}
    {investor && <fieldset className="space-y-4">
      <legend className="font-bold mb-3 text-[#1B2D7F]">Your Ideal Investor</legend>
      <p className="text-sm text-gray-700">Support you want beyond funding</p>
      {choices(INVESTOR_SUPPORT, metadata.investor_support_needed || [], next => updateMeta('investor_support_needed', next))}
      {textField('Preferred Investor Type', metadata.preferred_investor_type, next => updateMeta('preferred_investor_type', next), false, 'e.g. Angel investor, venture capital firm, or no preference')}
      {textField('Investor Requirements', metadata.investor_requirements, next => updateMeta('investor_requirements', next), true, 'e.g. An investor experienced in EdTech who supports early-stage startups and can introduce us to schools.')}
    </fieldset>}
  </div>;
}
