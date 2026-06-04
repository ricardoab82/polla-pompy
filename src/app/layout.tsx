import type { Metadata } from 'next';
import { Bebas_Neue, DM_Sans } from 'next/font/google';
import './globals.css';

const bebasNeue = Bebas_Neue({
  weight:   '400',
  subsets:  ['latin'],
  variable: '--font-bebas-neue',
  display:  'swap',
});

const dmSans = DM_Sans({
  subsets:  ['latin'],
  variable: '--font-dm-sans',
  display:  'swap',
});

export const metadata: Metadata = {
  title:       'La Polla de Pompy — Mundial 2026',
  description: 'El torneo de pronósticos del Mundial FIFA 2026. Predice los resultados, compite con tus amigos y gana.',
  icons: { icon: '/favicon.ico' },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${bebasNeue.variable} ${dmSans.variable}`}>
      <body className="antialiased bg-[#f9fafb] text-[#111827]">
        {children}
      </body>
    </html>
  );
}
