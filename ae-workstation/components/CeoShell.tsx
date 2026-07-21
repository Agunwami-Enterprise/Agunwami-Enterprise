'use client';

import { useEffect, useRef, useState } from 'react';
import { usePathname } from 'next/navigation';
import CeoSidebar from './CeoSidebar';
import CeoNavbar from './CeoNavbar';

export default function CeoShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [navigating, setNavigating] = useState(false);
  const pathname = usePathname();
  const prevPath = useRef(pathname);

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
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}
