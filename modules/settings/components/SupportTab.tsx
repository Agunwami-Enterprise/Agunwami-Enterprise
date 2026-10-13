'use client';

/**
 * Settings → IT Support: raise a ticket with the IT team and follow your own
 * tickets (replies, status). The IT team works them on its IT Support page.
 */

import { useState } from 'react';
import { NewTicketDialog, PRIORITY_LABEL, STATUS_LABEL, TicketDialog, useTickets, when } from '@/modules/ws/components/support';
import { Pill } from '@/modules/ws/components/ui';

export default function SupportTab() {
  const { tickets, error, replace, add } = useTickets('mine');
  const [creating, setCreating] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const open = (tickets ?? []).find(t => t.id === openId) ?? null;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">IT Support</h2>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">Something not working? Raise a ticket with the IT team and follow it here.</p>
        </div>
        <button onClick={() => setCreating(true)} className="self-start rounded-lg bg-[#f5bd02] px-4 py-2 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90">+ New ticket</button>
      </div>
      {error && <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{error}</p>}
      {tickets === null ? (
        <div className="h-20 animate-pulse rounded-xl bg-gray-100 dark:bg-white/5" />
      ) : tickets.length === 0 ? (
        <p className="py-6 text-center text-[13px] text-gray-500 dark:text-gray-400">You haven&apos;t raised any tickets.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-white/6">
          {tickets.map(ticket => (
            <li key={ticket.id}>
              <button onClick={() => setOpenId(ticket.id)} className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-white"><span className="text-gray-400">{ticket.reference}</span> {ticket.subject}</p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {when(ticket.createdAt)} · {ticket.assigneeName ? `With ${ticket.assigneeName}` : 'Waiting for IT'}
                    {ticket.comments.length ? ` · ${ticket.comments.length} repl${ticket.comments.length === 1 ? 'y' : 'ies'}` : ''}
                  </p>
                </div>
                <div className="flex shrink-0 gap-1.5">
                  <Pill label={PRIORITY_LABEL[ticket.priority].label} tone={PRIORITY_LABEL[ticket.priority].tone} />
                  <Pill label={STATUS_LABEL[ticket.status].label} tone={STATUS_LABEL[ticket.status].tone} />
                </div>
              </button>
            </li>
          ))}
        </ul>
      )}
      {open && <TicketDialog ticket={open} onClose={() => setOpenId(null)} onChange={replace} />}
      {creating && <NewTicketDialog onClose={() => setCreating(false)} onCreated={ticket => { add(ticket); setCreating(false); setOpenId(ticket.id); }} />}
    </div>
  );
}
