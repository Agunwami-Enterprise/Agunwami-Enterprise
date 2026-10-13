'use client';

/**
 * Department workstation → IT Support (/ws/it-support): every ticket other
 * departments raised from Settings → IT Support. The team assigns tickets,
 * changes status and priority, and replies; the requester follows along in
 * their Settings.
 */

import { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Inbox, LifeBuoy, Search, UserX } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { useDepartmentTeam } from '../data';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, btnPrimary, field } from './ui';
import {
  NewTicketDialog, PRIORITY_LABEL, STATUSES, STATUS_LABEL, TicketDialog, useTickets, when,
  type SupportTicket, type TicketStatus,
} from './support';

type View = 'active' | 'unassigned' | 'mine' | 'done' | 'all';

export default function ItSupport() {
  const { tickets, error, replace, add } = useTickets('all');
  const { members } = useDepartmentTeam();
  const [view, setView] = useState<View>('active');
  const [search, setSearch] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const myUid = useAuth().user?.uid ?? '';
  const [now, setNow] = useState(0);
  useEffect(() => {
    const first = setTimeout(() => setNow(Date.now()), 0);
    const every = setInterval(() => setNow(Date.now()), 60_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, []);

  const list = tickets ?? [];
  const isDone = (t: SupportTicket) => t.status === 'resolved' || t.status === 'closed';
  const active = list.filter(t => !isDone(t));
  const counts = {
    open: active.length,
    unassigned: active.filter(t => !t.assigneeUid).length,
    urgent: active.filter(t => t.priority === 'urgent' || t.priority === 'high').length,
    resolvedWeek: list.filter(t => t.resolvedAt && now - new Date(t.resolvedAt).getTime() < 7 * 86_400_000).length,
  };

  const term = search.trim().toLowerCase();
  const shown = list.filter(t => {
    if (view === 'active' && isDone(t)) return false;
    if (view === 'unassigned' && (isDone(t) || t.assigneeUid)) return false;
    if (view === 'mine' && (isDone(t) || !t.assigneeUid || t.assigneeUid !== myUid)) return false;
    if (view === 'done' && !isDone(t)) return false;
    if (term && ![t.subject, t.reference, t.requesterName, t.requesterDepartment, t.category].some(v => v.toLowerCase().includes(term))) return false;
    return true;
  }).sort((a, b) => PRIORITY_ORDER[b.priority] - PRIORITY_ORDER[a.priority] || b.createdAt.localeCompare(a.createdAt));

  const open = list.find(t => t.id === openId) ?? null;
  const byStatus = (status: TicketStatus) => list.filter(t => t.status === status).length;

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="IT Support" subtitle="Tickets from every department, raised in Settings → IT Support"
        actions={<button className={btnPrimary} onClick={() => setCreating(true)}>+ New ticket</button>} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Open Tickets" icon={Inbox} iconClass="text-[#2563eb]" value={tickets === null ? '…' : String(counts.open)} sub="Not resolved yet" />
        <StatTile label="Unassigned" icon={UserX} iconClass="text-[#f59e0b]" value={tickets === null ? '…' : String(counts.unassigned)} sub="Waiting for someone to pick up" />
        <StatTile label="High Priority" icon={AlertTriangle} iconClass="text-[#ef4444]" value={tickets === null ? '…' : String(counts.urgent)} sub="High or urgent, still open" />
        <StatTile label="Resolved (7 days)" icon={CheckCircle2} iconClass="text-[#16a34a]" value={tickets === null ? '…' : String(counts.resolvedWeek)} sub="Resolved or closed this week" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card title="Tickets" icon={LifeBuoy} iconClass="text-[#2563eb]" action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative block sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden />
            <input className={`${field} pl-9`} placeholder="Search tickets" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search tickets" />
          </label>
          <select className={`${field} sm:w-44`} value={view} onChange={e => setView(e.target.value as View)} aria-label="Show">
            <option value="active">Active</option>
            <option value="unassigned">Unassigned</option>
            <option value="mine">Assigned to me</option>
            <option value="done">Resolved & closed</option>
            <option value="all">All tickets</option>
          </select>
        </div>
      }>
        <p className="mb-3 flex flex-wrap gap-x-4 gap-y-1 text-[12px] text-[#8a8a8a]">
          {STATUSES.map(s => <span key={s}>{STATUS_LABEL[s].label}: {byStatus(s)}</span>)}
        </p>
        {tickets === null ? <Empty>Loading…</Empty> : shown.length === 0 ? (
          <Empty>{list.length === 0 ? 'No tickets yet. People raise them from Settings → IT Support.' : 'No tickets match.'}</Empty>
        ) : (
          <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
            {shown.map(ticket => (
              <li key={ticket.id}>
                <button onClick={() => setOpenId(ticket.id)} className="flex w-full flex-col gap-1 py-3 text-left hover:bg-black/[0.02] sm:flex-row sm:items-center sm:justify-between dark:hover:bg-white/[0.03]">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-[14px] font-semibold text-[#292929] dark:text-white">
                      <span className="text-[#8a8a8a]">{ticket.reference}</span>
                      <span className="truncate">{ticket.subject}</span>
                    </p>
                    <p className="truncate text-[13px] text-[#656565] dark:text-gray-400">
                      {ticket.requesterName}{ticket.requesterDepartment ? ` · ${ticket.requesterDepartment}` : ''} · {ticket.category} · {when(ticket.createdAt)}
                      {ticket.comments.length ? ` · ${ticket.comments.length} repl${ticket.comments.length === 1 ? 'y' : 'ies'}` : ''}
                    </p>
                  </div>
                  <div className="flex shrink-0 flex-wrap items-center gap-1.5">
                    <Pill label={PRIORITY_LABEL[ticket.priority].label} tone={PRIORITY_LABEL[ticket.priority].tone} />
                    <Pill label={STATUS_LABEL[ticket.status].label} tone={STATUS_LABEL[ticket.status].tone} />
                    <span className="text-[12px] text-[#8a8a8a]">{ticket.assigneeName || 'Unassigned'}</span>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <TicketDialog ticket={open} team={members.map(m => ({ uid: m.uid, name: m.name }))} onClose={() => setOpenId(null)} onChange={replace} />
      )}
      {creating && <NewTicketDialog onClose={() => setCreating(false)} onCreated={ticket => { add(ticket); setCreating(false); setOpenId(ticket.id); }} />}
    </div>
  );
}

const PRIORITY_ORDER = { low: 0, medium: 1, high: 2, urgent: 3 } as const;
