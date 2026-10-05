'use client';

import { useCallback, useEffect, useState } from 'react';
import { SkeletonLeaveRequests } from '@/app/components/ceo/Skeleton';

type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

interface LeaveReq {
  id: string;
  projectId: string;
  project: string;
  employeeName: string;
  employeeEmail?: string;
  department: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  status: LeaveStatus;
  reason?: string;
  appliedAt: string;
  reviewedAt?: string;
}

interface ProjectError {
  project: string;
  error: string;
}

export default function LeaveRequestsPage() {
  const [requests, setRequests] = useState<LeaveReq[]>([]);
  const [projectErrors, setProjectErrors] = useState<ProjectError[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');
  const [updatingIds, setUpdatingIds] = useState<string[]>([]);

  const loadRequests = useCallback(async () => {
    try {
      const response = await fetch('/api/ceo/leave-requests', { cache: 'no-store' });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = data && typeof data === 'object' && 'error' in data
          ? String(data.error)
          : `Unable to load leave requests (HTTP ${response.status}).`;
        throw new Error(message);
      }
      if (!data || typeof data !== 'object' || !('requests' in data)) {
        throw new Error('The leave requests API returned an invalid response.');
      }
      const payload = data as Record<string, unknown>;
      if (!Array.isArray(payload.requests) || !payload.requests.every(isLeaveReq)) {
        throw new Error('The leave requests API returned invalid request records.');
      }
      if (payload.projectErrors !== undefined &&
          (!Array.isArray(payload.projectErrors) || !payload.projectErrors.every(isProjectError))) {
        throw new Error('The leave requests API returned invalid project errors.');
      }
      setPageError('');
      setRequests(payload.requests);
      setProjectErrors((payload.projectErrors || []) as ProjectError[]);
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to load leave requests.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void Promise.resolve().then(loadRequests);
  }, [loadRequests]);

  async function updateStatus(request: LeaveReq, status: Exclude<LeaveStatus, 'Pending'>) {
    const requestKey = `${request.projectId}:${request.id}`;
    setUpdatingIds(current => [...current, requestKey]);
    setPageError('');
    try {
      const response = await fetch('/api/ceo/leave-requests', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId: request.projectId,
          requestId: request.id,
          status,
        }),
      });
      const data: unknown = await response.json();
      if (!response.ok) {
        const message = data && typeof data === 'object' && 'error' in data
          ? String(data.error)
          : `Unable to update leave request (HTTP ${response.status}).`;
        throw new Error(message);
      }
      setRequests(current => current.map(item =>
        item.id === request.id && item.projectId === request.projectId
          ? { ...item, status }
          : item,
      ));
    } catch (error) {
      setPageError(error instanceof Error ? error.message : 'Unable to update leave request.');
    } finally {
      setUpdatingIds(current => current.filter(id => id !== requestKey));
    }
  }

  const now = new Date();
  const stats = {
    pending: requests.filter(request => request.status === 'Pending').length,
    approvedMonth: requests.filter(request => {
      if (request.status !== 'Approved' || !request.reviewedAt) return false;
      const reviewedAt = new Date(request.reviewedAt);
      return reviewedAt.getFullYear() === now.getFullYear() && reviewedAt.getMonth() === now.getMonth();
    }).length,
    totalDays: requests.reduce((sum, request) => sum + request.days, 0),
  };

  if (loading) return <SkeletonLeaveRequests />;

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Leave Request Management</h1>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          Leave requests across configured projects
        </p>
      </div>

      {(pageError || projectErrors.length > 0) && (
        <div role="alert" className="mb-5 rounded-xl border border-red-200 bg-red-50 p-4 text-[13px] text-red-700 dark:border-red-900/50 dark:bg-red-950/30 dark:text-red-300">
          {pageError && <p>{pageError}</p>}
          {projectErrors.map(item => (
            <p key={item.project} className="mt-1">
              {item.project}: {item.error}
            </p>
          ))}
          {pageError && (
            <button onClick={() => { setLoading(true); void loadRequests(); }} className="mt-2 font-semibold underline">
              Try again
            </button>
          )}
        </div>
      )}

      <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { label: 'Pending Requests', value: stats.pending, iconBg: '#fef3c7', iconColor: '#d97706', icon: <ClipboardIcon /> },
          { label: 'Approved This Month', value: stats.approvedMonth, iconBg: '#dcfce7', iconColor: '#16a34a', icon: <CalCheckIcon /> },
          { label: 'Total Leave Days', value: stats.totalDays, iconBg: '#dbeafe', iconColor: '#2563eb', icon: <CalIcon /> },
        ].map(stat => (
          <div key={stat.label} className="flex items-center justify-between rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
            <div>
              <p className="text-[12px] text-gray-500 dark:text-gray-400">{stat.label}</p>
              <p className="mt-1 text-[28px] font-bold text-gray-800 dark:text-white">{stat.value}</p>
            </div>
            <div className="flex h-11 w-11 items-center justify-center rounded-full" style={{ backgroundColor: stat.iconBg, color: stat.iconColor }}>
              {stat.icon}
            </div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm dark:bg-[#1e1e1e]">
        <div className="border-b border-gray-100 px-5 py-4 dark:border-white/6">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Leave Requests</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100 dark:border-white/6">
                {['Project', 'Employee', 'Department', 'Type', 'Start Date', 'End Date', 'Days', 'Status', 'Actions'].map(heading => (
                  <th key={heading} className="px-5 py-3 text-left text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">{heading}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {requests.map(request => {
                const isUpdating = updatingIds.includes(`${request.projectId}:${request.id}`);
                return (
                  <tr key={`${request.projectId}:${request.id}`} className="border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-white/4 dark:hover:bg-white/3">
                    <td className="px-5 py-3.5 text-[13px] font-medium text-gray-700 dark:text-gray-200">{request.project}</td>
                    <td className="px-5 py-3.5 text-[13px] text-gray-700 dark:text-gray-200">
                      <div className="font-medium">{request.employeeName}</div>
                      {request.employeeEmail && <div className="text-[11px] text-gray-400">{request.employeeEmail}</div>}
                    </td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{request.department}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{request.type}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{formatDate(request.startDate)}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{formatDate(request.endDate)}</td>
                    <td className="px-5 py-3.5 text-[12px] text-gray-600 dark:text-gray-300">{request.days}</td>
                    <td className="px-5 py-3.5"><StatusBadge status={request.status} /></td>
                    <td className="px-5 py-3.5">
                      {request.status === 'Pending' && (
                        <div className="flex gap-3">
                          <button disabled={isUpdating} onClick={() => void updateStatus(request, 'Approved')} className="text-[12px] font-semibold text-green-600 hover:underline disabled:opacity-50">
                            Approve
                          </button>
                          <button disabled={isUpdating} onClick={() => void updateStatus(request, 'Rejected')} className="text-[12px] font-semibold text-red-500 hover:underline disabled:opacity-50">
                            Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
              {requests.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-5 py-10 text-center text-[13px] text-gray-500 dark:text-gray-400">
                    No leave requests were returned by the configured project endpoints.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string): string {
  if (!value) return '—';
  const date = new Date(/^\d{4}-\d{2}-\d{2}$/.test(value) ? `${value}T00:00:00` : value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString();
}

function isLeaveReq(value: unknown): value is LeaveReq {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.id === 'string' &&
    typeof record.projectId === 'string' &&
    typeof record.project === 'string' &&
    typeof record.employeeName === 'string' &&
    typeof record.department === 'string' &&
    typeof record.type === 'string' &&
    typeof record.startDate === 'string' &&
    typeof record.endDate === 'string' &&
    typeof record.days === 'number' &&
    (record.status === 'Pending' || record.status === 'Approved' || record.status === 'Rejected') &&
    typeof record.appliedAt === 'string';
}

function isProjectError(value: unknown): value is ProjectError {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return typeof record.project === 'string' && typeof record.error === 'string';
}

function StatusBadge({ status }: { status: LeaveStatus }) {
  const map = {
    Pending: { bg: '#fef3c7', text: '#92400e' },
    Approved: { bg: '#dcfce7', text: '#166534' },
    Rejected: { bg: '#fee2e2', text: '#dc2626' },
  };
  const color = map[status];
  return <span className="rounded-full px-3 py-1 text-[11px] font-semibold" style={{ backgroundColor: color.bg, color: color.text }}>{status}</span>;
}

function ClipboardIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="9" y="2" width="6" height="4" rx="1" /><path d="M8 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-2" /></svg>;
}

function CalCheckIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /><polyline points="9,16 11,18 15,14" /></svg>;
}

function CalIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><rect x="3" y="4" width="18" height="18" rx="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
}
