export default function FounderIntentFields({ value, onChange }) {
  const metadata = value.metadata || {};
  const update = (key, next) => onChange('metadata', { ...metadata, founder_intent: 'building', open_to_joining: false, [key]: next });
  const hasBackground = ['student', 'professional'].includes(metadata.founder_background);
  return (
    <section className="space-y-5">
      <fieldset>
        <legend className="text-sm font-bold mb-3 text-[#1B2D7F]">Founder Background</legend>
        <div className="grid grid-cols-2 gap-3">
          {['student', 'professional'].map(type => (
            <label key={type} className={`flex items-center gap-2 p-3 rounded-lg border cursor-pointer capitalize ${metadata.founder_background === type ? 'border-[#98DE38] bg-[#98DE38]/10' : 'border-gray-200'}`}>
              <input type="radio" name="founder-background" checked={metadata.founder_background === type} onChange={() => update('founder_background', type)} />
              {type}
            </label>
          ))}
        </div>
      </fieldset>
      {hasBackground && <>
        <div><h2 className="text-sm font-bold text-[#1B2D7F]">Your Founder Journey</h2><p className="mt-1 text-sm">Building my Startup</p></div>
        {metadata.founder_background === 'student' && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">University / Institute<input className="inp mt-1" value={metadata.university || ''} maxLength={200} onChange={event => update('university', event.target.value)} /></label>
          <label className="text-sm">Degree / Major<input className="inp mt-1" value={metadata.degree || ''} maxLength={200} onChange={event => update('degree', event.target.value)} /></label>
        </div>}
        {metadata.founder_background === 'professional' && <div className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">Current role<input className="inp mt-1" value={metadata.current_role || ''} maxLength={160} onChange={event => update('current_role', event.target.value)} /></label>
          <label className="text-sm">Company / Organization<input className="inp mt-1" value={metadata.current_company || ''} maxLength={200} onChange={event => update('current_company', event.target.value)} /></label>
        </div>}
        {metadata.founder_background === 'professional' && <label className="block text-sm">Relevant Experience (years)
          <input className="inp mt-1" type="number" min="0" step="1" inputMode="numeric" value={metadata.relevant_experience_years ?? ''} onChange={event => update('relevant_experience_years', event.target.value === '' ? '' : Number(event.target.value))} />
        </label>}
      </>}
    </section>
  );
}
