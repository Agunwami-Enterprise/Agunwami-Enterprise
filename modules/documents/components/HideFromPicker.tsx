'use client';

/**
 * Choose departments and people a shared document is hidden from: they can't
 * see it in their list or open it. Departments apply when it's shared with
 * the whole company; people whenever it's shared.
 */

import { useEffect, useMemo, useState } from 'react';
import { EyeOff, Search, X } from 'lucide-react';
import { loadAudience, type DocDepartment, type DocPerson, type DocShare, type HiddenFrom } from '../doc-store';

export default function HideFromPicker({ value, onChange, share, ownerUid, disabled }: {
  value: HiddenFrom;
  onChange: (next: HiddenFrom) => void;
  share: DocShare;
  ownerUid: string;
  disabled?: boolean;
}) {
  const [audience, setAudience] = useState<{ departments: DocDepartment[]; people: DocPerson[] } | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');

  useEffect(() => {
    let cancelled = false;
    loadAudience().then(a => { if (!cancelled) setAudience(a); }).catch(() => { if (!cancelled) setLoadError(true); });
    return () => { cancelled = true; };
  }, []);

  const term = query.trim().toLowerCase();
  const people = useMemo(() => (audience?.people ?? [])
    .filter(p => p.uid !== ownerUid && !value.people.some(h => h.uid === p.uid))
    .filter(p => !term || p.name.toLowerCase().includes(term) || p.email.toLowerCase().includes(term))
    .slice(0, 8), [audience, ownerUid, value.people, term]);
  const departments = (audience?.departments ?? []).filter(d => !value.departments.some(h => h.id === d.id));

  if (share === 'private') return null;

  const chip = 'inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[12px] font-medium text-red-700 dark:bg-red-500/10 dark:text-red-300';
  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] disabled:bg-[#f7f7f7] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';

  return (
    <div className="space-y-3">
      <p className="flex items-center gap-1.5 text-[13px] font-medium text-[#525252] dark:text-gray-300">
        <EyeOff className="h-4 w-4" aria-hidden="true" /> Hide from
      </p>

      {share === 'all' && (
        <div className="space-y-2">
          {value.departments.length > 0 && (
            <ul className="flex flex-wrap gap-1.5" aria-label="Hidden from departments">
              {value.departments.map(d => (
                <li key={d.id} className={chip}>
                  {d.name}
                  {!disabled && <button type="button" aria-label={`Show to ${d.name} again`} onClick={() => onChange({ ...value, departments: value.departments.filter(x => x.id !== d.id) })}><X className="h-3 w-3" /></button>}
                </li>
              ))}
            </ul>
          )}
          <select className={field} value="" disabled={disabled || !audience} aria-label="Hide from a department"
            onChange={e => { const d = departments.find(x => x.id === e.target.value); if (d) onChange({ ...value, departments: [...value.departments, d] }); }}>
            <option value="">{audience ? 'Hide from a department…' : loadError ? 'Departments couldn’t be loaded' : 'Loading departments…'}</option>
            {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
          </select>
        </div>
      )}

      <div className="space-y-2">
        {value.people.length > 0 && (
          <ul className="flex flex-wrap gap-1.5" aria-label="Hidden from people">
            {value.people.map(p => (
              <li key={p.uid} className={chip} title={p.email}>
                {p.name}
                {!disabled && <button type="button" aria-label={`Show to ${p.name} again`} onClick={() => onChange({ ...value, people: value.people.filter(x => x.uid !== p.uid) })}><X className="h-3 w-3" /></button>}
              </li>
            ))}
          </ul>
        )}
        {!disabled && (
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden="true" />
            <input className={`${field} pl-9`} value={query} onChange={e => setQuery(e.target.value)} disabled={!audience} aria-label="Hide from a person"
              placeholder={audience ? 'Hide from a person: search by name or email' : loadError ? 'People couldn’t be loaded' : 'Loading people…'} />
            {term && audience && (
              <ul className="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-lg border border-[#e5e5e5] bg-white py-1 shadow-xl dark:border-white/10 dark:bg-[#1e1e1e]">
                {people.length === 0 && <li className="px-3 py-2.5 text-center text-[12px] text-[#8a8a8a]">No one matches.</li>}
                {people.map(p => (
                  <li key={p.uid}>
                    <button type="button" onClick={() => { onChange({ ...value, people: [...value.people, p] }); setQuery(''); }}
                      className="block w-full px-3 py-2 text-left hover:bg-[#f5f5f5] dark:hover:bg-white/5">
                      <span className="block text-[13px] font-medium text-[#292929] dark:text-gray-100">{p.name}</span>
                      <span className="block text-[12px] text-[#8a8a8a]">{p.email}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
      <p className="text-[12px] text-[#8a8a8a]">
        {share === 'all' ? 'People in these departments, and these people, won’t see or open it.' : 'These people in your department won’t see or open it.'} The CEO can still read every document.
      </p>
    </div>
  );
}
