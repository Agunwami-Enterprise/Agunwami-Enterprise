'use client';

/**
 * IT support tickets, shared by the IT Support page (/ws/it-support) and
 * Settings → IT Support (where anyone raises and follows their own tickets).
 */

import { useCallback, useEffect, useState } from 'react';
import AeModal from '@/app/components/common/AeModal';
import type { SupportTicket, TicketPriority, TicketStatus } from '@/backend/modules/support/support.service';
import { Pill, btnGhost, btnPrimary, field } from './ui';

export type { SupportTicket, TicketPriority, TicketStatus };

export const CATEGORIES = ['Hardware', 'Software', 'Accounts & access', 'Network', 'Website', 'Other'];
export const PRIORITIES: TicketPriority[] = ['low', 'medium', 'high', 'urgent'];
export const STATUSES: TicketStatus[] = ['open', 'in-progress', 'waiting', 'resolved', 'closed'];

export const STATUS_LABEL: Record<TicketStatus, { label: string; tone: 'blue' | 'amber' | 'purple' | 'green' | 'gray' }> = {
  open: { label: 'Open', tone: 'blue' },
  'in-progress': { label: 'In progress', tone: 'amber' },
  waiting: { label: 'Waiting on requester', tone: 'purple' },
  resolved: { label: 'Resolved', tone: 'green' },
  closed: { label: 'Closed', tone: 'gray' },
};

export const PRIORITY_LABEL: Record<TicketPriority, { label: string; tone: 'gray' | 'blue' | 'amber' | 'red' }> = {
  low: { label: 'Low', tone: 'gray' },
  medium: { label: 'Medium', tone: 'blue' },
  high: { label: 'High', tone: 'amber' },
  urgent: { label: 'Urgent', tone: 'red' },
};

export const when = (iso: string) => (iso ? new Date(iso).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '');

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { cache: 'no-store', ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
  return body as T;
}

/** Tickets: every ticket (IT support) or only mine. */
export function useTickets(scope: 'all' | 'mine') {
  const [tickets, setTickets] = useState<SupportTicket[] | null>(null);
  const [error, setError] = useState('');
  const reload = useCallback(async () => {
    try {
      const data = await call<{ tickets: SupportTicket[] }>(`/api/ws/support-tickets${scope === 'mine' ? '?scope=mine' : ''}`);
      setTickets(data.tickets);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Tickets could not be loaded.');
      setTickets(current => current ?? []);
    }
  }, [scope]);
  useEffect(() => {
    const first = setTimeout(() => void reload(), 0);
    const every = setInterval(() => void reload(), 30_000);
    return () => { clearTimeout(first); clearInterval(every); };
  }, [reload]);
  const replace = (ticket: SupportTicket) => setTickets(list => (list ?? []).map(t => (t.id === ticket.id ? ticket : t)));
  const add = (ticket: SupportTicket) => setTickets(list => [ticket, ...(list ?? [])]);
  return { tickets, error, reload, replace, add };
}

export const createTicket = (input: { subject: string; description: string; category: string; priority: TicketPriority }) =>
  call<{ ticket: SupportTicket }>('/api/ws/support-tickets', { method: 'POST', body: JSON.stringify(input) }).then(r => r.ticket);
export const updateTicket = (id: string, patch: Record<string, unknown>) =>
  call<{ ticket: SupportTicket }>(`/api/ws/support-tickets/${encodeURIComponent(id)}`, { method: 'PATCH', body: JSON.stringify(patch) }).then(r => r.ticket);
export const replyToTicket = (id: string, body: string) =>
  call<{ ticket: SupportTicket }>(`/api/ws/support-tickets/${encodeURIComponent(id)}`, { method: 'POST', body: JSON.stringify({ body }) }).then(r => r.ticket);

function Overlay({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return <AeModal title={title} onClose={onClose} size="lg" bodyClassName="">{children}</AeModal>;
}

export function NewTicketDialog({ onClose, onCreated }: { onClose: () => void; onCreated: (ticket: SupportTicket) => void }) {
  const [subject, setSubject] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [priority, setPriority] = useState<TicketPriority>('medium');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      onCreated(await createTicket({ subject, description, category, priority }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The ticket could not be sent.');
      setSaving(false);
    }
  }

  return (
    <Overlay title="Raise an IT support ticket" onClose={onClose}>
      <form onSubmit={submit} className="space-y-3">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Subject</span>
          <input className={field} value={subject} maxLength={140} onChange={e => setSubject(e.target.value)} placeholder="e.g. Can't sign in to email" autoFocus />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>
              {CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Priority</span>
            <select className={field} value={priority} onChange={e => setPriority(e.target.value as TicketPriority)}>
              {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p].label}</option>)}
            </select>
          </label>
        </div>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">What&apos;s wrong?</span>
          <textarea className={`${field} min-h-[120px]`} value={description} maxLength={4000} onChange={e => setDescription(e.target.value)}
            placeholder="What happened, what you expected, and anything you've tried." />
        </label>
        {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" className={btnGhost} onClick={onClose}>Cancel</button>
          <button type="submit" className={btnPrimary} disabled={saving || !subject.trim() || !description.trim()}>{saving ? 'Sending…' : 'Send ticket'}</button>
        </div>
      </form>
    </Overlay>
  );
}

/**
 * A ticket's details and conversation. IT support (`team` given) can also
 * change its status, priority and assignee.
 */
export function TicketDialog({ ticket, team, onClose, onChange }: {
  ticket: SupportTicket;
  team?: Array<{ uid: string; name: string }>;
  onClose: () => void;
  onChange: (ticket: SupportTicket) => void;
}) {
  const [reply, setReply] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const isSupport = Boolean(team);

  async function run(action: () => Promise<SupportTicket>) {
    setBusy(true);
    setError('');
    try {
      onChange(await action());
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That could not be saved.');
      return false;
    } finally {
      setBusy(false);
    }
  }

  return (
    <Overlay title={`${ticket.reference} · ${ticket.subject}`} onClose={onClose}>
      <div className="flex flex-wrap gap-1.5">
        <Pill label={STATUS_LABEL[ticket.status].label} tone={STATUS_LABEL[ticket.status].tone} />
        <Pill label={`${PRIORITY_LABEL[ticket.priority].label} priority`} tone={PRIORITY_LABEL[ticket.priority].tone} />
        <Pill label={ticket.category} tone="gray" />
      </div>
      <p className="mt-2 text-[13px] text-[#656565] dark:text-gray-400">
        From {ticket.requesterName}{ticket.requesterDepartment ? ` (${ticket.requesterDepartment})` : ''} · {when(ticket.createdAt)}
        {ticket.assigneeName ? ` · Assigned to ${ticket.assigneeName}` : ' · Not assigned yet'}
      </p>

      {isSupport && (
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-3">
          <select className={field} value={ticket.status} disabled={busy} aria-label="Status"
            onChange={e => void run(() => updateTicket(ticket.id, { status: e.target.value }))}>
            {STATUSES.map(s => <option key={s} value={s}>{STATUS_LABEL[s].label}</option>)}
          </select>
          <select className={field} value={ticket.priority} disabled={busy} aria-label="Priority"
            onChange={e => void run(() => updateTicket(ticket.id, { priority: e.target.value }))}>
            {PRIORITIES.map(p => <option key={p} value={p}>{PRIORITY_LABEL[p].label}</option>)}
          </select>
          <select className={field} value={ticket.assigneeUid} disabled={busy} aria-label="Assignee"
            onChange={e => {
              const person = team?.find(m => m.uid === e.target.value);
              void run(() => updateTicket(ticket.id, { assigneeUid: e.target.value, assigneeName: person?.name ?? '' }));
            }}>
            <option value="">Unassigned</option>
            {team?.map(m => <option key={m.uid} value={m.uid}>{m.name}</option>)}
          </select>
        </div>
      )}

      <div className="mt-4 rounded-lg bg-[#f5f5f5] p-3 text-[14px] leading-6 whitespace-pre-wrap text-[#292929] dark:bg-white/5 dark:text-gray-200">{ticket.description}</div>

      <ul className="mt-4 space-y-3">
        {ticket.comments.map(comment => (
          <li key={comment.id} className={`rounded-lg p-3 text-[14px] ${comment.fromSupport ? 'bg-[#fef9e7] dark:bg-[#f5bd02]/10' : 'border border-[#e5e5e5] dark:border-white/10'}`}>
            <p className="mb-1 text-[12px] text-[#656565] dark:text-gray-400">
              <span className="font-semibold text-[#292929] dark:text-gray-200">{comment.authorName}</span>
              {comment.fromSupport ? ' · IT support' : ''} · {when(comment.at)}
            </p>
            <p className="whitespace-pre-wrap leading-6 text-[#292929] dark:text-gray-200">{comment.body}</p>
          </li>
        ))}
      </ul>

      {ticket.status !== 'closed' && (
        <form className="mt-4 space-y-2" onSubmit={async e => {
          e.preventDefault();
          if (await run(() => replyToTicket(ticket.id, reply))) setReply('');
        }}>
          <textarea className={`${field} min-h-[80px]`} value={reply} maxLength={4000} onChange={e => setReply(e.target.value)}
            placeholder={isSupport ? 'Reply to the requester' : ticket.status === 'resolved' ? 'Still a problem? Reply to reopen the ticket' : 'Add a reply'} aria-label="Reply" />
          <div className="flex justify-end"><button type="submit" className={btnPrimary} disabled={busy || !reply.trim()}>{busy ? 'Sending…' : 'Send reply'}</button></div>
        </form>
      )}
      {error && <p role="alert" className="mt-2 text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
    </Overlay>
  );
}
