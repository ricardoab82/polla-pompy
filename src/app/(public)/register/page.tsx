'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { registerAction, signInWithGoogleAction } from '@/features/auth/actions';
import { REGISTRATION_DEADLINE } from '@/lib/config';

export default function RegisterPage() {
  const [error, setError]          = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const now              = new Date();
  const registrationOpen = now < REGISTRATION_DEADLINE;
  const hoursLeft        = (REGISTRATION_DEADLINE.getTime() - now.getTime()) / (1000 * 60 * 60);
  const nearDeadline     = registrationOpen && hoursLeft < 48;

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await registerAction(fd);
      if (result?.error) setError(result.error);
    });
  }

  function handleGoogle() {
    startTransition(async () => {
      const result = await signInWithGoogleAction();
      if (result?.error) setError(result.error);
    });
  }

  if (!registrationOpen) {
    return (
      <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <p className="text-4xl mb-4">🔒</p>
          <h1 className="font-display text-3xl text-[#0a4a2e] mb-2">Registro cerrado</h1>
          <p className="text-gray-500 mb-6">
            El período de inscripción terminó el 10 de junio de 2026 a las 11:59 PM.
          </p>
          <Link href="/login" className="btn-primary rounded-lg py-3 px-6 inline-block">
            Iniciar sesión
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-4xl text-[#0a4a2e]">
            Polla de Pompy
          </Link>
          <p className="text-gray-500 mt-1">Crea tu cuenta</p>
        </div>

        {nearDeadline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
            ⏰ El registro cierra el 10 de junio a las 11:59 PM (hora Colombia)
          </div>
        )}

        <div className="card space-y-4">
          {/* Google OAuth */}
          <button
            onClick={handleGoogle}
            disabled={pending}
            className="w-full flex items-center justify-center gap-3 border border-gray-200
                       rounded-lg px-4 py-3 font-medium text-gray-700 hover:bg-gray-50
                       transition-colors disabled:opacity-50"
          >
            <svg width="18" height="18" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Registrarse con Google
          </button>

          <div className="flex items-center gap-2">
            <div className="flex-1 h-px bg-gray-200" />
            <span className="text-xs text-gray-400">o</span>
            <div className="flex-1 h-px bg-gray-200" />
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de usuario</label>
              <input
                type="text"
                name="display_name"
                required
                minLength={2}
                maxLength={50}
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                           focus:border-[#0a4a2e] focus:outline-none transition-colors"
                placeholder="Como te verán los demás"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                type="email"
                name="email"
                required
                autoComplete="email"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                           focus:border-[#0a4a2e] focus:outline-none transition-colors"
                placeholder="tu@email.com"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Contraseña</label>
              <input
                type="password"
                name="password"
                required
                minLength={6}
                autoComplete="new-password"
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm
                           focus:border-[#0a4a2e] focus:outline-none transition-colors"
                placeholder="Mínimo 6 caracteres"
              />
            </div>

            {error && (
              <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                {error}
              </p>
            )}

            <button type="submit" disabled={pending} className="btn-primary w-full rounded-lg py-3">
              {pending ? 'Registrando...' : 'Crear cuenta'}
            </button>
          </form>
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          ¿Ya tienes cuenta?{' '}
          <Link href="/login" className="text-[#0a4a2e] font-semibold hover:underline">
            Ingresar
          </Link>
        </p>
      </div>
    </div>
  );
}
