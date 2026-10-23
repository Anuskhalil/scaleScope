export const FOUNDER_INTENTS = [
  { value: 'building', label: 'Building my startup' },
  { value: 'joining', label: 'Joining as a Co-Founder' },
  { value: 'exploring', label: 'Exploring ideas' },
];

export function founderIntent(profile = {}) {
  const value = profile.metadata?.founder_intent;
  return FOUNDER_INTENTS.some(item => item.value === value) ? value : 'building';
}

export function isOpenToJoining(profile = {}) {
  return founderIntent(profile) === 'joining' || profile.metadata?.open_to_joining === true;
}

export function canMatchCofounders(viewer = {}, candidate = {}) {
  const recruiting = value => founderIntent(value) === 'building' && (value.looking_for || []).includes('Co-Founder');
  return (recruiting(viewer) && isOpenToJoining(candidate)) ||
    (isOpenToJoining(viewer) && recruiting(candidate));
}

export function personalFounderChecks(profile = {}) {
  return [
    { field: 'full_name', label: 'Full name', condition: (profile.full_name || '').trim().length > 1, points: 1 },
    { field: 'bio', label: 'Founder bio (20+ characters)', condition: (profile.bio || '').trim().length > 20, points: 1 },
    { field: 'location', label: 'City / country', condition: (profile.location || '').trim().length > 1, points: 1 },
    { field: 'founder_skills', label: 'At least 3 founder skills', condition: (profile.founder_skills || []).length >= 3, points: 1 },
    { field: 'commitment_level', label: 'Working commitment', condition: !!profile.commitment_level, points: 1 },
  ];
}
