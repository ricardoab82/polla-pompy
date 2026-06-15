'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Countdown from '@/components/ui/Countdown';
import { submitPickAction, submitBonusAnswerAction } from '@/features/picks/actions';
import { PICK_LOCK_MINUTES, FEATURES } from '@/lib/config';
import { useToast } from '@/components/ui/Toast';
import { createClient } from '@/lib/supabase/client';
import { useEffect } from 'react';
import type { Database } from '@/lib/supabase/types';

type Match          = Database['public']['Tables']['matches']['Row'];
type Pick           = Database['public']['Tables']['picks']['Row'];
type BonusQuestion  = Database['public']['Tables']['bonus_questions']['Row'];
type BonusAnswer    = Database['public']['Tables']['bonus_answers']['Row'];

const PHASE_LABELS: Record<string, string> = {
  group: 'Fase de grupos', round_of_32: 'Ronda de 32',
  round_of_16: 'Octavos', quarterfinal: 'Cuartos',
  semifinal: 'Semifinal', final: 'Final',
};

function formatKickoff(utc: string): string {
  return new Date(utc).toLocaleString('es-CO', {
    timeZone: 'America/Bogota',
    weekday: 'long', day: 'numeric', month: 'long',
    hour: '2-digit', minute: '2-digit',
  });
}

export default function PickDetailPage({ params }: { params: { match_id: string } }) {
  const { match_id } = params;
  const router       = useRouter();
  const { toast }    = useToast();

  const [match,     setMatch]     = useState<Match | null>(null);
  const [myPick,    setMyPick]    = useState<Pick | null>(null);
  const [questions, setQuestions] = useState<BonusQuestion[]>([]);
  const [myAnswers, setMyAnswers] = useState<Map<string, BonusAnswer>>(new Map());
  const [loading,   setLoading]   = useState(true);

  const [homePick, setHomePick]   = useState('');
  const [awayPick, setAwayPick]   = useState('');
  const [answerValues, setAnswerValues] = useState<Record<string, string>>({});

  const [pickPending, startPickTransition] = useTransition();

  // Per-question autosave state (avoids shared-transition race condition)
  const [answerStatuses, setAnswerStatuses] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [answerErrors,   setAnswerErrors]   = useState<Record<string, string>>({});
  const [lastSavedAnswers, setLastSavedAnswers] = useState<Record<string, string>>({});

  useEffect(() => {
    const supabase = createClient();

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const [matchRes, pickRes, questionsRes] = await Promise.all([
        supabase.from('matches').select('*').eq('id', match_id).single(),
        supabase.from('picks').select('*').eq('match_id', match_id).eq('user_id', user.id).maybeSingle(),
        supabase.from('bonus_questions').select('*').eq('match_id', match_id).order('created_at'),
      ]);

      setMatch(matchRes.data);
      setMyPick(pickRes.data);
      setQuestions(questionsRes.data ?? []);

      if (pickRes.data) {
        setHomePick(String(pickRes.data.home_pick));
        setAwayPick(String(pickRes.data.away_pick));
      }

      if (questionsRes.data?.length) {
        const { data: answers } = await supabase
          .from('bonus_answers')
          .select('*')
          .in('question_id', questionsRes.data.map((q) => q.id))
          .eq('user_id', user.id);

        setMyAnswers(new Map(answers?.map((a) => [a.question_id, a]) ?? []));
        const initVals: Record<string, string> = {};
        answers?.forEach((a) => { initVals[a.question_id] = a.answer; });
        setAnswerValues(initVals);
      }

      setLoading(false);
    }

    load();
  }, [match_id, router]);

  if (loading || !match) {
    return (
      <div className="max-w-xl mx-auto px-4 py-12">
        <div className="space-y-4">
          <div className="skeleton h-8 w-48" />
          <div className="skeleton h-32 w-full rounded-xl" />
          <div className="skeleton h-48 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const lockTime   = new Date(new Date(match.kickoff_utc).getTime() - PICK_LOCK_MINUTES * 60 * 1000);
  const isLocked   = new Date() >= lockTime;
  const isLive     = match.status === 'live';
  const isFinished = match.status === 'finished';

  function handlePickSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData();
    fd.set('match_id',  match!.id);
    fd.set('home_pick', homePick);
    fd.set('away_pick', awayPick);

    startPickTransition(async () => {
      const result = await submitPickAction(fd);
      if (result?.error) {
        toast(result.error, 'error');
      } else {
        setMyPick((prev) => ({
          ...(prev ?? {}),
          home_pick: Number(homePick),
          away_pick: Number(awayPick),
          is_auto_assigned: false,
        } as Pick));
        toast('✅ Pick guardado', 'success');
      }
    });
  }

  // For yes_no / team: save immediately with the chosen value (no blur needed)
  async function handleAnswerSelect(questionId: string, value: string) {
    if (!value) return;
    setAnswerValues((prev) => ({ ...prev, [questionId]: value }));
    if (lastSavedAnswers[questionId] === value) return;

    setAnswerStatuses((prev) => ({ ...prev, [questionId]: 'saving' }));
    setAnswerErrors((prev) => { const n = { ...prev }; delete n[questionId]; return n; });

    const fd = new FormData();
    fd.set('question_id', questionId);
    fd.set('answer', value);

    const result = await submitBonusAnswerAction(fd);
    if (result?.error) {
      setAnswerStatuses((prev) => ({ ...prev, [questionId]: 'error' }));
      setAnswerErrors((prev) => ({ ...prev, [questionId]: result.error! }));
    } else {
      setAnswerStatuses((prev) => ({ ...prev, [questionId]: 'saved' }));
      setLastSavedAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
  }

  async function handleAnswerBlur(questionId: string) {
    const value = answerValues[questionId]?.trim();
    if (!value) return;
    // Skip if nothing changed since last successful save
    if (lastSavedAnswers[questionId] === value) return;
    // Skip if already saving
    if (answerStatuses[questionId] === 'saving') return;

    setAnswerStatuses((prev) => ({ ...prev, [questionId]: 'saving' }));
    setAnswerErrors((prev) => { const n = { ...prev }; delete n[questionId]; return n; });

    const fd = new FormData();
    fd.set('question_id', questionId);
    fd.set('answer', value);

    const result = await submitBonusAnswerAction(fd);
    if (result?.error) {
      setAnswerStatuses((prev) => ({ ...prev, [questionId]: 'error' }));
      setAnswerErrors((prev) => ({ ...prev, [questionId]: result.error! }));
    } else {
      setAnswerStatuses((prev) => ({ ...prev, [questionId]: 'saved' }));
      setLastSavedAnswers((prev) => ({ ...prev, [questionId]: value }));
    }
  }

  const pointsColor =
    myPick?.points_earned == null ? '' :
    myPick.points_earned > 0 ? 'text-green-600' : 'text-red-500';

  return (
    <div className="max-w-xl mx-auto px-4 py-6 space-y-6">
      {/* Match header */}
      <div className={`card ${match.is_colombia_match ? 'colombia-border' : ''}`}>
        <p className="text-xs text-gray-500 text-center mb-3 uppercase tracking-wide">
          {PHASE_LABELS[match.phase] ?? match.phase}
          {match.group_name ? ` · ${match.group_name}` : ''}
        </p>
        <div className="flex items-center gap-4 justify-between">
          <div className="flex flex-col items-center gap-1 flex-1">
            {match.home_team_logo && (
              <Image src={match.home_team_logo} alt={match.home_team} width={56} height={56} className="object-contain" />
            )}
            <p className="font-semibold text-center text-sm">{match.home_team}</p>
          </div>

          <div className="text-center flex-none">
            {isFinished && match.home_score !== null ? (
              <div className="font-display text-5xl text-[#0a4a2e]">
                {match.home_score} – {match.away_score}
              </div>
            ) : isLive ? (
              <div className="flex flex-col items-center gap-1">
                <div className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-sm font-bold text-green-600">EN VIVO</span>
                </div>
                {match.home_score !== null && (
                  <div className="font-display text-5xl text-[#0a4a2e]">
                    {match.home_score} – {match.away_score}
                  </div>
                )}
              </div>
            ) : (
              <div className="flex flex-col items-center gap-1">
                <span className="font-display text-5xl text-gray-300">vs</span>
                <p className="text-xs text-gray-400">{formatKickoff(match.kickoff_utc)}</p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center gap-1 flex-1">
            {match.away_team_logo && (
              <Image src={match.away_team_logo} alt={match.away_team} width={56} height={56} className="object-contain" />
            )}
            <p className="font-semibold text-center text-sm">{match.away_team}</p>
          </div>
        </div>
      </div>

      {/* Lock countdown */}
      {!isLocked && (
        <div className="card flex flex-col items-center text-center">
          <p className="text-sm text-gray-500 mb-1">Cierra en</p>
          <Countdown targetDate={lockTime.toISOString()} className="text-xl font-bold" />
        </div>
      )}

      {/* Auto-assigned warning */}
      {myPick?.is_auto_assigned && (
        <div className="bg-orange-50 border border-orange-200 rounded-xl p-4 text-orange-800">
          <p className="font-semibold">⚠️ Pick asignado automáticamente</p>
          <p className="text-sm mt-1">No ingresaste tu pick antes del cierre.</p>
        </div>
      )}

      {/* Pick form */}
      <div className="card">
        <h2 className="font-display text-2xl text-[#0a4a2e] mb-4 text-center">Tu pick</h2>

        {isLocked ? (
          <div className="text-center py-4">
            {myPick ? (
              <div>
                <div className={`font-display text-5xl ${isFinished ? pointsColor : 'text-[#0a4a2e]'}`}>
                  {myPick.home_pick} – {myPick.away_pick}
                </div>
                {isFinished && myPick.points_earned !== null && (
                  <p className={`text-lg font-semibold mt-2 ${pointsColor}`}>
                    {myPick.points_earned > 0 ? `+${myPick.points_earned}` : myPick.points_earned} puntos
                  </p>
                )}
              </div>
            ) : (
              <p className="text-gray-400">No ingresaste un pick para este partido.</p>
            )}
          </div>
        ) : (
          <form onSubmit={handlePickSubmit}>
            <div className="flex items-center justify-center gap-6 mb-6">
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">{match.home_team}</p>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={homePick}
                  onChange={(e) => setHomePick(e.target.value)}
                  className="score-input"
                  placeholder="0"
                  required
                  inputMode="numeric"
                />
              </div>
              <span className="font-display text-3xl text-gray-300 pb-6">–</span>
              <div className="text-center">
                <p className="text-xs text-gray-500 mb-2">{match.away_team}</p>
                <input
                  type="number"
                  min="0"
                  max="20"
                  value={awayPick}
                  onChange={(e) => setAwayPick(e.target.value)}
                  className="score-input"
                  placeholder="0"
                  required
                  inputMode="numeric"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={pickPending || !homePick || !awayPick}
              className="btn-primary w-full rounded-xl py-3"
            >
              {pickPending ? 'Guardando...' : myPick ? 'Actualizar pick' : 'Guardar pick'}
            </button>
          </form>
        )}
      </div>

      {/* Bonus questions */}
      {FEATURES.bonusQuestions && questions.length > 0 && (
        <div className="card space-y-4">
          <h2 className="font-display text-2xl text-[#0a4a2e]">Preguntas Bonus</h2>
          {questions.map((q) => {
            const myAnswer = myAnswers.get(q.id);
            return (
              <div key={q.id} className="border border-gray-100 rounded-xl p-4">
                <div className="flex items-start justify-between gap-2 mb-2">
                  <p className="font-medium text-sm">{q.question_text}</p>
                  <span className="text-xs font-bold text-[#0a4a2e] bg-[#e8f5e9] px-2 py-0.5 rounded-full flex-none">
                    +{q.points_value} pts
                  </span>
                </div>

                {isFinished && q.correct_answer ? (
                  <div className="space-y-1 text-sm">
                    {myAnswer && (
                      <p className="text-gray-600">Tu respuesta: <strong>{myAnswer.answer}</strong></p>
                    )}
                    <p className="text-gray-600">
                      Respuesta correcta: <strong className="text-[#0a4a2e]">{q.correct_answer}</strong>
                    </p>
                    {myAnswer?.points_earned !== undefined && myAnswer.points_earned !== null && (
                      <p className={`font-bold ${myAnswer.points_earned > 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {myAnswer.points_earned > 0 ? `+${myAnswer.points_earned}` : '0'} puntos
                      </p>
                    )}
                  </div>
                ) : isLocked ? (
                  <p className="text-sm text-gray-500">
                    {myAnswer ? <span>Tu respuesta: <strong>{myAnswer.answer}</strong></span> : 'No respondiste esta pregunta.'}
                  </p>
                ) : (
                  <div className="space-y-1">
                    {q.answer_type === 'yes_no' ? (
                      <div className="flex gap-2">
                        {['Sí', 'No'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => handleAnswerSelect(q.id, opt)}
                            className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border-2 transition-colors
                              ${answerValues[q.id] === opt
                                ? 'bg-[#0a4a2e] text-white border-[#0a4a2e]'
                                : 'bg-white text-gray-700 border-gray-200 hover:border-[#0a4a2e]'}`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    ) : q.answer_type === 'team' ? (
                      <select
                        value={answerValues[q.id] ?? ''}
                        onChange={(e) => handleAnswerSelect(q.id, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                   focus:border-[#0a4a2e] focus:outline-none bg-white"
                      >
                        <option value="">Selecciona un equipo...</option>
                        <option value={match!.home_team}>{match!.home_team}</option>
                        <option value={match!.away_team}>{match!.away_team}</option>
                        <option value="Ninguno">Ninguno</option>
                      </select>
                    ) : q.answer_type === 'number' ? (
                      <input
                        type="number"
                        inputMode="numeric"
                        value={answerValues[q.id] ?? ''}
                        onChange={(e) => {
                          setAnswerValues((prev) => ({ ...prev, [q.id]: e.target.value }));
                          setAnswerStatuses((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                        }}
                        onBlur={() => handleAnswerBlur(q.id)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                   focus:border-[#0a4a2e] focus:outline-none"
                        placeholder="Tu respuesta numérica..."
                      />
                    ) : (
                      <input
                        type="text"
                        value={answerValues[q.id] ?? ''}
                        onChange={(e) => {
                          setAnswerValues((prev) => ({ ...prev, [q.id]: e.target.value }));
                          setAnswerStatuses((prev) => { const n = { ...prev }; delete n[q.id]; return n; });
                        }}
                        onBlur={() => handleAnswerBlur(q.id)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                                   focus:border-[#0a4a2e] focus:outline-none"
                        placeholder="Tu respuesta... (se guarda al salir del campo)"
                      />
                    )}
                    {answerStatuses[q.id] === 'saving' && (
                      <p className="text-xs text-gray-400">Guardando...</p>
                    )}
                    {answerStatuses[q.id] === 'saved' && (
                      <p className="text-xs text-green-600 font-medium">✓ Guardado</p>
                    )}
                    {answerStatuses[q.id] === 'error' && (
                      <p className="text-xs text-red-500">✗ {answerErrors[q.id] ?? 'Error al guardar'}</p>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
