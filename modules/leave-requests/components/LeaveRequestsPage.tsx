'use client';

import { useEffect, useState } from 'react';
import { subscribeLeaveRequests } from '@/modules/leave-requests/services';
import { SkeletonLeaveRequests } from '@/app/components/ceo/Skeleton';

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

interface LeaveReq {
  id: string; employee: string; type: string;
  startDate: string; endDate: string; days: number; status: LeaveStatus;
}


const LEAVE_TYPES = ['Vacation','Sick Leave','Personal','Emergency','Maternity/Paternity'];

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveReq[]>([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => subscribeLeaveRequests((data) => { setRequests(data as LeaveReq[]); setLoading(false); }), []);
  const [showModal, setShowModal] = useState(false);
  const [leaveType,  setLeaveType]  = useState('Vacation');
  const [startDate,  setStartDate]  = useState('');
  const [endDate,    setEndDate]    = useState('');
  const [reason,     setReason]     = useState('');

  function approve(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Approved' } : r));
  }
  function reject(id: string) {
    setRequests(prev => prev.map(r => r.id === id ? { ...r, status: 'Rejected' } : r));
  }

  const stats = {
    pending:       requests.filter(r => r.status === 'Pending').length,
    approvedMonth: requests.filter(r => r.status === 'Approved').length + 12,
    totalDays:     requests.reduce((s, r) => s + r.days, 0) + 37,
  };

  if (loading) return <SkeletonLeaveRequests />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* Header */}
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Leave Request Management</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Manage employee leave requests</p>
          </div>
          <button
            onClick={() => setShowModal(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90"
            style={{ backgroundColor: '#f5bd02' }}
          >
            <PlusIcon /> Request Leave
          </button>
        </div>

        {/* Stat cards */}
        <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label:'Pending Requests',    value: stats.pending,       iconBg:'#fef3c7', iconColor:'#d97706', icon:<ClipboardIcon /> },
            { label:'Approved This Month', value: stats.approvedMonth, iconBg:'#dcfce7', iconColor:'#16a34a', icon:<CalCheckIcon />   },
            { label:'Total Leave Days',    value: stats.totalDays,     iconBg:'#dbeafe', iconColor:'#2563eb', icon:<CalIcon />        },
          ].map(s => (
            <div key={s.label} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
              <div>
                <p className="text-[12px] text-gray-500 dark:text-gray-400">{s.label}</p>
                <p className="mt-1 text-[28px] font-bold text-gray-800 dark:text-white">{s.value}</p>
              </div>
              <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: s.iconBg, color: s.iconColor }}>
                {s.icon}
              </div>
            </div>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
          <div className="border-b border-gray-100 px-5 py-4 dark:border-white/6">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Leave Request</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-100 dark:border-white/6">
                  {['Employee','Type','Start Date','End Date','Days','Status','Actions'].map(h => (
                    <th key={h} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {requests.map(r => (
                  <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-white/4 dark:hover:bg-white/3">
                    <td className="px-5 py-3.5 text-[13px] font-medium text-gray-700 dark:text-gray-200">{r.employee}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{r.type}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{r.startDate}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{r.endDate}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{r.days}</td>
                    <td className="px-5 py-3.5">
                      <StatusBadge status={r.status} />
                    </td>
                    <td className="px-5 py-3.5">
                      {r.status === 'Pending' && (
                        <div className="flex gap-3">
                          <button onClick={() => approve(r.id)} className="text-[12px] font-semibold text-green-600 hover:underline">Approve</button>
                          <button onClick={() => reject(r.id)}  className="text-[12px] font-semibold text-red-500 hover:underline">Reject</button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Request Leave modal */}
      {showModal && (
        <Overlay onClose={() => setShowModal(false)}>
          <div className="w-[460px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Request Leave</h2>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"><XIcon /></button>
            </div>
            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-[12px] font-medium text-gray-600 dark:text-gray-400">Leave Type</label>
                <select value={leaveType} onChange={e => setLeaveType(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200">
                  {LEAVE_TYPES.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div className="flex gap-3">
                <div className="flex-1">
                  <label className="mb-1 block text-[12px] font-medium text-gray-600 dark:text-gray-400">Start Date</label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8">
                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
                      className="flex-1 bg-transparent text-[12px] text-gray-700 outline-none dark:text-gray-200" />
                  </div>
                </div>
                <div className="flex-1">
                  <label className="mb-1 block text-[12px] font-medium text-gray-600 dark:text-gray-400">End Date</label>
                  <div className="flex items-center gap-2 rounded-lg border border-gray-200 px-3 py-2.5 dark:border-white/8">
                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
                      className="flex-1 bg-transparent text-[12px] text-gray-700 outline-none dark:text-gray-200" />
                  </div>
                </div>
              </div>
              <div>
                <label className="mb-1 block text-[12px] font-medium text-gray-600 dark:text-gray-400">Reason</label>
                <textarea value={reason} onChange={e => setReason(e.target.value)}
                  placeholder="Please provide a reason for leave request..."
                  rows={5}
                  className="w-full resize-none rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none placeholder-gray-400 dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200 dark:placeholder-gray-500" />
              </div>
            </div>
            <div className="mt-5 flex gap-2">
              <button onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-400">
                Cancel
              </button>
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                style={{ backgroundColor: '#f5bd02' }}>
                Submit Request
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map = {
    Pending:  { bg:'#fef3c7', text:'#92400e' },
    Approved: { bg:'#dcfce7', text:'#166534' },
    Rejected: { bg:'#fee2e2', text:'#dc2626' },
  };
  const s = map[status];
  return <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: s.bg, color: s.text }}>{status}</span>;
}

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

function PlusIcon() { return <svg width="12" height="12" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="7" y1="1" x2="7" y2="13"/><line x1="1" y1="7" x2="13" y2="7"/></svg>; }
function XIcon()    { return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>; }
function ClipboardIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="4" rx="1"/><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2"/></svg>; }
function CalCheckIcon() { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><polyline points="9,16 11,18 15,14"/></svg>; }
function CalIcon()      { return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>; }
