import { supabase } from '@/lib/supabaseClient';

export function normalizeHobbies(raw) {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter((h) => h != null && String(h).trim() !== '');
  if (typeof raw === 'string') {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? normalizeHobbies(parsed) : [raw];
    } catch {
      return [raw];
    }
  }
  return [];
}

export async function fetchUserProfile() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { _guest: true };

  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) throw error;
  return data;
}
