'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import {
  ChevronLeft, ChevronRight, Crown, Eye, EyeOff, GripVertical, Pencil, Plus, Trash2, UserRound,
} from 'lucide-react';
import {
  AddButton, Button, Card, ConfirmDelete, ErrorNote, IconButton, ImageField, Modal, PageHeader, SaveButton,
  TextArea, TextInput, cpanelFetch, cx, useMutation,
} from './ui';
import type { SiteTeamMember } from '@/backend/modules/site-content/site-content.types';

type Draft = Omit<SiteTeamMember, 'id'>;

function Toggle({ checked, onChange, label, description, children }: {
  checked: boolean; onChange: (checked: boolean) => void; label: string; description: string; children?: React.ReactNode;
}) {
  return (
    <div className={cx('rounded-xl border p-4 transition-colors', checked ? 'border-[#C89B3C] bg-[#FDF8EC]' : 'border-[#ECEAE3]')}>
      <button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)}
        className="flex w-full items-start gap-3 text-left">
        <span className={cx('mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-full p-0.5 transition-colors', checked ? 'bg-[#C89B3C]' : 'bg-[#D9D5CA]')}>
          <span className={cx('h-4 w-4 rounded-full bg-white shadow transition-transform', checked && 'translate-x-4')} />
        </span>
        <span>
          <span className="block text-[14px] font-semibold text-[#1A1A1A]">{label}</span>
          <span className="block text-[12px] text-[#8A8A8A]">{description}</span>
        </span>
      </button>
      {children}
    </div>
  );
}

function MemberForm({ member, team, onClose }: { member?: SiteTeamMember; team: SiteTeamMember[]; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>({
    name: member?.name ?? '', role: member?.role ?? '', department: member?.department ?? '',
    isLead: member?.isLead ?? false, showOnWebsite: member?.showOnWebsite ?? true, bio: member?.bio ?? '', image: member?.image ?? '', linkedin: member?.linkedin ?? '',
  });
  const { busy, error, run } = useMutation();
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  // Departments the team already has; typing a new name adds one.
  const departments = [...new Set(team.map(m => m.department).filter(Boolean))].sort();
  const isNewDepartment = !!draft.department.trim()
    && !departments.some(d => d.toLowerCase() === draft.department.trim().toLowerCase());
  const currentLead = team.find(m => m.isLead && m.id !== member?.id && draft.department
    && m.department.toLowerCase() === draft.department.toLowerCase());

  async function save() {
    const ok = await run(() => member
      ? cpanelFetch(`/api/cpanel/team/${member.id}`, { method: 'PATCH', json: draft })
      : cpanelFetch('/api/cpanel/team', { method: 'POST', json: draft }));
    if (ok) onClose();
  }

  return (
    <Modal open title={member ? 'Edit Team Member' : 'Add Team Member'} onClose={onClose} width="max-w-[560px]"
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SaveButton busy={busy} onClick={save}>{member ? 'Save Changes' : 'Add Member'}</SaveButton>
        </>
      )}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput label="Full name *" value={draft.name} onChange={set('name')} placeholder="Jane Doe" />
        <TextInput label="Role / title *" value={draft.role} onChange={set('role')} placeholder="Chief Executive Officer" />
      </div>
      <div>
        <TextInput label="Department *" hint="pick one or type a new department" value={draft.department} onChange={set('department')}
          list="team-departments" placeholder={departments[0] ?? 'Operations'} autoComplete="off" />
        <datalist id="team-departments">
          {departments.map(department => <option key={department} value={department} />)}
        </datalist>
        {isNewDepartment && <p className="mt-1.5 text-[12px] text-[#8A8A8A]">New department: {draft.department.trim()}</p>}
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Toggle checked={draft.showOnWebsite} onChange={set('showOnWebsite')} label="Show on website"
          description="Appears on the About and home pages." />
        <Toggle checked={draft.isLead} onChange={set('isLead')} label={`Lead of ${draft.department || 'their department'}`}
          description="Each department has one lead." />
      </div>
      {draft.isLead && currentLead && (
        <p className="text-[13px] text-[#8A6A1F]">
          {currentLead.name} currently leads {currentLead.department}. Saving makes {draft.name || 'this person'} the lead instead;
          {' '}{currentLead.name} stays on the team.
        </p>
      )}
      <TextArea label="Bio" value={draft.bio} onChange={set('bio')} rows={3} placeholder="Brief bio..." />
      <ImageField label="Photo" value={draft.image} onChange={set('image')} />
      <TextInput label="LinkedIn URL" value={draft.linkedin} onChange={set('linkedin')} placeholder="https://linkedin.com/in/..." />
      <ErrorNote message={error} />
    </Modal>
  );
}

export function TeamManager({ team }: { team: SiteTeamMember[] }) {
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<SiteTeamMember | 'new' | null>(searchParams.get('new') ? 'new' : null);
  const [deleting, setDeleting] = useState<SiteTeamMember | null>(null);
  const del = useMutation();
  const display = useMutation();
  const reorder = useMutation();
  const shown = team.filter(m => m.showOnWebsite).length;
  // The website shows members in this order. While a new order is saving, show it.
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const byId = new Map(team.map(m => [m.id, m]));
  const ordered = pendingIds?.map(id => byId.get(id)).filter((m): m is SiteTeamMember => !!m) ?? team;

  const saveOrder = (next: SiteTeamMember[]) => {
    setPendingIds(next.map(m => m.id));
    void reorder.run(() => cpanelFetch('/api/cpanel/team/reorder', { method: 'POST', json: { ids: next.map(m => m.id) } }))
      .then(() => setPendingIds(null));
  };
  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= ordered.length) return;
    const next = [...ordered];
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  };
  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = ordered.filter(m => m.id !== dragId);
    next.splice(next.findIndex(m => m.id === targetId), 0, byId.get(dragId)!);
    setDragId(null);
    saveOrder(next);
  };

  const toggleShown = (member: SiteTeamMember) => {
    const { id, ...fields } = member;
    return display.run(() => cpanelFetch(`/api/cpanel/team/${id}`, { method: 'PATCH', json: { ...fields, showOnWebsite: !member.showOnWebsite } }));
  };

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Team Members"
        subtitle={`${team.length} member${team.length === 1 ? '' : 's'} · ${shown} displayed on the About page`}
        action={<AddButton onClick={() => setEditing('new')}>Add Member</AddButton>} />
      <ErrorNote message={display.error || reorder.error} />
      <p className="mb-4 flex items-center gap-1.5 text-[13px] text-[#8A8A8A]">
        <GripVertical className="h-4 w-4" aria-hidden="true" /> Drag cards (or use the arrows) to set the order shown on the website.
      </p>
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {ordered.map((member, index) => (
          <div key={member.id} draggable onDragStart={() => setDragId(member.id)} onDragEnd={() => setDragId(null)}
            onDragOver={e => e.preventDefault()} onDrop={() => dropOn(member.id)}
            className={cx('cursor-grab active:cursor-grabbing', dragId === member.id && 'opacity-40')}>
          <Card className={cx('group relative h-full overflow-hidden', !member.showOnWebsite && 'opacity-80')}>
            <div className="relative aspect-[257/206] bg-[#F3F1EA]">
              {member.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={member.image} alt={member.name} className={cx('h-full w-full object-cover', !member.showOnWebsite && 'grayscale-[40%]')} />
                : <div className="flex h-full items-center justify-center text-[#C9C4B6]"><UserRound className="h-14 w-14" /></div>}
              <div className="absolute left-2 top-2 flex flex-wrap gap-1">
                {member.isLead && <span className="inline-flex items-center gap-1 rounded-md bg-[#C89B3C] px-2 py-0.5 text-[11px] font-semibold text-white"><Crown className="h-3 w-3" aria-hidden="true" /> Lead</span>}
                {!member.showOnWebsite && <span className="rounded-md bg-white/90 px-2 py-0.5 text-[11px] font-semibold text-[#8A8A8A]">Not on website</span>}
              </div>
            </div>
            <div className="absolute right-2 top-2 flex gap-1 rounded-lg bg-white/95 p-1 opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <IconButton label={member.showOnWebsite ? `Hide ${member.name} from the website` : `Show ${member.name} on the website`} onClick={() => toggleShown(member)}>
                {member.showOnWebsite ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </IconButton>
              <IconButton label={`Edit ${member.name}`} onClick={() => setEditing(member)}><Pencil className="h-4 w-4" /></IconButton>
              <IconButton label={`Delete ${member.name}`} onClick={() => { del.setError(''); setDeleting(member); }}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
            <div className="p-4">
              <p className="text-[15px] font-semibold text-[#1A1A1A]">{member.name}</p>
              <p className="text-[13px] font-medium text-[#C89B3C]">{member.role}</p>
              {member.department && <p className="text-[12px] text-[#8A8A8A]">{member.department}</p>}
              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#9A9A9A]">{member.bio}</p>
              <div className="mt-3 flex items-center justify-between border-t border-[#F0EEE8] pt-2 text-[12px] text-[#9A9A9A]">
                <span>#{index + 1}</span>
                <span className="flex gap-1">
                  <IconButton label={`Move ${member.name} earlier`} onClick={() => move(index, -1)}><ChevronLeft className="h-4 w-4" /></IconButton>
                  <IconButton label={`Move ${member.name} later`} onClick={() => move(index, 1)}><ChevronRight className="h-4 w-4" /></IconButton>
                </span>
              </div>
            </div>
          </Card>
          </div>
        ))}
        <button type="button" onClick={() => setEditing('new')}
          className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E2DFD5] text-[#9A9A9A] transition-colors hover:border-[#C89B3C] hover:text-[#C89B3C]">
          <Plus className="h-6 w-6" aria-hidden="true" /> <span className="text-[14px] font-medium">Add Member</span>
        </button>
      </div>
      {editing && <MemberForm member={editing === 'new' ? undefined : editing} team={team} onClose={() => setEditing(null)} />}
      <ConfirmDelete open={!!deleting} kind="Team Member" name={deleting?.name ?? ''}
        effect={deleting?.showOnWebsite ? 'They will be removed from the team and the About page.' : 'They will be removed from the team.'}
        busy={del.busy} error={del.error} onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && await del.run(() => cpanelFetch(`/api/cpanel/team/${deleting.id}`, { method: 'DELETE' }))) setDeleting(null);
        }} />
    </div>
  );
}
