const present = value => value !== null && value !== undefined && String(value).trim() !== '';

function DetailSection({ title, fields }) {
  const populated = fields.filter(([, value]) => present(value));
  if (!populated.length) return null;
  return <section className="space-y-4 border-t border-gray-100 pt-6">
    <h2 className="text-lg font-bold text-[#1B2D7F]">{title}</h2>
    <dl className="grid gap-4 sm:grid-cols-2">
      {populated.map(([label, value, full]) => <div key={label} className={full ? 'min-w-0 sm:col-span-2' : 'min-w-0'}>
        <dt className="text-xs font-semibold text-gray-500">{label}</dt>
        <dd className="mt-1 whitespace-pre-wrap break-words text-sm text-gray-800">{String(value)}</dd>
      </div>)}
    </dl>
  </section>;
}

// Explicit public fields only: never render raw metadata or private proof files.
export default function FounderProfileDetails({ profile, supplementalOnly = false }) {
  const m = profile.metadata || {};
  const professional = m.founder_background === 'professional';
  const seekingInvestor = (profile.looking_for || []).includes('Investor');
  return <div className="space-y-6">
    {!supplementalOnly && <>
      <DetailSection title={professional ? 'Professional Background' : 'Education'} fields={professional ? [
        ['Current Role', m.current_role], ['Company / Organization', m.current_company],
        ['Relevant Experience (years)', m.relevant_experience_years],
      ] : [['University / Institute', m.university], ['Degree / Major', m.degree]]} />
      <DetailSection title="Business & Strategy" fields={[
        ['Solution', profile.solution_description, true],
        ['Revenue Model', profile.revenue_model], ['Market Size', profile.market_size],
        ['Business Model Details', profile.business_model_details, true],
        ['Competitors', profile.competitors, true],
        ['Go-to-Market Strategy', profile.go_to_market_strategy, true],
        ['Customer Validation', profile.customer_validation, true],
        ['Current Challenges', profile.current_challenges, true],
        ['Launch Timeline', profile.launch_timeline],
      ]} />
      <DetailSection title="Commitment & Plans" fields={[
        ['Commitment Level', profile.commitment_level], ['Hours per Week', profile.weekly_hours],
        ['Founding Year', profile.founding_year],
        ['Traction Summary', profile.traction_summary, true],
        ['Use of Funds', profile.use_of_funds, true],
        ['Next 6 Month Milestones', profile.milestones_next_6_months, true],
      ]} />
    </>}
    {seekingInvestor && <DetailSection title="Fundraising Preferences" fields={[
      ['Fundraising Status', ({ raising: 'Raising now', planning: 'Planning a round', not_raising: 'Not raising' })[m.fundraising_status] || m.fundraising_status],
      ['Currency', m.funding_currency],
      ...(m.fundraising_status === 'not_raising' ? [] : [
        ['Desired Investment per Investor: Minimum', m.desired_check_min],
        ['Desired Investment per Investor: Maximum', m.desired_check_max],
      ]),
    ]} />}
  </div>;
}
