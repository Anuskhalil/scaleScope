export function passportVisible(env) {
 return env.VITE_PASSPORT_STAGING === 'true' || env.VITE_PASSPORT_ENABLED === 'true';
}
