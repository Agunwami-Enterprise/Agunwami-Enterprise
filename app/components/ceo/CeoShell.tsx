'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import CeoSidebar from './CeoSidebar';
import CeoNavbar, { type NavbarOptions } from './CeoNavbar';
import SuspendedBanner from './SuspendedBanner';
import { ToastContainer } from 'react-toastify';
import { applyReduceMotion, useReduceMotion } from '@/lib/workstation/preferences';

export interface SidebarProps {
  open: boolean;
  onClose: () => void;
  onNavigate?: () => void;
}

/**
 * The workstation frame: sidebar, top bar, page area and toasts. The CEO
 * workstation uses the defaults; other workstations (e.g. /tech) pass their
 * own sidebar and navbar settings.
 */
export default function CeoShell({ children, Sidebar = CeoSidebar, navbar }: {
  children: React.ReactNode;
  Sidebar?: React.ComponentType<SidebarProps>;
  navbar?: NavbarOptions;
}) {
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
      <Sidebar
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        onNavigate={() => setNavigating(true)}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <CeoNavbar onMenuClick={() => setSidebarOpen(v => !v)} {...navbar} />
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
