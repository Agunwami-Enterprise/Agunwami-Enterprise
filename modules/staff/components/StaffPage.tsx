'use client';

/**
 * CEO → Staff Management: everyone with a staff account, with their AE
 * department, position, Employee ID and whether they're on shift. Each
 * person can be added to or transferred between AE departments, edited,
 * suspended or reactivated, and removed from their department, the same
 * actions (and the same sync to linked projects such as AE Hub) as the
 * Departments page. New staff get one account for AE and AE Hub. External
 * Staff lists people in project departments that no AE department is linked
 * to, so AE changes don't reach them.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { toast } from 'react-toastify';
import { useAuth } from '@/lib/workstation/auth-context';
import { formatAehubId, formatEmployeeId } from '@/lib/workstation/employee-id';
import { subscribeLiveTeam } from '@/modules/time-tracking/services';
import {
  createStaffAccount, loadAehubDepartments, reviewStaffRequest, subscribeStaffAccounts, subscribeStaffRequests,
  type StaffAccount, type StaffRequest,
} from '@/modules/staff/services';
import {
  EditMemberDialog, Modal, SuspendDialog, TransferDialog, api, btnGhost, btnPrimary, input, reportSync,
  type SyncResult,
} from '@/modules/departments/components/shared';
import type { AeDepartment, AeDepartmentMember } from '@/backend/modules/departments/departments.types';
import type { ExternalStaffProject } from '@/modules/staff/types';

type Tab = 'directory' | 'requests' | 'external';
type Shift = 'onshift' | 'onbreak' | 'offshift';

const NO_DEPARTMENT = '__none__';
const ALL = '__all__';

const titleCase = (value: string) => value.replace(/[-_]+/g, ' ').replace(/\b\w/g, c => c.toUpperCase());

type Dialog =
  | { kind: 'add' }
  | { kind: 'assign'; account: StaffAccount }
  | { kind: 'edit'; member: AeDepartmentMember }
  | { kind: 'transfer'; member: AeDepartmentMember }
  | { kind: 'suspend'; member: AeDepartmentMember };

export default function StaffPage() {
  const { user } = useAuth();
  const [tab, setTab] = useState<Tab>('directory');
  const [accounts, setAccounts] = useState<StaffAccount[] | null>(null);
  const [accountsError, setAccountsError] = useState('');
  const [departments, setDepartments] = useState<AeDepartment[]>([]);
  const [members, setMembers] = useState<AeDepartmentMember[]>([]);
  const [deptError, setDeptError] = useState('');
  const [shifts, setShifts] = useState<Record<string, Shift>>({});
  const [requests, setRequests] = useState<StaffRequest[] | null>(null);
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState(ALL);
  const [statusFilter, setStatusFilter] = useState(ALL);
  const [dialog, setDialog] = useState<Dialog | null>(null);

  useEffect(() => subscribeStaffAccounts(setAccounts, err => {
    setAccountsError(err.message || 'Staff accounts could not be loaded.');
    setAccounts([]);
  }), []);
  useEffect(() => subscribeLiveTeam(rows => {
    const map: Record<string, Shift> = {};
    for (const row of rows) map[row.uid] = row.status === 'onshift' || row.status === 'onbreak' ? row.status : 'offshift';
    setShifts(map);
  }), []);
  useEffect(() => subscribeStaffRequests(setRequests, () => setRequests([])), []);

  const reload = useCallback(async () => {
    try {
      const data = await api<{ departments: AeDepartment[]; members: AeDepartmentMember[] }>('/api/ceo/departments');
      setDepartments(data.departments);
      setMembers(data.members);
      setDeptError('');
    } catch (err) {
      setDeptError(err instanceof Error ? err.message : 'Departments could not be loaded.');
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void reload(), 0);
    return () => clearTimeout(first);
  }, [reload]);

  const memberByUid = useMemo(() => new Map(members.map(m => [m.uid, m])), [members]);
  const deptById = useMemo(() => new Map(departments.map(d => [d.id, d])), [departments]);

  const rows = (accounts ?? []).filter(account => account.accountStatus !== 'fired');
  const term = search.trim().toLowerCase();
  const shown = rows.filter(account => {
    const member = memberByUid.get(account.uid);
    if (term && !account.name.toLowerCase().includes(term) && !account.email.toLowerCase().includes(term)
      && !(member?.title ?? '').toLowerCase().includes(term)) return false;
    if (deptFilter === NO_DEPARTMENT && member) return false;
    if (deptFilter !== ALL && deptFilter !== NO_DEPARTMENT && member?.departmentId !== deptFilter) return false;
    if (statusFilter === 'suspended' && member?.status !== 'suspended' && account.accountStatus !== 'suspended') return false;
    if (statusFilter === 'onshift' && shifts[account.uid] !== 'onshift' && shifts[account.uid] !== 'onbreak') return false;
    if (statusFilter === 'active' && (member?.status === 'suspended' || account.accountStatus === 'suspended')) return false;
    return true;
  });

  const stats = [
    { label: 'Total staff', value: rows.length },
    { label: 'On shift now', value: rows.filter(a => shifts[a.uid] === 'onshift' || shifts[a.uid] === 'onbreak').length },
    { label: 'Not in a department', value: rows.filter(a => !memberByUid.has(a.uid)).length },
    { label: 'Suspended', value: rows.filter(a => memberByUid.get(a.uid)?.status === 'suspended' || a.accountStatus === 'suspended').length },
  ];
  const pendingRequests = (requests ?? []).filter(r => r.status === 'pending').length;

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

  async function assign(account: StaffAccount, departmentId: string, title?: string) {
    const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/${encodeURIComponent(departmentId)}/members`, {
      method: 'POST',
      body: JSON.stringify({ uid: account.uid, name: account.name, email: account.email, title: title ?? account.aehubPosition }),
    });
    reportSync(result.sync);
    await reload();
  }

  async function remove(account: StaffAccount, member: AeDepartmentMember) {
    if (!confirm(`Remove ${account.name} from ${deptById.get(member.departmentId)?.name ?? 'their department'}? They keep their account but lose their workstation until added to a department.`)) return;
    try {
      const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/members/${encodeURIComponent(account.uid)}`, { method: 'DELETE' });
      toast.success('Removed from the department.');
      reportSync(result.sync);
      await reload();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'That person could not be removed.');
    }
  }

  const loading = accounts === null;

  return (
    <div className="p-4 md:p-5">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Staff Management</h1>
          <p className="text-[12px] text-gray-500 dark:text-gray-400">
            Everyone with a staff account, their AE department and status. Departments and their pages are set on the{' '}
            <Link href="/ceo/departments" className="font-semibold text-[#b38a00] hover:underline dark:text-[#f5bd02]">Departments</Link> page.
          </p>
        </div>
        <button onClick={() => setDialog({ kind: 'add' })} className={`${btnPrimary} self-start`} disabled={departments.length === 0}
          title={departments.length === 0 ? 'Create a department first' : undefined}>
          + Add Staff Member
        </button>
      </div>

      <div className="mb-5 flex border-b border-gray-200 dark:border-white/6">
        {([['directory', 'Staff Directory', 0], ['requests', 'Staff Requests', pendingRequests], ['external', 'External Staff', 0]] as const).map(([key, label, badge]) => (
          <button key={key} onClick={() => setTab(key)}
            className={`relative flex items-center gap-1.5 px-4 py-2.5 text-[13px] font-medium transition-colors ${tab === key ? 'text-gray-800 dark:text-white' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}>
            {label}
            {badge > 0 && <span className="rounded-full bg-orange-400 px-1.5 py-0.5 text-[9px] font-bold leading-none text-white">{badge}</span>}
            {tab === key && <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-t-full bg-[#f5bd02]" />}
          </button>
        ))}
      </div>

      {(accountsError || deptError) && (
        <p role="alert" className="mb-4 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {accountsError || deptError} {deptError && <button className="font-semibold underline" onClick={() => void reload()}>Try again</button>}
        </p>
      )}

      {tab === 'directory' ? (
        <>
          <div className="ae-stagger mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
            {stats.map(stat => (
              <div key={stat.label} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
                <p className="text-[11px] text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="mt-0.5 text-[22px] font-bold text-gray-800 dark:text-white">{loading ? '…' : stat.value}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 flex flex-col gap-2 sm:flex-row">
            <input className={`${input} sm:flex-1`} placeholder="Search by name, email or position" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search staff" />
            <select className={`${input} sm:w-56`} value={deptFilter} onChange={e => setDeptFilter(e.target.value)} aria-label="Filter by department">
              <option value={ALL}>All departments</option>
              <option value={NO_DEPARTMENT}>Not in a department</option>
              {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
            </select>
            <select className={`${input} sm:w-44`} value={statusFilter} onChange={e => setStatusFilter(e.target.value)} aria-label="Filter by status">
              <option value={ALL}>All statuses</option>
              <option value="active">Active</option>
              <option value="onshift">On shift now</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-40 animate-pulse rounded-2xl bg-white dark:bg-[#1e1e1e]" />)}
            </div>
          ) : shown.length === 0 ? (
            <div className="rounded-2xl bg-white p-8 text-center text-[13px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">
              {rows.length === 0 ? 'No staff accounts yet. Add the first staff member.' : 'No one matches these filters.'}
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
              {shown.map(account => (
                <StaffCard
                  key={account.uid}
                  account={account}
                  member={memberByUid.get(account.uid) ?? null}
                  department={deptById.get(memberByUid.get(account.uid)?.departmentId ?? '') ?? null}
                  shift={shifts[account.uid] ?? 'offshift'}
                  canTransfer={departments.length > 1}
                  onAssign={() => setDialog({ kind: 'assign', account })}
                  onEdit={member => setDialog({ kind: 'edit', member })}
                  onTransfer={member => setDialog({ kind: 'transfer', member })}
                  onSuspend={member => setDialog({ kind: 'suspend', member })}
                  onReactivate={member => void memberAction(member.uid, { status: 'active' }, `${account.name}'s access restored.`)}
                  onRemove={member => void remove(account, member)}
                />
              ))}
            </div>
          )}
        </>
      ) : tab === 'requests' ? (
        <RequestsTab requests={requests} reviewerUid={user?.uid ?? 'ceo'} />
      ) : (
        <ExternalTab />
      )}

      {dialog?.kind === 'add' && (
        <AddStaffDialog departments={departments} onClose={() => setDialog(null)}
          onCreated={async () => { setDialog(null); await reload(); }} />
      )}
      {dialog?.kind === 'assign' && (
        <AssignDialog account={dialog.account} departments={departments} onClose={() => setDialog(null)}
          onAssign={async departmentId => {
            try {
              await assign(dialog.account, departmentId);
              toast.success(`${dialog.account.name} added to ${deptById.get(departmentId)?.name}.`);
              setDialog(null);
            } catch (err) {
              toast.error(err instanceof Error ? err.message : 'That person could not be added.');
            }
          }} />
      )}
      {dialog?.kind === 'edit' && deptById.get(dialog.member.departmentId) && (
        <EditMemberDialog member={dialog.member} department={deptById.get(dialog.member.departmentId)!} onClose={() => setDialog(null)}
          onSave={body => memberAction(dialog.member.uid, body, 'Saved.')} />
      )}
      {dialog?.kind === 'transfer' && deptById.get(dialog.member.departmentId) && (
        <TransferDialog member={dialog.member} current={deptById.get(dialog.member.departmentId)!} departments={departments} onClose={() => setDialog(null)}
          onTransfer={departmentId => memberAction(dialog.member.uid, { departmentId }, `Transferred to ${deptById.get(departmentId)?.name}.`)} />
      )}
      {dialog?.kind === 'suspend' && (
        <SuspendDialog member={dialog.member} onClose={() => setDialog(null)}
          onSuspend={reason => memberAction(dialog.member.uid, { status: 'suspended', suspendedReason: reason }, 'Access suspended.')} />
      )}
    </div>
  );
}

// ── Card ─────────────────────────────────────────────────────────────────────

const SHIFT_STYLE: Record<Shift, { label: string; className: string }> = {
  onshift: { label: 'On shift', className: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' },
  onbreak: { label: 'On break', className: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300' },
  offshift: { label: 'Off shift', className: 'bg-gray-100 text-gray-500 dark:bg-white/8 dark:text-gray-400' },
};

function StaffCard({ account, member, department, shift, canTransfer, onAssign, onEdit, onTransfer, onSuspend, onReactivate, onRemove }: {
  account: StaffAccount;
  member: AeDepartmentMember | null;
  department: AeDepartment | null;
  shift: Shift;
  canTransfer: boolean;
  onAssign: () => void;
  onEdit: (member: AeDepartmentMember) => void;
  onTransfer: (member: AeDepartmentMember) => void;
  onSuspend: (member: AeDepartmentMember) => void;
  onReactivate: (member: AeDepartmentMember) => void;
  onRemove: (member: AeDepartmentMember) => void;
}) {
  const employeeId = formatEmployeeId(account);
  const aehubId = formatAehubId(account);
  const suspended = member?.status === 'suspended';
  const position = member?.title || account.aehubPosition || 'No position set';
  const initials = account.name.split(/\s+/).map(part => part[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="flex flex-col rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
      <div className="flex items-start gap-3">
        {account.photoURL ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={account.photoURL} alt="" className="h-11 w-11 shrink-0 rounded-full object-cover" />
        ) : (
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-[#f5bd02] text-[14px] font-bold text-[#1a1a1a]">{initials}</span>
        )}
        <div className="min-w-0 flex-1">
          <p className="truncate text-[14px] font-bold text-gray-800 dark:text-white">{account.name}</p>
          <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">{account.email}</p>
          <p className="truncate text-[12px] text-gray-600 dark:text-gray-300">{position}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${SHIFT_STYLE[shift].className}`}>{SHIFT_STYLE[shift].label}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {department ? (
          <span className="rounded-md bg-[#fef3c7] px-2 py-0.5 text-[10px] font-bold text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">{department.name}</span>
        ) : (
          <span className="rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-bold text-gray-500 dark:bg-white/8 dark:text-gray-400">Not in a department</span>
        )}
        {member?.isDepartmentAdmin && <span className="rounded-md bg-blue-50 px-2 py-0.5 text-[10px] font-bold text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">Dept admin</span>}
        {suspended && <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300">Suspended</span>}
        {!suspended && account.accountStatus === 'suspended' && (
          <span className="rounded-md bg-red-50 px-2 py-0.5 text-[10px] font-bold text-red-700 dark:bg-red-500/15 dark:text-red-300" title="Suspended in AE Hub">AE Hub: suspended</span>
        )}
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <dt className="text-gray-400">Employee ID</dt>
        <dd className="text-right font-semibold text-gray-700 dark:text-gray-200">{employeeId ?? 'Not assigned'}</dd>
        {(member?.shiftStart || account.shiftStartTime) && (
          <>
            <dt className="text-gray-400">Shift</dt>
            <dd className="text-right text-gray-700 dark:text-gray-200">
              {member?.shiftStart ? `${member.shiftStart}–${member.shiftEnd}` : `${account.shiftStartTime}–${account.shiftEndTime}`}
            </dd>
          </>
        )}
        {aehubId && (
          <>
            <dt className="text-gray-400">AE Hub</dt>
            <dd className="truncate text-right text-gray-700 dark:text-gray-200" title={`${titleCase(account.aehubDepartment)} · ${aehubId}`}>
              {account.aehubDepartment ? `${titleCase(account.aehubDepartment)} · ` : ''}{aehubId}
            </dd>
          </>
        )}
      </dl>

      <div className="mt-auto flex flex-wrap gap-1.5 pt-4">
        {member ? (
          <>
            <button className={btnGhost} onClick={() => onEdit(member)}>Edit</button>
            <button className={btnGhost} onClick={() => onTransfer(member)} disabled={!canTransfer}>Transfer</button>
            {suspended
              ? <button className={btnGhost} onClick={() => onReactivate(member)}>Reactivate</button>
              : <button className={btnGhost} onClick={() => onSuspend(member)}>Suspend</button>}
            <button className={`${btnGhost} text-red-600 dark:text-red-400`} onClick={() => onRemove(member)}>Remove</button>
          </>
        ) : (
          <button className={btnPrimary} onClick={onAssign}>Add to a department</button>
        )}
      </div>
    </div>
  );
}

// ── Dialogs ──────────────────────────────────────────────────────────────────

function AssignDialog({ account, departments, onClose, onAssign }: {
  account: StaffAccount;
  departments: AeDepartment[];
  onClose: () => void;
  onAssign: (departmentId: string) => Promise<void>;
}) {
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
  const [saving, setSaving] = useState(false);
  return (
    <Modal title={`Add ${account.name} to a department`} onClose={onClose}
      footer={(
        <>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!departmentId || saving}
            onClick={async () => { setSaving(true); await onAssign(departmentId); setSaving(false); }}>
            {saving ? 'Adding…' : 'Add'}
          </button>
        </>
      )}>
      {departments.length === 0 ? (
        <p className="text-[12px] text-gray-500">Create a department on the Departments page first.</p>
      ) : (
        <select className={input} value={departmentId} onChange={e => setDepartmentId(e.target.value)} aria-label="Department">
          {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
        </select>
      )}
      <p className="text-[11px] text-gray-500 dark:text-gray-400">They get the department&apos;s workstation pages straight away.</p>
    </Modal>
  );
}

function AddStaffDialog({ departments, onClose, onCreated }: {
  departments: AeDepartment[];
  onClose: () => void;
  onCreated: () => Promise<void>;
}) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [position, setPosition] = useState('');
  const [departmentId, setDepartmentId] = useState(departments[0]?.id ?? '');
  const [aehubDepartments, setAehubDepartments] = useState<Array<{ id: string; name: string }> | null>(null);
  const [aehubDepartment, setAehubDepartment] = useState('');
  const [shiftStart, setShiftStart] = useState('09:00');
  const [shiftEnd, setShiftEnd] = useState('17:00');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    loadAehubDepartments().then(setAehubDepartments).catch(() => setAehubDepartments([]));
  }, []);

  // The AE Hub department linked to the chosen AE department, if any.
  const linked = Object.values(departments.find(d => d.id === departmentId)?.projectLinks ?? {})
    .find(id => aehubDepartments?.some(option => option.id === id)) ?? '';
  const effectiveAehubDepartment = aehubDepartment || linked;

  async function submit() {
    setError('');
    if (!name.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setError('Enter their full name and a valid email address.'); return; }
    if (!departmentId) { setError('Choose an AE department.'); return; }
    if (!effectiveAehubDepartment) { setError('Choose their AE Hub department (every account is also an AE Hub staff account).'); return; }
    setSaving(true);
    try {
      const { uid } = await createStaffAccount({
        name, email, position, aehubDepartment: effectiveAehubDepartment, shiftStartTime: shiftStart, shiftEndTime: shiftEnd,
      });
      const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/${encodeURIComponent(departmentId)}/members`, {
        method: 'POST',
        body: JSON.stringify({ uid, name: name.trim(), email: email.trim().toLowerCase(), title: position.trim() }),
      });
      if (shiftStart && shiftEnd) {
        await api(`/api/ceo/departments/members/${encodeURIComponent(uid)}`, { method: 'PATCH', body: JSON.stringify({ shiftStart, shiftEnd }) }).catch(() => undefined);
      }
      toast.success(`${name.trim()}'s account was created and their sign-in details emailed to ${email.trim()}.`);
      reportSync(result.sync?.filter(r => r.skipped !== 'already-in-department'));
      await onCreated();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'The account could not be created.');
      setSaving(false);
    }
  }

  return (
    <Modal title="Add a staff member" onClose={onClose}
      footer={(
        <>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={saving} onClick={() => void submit()}>{saving ? 'Creating…' : 'Create account'}</button>
        </>
      )}>
      <p className="text-[12px] text-gray-500 dark:text-gray-400">
        Creates one account for AE and AE Hub and emails them their sign-in details. If they already have an account, use
        &ldquo;Add to a department&rdquo; on their card instead.
      </p>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Full name *</span>
          <input className={input} value={name} maxLength={120} onChange={e => setName(e.target.value)} autoFocus />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Personal email *</span>
          <input className={input} type="email" value={email} onChange={e => setEmail(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Position</span>
          <input className={input} value={position} maxLength={80} placeholder="e.g. Frontend Developer" onChange={e => setPosition(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">AE department *</span>
          <select className={input} value={departmentId} onChange={e => { setDepartmentId(e.target.value); setAehubDepartment(''); }}>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </label>
        <label className="block sm:col-span-2">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">AE Hub department *</span>
          <select className={input} value={effectiveAehubDepartment} onChange={e => setAehubDepartment(e.target.value)} disabled={aehubDepartments === null}>
            <option value="">{aehubDepartments === null ? 'Loading…' : 'Choose…'}</option>
            {(aehubDepartments ?? []).map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
          {linked && !aehubDepartment && <span className="mt-1 block text-[11px] text-gray-500">Linked to the chosen AE department.</span>}
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Shift starts</span>
          <input className={input} type="time" value={shiftStart} onChange={e => setShiftStart(e.target.value)} />
        </label>
        <label className="block">
          <span className="mb-1 block text-[11px] font-semibold text-gray-500">Shift ends</span>
          <input className={input} type="time" value={shiftEnd} onChange={e => setShiftEnd(e.target.value)} />
        </label>
      </div>
      {error && <p role="alert" className="text-[12px] text-red-600 dark:text-red-400">{error}</p>}
    </Modal>
  );
}

// ── Staff requests ───────────────────────────────────────────────────────────

function RequestsTab({ requests, reviewerUid }: { requests: StaffRequest[] | null; reviewerUid: string }) {
  const [filter, setFilter] = useState<'pending' | 'all'>('pending');
  const [busy, setBusy] = useState<string | null>(null);
  if (requests === null) return <div className="h-32 animate-pulse rounded-2xl bg-white dark:bg-[#1e1e1e]" />;
  const shown = filter === 'pending' ? requests.filter(r => r.status === 'pending') : requests;

  async function review(request: StaffRequest, status: 'approved' | 'rejected') {
    setBusy(request.id);
    try {
      await reviewStaffRequest(request.id, status, reviewerUid);
      toast.success(`Request ${status}.`);
    } catch {
      toast.error('The request could not be updated.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-[12px] text-gray-500 dark:text-gray-400">Hiring requests from department leads in AE Hub.</p>
        <select className={`${input} w-40`} value={filter} onChange={e => setFilter(e.target.value as 'pending' | 'all')} aria-label="Show requests">
          <option value="pending">Pending</option>
          <option value="all">All requests</option>
        </select>
      </div>
      {shown.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-[13px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">
          {filter === 'pending' ? 'No pending requests.' : 'No staff requests yet.'}
        </div>
      ) : (
        <ul className="space-y-3">
          {shown.map(request => (
            <li key={request.id} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-[14px] font-bold text-gray-800 dark:text-white">
                    {request.headcount} × {request.position || 'Staff'} <span className="font-normal text-gray-500">· {titleCase(request.department)}</span>
                  </p>
                  <p className="text-[11px] text-gray-500 dark:text-gray-400">
                    {titleCase(request.type)} · {request.priority} priority · from {request.requestedByName || request.requestedByEmail || 'a department lead'}
                    {request.createdAt ? ` · ${new Date(request.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}
                  </p>
                </div>
                {request.status === 'pending' ? (
                  <div className="flex gap-1.5">
                    <button className={btnPrimary} disabled={busy === request.id} onClick={() => void review(request, 'approved')}>Approve</button>
                    <button className={`${btnGhost} text-red-600 dark:text-red-400`} disabled={busy === request.id} onClick={() => void review(request, 'rejected')}>Reject</button>
                  </div>
                ) : (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${request.status === 'approved' ? 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300' : 'bg-red-50 text-red-700 dark:bg-red-500/15 dark:text-red-300'}`}>
                    {request.status}
                  </span>
                )}
              </div>
              {request.justification && <p className="mt-2 text-[12px] text-gray-600 dark:text-gray-300">{request.justification}</p>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── External staff ───────────────────────────────────────────────────────────

function ExternalTab() {
  const [projects, setProjects] = useState<ExternalStaffProject[] | null>(null);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    try {
      const data = await api<{ projects: ExternalStaffProject[] }>('/api/ceo/staff/external');
      setProjects(data.projects);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'External staff could not be loaded.');
      setProjects(current => current ?? []);
    }
  }, []);
  useEffect(() => {
    const first = setTimeout(() => void load(), 0);
    return () => clearTimeout(first);
  }, [load]);

  const term = search.trim().toLowerCase();
  const matches = (name: string, role?: string) => !term || name.toLowerCase().includes(term) || (role ?? '').toLowerCase().includes(term);
  const total = (projects ?? []).reduce((sum, p) => sum + p.departments.reduce((n, d) => n + d.staff.length, 0), 0);

  return (
    <div>
      <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-[12px] text-gray-500 dark:text-gray-400">
          Staff in project departments that aren’t linked to an AE department, so AE changes don’t reach them.
          Link a department on the{' '}
          <Link href="/ceo/departments" className="font-semibold text-[#b38a00] hover:underline dark:text-[#f5bd02]">Departments</Link> page to manage its staff from AE.
        </p>
        <input className={`${input} sm:w-64`} placeholder="Search external staff" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search external staff" />
      </div>

      {error && (
        <p role="alert" className="mb-3 rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">
          {error} <button className="font-semibold underline" onClick={() => void load()}>Try again</button>
        </p>
      )}

      {projects === null ? (
        <div className="space-y-3">
          {Array.from({ length: 2 }).map((_, i) => <div key={i} className="h-32 animate-pulse rounded-2xl bg-white dark:bg-[#1e1e1e]" />)}
        </div>
      ) : projects.length === 0 ? (
        <div className="rounded-2xl bg-white p-8 text-center text-[13px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">
          No projects yet. Projects added on the dashboard show their staff here.
        </div>
      ) : (
        <div className="space-y-4">
          {total === 0 && !error && (
            <div className="rounded-2xl bg-white p-5 text-center text-[13px] text-gray-500 shadow-sm dark:bg-[#1e1e1e] dark:text-gray-400">
              No external staff. Every reported project department is linked to an AE department.
            </div>
          )}
          {projects.map(project => {
            const count = project.departments.reduce((n, d) => n + d.staff.length, 0);
            const departments = project.departments
              .map(d => ({ ...d, staff: d.staff.filter(m => matches(m.name, m.role)) }))
              .filter(d => d.staff.length > 0 || (!term && d.id));
            return (
              <section key={project.projectId} className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
                <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: project.color }} aria-hidden />
                    <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">{project.projectName}</h2>
                    <span className="text-[11px] text-gray-500 dark:text-gray-400">
                      {count} external · {project.linkedCount} department{project.linkedCount === 1 ? '' : 's'} linked to AE
                    </span>
                  </div>
                  {!project.connected && (
                    <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-bold uppercase text-gray-500 dark:bg-white/8 dark:text-gray-400">Not connected</span>
                  )}
                </div>
                {!project.connected && project.departments.length === 0 ? (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">This project’s metrics endpoint isn’t connected, so its staff can’t be read.</p>
                ) : departments.length === 0 ? (
                  <p className="text-[12px] text-gray-500 dark:text-gray-400">{term ? 'No one matches.' : 'Every department in this project is linked to AE.'}</p>
                ) : (
                  <div className="space-y-3">
                    {departments.map(department => (
                      <div key={department.id || 'none'}>
                        <p className="mb-1.5 text-[11px] font-bold uppercase tracking-wide text-gray-500 dark:text-gray-400">
                          {department.name} <span className="font-normal normal-case">· {department.staff.length} {department.staff.length === 1 ? 'person' : 'people'}{department.id ? ' · not linked' : ''}</span>
                        </p>
                        {department.staff.length === 0 ? (
                          <p className="text-[12px] text-gray-400 dark:text-gray-500">No staff reported.</p>
                        ) : (
                          <ul className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
                            {department.staff.map(member => (
                              <li key={member.id} className="flex items-center gap-2.5 rounded-xl border border-gray-100 px-3 py-2 dark:border-white/6">
                                <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#fef3c7] text-[12px] font-bold text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">
                                  {member.name.charAt(0).toUpperCase()}
                                </span>
                                <div className="min-w-0">
                                  <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-white">{member.name}</p>
                                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                                    {[member.role && titleCase(member.role), member.status && titleCase(member.status)].filter(Boolean).join(' · ') || 'Staff'}
                                    {member.aeDepartment && <> · <span className="text-[#b38a00] dark:text-[#f5bd02]">In AE: {member.aeDepartment}</span></>}
                                  </p>
                                </div>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
