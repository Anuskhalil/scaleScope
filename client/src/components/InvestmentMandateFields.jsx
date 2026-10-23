export default function InvestmentMandateFields({ value, onChange, founder = false }) {
  const metadata = value.metadata || {};
  const update = (key, next) => onChange('metadata', { ...metadata, [key]: next });
  const currencyKey = founder ? 'funding_currency' : 'check_currency';
  return <fieldset className="grid sm:grid-cols-2 gap-4 my-4">
    <legend className="text-sm font-bold text-[#1B2D7F] mb-3">{founder ? 'Fundraising Intent' : 'Investment Mandate'}</legend>
    {founder && <label className="text-sm">Startup country<input className="inp mt-1" maxLength={80} placeholder="e.g. Pakistan" value={metadata.startup_country || ''} onChange={event => update('startup_country', event.target.value)} /></label>}
    {founder && <label className="text-sm">Fundraising status<select className="sel mt-1" value={metadata.fundraising_status || ''} onChange={event => update('fundraising_status', event.target.value)}>
      <option value="">Select status</option><option value="raising">Raising now</option><option value="planning">Planning a round</option><option value="not_raising">Not raising</option>
    </select></label>}
    <label className="text-sm">Check currency<select className="sel mt-1" value={metadata[currencyKey] || (founder ? '' : 'USD')} onChange={event => update(currencyKey, event.target.value)}>
      <option value="">Select currency</option>{['USD', 'PKR', 'EUR', 'GBP', 'AED', 'SAR', 'CAD', 'AUD', 'SGD', 'INR'].map(code => <option key={code}>{code}</option>)}
    </select></label>
    {founder && metadata.fundraising_status !== 'not_raising' && <>
      <label className="text-sm">Desired individual check: minimum<input className="inp mt-1" type="number" min="0" step="any" value={metadata.desired_check_min ?? ''} onChange={event => update('desired_check_min', event.target.value)} /></label>
      <label className="text-sm">Desired individual check: maximum<input className="inp mt-1" type="number" min="0" step="any" value={metadata.desired_check_max ?? ''} onChange={event => update('desired_check_max', event.target.value)} /></label>
    </>}
  </fieldset>;
}
