'use client';

/** "Save as template": this document or spreadsheet becomes a template everyone can start from. */

import { useState } from 'react';
import { LayoutTemplate, Loader2 } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import { toast } from 'react-toastify';
import { DOC_CATEGORIES, type Viewer } from '../doc-store';
import { addTemplate } from '../template-store';

export default function SaveTemplateButton({ me, kind, title, category, body }: {
  me: Viewer;
  kind: 'doc' | 'sheet';
  title: string;
  category: string;
  /** The contents when saving: HTML for a document, sheets (JSON) for a spreadsheet. */
  body: () => string;
}) {
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState(title);
  const [description, setDescription] = useState('');
  const [templateCategory, setTemplateCategory] = useState(category || 'Templates');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  async function save() {
    setBusy(true);
    setError('');
    try {
      const contents = body();
      await addTemplate({ label: label.trim(), description, category: templateCategory, kind, ...(kind === 'sheet' ? { sheets: contents } : { content: contents }) }, me);
      toast.success(`“${label.trim()}” is now a template everyone can start from.`);
      setOpen(false);
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'The template could not be saved.');
    } finally {
      setBusy(false);
    }
  }

  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
  return (
    <>
      <button type="button" onClick={() => { setLabel(title); setTemplateCategory(category || 'Templates'); setOpen(true); }}
        className="inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[13px] font-semibold text-[#525252] hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5">
        <LayoutTemplate className="h-4 w-4" aria-hidden="true" /> Save as template
      </button>
      {open && (
        <AeModal title="Save as template" onClose={() => setOpen(false)} dismissible={!busy}
          footer={(
            <>
              <button type="button" onClick={() => setOpen(false)} disabled={busy} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
              <button type="button" onClick={() => void save()} disabled={busy || !label.trim()}
                className="inline-flex items-center gap-2 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
                {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Save template
              </button>
            </>
          )}>
          <div className="space-y-4">
            <p className="text-[13px] text-[#656565] dark:text-gray-400">A copy of it as it is now becomes a template in “New {kind === 'sheet' ? 'spreadsheet' : 'document'}” for everyone. Later changes here don’t change the template.</p>
            <label className="block">
              <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Template name</span>
              <input className={field} value={label} maxLength={80} onChange={e => setLabel(e.target.value)} />
            </label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
                <select className={field} value={templateCategory} onChange={e => setTemplateCategory(e.target.value)}>
                  {!DOC_CATEGORIES.includes(templateCategory) && <option>{templateCategory}</option>}
                  {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </label>
              <label className="block">
                <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Description (optional)</span>
                <input className={field} value={description} maxLength={140} onChange={e => setDescription(e.target.value)} />
              </label>
            </div>
            {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
          </div>
        </AeModal>
      )}
    </>
  );
}
