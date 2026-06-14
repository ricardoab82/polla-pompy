import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import { MAINTENANCE_MODE } from '@/lib/config';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session — must call getUser() here
  const { data: { user }, error: userErr } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  console.log(`[middleware] ${pathname} | user: ${user?.id ?? 'none'} | err: ${userErr?.message ?? 'none'}`);

  // Maintenance mode gate
  if (MAINTENANCE_MODE) {
    const isMaintenancePage = pathname.startsWith('/maintenance');
    const isAdminRoute      = pathname.startsWith('/admin');
    const isApiRoute        = pathname.startsWith('/api');

    if (!isMaintenancePage && !isAdminRoute && !isApiRoute) {
      // Allow admin / co-admin users to bypass
      let isAdmin = false;
      if (user) {
        const { data: profile } = await supabase
          .from('users')
          .select('role')
          .eq('id', user.id)
          .single();
        isAdmin = profile?.role === 'admin' || profile?.role === 'co-admin';
      }

      if (!isAdmin) {
        const url = request.nextUrl.clone();
        url.pathname = '/maintenance';
        return NextResponse.redirect(url);
      }
    }
  }

  const isPublicRoute =
    pathname === '/' ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/api/cron/') ||
    pathname.startsWith('/maintenance');

  // Redirect unauthenticated users away from protected routes
  if (!user && !isPublicRoute) {
    console.log(`[middleware] no user → redirect to /login`);
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('redirectTo', pathname);
    return NextResponse.redirect(url);
  }

  // Redirect authenticated users away from login/register
  if (user && (pathname.startsWith('/login') || pathname.startsWith('/register'))) {
    console.log(`[middleware] authenticated on public route → redirect to /dashboard`);
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Onboarding gate: user hasn't submitted special picks yet
  if (user && !pathname.startsWith('/onboarding') && !isPublicRoute) {
    const { data: profile } = await supabase
      .from('users')
      .select('special_picks_submitted')
      .eq('id', user.id)
      .single();

    if (profile && !profile.special_picks_submitted) {
      const url = request.nextUrl.clone();
      url.pathname = '/onboarding';
      return NextResponse.redirect(url);
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
