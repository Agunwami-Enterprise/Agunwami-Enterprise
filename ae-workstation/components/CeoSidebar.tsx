'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { label: 'Overview',         href: '/ceo/dashboard',        icon: <IconGrid />,    badge: false },
  { label: 'Tasks',            href: '/ceo/tasks',             icon: <IconTasks />,   badge: false },
  { label: 'Messages',         href: '/ceo/messages',          icon: <IconChat />,    badge: true  },
  { label: 'Time Tracking',    href: '/ceo/time-tracking',     icon: <IconClock />,   badge: false },
  { label: 'Documents',        href: '/ceo/documents',         icon: <IconDoc />,     badge: false },
  { label: 'Analytics',        href: '/ceo/analytics',         icon: <IconChart />,   badge: false },
  { label: 'Leave Request',    href: '/ceo/leave-requests',    icon: <IconLeave />,   badge: false },
  { label: 'Staff Management', href: '/ceo/staff',             icon: <IconPeople />,  badge: false },
  { label: 'Payment',          href: '/ceo/payments',          icon: <IconCard />,    badge: false },
  { label: 'Notifications',    href: '/ceo/notifications',     icon: <IconBell />,    badge: true  },
  { label: 'Training',         href: '/ceo/training',          icon: <IconBook />,    badge: false },
  { label: 'Settings',         href: '/ceo/settings',          icon: <IconGear />,    badge: false },
];

interface Props { open: boolean; onClose: () => void; onNavigate?: () => void; }

export default function CeoSidebar({ open, onClose, onNavigate }: Props) {
  const path = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const itemRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [indicator, setIndicator] = useState<{ top: number; height: number } | null>(null);

  const activeHref = NAV.find(item => path === item.href || path.startsWith(item.href + '/'))?.href;

  useEffect(() => {
    if (!activeHref || !navRef.current) return;
    const el = itemRefs.current.get(activeHref);
    if (!el) return;
    setIndicator({ top: el.offsetTop, height: el.offsetHeight });
  }, [activeHref]);

  return (
    <>
      {/* Backdrop overlay */}
      {open && (
        <div
          className="fixed inset-0 z-20 bg-black/50"
          onClick={onClose}
        />
      )}

      <aside
        className={`
          fixed inset-y-0 left-0 z-30 flex w-[200px] flex-col
          bg-[#E0E4F1] dark:bg-[#171612]
          transition-transform duration-200 ease-in-out
          ${open ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        {/* Logo */}
        <div className="flex items-center gap-2 border-b border-black/10 dark:border-white/10 px-4 py-[14px]">
          <Image src="/AE-Logo.svg" alt="AE Hub" width={26} height={26} />
          <div className="min-w-0">
            <p className="truncate text-[13px] font-bold leading-tight text-[#1a1a1a] dark:text-white">AE Hub</p>
            <p className="truncate text-[10px] text-[#6b7280]">Workstation</p>
          </div>
        </div>

        {/* Nav */}
        <nav ref={navRef} className="relative flex-1 overflow-y-auto px-3 py-3">
          {indicator && (
            <span
              className="pointer-events-none absolute left-0 w-[3px] rounded-r-full bg-[#f5bd02] transition-[top,height] duration-200 ease-out"
              style={{ top: indicator.top, height: indicator.height }}
            />
          )}
          {NAV.map((item) => {
            const active = item.href === activeHref;
            return (
              <div
                key={item.href}
                ref={(el) => { if (el) itemRefs.current.set(item.href, el); }}
              >
                <Link
                  href={item.href}
                  onClick={() => { onNavigate?.(); onClose(); }}
                  className={`
                    mb-0.5 flex items-center gap-2.5 rounded-lg px-3 py-[9px] transition-colors
                    ${active
                      ? 'bg-[#f5bd02] text-[#1a1a1a]'
                      : 'text-[#4a5568] hover:bg-black/6 hover:text-[#1a1a1a] dark:text-[#9ca3af] dark:hover:bg-white/5 dark:hover:text-white'}
                  `}
                >
                  <span className="flex h-4 w-4 flex-shrink-0 items-center justify-center">
                    {item.icon}
                  </span>
                  <span className="flex-1 truncate text-[12px] font-medium">{item.label}</span>
                  {item.badge && (
                    <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-red-500" />
                  )}
                </Link>
              </div>
            );
          })}
        </nav>

        {/* User card */}
        <div className="px-3 pb-4">
          <div className="flex items-center gap-2 rounded-xl bg-[#cdd2e5] dark:bg-[#252320] p-3">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[#f5bd02]">
              <span className="text-[10px] font-bold text-[#1a1a1a]">C</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-[11px] font-semibold leading-tight text-[#1a1a1a] dark:text-white">CEO</p>
              <p className="truncate text-[10px] text-[#6b7280]">Executive</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

/* ── Icons ───────────────────────────────────────────────────────────────── */

function IconGrid() {
  return (
    <svg viewBox="0 0 16 16" fill="currentColor" width="14" height="14">
      <rect x="1" y="1" width="6" height="6" rx="1" /><rect x="9" y="1" width="6" height="6" rx="1" />
      <rect x="1" y="9" width="6" height="6" rx="1" /><rect x="9" y="9" width="6" height="6" rx="1" />
    </svg>
  );
}
function IconTasks() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <rect x="2" y="1" width="12" height="14" rx="1.5" />
      <line x1="5" y1="5" x2="11" y2="5" /><line x1="5" y1="8" x2="11" y2="8" />
      <line x1="5" y1="11" x2="8" y2="11" />
    </svg>
  );
}
function IconChat() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M14 10a2 2 0 0 1-2 2H5l-3 2V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v6z" />
    </svg>
  );
}
function IconClock() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <circle cx="8" cy="8" r="6.5" />
      <polyline points="8,4.5 8,8 10.5,10" />
    </svg>
  );
}
function IconDoc() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M9 1H4a1.5 1.5 0 0 0-1.5 1.5v11A1.5 1.5 0 0 0 4 15h8a1.5 1.5 0 0 0 1.5-1.5V5.5L9 1z" />
      <polyline points="9,1 9,5.5 13.5,5.5" />
    </svg>
  );
}
function IconChart() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <line x1="1.5" y1="14" x2="14.5" y2="14" />
      <rect x="3" y="8" width="2.5" height="6" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="6.75" y="5" width="2.5" height="9" rx="0.5" fill="currentColor" stroke="none" />
      <rect x="10.5" y="2" width="2.5" height="12" rx="0.5" fill="currentColor" stroke="none" />
    </svg>
  );
}
function IconLeave() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <rect x="1.5" y="2.5" width="13" height="12" rx="1.5" />
      <line x1="5" y1="1" x2="5" y2="4" /><line x1="11" y1="1" x2="11" y2="4" />
      <line x1="1.5" y1="6.5" x2="14.5" y2="6.5" />
      <line x1="6" y1="10" x2="10" y2="10" />
    </svg>
  );
}
function IconPeople() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <circle cx="6" cy="5" r="2.5" />
      <path d="M1 13.5c0-2.5 2-4 5-4s5 1.5 5 4" />
      <circle cx="12" cy="5" r="2" />
      <path d="M10.5 13.5c.3-1.5 1.2-2.5 3-3" />
    </svg>
  );
}
function IconCard() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <rect x="1.5" y="3.5" width="13" height="9" rx="1.5" />
      <line x1="1.5" y1="7" x2="14.5" y2="7" />
      <line x1="4" y1="10.5" x2="6.5" y2="10.5" />
    </svg>
  );
}
function IconBell() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v3l-1.5 2h12l-1.5-2V6A4.5 4.5 0 0 0 8 1.5z" />
      <path d="M6.5 11.5a1.5 1.5 0 0 0 3 0" />
    </svg>
  );
}
function IconBook() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <path d="M8 13.5s-5-2-5-7.5V2.5l5-1 5 1v3.5c0 5.5-5 7.5-5 7.5z" />
    </svg>
  );
}
function IconGear() {
  return (
    <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5" width="14" height="14">
      <circle cx="8" cy="8" r="2.5" />
      <path d="M8 1v1.5M8 13.5V15M1 8h1.5M13.5 8H15M2.7 2.7l1 1M12.3 12.3l1 1M13.3 2.7l-1 1M3.7 12.3l-1 1" strokeLinecap="round" />
    </svg>
  );
}
