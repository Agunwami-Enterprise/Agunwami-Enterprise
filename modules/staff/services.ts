// ─── Staff ────────────────────────────────────────────────────────────────────
// Staff accounts are the accounts people sign in with, in the workstation
// (AE Hub) Firebase project. Their AE department and access live in the
// enterprise project (Departments page); this module reads the accounts, AE
// Hub's departments (for new accounts) and AE Hub's staff requests.

import { collection, doc, getDocs, onSnapshot, orderBy, query, updateDoc, where } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { app, authDb } from '@/lib/workstation/firebase';

export interface StaffAccount {
  uid: string;
  name: string;
  email: string;
  photoURL: string;
  role: string;
  /** AE Hub department and position (AE's own live on the Departments page). */
  aehubDepartment: string;
  aehubPosition: string;
  aehubId: string | null;
  staffNumber: number | string | null;
  /** AE Hub account status: active, suspended or fired. */
  accountStatus: string;
  shiftStartTime: string;
  shiftEndTime: string;
}

const STAFF_ROLES = ['staff', 'admin', 'manager'];

function toAccount(uid: string, data: Record<string, unknown>): StaffAccount {
  const status = String(data.accountStatus || (data.isSuspended ? 'suspended' : data.isFired ? 'fired' : 'active')).toLowerCase();
  return {
    uid,
    name: String(data.displayName || data.fullName || data.name || data.email || 'Unnamed'),
    email: String(data.email || ''),
    photoURL: String(data.photoURL || ''),
    role: String(data.role || 'staff').toLowerCase(),
    aehubDepartment: String(data.department || ''),
    aehubPosition: String(data.departmentPosition || data.position || ''),
    aehubId: typeof data.aehubId === 'string' ? data.aehubId : null,
    staffNumber: typeof data.staffNumber === 'number' || typeof data.staffNumber === 'string' ? data.staffNumber : null,
    accountStatus: status,
    shiftStartTime: String(data.shiftStartTime || ''),
    shiftEndTime: String(data.shiftEndTime || ''),
  };
}

/** Live staff accounts (not deleted). */
export function subscribeStaffAccounts(
  cb: (accounts: StaffAccount[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(authDb, 'users'), where('role', 'in', STAFF_ROLES)),
    snap => cb(snap.docs
      .filter(d => d.data().isDeleted !== true)
      .map(d => toAccount(d.id, d.data()))
      .sort((a, b) => a.name.localeCompare(b.name))),
    error => {
      console.warn('[staff] Staff accounts snapshot error:', error);
      onError?.(error);
    },
  );
}

/** AE Hub's departments, for placing a new account in AE Hub. */
export async function loadAehubDepartments(): Promise<Array<{ id: string; name: string }>> {
  const snap = await getDocs(collection(authDb, 'departments'));
  return snap.docs
    .filter(d => d.id !== 'ceo')
    .map(d => ({ id: d.id, name: String(d.data().name || d.data().displayName || d.id) }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export interface NewStaffInput {
  name: string;
  email: string;
  aehubDepartment: string;
  position: string;
  shiftStartTime?: string;
  shiftEndTime?: string;
}

/**
 * Creates the person's account (one account for AE and AE Hub) with AE Hub's
 * createStaffUser function, which emails them their sign-in details.
 */
export async function createStaffAccount(input: NewStaffInput): Promise<{ uid: string; aehubId?: string }> {
  const call = httpsCallable<Record<string, unknown>, { success: boolean; uid: string; aehubId?: string }>(
    getFunctions(app, 'us-central1'), 'createStaffUser',
  );
  const { data } = await call({
    name: input.name.trim(),
    email: input.email.trim().toLowerCase(),
    department: input.aehubDepartment,
    departmentPosition: input.position.trim() || 'Staff',
    ...(input.shiftStartTime ? { shiftStartTime: input.shiftStartTime } : {}),
    ...(input.shiftEndTime ? { shiftEndTime: input.shiftEndTime } : {}),
  });
  if (!data?.success || !data.uid) throw new Error('The account could not be created.');
  return { uid: data.uid, aehubId: data.aehubId };
}

// ── Staff requests (AE Hub) ──────────────────────────────────────────────────

export interface StaffRequest {
  id: string;
  type: string;
  department: string;
  position: string;
  headcount: number;
  priority: string;
  justification: string;
  status: 'pending' | 'approved' | 'rejected';
  requestedByName: string;
  requestedByEmail: string;
  createdAt: string | null;
}

export function subscribeStaffRequests(
  cb: (requests: StaffRequest[]) => void,
  onError?: (error: Error) => void,
): () => void {
  return onSnapshot(
    query(collection(authDb, 'staffRequests'), orderBy('createdAt', 'desc')),
    snap => cb(snap.docs.map(d => {
      const data = d.data();
      const created = data.createdAt;
      const status = String(data.status || 'pending').toLowerCase();
      return {
        id: d.id,
        type: String(data.type || 'New hire'),
        department: String(data.departmentName || data.department || ''),
        position: String(data.position || ''),
        headcount: Number(data.headcount) || 1,
        priority: String(data.priority || 'Normal'),
        justification: String(data.justification || ''),
        status: status === 'approved' || status === 'rejected' ? status : 'pending',
        requestedByName: String(data.requestedByName || ''),
        requestedByEmail: String(data.requestedByEmail || ''),
        createdAt: typeof created === 'string' ? created
          : created && typeof created.toDate === 'function' ? created.toDate().toISOString() : null,
      } satisfies StaffRequest;
    })),
    error => {
      console.warn('[staff] Staff requests snapshot error:', error);
      onError?.(error);
    },
  );
}

export async function reviewStaffRequest(id: string, status: 'approved' | 'rejected', reviewerUid: string): Promise<void> {
  await updateDoc(doc(authDb, 'staffRequests', id), { status, reviewedBy: reviewerUid, reviewedAt: new Date().toISOString() });
}
