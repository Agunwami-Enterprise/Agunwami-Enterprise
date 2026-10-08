'use client';

import { useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ExternalLink, Pencil, Trash2 } from 'lucide-react';
import {
  AddButton, Button, Card, ConfirmDelete, EmptyState, ErrorNote, IconButton, IconPicker, ImageField, Modal,
  PageHeader, SaveButton, Select, TextArea, TextInput, cpanelFetch, useMutation,
} from './ui';
import type { SiteIconName, SiteProject } from '@/backend/modules/site-content/site-content.types';

const CATEGORIES = ['E-Commerce', 'Non-Profit', 'Retail', 'Corporate', 'Education', 'Healthcare', 'Finance', 'Logistics', 'Government', 'Other'];

type Draft = {
  name: string; category: string; subtitle: string; homeDescription: string; description: string;
  challenges: string; solution: string; technologyStack: string; image: string; websiteUrl: string;
  status: string; icon: SiteIconName; stats: string; deliverables: string;
};

function toDraft(project?: SiteProject): Draft {
  return {
    name: project?.name ?? '',
    category: project?.category ?? '',
    subtitle: project?.subtitle ?? '',
    homeDescription: project?.homeDescription ?? '',
    description: project?.description ?? '',
    challenges: project?.challenges ?? '',
    solution: project?.solution ?? '',
    technologyStack: project?.technologyStack.join(', ') ?? '',
    image: project?.image ?? '',
    websiteUrl: project?.websiteUrl ?? '',
    status: project?.status ?? 'ACTIVE',
    icon: project?.icon ?? 'Briefcase',
    stats: project?.stats.map(stat => `${stat.value} | ${stat.label}`).join('\n') ?? '',
    deliverables: project?.deliverables.join('\n') ?? '',
  };
}

function ProjectForm({ project, onClose }: { project?: SiteProject; onClose: () => void }) {
  const [draft, setDraft] = useState(() => toDraft(project));
  const { busy, error, run } = useMutation();
  const set = <K extends keyof Draft>(key: K) => (value: Draft[K]) => setDraft(d => ({ ...d, [key]: value }));
  const categories = draft.category && !CATEGORIES.includes(draft.category) ? [draft.category, ...CATEGORIES] : CATEGORIES;

  async function save() {
    const json = { ...draft, technologyStack: draft.technologyStack.split(',').map(t => t.trim()).filter(Boolean) };
    const ok = await run(() => project
      ? cpanelFetch(`/api/cpanel/projects/${project.id}`, { method: 'PATCH', json })
      : cpanelFetch('/api/cpanel/projects', { method: 'POST', json }));
    if (ok) onClose();
  }

  return (
    <Modal open title={project ? 'Edit Project' : 'Add Project'} onClose={onClose}
      footer={(
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <SaveButton busy={busy} onClick={save}>{project ? 'Save Changes' : 'Add Project'}</SaveButton>
        </>
      )}>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput label="Title *" value={draft.name} onChange={set('name')} placeholder="Project Name" />
        <Select label="Category *" value={draft.category} onChange={set('category')} options={categories} placeholder="Select category" />
      </div>
      <TextInput label="Tagline" value={draft.subtitle} onChange={set('subtitle')} placeholder="Short tagline..." />
      <TextArea label="Overview" value={draft.description} onChange={set('description')} rows={3} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextArea label="Challenge" value={draft.challenges} onChange={set('challenges')} />
        <TextArea label="Solution" value={draft.solution} onChange={set('solution')} />
      </div>
      <TextInput label="Card description" hint="shown on project cards" value={draft.homeDescription} onChange={set('homeDescription')} />
      <TextInput label="Technologies" hint="comma separated" value={draft.technologyStack} onChange={set('technologyStack')} placeholder="React, Node.js, Stripe" />
      <ImageField label="Project image" value={draft.image} onChange={set('image')} />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <TextInput label="Live website URL" value={draft.websiteUrl} onChange={set('websiteUrl')} placeholder="https://..." />
        <Select label="Status" value={draft.status} onChange={set('status')} options={['ACTIVE', 'IN DEVELOPMENT', 'COMPLETED']} />
      </div>
      <IconPicker value={draft.icon} onChange={set('icon')} />
      <TextArea label="Key results" hint="one per line: value | label" value={draft.stats} onChange={set('stats')} rows={3}
        placeholder={'15+ | Vendors onboarded at launch\n2× | Monthly growth'} />
      <TextArea label="Deliverables" hint="one per line" value={draft.deliverables} onChange={set('deliverables')} rows={4} />
      <ErrorNote message={error} />
    </Modal>
  );
}

export function ProjectsManager({ projects }: { projects: SiteProject[] }) {
  const searchParams = useSearchParams();
  const [editing, setEditing] = useState<SiteProject | 'new' | null>(searchParams.get('new') ? 'new' : null);
  const [deleting, setDeleting] = useState<SiteProject | null>(null);
  const del = useMutation();

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Projects" subtitle={`${projects.length} client project${projects.length === 1 ? '' : 's'}`}
        action={<AddButton onClick={() => setEditing('new')}>Add Project</AddButton>} />
      <Card className="overflow-hidden">
        {projects.length === 0 ? <EmptyState>No projects yet.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[760px] text-left">
              <thead className="bg-[#F7F5EF] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                <tr><th className="px-7 py-4">Project</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Technologies</th><th className="px-4 py-4"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE8]">
                {projects.map(project => (
                  <tr key={project.id} className="hover:bg-[#FBFAF6]">
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        {project.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={project.image} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
                          : <span className="h-10 w-10 shrink-0 rounded-md bg-[#F3F1EA]" />}
                        <div className="min-w-0">
                          <p className="text-[15px] font-semibold text-[#1A1A1A]">{project.name}</p>
                          <p className="line-clamp-2 max-w-[260px] text-[13px] text-[#9A9A9A]">{project.subtitle || project.homeDescription}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <span className="rounded-md bg-[#FBF3E1] px-2 py-1 text-[13px] font-semibold text-[#C89B3C]">{project.category}</span>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {project.technologyStack.slice(0, 3).map(tech => (
                          <span key={tech} className="rounded bg-[#F3F1EA] px-1.5 py-0.5 text-[12px] text-[#5A5A5A]">{tech}</span>
                        ))}
                        {project.technologyStack.length > 3 && <span className="text-[12px] text-[#9A9A9A]">+{project.technologyStack.length - 3}</span>}
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      <div className="flex justify-end gap-1">
                        <IconButton label="View on website" href={`/projects/${project.slug}`}><ExternalLink className="h-4 w-4" /></IconButton>
                        <IconButton label="Edit" onClick={() => setEditing(project)}><Pencil className="h-4 w-4" /></IconButton>
                        <IconButton label="Delete" onClick={() => { del.setError(''); setDeleting(project); }}><Trash2 className="h-4 w-4" /></IconButton>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      {editing && <ProjectForm project={editing === 'new' ? undefined : editing} onClose={() => setEditing(null)} />}
      <ConfirmDelete open={!!deleting} kind="Project" name={deleting?.name ?? ''} effect="This will remove it from the public projects page."
        busy={del.busy} error={del.error} onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (deleting && await del.run(() => cpanelFetch(`/api/cpanel/projects/${deleting.id}`, { method: 'DELETE' }))) setDeleting(null);
        }} />
    </div>
  );
}
