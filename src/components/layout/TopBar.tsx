import Link from 'next/link';
import Image from 'next/image';
import { createClient } from '@/lib/supabase/server';
import Avatar from '@/components/ui/Avatar';
import { logoutAction } from '@/features/auth/actions';

export default async function TopBar() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  let profile = null;
  if (user) {
    const { data } = await supabase
      .from('users')
      .select('display_name, avatar_url, role')
      .eq('id', user.id)
      .single();
    profile = data;
  }

  return (
    <header className="sticky top-0 z-30 bg-white border-b border-gray-100 shadow-sm">
      <div className="max-w-6xl mx-auto px-4 h-14 flex items-center justify-between">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/loading-images/Logo.jpeg"
            alt="Pompy's Bet"
            width={32}
            height={32}
            className="rounded-lg"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-gray-600">
          <Link href="/dashboard" className="hover:text-[#0a4a2e] transition-colors">Inicio</Link>
          <Link href="/picks"           className="hover:text-[#0a4a2e] transition-colors">Picks</Link>
          <Link href="/standings"       className="hover:text-[#0a4a2e] transition-colors">Posiciones</Link>
          <Link href="/bonus-standings" className="hover:text-[#0a4a2e] transition-colors">Bonus</Link>
          {profile?.role !== 'participant' && (
            <Link href="/admin" className="hover:text-[#0a4a2e] transition-colors text-amber-600">
              Admin
            </Link>
          )}
        </nav>

        {profile && (
          <div className="flex items-center gap-3">
            <Link href="/profile" className="flex items-center gap-2 hover:opacity-80">
              <Avatar
                displayName={profile.display_name}
                avatarUrl={profile.avatar_url}
                size={32}
              />
              <span className="hidden md:block text-sm font-medium text-gray-700">
                {profile.display_name}
              </span>
            </Link>
            <form action={logoutAction}>
              <button type="submit" className="hidden md:block text-xs text-gray-400 hover:text-gray-600">
                Salir
              </button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
}
