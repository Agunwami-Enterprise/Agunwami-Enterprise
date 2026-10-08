'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Activity, ExternalLink, Eye, EyeOff, LayoutDashboard, Pencil, Plus } from 'lucide-react';
import { Button, Card, EmptyState, ErrorNote, IconButton, Modal, PageHeader, cpanelFetch, cx, useMutation } from './ui';
import type { ProjectKind, SiteProject } from '@/backend/modules/site-content/site-content.types';

const TABS: { key: 'all' | ProjectKind; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'client', label: 'Client projects' },
  { key: 'ecosystem', label: 'Ecosystem platforms' },
];

export function ProjectsManager({ projects }: { projects: SiteProject[] }) {
  const [tab, setTab] = useState<'all' | ProjectKind>('all');
  const [hiding, setHiding] = useState<SiteProject | null>(null);
  const visibility = useMutation();
  const visible = tab === 'all' ? projects : projects.filter(p => p.kind === tab);
  const count = (kind: ProjectKind) => projects.filter(p => p.kind === kind).length;

  const setPublished = (project: SiteProject, published: boolean) =>
    visibility.run(() => cpanelFetch('/api/ceo/projects', { method: 'PATCH', json: { id: project.id, websitePublished: published } }));

  return (
    <div className="mx-auto max-w-[1075px]">
      <PageHeader title="Projects"
        subtitle={`${count('client')} client project${count('client') === 1 ? '' : 's'} · ${count('ecosystem')} ecosystem platform${count('ecosystem') === 1 ? '' : 's'} · shared with the AE workstation`}
        action={(
          <Link href="/cpanel/projects/new" className="inline-flex items-center gap-2 rounded-lg bg-[#1F1F1F] px-4 py-2.5 text-[14px] font-semibold text-white hover:bg-black">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add Project
          </Link>
        )} />
      <div className="mb-5 flex flex-wrap gap-2" role="tablist">
        {TABS.map(({ key, label }) => (
          <button key={key} type="button" role="tab" aria-selected={tab === key} onClick={() => setTab(key)}
            className={cx('rounded-lg border px-4 py-2 text-[14px] font-semibold transition-colors',
              tab === key ? 'border-[#C89B3C] bg-[#C89B3C] text-white' : 'border-[#E5E2D9] bg-white text-[#5A5A5A] hover:bg-[#F7F5EF]')}>
            {label} <span className="ml-1 text-[12px] font-normal opacity-70">({key === 'all' ? projects.length : count(key)})</span>
          </button>
        ))}
      </div>
      <ErrorNote message={hiding ? '' : visibility.error} />
      <Card className="overflow-hidden">
        {visible.length === 0 ? <EmptyState>No projects here yet.</EmptyState> : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-left">
              <thead className="bg-[#F7F5EF] text-[11px] font-semibold uppercase tracking-[0.08em] text-[#6B6B6B]">
                <tr><th className="px-7 py-4">Project</th><th className="px-4 py-4">Category</th><th className="px-4 py-4">Technologies</th><th className="px-4 py-4"><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody className="divide-y divide-[#F0EEE8]">
                {visible.map(project => (
                  <tr key={project.id} className={cx('hover:bg-[#FBFAF6]', !project.published && 'bg-[#FCFBF8]')}>
                    <td className="px-4 py-5">
                      <div className="flex items-center gap-3">
                        {project.image
                          // eslint-disable-next-line @next/next/no-img-element
                          ? <img src={project.image} alt="" className={cx('h-10 w-10 shrink-0 rounded-md object-cover', !project.published && 'opacity-50')} />
                          : <span className="h-10 w-10 shrink-0 rounded-md bg-[#F3F1EA]" />}
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Link href={`/cpanel/projects/${project.id}`} className="text-[15px] font-semibold text-[#1A1A1A] hover:underline">{project.name}</Link>
                            {project.kind === 'ecosystem' && <span className="rounded bg-purple-50 px-1.5 py-0.5 text-[11px] font-semibold text-purple-700">Ecosystem</span>}
                            {!project.published && <span className="rounded bg-[#F3F1EA] px-1.5 py-0.5 text-[11px] font-semibold text-[#8A8A8A]">Hidden</span>}
                            {project.apiEndpoint && project.hasApiToken && (
                              <span title="Metrics connected" className="inline-flex items-center gap-1 rounded bg-green-50 px-1.5 py-0.5 text-[11px] font-semibold text-green-700">
                                <Activity className="h-3 w-3" aria-hidden="true" /> Metrics
                              </span>
                            )}
                          </div>
                          <p className="line-clamp-2 max-w-[300px] text-[13px] text-[#9A9A9A]">{project.subtitle || project.homeDescription}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-5">
                      {project.category && <span className="rounded-md bg-[#FBF3E1] px-2 py-1 text-[13px] font-semibold text-[#C89B3C]">{project.category}</span>}
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
                        {project.adminUrl && <IconButton label="Open admin" href={project.adminUrl}><LayoutDashboard className="h-4 w-4" /></IconButton>}
                        {project.published && <IconButton label="View on website" href={`/projects/${project.slug}`}><ExternalLink className="h-4 w-4" /></IconButton>}
                        <Link href={`/cpanel/projects/${project.id}`} aria-label={`Edit ${project.name}`} title="Edit"
                          className="rounded-md p-1.5 text-[#8A8A8A] hover:bg-[#F3F1EA] hover:text-[#1A1A1A]"><Pencil className="h-4 w-4" /></Link>
                        {project.published
                          ? <IconButton label="Remove from website" onClick={() => { visibility.setError(''); setHiding(project); }}><EyeOff className="h-4 w-4" /></IconButton>
                          : <IconButton label="Show on website" onClick={() => setPublished(project, true)}><Eye className="h-4 w-4" /></IconButton>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      <Modal open={!!hiding} title="Remove from website" onClose={() => setHiding(null)} width="max-w-[480px]"
        footer={(
          <>
            <Button variant="outline" onClick={() => setHiding(null)}>Cancel</Button>
            <Button variant="danger" busy={visibility.busy}
              onClick={async () => { if (hiding && await setPublished(hiding, false)) setHiding(null); }}>
              <EyeOff className="h-4 w-4" aria-hidden="true" /> Remove
            </Button>
          </>
        )}>
        <p className="text-[15px] text-[#3A3A3A]">Remove <strong>{hiding?.name}</strong> from the website?</p>
        <p className="text-[14px] text-[#9A9A9A]">It disappears from the public projects pages but stays in the AE workstation with its metrics. You can show it again any time.</p>
        <ErrorNote message={visibility.error} />
      </Modal>
    </div>
  );
}
