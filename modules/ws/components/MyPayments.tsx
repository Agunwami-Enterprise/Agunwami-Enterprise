'use client';

/**
 * Department workstation → My Payment (/ws/payments): your pay history from
 * AE Hub's salary disbursements (monthly salary, sprint stipends, bonuses),
 * live, with totals and a CSV export. Payments are made by finance in AE Hub.
 */

import { useEffect, useState } from 'react';
import { collection, onSnapshot, query, where } from 'firebase/firestore';
import { Banknote, CalendarClock, Download, Hourglass, Wallet } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { authDb } from '@/lib/workstation/firebase';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, btnGhost, downloadCsv, field } from './ui';
import { Overlay } from './task-board';

interface Disbursement {
  id: string; reference: string; type: string; amount: number; month: string; method: string;
  status: string; date: Date | null; bankName: string; accountNumber: string; notes: string; requestedBy: string;
}

function parseDate(d: Record<string, unknown>): Date | null {
  const created = d.createdAt as { toDate?: () => Date } | undefined;
  if (typeof created?.toDate === 'function') return created.toDate();
  if (typeof d.date === 'string') {
    const parsed = new Date(d.date);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function toDisbursement(id: string, d: Record<string, unknown>): Disbursement {
  return {
    id, reference: String(d.reference ?? id), type: String(d.type ?? 'Payment'), amount: Number(d.amount ?? 0) || 0,
    month: String(d.month ?? ''), method: String(d.method ?? ''), status: String(d.status ?? 'Pending'), date: parseDate(d),
    bankName: String(d.bankName ?? ''), accountNumber: String(d.accountNumber ?? ''), notes: String(d.notes ?? ''), requestedBy: String(d.requestedBy ?? ''),
  };
}

const naira = (n: number) => new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(n);
const masked = (acct: string) => (acct.length > 4 ? `•••• ${acct.slice(-4)}` : acct);
const METHOD: Record<string, string> = { bank_transfer: 'Bank transfer', direct_deposit: 'Direct deposit', card: 'Card' };
const TONE: Record<string, 'green' | 'amber' | 'blue' | 'red'> = { Completed: 'green', Pending: 'amber', Processing: 'blue', Failed: 'red' };

export default function MyPayments() {
  const { user } = useAuth();
  const uid = user?.uid ?? '';
  const [items, setItems] = useState<Disbursement[] | null>(null);
  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [open, setOpen] = useState<Disbursement | null>(null);
  const [year, setYear] = useState(0);

  useEffect(() => {
    const first = setTimeout(() => setYear(new Date().getFullYear()), 0);
    return () => clearTimeout(first);
  }, []);
  useEffect(() => {
    if (!uid) return;
    return onSnapshot(query(collection(authDb, 'salary_disbursements'), where('staffId', '==', uid)),
      snap => { setItems(snap.docs.map(d => toDisbursement(d.id, d.data())).sort((a, b) => (b.date?.getTime() ?? 0) - (a.date?.getTime() ?? 0))); setError(''); },
      () => { setItems([]); setError('Your payments could not be loaded.'); });
  }, [uid]);

  const list = items ?? [];
  const paid = list.filter(p => p.status === 'Completed');
  const paidThisYear = paid.filter(p => p.date?.getFullYear() === year).reduce((n, p) => n + p.amount, 0);
  const pending = list.filter(p => p.status === 'Pending' || p.status === 'Processing');
  const last = paid[0] ?? null;
  const shown = list.filter(p => !status || p.status === status);

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="My Payment" subtitle="Your salary, stipends and bonuses"
        actions={<button className={btnGhost} disabled={shown.length === 0} onClick={() => downloadCsv('my-payments.csv',
          ['Reference', 'Type', 'Period', 'Amount (NGN)', 'Status', 'Date', 'Method'],
          shown.map(p => [p.reference, p.type, p.month, p.amount, p.status, p.date ? p.date.toLocaleDateString('en-CA') : '', METHOD[p.method] ?? p.method]))}>
          <Download className="h-4 w-4" aria-hidden /> Export
        </button>} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label={`Paid in ${year || 'this year'}`} icon={Wallet} iconClass="text-[#16a34a]" value={items === null ? '…' : naira(paidThisYear)} sub={`${paid.filter(p => p.date?.getFullYear() === year).length} payments`} />
        <StatTile label="Last Payment" icon={Banknote} iconClass="text-[#2563eb]" value={last ? naira(last.amount) : '—'} sub={last ? `${last.type}${last.date ? `, ${last.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}` : ''}` : 'No payments yet'} />
        <StatTile label="Pending" icon={Hourglass} iconClass="text-[#f59e0b]" value={items === null ? '…' : naira(pending.reduce((n, p) => n + p.amount, 0))} sub={`${pending.length} waiting to be paid`} />
        <StatTile label="All Payments" icon={CalendarClock} iconClass="text-[#7c3aed]" value={items === null ? '…' : String(list.length)} sub="Since you joined" />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Card title="Payment History" icon={Banknote} action={
        <select className={`${field} w-40`} value={status} onChange={e => setStatus(e.target.value)} aria-label="Status">
          <option value="">All statuses</option>
          {['Completed', 'Pending', 'Processing', 'Failed'].map(s => <option key={s}>{s}</option>)}
        </select>
      }>
        {items === null ? <Empty>Loading…</Empty> : shown.length === 0 ? <Empty>{list.length === 0 ? 'No payments recorded for you yet.' : 'No payments match.'}</Empty> : (
          <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
            {shown.map(p => (
              <li key={p.id}>
                <button onClick={() => setOpen(p)} className="flex w-full flex-col gap-1 py-3 text-left sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[15px] font-semibold text-[#292929] dark:text-white">{p.type}{p.month ? ` · ${p.month}` : ''}</p>
                    <p className="text-[12px] text-[#656565] dark:text-gray-400">{p.reference}{p.date ? ` · ${p.date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-[16px] font-semibold text-[#292929] dark:text-white">{naira(p.amount)}</span>
                    <Pill label={p.status} tone={TONE[p.status] ?? 'gray'} />
                  </div>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {open && (
        <Overlay title={`${open.type}${open.month ? ` · ${open.month}` : ''}`} onClose={() => setOpen(null)}>
          <dl className="grid grid-cols-2 gap-3 text-[14px]">
            {[
              ['Amount', naira(open.amount)], ['Status', open.status], ['Reference', open.reference],
              ['Date', open.date ? open.date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'],
              ['Method', METHOD[open.method] ?? (open.method || '—')], ['Account', open.bankName ? `${open.bankName} ${masked(open.accountNumber)}` : '—'],
            ].map(([k, v]) => (
              <div key={k}><dt className="text-[12px] text-[#8a8a8a]">{k}</dt><dd className="text-[#292929] dark:text-gray-200">{v}</dd></div>
            ))}
          </dl>
          {open.notes && <p className="text-[13px] text-[#525252] dark:text-gray-300">{open.notes}</p>}
          <p className="text-[12px] text-[#8a8a8a]">Questions about a payment? Contact finance or raise a ticket in Settings → IT Support.</p>
        </Overlay>
      )}
    </div>
  );
}
