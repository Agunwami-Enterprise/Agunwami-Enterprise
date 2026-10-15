'use client';

/** Choose one of the documents, spreadsheets or files you can see (e.g. to share it in a chat). */

import { useEffect, useState } from 'react';
import { FileSpreadsheet, FileText, Loader2, Search, Paperclip } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import { permissionsOf, subscribeDocs, type Viewer, type WorkDoc } from '../doc-store';

export default function PickDocumentDialog({ me, onPick, onClose, note }: {
  me: Viewer;
  onPick: (doc: WorkDoc) => void;
  onClose: () => void;
  /** Shown under the list (e.g. who will be able to open it). */
  note?: string;
}) {
  const [docs, setDocs] = useState<WorkDoc[] | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => subscribeDocs(all => {
    setDocs([...all.values()].filter(d => permissionsOf(d, me).canView).sort((a, b) => (b.updatedAt || b.createdAt).localeCompare(a.updatedAt || a.createdAt)));
  }, () => setDocs([])), [me]);

  const term = search.trim().toLowerCase();
  const shown = (docs ?? []).filter(d => !term || [d.title, d.category, d.owner.name, d.project?.name ?? ''].some(v => v.toLowerCase().includes(term))).slice(0, 80);

  return (
    <AeModal title="Share a document" size="lg" onClose={onClose}>
      <div className="space-y-3">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden="true" />
          <input autoFocus value={search} onChange={e => setSearch(e.target.value)} placeholder="Search documents" aria-label="Search documents"
            className="w-full rounded-lg border border-[#e5e5e5] bg-white py-2 pl-9 pr-3 text-[14px] text-[#292929] outline-none focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100" />
        </label>
        <ul className="max-h-[50dvh] divide-y divide-[#f0f0f0] overflow-y-auto rounded-lg border border-[#e5e5e5] dark:divide-white/5 dark:border-white/10">
          {docs === null ? (
            <li className="flex items-center justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#a3a3a3]" aria-hidden="true" /></li>
          ) : shown.length === 0 ? (
            <li className="py-8 text-center text-[13px] text-[#8a8a8a]">{docs.length ? 'No documents match.' : 'There are no documents you can share yet.'}</li>
          ) : shown.map(d => {
            const Icon = d.kind === 'sheet' ? FileSpreadsheet : d.kind === 'file' ? Paperclip : FileText;
            return (
              <li key={d.id}>
                <button type="button" onClick={() => onPick(d)} className="flex w-full items-center gap-3 px-3 py-2.5 text-left hover:bg-[#fef9e7] dark:hover:bg-white/5">
                  <Icon className={`h-5 w-5 shrink-0 ${d.kind === 'sheet' ? 'text-[#16a34a]' : 'text-[#2563eb]'}`} aria-hidden="true" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[14px] font-medium text-[#292929] dark:text-white">{d.title}</span>
                    <span className="block truncate text-[12px] text-[#8a8a8a]">
                      {[d.kind === 'sheet' ? 'Spreadsheet' : d.kind === 'file' ? 'File' : 'Document', d.category, d.project?.name, d.owner.name].filter(Boolean).join(' · ')}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
        {note && <p className="text-[12px] text-[#8a8a8a]">{note}</p>}
      </div>
    </AeModal>
  );
}
