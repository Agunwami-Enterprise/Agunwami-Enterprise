'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/workstation/auth-context';
import { subscribeUserProfile, type UserProfile } from '@/modules/settings/services';
import {
  subscribeToday, clockIn, startBreak, resumeWork, clockOut, computeLiveTotals,
  type StaffLiveInfo,
} from '@/modules/time-tracking/services';
import type { TimeTrackingDayDoc, DayStatus } from '@/modules/time-tracking/types';

function fmtDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, '0')}m`;
}

const STATUS_META: Record<DayStatus, { label: string; bg: string; color: string }> = {
  onshift:  { label: 'On Shift',  bg: '#dcfce7', color: '#16a34a' },
  onbreak:  { label: 'On Break',  bg: '#fef3c7', color: '#d97706' },
  offshift: { label: 'Off Shift', bg: '#f3f4f6', color: '#6b7280' },
  onleave:  { label: 'On Leave',  bg: '#dbeafe', color: '#2563eb' },
  suspended:{ label: 'Suspended', bg: '#fee2e2', color: '#dc2626' },
};

export default function ClockWidget() {
  const { user, accountStatus } = useAuth();
  const isSuspended = accountStatus === 'suspended';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [day, setDay] = useState<TimeTrackingDayDoc | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserProfile(user.uid, p => {
      if (p) setProfile(p);
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToday(user.uid, setDay);
  }, [user?.uid]);

  useEffect(() => {
    if (!day || day.status === 'offshift' || day.status === 'onleave' || day.status === 'suspended' || isSuspended) return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [day, isSuspended]);

  const rawStatus = day?.status ?? 'offshift';
  // Guard against stale/corrupt Firestore values
  const knownStatuses: DayStatus[] = ['onshift', 'onbreak', 'offshift', 'onleave', 'suspended'];
  const status: DayStatus = knownStatuses.includes(rawStatus as DayStatus) ? (rawStatus as DayStatus) : 'offshift';
  const meta = STATUS_META[status];
  const { workedMinutes, breakMinutes } = computeLiveTotals(day?.sessions, now);
  const elapsedMinutes = day ? Math.max(0, Math.floor((now - day.clockIn.toMillis()) / 60000)) : 0;
  const shiftText = profile?.shiftPeriod || `${profile?.shiftStartTime || '09:00'} – ${profile?.shiftEndTime || '17:00'}`;

  async function run(action: (uid: string, info: StaffLiveInfo) => Promise<void>) {
    if (!user?.uid || !profile || busy) return;
    setBusy(true);
    const liveInfo: StaffLiveInfo = {
      name: profile.name || profile.displayName || 'Staff Member',
      role: profile.role,
      department: profile.department || '',
    };
    try { await action(user.uid, liveInfo); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-3 flex items-center justify-between">
        <div>
          <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">Time Clock</span>
          <p className="text-[10px] text-gray-400 dark:text-gray-500">Shift: {shiftText}</p>
        </div>
        <span
          className="rounded-full px-2.5 py-1 text-[10px] font-semibold"
          style={{ backgroundColor: meta.bg, color: meta.color }}
        >
          {meta.label}
        </span>
      </div>

      <div className="mb-4 grid grid-cols-3 gap-2 text-center">
        <Stat label="Clocked In" value={fmtDuration(elapsedMinutes)} />
        <Stat label="On Break"   value={fmtDuration(breakMinutes)} />
        <Stat label="Net Worked" value={fmtDuration(workedMinutes)} />
      </div>

      <div className="flex gap-2">
        {/* Suspended: all clock-in actions are disabled */}
        {isSuspended ? (
          <div className="flex w-full items-center justify-center gap-2 rounded-lg bg-red-50 py-2.5 text-[12px] font-medium text-red-600 dark:bg-red-900/20 dark:text-red-400">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
            </svg>
            Account suspended — clock-in disabled
          </div>
        ) : (
          <>
            {status === 'offshift' && (
              <ActionButton label="Clock In" busy={busy} color="#22c55e" onClick={() => run(clockIn)} />
            )}
            {status === 'onshift' && (
              <>
                <ActionButton label="Break" busy={busy} color="#f5bd02" dark onClick={() => run(startBreak)} />
                <ActionButton label="Clock Out" busy={busy} color="#ef4444" onClick={() => run(clockOut)} />
              </>
            )}
            {status === 'onbreak' && (
              <>
                <ActionButton label="Resume" busy={busy} color="#22c55e" onClick={() => run(resumeWork)} />
                <ActionButton label="Clock Out" busy={busy} color="#ef4444" onClick={() => run(clockOut)} />
              </>
            )}
            {(status === 'onleave') && (
              <p className="w-full text-center text-[11px] text-gray-400">No actions available — on leave</p>
            )}
          </>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-gray-50 p-2.5 dark:bg-[#2a2a2a]">
      <p className="text-[10px] text-gray-500 dark:text-gray-400">{label}</p>
      <p className="mt-0.5 text-[13px] font-bold text-gray-800 dark:text-white">{value}</p>
    </div>
  );
}

function ActionButton({
  label, busy, color, dark, onClick,
}: { label: string; busy: boolean; color: string; dark?: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      disabled={busy}
      className="flex-1 rounded-lg py-2 text-[13px] font-semibold transition hover:opacity-90 disabled:opacity-50"
      style={{ backgroundColor: color, color: dark ? '#1a1a1a' : '#fff' }}
    >
      {label}
    </button>
  );
}
