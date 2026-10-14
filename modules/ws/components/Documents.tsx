'use client';

/**
 * Department workstation → Documents (/ws/documents): AE Hub's shared
 * documents, live: company-wide ones, your department's, and your own.
 * Uploading saves the file to AE Hub's storage and the record in AE Hub's
 * own shape, so it shows in AE Hub too; you can delete what you uploaded.
 * "New document" writes one here instead (see modules/documents/doc-store).
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, deleteDoc, doc, increment, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { deleteObject, getDownloadURL, ref, uploadBytesResumable } from 'firebase/storage';
import { Download, FilePlus2, FileText, FolderOpen, HardDrive, Pencil, Search, Trash2, Upload, Users } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { authDb, storage } from '@/lib/workstation/firebase';
import { useConfirm } from '@/app/components/common/AeModal';
import { subscribeUserProfile } from '@/modules/settings/services';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, Tabs, btnGhost, btnPrimary, field } from './ui';
import { Overlay } from './task-board';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import NewDocumentDialog from '@/modules/documents/components/NewDocumentDialog';
import { DOC_FORMAT, docPath } from '@/modules/documents/doc-store';

const CATEGORIES = ['Policy & Handbook', 'Finance & Budget', 'Operations', 'Onboarding', 'Templates', 'Technical', 'Legal', 'General'];
const MAX_BYTES = 25 * 1024 * 1024;

interface WsDocument {
  id: string; name: string; url: string; storagePath: string; size: number; formattedSize: string;
  type: string; category: string; department: string; uploadedBy: string; uploadedByUid: string;
  description: string; createdAt: string; downloadCount: number;
  /** Written in the workstation (opens in the editor) rather than uploaded. */
  written: boolean; othersCanEdit: boolean;
}

function toDocument(id: string, d: Record<string, unknown>): WsDocument {
  return {
    id, name: String(d.name ?? 'Untitled'), url: String(d.url ?? ''), storagePath: String(d.storagePath ?? ''),
    size: Number(d.size ?? 0) || 0, formattedSize: String(d.formattedSize ?? ''), type: String(d.type ?? 'OTHER'),
    category: String(d.category ?? 'General'), department: String(d.department ?? 'all'), uploadedBy: String(d.uploadedBy ?? ''),
    uploadedByUid: String(d.uploadedByUid ?? ''), description: String(d.description ?? ''), createdAt: String(d.createdAt ?? ''),
    downloadCount: Number(d.downloadCount ?? 0) || 0,
    written: d.format === DOC_FORMAT, othersCanEdit: d.othersCanEdit === true,
  };
}

function fileType(name: string, mime: string): string {
  const ext = name.split('.').pop()?.toLowerCase() ?? '';
  if (ext === 'pdf') return 'PDF';
  if (['xls', 'xlsx', 'csv'].includes(ext)) return 'XLSX';
  if (['doc', 'docx'].includes(ext)) return 'DOCX';
  if (['ppt', 'pptx'].includes(ext)) return 'PPTX';
  if (['zip', 'rar', '7z'].includes(ext)) return 'ZIP';
  if (mime.startsWith('image/')) return 'IMAGE';
  return 'OTHER';
}

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const dateLabel = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

type Tab = 'all' | 'company' | 'department' | 'mine';

const scopeOf = (d: WsDocument) => (d.department === 'all' ? 'company' : d.department === 'private' ? 'private' : 'department');

export default function Documents() {
  const { user } = useAuth();
  const router = useRouter();
  const access = useWorkstationAccess();
  const confirm = useConfirm();
  const uid = user?.uid ?? '';
  const [docs, setDocs] = useState<WsDocument[] | null>(null);
  const [error, setError] = useState('');
  const [department, setDepartment] = useState('');
  const [tab, setTab] = useState<Tab>('all');
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);

  useEffect(() => onSnapshot(collection(authDb, 'documents'),
    snap => { setDocs(snap.docs.map(d => toDocument(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setError(''); },
    () => { setDocs([]); setError('Documents could not be loaded.'); }), []);
  useEffect(() => (uid ? subscribeUserProfile(uid, p => setDepartment(String(p?.department ?? '').toLowerCase())) : undefined), [uid]);

  // What this person can see: company-wide, their department's, and their own uploads.
  const visible = (docs ?? []).filter(d => d.department === 'all' || (department && d.department.toLowerCase() === department) || d.uploadedByUid === uid);
  const term = search.trim().toLowerCase();
  const shown = visible.filter(d => {
    if (tab === 'company' && d.department !== 'all') return false;
    if (tab === 'department' && scopeOf(d) !== 'department') return false;
    if (tab === 'mine' && d.uploadedByUid !== uid) return false;
    if (category && d.category !== category) return false;
    if (term && ![d.name, d.description, d.uploadedBy, d.category].some(v => v.toLowerCase().includes(term))) return false;
    return true;
  });
  const totalBytes = visible.reduce((n, d) => n + d.size, 0);

  async function open(d: WsDocument) {
    if (d.written) router.push(docPath(d.id));
    else window.open(d.url, '_blank', 'noopener,noreferrer');
    await updateDoc(doc(authDb, 'documents', d.id), { downloadCount: increment(1) }).catch(() => undefined);
  }

  async function remove(d: WsDocument) {
    if (!(await confirm({ title: `Delete ${d.name}?`, message: 'It’s removed for everyone, in AE Hub too. This can’t be undone.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await deleteDoc(doc(authDb, 'documents', d.id));
      if (d.storagePath) await deleteObject(ref(storage, d.storagePath)).catch(() => undefined);
    } catch {
      setError(`${d.name} could not be deleted.`);
    }
  }

  return (
    <div className="ae-stagger flex flex-col gap-6 p-4 md:p-8">
      <PageHeader title="Documents" subtitle="Write documents or upload files, shared with your department or the company (and AE Hub)"
        actions={(
          <div className="flex flex-wrap gap-2">
            <button className={btnGhost} onClick={() => setUploading(true)}><Upload className="h-4 w-4" aria-hidden /> Upload</button>
            <button className={btnPrimary} onClick={() => setCreating(true)} disabled={!uid}><FilePlus2 className="h-4 w-4" aria-hidden /> New document</button>
          </div>
        )} />

      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Documents" icon={FileText} iconClass="text-[#2563eb]" value={docs === null ? '…' : String(visible.length)} sub="You can open" />
        <StatTile label="Company-wide" icon={FolderOpen} iconClass="text-[#f59e0b]" value={docs === null ? '…' : String(visible.filter(d => d.department === 'all').length)} sub="Shared with everyone" />
        <StatTile label="My Department" icon={Users} iconClass="text-[#16a34a]" value={docs === null ? '…' : String(visible.filter(d => scopeOf(d) === 'department').length)} sub={department ? `AE Hub: ${department}` : 'Department files'} />
        <StatTile label="Storage" icon={HardDrive} iconClass="text-[#7c3aed]" value={docs === null ? '…' : sizeLabel(totalBytes)} sub={`${visible.filter(d => d.uploadedByUid === uid).length} of them yours`} />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'company', label: 'Company' }, { id: 'department', label: 'My Department' }, { id: 'mine', label: 'Mine' }]} />

      <Card title="Files" icon={FolderOpen} action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row">
          <label className="relative block sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden />
            <input className={`${field} pl-9`} placeholder="Search documents" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search documents" />
          </label>
          <select className={`${field} sm:w-48`} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
        </div>
      }>
        {docs === null ? <Empty>Loading…</Empty> : shown.length === 0 ? <Empty>{visible.length === 0 ? 'No documents yet. Write one with “New document”, or upload a file.' : 'No documents match.'}</Empty> : (
          <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
            {shown.map(d => (
              <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[10px] font-bold text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">{d.type === 'OTHER' ? 'FILE' : d.type}</span>
                  <div className="min-w-0">
                    {d.written
                      ? <button type="button" onClick={() => void open(d)} className="block max-w-full truncate text-left text-[14px] font-semibold text-[#292929] hover:underline dark:text-white">{d.name}</button>
                      : <p className="truncate text-[14px] font-semibold text-[#292929] dark:text-white">{d.name}</p>}
                    <p className="truncate text-[12px] text-[#656565] dark:text-gray-400">
                      {[d.uploadedBy, dateLabel(d.createdAt), d.formattedSize || sizeLabel(d.size), `${d.downloadCount} open${d.downloadCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                    </p>
                    {d.description && <p className="truncate text-[12px] text-[#525252] dark:text-gray-300">{d.description}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-12 sm:pl-0">
                  <Pill label={d.category} tone="gray" />
                  <Pill label={{ company: 'Company', department: 'Department', private: 'Only me' }[scopeOf(d)]} tone={{ company: 'amber', department: 'green', private: 'gray' }[scopeOf(d)] as 'amber' | 'green' | 'gray'} />
                  <button className="rounded-lg p-1.5 text-[#525252] hover:bg-black/5 dark:text-gray-300 dark:hover:bg-white/5" onClick={() => void open(d)}
                    aria-label={`${d.written ? 'Open' : 'Download'} ${d.name}`} title={d.written ? (d.uploadedByUid === uid || d.othersCanEdit ? 'Open to edit' : 'Open to read') : 'Download'} disabled={!d.written && !d.url}>
                    {d.written ? <Pencil className="h-4 w-4" /> : <Download className="h-4 w-4" />}
                  </button>
                  {d.uploadedByUid === uid && (
                    <button className="rounded-lg p-1.5 text-[#a3a3a3] hover:bg-red-50 hover:text-[#dc2626] dark:hover:bg-red-500/10" onClick={() => void remove(d)} aria-label={`Delete ${d.name}`}>
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </Card>

      {creating && user && (
        <NewDocumentDialog basePath="/ws/documents" onClose={() => setCreating(false)}
          me={{ uid, name: user.displayName || user.email || 'Team member', email: user.email || '', department, isCeo: access.kind === 'ceo' }} />
      )}
      {uploading && <UploadDialog department={department} me={{ uid, name: user?.displayName || user?.email || 'Team member', email: user?.email || '' }} onClose={() => setUploading(false)} />}
    </div>
  );
}

function UploadDialog({ department, me, onClose }: { department: string; me: { uid: string; name: string; email: string }; onClose: () => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('General');
  const [share, setShare] = useState<'department' | 'all'>(department ? 'department' : 'all');
  const [description, setDescription] = useState('');
  const [progress, setProgress] = useState<number | null>(null);
  const [error, setError] = useState('');

  async function upload() {
    if (!file) return;
    if (file.size > MAX_BYTES) { setError('Files can be up to 25 MB.'); return; }
    setError('');
    setProgress(0);
    const target = share === 'all' ? 'all' : department;
    const storagePath = `documents/${target}/${Date.now()}_${file.name.replace(/[^\w.\- ]+/g, '_')}`;
    try {
      const task = uploadBytesResumable(ref(storage, storagePath), file, { contentType: file.type || undefined });
      await new Promise<void>((resolve, reject) => task.on('state_changed',
        snap => setProgress(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)), reject, () => resolve()));
      const url = await getDownloadURL(task.snapshot.ref);
      const now = new Date();
      await setDoc(doc(collection(authDb, 'documents')), {
        name: file.name, url, storagePath, size: file.size, formattedSize: sizeLabel(file.size),
        dateModified: now.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        type: fileType(file.name, file.type), category, department: target,
        uploadedBy: me.name, uploadedByUid: me.uid, uploadedByEmail: me.email, description: description.trim(),
        createdAt: now.toISOString(), updatedAt: now.toISOString(), downloadCount: 0,
      });
      onClose();
    } catch {
      setError('The upload failed. Please try again.');
      setProgress(null);
    }
  }

  const busy = progress !== null;
  return (
    <Overlay title="Upload a Document" onClose={() => { if (!busy) onClose(); }} footer={
      <>
        <button className={btnGhost} onClick={onClose} disabled={busy}>Cancel</button>
        <button className={btnPrimary} onClick={() => void upload()} disabled={!file || busy}>{busy ? `Uploading ${progress}%…` : 'Upload'}</button>
      </>
    }>
      <button type="button" onClick={() => input.current?.click()} disabled={busy}
        className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#d4d4d4] px-4 py-6 text-center hover:border-[#f5bd02] dark:border-white/15">
        <Upload className="h-6 w-6 text-[#a3a3a3]" aria-hidden />
        <span className="text-[14px] font-medium text-[#292929] dark:text-gray-100">{file ? file.name : 'Choose a file'}</span>
        <span className="text-[12px] text-[#8a8a8a]">{file ? sizeLabel(file.size) : 'PDF, Word, Excel, PowerPoint, images or zip, up to 25 MB'}</span>
      </button>
      <input ref={input} type="file" className="hidden" onChange={e => setFile(e.target.files?.[0] ?? null)} />
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
          <select className={field} value={category} onChange={e => setCategory(e.target.value)}>{CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Share with</span>
          <select className={field} value={share} onChange={e => setShare(e.target.value as 'department' | 'all')}>
            {department && <option value="department">My department</option>}
            <option value="all">Everyone (company-wide)</option>
          </select>
        </label>
      </div>
      <label className="block">
        <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Description (optional)</span>
        <input className={field} value={description} maxLength={300} onChange={e => setDescription(e.target.value)} />
      </label>
      {busy && <div className="h-2 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-white/10"><div className="h-full bg-[#f5bd02] transition-all" style={{ width: `${progress}%` }} /></div>}
      {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
    </Overlay>
  );
}
