import {supabase} from '../lib/supabaseClient';
import {reviewRequest} from './reviewRequest';
const BASE=import.meta.env.VITE_BACKEND_URL||'http://localhost:3001';
export async function profileReviewApi(path,body) {
 return reviewRequest(supabase.auth,fetch,BASE+'/api/profile-review'+path,body);
}
