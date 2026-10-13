'use client';

/**
 * Pieces shared by the Departments and Staff Management pages: the API helper,
 * form building blocks, the member dialogs (edit, transfer, suspend) and the
 * report of what happened in linked projects after a staff change.
 */

import { useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { authDb } from '@/lib/workstation/firebase';
import { BASE_PAGE_IDS, PAGE_GROUPS, WORKSTATION_PAGES } from '@/lib/workstation/pages';
import type { AeDepartment, AeDepartmentMember } from '@/backend/modules/departments/departments.types';

// ── API ──────────────────────────────────────────────────────────────────────

export async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

export interface Account { uid: string; name: string; email: string; position: string }

/** Staff accounts people sign in with (role staff/admin), for adding to departments. */
export async function loadAccounts(): Promise<Account[]> {
  const snap = await getDocs(collection(authDb, 'users'));
  return snap.docs
    .filter(d => {
      const data = d.data();
      const role = String(data.role ?? '').toLowerCase();
      const status = String(data.accountStatus ?? data.status ?? '').toLowerCase();
      return ['staff', 'admin', 'manager'].includes(role) && !['fired', 'deleted', 'inactive'].includes(status) && data.isDeleted !== true;
    })
    .map(d => ({
      uid: d.id,
      name: String(d.data().displayName || d.data().fullName || d.data().email || 'Unnamed'),
      email: String(d.data().email || ''),
      position: String(d.data().departmentPosition || ''),
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

// ── Building blocks ──────────────────────────────────────────────────────────

export const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-[#f5bd02] focus:ring-2 focus:ring-[#f5bd02]/30 dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
export const btnPrimary = 'rounded-lg bg-[#f5bd02] px-4 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50';
export const btnGhost = 'rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5';

export function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${on ? 'bg-[#f5bd02]' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
    </button>
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return (
    <div role="dialog" aria-modal="true" aria-label={title} className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onKeyDown={e => { if (e.key === 'Escape') onClose(); }}>
      <div className="ae-pop-in flex max-h-[90dvh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl dark:bg-[#1e1e1e]">
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4 dark:border-white/6">
          <h2 className="text-[15px] font-bold text-gray-900 dark:text-white">{title}</h2>
          <button onClick={onClose} aria-label="Close" className="rounded-lg px-2 py-1 text-gray-400 hover:bg-gray-100 dark:hover:bg-white/5">✕</button>
        </div>
        <div className="flex-1 space-y-4 overflow-y-auto p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-gray-100 px-5 py-3 dark:border-white/6">{footer}</div>
      </div>
    </div>
  );
}

export function PagePicker({ selected, onChange, limitTo }: {
  selected: string[];
  onChange: (pages: string[]) => void;
  /** Only offer these pages (e.g. a person's options within their department). */
  limitTo?: string[];
}) {
  const offered = WORKSTATION_PAGES.filter(page => !limitTo || limitTo.includes(page.id));
  return (
    <div className="space-y-3">
      {PAGE_GROUPS.map(group => {
        const pages = offered.filter(page => page.group === group);
        if (pages.length === 0) return null;
        return (
          <div key={group}>
            <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-400">{group}</p>
            <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {pages.map(page => {
                const base = BASE_PAGE_IDS.includes(page.id);
                const on = base || selected.includes(page.id);
                return (
                  <label key={page.id} className={`flex cursor-pointer items-start gap-2 rounded-lg border px-3 py-2 ${on ? 'border-[#f5bd02]/60 bg-[#fef3c7]/50 dark:bg-[#f5bd02]/10' : 'border-gray-200 dark:border-white/10'} ${base ? 'cursor-default opacity-80' : ''}`}>
                    <input type="checkbox" className="mt-0.5 accent-[#d4a627]" checked={on} disabled={base}
                      onChange={e => onChange(e.target.checked ? [...selected, page.id] : selected.filter(id => id !== page.id))} />
                    <span className="min-w-0">
                      <span className="block text-[13px] font-semibold text-gray-800 dark:text-gray-100">{page.label}</span>
                      <span className="block text-[11px] text-gray-500 dark:text-gray-400">{base ? 'Always included' : page.description}</span>
                    </span>
                  </label>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Linked projects ──────────────────────────────────────────────────────────

export interface SyncResult { projectId: string; projectName: string; action: string; ok: boolean; skipped?: string; error?: string }

/** Tells the CEO what happened in linked projects after an AE staff change. */
export function reportSync(sync: SyncResult[] | undefined) {
  for (const result of sync ?? []) {
    if (!result.ok) toast.warn(`Saved in AE, but ${result.projectName} wasn't updated: ${result.error}`, { autoClose: 9000 });
    else if (result.skipped) toast.info(`${result.projectName}: nothing to change (${result.skipped.replace(/-/g, ' ')}).`);
    else toast.success(`Also applied in ${result.projectName}.`);
  }
}

// ── Member dialogs ───────────────────────────────────────────────────────────

export function EditMemberDialog({ member, department, onClose, onSave }: {
  member: AeDepartmentMember;
  department: AeDepartment;
  onClose: () => void;
  onSave: (body: Record<string, unknown>) => Promise<void>;
}) {
  const [title, setTitle] = useState(member.title);
  const [shiftStart, setShiftStart] = useState(member.shiftStart);
  const [shiftEnd, setShiftEnd] = useState(member.shiftEnd);
  const [isAdmin, setIsAdmin] = useState(member.isDepartmentAdmin);
  const [limit, setLimit] = useState(member.pages.length > 0);
  const [pages, setPages] = useState<string[]>(member.pages.length ? member.pages : department.pages);
  const [saving, setSaving] = useState(false);

  return (
    <Modal title={`Edit ${member.name || member.email}`} onClose={onClose}
      footer={(
        <>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={saving} onClick={async () => {
            setSaving(true);
            await onSave({
              title, shiftStart, shiftEnd, isDepartmentAdmin: isAdmin,
              pages: limit ? pages.filter(id => !BASE_PAGE_IDS.includes(id)) : [],
            });
            setSaving(false);
          }}>{saving ? 'Saving…' : 'Save'}</button>
        </>
      )}>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-gray-500">Position</span>
        <input className={input} value={title} maxLength={80} placeholder="e.g. Lead Developer" onChange={e => setTitle(e.target.value)} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Shift starts</span>
          <input type="time" className={input} value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Shift ends</span>
          <input type="time" className={input} value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
        </label>
      </div>
      <div className="flex items-center justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
        <div>
          <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">Department admin</p>
          <p className="text-[11px] text-gray-500 dark:text-gray-400">Marks them as the department&apos;s lead</p>
        </div>
        <Switch on={isAdmin} onChange={setIsAdmin} label="Department admin" />
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <div>
            <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">Limit their pages</p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Off: every page {department.name} has</p>
          </div>
          <Switch on={limit} onChange={setLimit} label="Limit their pages" />
        </div>
        {limit && <PagePicker selected={pages} onChange={setPages} limitTo={department.pages} />}
      </div>
    </Modal>
  );
}

export function TransferDialog({ member, current, departments, onClose, onTransfer }: {
  member: AeDepartmentMember;
  current: AeDepartment;
  departments: AeDepartment[];
  onClose: () => void;
  onTransfer: (departmentId: string) => Promise<void>;
}) {
  const options = departments.filter(d => d.id !== current.id);
  const [target, setTarget] = useState(options[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={`Transfer ${member.name || member.email}`} onClose={onClose}
      footer={(
        <>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!target || saving} onClick={async () => { setSaving(true); await onTransfer(target); setSaving(false); }}>
            {saving ? 'Transferring…' : 'Transfer'}
          </button>
        </>
      )}>
      <p className="text-[12px] text-gray-500 dark:text-gray-400">
        From <span className="font-semibold">{current.name}</span>. Their page limits and department admin rights don&apos;t carry over.
      </p>
      <select className={input} value={target} onChange={e => setTarget(e.target.value)} aria-label="Transfer to">
        {options.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
      </select>
    </Modal>
  );
}

export function SuspendDialog({ member, onClose, onSuspend }: {
  member: AeDepartmentMember;
  onClose: () => void;
  onSuspend: (reason: string) => Promise<void>;
}) {
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={`Suspend ${member.name || member.email}`} onClose={onClose}
      footer={(
        <>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className="rounded-lg bg-red-600 px-4 py-2 text-[13px] font-semibold text-white hover:bg-red-700 disabled:opacity-50" disabled={saving}
            onClick={async () => { setSaving(true); await onSuspend(reason); setSaving(false); }}>
            {saving ? 'Suspending…' : 'Suspend access'}
          </button>
        </>
      )}>
      <p className="text-[12px] text-gray-500 dark:text-gray-400">
        They keep their account and stay in the department, but can&apos;t open the AE Workstation until you reactivate them.
      </p>
      <label className="block">
        <span className="mb-1 block text-[11px] font-semibold text-gray-500">Reason (shown to them)</span>
        <textarea className={input} rows={3} maxLength={240} value={reason} onChange={e => setReason(e.target.value)} />
      </label>
    </Modal>
  );
}
