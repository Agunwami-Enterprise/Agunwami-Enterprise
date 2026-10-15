'use client';

/**
 * CEO → Departments: create AE departments, choose which workstation pages
 * each one can open, and manage the people in them (add, transfer, change
 * position, shift and page access, make department admin, suspend, remove).
 * The CEO department is built in. Accounts are the same ones people already
 * sign in with; this only decides their AE department and access.
 */

import { useConfirm } from '@/app/components/common/AeModal';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { BASE_PAGE_IDS, normalizePages } from '@/lib/workstation/pages';
import { positionTitle, type AeDepartment, type AeDepartmentMember } from '@/backend/modules/departments/departments.types';
import {
  Modal, PagePicker, Switch, SuspendDialog, TransferDialog, EditMemberDialog, api, btnGhost, btnPrimary, input,
  loadAccounts, reportSync, type Account, type SyncResult,
} from './shared';

// ── Page ─────────────────────────────────────────────────────────────────────

type Draft = { name: string; description: string; pages: string[]; active: boolean; projectLinks: Record<string, string> };
const EMPTY_DRAFT: Draft = { name: '', description: '', pages: [...BASE_PAGE_IDS], active: true, projectLinks: {} };

interface ProjectOptions { projectId: string; projectName: string; departments: Array<{ id: string; name: string; ceo: boolean }> }

type MemberDialog =
  | { kind: 'add' }
  | { kind: 'edit'; member: AeDepartmentMember }
  | { kind: 'transfer'; member: AeDepartmentMember }
  | { kind: 'suspend'; member: AeDepartmentMember };

export default function DepartmentsPage() {
  const confirm = useConfirm();
  const [departments, setDepartments] = useState<AeDepartment[]>([]);
  const [members, setMembers] = useState<AeDepartmentMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<string | 'new' | 'ceo' | null>(null);
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT);
  const [saving, setSaving] = useState(false);
  const [dialog, setDialog] = useState<MemberDialog | null>(null);
  const [projectOptions, setProjectOptions] = useState<ProjectOptions[] | null>(null);

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

  useEffect(() => {
    let cancelled = false;
    api<{ projects: ProjectOptions[] }>('/api/ceo/departments/project-departments')
      .then(data => { if (!cancelled) setProjectOptions(data.projects); })
      .catch(() => { if (!cancelled) setProjectOptions([]); });
    return () => { cancelled = true; };
  }, []);

  const selected = departments.find(d => d.id === selectedId) ?? null;
  const deptMembers = useMemo(() => members.filter(m => m.departmentId === selectedId), [members, selectedId]);

  function select(id: string | 'new' | 'ceo') {
    setSelectedId(id);
    const dept = departments.find(d => d.id === id);
    setDraft(dept ? { name: dept.name, description: dept.description, pages: dept.pages, active: dept.active, projectLinks: dept.projectLinks ?? {} } : EMPTY_DRAFT);
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
    if (!(await confirm({
      title: `Delete ${selected.name}?`,
      message: `Its ${selected.memberCount} member${selected.memberCount === 1 ? '' : 's'} will lose their workstation until you add them to another department. This can't be undone.`,
      confirmLabel: 'Delete department', tone: 'danger',
    }))) return;
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
      const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/members/${encodeURIComponent(uid)}`, { method: 'PATCH', body: JSON.stringify(body) });
      toast.success(success);
      reportSync(result.sync);
      setDialog(null);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'The change could not be saved.');
    }
  }

  async function removeMember(member: AeDepartmentMember) {
    if (!(await confirm({
      title: `Remove ${member.name || member.email} from ${selected?.name}?`,
      message: 'They keep their account but lose their workstation until you add them to a department. Linked projects are updated too.',
      confirmLabel: 'Remove', tone: 'danger',
    }))) return;
    try {
      const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/members/${encodeURIComponent(member.uid)}`, { method: 'DELETE' });
      toast.success('Removed from the department.');
      reportSync(result.sync);
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
          their existing account. CEO access is given on the Staff Management page; CEO Office is built in for the CEO&apos;s own staff.
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
            <p className="text-[13px] font-bold text-gray-800 dark:text-white">CEO <span className="ml-1 rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:bg-white/8">Approved list</span></p>
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
                {dept.builtIn && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:bg-white/8">Built in</span>}
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
                CEOs open every page, including the executive workstation, projects and this Departments page. CEO access
                isn&apos;t a department: the official CEO gives it, approves people other projects list as CEO, and hands it
                over on the <Link href="/ceo/staff" className="font-semibold text-[#b38a00] hover:underline dark:text-[#f5bd02]">Staff Management</Link> page
                (CEO Access). For assistants, PAs and a chief of staff, use the CEO Office department.
              </p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]">
                <h2 className="mb-4 text-[15px] font-bold text-gray-800 dark:text-white">{selectedId === 'new' ? 'New department' : selected?.name}</h2>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block">
                    <span className="mb-1 block text-[11px] font-semibold text-gray-500">Name *</span>
                    <input className={input} value={draft.name} maxLength={60} placeholder="e.g. Technical" disabled={selected?.builtIn}
                      title={selected?.builtIn ? 'CEO Office can’t be renamed' : undefined} onChange={e => setDraft({ ...draft, name: e.target.value })} />
                  </label>
                  {!selected?.builtIn && <div className="flex items-end justify-between gap-3 rounded-lg border border-gray-200 px-3 py-2 dark:border-white/10">
                    <div>
                      <p className="text-[12px] font-semibold text-gray-700 dark:text-gray-200">Active</p>
                      <p className="text-[11px] text-gray-500 dark:text-gray-400">Inactive departments keep only the basic pages</p>
                    </div>
                    <Switch on={draft.active} onChange={active => setDraft({ ...draft, active })} label="Active" />
                  </div>}
                  <label className="block sm:col-span-2">
                    <span className="mb-1 block text-[11px] font-semibold text-gray-500">Description</span>
                    <input className={input} value={draft.description} maxLength={240} placeholder="What this department does" onChange={e => setDraft({ ...draft, description: e.target.value })} />
                  </label>
                </div>

                <h3 className="mb-2 mt-5 text-[13px] font-bold text-gray-800 dark:text-white">Pages this department can open</h3>
                <PagePicker selected={draft.pages} onChange={pages => setDraft({ ...draft, pages })} />

                <h3 className="mb-1 mt-5 text-[13px] font-bold text-gray-800 dark:text-white">Linked project departments</h3>
                <p className="mb-2 text-[11px] text-gray-500 dark:text-gray-400">
                  When someone in this department is added, transferred, repositioned, suspended, reactivated or removed, the same
                  change is applied in the linked department of each project, e.g. AE Hub.
                  {selected?.builtIn ? ' CEO Office links only to each project’s CEO department.' : ' A project’s CEO department links only to CEO Office.'}
                </p>
                {projectOptions === null ? (
                  <p className="text-[12px] text-gray-400">Loading projects…</p>
                ) : projectOptions.length === 0 ? (
                  <p className="text-[12px] text-gray-400">No projects with a metrics endpoint yet.</p>
                ) : (
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {projectOptions.map(project => {
                      const linked = draft.projectLinks[project.projectId] ?? '';
                      const allowed = project.departments.filter(d => d.ceo === Boolean(selected?.builtIn));
                      const options = allowed.some(d => d.id === linked) || !linked
                        ? allowed
                        : [...allowed, { id: linked, name: linked, ceo: false }];
                      return (
                        <label key={project.projectId} className="block">
                          <span className="mb-1 block text-[11px] font-semibold text-gray-500">{project.projectName}</span>
                          <select className={input} value={linked} aria-label={`${project.projectName} department`}
                            onChange={e => {
                              const projectLinks = { ...draft.projectLinks };
                              if (e.target.value) projectLinks[project.projectId] = e.target.value;
                              else delete projectLinks[project.projectId];
                              setDraft({ ...draft, projectLinks });
                            }}>
                            <option value="">Not linked</option>
                            {options.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                          </select>
                        </label>
                      );
                    })}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap items-center justify-between gap-2">
                  {selected && !selected.builtIn ? <button onClick={() => void deleteDepartment()} className="text-[12px] font-semibold text-red-600 hover:underline dark:text-red-400">Delete department</button> : <span />}
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
                              {[positionTitle(selected.name, member.isDepartmentAdmin), member.shiftStart && member.shiftEnd ? `${member.shiftStart}–${member.shiftEnd}` : null,
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
          currentAdmin={deptMembers.find(m => m.isDepartmentAdmin && m.uid !== dialog.member.uid) ?? null}
          onSave={body => memberAction(dialog.member.uid, body, 'Saved.')} />
      )}
      {selected && dialog?.kind === 'transfer' && (
        <TransferDialog member={dialog.member} current={selected} departments={departments} onClose={() => setDialog(null)}
          onTransfer={(departmentId, syncProjects) => memberAction(dialog.member.uid, { departmentId, syncProjects }, `Transferred to ${deptName(departmentId)}.`)} />
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
  const confirm = useConfirm();
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
    if (current && !(await confirm({
      title: `Move ${account.name} to ${department.name}?`,
      message: `They're in ${deptName(current)} now. Their page limits and admin rights there don't carry over.`,
      confirmLabel: 'Move them',
    }))) return;
    setBusy(account.uid);
    try {
      const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/${encodeURIComponent(department.id)}/members`, {
        method: 'POST',
        body: JSON.stringify({ uid: account.uid, name: account.name, email: account.email }),
      });
      toast.success(`${account.name} added to ${department.name}.`);
      reportSync(result.sync);
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
