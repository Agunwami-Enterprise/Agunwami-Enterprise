'use client';

/**
 * Sidebar of the AE department workstation (/ws), from the AE Workstation
 * Figma design ("IT Lead SideBar Default"). It lists only the pages the
 * person's AE department has (Departments page). Always visible on large
 * screens; a drawer on smaller ones.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import {
  BarChart3, Bell, CircleCheck, Clock, Code2, DollarSign, FileText, Globe, GraduationCap,
  LayoutGrid, LifeBuoy, LogOut, MessageSquare, Monitor, Settings, Shield, Users,
  type LucideIcon,
} from 'lucide-react';
import { rtdb } from '@/lib/workstation/firebase';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import { PAGE_GROUPS, WORKSTATION_PAGES, type WorkstationPage } from '@/lib/workstation/pages';
import { subscribeNotifications, type NotifItem } from '@/modules/notifications/services';
import { useInAppPreferences } from '@/modules/settings/use-in-app-preferences';
import type { SidebarProps } from '@/app/components/ceo/CeoShell';

const ICONS: Record<string, LucideIcon> = {
  dashboard: LayoutGrid,
  tasks: CircleCheck,
  messages: MessageSquare,
  'time-tracking': Clock,
  documents: FileText,
  'leave-requests': LogOut,
  reports: BarChart3,
  payments: DollarSign,
  notifications: Bell,
  development: Code2,
  'technical-status': Monitor,
  'it-support': LifeBuoy,
  staff: Users,
  training: GraduationCap,
  website: Globe,
  settings: Settings,
};

export default function WorkstationSidebar({ open, onClose, onNavigate }: SidebarProps) {
  const path = usePathname();
  const { user } = useAuth();
  const uid = user?.uid;
  const [unreadMessages, setUnreadMessages] = useState<{ uid: string; count: number } | null>(null);
  const [notifications, setNotifications] = useState<{ uid: string; items: NotifItem[] } | null>(null);
  const inApp = useInAppPreferences();
  const access = useWorkstationAccess();
  const allowed = new Set(access.pages);
  const visible = WORKSTATION_PAGES.filter(page => access.kind === 'ceo' || allowed.has(page.id));
  const main = visible.filter(page => page.group === 'Workspace');
  const sections = PAGE_GROUPS.filter(group => group !== 'Workspace')
    .map(group => ({ title: group, items: visible.filter(page => page.group === group) }))
    .filter(section => section.items.length > 0);

  useEffect(() => {
    if (!uid) return;
    return onValue(
      ref(rtdb, 'conversations'),
      snapshot => {
        const conversations = snapshot.val() as Record<string, { unreadCount?: Record<string, number> }> | null;
        const count = Object.values(conversations || {}).reduce(
          (total, conversation) => total + (Number(conversation.unreadCount?.[uid]) || 0),
          0,
        );
        setUnreadMessages({ uid, count });
      },
      () => setUnreadMessages({ uid, count: 0 }),
    );
  }, [uid]);

  useEffect(() => (uid ? subscribeNotifications(uid, items => setNotifications({ uid, items })) : undefined), [uid]);

  const hasUnreadMessages = (unreadMessages?.uid === uid ? unreadMessages?.count ?? 0 : 0) > 0;
  const hasUnreadNotifications = (notifications?.uid === uid ? notifications?.items ?? [] : [])
    .some(item => !item.read && inApp[item.category]);
  const dots: Record<string, boolean> = {
    messages: hasUnreadMessages,
    notifications: hasUnreadNotifications,
  };
  const activeId = visible.find(page => path === page.href || path.startsWith(page.href + '/'))?.id;

  const renderItem = (item: WorkstationPage) => {
    const active = item.id === activeId;
    const Icon = ICONS[item.id] ?? LayoutGrid;
    return (
      <Link
        key={item.href}
        href={item.href}
        aria-current={active ? 'page' : undefined}
        onClick={() => { if (!active) onNavigate?.(); onClose(); }}
        className={`flex w-full items-center gap-2.5 rounded-lg p-3 text-[16px] leading-6 transition-colors
          ${active
            ? 'bg-[#fef3c7] font-medium text-[#292929] dark:bg-[#f5bd02]/15 dark:text-white'
            : 'text-[#656565] hover:bg-black/5 hover:text-[#292929] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white'}`}
      >
        <span className="flex h-9 w-9 shrink-0 items-center justify-center">
          <Icon className="h-5 w-5" strokeWidth={1.75} aria-hidden />
        </span>
        <span className="min-w-0 flex-1 truncate">{item.label}</span>
        <span className="flex h-[18px] w-[18px] shrink-0 items-center justify-center">
          {dots[item.id] && <span className="h-3 w-3 rounded-full bg-[#ff3333]" aria-label="Unread" />}
        </span>
      </Link>
    );
  };

  return (
    <>
      {open && <div className="fixed inset-0 z-20 bg-black/50 lg:hidden" onClick={onClose} />}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-[256px] shrink-0 flex-col gap-[50px] overflow-y-auto bg-[#fafafa] p-4
          drop-shadow-[7px_1px_9.45px_rgba(0,0,0,0.16)] transition-transform duration-200 ease-in-out dark:bg-[#171612]
          lg:static lg:translate-x-0 ${open ? 'translate-x-0' : '-translate-x-full'}`}
      >
        <div className="flex flex-col gap-10">
          {/* Brand */}
          <div className="flex items-center border-b-2 border-black/20 pb-[26px] pt-[5px] dark:border-white/10">
            <Image src="/AE-Logo.svg" alt="" width={48} height={48} className="h-12 w-12 shrink-0" />
            <div className="min-w-0 pl-3">
              <p className="text-[16px] font-semibold leading-6 text-[#292929] dark:text-white">AGUNWAMI ENTERPRISE</p>
              <p className="text-[14px] leading-5 text-[#656565] dark:text-gray-400">Workstation</p>
            </div>
          </div>

          <nav className="flex flex-col" aria-label={`${access.departmentName} workstation`}>
            <div className="flex flex-col gap-2">{main.map(renderItem)}</div>
            {sections.map(section => (
              <div key={section.title} className="flex flex-col">
                <p className="px-5 pb-1 pt-3 text-[14px] font-semibold uppercase leading-5 text-[#656565] underline dark:text-gray-400">
                  {section.title}
                </p>
                {section.items.map(renderItem)}
              </div>
            ))}
          </nav>
        </div>

        {/* Who is signed in */}
        <div className="mt-auto flex items-center gap-2.5 rounded-[10px] border border-[#806013] bg-[#fef3c7] p-4 dark:border-[#f5bd02]/40 dark:bg-[#f5bd02]/10">
          <Shield className="h-6 w-6 shrink-0 text-[#292929] dark:text-[#f5bd02]" strokeWidth={1.75} aria-hidden />
          <div className="min-w-0">
            <p className="truncate text-[16px] font-bold leading-6 text-black dark:text-white">{access.title}</p>
            <p className="truncate text-[14px] leading-5 text-[#4b5563] dark:text-gray-400">{access.departmentName}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
