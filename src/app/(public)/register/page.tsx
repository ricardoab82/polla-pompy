'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { registerAction } from '@/features/auth/actions';
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
            La Polla de Pompy
          </Link>
          <p className="text-gray-500 mt-1">Crea tu cuenta</p>
        </div>

        {nearDeadline && (
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 mb-4 text-sm text-amber-700">
            ⏰ El registro cierra el 10 de junio a las 11:59 PM (hora Colombia)
          </div>
        )}

        <div className="card space-y-4">
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
