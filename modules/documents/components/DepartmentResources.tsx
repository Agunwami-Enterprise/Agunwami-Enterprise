'use client';

/**
 * A department's guides, handbooks, manuals and links. Its people see and
 * open them; its admin and the CEO add and remove them. A guide can be a
 * link, an uploaded file or a document written here; files and documents are
 * kept in Documents under the department's team (and the CEO sees them all).
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { BookOpen, ExternalLink, FileText, FileUp, Link2, Loader2, PenLine, Plus, Trash2, Upload } from 'lucide-react';
import AeModal, { useConfirm } from '@/app/components/common/AeModal';
import { useAuth } from '@/lib/workstation/auth-context';
import {
  RESOURCE_KINDS, RESOURCE_KIND_LABELS, type DepartmentResource, type ResourceKind,
} from '@/backend/modules/departments/departments.types';
import { MAX_FILE_BYTES, openDocument, sizeLabel, uploadFileDoc, type Viewer } from '../doc-store';
import NewDocumentDialog from './NewDocumentDialog';

interface Loaded { departmentName: string; resources: DepartmentResource[]; canManage: boolean }

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json' }, cache: 'no-store' });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(body.error || 'Something went wrong. Please try again.');
  return body as T;
}

const KIND_STYLE: Record<ResourceKind, string> = {
  guide: 'bg-blue-50 text-blue-700 dark:bg-blue-500/15 dark:text-blue-300',
  handbook: 'bg-amber-50 text-amber-800 dark:bg-amber-500/15 dark:text-amber-300',
  manual: 'bg-purple-50 text-purple-700 dark:bg-purple-500/15 dark:text-purple-300',
  policy: 'bg-green-50 text-green-700 dark:bg-green-500/15 dark:text-green-300',
  other: 'bg-gray-100 text-gray-600 dark:bg-white/10 dark:text-gray-300',
};

export default function DepartmentResources({ departmentId, basePath, isCeo, aeHubDepartment = '', className = '' }: {
  departmentId: string;
  /** Where written documents open: /ws/documents or /ceo/documents. */
  basePath: string;
  isCeo: boolean;
  /** The viewer's AE Hub department (lowercased), if known. */
  aeHubDepartment?: string;
  className?: string;
}) {
  const router = useRouter();
  const confirm = useConfirm();
  const { user } = useAuth();
  const [data, setData] = useState<Loaded | null>(null);
  const [error, setError] = useState('');
  const [adding, setAdding] = useState(false);
  const [opening, setOpening] = useState('');

  const load = useCallback(async () => {
    try {
      setData(await api<Loaded>(`/api/departments/${encodeURIComponent(departmentId)}/resources`));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Guides could not be loaded.');
    }
  }, [departmentId]);

  useEffect(() => {
    const t = setTimeout(() => void load(), 0);
    return () => clearTimeout(t);
  }, [load]);

  const me: Viewer | null = user ? {
    uid: user.uid, name: user.displayName || user.email || 'Team member', email: user.email || '',
    department: aeHubDepartment, isCeo, aeDepartmentId: isCeo ? '' : departmentId,
  } : null;

  async function open(r: DepartmentResource) {
    if (r.type === 'link') { window.open(r.url, '_blank', 'noopener,noreferrer'); return; }
    setOpening(r.id);
    try {
      const target = await openDocument(r.documentId, basePath);
      if (!target) setError(`“${r.title}” is no longer in Documents. Remove it, or add it again.`);
      else if (target.kind === 'page') router.push(target.href);
      else window.open(target.href, '_blank', 'noopener,noreferrer');
    } catch {
      setError(`“${r.title}” could not be opened.`);
    } finally {
      setOpening('');
    }
  }

  async function remove(r: DepartmentResource) {
    const ok = await confirm({
      title: `Remove “${r.title}”?`,
      message: r.type === 'document' ? 'It’s taken off this list. The document stays in Documents under the team; delete it there if it’s no longer needed.' : 'The link is taken off this list.',
      confirmLabel: 'Remove', tone: 'danger',
    });
    if (!ok) return;
    try {
      const result = await api<{ resources: DepartmentResource[] }>(`/api/departments/${encodeURIComponent(departmentId)}/resources?resourceId=${encodeURIComponent(r.id)}`, { method: 'DELETE' });
      setData(d => (d ? { ...d, resources: result.resources } : d));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'It could not be removed.');
    }
  }

  const resources = data?.resources ?? [];
  if (data && !data.canManage && resources.length === 0 && !error) return null;

  return (
    <section className={`rounded-2xl border border-[#e5e5e5] bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#1e1e1e] ${className}`}>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-[#f5bd02]" aria-hidden="true" />
          <div>
            <h3 className="text-[15px] font-semibold text-[#292929] dark:text-white">Guides &amp; handbooks</h3>
            <p className="text-[12px] text-[#8a8a8a]">{data ? `For the ${data.departmentName} team` : 'Loading…'}</p>
          </div>
        </div>
        {data?.canManage && (
          <button type="button" onClick={() => setAdding(true)} disabled={!me}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5bd02] disabled:opacity-50 px-3 py-1.5 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90">
            <Plus className="h-4 w-4" aria-hidden="true" /> Add
          </button>
        )}
      </div>

      {error && <p role="alert" className="mb-3 text-[13px] text-red-600 dark:text-red-400">{error}</p>}
      {!data && !error && <p className="flex items-center gap-2 text-[13px] text-[#8a8a8a]"><Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading…</p>}
      {data && resources.length === 0 && (
        <p className="rounded-lg bg-[#fafafa] px-4 py-5 text-center text-[13px] text-[#656565] dark:bg-white/5 dark:text-gray-400">
          No guides yet. Add the team’s handbook, manual or a useful link so everyone can find it here.
        </p>
      )}
      {resources.length > 0 && (
        <ul className="divide-y divide-[#f0f0f0] dark:divide-white/10">
          {resources.map(r => (
            <li key={r.id} className="flex items-center gap-3 py-2.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">
                {r.type === 'link' ? <Link2 className="h-4 w-4" /> : r.documentFormat === 'written' ? <FileText className="h-4 w-4" /> : <FileUp className="h-4 w-4" />}
              </span>
              <button type="button" onClick={() => void open(r)} className="min-w-0 flex-1 text-left">
                <span className="block truncate text-[14px] font-semibold text-[#292929] hover:underline dark:text-white">{r.title}</span>
                <span className="block truncate text-[12px] text-[#8a8a8a]">
                  {r.type === 'link' ? new URL(r.url).hostname.replace(/^www\./, '') : r.documentFormat === 'written' ? 'Document' : 'File'} · in {r.type === 'link' ? 'a new tab' : 'Documents'}
                </span>
              </button>
              <span className={`hidden shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold sm:inline ${KIND_STYLE[r.kind]}`}>{RESOURCE_KIND_LABELS[r.kind]}</span>
              {opening === r.id ? <Loader2 className="h-4 w-4 animate-spin text-[#8a8a8a]" aria-hidden="true" />
                : r.type === 'link' ? <ExternalLink className="h-4 w-4 shrink-0 text-[#a3a3a3]" aria-hidden="true" /> : null}
              {data?.canManage && (
                <button type="button" onClick={() => void remove(r)} aria-label={`Remove ${r.title}`} title="Remove from the list"
                  className="rounded-lg p-1.5 text-[#a3a3a3] hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
              )}
            </li>
          ))}
        </ul>
      )}

      {adding && data && me && (
        <AddResourceDialog departmentId={departmentId} departmentName={data.departmentName} me={me} basePath={basePath}
          onAdded={resources => setData(d => (d ? { ...d, resources } : d))} onClose={() => setAdding(false)} />
      )}
    </section>
  );
}

function AddResourceDialog({ departmentId, departmentName, me, basePath, onAdded, onClose }: {
  departmentId: string; departmentName: string; me: Viewer; basePath: string;
  onAdded: (resources: DepartmentResource[]) => void; onClose: () => void;
}) {
  const [type, setType] = useState<'link' | 'file' | 'write'>('link');
  const [kind, setKind] = useState<ResourceKind>('handbook');
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [writing, setWriting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const team = { id: departmentId, name: departmentName };
  const kindLabel = RESOURCE_KIND_LABELS[kind];

  const addResource = (body: Record<string, unknown>) =>
    api<{ resources: DepartmentResource[] }>(`/api/departments/${encodeURIComponent(departmentId)}/resources`, { method: 'POST', body: JSON.stringify(body) })
      .then(r => onAdded(r.resources));

  async function submit(e?: React.FormEvent) {
    e?.preventDefault();
    setError('');
    if (type === 'write') { setWriting(true); return; }
    const name = title.trim() || (type === 'file' && file ? file.name.replace(/\.[^.]+$/, '') : '');
    if (!name) { setError('Give it a title.'); return; }
    setBusy(true);
    try {
      if (type === 'link') {
        const href = /^[a-z][\w+.-]*:/i.test(url.trim()) ? url.trim() : `https://${url.trim()}`;
        await addResource({ type: 'link', kind, title: name, url: href });
      } else {
        if (!file) { setError('Choose a file.'); setBusy(false); return; }
        if (file.size > MAX_FILE_BYTES) { setError('Files can be up to 25 MB.'); setBusy(false); return; }
        setProgress(0);
        const documentId = await uploadFileDoc(file, {
          category: 'Policy & Handbook', description: `${kindLabel} for the ${departmentName} team`, where: { team },
        }, me, setProgress);
        await addResource({ type: 'document', kind, title: name, documentId, documentFormat: 'file' });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'It could not be added.');
      setProgress(null);
      setBusy(false);
    }
  }

  if (writing) {
    return (
      <NewDocumentDialog me={me} basePath={basePath} team={team} onClose={onClose}
        initial={{ title: title.trim() || `${departmentName} ${kindLabel.toLowerCase()}`, templateId: kind === 'policy' ? 'policy' : 'handbook', category: 'Policy & Handbook', share: 'department' }}
        onCreated={async (documentId, docTitle) => { await addResource({ type: 'document', kind, title: docTitle, documentId, documentFormat: 'written' }); }} />
    );
  }

  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
  const tabs = [
    { id: 'link' as const, label: 'Link', Icon: Link2 },
    { id: 'file' as const, label: 'Upload a file', Icon: Upload },
    { id: 'write' as const, label: 'Write a document', Icon: PenLine },
  ];

  return (
    <AeModal title={`Add a guide for ${departmentName}`} onClose={onClose} dismissible={!busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          <button type="submit" form="add-resource" disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {type === 'write' ? 'Next: write it' : busy && progress !== null ? `Uploading ${progress}%…` : 'Add'}
          </button>
        </>
      )}>
      <form id="add-resource" onSubmit={submit} className="space-y-4">
        <div role="tablist" aria-label="What to add" className="flex gap-1 rounded-lg bg-[#f5f5f5] p-1 dark:bg-white/5">
          {tabs.map(({ id, label, Icon }) => (
            <button key={id} type="button" role="tab" aria-selected={type === id} onClick={() => { setType(id); setError(''); }}
              className={`flex flex-1 items-center justify-center gap-1.5 rounded-md py-1.5 text-[13px] font-semibold ${type === id ? 'bg-white text-[#1a1a1a] shadow-sm dark:bg-[#2a2a2a] dark:text-white' : 'text-[#656565] hover:text-[#1a1a1a] dark:text-gray-400'}`}>
              <Icon className="h-4 w-4" aria-hidden="true" /> {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-[160px_minmax(0,1fr)]">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Type</span>
            <select className={field} value={kind} onChange={e => setKind(e.target.value as ResourceKind)}>
              {RESOURCE_KINDS.map(k => <option key={k} value={k}>{RESOURCE_KIND_LABELS[k]}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Title</span>
            <input className={field} value={title} maxLength={120} onChange={e => setTitle(e.target.value)}
              placeholder={type === 'file' && file ? file.name.replace(/\.[^.]+$/, '') : `e.g. ${departmentName} ${kindLabel.toLowerCase()}`} />
          </label>
        </div>

        {type === 'link' && (
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Link</span>
            <input className={field} value={url} onChange={e => setUrl(e.target.value)} placeholder="https://docs.google.com/… or any web address" inputMode="url" />
          </label>
        )}
        {type === 'file' && (
          <>
            <button type="button" onClick={() => fileRef.current?.click()} disabled={busy}
              className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#d4d4d4] px-4 py-6 text-center hover:border-[#f5bd02] dark:border-white/15">
              <Upload className="h-6 w-6 text-[#a3a3a3]" aria-hidden="true" />
              <span className="text-[14px] font-medium text-[#292929] dark:text-gray-100">{file ? file.name : 'Choose a file'}</span>
              <span className="text-[12px] text-[#8a8a8a]">{file ? sizeLabel(file.size) : 'PDF, Word, Excel, PowerPoint, images or zip, up to 25 MB'}</span>
            </button>
            <input ref={fileRef} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
            {progress !== null && <div className="h-2 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-white/10"><div className="h-full bg-[#f5bd02] transition-all" style={{ width: `${progress}%` }} /></div>}
          </>
        )}
        {type === 'write' && (
          <p className="rounded-lg bg-[#fafafa] px-4 py-3 text-[13px] text-[#525252] dark:bg-white/5 dark:text-gray-300">
            Next you’ll choose a template (the handbook one is a good start) and write it in the document editor.
          </p>
        )}
        <p className="text-[12px] text-[#8a8a8a]">
          {type === 'link' ? 'Links open in a new tab.' : `It’s kept in Documents under the ${departmentName} team, so its people find it there too. The CEO sees every document.`}
        </p>
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </form>
    </AeModal>
  );
}

