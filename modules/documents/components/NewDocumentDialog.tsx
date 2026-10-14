'use client';

/** Start a written document: a title, a template, its category and who can see it. */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileText, Loader2 } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import { DOC_CATEGORIES, DOC_TEMPLATES, createDoc, docPath, type DocShare, type HiddenFrom, type Viewer } from '../doc-store';
import HideFromPicker from './HideFromPicker';

export default function NewDocumentDialog({ me, basePath, onClose, team, initial, onCreated }: {
  me: Viewer;
  basePath: string;
  onClose: () => void;
  /** My AE department: "My team" documents are kept under it. */
  team?: { id: string; name: string };
  /** Start with this title, template and category (e.g. a department's handbook). */
  initial?: { title?: string; templateId?: string; category?: string; share?: DocShare };
  /** Called with the new document's id before it opens (e.g. to list it as a department guide). */
  onCreated?: (id: string, title: string) => Promise<void>;
}) {
  const router = useRouter();
  const [title, setTitle] = useState(initial?.title ?? '');
  const [templateId, setTemplateId] = useState(initial?.templateId ?? DOC_TEMPLATES[0].id);
  const [category, setCategory] = useState(initial?.category ?? (DOC_TEMPLATES.find(t => t.id === initial?.templateId) ?? DOC_TEMPLATES[0]).category);
  const [share, setShare] = useState<DocShare>(initial?.share ?? (team || me.department ? 'department' : 'private'));
  const [othersCanEdit, setOthersCanEdit] = useState(false);
  const [hiddenFrom, setHiddenFrom] = useState<HiddenFrom>({ departments: [], people: [] });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const template = DOC_TEMPLATES.find(t => t.id === templateId) ?? DOC_TEMPLATES[0];

  async function create(e?: React.FormEvent) {
    e?.preventDefault();
    setBusy(true);
    setError('');
    try {
      const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      const id = await createDoc({
        title: title.trim() || (template.id === 'blank' ? 'Untitled document' : `${template.label} – ${date}`),
        content: template.content(me.name, date),
        category, description: '', share, othersCanEdit: share !== 'private' && othersCanEdit,
        team: share === 'department' ? team : undefined,
        // Departments are hidden from only when it's shared with the whole company.
        hiddenFrom: share === 'private' ? { departments: [], people: [] } : { departments: share === 'all' ? hiddenFrom.departments : [], people: hiddenFrom.people },
      }, me);
      const finalTitle = title.trim() || (template.id === 'blank' ? 'Untitled document' : `${template.label} – ${date}`);
      await onCreated?.(id, finalTitle);
      router.push(docPath(id, basePath));
    } catch {
      setError('The document could not be created. Please try again.');
      setBusy(false);
    }
  }

  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';

  return (
    <AeModal title="New document" size="lg" onClose={onClose} dismissible={!busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          <button type="submit" form="new-doc" disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Create document
          </button>
        </>
      )}>
      <form id="new-doc" onSubmit={create} className="space-y-5">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Title</span>
          <input className={field} value={title} maxLength={160} onChange={e => setTitle(e.target.value)} autoFocus
            placeholder={template.id === 'blank' ? 'Untitled document' : `${template.label} – today’s date`} />
        </label>

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-[#525252] dark:text-gray-300">Start from</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {DOC_TEMPLATES.map(t => (
              <button key={t.id} type="button" aria-pressed={templateId === t.id} onClick={() => { setTemplateId(t.id); setCategory(t.category); }}
                className={`relative flex flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${templateId === t.id
                  ? 'border-[#f5bd02] bg-[#fef9e7] dark:bg-[#f5bd02]/10' : 'border-[#e5e5e5] hover:border-[#d4d4d4] dark:border-white/10'}`}>
                <FileText className="h-5 w-5 text-[#806013] dark:text-[#f5bd02]" aria-hidden="true" />
                <span className="text-[13px] font-semibold text-[#292929] dark:text-white">{t.label}</span>
                <span className="text-[12px] leading-snug text-[#8a8a8a]">{t.description}</span>
                {templateId === t.id && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-[#806013] dark:text-[#f5bd02]" aria-hidden="true" />}
              </button>
            ))}
          </div>
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Who can see it</span>
            <select className={field} value={share} onChange={e => setShare(e.target.value as DocShare)}>
              <option value="private">Only me</option>
              {(team || me.department) && <option value="department">{team ? `My team (${team.name})` : 'My department'}</option>}
              <option value="all">Everyone in the company</option>
            </select>
          </label>
        </div>
        <label className="flex items-start gap-2 text-[13px] text-[#525252] dark:text-gray-300">
          <input type="checkbox" checked={share !== 'private' && othersCanEdit} disabled={share === 'private'} onChange={e => setOthersCanEdit(e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
          <span>Others can edit<span className="block text-[12px] text-[#8a8a8a]">Everyone who can see it can change it, one person at a time. You can change this later.</span></span>
        </label>
        <HideFromPicker value={hiddenFrom} onChange={setHiddenFrom} share={share} ownerUid={me.uid} />
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </form>
    </AeModal>
  );
}
