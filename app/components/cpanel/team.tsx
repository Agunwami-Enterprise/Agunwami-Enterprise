'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Pencil, Plus, Trash2, UserRound } from 'lucide-react';
import {
  AddButton, Button, Card, ConfirmDelete, ErrorNote, IconButton, ImageField, Modal, PageHeader, SaveButton,
  TextArea, TextInput, cpanelFetch, useMutation,
} from './ui';
import type { SiteTeamMember } from '@/backend/modules/site-content/site-content.types';

type Draft = Omit<SiteTeamMember, 'id'>;

function MemberForm({ member, onClose }: { member?: SiteTeamMember; onClose: () => void }) {
  const [draft, setDraft] = useState<Draft>({
    name: member?.name ?? '', role: member?.role ?? '', bio: member?.bio ?? '',
    image: member?.image ?? '', linkedin: member?.linkedin ?? '',
  });
  const { busy, error, run } = useMutation();
  const set = (key: keyof Draft) => (value: string) => setDraft(d => ({ ...d, [key]: value }));

  async function save() {
    const ok = await run(() => member
      ? cpanelFetch(`/api/cpanel/team/${member.id}`, { method: 'PATCH', json: draft })
      : cpanelFetch('/api/cpanel/team', { method: 'POST', json: draft }));
    if (ok) onClose();
  }

  return (
    <Modal open title={member ? 'Edit Team Member' : 'Add Team Member'} onClose={onClose} width="max-w-[520px]"
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

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Team Members"
        subtitle={`${team.length} member${team.length === 1 ? '' : 's'} · displayed on the About page`}
        action={<AddButton onClick={() => setEditing('new')}>Add Member</AddButton>} />
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {team.map(member => (
          <Card key={member.id} className="group relative overflow-hidden">
            <div className="aspect-[257/206] bg-[#F3F1EA]">
              {member.image
                // eslint-disable-next-line @next/next/no-img-element
                ? <img src={member.image} alt={member.name} className="h-full w-full object-cover" />
                : <div className="flex h-full items-center justify-center text-[#C9C4B6]"><UserRound className="h-14 w-14" /></div>}
            </div>
            <div className="absolute right-2 top-2 flex gap-1 rounded-lg bg-white/95 p-1 opacity-100 shadow-sm transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100">
              <IconButton label={`Edit ${member.name}`} onClick={() => setEditing(member)}><Pencil className="h-4 w-4" /></IconButton>
              <IconButton label={`Delete ${member.name}`} onClick={() => { del.setError(''); setDeleting(member); }}><Trash2 className="h-4 w-4" /></IconButton>
            </div>
            <div className="p-4">
              <p className="text-[15px] font-semibold text-[#1A1A1A]">{member.name}</p>
              <p className="text-[13px] font-medium text-[#C89B3C]">{member.role}</p>
              <p className="mt-2 line-clamp-3 text-[13px] leading-relaxed text-[#9A9A9A]">{member.bio}</p>
            </div>
          </Card>
        ))}
        <button type="button" onClick={() => setEditing('new')}
          className="flex min-h-[300px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-[#E2DFD5] text-[#9A9A9A] transition-colors hover:border-[#C89B3C] hover:text-[#C89B3C]">
          <Plus className="h-6 w-6" aria-hidden="true" /> <span className="text-[14px] font-medium">Add Member</span>
        </button>
      </div>
      {editing && <MemberForm member={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDelete open={!!deleting} kind="Team Member" name={deleting?.name ?? ''} effect="They will be removed from the About page."
        busy={del.busy} error={del.error} onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && await del.run(() => cpanelFetch(`/api/cpanel/team/${deleting.id}`, { method: 'DELETE' }))) setDeleting(null);
        }} />
    </div>
  );
}
