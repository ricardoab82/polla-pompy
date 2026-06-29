// Points calculation engine — idempotent, safe to re-run.
// Takes match result + all picks → recalculates + overwrites, never double-counts.
// After calculation: snapshots position_history + sends emails.

import { createServiceClient } from '@/lib/supabase/server';
import { calculatePoints } from '@/lib/scoring';
import type { Phase } from '@/lib/scoring';
import { sendPointsUpdatedEmail } from '@/lib/notifications';

const KNOCKOUT_PHASES = ['round_of_32', 'round_of_16', 'quarterfinal', 'semifinal', 'final'] as const;

// Advance the winner of a finished knockout match into the next match slot.
// Called automatically when scores are decisive; can also be called manually by admin.
export async function advanceBracketWinner(
  matchId: string,
  winner: 'home' | 'away',
): Promise<{ advanced: boolean; error?: string }> {
  const supabase = createServiceClient();

  const { data: match } = await supabase
    .from('matches')
    .select('next_match_id, next_match_position, home_team, away_team, home_team_logo, away_team_logo')
    .eq('id', matchId)
    .single();

  if (!match?.next_match_id || !match?.next_match_position) {
    return { advanced: false }; // no bracket link configured yet
  }

  const teamName = winner === 'home' ? match.home_team : match.away_team;
  const teamLogo = winner === 'home' ? match.home_team_logo : match.away_team_logo;
  const teamCol  = match.next_match_position === 'home' ? 'home_team' : 'away_team';
  const logoCol  = match.next_match_position === 'home' ? 'home_team_logo' : 'away_team_logo';

  const { error } = await supabase
    .from('matches')
    .update({ [teamCol]: teamName, [logoCol]: teamLogo, updated_at: new Date().toISOString() })
    .eq('id', match.next_match_id);

  if (error) return { advanced: false, error: error.message };
  return { advanced: true };
}

export async function calculateMatchPoints(matchId: string): Promise<{
  processed: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let processed = 0;
  const supabase = createServiceClient();

  // 1. Fetch the finished match
  const { data: match, error: matchErr } = await supabase
    .from('matches')
    .select('id, phase, home_score, away_score, home_team, away_team, status')
    .eq('id', matchId)
    .single();

  if (matchErr || !match) {
    errors.push(`Match not found: ${matchErr?.message}`);
    return { processed, errors };
  }

  if (match.status !== 'finished' || match.home_score === null || match.away_score === null) {
    errors.push('Match not finished or missing scores');
    return { processed, errors };
  }

  // 2. Fetch all picks for this match
  const { data: picks, error: picksErr } = await supabase
    .from('picks')
    .select('id, user_id, home_pick, away_pick')
    .eq('match_id', matchId);

  if (picksErr) {
    errors.push(`Picks query: ${picksErr.message}`);
    return { processed, errors };
  }

  // 3. Calculate and update points for each pick
  const result = { homeScore: match.home_score, awayScore: match.away_score };
  const phase  = match.phase as Phase;

  for (const pick of picks ?? []) {
    const points = calculatePoints(
      result,
      { homePick: pick.home_pick, awayPick: pick.away_pick },
      phase
    );

    const { error: updateErr } = await supabase
      .from('picks')
      .update({ points_earned: points })
      .eq('id', pick.id);

    if (updateErr) {
      errors.push(`Pick ${pick.id}: ${updateErr.message}`);
    } else {
      processed++;
    }
  }

  // 4. Auto-advance bracket winner for knockout matches with a decisive result.
  //    Draws require admin override (extra time / penalties not tracked here).
  if (
    (KNOCKOUT_PHASES as readonly string[]).includes(match.phase) &&
    match.home_score !== match.away_score
  ) {
    const winner = (match.home_score ?? 0) > (match.away_score ?? 0) ? 'home' : 'away';
    await advanceBracketWinner(matchId, winner);
  }

  // 5. Snapshot position_history
  await snapshotPositions();

  // 6. Send points-updated emails to all affected users
  if (picks?.length) {
    await sendPointsEmails(match, picks);
  }

  return { processed, errors };
}

async function snapshotPositions(): Promise<void> {
  const supabase = createServiceClient();

  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('user_id, total_points, rank');

  if (!leaderboard?.length) return;

  const now = new Date().toISOString();
  const snapshots = leaderboard.map((row) => ({
    user_id:      row.user_id,
    snapshot_at:  now,
    position:     row.rank,
    total_points: row.total_points,
  }));

  await supabase.from('position_history').insert(snapshots);
}

async function sendPointsEmails(
  match: {
    id: string;
    home_team: string;
    away_team: string;
    home_score: number;
    away_score: number;
  },
  picks: Array<{ user_id: string; home_pick: number; away_pick: number }>
): Promise<void> {
  const supabase = createServiceClient();

  // Get updated leaderboard for ranks
  const { data: leaderboard } = await supabase
    .from('leaderboard')
    .select('user_id, rank');

  // Get user emails
  const userIds = Array.from(new Set(picks.map((p) => p.user_id)));
  const { data: users } = await supabase
    .from('users')
    .select('id, email, display_name')
    .in('id', userIds);

  if (!users) return;

  // Get updated points for each pick
  const { data: updatedPicks } = await supabase
    .from('picks')
    .select('user_id, points_earned')
    .eq('match_id', match.id);

  const pointsMap = new Map(updatedPicks?.map((p) => [p.user_id, p.points_earned ?? 0]));
  const rankMap   = new Map(leaderboard?.map((l) => [l.user_id, l.rank]));

  for (const user of users) {
    const points = pointsMap.get(user.id) ?? 0;
    const rank   = rankMap.get(user.id) ?? 0;

    await sendPointsUpdatedEmail(
      user.email,
      user.display_name,
      match.home_team,
      match.away_team,
      match.home_score,
      match.away_score,
      points,
      rank,
      match.id
    );
  }
}

// Auto-grade bonus answers after admin sets correct_answer
export async function gradeBonusAnswers(questionId: string): Promise<{
  graded: number;
  errors: string[];
}> {
  const errors: string[] = [];
  let graded = 0;
  const supabase = createServiceClient();

  const { data: question, error: qErr } = await supabase
    .from('bonus_questions')
    .select('id, correct_answer, points_value, answered_at, answer_type')
    .eq('id', questionId)
    .single();

  if (qErr || !question?.correct_answer) {
    errors.push(`Question not found or no correct answer: ${qErr?.message}`);
    return { graded, errors };
  }

  // text type: skip auto-grading (admin grades manually by setting correct_answer,
  // but we still do exact-match so they can trigger it if they want)
  const answerType    = question.answer_type ?? 'text';
  const correctAnswer = question.correct_answer.trim().toLowerCase();

  const { data: answers, error: aErr } = await supabase
    .from('bonus_answers')
    .select('id, answer')
    .eq('question_id', questionId);

  if (aErr) {
    errors.push(`Answers query: ${aErr.message}`);
    return { graded, errors };
  }

  for (const ans of answers ?? []) {
    let isCorrect: boolean;
    if (answerType === 'number') {
      isCorrect = Number(ans.answer.trim()) === Number(question.correct_answer.trim());
    } else {
      isCorrect = ans.answer.trim().toLowerCase() === correctAnswer;
    }
    const pointsEarned = isCorrect ? question.points_value : 0;

    const { error: updateErr } = await supabase
      .from('bonus_answers')
      .update({ is_correct: isCorrect, points_earned: pointsEarned })
      .eq('id', ans.id);

    if (updateErr) {
      errors.push(`Answer ${ans.id}: ${updateErr.message}`);
    } else {
      graded++;
    }
  }

  // Mark question as answered
  await supabase
    .from('bonus_questions')
    .update({ answered_at: new Date().toISOString() })
    .eq('id', questionId);

  return { graded, errors };
}
