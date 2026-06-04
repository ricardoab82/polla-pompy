// Server-side auth helpers with explicit type assertions
// Needed because Supabase TypeScript narrowing can resolve to `never`
// when using custom Database generic types in some Next.js 14 setups.

import { createClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';
import type { UserRole } from '@/lib/supabase/types';

interface UserProfile {
  id:                      string;
  email:                   string;
  display_name:            string;
  avatar_url:              string | null;
  role:                    UserRole;
  special_picks_submitted: boolean;
  is_active:               boolean;
}

export async function requireAuth(): Promise<{ supabase: ReturnType<typeof createClient>; userId: string }> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login');
  return { supabase, userId: user.id };
}

export async function getProfile(supabase: ReturnType<typeof createClient>, userId: string): Promise<UserProfile> {
  const { data } = await supabase
    .from('users')
    .select('id, email, display_name, avatar_url, role, special_picks_submitted, is_active')
    .eq('id', userId)
    .single();

  // Explicit cast to bypass Supabase generic narrowing issues
  return data as unknown as UserProfile;
}

export async function requireAdmin(): Promise<{
  supabase: ReturnType<typeof createClient>;
  userId:   string;
  profile:  UserProfile;
}> {
  const { supabase, userId } = await requireAuth();
  const profile = await getProfile(supabase, userId);

  if (!profile || !(['admin', 'co-admin'] as UserRole[]).includes(profile.role)) {
    redirect('/dashboard');
  }

  return { supabase, userId, profile };
}
