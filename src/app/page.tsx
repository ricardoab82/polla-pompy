import Link from 'next/link';
import Image from 'next/image';
import Countdown from '@/components/ui/Countdown';
import { TOURNAMENT_KICKOFF, REGISTRATION_DEADLINE } from '@/lib/config';

export default function LandingPage() {
  const now = new Date();
  const registrationOpen = now < REGISTRATION_DEADLINE;
  const hoursToDeadline  = (REGISTRATION_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60);
  const nearDeadline     = registrationOpen && hoursToDeadline < 48;

  return (
    <div className="min-h-screen bg-[#0a4a2e] flex flex-col">
      {/* Hero */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 text-center">
        <div className="max-w-2xl mx-auto">
          <div className="flex justify-center mb-4">
            <Image
              src="/loading-images/Logo.jpeg"
              alt="Pompy's Bet"
              width={120}
              height={120}
              className="rounded-2xl"
              priority
            />
          </div>
          <h1 className="font-display text-6xl md:text-8xl text-[#f5c842] leading-none mb-2">
            La Polla de Pompy
          </h1>
          <p className="text-[#e8f5e9] text-lg md:text-xl mb-8">
            El torneo de pronósticos del <strong>Mundial FIFA 2026</strong>
          </p>

          {/* Countdown to tournament */}
          <div className="bg-white/10 backdrop-blur rounded-2xl p-6 mb-8">
            <p className="text-[#f5c842] text-sm font-semibold uppercase tracking-widest mb-2">
              El torneo comienza en
            </p>
            <div className="flex justify-center">
              <Countdown
                targetDate={TOURNAMENT_KICKOFF.toISOString()}
                className="text-white text-3xl md:text-4xl"
              />
            </div>
          </div>

          {/* Registration deadline warning */}
          {nearDeadline && registrationOpen && (
            <div className="bg-amber-400/20 border border-amber-400/40 rounded-xl p-4 mb-6 text-amber-200">
              <p className="font-semibold">⏰ ¡Menos de 48 horas para registrarse!</p>
              <p className="text-sm mt-1">
                Cierre de inscripciones: 10 de junio a las 11:59 PM (hora Colombia)
              </p>
            </div>
          )}
          {!registrationOpen && (
            <div className="bg-red-400/20 border border-red-400/40 rounded-xl p-4 mb-6 text-red-200">
              <p className="font-semibold">🔒 El período de registro ha cerrado.</p>
            </div>
          )}

          {/* CTAs */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            {registrationOpen && (
              <Link href="/register" className="btn-secondary text-center rounded-xl px-8 py-4 text-lg">
                Registrarme gratis
              </Link>
            )}
            <Link
              href="/login"
              className="border-2 border-[#f5c842] text-[#f5c842] font-semibold
                         px-8 py-4 rounded-xl text-lg hover:bg-[#f5c842]/10 transition-colors text-center"
            >
              Iniciar sesión
            </Link>
          </div>

          {registrationOpen && (
            <p className="text-[#e8f5e9]/60 text-sm mt-4">
              Inscríbete antes del 10 de junio de 2026
            </p>
          )}
        </div>
      </main>

      {/* Rules summary */}
      <section className="bg-[#083d25] py-12 px-4">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl text-[#f5c842] text-center mb-8">
            Cómo funciona
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                icon:  '⚽',
                title: 'Predice los resultados',
                desc:  'Ingresa el marcador exacto para cada partido antes del cierre (15 minutos antes del pitazo).',
              },
              {
                icon:  '🏆',
                title: 'Gana puntos',
                desc:  'Resultado exacto: 3 pts. Ganador correcto: 1 pt. En eliminatorias los puntos son mayores.',
              },
              {
                icon:  '🥇',
                title: 'Escala la tabla',
                desc:  'Sigue tu progreso en tiempo real. El desempate se decide por mayor cantidad de exactos.',
              },
            ].map((item) => (
              <div key={item.title} className="bg-white/5 rounded-xl p-5 text-center">
                <span className="text-4xl">{item.icon}</span>
                <h3 className="font-display text-xl text-[#f5c842] mt-3 mb-2">{item.title}</h3>
                <p className="text-[#e8f5e9]/80 text-sm">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="bg-[#072e1c] py-4 text-center text-[#e8f5e9]/40 text-xs">
        La Polla de Pompy · Mundial FIFA 2026
      </footer>
    </div>
  );
}
