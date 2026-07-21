'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTheme } from '@/lib/theme-context';
import { useAuth } from '@/lib/auth-context';
import { subscribeUserProfile, type UserProfile } from '@/modules/settings/services';
import { subscribeNotifications, markNotifRead, markAllNotifsRead, type NotifItem } from '@/modules/notifications/services';

interface Props { onMenuClick: () => void; }

export default function CeoNavbar({ onMenuClick }: Props) {
  const [showNotif, setShowNotif] = useState(false);
  const [showUser, setShowUser]   = useState(false);
  const [profile, setProfile]     = useState<UserProfile | null>(null);
  const [navNotifs, setNavNotifs] = useState<NotifItem[]>([]);
  const notifRef = useRef<HTMLDivElement>(null);
  const userRef  = useRef<HTMLDivElement>(null);
  const { dark, toggle } = useTheme();
  const { user, signOut } = useAuth();
  const router = useRouter();

  useEffect(() => {
    function outside(e: MouseEvent) {
      if (notifRef.current && !notifRef.current.contains(e.target as Node)) setShowNotif(false);
      if (userRef.current  && !userRef.current.contains(e.target as Node))  setShowUser(false);
    }
    document.addEventListener('mousedown', outside);
    return () => document.removeEventListener('mousedown', outside);
  }, []);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserProfile(user.uid, setProfile);
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeNotifications(user.uid, setNavNotifs);
  }, [user?.uid]);

  const navUnread = navNotifs.filter(n => !n.read).length;

  function handleNotifClick(id: string) {
    setShowNotif(false);
    markNotifRead(id).catch(() => {});
    router.push('/ceo/notifications');
  }

  async function handleMarkAllRead() {
    const unreadIds = navNotifs.filter(n => !n.read).map(n => n.id);
    await markAllNotifsRead(unreadIds);
  }

  const displayName  = profile?.name  || user?.displayName || 'Agunwami';
  const displayEmail = profile?.email || user?.email       || 'ceo@agunwami.com';
  const initials     = displayName.charAt(0).toUpperCase();

  return (
    <header className="relative z-10 flex h-14 flex-shrink-0 items-center gap-3 border-b border-gray-100 bg-white px-4 dark:border-white/6 dark:bg-[#1a1a1a]">
      {/* Hamburger */}
      <button
        onClick={onMenuClick}
        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/6"
      >
        <HamburgerIcon />
      </button>

      {/* Search */}
      <div className="flex max-w-xs flex-1 items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-white/8 dark:bg-[#2a2a2a]">
        <SearchIcon />
        <input
          type="text"
          placeholder="Search tasks, staff, or documents..."
          className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500"
        />
      </div>

      <div className="flex-1" />

      {/* Bell */}
      <div ref={notifRef} className="relative">
        <button
          onClick={() => { setShowNotif(v => !v); setShowUser(false); }}
          className="relative flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/6"
        >
          <BellIcon />
          {navUnread > 0 && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-[#1a1a1a]" />
          )}
        </button>

        {showNotif && (
          <div
            className="absolute right-0 top-full mt-2 w-[320px] overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3 dark:border-white/6">
              <div>
                <span className="text-[13px] font-semibold text-gray-800 dark:text-white">Notifications</span>
                {navUnread > 0 && (
                  <span className="ml-2 text-[11px] text-gray-400 dark:text-gray-500">{navUnread} unread</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                {navUnread > 0 && (
                  <button onClick={handleMarkAllRead} className="text-[11px] font-medium text-[#f5bd02] hover:underline">
                    Mark all read
                  </button>
                )}
                <button onClick={() => setShowNotif(false)} className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>
                </button>
              </div>
            </div>

            {/* Items */}
            <div className="max-h-[360px] overflow-y-auto">
              {navNotifs.length === 0 ? (
                <div className="px-4 py-8 text-center text-[12px] text-gray-400">No notifications</div>
              ) : (
                navNotifs.slice(0, 8).map(n => (
                  <button
                    key={n.id}
                    onClick={() => handleNotifClick(n.id)}
                    className="flex w-full gap-3 border-b border-gray-50 px-4 py-3 text-left last:border-0 hover:bg-gray-50 dark:border-white/4 dark:hover:bg-white/3"
                  >
                    <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full" style={{ backgroundColor: n.iconBg }}>
                      <NotifCategoryIcon category={n.category} color={n.iconColor} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] font-semibold text-gray-800 dark:text-white">{n.title}</p>
                      <p className="text-[11px] leading-snug text-gray-500 dark:text-gray-400">{n.body}</p>
                      <p className="mt-1 text-[10px] text-gray-400 dark:text-gray-500">{n.time}</p>
                    </div>
                    {!n.read && <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-blue-500" />}
                  </button>
                ))
              )}
            </div>

            {/* Footer */}
            {navNotifs.length > 0 && (
              <div className="border-t border-gray-100 dark:border-white/6">
                <button
                  onClick={() => { setShowNotif(false); router.push('/ceo/notifications'); }}
                  className="w-full py-3 text-center text-[12px] font-medium text-[#f5bd02] hover:bg-gray-50 dark:hover:bg-white/3"
                >
                  View all notifications
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* User */}
      <div ref={userRef} className="relative">
        <button
          onClick={() => { setShowUser(v => !v); setShowNotif(false); }}
          className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-gray-100 dark:hover:bg-white/6"
        >
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#f5bd02] text-[11px] font-bold text-[#1a1a1a]">
            {initials}
          </div>
          <div className="hidden text-left sm:block">
            <p className="text-[12px] font-semibold leading-tight text-gray-800 dark:text-white">{displayName}</p>
            <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400">CEO</p>
          </div>
          <ChevronIcon />
        </button>

        {showUser && (
          <div
            className="absolute right-0 top-full mt-2 w-[230px] overflow-hidden rounded-2xl bg-white dark:bg-[#1e1e1e]"
            style={{ boxShadow: '0 8px 40px rgba(0,0,0,0.16)' }}
          >
            {/* Header */}
            <div className="border-b border-gray-100 px-4 py-3.5 dark:border-white/6">
              <p className="text-[14px] font-bold text-gray-900 dark:text-white leading-tight">{displayName}</p>
              <p className="mt-0.5 text-[11px] text-gray-500 dark:text-gray-400">{displayEmail}</p>
            </div>

            {/* Menu items */}
            <div className="py-1.5">
              <button
                onClick={() => { setShowUser(false); router.push('/ceo/settings?tab=profile'); }}
                className="flex h-10 w-full items-center gap-3 px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/4"
              >
                <DropUserIcon />
                Profile Settings
              </button>
              <button
                onClick={() => { setShowUser(false); router.push('/ceo/settings?tab=preferences'); }}
                className="flex h-10 w-full items-center gap-3 px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/4"
              >
                <DropGearIcon />
                Account Preferences
              </button>
              <button
                onClick={toggle}
                className="flex h-10 w-full items-center px-4 text-[12px] font-medium text-gray-700 hover:bg-gray-50 dark:text-gray-300 dark:hover:bg-white/4"
              >
                <span className="flex-1 text-left">Switch Theme</span>
                {dark ? <DropMoonIcon /> : <DropSunIcon />}
              </button>
            </div>

            {/* Sign out */}
            <div className="border-t border-gray-100 py-1.5 dark:border-white/6">
              <button
                onClick={signOut}
                className="flex h-10 w-full items-center gap-3 px-4 text-[12px] font-medium text-red-500 hover:bg-red-50 dark:hover:bg-red-500/8"
              >
                <DropSignOutIcon />
                Sign Out
              </button>
            </div>
          </div>
        )}
      </div>
    </header>
  );
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function NotifCategoryIcon({ category, color }: { category: string; color: string }) {
  const s = { width: 12, height: 12, stroke: color, fill: 'none', strokeWidth: 1.8 } as const;
  if (category === 'tasks')    return <svg {...s} viewBox="0 0 16 16"><polyline points="2,8 6,12 14,4"/></svg>;
  if (category === 'payments') return <svg {...s} viewBox="0 0 16 16"><rect x="1" y="4" width="14" height="10" rx="1.5"/><line x1="1" y1="8" x2="15" y2="8"/></svg>;
  if (category === 'messages') return <svg {...s} viewBox="0 0 16 16"><path d="M14 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h4l2 2 2-2h4a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1z"/></svg>;
  return <svg {...s} viewBox="0 0 16 16"><circle cx="8" cy="8" r="6"/><line x1="8" y1="5" x2="8" y2="8"/><circle cx="8" cy="11" r="0.5" fill={color}/></svg>;
}

function HamburgerIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><line x1="2" y1="4" x2="14" y2="4"/><line x1="2" y1="8" x2="14" y2="8"/><line x1="2" y1="12" x2="14" y2="12"/></svg>;
}
function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>;
}
function BellIcon() {
  return <svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M8 1.5A4.5 4.5 0 0 0 3.5 6v3L2 11h12l-1.5-2V6A4.5 4.5 0 0 0 8 1.5z"/><path d="M6.5 11.5a1.5 1.5 0 0 0 3 0"/></svg>;
}
function ChevronIcon() {
  return <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="#9ca3af" strokeWidth="1.8" strokeLinecap="round"><polyline points="2,4 6,8 10,4"/></svg>;
}
function DropUserIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="6" r="3"/><path d="M2 14c0-3 2.7-5 6-5s6 2 6 5"/></svg>;
}
function DropGearIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="2.2"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M12.6 3.4l-.7.7M4.1 11.9l-.7.7"/></svg>;
}
function DropSunIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><circle cx="8" cy="8" r="3"/><path d="M8 1.5v1M8 13.5v1M1.5 8h1M13.5 8h1M3.4 3.4l.7.7M11.9 11.9l.7.7M12.6 3.4l-.7.7M4.1 11.9l-.7.7"/></svg>;
}
function DropMoonIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M13 10.5A6 6 0 0 1 5.5 3a6 6 0 1 0 7.5 7.5z"/></svg>;
}
function DropSignOutIcon() {
  return <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round"><path d="M6 2H3a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/><polyline points="10,11 14,8 10,5"/><line x1="14" y1="8" x2="6" y2="8"/></svg>;
}
