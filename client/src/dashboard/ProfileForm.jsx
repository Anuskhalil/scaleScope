import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { useAuth } from '../auth/AuthContext';
const roles = ['student', 'job_seeker', 'graduate', 'founder', 'investor', 'mentor', 'mentor_investor'];

export default function ProfileForm() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState('');
  const [profile, setProfile] = useState({
    full_name: '', username: '', role: null, headline: '', bio: '',
    skills: [], interests: [], location: '', website: '', linkedin_url: '', github_url: ''
  });

  useEffect(() => {
    async function load() {
      if (!user) return;
      setLoading(true);
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();
      if (error) setMsg(error.message);
      if (data) {
        setProfile({
          ...profile,
          ...data,
          skills: data.skills ?? [],
          interests: data.interests ?? [],
        });
      }
      setLoading(false);
    }
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  async function save(e) {
    e.preventDefault();
    setMsg('');
    const updates = {
      full_name: profile.full_name,
      username: profile.username || null,
      role: profile.role || null,
      headline: profile.headline || null,
      bio: profile.bio || null,
      skills: profile.skills,
      interests: profile.interests,
      location: profile.location || null,
      website: profile.website || null,
      linkedin_url: profile.linkedin_url || null,
      github_url: profile.github_url || null,
    };
    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);
    if (error) setMsg(error.message);
    else setMsg('Saved!');
  }

  if (loading) return <div>Loading profile...</div>;

  return (
    <form onSubmit={save} className="space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <input className="border p-2 rounded" placeholder="Full name"
          value={profile.full_name || ''} onChange={e => setProfile(p => ({ ...p, full_name: e.target.value }))} />
        <input className="border p-2 rounded" placeholder="Username"
          value={profile.username || ''} onChange={e => setProfile(p => ({ ...p, username: e.target.value }))} />
        <select className="border p-2 rounded" value={profile.role || ''} onChange={e => setProfile(p => ({ ...p, role: e.target.value }))}>
          <option value="">Role...</option>
          {roles.map(r => <option key={r} value={r}>{r}</option>)}
        </select>
        <input className="border p-2 rounded" placeholder="Location"
          value={profile.location || ''} onChange={e => setProfile(p => ({ ...p, location: e.target.value }))} />
        <input className="border p-2 rounded" placeholder="Website"
          value={profile.website || ''} onChange={e => setProfile(p => ({ ...p, website: e.target.value }))} />
        <input className="border p-2 rounded" placeholder="LinkedIn URL"
          value={profile.linkedin_url || ''} onChange={e => setProfile(p => ({ ...p, linkedin_url: e.target.value }))} />
        <input className="border p-2 rounded" placeholder="GitHub URL"
          value={profile.github_url || ''} onChange={e => setProfile(p => ({ ...p, github_url: e.target.value }))} />
      </div>
      <input className="border p-2 rounded w-full" placeholder="Headline"
        value={profile.headline || ''} onChange={e => setProfile(p => ({ ...p, headline: e.target.value }))} />
      <textarea className="border p-2 rounded w-full" rows="4" placeholder="Bio"
        value={profile.bio || ''} onChange={e => setProfile(p => ({ ...p, bio: e.target.value }))} />
      <input className="border p-2 rounded w-full" placeholder="Skills (comma separated)"
        value={(profile.skills || []).join(', ')}
        onChange={e => setProfile(p => ({ ...p, skills: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
      <input className="border p-2 rounded w-full" placeholder="Interests (comma separated)"
        value={(profile.interests || []).join(', ')}
        onChange={e => setProfile(p => ({ ...p, interests: e.target.value.split(',').map(s => s.trim()).filter(Boolean) }))} />
      <button className="bg-blue-600 text-white p-2 rounded">Save profile</button>
      <button
        type="button"
        className="bg-red-500 text-white p-2 rounded ml-2"
        onClick={() => supabase.auth.signOut()}
      >
        Sign out
      </button>
      {msg && <p className="text-sm text-gray-700">{msg}</p>}
    </form>
  );
}