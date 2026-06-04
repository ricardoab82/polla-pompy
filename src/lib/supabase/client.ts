import { createBrowserClient } from '@supabase/ssr';

// Database generic omitted — use explicit type assertions on query results.
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
