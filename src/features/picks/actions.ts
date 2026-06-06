'use server';

import { createClient } from '@/lib/supabase/server';
import { PickSchema, BonusAnswerSchema } from '@/lib/schemas';
import { PICK_LOCK_MINUTES } from '@/lib/config';
import { revalidatePath } from 'next/cache';

export interface BulkPickInput {
  match_id:  string;
  home_pick: number;
  away_pick: number;
}

export async function submitBulkPicksAction(picks: BulkPickInput[]): Promise<{
  saved: number;
  errors: Record<string, string>;
}> {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { saved: 0, errors: { _auth: 'No autenticado' } };

  const matchIds = picks.map((p) => p.match_id);
  const { data: matches } = await supabase
    .from('matches')
    .select('id, kickoff_utc')
    .in('id', matchIds);

  const now = Date.now();
  const lockMap = new Map(
    (matches ?? []).map((m) => [
      m.id,
      new Date(m.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000,
    ])
  );

  let saved = 0;
  const errors: Record<string, string> = {};

  for (const pick of picks) {
    const lockTime = lockMap.get(pick.match_id);
    if (!lockTime || now >= lockTime) {
      errors[pick.match_id] = 'Cerrado';
      continue;
    }

    const { error } = await supabase
      .from('picks')
      .upsert(
        {
          user_id:          user.id,
          match_id:         pick.match_id,
          home_pick:        pick.home_pick,
          away_pick:        pick.away_pick,
          is_auto_assigned: false,
          submitted_at:     new Date().toISOString(),
        },
        { onConflict: 'user_id,match_id' }
      );

    if (error) {
      errors[pick.match_id] = error.message;
    } else {
      saved++;
    }
  }

  revalidatePath('/picks');
  return { saved, errors };
}

export async function submitPickAction(formData: FormData) {
  const raw = {
    match_id:  formData.get('match_id') as string,
    home_pick: Number(formData.get('home_pick')),
    away_pick: Number(formData.get('away_pick')),
  };

  const parsed = PickSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'No autenticado' };

  // Verify lock status
  const { data: match } = await supabase
    .from('matches')
    .select('kickoff_utc, status')
    .eq('id', parsed.data.match_id)
    .single();

  if (!match) return { error: 'Partido no encontrado' };

  const lockTime = new Date(new Date(match.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000);
  if (new Date() >= lockTime) {
    return { error: 'El tiempo de picks ha cerrado para este partido.' };
  }

  const { error } = await supabase
    .from('picks')
    .upsert(
      {
        user_id:          user.id,
        match_id:         parsed.data.match_id,
        home_pick:        parsed.data.home_pick,
        away_pick:        parsed.data.away_pick,
        is_auto_assigned: false,
        submitted_at:     new Date().toISOString(),
      },
      { onConflict: 'user_id,match_id' }
    );

  if (error) return { error: error.message };

  revalidatePath(`/picks/${parsed.data.match_id}`);
  revalidatePath('/picks');
  return { success: true };
}

export async function submitBonusAnswerAction(formData: FormData) {
  const raw = {
    question_id: formData.get('question_id') as string,
    answer:      formData.get('answer') as string,
  };

  const parsed = BonusAnswerSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }

  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) return { error: 'No autenticado' };

  // Verify the match isn't locked
  const { data: question } = await supabase
    .from('bonus_questions')
    .select('match_id')
    .eq('id', parsed.data.question_id)
    .single();

  if (!question) return { error: 'Pregunta no encontrada' };

  const { data: match } = await supabase
    .from('matches')
    .select('kickoff_utc')
    .eq('id', question.match_id)
    .single();

  if (!match) return { error: 'Partido no encontrado' };

  const lockTime = new Date(new Date(match.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000);
  if (new Date() >= lockTime) {
    return { error: 'El tiempo de respuestas ha cerrado para este partido.' };
  }

  const { error } = await supabase
    .from('bonus_answers')
    .upsert(
      {
        question_id: parsed.data.question_id,
        user_id:     user.id,
        answer:      parsed.data.answer,
        submitted_at: new Date().toISOString(),
      },
      { onConflict: 'question_id,user_id' }
    );

  if (error) return { error: error.message };

  revalidatePath(`/picks/${question.match_id}`);
  return { success: true };
}
