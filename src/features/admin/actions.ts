'use server';

import { createClient } from '@/lib/supabase/server';
import { BonusQuestionSchema } from '@/lib/schemas';
import { calculateMatchPoints, gradeBonusAnswers } from '@/lib/points-engine';
import { revalidatePath } from 'next/cache';

async function requireAdmin() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { error: 'No autenticado', supabase: null, user: null };

  const { data: profile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (!profile || !['admin', 'co-admin'].includes(profile.role)) {
    return { error: 'Sin permisos', supabase: null, user: null };
  }

  return { error: null, supabase, user };
}

// ── Match management ───────────────────────────────────────

export async function updateMatchResultAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const matchId   = formData.get('match_id') as string;
  const homeScore = Number(formData.get('home_score'));
  const awayScore = Number(formData.get('away_score'));

  const { error: updateErr } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status:     'finished',
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/admin/matches');
  return { success: true };
}

export async function recalculateMatchPointsAction(formData: FormData) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const matchId = formData.get('match_id') as string;
  const result  = await calculateMatchPoints(matchId);

  revalidatePath('/admin/matches');
  revalidatePath('/standings');
  return { success: true, ...result };
}

// ── Bonus questions ─────────────────────────────────────────

export async function createBonusQuestionAction(formData: FormData) {
  const { error, supabase, user } = await requireAdmin();
  if (error || !supabase || !user) return { error };

  const raw = {
    match_id:      formData.get('match_id') as string,
    question_text: formData.get('question_text') as string,
    points_value:  Number(formData.get('points_value')),
  };

  const parsed = BonusQuestionSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  // Enforce max 5 questions per match
  const { count } = await supabase
    .from('bonus_questions')
    .select('*', { count: 'exact', head: true })
    .eq('match_id', parsed.data.match_id);

  if ((count ?? 0) >= 5) {
    return { error: 'Máximo 5 preguntas bonus por partido.' };
  }

  const { error: insertErr } = await supabase
    .from('bonus_questions')
    .insert({ ...parsed.data, created_by: user.id });

  if (insertErr) return { error: insertErr.message };

  revalidatePath(`/admin/bonus/${parsed.data.match_id}`);
  return { success: true };
}

export async function setCorrectAnswerAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const questionId    = formData.get('question_id') as string;
  const correctAnswer = (formData.get('correct_answer') as string).trim();

  const { error: updateErr } = await supabase
    .from('bonus_questions')
    .update({ correct_answer: correctAnswer })
    .eq('id', questionId);

  if (updateErr) return { error: updateErr.message };

  // Auto-grade all answers
  const result = await gradeBonusAnswers(questionId);

  revalidatePath('/admin/bonus');
  revalidatePath('/standings');
  return { success: true, ...result };
}

export async function deleteBonusQuestionAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const questionId = formData.get('question_id') as string;

  // Only allow delete before match starts
  const { data: question } = await supabase
    .from('bonus_questions')
    .select('match_id')
    .eq('id', questionId)
    .single();

  if (!question) return { error: 'Pregunta no encontrada' };

  const { data: match } = await supabase
    .from('matches')
    .select('kickoff_utc')
    .eq('id', question.match_id)
    .single();

  if (match && new Date(match.kickoff_utc) < new Date()) {
    return { error: 'No se puede eliminar una pregunta de un partido ya iniciado.' };
  }

  const { error: deleteErr } = await supabase
    .from('bonus_questions')
    .delete()
    .eq('id', questionId);

  if (deleteErr) return { error: deleteErr.message };

  revalidatePath(`/admin/bonus/${question.match_id}`);
  return { success: true };
}

// ── User management ─────────────────────────────────────────

export async function toggleUserActiveAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const userId   = formData.get('user_id') as string;
  const isActive = formData.get('is_active') === 'true';

  const { error: updateErr } = await supabase
    .from('users')
    .update({ is_active: !isActive })
    .eq('id', userId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/admin/users');
  return { success: true };
}

export async function assignCoAdminAction(formData: FormData) {
  const { error, supabase, user } = await requireAdmin();
  if (error || !supabase || !user) return { error };

  // Only Admin (not co-admin) can assign co-admins
  const { data: adminProfile } = await supabase
    .from('users')
    .select('role')
    .eq('id', user.id)
    .single();

  if (adminProfile?.role !== 'admin') {
    return { error: 'Solo el admin puede asignar co-admins.' };
  }

  const targetUserId = formData.get('user_id') as string;
  const newRole      = formData.get('role') as string;

  if (!['participant', 'co-admin'].includes(newRole)) {
    return { error: 'Rol inválido' };
  }

  const { error: updateErr } = await supabase
    .from('users')
    .update({ role: newRole })
    .eq('id', targetUserId)
    .neq('role', 'admin'); // Never downgrade the admin

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/admin/users');
  return { success: true };
}

// ── Special picks grading ───────────────────────────────────

export async function gradeSpecialPicksAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const champion    = (formData.get('champion') as string).trim();
  const runnerUp    = (formData.get('runner_up') as string).trim();
  const topScorer   = (formData.get('top_scorer') as string).trim();
  const goldenBall  = (formData.get('golden_ball') as string).trim();

  const { data: allSpecialPicks } = await supabase
    .from('special_picks')
    .select('id, champion, runner_up, top_scorer, golden_ball');

  if (!allSpecialPicks) return { error: 'No special picks found' };

  let updated = 0;
  for (const sp of allSpecialPicks) {
    const { error: updateErr } = await supabase
      .from('special_picks')
      .update({
        champion_pts:    sp.champion    === champion   ? 20 : 0,
        runner_up_pts:   sp.runner_up   === runnerUp   ? 10 : 0,
        top_scorer_pts:  sp.top_scorer  === topScorer  ? 10 : 0,
        golden_ball_pts: sp.golden_ball === goldenBall ?  5 : 0,
      })
      .eq('id', sp.id);

    if (!updateErr) updated++;
  }

  revalidatePath('/admin/special-picks');
  revalidatePath('/standings');
  return { success: true, updated };
}

// ── Full recalculation ──────────────────────────────────────

export async function recalculateAllPointsAction() {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const { data: finishedMatches } = await supabase
    .from('matches')
    .select('id')
    .eq('status', 'finished');

  if (!finishedMatches) return { error: 'No finished matches' };

  let totalProcessed = 0;
  const allErrors: string[] = [];

  for (const match of finishedMatches) {
    const { processed, errors } = await calculateMatchPoints(match.id);
    totalProcessed += processed;
    allErrors.push(...errors);
  }

  revalidatePath('/standings');
  revalidatePath('/dashboard');
  return { success: true, processed: totalProcessed, errors: allErrors };
}
