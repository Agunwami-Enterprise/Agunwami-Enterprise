'use client';

// ─── Leave requests (department workstation) ─────────────────────────────────
// AE Hub's leaveRequests, read live, in AE Hub's own shape: the request form
// writes what AE Hub's leave form writes. Approving or rejecting goes through
// /api/ws/leave-requests, which uses the same AE Hub endpoint as the CEO's
// leave page (so tasks are put on hold and people are notified there).

import { useEffect, useState } from 'react';
import { addDoc, collection, doc, onSnapshot, query, serverTimestamp, updateDoc, where } from 'firebase/firestore';
import { authDb } from '@/lib/workstation/firebase';

export const LEAVE_TYPES = ['Annual', 'Sick', 'Personal', 'Maternity', 'Paternity'] as const;
export type LeaveStatus = 'pending' | 'approved' | 'rejected' | 'cancelled';

export interface WsLeave {
  id: string;
  userId: string;
  userName: string;
  type: string;
  startDate: string;
  endDate: string;
  days: number;
  reason: string;
  status: LeaveStatus;
  reviewerName: string;
  reviewNote: string;
  createdAt: Date | null;
}

function toLeave(id: string, data: Record<string, unknown>): WsLeave {
  const status = String(data.status ?? 'pending').toLowerCase();
  const created = data.createdAt as { toDate?: () => Date } | undefined;
  return {
    id,
    userId: String(data.userId ?? ''),
    userName: String(data.userName ?? data.employeeName ?? ''),
    type: String(data.leaveType ?? data.type ?? 'Leave'),
    startDate: String(data.startDate ?? '').slice(0, 10),
    endDate: String(data.endDate ?? '').slice(0, 10),
    days: Number(data.days ?? data.daysCount ?? 0) || 0,
    reason: String(data.reason ?? ''),
    status: (['pending', 'approved', 'rejected', 'cancelled'].includes(status) ? status : 'pending') as LeaveStatus,
    reviewerName: String(data.reviewerName ?? ''),
    reviewNote: String(data.reviewNote ?? data.reviewNotes ?? ''),
    createdAt: typeof created?.toDate === 'function' ? created.toDate() : null,
  };
}

const byNewest = (a: WsLeave, b: WsLeave) => (b.createdAt?.getTime() ?? 0) - (a.createdAt?.getTime() ?? 0) || b.startDate.localeCompare(a.startDate);

/** Live leave requests for these people (up to 30 per query, batched). */
export function useLeaveFor(uids: string[]): { requests: WsLeave[]; loading: boolean; error: string } {
  const key = [...new Set(uids)].sort().join(',');
  const [state, setState] = useState<{ key: string; byBatch: WsLeave[][]; error: string } | null>(null);

  useEffect(() => {
    const ids = key ? key.split(',') : [];
    if (ids.length === 0) return;
    const batches: string[][] = [];
    for (let i = 0; i < ids.length; i += 30) batches.push(ids.slice(i, i + 30));
    const results: WsLeave[][] = batches.map(() => []);
    const unsubscribes = batches.map((batch, index) => onSnapshot(
      query(collection(authDb, 'leaveRequests'), where('userId', 'in', batch)),
      snap => {
        results[index] = snap.docs.map(d => toLeave(d.id, d.data()));
        setState({ key, byBatch: [...results], error: '' });
      },
      err => {
        console.warn('[ws] leaveRequests snapshot error:', err);
        setState({ key, byBatch: [...results], error: 'Leave requests could not be loaded.' });
      },
    ));
    return () => unsubscribes.forEach(u => u());
  }, [key]);

  if (!key) return { requests: [], loading: false, error: '' };
  if (!state || state.key !== key) return { requests: [], loading: true, error: '' };
  return { requests: state.byBatch.flat().sort(byNewest), loading: false, error: state.error };
}

/** Inclusive calendar days, as AE Hub counts them. */
export function leaveDays(start: string, end: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) return 0;
  const days = Math.round((Date.parse(`${end}T12:00:00`) - Date.parse(`${start}T12:00:00`)) / 86_400_000) + 1;
  return days > 0 ? days : 0;
}

export async function requestLeave(input: { type: string; startDate: string; endDate: string; reason: string }, me: { uid: string; name: string; email: string }): Promise<void> {
  const initials = me.name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || 'AE';
  await addDoc(collection(authDb, 'leaveRequests'), {
    userId: me.uid,
    userName: me.name,
    userEmail: me.email,
    userRole: 'staff',
    initials,
    leaveType: input.type,
    startDate: input.startDate,
    endDate: input.endDate,
    days: leaveDays(input.startDate, input.endDate),
    reason: input.reason.trim(),
    status: 'pending',
    submittedDate: `Submitted ${new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`,
    createdAt: serverTimestamp(),
  });
}

export async function cancelLeave(id: string): Promise<void> {
  await updateDoc(doc(authDb, 'leaveRequests', id), { status: 'cancelled', updatedAt: serverTimestamp() });
}

export async function reviewLeave(requestId: string, status: 'Approved' | 'Rejected', comments: string): Promise<void> {
  const res = await fetch('/api/ws/leave-requests', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ requestId, status, comments }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error || `Request failed (${res.status})`);
}
