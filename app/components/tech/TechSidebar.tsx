'use client';

/**
 * Sidebar of the Technical team workstation (/tech), from the AE Workstation
 * Figma design ("IT Lead SideBar Default"). Always visible on large screens; a
 * drawer on smaller ones.
 */

import { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { onValue, ref } from 'firebase/database';
import {
  BarChart3, Bell, CircleCheck, Clock, Code2, DollarSign, FileText, GraduationCap, Layers,
  LayoutGrid, LifeBuoy, LogOut, MessageSquare, Monitor, Settings, Shield, Users,
  type LucideIcon,
} from 'lucide-react';
import { rtdb } from '@/lib/workstation/firebase';
import { useAuth } from '@/lib/workstation/auth-context';
import { subscribeNotifications, type NotifItem } from '@/modules/notifications/services';
import { useInAppPreferences } from '@/modules/settings/use-in-app-preferences';
import { subscribeUserProfile, type UserProfile } from '@/modules/settings/services';
import type { SidebarProps } from '@/app/components/ceo/CeoShell';

interface NavItem { label: string; href: string; icon: LucideIcon }

const MAIN: NavItem[] = [
  { label: 'Overview', href: '/tech/dashboard', icon: LayoutGrid },
  { label: 'Tasks', href: '/tech/tasks', icon: CircleCheck },
  { label: 'Messages', href: '/tech/messages', icon: MessageSquare },
  { label: 'Time Tracking', href: '/tech/time-tracking', icon: Clock },
  { label: 'Documents', href: '/tech/documents', icon: FileText },
  { label: 'Leave Request', href: '/tech/leave-requests', icon: LogOut },
  { label: 'Reports', href: '/tech/reports', icon: BarChart3 },
  { label: 'My Payment', href: '/tech/payments', icon: DollarSign },
  { label: 'Notifications', href: '/tech/notifications', icon: Bell },
];

const SECTIONS: Array<{ title: string; items: NavItem[] }> = [
  { title: 'Development', items: [{ label: 'Development', href: '/tech/development', icon: Code2 }] },
  {
    title: 'Technical Operations',
    items: [
      { label: 'Technical Status', href: '/tech/technical-status', icon: Monitor },
      { label: 'IT Support', href: '/tech/it-support', icon: LifeBuoy },
    ],
  },
  {
    title: 'Management',
    items: [
      { label: 'Workstation Builder', href: '/tech/workstation-builder', icon: Layers },
      { label: 'Staff Management', href: '/tech/staff', icon: Users },
      { label: 'Training', href: '/tech/training', icon: GraduationCap },
      { label: 'Settings', href: '/tech/settings', icon: Settings },
    ],
  },
];

const ALL_ITEMS = [...MAIN, ...SECTIONS.flatMap(section => section.items)];

const titleCase = (value: string) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

export default function TechSidebar({ open, onClose, onNavigate }: SidebarProps) {
  const path = usePathname();
  const { user } = useAuth();
  const uid = user?.uid;
  const [unreadMessages, setUnreadMessages] = useState<{ uid: string; count: number } | null>(null);
  const [notifications, setNotifications] = useState<{ uid: string; items: NotifItem[] } | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const inApp = useInAppPreferences();

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
  useEffect(() => (uid ? subscribeUserProfile(uid, setProfile) : undefined), [uid]);

  const hasUnreadMessages = (unreadMessages?.uid === uid ? unreadMessages?.count ?? 0 : 0) > 0;
  const hasUnreadNotifications = (notifications?.uid === uid ? notifications?.items ?? [] : [])
    .some(item => !item.read && inApp[item.category]);
  const dots: Record<string, boolean> = {
    '/tech/messages': hasUnreadMessages,
    '/tech/notifications': hasUnreadNotifications,
  };
  const activeHref = ALL_ITEMS.find(item => path === item.href || path.startsWith(item.href + '/'))?.href;

  const roleTitle = profile?.departmentPosition || 'Team Member';
  const department = profile?.department ? `${titleCase(profile.department)} Department` : 'Technical Department';

  const renderItem = (item: NavItem) => {
    const active = item.href === activeHref;
    const Icon = item.icon;
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
          {dots[item.href] && <span className="h-3 w-3 rounded-full bg-[#ff3333]" aria-label="Unread" />}
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

          <nav className="flex flex-col" aria-label="Technical workstation">
            <div className="flex flex-col gap-2">{MAIN.map(renderItem)}</div>
            {SECTIONS.map(section => (
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
            <p className="truncate text-[16px] font-bold leading-6 text-black dark:text-white">{roleTitle}</p>
            <p className="truncate text-[14px] leading-5 text-[#4b5563] dark:text-gray-400">{department}</p>
          </div>
        </div>
      </aside>
    </>
  );
}
