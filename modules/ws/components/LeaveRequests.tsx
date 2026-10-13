'use client';

/**
 * Department workstation → Leave Request (/ws/leave-requests): request leave
 * and follow your requests; see who in the team is away; and, for the
 * department admin, review the team's requests. Requests are AE Hub's
 * leaveRequests, so they show the same in AE Hub and on the CEO's leave page.
 */

import { useEffect, useState } from 'react';
import { CalendarDays, CalendarOff, CheckCircle2, Clock3, Hourglass, Plane } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import { useConfirm } from '@/app/components/common/AeModal';
import { useDepartmentTeam } from '../data';
import { LEAVE_TYPES, cancelLeave, leaveDays, requestLeave, reviewLeave, useLeaveFor, type LeaveStatus, type WsLeave } from '../leave';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, Tabs, btnGhost, btnPrimary, field } from './ui';
import { Overlay } from './task-board';

type Tab = 'mine' | 'team' | 'away';

const STATUS: Record<LeaveStatus, { label: string; tone: 'amber' | 'green' | 'red' | 'gray' }> = {
  pending: { label: 'Pending', tone: 'amber' },
  approved: { label: 'Approved', tone: 'green' },
  rejected: { label: 'Rejected', tone: 'red' },
  cancelled: { label: 'Cancelled', tone: 'gray' },
};

const fmt = (iso: string) => (iso ? new Date(`${iso}T12:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—');
const range = (l: WsLeave) => (l.startDate === l.endDate ? fmt(l.startDate) : `${fmt(l.startDate)} – ${fmt(l.endDate)}`);
const isoToday = (d: Date) => d.toLocaleDateString('en-CA');

export default function LeaveRequests() {
  const { user } = useAuth();
  const access = useWorkstationAccess();
  const confirm = useConfirm();
  const { members } = useDepartmentTeam();
  const uid = user?.uid ?? '';
  const isAdmin = access.isDepartmentAdmin || access.kind === 'ceo';
  const teamUids = members.map(m => m.uid).filter(id => id !== uid);
  const mine = useLeaveFor(uid ? [uid] : []);
  const team = useLeaveFor(teamUids);
  const [tab, setTab] = useState<Tab>('mine');
  const [requesting, setRequesting] = useState(false);
  const [reviewing, setReviewing] = useState<WsLeave | null>(null);
  const [today, setToday] = useState('');

  useEffect(() => {
    const first = setTimeout(() => setToday(isoToday(new Date())), 0);
    return () => clearTimeout(first);
  }, []);

  const year = today.slice(0, 4);
  const myApproved = mine.requests.filter(l => l.status === 'approved');
  const usedThisYear = myApproved.filter(l => l.startDate.startsWith(year)).reduce((n, l) => n + l.days, 0);
  const myPending = mine.requests.filter(l => l.status === 'pending');
  const upcoming = myApproved.filter(l => today && l.endDate >= today).sort((a, b) => a.startDate.localeCompare(b.startDate))[0] ?? null;
  const teamPending = team.requests.filter(l => l.status === 'pending');
  const away = team.requests.filter(l => l.status === 'approved' && today && l.endDate >= today)
    .sort((a, b) => a.startDate.localeCompare(b.startDate));
  const awayToday = away.filter(l => l.startDate <= today);

  async function cancel(leave: WsLeave) {
    if (!(await confirm({ title: 'Cancel this leave request?', message: `${leave.type} leave, ${range(leave)}.`, confirmLabel: 'Cancel request', cancelLabel: 'Keep it', tone: 'danger' }))) return;
    try { await cancelLeave(leave.id); } catch { /* shown below */ }
  }

  const tabs: Array<{ id: Tab; label: string; badge?: number }> = [
    { id: 'mine', label: 'My Requests', badge: myPending.length },
    ...(isAdmin ? [{ id: 'team' as const, label: 'Team Requests', badge: teamPending.length }] : []),
    { id: 'away', label: "Who's Away" },
  ];

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Leave Request" subtitle={isAdmin ? 'Request leave, and review your team’s requests' : 'Request leave and follow your requests'}
        actions={<button className={btnPrimary} onClick={() => setRequesting(true)}>+ Request Leave</button>} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Days Taken" icon={CalendarDays} iconClass="text-[#2563eb]" value={mine.loading ? '…' : String(usedThisYear)} sub={`Approved leave in ${year || 'this year'}`} />
        <StatTile label="Pending" icon={Hourglass} iconClass="text-[#f59e0b]" value={mine.loading ? '…' : String(myPending.length)} sub="Waiting for approval" />
        <StatTile label="Next Leave" icon={Plane} iconClass="text-[#16a34a]" value={upcoming ? fmt(upcoming.startDate) : '—'} sub={upcoming ? `${upcoming.type}, ${upcoming.days} day${upcoming.days === 1 ? '' : 's'}` : 'Nothing booked'} />
        {isAdmin
          ? <StatTile label="Team Pending" icon={Clock3} iconClass="text-[#ef4444]" value={team.loading ? '…' : String(teamPending.length)} sub="Waiting for your review" />
          : <StatTile label="Team Away Today" icon={CalendarOff} iconClass="text-[#ef4444]" value={team.loading ? '…' : String(awayToday.length)} sub="On approved leave" />}
      </div>

      {(mine.error || team.error) && <ErrorNote>{mine.error || team.error}</ErrorNote>}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={tabs} />

      {tab === 'mine' && (
        <Card title="My Requests" icon={CalendarDays}>
          {mine.loading ? <Empty>Loading…</Empty> : mine.requests.length === 0 ? <Empty>You haven’t requested any leave.</Empty> : (
            <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
              {mine.requests.map(leave => (
                <li key={leave.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[#292929] dark:text-white">
                      {leave.type} leave <Pill label={STATUS[leave.status].label} tone={STATUS[leave.status].tone} />
                    </p>
                    <p className="text-[13px] text-[#656565] dark:text-gray-400">{range(leave)} · {leave.days} day{leave.days === 1 ? '' : 's'}</p>
                    {leave.reason && <p className="text-[13px] text-[#525252] dark:text-gray-300">{leave.reason}</p>}
                    {leave.reviewerName && leave.status !== 'pending' && (
                      <p className="text-[12px] text-[#8a8a8a]">{STATUS[leave.status].label} by {leave.reviewerName}{leave.reviewNote ? `: “${leave.reviewNote}”` : ''}</p>
                    )}
                  </div>
                  {leave.status === 'pending' && <button className={`${btnGhost} self-start sm:self-auto`} onClick={() => void cancel(leave)}>Cancel</button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'team' && isAdmin && (
        <Card title="Team Requests" icon={CheckCircle2}>
          {team.loading ? <Empty>Loading…</Empty> : team.requests.length === 0 ? <Empty>No leave requests from the team yet.</Empty> : (
            <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
              {[...teamPending, ...team.requests.filter(l => l.status !== 'pending')].map(leave => (
                <li key={leave.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold text-[#292929] dark:text-white">
                      {leave.userName || members.find(m => m.uid === leave.userId)?.name || 'Team member'}
                      <Pill label={STATUS[leave.status].label} tone={STATUS[leave.status].tone} />
                    </p>
                    <p className="text-[13px] text-[#656565] dark:text-gray-400">{leave.type} · {range(leave)} · {leave.days} day{leave.days === 1 ? '' : 's'}</p>
                    {leave.reason && <p className="text-[13px] text-[#525252] dark:text-gray-300">{leave.reason}</p>}
                  </div>
                  {leave.status === 'pending' && <button className={`${btnPrimary} self-start sm:self-auto`} onClick={() => setReviewing(leave)}>Review</button>}
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {tab === 'away' && (
        <Card title="Who's Away" icon={Plane}>
          {team.loading ? <Empty>Loading…</Empty> : away.length === 0 ? <Empty>No one in the team has leave coming up.</Empty> : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {away.map(leave => (
                <li key={leave.id} className="flex items-center justify-between gap-3 rounded-lg border border-[#e5e5e5] px-4 py-3 dark:border-white/10">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#292929] dark:text-white">{leave.userName || members.find(m => m.uid === leave.userId)?.name}</p>
                    <p className="text-[13px] text-[#656565] dark:text-gray-400">{leave.type} · {range(leave)}</p>
                  </div>
                  <Pill label={leave.startDate <= today ? 'Away now' : 'Upcoming'} tone={leave.startDate <= today ? 'blue' : 'gray'} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      )}

      {requesting && (
        <RequestDialog onClose={() => setRequesting(false)}
          onSubmit={async input => {
            await requestLeave(input, { uid, name: user?.displayName || user?.email || 'Team member', email: user?.email || '' });
            setRequesting(false);
            setTab('mine');
          }} />
      )}
      {reviewing && <ReviewDialog leave={reviewing} onClose={() => setReviewing(null)} />}
    </div>
  );
}

function RequestDialog({ onClose, onSubmit }: { onClose: () => void; onSubmit: (input: { type: string; startDate: string; endDate: string; reason: string }) => Promise<void> }) {
  const [type, setType] = useState<string>(LEAVE_TYPES[0]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const days = leaveDays(startDate, endDate);
  const valid = days > 0 && reason.trim().length > 0;

  return (
    <Overlay title="Request Leave" onClose={onClose} footer={
      <>
        <button className={btnGhost} onClick={onClose} disabled={saving}>Cancel</button>
        <button className={btnPrimary} disabled={!valid || saving} onClick={async () => {
          setSaving(true);
          setError('');
          try { await onSubmit({ type, startDate, endDate, reason }); }
          catch (err) { setError(err instanceof Error ? err.message : 'The request could not be sent.'); setSaving(false); }
        }}>{saving ? 'Sending…' : 'Send request'}</button>
      </>
    }>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Leave type</span>
        <select className={field} value={type} onChange={e => setType(e.target.value)}>
          {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
        </select>
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">From</span>
          <input type="date" className={field} value={startDate} onChange={e => { setStartDate(e.target.value); if (!endDate || e.target.value > endDate) setEndDate(e.target.value); }} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">To</span>
          <input type="date" className={field} value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} />
        </label>
      </div>
      {startDate && endDate && <p className="text-[13px] text-[#656565] dark:text-gray-400">{days > 0 ? `${days} day${days === 1 ? '' : 's'} (calendar days, as AE Hub counts them)` : 'The end date is before the start date.'}</p>}
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Reason</span>
        <textarea className={`${field} min-h-[90px]`} value={reason} maxLength={1000} onChange={e => setReason(e.target.value)} />
      </label>
      <p className="text-[12px] text-[#8a8a8a]">Your department admin reviews it; it shows in AE Hub too.</p>
      {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
    </Overlay>
  );
}

function ReviewDialog({ leave, onClose }: { leave: WsLeave; onClose: () => void }) {
  const [comments, setComments] = useState('');
  const [saving, setSaving] = useState<'Approved' | 'Rejected' | null>(null);
  const [error, setError] = useState('');

  async function decide(status: 'Approved' | 'Rejected') {
    setSaving(status);
    setError('');
    try {
      await reviewLeave(leave.id, status, comments);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The request could not be updated.');
      setSaving(null);
    }
  }

  return (
    <Overlay title={`Review ${leave.userName || 'leave request'}`} onClose={onClose} footer={
      <>
        <button className="inline-flex items-center rounded-lg border border-red-200 px-4 py-2 text-[14px] font-semibold text-[#dc2626] hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:hover:bg-red-500/10"
          disabled={saving !== null} onClick={() => void decide('Rejected')}>{saving === 'Rejected' ? 'Rejecting…' : 'Reject'}</button>
        <button className="inline-flex items-center rounded-lg bg-[#16a34a] px-4 py-2 text-[14px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          disabled={saving !== null} onClick={() => void decide('Approved')}>{saving === 'Approved' ? 'Approving…' : 'Approve'}</button>
      </>
    }>
      <dl className="grid grid-cols-2 gap-3 text-[14px]">
        <div><dt className="text-[12px] text-[#8a8a8a]">Type</dt><dd className="text-[#292929] dark:text-gray-200">{leave.type}</dd></div>
        <div><dt className="text-[12px] text-[#8a8a8a]">Days</dt><dd className="text-[#292929] dark:text-gray-200">{leave.days}</dd></div>
        <div className="col-span-2"><dt className="text-[12px] text-[#8a8a8a]">Dates</dt><dd className="text-[#292929] dark:text-gray-200">{range(leave)}</dd></div>
        {leave.reason && <div className="col-span-2"><dt className="text-[12px] text-[#8a8a8a]">Reason</dt><dd className="text-[#292929] dark:text-gray-200">{leave.reason}</dd></div>}
      </dl>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Note to them (optional)</span>
        <textarea className={`${field} min-h-[70px]`} value={comments} maxLength={500} onChange={e => setComments(e.target.value)} />
      </label>
      <p className="text-[12px] text-[#8a8a8a]">Approving puts their open AE Hub tasks on hold for the leave, as AE Hub does.</p>
      {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
    </Overlay>
  );
}
