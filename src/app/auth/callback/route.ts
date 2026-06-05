import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  console.log('[auth/callback] code:', code ? 'present' : 'MISSING');
  console.log('[auth/callback] next:', next);
  console.log('[auth/callback] origin:', origin);

  if (code) {
    // Use inline cookie handling — avoids the silent try/catch in createClient()
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) => {
              console.log('[auth/callback] setting cookie:', name);
              cookieStore.set(name, value, options);
            });
          },
        },
      }
    );

    const { error } = await supabase.auth.exchangeCodeForSession(code);
    console.log('[auth/callback] exchangeCodeForSession error:', error?.message ?? 'none');

    if (!error) {
      console.log('[auth/callback] redirecting to:', `${origin}${next}`);
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  console.log('[auth/callback] failed — redirecting to /login?error=auth_callback_failed');
  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`);
}
