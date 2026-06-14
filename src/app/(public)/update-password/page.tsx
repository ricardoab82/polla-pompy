'use client';

import { useState, useEffect, useTransition } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';

export default function UpdatePasswordPage() {
  const router                      = useRouter();
  const searchParams                = useSearchParams();
  const [ready, setReady]           = useState(false);
  const [error, setError]           = useState<string | null>(null);
  const [pending, startTransition]  = useTransition();

  // Exchange the PKCE code from the email link for a session
  useEffect(() => {
    const code = searchParams.get('code');
    if (!code) {
      setReady(true); // no code — show form anyway (session may already exist)
      return;
    }
    const supabase = createClient();
    supabase.auth.exchangeCodeForSession(code).then(({ error: err }) => {
      if (err) setError('El enlace expiró o ya fue usado. Solicita uno nuevo.');
      setReady(true);
    });
  }, [searchParams]);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const fd       = new FormData(e.currentTarget);
    const password = fd.get('password') as string;
    const confirm  = fd.get('confirm') as string;

    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres.');
      return;
    }
    if (password !== confirm) {
      setError('Las contraseñas no coinciden.');
      return;
    }

    startTransition(async () => {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) {
        setError(err.message);
      } else {
        router.push('/dashboard?toast=password-updated');
      }
    });
  }

  const inputClass =
    'w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:border-[#0a4a2e] focus:outline-none transition-colors';

  return (
    <div className="min-h-screen bg-[#f9fafb] flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <Link href="/" className="font-display text-4xl text-[#0a4a2e]">
            La Polla de Pompy
          </Link>
          <p className="text-gray-500 mt-1">Nueva contraseña</p>
        </div>

        <div className="card">
          {!ready ? (
            <p className="text-center text-sm text-gray-400 py-4">Verificando enlace...</p>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nueva contraseña
                </label>
                <input
                  type="password"
                  name="password"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="Mínimo 6 caracteres"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirmar contraseña
                </label>
                <input
                  type="password"
                  name="confirm"
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className={inputClass}
                  placeholder="Repite la contraseña"
                />
              </div>

              {error && (
                <p className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-lg px-3 py-2">
                  {error}
                </p>
              )}

              <button type="submit" disabled={pending} className="btn-primary w-full rounded-lg py-3">
                {pending ? 'Guardando...' : 'Guardar nueva contraseña'}
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
