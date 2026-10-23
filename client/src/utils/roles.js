export const ACTIVE_ROLES = ['early-stage-founder', 'investor'];

// Legacy students use the founder experience while their data is migrated.
export const normalizeRole = (role) => role === 'student' ? 'early-stage-founder' : role;
export const roleLabel = (role) => normalizeRole(role) === 'early-stage-founder' ? 'Early Founder' : role === 'investor' ? 'Investor' : 'Retired role';
