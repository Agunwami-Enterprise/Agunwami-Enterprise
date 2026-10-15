'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ArrowLeftRight, BookOpen, Eye, FileText, FolderOpen, Handshake, LayoutGrid, LogOut, Menu, PanelLeftClose, PanelLeftOpen, Settings, Users, X,
} from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { cx, usePersistentToggle } from './ui';

const NAV = [
  { label: 'Dashboard', href: '/cpanel/dashboard', icon: LayoutGrid },
  { label: 'Projects', href: '/cpanel/projects', icon: FolderOpen },
  { label: 'Team', href: '/cpanel/team', icon: Users },
  { label: 'Expert Insights', href: '/cpanel/insights', icon: BookOpen },
  { label: 'Applications', href: '/cpanel/applications', icon: FileText },
  { label: 'Partnerships', href: '/cpanel/partnerships', icon: Handshake },
  { label: 'Settings', href: '/cpanel/settings', icon: Settings },
];

/** A sidebar row; collapsed, it shows only the icon, with the label as a tooltip. */
function NavItem({ href, label, icon: Icon, active, collapsed, onClick, external }: {
  href: string; label: string; icon: typeof LayoutGrid; active?: boolean; collapsed: boolean; onClick?: () => void; external?: boolean;
}) {
  const className = cx(
    'group relative flex items-center rounded-lg border text-[14px] transition-colors',
    collapsed ? 'h-10 w-10 justify-center' : 'gap-3 px-3 py-2.5',
    active ? 'border-[#C89B3C]/40 bg-[#C89B3C]/15 font-semibold text-[#C89B3C]' : 'border-transparent hover:bg-white/5 hover:text-white',
  );
  const content = (
    <>
      <Icon className="h-[17px] w-[17px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0" aria-hidden="true" />
      {collapsed ? (
        <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1F1F1F] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
          {label}
        </span>
      ) : <span className="truncate">{label}</span>}
    </>
  );
  return external
    ? <a href={href} target="_blank" rel="noopener noreferrer" aria-label={collapsed ? label : undefined} className={className}>{content}</a>
    : <Link href={href} onClick={onClick} aria-current={active ? 'page' : undefined} aria-label={collapsed ? label : undefined} className={className}>{content}</Link>;
}

export default function CpanelShell({ email, role, workstation, children }: {
  email: string;
  /** Shown under the header name, e.g. "CEO" or "Team Member · Marketing". */
  role: string;
  /** The person's own AE Workstation (CEO or department), to switch back to. */
  workstation: { href: string; label: string } | null;
  children: React.ReactNode;
}) {
  const path = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = usePersistentToggle('cpanel-sidebar-collapsed');

  const sidebar = (mini: boolean) => (
    <aside className={cx('flex h-full flex-col bg-[#0F0F0F] text-[#BDBDBD] transition-[width] duration-200 motion-reduce:transition-none', mini ? 'w-[72px]' : 'w-[237px]')}>
      <div className={cx('flex items-center border-b border-white/5 py-5', mini ? 'justify-center px-2' : 'gap-3 px-5')}>
        <Image src="/logo.png" alt={mini ? 'Agunwami Enterprise' : ''} width={34} height={34} className="shrink-0 object-contain" />
        {!mini && (
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-white">Agunwami Enterprise</p>
            <p className="text-[11px] text-[#6B6B6B]">Control Panel</p>
          </div>
        )}
      </div>
      <nav className={cx('flex-1 space-y-1 py-5', mini ? 'flex flex-col items-center px-2' : 'px-3')} aria-label="C-panel">
        {NAV.map(item => (
          <NavItem key={item.href} {...item} collapsed={mini} onClick={() => setOpen(false)}
            active={path === item.href || path.startsWith(`${item.href}/`)} />
        ))}
      </nav>
      <div className={cx('space-y-1 border-t border-white/5 py-4 text-[14px] text-[#8A8A8A]', mini ? 'flex flex-col items-center px-2' : 'px-3')}>
        {workstation && <NavItem href={workstation.href} label={workstation.label} icon={ArrowLeftRight} collapsed={mini} onClick={() => setOpen(false)} />}
        <NavItem href="/" label="View Website" icon={Eye} collapsed={mini} external />
        <button type="button" onClick={signOut} aria-label={mini ? 'Sign out' : undefined}
          className={cx('group relative flex items-center rounded-lg hover:bg-white/5 hover:text-white', mini ? 'h-10 w-10 justify-center' : 'w-full gap-3 px-3 py-2')}>
          <LogOut className="h-[17px] w-[17px] shrink-0" aria-hidden="true" />
          {mini ? (
            <span role="tooltip" className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-md bg-[#1F1F1F] px-2.5 py-1.5 text-[12px] font-medium text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100">Sign Out</span>
          ) : 'Sign Out'}
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFAF3] font-secondary">
      <div className="hidden lg:block">{sidebar(collapsed)}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          <div className="ae-slide-in-left">{sidebar(false)}</div>
          <button type="button" aria-label="Close menu" className="ae-fade-in flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#ECEAE3] bg-white/80 px-5 md:px-8 lg:px-10">
          <button type="button" className="rounded-md p-2 text-[#3A3A3A] lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(v => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <button type="button" onClick={() => setCollapsed(v => !v)} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="hidden rounded-md p-2 text-[#6B6B6B] hover:bg-[#F3F1EA] hover:text-[#1A1A1A] lg:block">
            {collapsed ? <PanelLeftOpen className="h-5 w-5" /> : <PanelLeftClose className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            {workstation && (
              <Link href={workstation.href} title={`Switch to the ${workstation.label}`}
                className="hidden items-center gap-2 rounded-lg border border-[#E5E2D9] bg-white px-3 py-2 text-[13px] font-semibold text-[#1A1A1A] transition-colors hover:border-[#C89B3C] hover:bg-[#FBFAF6] sm:inline-flex">
                <ArrowLeftRight className="h-4 w-4 text-[#C89B3C]" aria-hidden="true" />
                <span className="max-w-[220px] truncate">{workstation.label}</span>
              </Link>
            )}
            <div className="text-right">
              <p className="max-w-[220px] truncate text-[13px] font-semibold text-[#1A1A1A]">{role}</p>
              <p className="text-[12px] text-[#8A8A8A]">{email}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C89B3C] text-[14px] font-semibold text-white">
              {(email[0] || 'A').toUpperCase()}
            </span>
          </div>
        </header>
        <main data-cpanel-scroll className="flex-1 overflow-y-auto px-5 py-8 md:px-8 md:py-10 lg:px-10">
          <div key={path} className="ae-page-enter">{children}</div>
        </main>
      </div>
    </div>
  );
}
