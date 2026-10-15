'use client';

/** Which project a document or file is filed under (optional). */

import { useEffect, useState } from 'react';
import type { DocProject } from '../doc-store';

export interface ProjectOption extends DocProject { color: string | null }

let cache: Promise<ProjectOption[]> | null = null;

/** The enterprise's projects (loaded once). */
export function loadProjects(): Promise<ProjectOption[]> {
  cache ??= fetch('/api/documents/projects', { cache: 'no-store' })
    .then(res => (res.ok ? res.json() as Promise<{ projects: ProjectOption[] }> : { projects: [] }))
    .then(body => body.projects ?? [])
    .catch(() => { cache = null; return []; });
  return cache;
}

export function useProjects(): ProjectOption[] | null {
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  useEffect(() => {
    let cancelled = false;
    void loadProjects().then(list => { if (!cancelled) setProjects(list); });
    return () => { cancelled = true; };
  }, []);
  return projects;
}

export default function ProjectPicker({ value, onChange, disabled, className }: {
  value: DocProject | null;
  onChange: (project: DocProject | null) => void;
  disabled?: boolean;
  className: string;
}) {
  const projects = useProjects();
  return (
    <select className={className} value={value?.id ?? ''} disabled={disabled || projects === null} aria-label="Project"
      onChange={e => {
        const picked = projects?.find(p => p.id === e.target.value);
        onChange(picked ? { id: picked.id, name: picked.name } : null);
      }}>
      <option value="">{projects === null ? 'Loading projects…' : 'No project'}</option>
      {value && !projects?.some(p => p.id === value.id) && <option value={value.id}>{value.name}</option>}
      {projects?.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
    </select>
  );
}
