'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import CeoSidebar from './CeoSidebar';
import CeoNavbar from './CeoNavbar';
import SuspendedBanner from './SuspendedBanner';
import { ToastContainer } from 'react-toastify';
import { applyReduceMotion, useReduceMotion } from '@/lib/workstation/preferences';

export default function CeoShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const pathname = usePathname();
  const prevPath = useRef(pathname);
  const reduceMotion = useReduceMotion();

  // Settings → Preferences → Reduce animations.
  useEffect(() => { applyReduceMotion(reduceMotion); }, [reduceMotion]);

  useEffect(() => {
    if (pathname !== prevPath.current) {
      prevPath.current = pathname;
      setNavigating(false);
    }
  }, [pathname]);

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf8ec] dark:bg-[#111111]">
      {navigating && (
        <div className="route-bar fixed inset-x-0 top-0 z-[60] h-[3px]" />
      )}
      <CeoSidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setNavigating(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CeoNavbar onMenuClick={() => setSidebarOpen(v => !v)} />
        <SuspendedBanner />
        <main className="flex-1 overflow-y-auto">
          <div key={pathname} className="ae-page-enter">{children}</div>
        </main>
      </div>
      {/* Toasts from shared dialogs (e.g. Settings → Security → 2FA). */}
      <ToastContainer position="top-right" autoClose={4000} newestOnTop />
    </div>
  );
}
