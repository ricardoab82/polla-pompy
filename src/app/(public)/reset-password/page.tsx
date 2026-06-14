'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function ResetPasswordPage() {
  const [sent, setSent]             = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [pending, startTransition]  = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const email = new FormData(e.currentTarget).get('email') as string;

    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/update-password`,
      });

      if (err) {
        setError(err.message);
      } else {
        setSent(true);
      }
    });
  }

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-4xl text-[#0a4a2e]">
            La Polla de Pompy
          </Link>
          <p className="text-gray-500 mt-1">Recuperar contraseña</p>
        </div>

        <div className="card">
          {sent ? (
            <div className="text-center py-4 space-y-2">
              <p className="text-3xl">📬</p>
              <p className="font-semibold text-[#0a4a2e]">
                Te enviamos un enlace a tu correo.
              </p>
              <p className="text-sm text-gray-500">
                Revisa tu bandeja de entrada y sigue las instrucciones.
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
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

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={pending} className="btn-primary w-full rounded-lg py-3">
                {pending ? 'Enviando...' : 'Enviar enlace de recuperación'}
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-sm text-gray-500 mt-4">
          <Link href="/login" className="text-[#0a4a2e] font-semibold hover:underline">
            Volver al inicio de sesión
          </Link>
        </p>
      </div>
    </div>
  );
}
