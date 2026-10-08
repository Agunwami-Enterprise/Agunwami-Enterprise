'use client';

import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  BookOpen, Eye, FileText, FolderOpen, Handshake, LayoutGrid, LogOut, Menu, Settings, Users, X,
} from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { cx } from './ui';

const NAV = [
  { label: 'Dashboard', href: '/cpanel/dashboard', icon: LayoutGrid },
  { label: 'Projects', href: '/cpanel/projects', icon: FolderOpen },
  { label: 'Team', href: '/cpanel/team', icon: Users },
  { label: 'Expert Insights', href: '/cpanel/insights', icon: BookOpen },
  { label: 'Applications', href: '/cpanel/applications', icon: FileText },
  { label: 'Partnerships', href: '/cpanel/partnerships', icon: Handshake },
  { label: 'Settings', href: '/cpanel/settings', icon: Settings },
];

export default function CpanelShell({ email, isCeo, children }: { email: string; isCeo: boolean; children: React.ReactNode }) {
  const path = usePathname();
  const { signOut } = useAuth();
  const [open, setOpen] = useState(false);

  const sidebar = (
    <aside className="flex h-full w-[237px] flex-col bg-[#0F0F0F] text-[#BDBDBD]">
      <div className="flex items-center gap-3 border-b border-white/5 px-5 py-5">
        <Image src="/logo.png" alt="" width={34} height={34} className="object-contain" />
        <div className="min-w-0">
          <p className="truncate text-[14px] font-semibold text-white">Agunwami Enterprise</p>
          <p className="text-[11px] text-[#6B6B6B]">Control Panel</p>
        </div>
      </div>
      <nav className="flex-1 space-y-1 px-3 py-5" aria-label="C-panel">
        {NAV.map(({ label, href, icon: Icon }) => {
          const active = path === href || path.startsWith(`${href}/`);
          return (
            <Link key={href} href={href} onClick={() => setOpen(false)} aria-current={active ? 'page' : undefined}
              className={cx(
                'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-[14px] transition-colors',
                active
                  ? 'border-[#C89B3C]/40 bg-[#C89B3C]/15 font-semibold text-[#C89B3C]'
                  : 'border-transparent hover:bg-white/5 hover:text-white',
              )}>
              <Icon className="h-[17px] w-[17px]" aria-hidden="true" /> {label}
            </Link>
          );
        })}
      </nav>
      <div className="space-y-1 border-t border-white/5 px-3 py-4 text-[14px]">
        {isCeo && (
          <Link href="/ceo/dashboard" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#8A8A8A] hover:bg-white/5 hover:text-white">
            <LayoutGrid className="h-[17px] w-[17px]" aria-hidden="true" /> CEO Workstation
          </Link>
        )}
        <a href="/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 rounded-lg px-3 py-2 text-[#8A8A8A] hover:bg-white/5 hover:text-white">
          <Eye className="h-[17px] w-[17px]" aria-hidden="true" /> View Website
        </a>
        <button type="button" onClick={signOut} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[#8A8A8A] hover:bg-white/5 hover:text-white">
          <LogOut className="h-[17px] w-[17px]" aria-hidden="true" /> Sign Out
        </button>
      </div>
    </aside>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-[#FBFAF3] font-secondary">
      <div className="hidden lg:block">{sidebar}</div>
      {open && (
        <div className="fixed inset-0 z-40 flex lg:hidden">
          {sidebar}
          <button type="button" aria-label="Close menu" className="flex-1 bg-black/40" onClick={() => setOpen(false)} />
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-[72px] shrink-0 items-center justify-between border-b border-[#ECEAE3] bg-white/80 px-5 md:px-16">
          <button type="button" className="rounded-md p-2 text-[#3A3A3A] lg:hidden" aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen(v => !v)}>
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right">
              <p className="text-[13px] font-semibold text-[#1A1A1A]">{isCeo ? 'CEO' : 'Content Team'}</p>
              <p className="text-[12px] text-[#8A8A8A]">{email}</p>
            </div>
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-[#C89B3C] text-[14px] font-semibold text-white">
              {(email[0] || 'A').toUpperCase()}
            </span>
          </div>
        </header>
        <main className="flex-1 overflow-y-auto px-5 py-8 md:px-16 md:py-10">{children}</main>
      </div>
    </div>
  );
}
