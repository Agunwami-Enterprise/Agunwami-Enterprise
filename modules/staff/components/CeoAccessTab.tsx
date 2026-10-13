'use client';

/**
 * Staff Management → CEO Access: who has CEO access in AE, who's waiting for
 * it, and past decisions. A project listing someone as CEO (AE Hub's CEO role
 * or CEO office) only puts them on the waiting list; the official CEO
 * approves them, puts them in CEO Office or leaves them out, can give CEO
 * access to anyone, and hands the official role over.
 */

import { useMemo, useState } from 'react';
import { toast } from 'react-toastify';
import type { StaffAccount, CeoCandidate } from '@/modules/staff/services';
import type { AeCeo } from '@/backend/modules/departments/ceos.service';
import { CEO_OFFICE_ID, type AeDepartment, type AeDepartmentMember } from '@/backend/modules/departments/departments.types';
import { Modal, api, btnGhost, btnPrimary, input, reportSync, type SyncResult } from '@/modules/departments/components/shared';

export interface CeoAccessData {
  records: AeCeo[];
  me: { uid: string; official: boolean };
  approvalsOn: boolean;
}

interface Person { uid: string; name: string; email: string }

const CLAIM_LABEL: Record<string, string> = {
  ceo: 'CEO in AE Hub',
  'ceo-office': 'AE Hub CEO office',
};

const SOURCE_LABEL: Record<string, string> = {
  bootstrap: 'first CEO',
  approval: 'approved',
  promotion: 'made CEO',
  handover: 'handed over',
  revoked: 'CEO access removed',
  declined: 'left out',
  'stepped-down': 'stepped down',
};

const when = (iso: string | null) => iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '';

export default function CeoAccessTab({ data, error, candidates, accounts, departments, members, onReload, onDepartmentsChanged }: {
  data: CeoAccessData | null;
  error: string;
  candidates: CeoCandidate[];
  accounts: StaffAccount[];
  departments: AeDepartment[];
  members: AeDepartmentMember[];
  onReload: () => Promise<void>;
  onDepartmentsChanged: () => Promise<void>;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'promote' | 'handover' | null>(null);

  const records = useMemo(() => data?.records ?? [], [data]);
  const byUid = useMemo(() => new Map(records.map(r => [r.uid, r])), [records]);
  const ceoOffice = departments.find(d => d.id === CEO_OFFICE_ID) ?? null;
  const memberDept = (uid: string) => departments.find(d => d.id === members.find(m => m.uid === uid)?.departmentId)?.name ?? null;

  // Waiting: AE Hub's CEOs and CEO office with no decision yet, plus anyone recorded as waiting.
  const waiting = useMemo(() => {
    const list = new Map<string, Person & { claim: string; position: string; requestedAt: string | null }>();
    for (const c of candidates) {
      const record = byUid.get(c.uid);
      if (record && record.status !== 'pending') continue;
      list.set(c.uid, { uid: c.uid, name: c.name, email: c.email, claim: c.claim, position: c.aehubPosition, requestedAt: record?.requestedAt ?? null });
    }
    for (const r of records) {
      if (r.status === 'pending' && !list.has(r.uid)) list.set(r.uid, { uid: r.uid, name: r.name || r.email, email: r.email, claim: r.claim, position: '', requestedAt: r.requestedAt });
    }
    return [...list.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [candidates, records, byUid]);

  const approved = records.filter(r => r.status === 'approved').sort((a, b) => Number(b.official) - Number(a.official) || a.name.localeCompare(b.name));
  const declined = records.filter(r => r.status === 'declined');

  // Only the official CEO changes CEO access; before approvals are on, the first change makes you official.
  const canManage = Boolean(data && (data.me.official || !data.approvalsOn));

  async function act(key: string, body: Record<string, unknown>, success: string) {
    setBusy(key);
    try {
      await api('/api/ceo/ceo-access', { method: 'POST', body: JSON.stringify(body) });
      toast.success(success);
      await onReload();
      return true;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'CEO access could not be changed.');
      return false;
    } finally {
      setBusy(null);
    }
  }

  async function putInCeoOffice(person: Person) {
    if (!ceoOffice) { toast.error('CEO Office isn’t set up yet. Open the Departments page, then try again.'); return; }
    const left = await act(person.uid, { action: 'decline', uid: person.uid, name: person.name, email: person.email }, `${person.name} won’t get CEO access.`);
    if (!left) return;
    try {
      const result = await api<{ sync?: SyncResult[] }>(`/api/ceo/departments/${CEO_OFFICE_ID}/members`, {
        method: 'POST',
        body: JSON.stringify({ uid: person.uid, name: person.name, email: person.email }),
      });
      toast.success(`${person.name} added to CEO Office.`);
      reportSync(result.sync?.filter(r => r.skipped !== 'already-in-department'));
      await onDepartmentsChanged();
    } catch (err) {
      toast.error(err instanceof Error ? `${person.name} wasn’t added to CEO Office: ${err.message}` : 'They couldn’t be added to CEO Office.');
    }
  }

  if (!data) {
    return error
      ? <p role="alert" className="rounded-xl bg-red-50 px-4 py-2.5 text-[12px] text-red-700 dark:bg-red-500/10 dark:text-red-300">{error} <button className="font-semibold underline" onClick={() => void onReload()}>Try again</button></p>
      : <div className="h-40 animate-pulse rounded-2xl bg-white dark:bg-[#1e1e1e]" />;
  }

  const official = approved.find(r => r.official);
  // People who can be made CEO or take over: staff accounts and project CEOs, minus current CEOs (for promotion).
  const people: Person[] = [
    ...accounts.filter(a => a.accountStatus !== 'fired').map(a => ({ uid: a.uid, name: a.name, email: a.email })),
    ...candidates.filter(c => !accounts.some(a => a.uid === c.uid)).map(c => ({ uid: c.uid, name: c.name, email: c.email })),
  ];

  return (
    <div className="space-y-5">
      <p className="text-[12px] text-gray-500 dark:text-gray-400">
        CEO access opens every page, every project and this Staff Management page. A project listing someone as CEO only puts
        them on the waiting list here. {official ? <>The official CEO is <strong className="text-gray-700 dark:text-gray-200">{official.name || official.email}</strong>; only they can change CEO access.</> : null}
      </p>

      {!data.approvalsOn && (
        <div className="rounded-2xl border border-[#f5bd02]/50 bg-[#fef9e7] p-4 dark:border-[#f5bd02]/30 dark:bg-[#f5bd02]/10">
          <p className="text-[13px] font-bold text-gray-800 dark:text-white">CEO approvals aren’t on yet</p>
          <p className="mt-1 text-[12px] text-gray-600 dark:text-gray-300">
            Until a CEO is approved, everyone AE Hub lists as a CEO (including its CEO office) has full CEO access, as before.
            Turning approvals on makes you the official CEO; everyone else then waits for your approval.
          </p>
          <button className={`${btnPrimary} mt-3`} disabled={busy === 'bootstrap'}
            onClick={() => void act('bootstrap', { action: 'approve', uid: data.me.uid }, 'Approvals are on. You’re the official CEO.')}>
            {busy === 'bootstrap' ? 'Turning on…' : 'Turn on approvals'}
          </button>
        </div>
      )}

      {/* Waiting */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Waiting for approval <span className="font-normal text-gray-500">· {waiting.length}</span></h2>
        <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">People AE Hub lists as a CEO or in its CEO office. Assistants and PAs usually belong in CEO Office.</p>
        {waiting.length === 0 ? (
          <p className="text-[12px] text-gray-400">No one is waiting.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/6">
            {waiting.map(person => (
              <li key={person.uid} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-white">{person.name}</p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {[person.email, CLAIM_LABEL[person.claim], person.position, memberDept(person.uid) && `In ${memberDept(person.uid)}`, person.requestedAt && `signed in ${when(person.requestedAt)}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {canManage && data.approvalsOn && (
                  <div className="flex flex-wrap gap-1.5">
                    <button className={btnPrimary} disabled={busy === person.uid}
                      onClick={() => { if (confirm(`Give ${person.name} full CEO access? They'll see every page and project.`)) void act(person.uid, { action: 'approve', ...person }, `${person.name} is now a CEO.`); }}>
                      Approve as CEO
                    </button>
                    <button className={btnGhost} disabled={busy === person.uid} onClick={() => void putInCeoOffice(person)}>Put in CEO Office</button>
                    <button className={`${btnGhost} text-red-600 dark:text-red-400`} disabled={busy === person.uid}
                      onClick={() => void act(person.uid, { action: 'decline', ...person }, `${person.name} won’t get CEO access.`)}>
                      Leave out
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        {!data.approvalsOn && waiting.length > 0 && <p className="mt-2 text-[11px] text-gray-400">Turn on approvals to decide for each person.</p>}
      </section>

      {/* CEOs */}
      <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
        <div className="mb-3 flex flex-wrap items-start justify-between gap-2">
          <div>
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">CEOs <span className="font-normal text-gray-500">· {approved.length}</span></h2>
            <p className="text-[11px] text-gray-500 dark:text-gray-400">People with full CEO access in AE.</p>
          </div>
          {data.me.official && (
            <div className="flex flex-wrap gap-1.5">
              <button className={btnGhost} onClick={() => setDialog('promote')}>Make someone CEO</button>
              <button className={btnPrimary} onClick={() => setDialog('handover')}>Hand over official CEO</button>
            </div>
          )}
        </div>
        {approved.length === 0 ? (
          <p className="text-[12px] text-gray-400">No one is approved yet.</p>
        ) : (
          <ul className="divide-y divide-gray-100 dark:divide-white/6">
            {approved.map(ceo => (
              <li key={ceo.uid} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-[13px] font-semibold text-gray-800 dark:text-white">
                    {ceo.name || ceo.email || ceo.uid}
                    {ceo.official && <span className="rounded bg-[#fef3c7] px-1.5 py-0.5 text-[9px] font-bold uppercase text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">Official CEO</span>}
                    {ceo.uid === data.me.uid && <span className="rounded bg-gray-100 px-1.5 py-0.5 text-[9px] font-bold uppercase text-gray-500 dark:bg-white/8 dark:text-gray-400">You</span>}
                  </p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {[ceo.email, CLAIM_LABEL[ceo.claim], SOURCE_LABEL[ceo.source] && `${SOURCE_LABEL[ceo.source]} ${when(ceo.decidedAt)}`.trim()].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {data.me.official && !ceo.official && ceo.uid !== data.me.uid && (
                  <button className={`${btnGhost} self-start text-red-600 sm:self-auto dark:text-red-400`} disabled={busy === ceo.uid}
                    onClick={() => {
                      if (confirm(`Remove ${ceo.name || ceo.email}'s CEO access? They keep their account and any AE department.`)) {
                        void act(ceo.uid, { action: 'decline', uid: ceo.uid, name: ceo.name, email: ceo.email }, 'CEO access removed.');
                      }
                    }}>
                    Remove CEO access
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Decided */}
      {declined.length > 0 && (
        <section className="rounded-2xl bg-white p-4 shadow-sm dark:bg-[#1e1e1e]">
          <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">No CEO access <span className="font-normal text-gray-500">· {declined.length}</span></h2>
          <p className="mb-3 text-[11px] text-gray-500 dark:text-gray-400">Left out, removed or stepped down. They keep their account and any AE department.</p>
          <ul className="divide-y divide-gray-100 dark:divide-white/6">
            {declined.map(r => (
              <li key={r.uid} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="truncate text-[13px] font-semibold text-gray-800 dark:text-white">{r.name || r.email || r.uid}</p>
                  <p className="truncate text-[11px] text-gray-500 dark:text-gray-400">
                    {[r.email, SOURCE_LABEL[r.source] && `${SOURCE_LABEL[r.source]} ${when(r.decidedAt)}`.trim(), memberDept(r.uid) && `In ${memberDept(r.uid)}`].filter(Boolean).join(' · ')}
                  </p>
                </div>
                {data.me.official && r.uid !== data.me.uid && (
                  <div className="flex flex-wrap gap-1.5">
                    <button className={btnGhost} disabled={busy === r.uid}
                      onClick={() => { if (confirm(`Give ${r.name || r.email} full CEO access?`)) void act(r.uid, { action: 'approve', uid: r.uid, name: r.name, email: r.email }, 'CEO access given.'); }}>
                      Make CEO
                    </button>
                    {r.claim && (
                      <button className={btnGhost} disabled={busy === r.uid}
                        onClick={() => void act(r.uid, { action: 'reconsider', uid: r.uid }, 'Back on the waiting list.')}>
                        Back to waiting list
                      </button>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {dialog === 'promote' && (
        <PersonPicker
          title="Make someone CEO"
          intro="They get full CEO access in AE: every page, every project and Staff Management. Their AE Hub role doesn’t change."
          people={people.filter(p => byUid.get(p.uid)?.status !== 'approved')}
          confirmLabel="Give CEO access"
          onClose={() => setDialog(null)}
          onConfirm={async person => {
            if (await act(person.uid, { action: 'approve', ...person }, `${person.name} is now a CEO.`)) setDialog(null);
          }}
        />
      )}
      {dialog === 'handover' && (
        <PersonPicker
          title="Hand over official CEO"
          intro="The new official CEO gets full CEO access and becomes the only person who can change CEO access, including yours. Their AE Hub role doesn’t change."
          people={people.filter(p => p.uid !== data.me.uid)}
          confirmLabel="Hand over"
          withStayOn
          onClose={() => setDialog(null)}
          onConfirm={async (person, stayOn) => {
            const ok = await act(person.uid, { action: 'handover', ...person, stayOn }, `${person.name} is now the official CEO.`);
            if (ok) {
              setDialog(null);
              if (!stayOn) window.location.assign('/ws/dashboard');
            }
          }}
        />
      )}
    </div>
  );
}

function PersonPicker({ title, intro, people, confirmLabel, withStayOn, onClose, onConfirm }: {
  title: string;
  intro: string;
  people: Person[];
  confirmLabel: string;
  withStayOn?: boolean;
  onClose: () => void;
  onConfirm: (person: Person, stayOn: boolean) => Promise<void>;
}) {
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState<Person | null>(null);
  const [stayOn, setStayOn] = useState(true);
  const [confirmed, setConfirmed] = useState(false);
  const [saving, setSaving] = useState(false);
  const term = search.trim().toLowerCase();
  const shown = people.filter(p => !term || p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term)).slice(0, 50);

  return (
    <Modal title={title} onClose={onClose}
      footer={(
        <>
          <button className={btnGhost} onClick={onClose}>Cancel</button>
          <button className={btnPrimary} disabled={!picked || saving || (withStayOn && !confirmed)}
            onClick={async () => { if (!picked) return; setSaving(true); await onConfirm(picked, stayOn); setSaving(false); }}>
            {saving ? 'Saving…' : confirmLabel}
          </button>
        </>
      )}>
      <p className="text-[12px] text-gray-500 dark:text-gray-400">{intro}</p>
      <input className={input} placeholder="Search by name or email" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search people" autoFocus />
      <ul className="max-h-64 divide-y divide-gray-100 overflow-y-auto rounded-lg border border-gray-200 dark:divide-white/6 dark:border-white/10">
        {shown.length === 0 && <li className="px-3 py-4 text-center text-[12px] text-gray-400">No one matches.</li>}
        {shown.map(person => (
          <li key={person.uid}>
            <button type="button" onClick={() => setPicked(person)}
              className={`flex w-full flex-col items-start px-3 py-2 text-left ${picked?.uid === person.uid ? 'bg-[#fef3c7] dark:bg-[#f5bd02]/15' : 'hover:bg-gray-50 dark:hover:bg-white/5'}`}>
              <span className="text-[13px] font-semibold text-gray-800 dark:text-white">{person.name}</span>
              <span className="text-[11px] text-gray-500 dark:text-gray-400">{person.email}</span>
            </button>
          </li>
        ))}
      </ul>
      {withStayOn && (
        <div className="space-y-2">
          <label className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={stayOn} onChange={e => setStayOn(e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
            <span>Stay on as a CEO<span className="block text-[11px] text-gray-400">{stayOn ? 'You keep full CEO access.' : 'You step down to your AE department (or no workstation if you’re not in one).'}</span></span>
          </label>
          <label className="flex items-start gap-2 text-[12px] text-gray-600 dark:text-gray-300">
            <input type="checkbox" checked={confirmed} onChange={e => setConfirmed(e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
            <span>I understand only {picked ? picked.name : 'the new official CEO'} can change CEO access after this.</span>
          </label>
        </div>
      )}
    </Modal>
  );
}
