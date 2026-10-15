'use client';

/** Choose the AE departments a document is shared with. */

import { useEffect, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import type { SharedDepartment } from '../doc-store';

let cache: Promise<SharedDepartment[]> | null = null;

/** The AE departments (loaded once per page). */
export function loadDepartments(): Promise<SharedDepartment[]> {
  cache ??= fetch('/api/departments', { cache: 'no-store' })
    .then(res => (res.ok ? res.json() : Promise.reject(new Error())))
    .then((body: { departments: SharedDepartment[] }) => body.departments)
    .catch(err => { cache = null; throw err; });
  return cache;
}

export default function DepartmentPicker({ value, onChange, disabled, ownTeamId }: {
  value: SharedDepartment[];
  onChange: (next: SharedDepartment[]) => void;
  disabled?: boolean;
  /** Marks "your team" in the list. */
  ownTeamId?: string;
}) {
  const [departments, setDepartments] = useState<SharedDepartment[] | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadDepartments().then(list => { if (!cancelled) setDepartments(list); }).catch(() => { if (!cancelled) setFailed(true); });
    return () => { cancelled = true; };
  }, []);

  const chosen = new Set(value.map(d => d.id));
  const toggle = (d: SharedDepartment) => onChange(chosen.has(d.id) ? value.filter(x => x.id !== d.id) : [...value, d]);

  if (failed) return <p className="text-[12px] text-red-600">Departments couldn’t be loaded. Reload the page to try again.</p>;
  if (!departments) return <p className="flex items-center gap-2 text-[12px] text-[#8a8a8a]"><Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> Loading departments…</p>;

  return (
    <div>
      <div role="group" aria-label="Departments to share with" className="flex flex-wrap gap-1.5">
        {departments.map(d => {
          const on = chosen.has(d.id);
          return (
            <button key={d.id} type="button" aria-pressed={on} disabled={disabled} onClick={() => toggle(d)}
              className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors disabled:cursor-default ${on
                ? 'border-[#f5bd02] bg-[#fef3c7] text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]'
                : 'border-[#e5e5e5] text-[#525252] hover:border-[#d4d4d4] dark:border-white/10 dark:text-gray-300'}`}>
              {on && <Check className="h-3 w-3" aria-hidden="true" />}
              {d.name}{d.id === ownTeamId ? ' (your team)' : ''}
            </button>
          );
        })}
      </div>
      <p className="mt-1.5 text-[12px] text-[#8a8a8a]">
        {value.length ? `Shared with ${value.length} department${value.length === 1 ? '' : 's'}. ` : 'Choose at least one department. '}
        The CEO sees every document.
      </p>
    </div>
  );
}
