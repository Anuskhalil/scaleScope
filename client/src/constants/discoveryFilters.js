export const DISCOVERY_SKILLS = [
  'Technical / Dev', 'Frontend', 'Backend', 'Full Stack', 'Mobile Apps',
  'AI / ML', 'Data Science', 'Data Analysis', 'Cybersecurity', 'Cloud / DevOps',
  'No-Code', 'Product Management', 'Design / UI-UX', 'User Research',
  'Business Strategy', 'Marketing', 'Growth Marketing', 'SEO', 'Sales',
  'Finance', 'Fundraising', 'Pitch Decks', 'Operations', 'Legal / Compliance',
  'Content Creation', 'Community Building', 'Customer Success', 'HR / Hiring',
  'Market Research', 'Partnerships',
];

export const DISCOVERY_INDUSTRIES = [
  'EdTech', 'HealthTech', 'FinTech', 'SaaS', 'E-commerce', 'AgriTech',
  'CleanTech', 'ClimateTech', 'LegalTech', 'HRTech', 'AI / ML',
  'Cybersecurity', 'Developer Tools', 'DeepTech', 'Gaming', 'Social Impact',
  'Creator Economy', 'Logistics', 'TravelTech', 'PropTech', 'FoodTech',
  'RetailTech', 'Web3', 'Media', 'Consumer Apps', 'B2B', 'Other',
];

export const COMMITMENT_OPTIONS = [
  'Exploring',
  'Casual (2–5 hrs/week)',
  'Serious (5–15 hrs/week)',
  'Full-time (15–30 hrs/week)',
];

export const AVAILABILITY_OPTIONS = [
  'Exploring', 'Available now', 'Available part-time', 'Available full-time',
  'Weekdays', 'Weekends', 'Evenings', 'Remote only', 'Busy this month',
  'Not available',
];

export const STARTUP_STAGE_OPTIONS = [
  'Idea / Concept', 'Just an Idea', 'Researching', 'Problem Validation',
  'Pre-MVP', 'Building MVP', 'MVP Built', 'Beta / Pilot', 'Getting Users',
  'Pre-revenue', 'Revenue Stage', 'Growing', 'Pre-seed', 'Seed', 'Series A',
  'Series B', 'Series B+', 'Growth',
];

export const DISCOVERY_LOCATIONS = [
  'Remote', 'Global / Remote', 'Pakistan', 'Karachi', 'Lahore', 'Islamabad',
  'Rawalpindi', 'Faisalabad', 'Multan', 'Peshawar', 'Quetta', 'Sialkot',
  'South Asia', 'MENA', 'GCC', 'UAE', 'Dubai', 'Saudi Arabia', 'Singapore',
  'Southeast Asia', 'USA', 'Canada', 'UK', 'Europe', 'Africa',
  'Latin America',
];

export const TEAM_ROLE_OPTIONS = [
  'Co-Founder', 'Technical Co-Founder', 'Business Co-Founder', 'Developer',
  'Frontend Developer', 'Backend Developer', 'Mobile Developer', 'AI / ML Engineer',
  'Product Manager', 'Designer', 'UI / UX Designer', 'Marketer', 'Growth Marketer',
  'Sales', 'Finance', 'Operations', 'Content Creator', 'Community Manager',
  'Legal / Compliance', 'Advisor', 'Intern',
];

export const MENTOR_HELP_AREAS = [
  'Product Strategy', 'Technical Architecture', 'MVP Development', 'Design / UX',
  'Marketing & Growth', 'Customer Acquisition', 'Sales', 'Fundraising',
  'Pitch Deck Review', 'Investor Readiness', 'Market Research', 'User Research',
  'Business Model', 'Revenue Strategy', 'Legal & Compliance', 'Finance',
  'Team Building', 'Hiring', 'Operations', 'Leadership', 'Mentorship',
];

export const mergeFilterOptions = (defaults, values = []) => [
  ...new Set([
    ...defaults,
    ...values.flat(Infinity).filter((value) => typeof value === 'string' && value.trim()),
  ]),
];
