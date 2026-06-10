'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV_ITEMS = [
  { href: '/dashboard',       label: 'Inicio',     icon: '🏠' },
  { href: '/picks',           label: 'Picks',      icon: '⚽' },
  { href: '/special-picks',   label: 'Picks Esp.', icon: '🌟' },
  { href: '/bracket',         label: 'Llaves',     icon: '🏆' },
  { href: '/standings',       label: 'Posiciones', icon: '📊' },
  { href: '/bonus-standings', label: 'Bonus',      icon: '🎯' },
  { href: '/profile',         label: 'Perfil',     icon: '👤' },
];

export default function MobileNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 mobile-nav-safe md:hidden">
      <div className="flex">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`relative flex-1 flex flex-col items-center justify-center py-2 gap-0.5
                          text-xs font-medium transition-colors
                          ${active
                            ? 'text-[#0a4a2e]'
                            : 'text-gray-500 hover:text-[#0a4a2e]'
                          }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              <span>{item.label}</span>
              {active && (
                <span className="absolute bottom-0 w-8 h-0.5 bg-[#f5c842] rounded-t" />
              )}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
