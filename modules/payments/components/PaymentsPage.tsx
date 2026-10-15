'use client';

/**
 * CEO → Payment Management: the enterprise's own payments plus every
 * project's reported payments, labelled by project. The CEO records new
 * enterprise payments, approves or rejects pending ones, marks approved ones
 * as paid and exports the filtered list as CSV. Project payments are reviewed
 * in their project.
 */

import { useState } from 'react';
import { toast } from 'react-toastify';
import AeModal from '@/app/components/common/AeModal';
import { SkeletonPayments } from '@/app/components/ceo/Skeleton';
import {
  ALL_SOURCES, FeedError, FeedNotices, SourceBadge, SourceFilter,
  formatDate, formatMoney, formatTotals, sourcesOf, useFeed,
} from '@/app/components/ceo/feed';
import type {
  PaymentFeedItem as Payment, PaymentFeedStatus as PayStatus, PaymentFeedType as PayType, PaymentsFeed,
} from '@/backend/modules/payments/payments.feed';


const TYPE_STYLE: Record<PayType, { bg: string; text: string }> = {
  Incoming: { bg:'#dcfce7', text:'#166534' },
  Outgoing: { bg:'#fee2e2', text:'#dc2626' },
  Payroll:  { bg:'#dbeafe', text:'#1e40af' },
  Refund:   { bg:'#ede9fe', text:'#6d28d9' },
};
const STATUS_STYLE: Record<PayStatus, { bg: string; text: string }> = {
  Completed: { bg:'#dcfce7', text:'#166534' },
  Pending:   { bg:'#fef3c7', text:'#92400e' },
  Approved:  { bg:'#dbeafe', text:'#1e40af' },
  Rejected:  { bg:'#fee2e2', text:'#dc2626' },
  Failed:    { bg:'#fee2e2', text:'#dc2626' },
};

export default function PaymentsPage() {
  const [typeF,    setTypeF]    = useState('All Types');
  const [statusF,  setStatusF]  = useState('All Status');
  const [search,   setSearch]   = useState('');
  const [detail,   setDetail]   = useState<Payment | null>(null);
  const [showNew,  setShowNew]  = useState(false);
  const [sourceF,  setSourceF]  = useState(ALL_SOURCES);
  const [reviewError, setReviewError] = useState('');
  const [reviewing, setReviewing] = useState<string | null>(null);
  const feed = useFeed<PaymentsFeed>('/api/ceo/payments');
  const payments = feed.data?.items ?? [];
  const sources = sourcesOf(payments);

  /** Approves or rejects one of the enterprise's pending payments, or marks an approved one as paid. */
  async function review(payment: Payment, decision: 'APPROVED' | 'REJECTED' | 'COMPLETED') {
    setReviewing(payment.key);
    setReviewError('');
    try {
      const res = await fetch('/api/ceo/payments', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: payment.id, status: decision }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status}).`);
      const now = new Date().toISOString();
      feed.setData(prev => prev && {
        ...prev,
        items: prev.items.map(p => p.key !== payment.key ? p : decision === 'COMPLETED'
          ? { ...p, status: 'Completed', payable: false, processed: now }
          : { ...p, status: decision === 'APPROVED' ? 'Approved' : 'Rejected', reviewable: false, payable: decision === 'APPROVED', approvedBy: 'Agunwami CEO' }),
      });
      if (detail?.key === payment.key) setDetail(null);
    } catch (err) {
      setReviewError(`Could not update "${payment.description}": ${err instanceof Error ? err.message : 'unknown error'}`);
    } finally {
      setReviewing(null);
    }
  }

  const term = search.trim().toLowerCase();
  const inSource = payments.filter(p => sourceF === ALL_SOURCES || p.source.id === sourceF);
  const filtered = inSource.filter(p => {
    if (typeF   !== 'All Types'  && p.type   !== typeF   as PayType)   return false;
    if (statusF !== 'All Status' && p.status !== statusF as PayStatus) return false;
    if (term && ![p.description, p.requestedBy, p.source.name, p.reference ?? ''].some(v => v.toLowerCase().includes(term))) return false;
    return true;
  });

  // Totals follow the project filter and are kept per currency.
  const settled  = inSource.filter(p => p.status === 'Completed' || p.status === 'Approved');
  const incoming = settled.filter(p => p.type === 'Incoming');
  const outgoing = settled.filter(p => p.type !== 'Incoming');
  const balance  = [...incoming, ...outgoing.map(p => ({ ...p, amount: -p.amount }))];
  const pending  = inSource.filter(p => p.status === 'Pending').length;

  function exportCsv() {
    const header = ['Project', 'Type', 'Status', 'Amount', 'Currency', 'Category', 'Description', 'From / to', 'Approved by', 'Reference', 'Created', 'Processed'];
    const rows = filtered.map(p => [
      p.source.name, p.type, p.status, p.amount.toFixed(2), p.currency, p.category, p.description,
      p.requestedBy === '-' ? '' : p.requestedBy, p.approvedBy === '-' ? '' : p.approvedBy, p.reference ?? '', p.created ?? '', p.processed ?? '',
    ]);
    // Quote every cell; a leading =, +, - or @ is prefixed so spreadsheets don't run it as a formula.
    const cell = (value: string) => `"${(/^[=+\-@]/.test(value) ? `'${value}` : value).replace(/"/g, '""')}"`;
    const csv = [header, ...rows].map(row => row.map(cell).join(',')).join('\r\n');
    const url = URL.createObjectURL(new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 0);
  }

  const fmt = (p: { amount: number; currency: string }) => formatMoney(p.amount, p.currency);

  if (feed.loading) return <SkeletonPayments />;
  if (!feed.data) return <FeedError message={feed.error} onRetry={() => void feed.reload()} />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Payment Management</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Payments across the enterprise and every project, labelled by project</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
            <PlusIcon /> New Payment
          </button>
        </div>

        {/* Stat cards */}
        <div className="ae-stagger mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label:'Total Incoming', value:formatTotals(incoming), iconBg:'#dcfce7', iconColor:'#16a34a', icon:<ArrowUpIcon />   },
            { label:'Total Outgoing', value:formatTotals(outgoing), iconBg:'#fee2e2', iconColor:'#dc2626', icon:<ArrowDownIcon /> },
            { label:'Net Balance',    value:formatTotals(balance),  iconBg:'#ede9fe', iconColor:'#7c3aed', icon:<DollarIcon /> },
            { label:'Pending',        value:String(pending),          iconBg:'#fef3c7', iconColor:'#d97706', icon:<ClockIcon />   },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
              <div>
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-1 text-[16px] font-bold text-gray-800 dark:text-white">{s.value}</p>
              </div>
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full" style={{ backgroundColor:s.iconBg, color:s.iconColor }}>{s.icon}</div>
            </div>
          ))}
        </div>

        <FeedNotices projects={feed.data.projects} enterpriseError={feed.data.enterpriseError} section="payments" />
        {reviewError && (
          <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{reviewError}</p>
        )}

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/8 dark:bg-[#1e1e1e]">
            <SearchSmIcon />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Payments..."
              className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500" />
          </div>
          <SourceFilter sources={sources} value={sourceF} onChange={setSourceF} />
          <select value={typeF} onChange={e => setTypeF(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200">
            {['All Types','Incoming','Outgoing','Payroll','Refund'].map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200">
            {['All Status','Pending','Approved','Completed','Rejected','Failed'].map(o => <option key={o}>{o}</option>)}
          </select>
          <button onClick={exportCsv} disabled={filtered.length === 0} title={filtered.length === 0 ? 'Nothing to export' : `Export ${filtered.length} payment${filtered.length === 1 ? '' : 's'} as CSV`}
            className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-medium text-gray-600 shadow-sm hover:bg-gray-50 disabled:opacity-50 dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-300">
            <ExportIcon /> Export
          </button>
        </div>

        {/* Payment list */}
        <div className="rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
          <div className="border-b border-gray-100 px-5 py-3.5 dark:border-white/6">
            <p className="text-[13px] font-bold text-gray-800 dark:text-white">Payments ({filtered.length})</p>
          </div>
          <div className="ae-stagger flex flex-col divide-y divide-gray-50 dark:divide-white/4">
            {filtered.length === 0 && (
              <p className="px-5 py-10 text-center text-[13px] text-gray-400">No payments match these filters.</p>
            )}
            {filtered.map(p => {
              const ts = TYPE_STYLE[p.type];
              const ss = STATUS_STYLE[p.status];
              return (
                <div key={p.key} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-[16px] font-bold text-gray-800 dark:text-white">{fmt(p)}</span>
                        <SourceBadge source={p.source} />
                        <span className="rounded-sm px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor:ts.bg, color:ts.text }}>{p.type.toUpperCase()}</span>
                        <span className="rounded-sm px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor:ss.bg, color:ss.text }}>{p.status.toUpperCase()}</span>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{p.description}</p>
                      <p className="text-[11px] text-gray-400">
                        {p.category}
                        {p.requestedBy !== '-' && <> &nbsp;·&nbsp; {p.type === 'Incoming' ? 'From' : 'Requested by'}: {p.requestedBy}</>}
                        {p.approvedBy !== '-' && <> &nbsp;·&nbsp; Approved by: {p.approvedBy}</>}
                        &nbsp;·&nbsp; Created: {formatDate(p.created)}
                        {p.processed && <> &nbsp;·&nbsp; Processed: {formatDate(p.processed)}</>}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-3 sm:pl-4">
                      <button onClick={() => setDetail(p)} className="text-gray-400 hover:text-gray-600" aria-label="View payment details" title="Details"><EyeIcon /></button>
                      {p.reviewable && (
                        <>
                          <button disabled={reviewing === p.key} onClick={() => void review(p, 'APPROVED')} className="text-[12px] font-semibold text-green-600 hover:underline disabled:opacity-50">Approve</button>
                          <button disabled={reviewing === p.key} onClick={() => void review(p, 'REJECTED')} className="text-[12px] font-semibold text-red-500 hover:underline disabled:opacity-50">Reject</button>
                        </>
                      )}
                      {p.payable && (
                        <button disabled={reviewing === p.key} onClick={() => void review(p, 'COMPLETED')} className="text-[12px] font-semibold text-[#b38a00] hover:underline disabled:opacity-50 dark:text-[#f5bd02]">Mark paid</button>
                      )}
                      {!p.reviewable && p.status === 'Pending' && p.source.kind === 'project' && (
                        <span className="text-[11px] text-gray-400">Reviewed in {p.source.name}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Payment Detail modal */}
      {detail && (
        <AeModal size="sm" title="Payment Details" description={detail.source.name} onClose={() => setDetail(null)} bodyClassName=""
          footer={detail.reviewable ? (
            <>
              <button disabled={reviewing === detail.key} onClick={() => void review(detail, 'REJECTED')}
                className="rounded-lg border border-red-200 px-4 py-2 text-[13px] font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50 dark:border-red-500/30 dark:text-red-400 dark:hover:bg-red-500/10">Reject</button>
              <button disabled={reviewing === detail.key} onClick={() => void review(detail, 'APPROVED')}
                className="rounded-lg bg-green-600 px-4 py-2 text-[13px] font-semibold text-white hover:opacity-90 disabled:opacity-50">Approve</button>
            </>
          ) : detail.payable ? (
            <button disabled={reviewing === detail.key} onClick={() => void review(detail, 'COMPLETED')}
              className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50" style={{ backgroundColor:'#f5bd02' }}>Mark as paid</button>
          ) : undefined}>
            <div className="flex flex-col gap-3">
              {[
                { label:'Project',      value: detail.source.name, plain: true },
                { label:'Amount',       value: fmt(detail),        plain: true },
                { label:'Type',         value: detail.type,        badge: TYPE_STYLE[detail.type]   },
                { label:'Status',       value: detail.status,      badge: STATUS_STYLE[detail.status] },
                { label:'Category',     value: detail.category,    plain: true },
                { label:'Description',  value: detail.description, plain: true },
                { label:'Reference',    value: detail.reference ?? '-', plain: true },
                { label: detail.type === 'Incoming' ? 'From' : 'To / requested by', value: detail.requestedBy, plain: true },
                { label:'Approved by',  value: detail.approvedBy,  plain: true },
                { label:'Created',      value: formatDate(detail.created, true),   plain: true },
                { label:'Processed',    value: formatDate(detail.processed, true), plain: true },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between gap-4 border-b border-gray-50 pb-2.5 last:border-0 dark:border-white/4">
                  <span className="flex-shrink-0 text-[12px] text-gray-500 dark:text-gray-400">{f.label}:</span>
                  {f.badge ? (
                    <span className="rounded-sm px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: f.badge.bg, color: f.badge.text }}>{f.value.toUpperCase()}</span>
                  ) : (
                    <span className="min-w-0 break-words text-right text-[12px] font-semibold text-gray-700 dark:text-gray-200">{f.value}</span>
                  )}
                </div>
              ))}
            </div>
        </AeModal>
      )}

      {/* New Payment modal */}
      {showNew && (
        <NewPaymentDialog
          onClose={() => setShowNew(false)}
          onCreated={async () => {
            setShowNew(false);
            toast.success('Payment recorded.');
            await feed.reload();
          }}
        />
      )}
    </>
  );
}

const NEW_TYPES = [
  { value: 'incoming', label: 'Incoming' },
  { value: 'outgoing', label: 'Outgoing' },
  { value: 'payroll',  label: 'Payroll' },
  { value: 'refund',   label: 'Refund' },
] as const;
const CURRENCIES = ['NGN', 'USD', 'GBP', 'EUR'];
const CATEGORY_HINT: Record<(typeof NEW_TYPES)[number]['value'], string> = {
  incoming: 'Revenue', outgoing: 'Operations', payroll: 'Payroll', refund: 'Refund',
};
const fieldClass = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 focus:border-[#f5bd02] dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500';

/** Records a payment in the enterprise's books. */
function NewPaymentDialog({ onClose, onCreated }: { onClose: () => void; onCreated: () => Promise<void> }) {
  const [type, setType] = useState<(typeof NEW_TYPES)[number]['value']>('incoming');
  const [amount, setAmount] = useState('');
  const [currency, setCurrency] = useState('NGN');
  const [party, setParty] = useState('');
  const [category, setCategory] = useState('');
  const [date, setDate] = useState(() => new Date().toLocaleDateString('en-CA'));
  const [paid, setPaid] = useState(true);
  const [description, setDescription] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const value = Number(amount.replace(/,/g, ''));
  const valid = Number.isFinite(value) && value > 0 && party.trim() && description.trim();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid || saving) return;
    setSaving(true);
    setError('');
    try {
      const res = await fetch('/api/ceo/payments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, amount: value, currency, party, category, date, description, status: paid ? 'COMPLETED' : 'PENDING' }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status}).`);
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The payment could not be saved.');
      setSaving(false);
    }
  }

  const label = 'mb-1 block text-[11px] font-semibold text-gray-600 dark:text-gray-300';
  return (
    <AeModal title="Record a Payment" description="Saved in Agunwami Enterprise’s books. Project payments come from each project." onClose={onClose} dismissible={!saving} bodyClassName=""
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={saving}
            className="rounded-lg border border-gray-200 px-4 py-2 text-[13px] font-medium text-gray-600 dark:border-white/8 dark:text-gray-400">Cancel</button>
          <button type="submit" form="record-payment" disabled={!valid || saving}
            className="rounded-lg px-4 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50" style={{ backgroundColor:'#f5bd02' }}>
            {saving ? 'Saving…' : 'Record Payment'}
          </button>
        </>
      )}>
      <form id="record-payment" onSubmit={submit}>

        <div className="flex flex-col gap-3">
          <div role="radiogroup" aria-label="Payment type" className="grid grid-cols-4 rounded-lg bg-gray-100 p-0.5 dark:bg-white/8">
            {NEW_TYPES.map(t => (
              <button key={t.value} type="button" role="radio" aria-checked={type === t.value} onClick={() => setType(t.value)}
                className={`rounded-md py-1.5 text-[12px] font-semibold transition-colors ${type === t.value ? 'bg-white text-gray-800 shadow-sm dark:bg-[#2a2a2a] dark:text-white' : 'text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200'}`}>
                {t.label}
              </button>
            ))}
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={label} htmlFor="pay-amount">Amount</label>
              <input id="pay-amount" inputMode="decimal" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0.00" className={fieldClass} />
            </div>
            <div className="w-24">
              <label className={label} htmlFor="pay-currency">Currency</label>
              <select id="pay-currency" value={currency} onChange={e => setCurrency(e.target.value)} className={fieldClass}>
                {CURRENCIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className={label} htmlFor="pay-party">{type === 'incoming' ? 'From' : type === 'payroll' ? 'Paid to (staff member)' : 'Paid to'}</label>
            <input id="pay-party" value={party} onChange={e => setParty(e.target.value)} maxLength={120} className={fieldClass}
              placeholder={type === 'incoming' ? 'Client or payer' : 'Person or company'} />
          </div>

          <div className="flex gap-2">
            <div className="flex-1">
              <label className={label} htmlFor="pay-category">Category</label>
              <input id="pay-category" value={category} onChange={e => setCategory(e.target.value)} maxLength={60} className={fieldClass} placeholder={CATEGORY_HINT[type]} />
            </div>
            <div className="w-36">
              <label className={label} htmlFor="pay-date">Date</label>
              <input id="pay-date" type="date" value={date} onChange={e => setDate(e.target.value)} className={fieldClass} />
            </div>
          </div>

          <div>
            <label className={label} htmlFor="pay-desc">Description</label>
            <textarea id="pay-desc" value={description} onChange={e => setDescription(e.target.value)} maxLength={300} rows={3} className={`${fieldClass} resize-none`}
              placeholder="What the payment is for" />
          </div>

          <label className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={paid} onChange={e => setPaid(e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
            <span>
              {type === 'incoming' ? 'Already received' : 'Already paid'}
              <span className="block text-[11px] text-gray-400">{paid ? 'Recorded as completed.' : 'Recorded as pending, to approve and mark paid later.'}</span>
            </span>
          </label>
        </div>

        {error && <p role="alert" className="mt-3 text-[12px] text-red-600 dark:text-red-400">{error}</p>}
      </form>
    </AeModal>
  );
}

function PlusIcon()      { return <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>; }
function SearchSmIcon()  { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>; }
function EyeIcon()       { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function ExportIcon()    { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="4,6 8,2 12,6"/><line x1="8" y1="2" x2="8" y2="11"/><rect x="2" y="12" width="12" height="2" rx="1"/></svg>; }
function ArrowUpIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>; }
function ArrowDownIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>; }
function DollarIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function ClockIcon()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>; }
