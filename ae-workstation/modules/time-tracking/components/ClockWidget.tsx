'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/lib/auth-context';
import { subscribeUserProfile } from '@/modules/settings/services';
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
  active:       { label: 'Active',      bg: '#dcfce7', color: '#16a34a' },
  break:        { label: 'On Break',    bg: '#fef3c7', color: '#d97706' },
  'clocked-out':{ label: 'Clocked Out', bg: '#f3f4f6', color: '#6b7280' },
};

export default function ClockWidget() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<StaffLiveInfo | null>(null);
  const [day, setDay] = useState<TimeTrackingDayDoc | null>(null);
  const [now, setNow] = useState(() => Date.now());
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeUserProfile(user.uid, p => {
      if (p) setProfile({ name: p.name, role: p.role, department: p.department });
    });
  }, [user?.uid]);

  useEffect(() => {
    if (!user?.uid) return;
    return subscribeToday(user.uid, setDay);
  }, [user?.uid]);

  useEffect(() => {
    if (!day || day.status === 'clocked-out') return;
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, [day]);

  const status = day?.status ?? 'clocked-out';
  const meta = STATUS_META[status];
  const { workedMinutes, breakMinutes } = computeLiveTotals(day?.sessions, now);
  const elapsedMinutes = day ? Math.max(0, Math.floor((now - day.clockIn.toMillis()) / 60000)) : 0;

  async function run(action: (uid: string, info: StaffLiveInfo) => Promise<void>) {
    if (!user?.uid || !profile || busy) return;
    setBusy(true);
    try { await action(user.uid, profile); } finally { setBusy(false); }
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">Time Clock</span>
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
        {status === 'clocked-out' && (
          <ActionButton label="Clock In" busy={busy} color="#22c55e" onClick={() => run(clockIn)} />
        )}
        {status === 'active' && (
          <>
            <ActionButton label="Break" busy={busy} color="#f5bd02" dark onClick={() => run(startBreak)} />
            <ActionButton label="Clock Out" busy={busy} color="#ef4444" onClick={() => run(clockOut)} />
          </>
        )}
        {status === 'break' && (
          <>
            <ActionButton label="Active" busy={busy} color="#22c55e" onClick={() => run(resumeWork)} />
            <ActionButton label="Clock Out" busy={busy} color="#ef4444" onClick={() => run(clockOut)} />
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
