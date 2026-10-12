'use client';

/**
 * CEO → Departments: create AE departments, choose which workstation pages
 * each one can open, and manage the people in them (add, transfer, change
 * position, shift and page access, make department admin, suspend, remove).
 * The CEO department is built in. Accounts are the same ones people already
 * sign in with; this only decides their AE department and access.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import { collection, getDocs } from 'firebase/firestore';
import { toast } from 'react-toastify';
import { authDb } from '@/lib/workstation/firebase';
import { BASE_PAGE_IDS, PAGE_GROUPS, WORKSTATION_PAGES, normalizePages } from '@/lib/workstation/pages';
import type { AeDepartment, AeDepartmentMember } from '@/backend/modules/departments/departments.types';

// ── API ──────────────────────────────────────────────────────────────────────

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) },
    cache: 'no-store',
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
  return body as T;
}

interface Account { uid: string; name: string; email: string; position: string }

/** Staff accounts people sign in with (role staff/admin), for adding to departments. */
async function loadAccounts(): Promise<Account[]> {
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

const input = 'w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-[13px] text-gray-800 outline-none focus:border-[#f5bd02] focus:ring-2 focus:ring-[#f5bd02]/30 dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
const btnPrimary = 'rounded-lg bg-[#f5bd02] px-4 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50';
const btnGhost = 'rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 dark:border-white/10 dark:text-gray-300 dark:hover:bg-white/5';

function Switch({ on, onChange, label }: { on: boolean; onChange: (on: boolean) => void; label: string }) {
  return (
    <button type="button" role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)}
      className={`relative h-[22px] w-[40px] shrink-0 rounded-full transition-colors ${on ? 'bg-[#f5bd02]' : 'bg-gray-300 dark:bg-gray-600'}`}>
      <span className={`absolute left-[3px] top-[3px] h-4 w-4 rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[18px]' : ''}`} />
    </button>
  );
}

function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
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

function PagePicker({ selected, onChange, limitTo }: {
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

// ── Page ─────────────────────────────────────────────────────────────────────

type Draft = { name: string; description: string; pages: string[]; active: boolean };
const EMPTY_DRAFT: Draft = { name: '', description: '', pages: [...BASE_PAGE_IDS], active: true };

type MemberDialog =
  | { kind: 'add' }
  | { kind: 'edit'; member: AeDepartmentMember }
  | { kind: 'transfer'; member: AeDepartmentMember }
  | { kind: 'suspend'; member: AeDepartmentMember };

export default function DepartmentsPage() {
  const [departments, setDepartments] = useState<AeDepartment[]>([]);
  const [members, setMembers] = useState<AeDepartmentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<string | 'new' | 'ceo' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<MemberDialog | null>(null);

  const reload = useCallback(async () => {
    try {
      const data = await api<{ departments: AeDepartment[]; members: AeDepartmentMember[] }>('/api/ceo/departments');
      setDepartments(data.departments);
      setMembers(data.members);
      setLoadError('');
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Departments could not be loaded.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const first = setTimeout(() => void reload(), 0);
    return () => clearTimeout(first);
  }, [reload]);

  const selected = departments.find(d => d.id === selectedId) ?? null;
  const deptMembers = useMemo(() => members.filter(m => m.departmentId === selectedId), [members, selectedId]);

  function select(id: string | 'new' | 'ceo') {
    setSelectedId(id);
    const dept = departments.find(d => d.id === id);
    setDraft(dept ? { name: dept.name, description: dept.description, pages: dept.pages, active: dept.active } : EMPTY_DRAFT);
  }

  async function saveDepartment() {
    setSaving(true);
    try {
      const body = JSON.stringify({ ...draft, pages: normalizePages(draft.pages) });
      if (selectedId === 'new') {
        const { department } = await api<{ department: AeDepartment }>('/api/ceo/departments', { method: 'POST', body });
        toast.success(`${department.name} created. Now add people to it.`);
        await reload();
        setSelectedId(department.id);
      } else if (selected) {
        await api(`/api/ceo/departments/${encodeURIComponent(selected.id)}`, { method: 'PATCH', body });
        toast.success('Department saved. Members see the change within a few seconds.');
        await reload();
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The department could not be saved.');
    } finally {
      setSaving(false);
    }
  }

  async function deleteDepartment() {
    if (!selected) return;
    if (!confirm(`Delete ${selected.name}? Its ${selected.memberCount} member(s) will lose their workstation until you add them to another department.`)) return;
    try {
      await api(`/api/ceo/departments/${encodeURIComponent(selected.id)}`, { method: 'DELETE' });
      toast.success(`${selected.name} deleted.`);
      setSelectedId(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The department could not be deleted.');
    }
  }

  async function memberAction(uid: string, body: Record<string, unknown>, success: string) {
    try {
      await api(`/api/ceo/departments/members/${encodeURIComponent(uid)}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast.success(success);
      setDialog(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The change could not be saved.');
    }
  }

  async function removeMember(member: AeDepartmentMember) {
    if (!confirm(`Remove ${member.name || member.email} from ${selected?.name}? They keep their account but lose their workstation until added to a department.`)) return;
    try {
      await api(`/api/ceo/departments/members/${encodeURIComponent(member.uid)}`, { method: 'DELETE' });
      toast.success('Removed from the department.');
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That person could not be removed.');
    }
  }

  const deptName = (id: string) => departments.find(d => d.id === id)?.name ?? id;

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5">
        <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Departments</h1>
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          Create AE departments, choose the workstation pages each one can open, and manage their people. People sign in with
          their existing account; the CEO department is built in.
        </p>
      </div>

      {loadError && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {loadError} <button className="font-semibold underline" onClick={() => void reload()}>Try again</button>
        </p>
      )}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_1fr]">
        {/* Department list */}
        <aside className="space-y-2">
          <button onClick={() => select('new')} className={`${btnPrimary} w-full`}>+ New department</button>
          <button onClick={() => select('ceo')}
            className={`w-full rounded-2xl p-4 text-left shadow-sm transition-colors ${selectedId === 'ceo' ? 'bg-[#fef3c7] dark:bg-[#f5bd02]/15' : 'bg-white hover:bg-gray-50 dark:bg-[#1e1e1e] dark:hover:bg-white/5'}`}>
            <p className="text-[13px] font-bold text-gray-800 dark:text-white">CEO <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:bg-white/8">Built in</span></p>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">Every page · the executive workstation</p>
          </button>
          {loading ? (
            <div className="h-20 animate-pulse rounded-2xl bg-white dark:bg-[#1e1e1e]" />
          ) : departments.length === 0 ? (
            <p className="rounded-2xl bg-white p-4 text-[12px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">No departments yet. Create the first one.</p>
          ) : departments.map(dept => (
            <button key={dept.id} onClick={() => select(dept.id)}
              className={`w-full rounded-2xl p-4 text-left shadow-sm transition-colors ${selectedId === dept.id ? 'bg-[#fef3c7] dark:bg-[#f5bd02]/15' : 'bg-white hover:bg-gray-50 dark:bg-[#1e1e1e] dark:hover:bg-white/5'}`}>
              <p className="flex items-center gap-2 text-[13px] font-bold text-gray-800 dark:text-white">
                {dept.name}
                {!dept.active && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:bg-white/8">Inactive</span>}
              </p>
              <p className="text-[11px] text-gray-500 dark:text-gray-400">{dept.pages.length} pages · {dept.memberCount} {dept.memberCount === 1 ? 'person' : 'people'}</p>
            </button>
          ))}
        </aside>

        {/* Editor */}
        <section className="min-w-0">
          {selectedId === null ? (
            <div className="rounded-2xl bg-white p-8 text-center text-[13px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">
              Choose a department, or create a new one.
            </div>
          ) : selectedId === 'ceo' ? (
            <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">CEO</h2>
              <p className="mt-1 text-[12px] text-gray-500 dark:text-gray-400">
                The CEO department is built in and can open every page, including the executive workstation, projects and
                this Departments page. It can&apos;t be edited or deleted.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
                <h2 className="mb-4 text-[15px] font-bold text-gray-800 dark:text-white">{selectedId === 'new' ? 'New department' : selected?.name}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-gray-500">Name *</span>
                    <input className={input} value={draft.name} maxLength={60} placeholder="e.g. Technical" onChange={e => setDraft({ ...draft, name: e.target.value })} />
                  </label>
                  <div className="flex items-end justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
                    <div>
                      <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">Active</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Inactive departments keep only the basic pages</p>
                    </div>
                    <Switch on={draft.active} onChange={active => setDraft({ ...draft, active })} label="Active" />
                  </div>
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold text-gray-500">Description</span>
                    <input className={input} value={draft.description} maxLength={240} placeholder="What this department does" onChange={e => setDraft({ ...draft, description: e.target.value })} />
                  </label>
                </div>

                <h3 className="mb-2 mt-5 text-[13px] font-bold text-gray-800 dark:text-white">Pages this department can open</h3>
                <PagePicker selected={draft.pages} onChange={pages => setDraft({ ...draft, pages })} />

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  {selected ? <button onClick={() => void deleteDepartment()} className="text-[12px] font-semibold text-red-600 hover:underline dark:text-red-400">Delete department</button> : <span />}
                  <button onClick={() => void saveDepartment()} disabled={saving || !draft.name.trim()} className={btnPrimary}>
                    {saving ? 'Saving…' : selectedId === 'new' ? 'Create department' : 'Save changes'}
                  </button>
                </div>
              </div>

              {selected && (
                <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="text-[14px] font-bold text-gray-800 dark:text-white">People</h3>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">{deptMembers.length} in {selected.name}</p>
                    </div>
                    <button onClick={() => setDialog({ kind: 'add' })} className={btnPrimary}>+ Add people</button>
                  </div>
                  {deptMembers.length === 0 ? (
                    <p className="py-4 text-center text-[12px] text-gray-500 dark:text-gray-400">No one is in this department yet.</p>
                  ) : (
                    <ul className="divide-y divide-gray-100 dark:divide-white/6">
                      {deptMembers.map(member => (
                        <li key={member.uid} className="flex flex-wrap items-center justify-between gap-3 py-3">
                          <div className="min-w-0">
                            <p className="flex flex-wrap items-center gap-1.5 text-[13px] font-semibold text-gray-800 dark:text-white">
                              {member.name || member.email}
                              {member.isDepartmentAdmin && <span className="rounded bg-blue-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Dept admin</span>}
                              {member.status === 'suspended' && <span className="rounded bg-red-50 px-1.5 py-0.5 text-[9px] font-bold uppercase text-red-700 dark:bg-red-500/15 dark:text-red-300">Suspended</span>}
                            </p>
                            <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                              {[member.title || 'No position set', member.shiftStart && member.shiftEnd ? `${member.shiftStart}–${member.shiftEnd}` : null,
                                member.pages.length ? `${member.pages.length} chosen pages` : 'All department pages'].filter(Boolean).join(' · ')}
                            </p>
                          </div>
                          <div className="flex flex-wrap gap-1.5">
                            <button className={btnGhost} onClick={() => setDialog({ kind: 'edit', member })}>Edit</button>
                            <button className={btnGhost} onClick={() => setDialog({ kind: 'transfer', member })} disabled={departments.length < 2}>Transfer</button>
                            {member.status === 'suspended' ? (
                              <button className={btnGhost} onClick={() => void memberAction(member.uid, { status: 'active' }, 'Access restored.')}>Reactivate</button>
                            ) : (
                              <button className={btnGhost} onClick={() => setDialog({ kind: 'suspend', member })}>Suspend</button>
                            )}
                            <button className={`${btnGhost} text-red-600 dark:text-red-400`} onClick={() => void removeMember(member)}>Remove</button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>
          )}
        </section>
      </div>

      {selected && dialog?.kind === 'add' && (
        <AddPeopleDialog department={selected} members={members} deptName={deptName} onClose={() => setDialog(null)}
          onAdded={async () => { setDialog(null); await reload(); }} />
      )}
      {selected && dialog?.kind === 'edit' && (
        <EditMemberDialog member={dialog.member} department={selected} onClose={() => setDialog(null)}
          onSave={body => memberAction(dialog.member.uid, body, 'Saved.')} />
      )}
      {selected && dialog?.kind === 'transfer' && (
        <TransferDialog member={dialog.member} current={selected} departments={departments} onClose={() => setDialog(null)}
          onTransfer={departmentId => memberAction(dialog.member.uid, { departmentId }, `Transferred to ${deptName(departmentId)}.`)} />
      )}
      {selected && dialog?.kind === 'suspend' && (
        <SuspendDialog member={dialog.member} onClose={() => setDialog(null)}
          onSuspend={reason => memberAction(dialog.member.uid, { status: 'suspended', suspendedReason: reason }, 'Access suspended.')} />
      )}
    </div>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

function AddPeopleDialog({ department, members, deptName, onClose, onAdded }: {
  department: AeDepartment;
  members: AeDepartmentMember[];
  deptName: (id: string) => string;
  onClose: () => void;
  onAdded: () => Promise<void>;
}) {
  const [accounts, setAccounts] = useState<Account[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const memberOf = useMemo(() => new Map(members.map(m => [m.uid, m.departmentId])), [members]);

  useEffect(() => {
    loadAccounts().then(setAccounts).catch(err => {
      console.warn('[departments] Accounts could not be loaded:', err);
      setError('Accounts could not be loaded.');
      setAccounts([]);
    });
  }, []);

  const term = search.trim().toLowerCase();
  const shown = (accounts ?? []).filter(a => memberOf.get(a.uid) !== department.id)
    .filter(a => !term || a.name.toLowerCase().includes(term) || a.email.toLowerCase().includes(term));

  async function add(account: Account) {
    const current = memberOf.get(account.uid);
    if (current && !confirm(`${account.name} is in ${deptName(current)}. Move them to ${department.name}?`)) return;
    setBusy(account.uid);
    try {
      await api(`/api/ceo/departments/${encodeURIComponent(department.id)}/members`, {
        method: 'POST',
        body: JSON.stringify({ uid: account.uid, name: account.name, email: account.email, title: account.position }),
      });
      toast.success(`${account.name} added to ${department.name}.`);
      await onAdded();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That person could not be added.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Modal title={`Add people to ${department.name}`} onClose={onClose} footer={<button className={btnGhost} onClick={onClose}>Done</button>}>
      <input className={input} autoFocus placeholder="Search by name or email" value={search} onChange={e => setSearch(e.target.value)} />
      {accounts === null ? <p className="text-[12px] text-gray-500">Loading accounts…</p> : error ? <p className="text-[12px] text-red-600">{error}</p> : (
        <ul className="max-h-[50dvh] divide-y divide-gray-100 overflow-y-auto dark:divide-white/6">
          {shown.length === 0 && <li className="py-4 text-center text-[12px] text-gray-500">No one matches.</li>}
          {shown.map(account => {
            const current = memberOf.get(account.uid);
            return (
              <li key={account.uid} className="flex items-center justify-between gap-3 py-2.5">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-white">{account.name}</p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{account.email}{current ? ` · in ${deptName(current)}` : ''}</p>
                </div>
                <button className={btnGhost} disabled={busy === account.uid} onClick={() => void add(account)}>
                  {busy === account.uid ? 'Adding…' : current ? 'Move here' : 'Add'}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </Modal>
  );
}

function EditMemberDialog({ member, department, onClose, onSave }: {
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

function TransferDialog({ member, current, departments, onClose, onTransfer }: {
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

function SuspendDialog({ member, onClose, onSuspend }: {
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
