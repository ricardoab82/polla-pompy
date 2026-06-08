'use server';

import { createClient } from '@/lib/supabase/server';
import { SpecialPicksSchema, UpdateDisplayNameSchema } from '@/lib/schemas';
import { REGISTRATION_DEADLINE } from '@/lib/config';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';

export async function submitSpecialPicksAction(formData: FormData) {
  if (new Date() > REGISTRATION_DEADLINE) {
    return { error: 'El período de picks especiales ha cerrado.' };
  }

  const raw = {
    champion:    formData.get('champion') as string,
    runner_up:   formData.get('runner_up') as string,
    top_scorer:  formData.get('top_scorer') as string,
    golden_ball: formData.get('golden_ball') as string,
  };

  const parsed = SpecialPicksSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.champion === parsed.data.runner_up) {
    return { error: 'Campeón y subcampeón no pueden ser el mismo equipo.' };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  // Upsert special picks
  const { error: picksError } = await supabase
    .from('special_picks')
    .upsert(
      { user_id: user.id, ...parsed.data, submitted_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (picksError) return { error: picksError.message };

  // Mark special_picks_submitted on user record
  const { error: userError } = await supabase
    .from('users')
    .update({ special_picks_submitted: true })
    .eq('id', user.id);

  if (userError) return { error: userError.message };

  revalidatePath('/onboarding');
  redirect('/dashboard');
}

export async function updateSpecialPicksAction(formData: FormData) {
  if (new Date() > REGISTRATION_DEADLINE) {
    return { error: 'El período de picks especiales ha cerrado.' };
  }

  const raw = {
    champion:    formData.get('champion') as string,
    runner_up:   formData.get('runner_up') as string,
    top_scorer:  formData.get('top_scorer') as string,
    golden_ball: formData.get('golden_ball') as string,
  };

  const parsed = SpecialPicksSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  if (parsed.data.champion === parsed.data.runner_up) {
    return { error: 'Campeón y subcampeón no pueden ser el mismo equipo.' };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error: picksError } = await supabase
    .from('special_picks')
    .upsert(
      { user_id: user.id, ...parsed.data, submitted_at: new Date().toISOString() },
      { onConflict: 'user_id' }
    );

  if (picksError) return { error: picksError.message };

  revalidatePath('/profile');
  return { success: true };
}

export async function updateDisplayNameAction(formData: FormData) {
  const raw = { display_name: formData.get('display_name') as string };
  const parsed = UpdateDisplayNameSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado' };

  const { error } = await supabase
    .from('users')
    .update({ display_name: parsed.data.display_name })
    .eq('id', user.id);

  if (error) return { error: error.message };

  revalidatePath('/profile');
  revalidatePath('/onboarding');
  return { success: true };
}
