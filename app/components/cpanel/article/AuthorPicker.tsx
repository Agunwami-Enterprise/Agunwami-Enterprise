'use client';

/**
 * The article's author: pick anyone in AE or the connected projects (their
 * name, role and photo fill in: the AE profile photo, or the one they have on
 * another article), use yourself, or type a name and role by hand. When no
 * photo is found, the writer is asked to add one.
 */

import { useState } from 'react';
import { doc, getDoc } from 'firebase/firestore';
import { ImagePlus, Loader2, Search, UserRound } from 'lucide-react';
import { authDb } from '@/lib/workstation/firebase';
import type { AuthorOption } from '@/app/api/cpanel/people/route';
import { ImageField, TextInput, cx } from '../ui';

export interface AuthorValue { author: string; authorRole: string; authorImage: string }

/** An AE account's profile photo, if it has one. */
export async function photoOf(uid?: string): Promise<string> {
  if (!uid) return '';
  try {
    const snap = await getDoc(doc(authDb, 'users', uid));
    const photo = snap.data()?.photoURL;
    return typeof photo === 'string' && /^https?:\/\//.test(photo) ? photo : '';
  } catch {
    return '';
  }
}

export default function AuthorPicker({ value, people, me, knownPhotos, onChange }: {
  value: AuthorValue;
  people: AuthorOption[] | null;
  me: AuthorOption | null;
  /** Photos authors have on other articles, by lowercased name. */
  knownPhotos: Map<string, string>;
  onChange: (next: Partial<AuthorValue>) => void;
}) {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [lookingUp, setLookingUp] = useState(false);
  const known = (name: string) => knownPhotos.get(name.trim().toLowerCase()) ?? '';
  const term = query.trim().toLowerCase();
  const matches = (people ?? []).filter(p => !term || p.name.toLowerCase().includes(term) || p.role.toLowerCase().includes(term) || p.source.toLowerCase().includes(term)).slice(0, 30);

  async function pick(person: AuthorOption) {
    setOpen(false);
    setQuery('');
    onChange({ author: person.name, authorRole: person.role, authorImage: known(person.name) });
    if (!person.uid) return;
    setLookingUp(true);
    const photo = await photoOf(person.uid);
    setLookingUp(false);
    onChange({ authorImage: photo || known(person.name) });
  }

  return (
    <div className="space-y-4">
      <div className="relative">
        <label className="relative block">
          <span className="mb-1 block text-[13px] font-medium text-[#3A3A3A]">Find a person</span>
          <Search className="pointer-events-none absolute bottom-2.5 left-3 h-4 w-4 text-[#8C8679]" aria-hidden="true" />
          <input value={query} onChange={e => { setQuery(e.target.value); setOpen(true); }} onFocus={() => setOpen(true)}
            onBlur={() => setTimeout(() => setOpen(false), 150)} onKeyDown={e => { if (e.key === 'Escape') setOpen(false); }}
            placeholder={people === null ? 'Loading people…' : `Search ${people.length} people in AE and projects`}
            role="combobox" aria-autocomplete="list" aria-expanded={open} aria-controls="author-options"
            className="w-full rounded-lg border border-[#E5E2D9] bg-white py-2 pl-9 pr-3 text-[14px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]" />
        </label>
        {open && people && (
          <ul id="author-options" role="listbox" className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-[#E5E2D9] bg-white py-1 shadow-xl">
            {matches.length === 0 && <li className="px-3 py-3 text-center text-[13px] text-[#9A9A9A]">No one matches. Type the name below instead.</li>}
            {matches.map(person => (
              <li key={`${person.source}-${person.uid ?? person.name}`}>
                <button type="button" role="option" aria-selected={value.author === person.name} onMouseDown={e => e.preventDefault()} onClick={() => void pick(person)}
                  className="flex w-full items-center justify-between gap-3 px-3 py-2 text-left hover:bg-[#FBFAF6]">
                  <span className="min-w-0">
                    <span className="block truncate text-[14px] font-medium text-[#1A1A1A]">{person.name}</span>
                    {person.role && <span className="block truncate text-[12px] text-[#6B6B6B]">{person.role}</span>}
                  </span>
                  <span className={cx('shrink-0 rounded-full px-2 py-0.5 text-[11px] font-medium', person.source === 'AE' ? 'bg-[#C89B3C]/15 text-[#8A6A1F]' : 'bg-[#F3F1EA] text-[#6B6B6B]')}>{person.source}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {me?.name && value.author !== me.name && (
        <button type="button" onClick={() => void pick(me)} className="inline-flex items-center gap-1.5 text-[13px] font-semibold text-[#8A6A1F] hover:underline">
          <UserRound className="h-4 w-4" aria-hidden="true" /> Use me ({me.name})
        </button>
      )}
      <TextInput label="Name" value={value.author} onChange={author => onChange({ author })} placeholder="Author's full name"
        onBlur={() => { if (value.author.trim() && !value.authorImage && known(value.author)) onChange({ authorImage: known(value.author) }); }} />
      <TextInput label="Role" value={value.authorRole} onChange={authorRole => onChange({ authorRole })} placeholder="e.g. Head of Research" />
      {value.author.trim() && !value.authorImage && (
        lookingUp ? (
          <p className="flex items-center gap-2 text-[13px] text-[#6B6B6B]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Looking for {value.author.trim()}’s photo…</p>
        ) : (
          <div role="status" className="flex items-start gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2.5 text-[13px] text-amber-800">
            <ImagePlus className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
            <span>No photo found for <strong className="font-semibold">{value.author.trim()}</strong>. Please upload one or paste its address below. It shows beside their name on the article.</span>
          </div>
        )
      )}
      <div data-author-photo>
        <ImageField label="Photo" value={value.authorImage} onChange={authorImage => onChange({ authorImage })} />
      </div>
    </div>
  );
}
