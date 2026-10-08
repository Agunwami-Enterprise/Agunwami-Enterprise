'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp, GripVertical, Pencil, Trash2 } from 'lucide-react';
import {
  AddButton, Button, Card, ConfirmDelete, EmptyState, ErrorNote, IconButton, IconPicker, Modal, PageHeader,
  SaveButton, TextArea, TextInput, cpanelFetch, cx, useMutation,
} from './ui';
import type { SiteIconName, SitePartnershipCategory } from '@/backend/modules/site-content/site-content.types';

function CategoryForm({ category, nextNumber, onClose }: {
  category?: SitePartnershipCategory; nextNumber: string; onClose: () => void;
}) {
  const [draft, setDraft] = useState({
    number: category?.number ?? nextNumber,
    title: category?.title ?? '',
    icon: (category?.icon ?? 'Handshake') as SiteIconName,
    description: category?.description ?? '',
    benefits: category?.benefits.join('\n') ?? '',
  });
  const { busy, error, run } = useMutation();

  async function save() {
    const ok = await run(() => category
      ? cpanelFetch(`/api/cpanel/partnership-categories/${category.id}`, { method: 'PATCH', json: draft })
      : cpanelFetch('/api/cpanel/partnership-categories', { method: 'POST', json: draft }));
    if (ok) onClose();
  }

  return (
    <Modal open title={category ? 'Edit Category' : 'Add Category'} onClose={onClose}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SaveButton busy={busy} onClick={save}>{category ? 'Save Changes' : 'Add Category'}</SaveButton>
        </>
      )}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput label="Number" value={draft.number} onChange={number => setDraft(d => ({ ...d, number }))} maxLength={4} />
        <TextInput label="Title *" value={draft.title} onChange={title => setDraft(d => ({ ...d, title }))} />
      </div>
      <IconPicker value={draft.icon} onChange={icon => setDraft(d => ({ ...d, icon }))} />
      <TextArea label="Description" value={draft.description} onChange={description => setDraft(d => ({ ...d, description }))} rows={3} />
      <TextArea label="Benefits" hint="one per line" value={draft.benefits} onChange={benefits => setDraft(d => ({ ...d, benefits }))} rows={5} />
      <ErrorNote message={error} />
    </Modal>
  );
}

export function PartnershipsManager({ categories }: { categories: SitePartnershipCategory[] }) {
  // Order shown while a reorder is being saved; the server's order otherwise.
  const [pendingIds, setPendingIds] = useState<string[] | null>(null);
  const byId = new Map(categories.map(c => [c.id, c]));
  const order = pendingIds?.map(id => byId.get(id)).filter((c): c is SitePartnershipCategory => !!c) ?? categories;
  const [dragId, setDragId] = useState<string | null>(null);
  const [editing, setEditing] = useState<SitePartnershipCategory | 'new' | null>(null);
  const [deleting, setDeleting] = useState<SitePartnershipCategory | null>(null);
  const reorder = useMutation();
  const del = useMutation();

  const saveOrder = (next: SitePartnershipCategory[]) => {
    setPendingIds(next.map(c => c.id));
    void reorder.run(() => cpanelFetch('/api/cpanel/partnership-categories/reorder', {
      method: 'POST', json: { ids: next.map(c => c.id) },
    })).then(() => setPendingIds(null));
  };

  const move = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= order.length) return;
    const next = [...order];
    [next[index], next[target]] = [next[target], next[index]];
    saveOrder(next);
  };

  const dropOn = (targetId: string) => {
    if (!dragId || dragId === targetId) return;
    const next = order.filter(c => c.id !== dragId);
    next.splice(next.findIndex(c => c.id === targetId), 0, order.find(c => c.id === dragId)!);
    setDragId(null);
    saveOrder(next);
  };

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Partnership Categories"
        subtitle={`${order.length} categor${order.length === 1 ? 'y' : 'ies'} · displayed on the Partnerships page`}
        action={<AddButton onClick={() => setEditing('new')}>Add Category</AddButton>} />
      <ErrorNote message={reorder.error} />
      {order.length === 0 && <Card><EmptyState>No categories yet.</EmptyState></Card>}
      <ul className="space-y-5">
        {order.map((category, index) => (
          <li key={category.id} draggable onDragStart={() => setDragId(category.id)} onDragEnd={() => setDragId(null)}
            onDragOver={e => e.preventDefault()} onDrop={() => dropOn(category.id)}
            className={cx('transition-opacity', dragId === category.id && 'opacity-40')}>
            <Card className="flex gap-4 p-5">
              <div className="flex flex-col items-center gap-1 pt-1 text-[#C9C4B6]">
                <GripVertical className="h-4 w-4 cursor-grab" aria-hidden="true" />
                <button type="button" aria-label={`Move ${category.title} up`} disabled={index === 0 || reorder.busy}
                  onClick={() => move(index, -1)} className="rounded hover:text-[#1A1A1A] disabled:opacity-30"><ChevronUp className="h-4 w-4" /></button>
                <button type="button" aria-label={`Move ${category.title} down`} disabled={index === order.length - 1 || reorder.busy}
                  onClick={() => move(index, 1)} className="rounded hover:text-[#1A1A1A] disabled:opacity-30"><ChevronDown className="h-4 w-4" /></button>
              </div>
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-[#FBF3E1] text-[13px] font-semibold text-[#C89B3C]">
                {category.number}
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-[16px] font-semibold text-[#1A1A1A]">{category.title}</h2>
                  <span className="rounded bg-[#F3F1EA] px-1.5 py-0.5 text-[11px] text-[#9A9A9A]">{category.icon}</span>
                </div>
                <p className="mt-1 text-[14px] text-[#5A5A5A]">{category.description}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {category.benefits.map(benefit => (
                    <span key={benefit} className="rounded border border-[#F1E3C2] bg-[#FDF8EC] px-2 py-0.5 text-[12px] text-[#B98A2C]">{benefit}</span>
                  ))}
                </div>
              </div>
              <div className="flex shrink-0 items-start gap-1">
                <IconButton label={`Edit ${category.title}`} onClick={() => setEditing(category)}><Pencil className="h-4 w-4" /></IconButton>
                <IconButton label={`Delete ${category.title}`} onClick={() => { del.setError(''); setDeleting(category); }}><Trash2 className="h-4 w-4" /></IconButton>
              </div>
            </Card>
          </li>
        ))}
      </ul>
      {editing && (
        <CategoryForm category={editing === 'new' ? undefined : editing}
          nextNumber={String(order.length + 1).padStart(2, '0')} onClose={() => setEditing(null)} />
      )}
      <ConfirmDelete open={!!deleting} kind="Category" name={deleting?.title ?? ''} effect="It will be removed from the Partnerships page."
        busy={del.busy} error={del.error} onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && await del.run(() => cpanelFetch(`/api/cpanel/partnership-categories/${deleting.id}`, { method: 'DELETE' }))) setDeleting(null);
        }} />
    </div>
  );
}
