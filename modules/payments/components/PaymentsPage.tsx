'use client';

import { useState } from 'react';
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

  /* new payment form */
  const [nAmount,  setNAmount]  = useState('');
  const [nType,    setNType]    = useState('Incoming');
  const [nProject, setNProject] = useState('Agunwami Enterprise');
  const [nDesc,    setNDesc]    = useState('');

  /** Approves or rejects one of the enterprise's own pending payments. */
  async function review(payment: Payment, decision: 'APPROVED' | 'REJECTED') {
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
      const status: PayStatus = decision === 'APPROVED' ? 'Approved' : 'Rejected';
      feed.setData(prev => prev && {
        ...prev,
        items: prev.items.map(p => p.key === payment.key ? { ...p, status, reviewable: false, approvedBy: 'Agunwami CEO' } : p),
      });
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
          <button className="flex items-center gap-1.5 rounded-xl border border-gray-200 bg-white px-4 py-2.5 text-[12px] font-medium text-gray-600 shadow-sm hover:bg-gray-50 dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-300">
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
                  <div className="flex items-start justify-between">
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
                    <div className="flex flex-shrink-0 items-center gap-2 pl-4">
                      <button onClick={() => setDetail(p)} className="text-gray-400 hover:text-gray-600"><EyeIcon /></button>
                      {p.reviewable && (
                        <>
                          <button disabled={reviewing === p.key} onClick={() => void review(p, 'APPROVED')} className="text-[12px] font-semibold text-green-600 hover:underline disabled:opacity-50">Approve</button>
                          <button disabled={reviewing === p.key} onClick={() => void review(p, 'REJECTED')} className="text-[12px] font-semibold text-red-500 hover:underline disabled:opacity-50">Reject</button>
                        </>
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
        <Overlay onClose={() => setDetail(null)}>
          <div className="w-[420px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Payment Details</h2>
              <button onClick={() => setDetail(null)} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="flex flex-col gap-3">
              {[
                { label:'Project',      value: detail.source.name, plain: true },
                { label:'Amount',       value: fmt(detail),        plain: true },
                { label:'Type',         value: detail.type,        badge: TYPE_STYLE[detail.type]   },
                { label:'Status',       value: detail.status,      badge: STATUS_STYLE[detail.status] },
                { label:'Category',     value: detail.category,    plain: true },
                { label:'Description',  value: detail.description, plain: true },
                { label:'Reference',    value: detail.reference ?? '-', plain: true },
                { label:'Requested by', value: detail.requestedBy, plain: true },
                { label:'Approved by',  value: detail.approvedBy,  plain: true },
                { label:'Created',      value: formatDate(detail.created, true),   plain: true },
                { label:'Processed',    value: formatDate(detail.processed, true), plain: true },
              ].map(f => (
                <div key={f.label} className="flex items-center justify-between border-b border-gray-50 pb-2.5 last:border-0 dark:border-white/4">
                  <span className="text-[12px] text-gray-500 dark:text-gray-400">{f.label}:</span>
                  {f.badge ? (
                    <span className="rounded-sm px-2.5 py-1 text-[11px] font-bold" style={{ backgroundColor: f.badge.bg, color: f.badge.text }}>{f.value.toUpperCase()}</span>
                  ) : (
                    <span className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">{f.value}</span>
                  )}
                </div>
              ))}
            </div>
            <button onClick={() => setDetail(null)}
              className="mt-5 w-full rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-400 dark:hover:bg-white/4">
              Close
            </button>
          </div>
        </Overlay>
      )}

      {/* New Payment modal */}
      {showNew && (
        <Overlay onClose={() => setShowNew(false)}>
          <div className="w-[400px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Create New Payment</h2>
              <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><XIcon /></button>
            </div>
            <div className="flex flex-col gap-3">
              <input value={nAmount} onChange={e => setNAmount(e.target.value)} placeholder="Amount"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              <select value={nType} onChange={e => setNType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                {['Incoming','Outgoing','Payroll','Refund'].map(o => <option key={o}>{o}</option>)}
              </select>
              <select value={nProject} onChange={e => setNProject(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                {(sources.length ? sources.map(source => source.name) : ['Agunwami Enterprise']).map(o => <option key={o}>{o}</option>)}
              </select>
              <textarea value={nDesc} onChange={e => setNDesc(e.target.value)} placeholder="Description" rows={3}
                className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
            </div>
            <div className="mt-4 flex gap-2">
              <button onClick={() => setShowNew(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 dark:border-white/8 dark:text-gray-400">Cancel</button>
              <button onClick={() => setShowNew(false)}
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
                Create Payment
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="ae-fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="ae-pop-in" onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PlusIcon()      { return <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>; }
function XIcon()         { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>; }
function SearchSmIcon()  { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>; }
function EyeIcon()       { return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>; }
function ExportIcon()    { return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"><polyline points="4,6 8,2 12,6"/><line x1="8" y1="2" x2="8" y2="11"/><rect x="2" y="12" width="12" height="2" rx="1"/></svg>; }
function ArrowUpIcon()   { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5,12 12,5 19,12"/></svg>; }
function ArrowDownIcon() { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><polyline points="19,12 12,19 5,12"/></svg>; }
function DollarIcon()    { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>; }
function ClockIcon()     { return <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 15"/></svg>; }
