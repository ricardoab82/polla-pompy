import TopBar from '@/components/layout/TopBar';
import MobileNav from '@/components/layout/MobileNav';
import { ToastProvider } from '@/components/ui/Toast';

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <TopBar />
      <main className="min-h-screen pb-20 md:pb-8">
        {children}
      </main>
      <MobileNav />
    </ToastProvider>
  );
}
