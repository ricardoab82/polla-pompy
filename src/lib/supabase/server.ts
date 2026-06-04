import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Note: Database generic omitted intentionally — the Supabase TypeScript
// inference can resolve to `never` with complex custom types in Next.js 14.
// Use explicit type assertions (as MatchRow, as UserRow, etc.) on query results.

export function createClient() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          } catch {
            // Server Component — cookies can't be set; middleware handles refresh
          }
        },
      },
    }
  );
}

// Service-role client for cron jobs and server-side operations
export function createServiceClient() {
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      cookies: {
        getAll() { return []; },
        setAll() {},
      },
    }
  );
}
