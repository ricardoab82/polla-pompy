import { requireAdmin } from '@/lib/auth-helpers';
import { notFound } from 'next/navigation';
import {
  createBonusQuestionAction,
  setCorrectAnswerAction,
  deleteBonusQuestionAction,
} from '@/features/admin/actions';
import { formAction } from '@/lib/form-action';

export default async function AdminBonusMatchPage({ params }: { params: { match_id: string } }) {
  const { supabase } = await requireAdmin();

  const { data: match } = await supabase
    .from('matches').select('*').eq('id', params.match_id).single();
  if (!match) notFound();

  const { data: questions } = await supabase
    .from('bonus_questions')
    .select('*')
    .eq('match_id', params.match_id)
    .order('created_at');

  const matchStarted = new Date(match.kickoff_utc) < new Date();
  const canAdd       = (questions?.length ?? 0) < 5;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center gap-4">
        <a href="/admin/bonus" className="text-sm text-gray-400 hover:text-gray-600">← Bonus</a>
        <h1 className="font-display text-3xl text-[#0a4a2e]">
          {match.home_team} vs {match.away_team}
        </h1>
      </div>

      {/* Add question form */}
      {canAdd && !matchStarted && (
        <div className="card">
          <h2 className="font-semibold mb-3">Agregar pregunta bonus</h2>
          <form action={formAction(createBonusQuestionAction)} className="space-y-3">
            <input type="hidden" name="match_id" value={match.id} />
            <div>
              <label className="block text-sm text-gray-600 mb-1">Pregunta</label>
              <textarea
                name="question_text"
                required
                minLength={5}
                maxLength={500}
                rows={2}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:border-[#0a4a2e] focus:outline-none resize-none"
                placeholder="¿Cuántos corners habrá en el partido?"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 mb-1">Puntos (1–10)</label>
              <input
                type="number"
                name="points_value"
                min="1"
                max="10"
                defaultValue="2"
                className="w-20 border border-gray-200 rounded-lg px-3 py-2 text-sm
                           focus:border-[#0a4a2e] focus:outline-none"
              />
            </div>
            <button type="submit" className="btn-primary rounded-lg py-2.5 px-6">
              Agregar pregunta
            </button>
          </form>
        </div>
      )}

      {/* Existing questions */}
      <div className="space-y-3">
        {questions?.length === 0 && (
          <p className="text-center text-gray-400 py-6">No hay preguntas para este partido aún.</p>
        )}
        {questions?.map((q) => (
          <div key={q.id} className="card space-y-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium">{q.question_text}</p>
              <span className="text-xs font-bold bg-[#e8f5e9] text-[#0a4a2e] px-2 py-0.5 rounded-full flex-none">
                +{q.points_value} pts
              </span>
            </div>

            {/* Set correct answer */}
            {!q.correct_answer ? (
              <form action={formAction(setCorrectAnswerAction)} className="flex gap-2">
                <input type="hidden" name="question_id" value={q.id} />
                <input
                  type="text"
                  name="correct_answer"
                  required
                  className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm
                             focus:border-[#0a4a2e] focus:outline-none"
                  placeholder="Respuesta correcta..."
                />
                <button type="submit" className="text-sm btn-secondary rounded-lg px-4 py-2">
                  Calificar
                </button>
              </form>
            ) : (
              <p className="text-sm text-[#0a4a2e] font-medium">
                ✓ Respuesta: <strong>{q.correct_answer}</strong>
                <span className="text-gray-400 ml-2 font-normal">
                  (calificado el {new Date(q.answered_at!).toLocaleDateString('es-CO', { timeZone: 'America/Bogota' })})
                </span>
              </p>
            )}

            {/* Delete (only before match starts) */}
            {!matchStarted && !q.correct_answer && (
              <form action={formAction(deleteBonusQuestionAction)}>
                <input type="hidden" name="question_id" value={q.id} />
                <button
                  type="submit"
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  Eliminar pregunta
                </button>
              </form>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
