'use client';

/**
 * Department workstation → Staff Management (/ws/staff): the people in the
 * signed-in person's AE department, their position (staff or the department
 * admin), shift, and whether they're on shift, on a break, off or on leave
 * right now. Department membership, positions and transfers are managed by
 * the CEO (Staff Management at /ceo/staff).
 */

import { useEffect, useState } from 'react';
import { Clock3, Coffee, Mail, Search, ShieldCheck, Users, UserX } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import { subscribeLiveTeam } from '@/modules/time-tracking/services';
import type { DayStatus } from '@/modules/time-tracking/types';
import { useDepartmentTeam, type TeamMember } from '../data';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, field } from './ui';

interface Live { status: DayStatus; clockIn: Date | null }

const STATUS: Record<DayStatus | 'none', { label: string; tone: 'green' | 'amber' | 'gray' | 'blue' | 'red' }> = {
  onshift: { label: 'On shift', tone: 'green' },
  onbreak: { label: 'On break', tone: 'amber' },
  offshift: { label: 'Off shift', tone: 'gray' },
  onleave: { label: 'On leave', tone: 'blue' },
  suspended: { label: 'Suspended', tone: 'red' },
  none: { label: 'Not clocked in', tone: 'gray' },
};

const timeLabel = (hhmm: string) => {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return '';
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(2000, 0, 1, h, m).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
};

/** Clocked in after their shift start (with five minutes' grace). */
function isLate(member: TeamMember, live: Live | undefined): boolean {
  if (!live?.clockIn || !/^\d{2}:\d{2}$/.test(member.shiftStart)) return false;
  const [h, m] = member.shiftStart.split(':').map(Number);
  const start = new Date(live.clockIn);
  start.setHours(h, m + 5, 0, 0);
  return live.clockIn > start;
}

type Filter = 'all' | 'working' | 'away';

export default function StaffManagement() {
  const { user } = useAuth();
  const access = useWorkstationAccess();
  const { members, loading, error } = useDepartmentTeam();
  const [live, setLive] = useState<Record<string, Live>>({});
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  useEffect(() => subscribeLiveTeam(rows => {
    const map: Record<string, Live> = {};
    for (const row of rows) map[row.uid] = { status: row.status, clockIn: row.todayClockIn ? row.todayClockIn.toDate() : null };
    setLive(map);
  }, () => setLive({})), []);

  const admin = members.find(m => m.isDepartmentAdmin) ?? null;
  const working = (m: TeamMember) => live[m.uid]?.status === 'onshift' || live[m.uid]?.status === 'onbreak';
  const counts = {
    onShift: members.filter(m => live[m.uid]?.status === 'onshift').length,
    onBreak: members.filter(m => live[m.uid]?.status === 'onbreak').length,
    away: members.filter(m => !working(m)).length,
    late: members.filter(m => working(m) && isLate(m, live[m.uid])).length,
  };

  const term = search.trim().toLowerCase();
  const shown = members.filter(m => {
    if (term && !m.name.toLowerCase().includes(term) && !m.email.toLowerCase().includes(term) && !m.title.toLowerCase().includes(term)) return false;
    if (filter === 'working' && !working(m)) return false;
    if (filter === 'away' && working(m)) return false;
    return true;
  });

  const deptName = access.kind === 'ceo' ? 'All departments' : access.departmentName;

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Staff Management" subtitle={`${deptName}: who's in the team and who's working now`} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Team Members" icon={Users} iconClass="text-[#f59e0b]" value={loading ? '…' : String(members.length)}
          sub={admin ? `Admin: ${admin.name}` : 'No department admin yet'} />
        <StatTile label="On Shift" icon={Clock3} iconClass="text-[#16a34a]" value={loading ? '…' : String(counts.onShift)}
          sub={`${counts.late} clocked in late`} />
        <StatTile label="On a Break" icon={Coffee} iconClass="text-[#f59e0b]" value={loading ? '…' : String(counts.onBreak)} sub="Paused their shift" />
        <StatTile label="Not Working" icon={UserX} iconClass="text-[#f87171]" value={loading ? '…' : String(counts.away)} sub="Off shift, on leave or not in yet" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card title="Team" icon={Users} action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative block sm:w-64">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden />
            <input className={`${field} pl-9`} placeholder="Search name, email or position" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search team" />
          </label>
          <select className={`${field} sm:w-40`} value={filter} onChange={e => setFilter(e.target.value as Filter)} aria-label="Filter by status">
            <option value="all">Everyone</option>
            <option value="working">Working now</option>
            <option value="away">Not working</option>
          </select>
        </div>
      }>
        {loading ? <Empty>Loading…</Empty> : shown.length === 0 ? (
          <Empty>{members.length === 0 ? 'No one is in this department yet.' : 'No one matches.'}</Empty>
        ) : (
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            {shown.map(member => {
              const state = live[member.uid];
              const status = STATUS[state?.status ?? 'none'];
              const shift = member.shiftStart && member.shiftEnd ? `${timeLabel(member.shiftStart)} – ${timeLabel(member.shiftEnd)}` : 'No shift set';
              return (
                <li key={member.uid} className="rounded-lg border border-[#e5e5e5] bg-white p-4 dark:border-white/10 dark:bg-[#232323]">
                  <div className="flex items-start gap-3">
                    <span className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[15px] font-bold text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">
                      {member.name.charAt(0).toUpperCase()}
                      <span className={`absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white dark:border-[#232323] ${member.online ? 'bg-[#22c55e]' : 'bg-[#d4d4d4] dark:bg-gray-600'}`}
                        title={member.online ? 'Online' : 'Offline'} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-[15px] font-semibold text-[#292929] dark:text-white">
                        <span className="truncate">{member.name}</span>
                        {member.uid === user?.uid && <Pill label="You" tone="gray" />}
                      </p>
                      <p className="flex items-center gap-1 truncate text-[13px] text-[#656565] dark:text-gray-400">
                        {member.isDepartmentAdmin && <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-[#f59e0b]" aria-label="Department admin" />}
                        {member.title}
                      </p>
                    </div>
                    <Pill label={status.label} tone={status.tone} />
                  </div>
                  <dl className="mt-3 space-y-1 text-[13px] text-[#525252] dark:text-gray-300">
                    <div className="flex justify-between gap-3"><dt className="text-[#8a8a8a]">Shift</dt><dd>{shift}</dd></div>
                    <div className="flex justify-between gap-3">
                      <dt className="text-[#8a8a8a]">Clocked in</dt>
                      <dd>
                        {state?.clockIn ? state.clockIn.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' }) : '—'}
                        {working(member) && isLate(member, state) && <span className="ml-1.5 text-[#b91c1c] dark:text-red-300">late</span>}
                      </dd>
                    </div>
                  </dl>
                  {member.email && (
                    <a href={`mailto:${member.email}`} className="mt-3 flex items-center gap-1.5 truncate text-[13px] font-medium text-[#b38a00] hover:underline dark:text-[#f5bd02]">
                      <Mail className="h-3.5 w-3.5 shrink-0" aria-hidden />{member.email}
                    </a>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <p className="text-[13px] text-[#8a8a8a]">
        {access.isDepartmentAdmin
          ? 'As the department admin you see your whole team here. The CEO adds, transfers and changes positions on the AE Staff Management page.'
          : 'The CEO adds people to departments, transfers them and sets positions.'}
      </p>
    </div>
  );
}
