'use server';

import { createClient, createServiceClient } from '@/lib/supabase/server';
import { BonusQuestionSchema } from '@/lib/schemas';
import { calculateMatchPoints, gradeBonusAnswers, advanceBracketWinner } from '@/lib/points-engine';
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

  const matchId    = formData.get('match_id') as string;
  const homeScore  = Number(formData.get('home_score'));
  const awayScore  = Number(formData.get('away_score'));
  const rawStatus  = formData.get('match_status') as string;
  const validStatuses = ['scheduled', 'live', 'finished'] as const;
  const status = validStatuses.includes(rawStatus as typeof validStatuses[number])
    ? (rawStatus as typeof validStatuses[number])
    : 'finished';

  const { error: updateErr } = await supabase
    .from('matches')
    .update({
      home_score: homeScore,
      away_score: awayScore,
      status,
      updated_at: new Date().toISOString(),
    })
    .eq('id', matchId);

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/admin/matches');
  return { success: true };
}

// Admin override: manually set which team advances from a knockout match
// (used when the match was decided by extra time or penalties).
export async function setMatchWinnerAction(formData: FormData) {
  const { error } = await requireAdmin();
  if (error) return { error };

  const matchId = formData.get('match_id') as string;
  const winner  = formData.get('winner') as 'home' | 'away';

  if (!matchId || !['home', 'away'].includes(winner)) {
    return { error: 'Datos inválidos' };
  }

  const result = await advanceBracketWinner(matchId, winner);
  if (result.error) return { error: result.error };
  if (!result.advanced) return { error: 'Este partido no tiene próximo partido configurado.' };

  revalidatePath('/admin/matches');
  revalidatePath('/bracket');
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
    answer_type:   (formData.get('answer_type') as string) || 'text',
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
  const { error } = await requireAdmin();
  if (error) return { error };

  const userId   = formData.get('user_id') as string;
  const isActive = formData.get('is_active') === 'true';

  // Use service client — users_update_own RLS blocks admin from updating other rows
  const { error: updateErr } = await createServiceClient()
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

  // Use service client — users_update_own RLS blocks admin from updating other rows
  const { error: updateErr } = await createServiceClient()
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

  const champion           = (formData.get('champion') as string).trim();
  const runnerUp           = (formData.get('runner_up') as string).trim();
  const thirdPlace         = (formData.get('third_place') as string).trim();
  const fourthPlace        = (formData.get('fourth_place') as string).trim();
  const topScorer          = (formData.get('top_scorer') as string).trim();
  const goldenBall         = (formData.get('golden_ball') as string).trim();
  const goldenGlove        = (formData.get('golden_glove') as string).trim();
  const colombiaEliminated = (formData.get('colombia_eliminated_phase') as string).trim();
  const colombiaTopScorer  = (formData.get('colombia_top_scorer') as string).trim();

  const { data: allSpecialPicks } = await supabase
    .from('special_picks')
    .select('id, champion, runner_up, third_place, fourth_place, top_scorer, golden_ball, golden_glove, colombia_eliminated_phase, colombia_top_scorer');

  if (!allSpecialPicks) return { error: 'No special picks found' };

  let updated = 0;
  for (const sp of allSpecialPicks) {
    const { error: updateErr } = await supabase
      .from('special_picks')
      .update({
        champion_pts:            sp.champion                    === champion           ? 20 : 0,
        runner_up_pts:           sp.runner_up                   === runnerUp           ? 10 : 0,
        third_place_pts:         thirdPlace  && sp.third_place  === thirdPlace         ?  5 : 0,
        fourth_place_pts:        fourthPlace && sp.fourth_place === fourthPlace        ?  5 : 0,
        top_scorer_pts:          sp.top_scorer                  === topScorer          ? 10 : 0,
        golden_ball_pts:         sp.golden_ball                 === goldenBall         ?  5 : 0,
        golden_glove_pts:        goldenGlove && sp.golden_glove === goldenGlove        ?  5 : 0,
        colombia_eliminated_pts: colombiaEliminated && sp.colombia_eliminated_phase === colombiaEliminated ? 10 : 0,
        colombia_top_scorer_pts: colombiaTopScorer  && sp.colombia_top_scorer         === colombiaTopScorer ?  8 : 0,
      })
      .eq('id', sp.id);

    if (!updateErr) updated++;
  }

  revalidatePath('/admin/special-picks');
  revalidatePath('/standings');
  return { success: true, updated };
}

// ── Bonus week management ───────────────────────────────────

export async function closeBonusWeekAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const weekNumber = Number(formData.get('week_number'));
  const weekStart  = formData.get('week_start') as string;
  const weekEnd    = formData.get('week_end') as string;

  if (!weekNumber || !weekStart || !weekEnd) {
    return { error: 'Faltan datos de la semana' };
  }

  // Check not already closed
  const { data: existing } = await supabase
    .from('bonus_weekly_standings')
    .select('id')
    .eq('week_number', weekNumber)
    .eq('finalized', true)
    .limit(1);

  if (existing?.length) return { error: 'Esta semana ya fue cerrada.' };

  // Get all active users
  const { data: users } = await supabase
    .from('users')
    .select('id')
    .eq('is_active', true);

  if (!users?.length) return { error: 'No hay usuarios activos' };

  // Find question IDs whose match kickoff falls within this week's date range.
  // Dates are in Colombia time (COT = UTC-5), so end-of-day COT is next UTC day 04:59:59Z.
  const weekEndCotUtc = new Date(`${weekEnd}T23:59:59-05:00`).toISOString();
  const { data: questionsInRange } = await supabase
    .from('bonus_questions')
    .select('id, matches!inner(kickoff_utc)')
    .gte('matches.kickoff_utc', `${weekStart}T00:00:00Z`)
    .lte('matches.kickoff_utc', weekEndCotUtc);

  const questionIds = (questionsInRange ?? []).map((q) => q.id);

  // Sum bonus points per user — only answers for this week's questions
  const { data: answerTotals } = await supabase
    .from('bonus_answers')
    .select('user_id, points_earned')
    .is('week_number', null)
    .in('question_id', questionIds.length > 0 ? questionIds : ['']);

  const ptsByUser = new Map<string, number>();
  for (const a of answerTotals ?? []) {
    if (a.points_earned) {
      ptsByUser.set(a.user_id, (ptsByUser.get(a.user_id) ?? 0) + a.points_earned);
    }
  }

  // Build ranked standings
  const ranked = users
    .map((u) => ({ user_id: u.id, pts: ptsByUser.get(u.id) ?? 0 }))
    .sort((a, b) => b.pts - a.pts);

  let rank = 1;
  const rows = ranked.map((r, i) => {
    if (i > 0 && r.pts < ranked[i - 1].pts) rank = i + 1;
    return {
      week_number:            weekNumber,
      week_start:             weekStart,
      week_end:               weekEnd,
      user_id:                r.user_id,
      bonus_points_this_week: r.pts,
      rank,
      finalized:              true,
    };
  });

  const { error: insertErr } = await supabase
    .from('bonus_weekly_standings')
    .upsert(rows, { onConflict: 'week_number,user_id' });

  if (insertErr) return { error: insertErr.message };

  // Stamp only this week's answers — answers from other weeks stay unassigned
  if (questionIds.length > 0) {
    await supabase
      .from('bonus_answers')
      .update({ week_number: weekNumber })
      .is('week_number', null)
      .in('question_id', questionIds);
  }

  revalidatePath('/admin/bonus-weeks');
  revalidatePath('/bonus-standings');
  return { success: true, snapshotted: rows.length };
}

export async function assignSponsorPrizeAction(formData: FormData) {
  const { error, supabase } = await requireAdmin();
  if (error || !supabase) return { error };

  const weekNumber   = Number(formData.get('week_number'));
  const sponsorPrize = (formData.get('sponsor_prize') as string).trim();

  const { error: updateErr } = await supabase
    .from('bonus_weekly_standings')
    .update({ sponsor_prize: sponsorPrize })
    .eq('week_number', weekNumber);

  if (updateErr) return { error: updateErr.message };

  revalidatePath('/admin/bonus-weeks');
  revalidatePath('/bonus-standings');
  return { success: true };
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
