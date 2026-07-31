'use client';

import { useEffect, useState } from 'react';
import { subscribePayments } from '@/modules/payments/services';
import { SkeletonPayments } from '@/app/components/ceo/Skeleton';

type PayType   = 'Incoming' | 'Outgoing' | 'Payroll' | 'Refund';
type PayStatus = 'Pending' | 'Approved' | 'Completed' | 'Rejected' | 'Failed';

interface Payment {
  id: string; amount: number; type: PayType; status: PayStatus;
  description: string; requestedBy: string; approvedBy: string;
  created: string; processed: string;
}


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

const PROJECTS = ['Project 1','Project 2','Project 3','Project 4'];

export default function PaymentsPage() {
  const [typeF,    setTypeF]    = useState('All Types');
  const [statusF,  setStatusF]  = useState('All Status');
  const [search,   setSearch]   = useState('');
  const [detail,   setDetail]   = useState<Payment | null>(null);
  const [showNew,  setShowNew]  = useState(false);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => subscribePayments((data) => { setPayments(data as Payment[]); setLoading(false); }), []);

  /* new payment form */
  const [nAmount,  setNAmount]  = useState('');
  const [nType,    setNType]    = useState('Incoming');
  const [nProject, setNProject] = useState('Project 1');
  const [nDesc,    setNDesc]    = useState('');

  function approve(id: string) { setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Approved' as PayStatus } : p)); }
  function reject(id: string)  { setPayments(prev => prev.map(p => p.id === id ? { ...p, status: 'Rejected' as PayStatus } : p)); }

  const filtered = payments.filter(p => {
    if (typeF   !== 'All Types'  && p.type   !== typeF   as PayType)   return false;
    if (statusF !== 'All Status' && p.status !== statusF as PayStatus) return false;
    if (search && !p.description.toLowerCase().includes(search.toLowerCase()) && !p.requestedBy.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const totalIn  = payments.filter(p => p.type === 'Incoming' || p.type === 'Payroll').reduce((s,p) => s + p.amount, 0);
  const totalOut = payments.filter(p => p.type === 'Outgoing').reduce((s,p) => s + p.amount, 0);
  const pending  = payments.filter(p => p.status === 'Pending').length;

  function fmt(n: number) { return '$' + n.toLocaleString('en-US', { minimumFractionDigits:2 }); }

  if (loading) return <SkeletonPayments />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Payment Management</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Track and manage all financial transactions</p>
          </div>
          <button onClick={() => setShowNew(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90" style={{ backgroundColor:'#f5bd02' }}>
            <PlusIcon /> New Payment
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-2 gap-4 lg:grid-cols-4">
          {[
            { label:'Total Incoming', value:fmt(totalIn),  iconBg:'#dcfce7', iconColor:'#16a34a', icon:<ArrowUpIcon />   },
            { label:'Total Outgoing', value:fmt(totalOut), iconBg:'#fee2e2', iconColor:'#dc2626', icon:<ArrowDownIcon /> },
            { label:'Net Balance',    value:fmt(totalIn - totalOut), iconBg:'#ede9fe', iconColor:'#7c3aed', icon:<DollarIcon /> },
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

        {/* Filters */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-2.5 shadow-sm dark:border-white/8 dark:bg-[#1e1e1e]">
            <SearchSmIcon />
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search Payments..."
              className="min-w-0 flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500" />
          </div>
          <select value={typeF} onChange={e => setTypeF(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200">
            {['All Types','Incoming','Outgoing','Payroll','Refund'].map(o => <option key={o}>{o}</option>)}
          </select>
          <select value={statusF} onChange={e => setStatusF(e.target.value)}
            className="rounded-xl border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 shadow-sm outline-none dark:border-white/8 dark:bg-[#1e1e1e] dark:text-gray-200">
            {['All Status','Pending','Approved','Completed','Rejected'].map(o => <option key={o}>{o}</option>)}
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
          <div className="flex flex-col divide-y divide-gray-50 dark:divide-white/4">
            {filtered.map(p => {
              const ts = TYPE_STYLE[p.type];
              const ss = STATUS_STYLE[p.status];
              return (
                <div key={p.id} className="px-5 py-4 hover:bg-gray-50 dark:hover:bg-white/3">
                  <div className="flex items-start justify-between">
                    <div className="flex flex-col gap-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[16px] font-bold text-gray-800 dark:text-white">{fmt(p.amount)}</span>
                        <span className="rounded-sm px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor:ts.bg, color:ts.text }}>{p.type.toUpperCase()}</span>
                        <span className="rounded-sm px-2 py-0.5 text-[10px] font-bold" style={{ backgroundColor:ss.bg, color:ss.text }}>{p.status.toUpperCase()}</span>
                      </div>
                      <p className="text-[12px] text-gray-500 dark:text-gray-400">{p.description}</p>
                      <p className="text-[11px] text-gray-400">
                        Requested by: {p.requestedBy}
                        {p.approvedBy !== '-' && <> &nbsp;·&nbsp; Approved by: {p.approvedBy}</>}
                        &nbsp;·&nbsp; Created: {p.created}
                        {p.processed !== '-' && <> &nbsp;·&nbsp; Processed: {p.processed}</>}
                      </p>
                    </div>
                    <div className="flex flex-shrink-0 items-center gap-2 pl-4">
                      <button onClick={() => setDetail(p)} className="text-gray-400 hover:text-gray-600"><EyeIcon /></button>
                      {p.status === 'Pending' && (
                        <>
                          <button onClick={() => approve(p.id)} className="text-[12px] font-semibold text-green-600 hover:underline">Approve</button>
                          <button onClick={() => reject(p.id)}  className="text-[12px] font-semibold text-red-500 hover:underline">Reject</button>
                        </>
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
                { label:'Amount',       value: fmt(detail.amount), plain: true },
                { label:'Type',         value: detail.type,        badge: TYPE_STYLE[detail.type]   },
                { label:'Status',       value: detail.status,      badge: STATUS_STYLE[detail.status] },
                { label:'Description',  value: detail.description, plain: true },
                { label:'Requested by', value: detail.requestedBy, plain: true },
                { label:'Approved by',  value: detail.approvedBy,  plain: true },
                { label:'Created',      value: detail.created,     plain: true },
                { label:'Processed',    value: detail.processed,   plain: true },
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
              <input value={nAmount} onChange={e => setNAmount(e.target.value)} placeholder="Amount ($)"
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              <select value={nType} onChange={e => setNType(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                {['Incoming','Outgoing','Payroll','Refund'].map(o => <option key={o}>{o}</option>)}
              </select>
              <select value={nProject} onChange={e => setNProject(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                {PROJECTS.map(o => <option key={o}>{o}</option>)}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
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
