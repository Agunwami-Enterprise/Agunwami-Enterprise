'use client';

/**
 * Department workstation → Documents (/ws/documents): AE Hub's shared
 * documents, live: company-wide ones, your department's, and your own.
 * Uploading saves the file to AE Hub's storage and the record in AE Hub's
 * own shape, so it shows in AE Hub too; you can delete what you uploaded.
 * "New document" writes one here instead (see modules/documents/doc-store).
 */

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, deleteDoc, doc, increment, onSnapshot, updateDoc } from 'firebase/firestore';
import { deleteObject, ref } from 'firebase/storage';
import { Download, Eye, FilePlus2, FileText, FolderOpen, HardDrive, Loader2, Pencil, Search, Trash2, Upload, Users } from 'lucide-react';
import { useAuth } from '@/lib/workstation/auth-context';
import { authDb, storage } from '@/lib/workstation/firebase';
import { useConfirm } from '@/app/components/common/AeModal';
import { subscribeUserProfile } from '@/modules/settings/services';
import { Card, Empty, ErrorNote, PageHeader, Pill, StatTile, Tabs, btnGhost, btnPrimary, field } from './ui';
import { useWorkstationAccess } from '@/lib/workstation/access-context';
import NewDocumentDialog from '@/modules/documents/components/NewDocumentDialog';
import {
  DOC_FORMAT, SHEET_FORMAT, canBecomeEditable, docPath, downloadDocCopy, editNote, fileDownloadHref, makeFileEditable, opensHere, sharedDepartmentsOf, type SharedDepartment, type Viewer,
} from '@/modules/documents/doc-store';
import UploadDialog, { UPLOAD_CATEGORIES as CATEGORIES } from '@/modules/documents/components/UploadDialog';
import DepartmentResources from '@/modules/documents/components/DepartmentResources';


interface WsDocument {
  id: string; name: string; url: string; storagePath: string; size: number; formattedSize: string;
  type: string; category: string; department: string; uploadedBy: string; uploadedByUid: string;
  description: string; createdAt: string; downloadCount: number;
  /** Written in the workstation (opens in the editor) rather than uploaded. */
  written: boolean; othersCanEdit: boolean;
  /** Kept under an AE department's team. */
  aeDepartmentId: string; aeDepartmentName: string;
  /** Shared with these AE departments. */
  sharedDepartments: SharedDepartment[];
  /** The project it's filed under ('' if none). */
  projectId: string; projectName: string;
}

function toDocument(id: string, d: Record<string, unknown>): WsDocument {
  return {
    id, name: String(d.name ?? 'Untitled'), url: String(d.url ?? ''), storagePath: String(d.storagePath ?? ''),
    size: Number(d.size ?? 0) || 0, formattedSize: String(d.formattedSize ?? ''), type: String(d.type ?? 'OTHER'),
    category: String(d.category ?? 'General'), department: String(d.department ?? 'all'), uploadedBy: String(d.uploadedBy ?? ''),
    uploadedByUid: String(d.uploadedByUid ?? ''), description: String(d.description ?? ''), createdAt: String(d.createdAt ?? ''),
    downloadCount: Number(d.downloadCount ?? 0) || 0,
    written: d.format === DOC_FORMAT || d.format === SHEET_FORMAT, othersCanEdit: d.othersCanEdit === true,
    aeDepartmentId: String(d.aeDepartmentId ?? ''), aeDepartmentName: String(d.aeDepartmentName ?? ''),
    sharedDepartments: sharedDepartmentsOf(d),
    projectId: String(d.projectId ?? ''), projectName: String(d.projectName ?? ''),
  };
}

const sizeLabel = (bytes: number) => (bytes >= 1024 * 1024 ? `${(bytes / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(bytes / 1024))} KB`);
const dateLabel = (iso: string) => (iso ? new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');

type Tab = 'all' | 'company' | 'department' | 'mine';

const action = 'inline-flex items-center gap-1.5 rounded-lg px-2 py-1.5 text-[12px] font-semibold text-[#525252] hover:bg-black/5 disabled:opacity-40 dark:text-gray-300 dark:hover:bg-white/5';

const scopeOf = (d: WsDocument) => (d.aeDepartmentId || d.department === 'departments' ? 'department' : d.department === 'all' ? 'company' : d.department === 'private' ? 'private' : 'department');

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
  const [project, setProject] = useState('');
  const [uploading, setUploading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [converting, setConverting] = useState('');

  useEffect(() => onSnapshot(collection(authDb, 'documents'),
    snap => { setDocs(snap.docs.map(d => toDocument(d.id, d.data())).sort((a, b) => b.createdAt.localeCompare(a.createdAt))); setError(''); },
    () => { setDocs([]); setError('Documents could not be loaded.'); }), []);
  useEffect(() => (uid ? subscribeUserProfile(uid, p => setDepartment(String(p?.department ?? '').toLowerCase())) : undefined), [uid]);

  // What this person can see: company-wide, their department's, and their own; the CEO sees everything.
  const isCeo = access.kind === 'ceo';
  // My team: my AE department (its guides and team documents live there).
  const team = access.kind === 'department' && access.departmentId ? { id: access.departmentId, name: access.departmentName } : undefined;
  const sharedWithMe = (d: WsDocument) => (d.department === 'all'
    || (d.department === 'departments' ? !!team && d.sharedDepartments.some(x => x.id === team.id)
      : d.aeDepartmentId ? d.aeDepartmentId === team?.id : !!department && d.department.toLowerCase() === department));
  const visible = (docs ?? []).filter(d => isCeo || d.uploadedByUid === uid || sharedWithMe(d));
  // Written documents: who can change them (the owner, or everyone it's shared with when allowed). The CEO reads.
  // Files from before owners were recorded have none: whoever can see them may edit them (as with articles).
  const canEditDoc = (d: WsDocument) => d.uploadedByUid === uid || (d.othersCanEdit && sharedWithMe(d)) || (!d.uploadedByUid && (isCeo || sharedWithMe(d)));
  const me: Viewer = { uid, name: user?.displayName || user?.email || 'Team member', email: user?.email || '', department, isCeo, aeDepartmentId: team?.id ?? '' };
  const term = search.trim().toLowerCase();
  const shown = visible.filter(d => {
    if (tab === 'company' && d.department !== 'all') return false;
    if (tab === 'department' && scopeOf(d) !== 'department') return false;
    if (tab === 'mine' && d.uploadedByUid !== uid) return false;
    if (category && d.category !== category) return false;
    if (project && d.projectId !== project) return false;
    if (term && ![d.name, d.description, d.uploadedBy, d.category].some(v => v.toLowerCase().includes(term))) return false;
    return true;
  });
  const totalBytes = visible.reduce((n, d) => n + d.size, 0);
  const projectOptions = [...new Map(visible.filter(d => d.projectId).map(d => [d.projectId, d.projectName || 'Project'])).entries()].sort((a, b) => a[1].localeCompare(b[1]));

  // Written documents open here, for editing when you can (you can switch to viewing there) and for reading otherwise.
  async function open(d: WsDocument) {
    // Word, text and web page files are shown in the document view; PDFs and others in the browser's viewer.
    if (d.written || opensHere(d.name, d.url)) router.push(docPath(d.id));
    else window.open(d.url, '_blank', 'noopener,noreferrer');
    await updateDoc(doc(authDb, 'documents', d.id), { downloadCount: increment(1) }).catch(() => undefined);
  }

  // A copy to keep: a written document as a Word file (an uploaded one downloads through its link).
  async function download(d: WsDocument) {
    try {
      await downloadDocCopy(d.id);
      await updateDoc(doc(authDb, 'documents', d.id), { downloadCount: increment(1) }).catch(() => undefined);
    } catch {
      setError(`${d.name} could not be downloaded.`);
    }
  }

  // An uploaded Word, text or web page file becomes a written document, kept in the same place.
  async function editFile(d: WsDocument) {
    if (!(await confirm({
      title: `Edit ${d.name} here?`,
      message: `It opens in the document editor and is kept as a written document in the same place, shared the same way. The original file stays available to download from the document’s details. ${editNote(d.name, d.url)}${d.uploadedByUid ? '' : ' It has no owner yet, so you’ll become its owner.'}`,
      confirmLabel: 'Open in editor',
    }))) return;
    setConverting(d.id);
    setError('');
    try {
      await makeFileEditable(d.id, me, d.name, d.url);
      router.push(docPath(d.id));
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : `${d.name} could not be opened for editing.`);
      setConverting('');
    }
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

      {team && <DepartmentResources departmentId={team.id} basePath="/ws/documents" isCeo={false} aeHubDepartment={department} />}

      <Tabs<Tab> value={tab} onChange={setTab} tabs={[{ id: 'all', label: 'All' }, { id: 'company', label: 'Company' }, { id: 'department', label: 'My Department' }, { id: 'mine', label: 'Mine' }]} />

      <Card title="Files" icon={FolderOpen} action={
        <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap">
          <label className="relative block sm:w-60">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#a3a3a3]" aria-hidden />
            <input className={`${field} pl-9`} placeholder="Search documents" value={search} onChange={e => setSearch(e.target.value)} aria-label="Search documents" />
          </label>
          <select className={`${field} sm:w-48`} value={category} onChange={e => setCategory(e.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {CATEGORIES.map(c => <option key={c}>{c}</option>)}
          </select>
          {/* Projects the documents here are filed under */}
          {projectOptions.length > 0 && (
            <select className={`${field} sm:w-48`} value={project} onChange={e => setProject(e.target.value)} aria-label="Project">
              <option value="">All projects</option>
              {projectOptions.map(([id, name]) => <option key={id} value={id}>{name}</option>)}
            </select>
          )}
        </div>
      }>
        {docs === null ? <Empty>Loading…</Empty> : shown.length === 0 ? <Empty>{visible.length === 0 ? 'No documents yet. Write one with “New document”, or upload a file.' : 'No documents match.'}</Empty> : (
          <ul className="divide-y divide-[#e5e5e5] dark:divide-white/10">
            {shown.map(d => (
              <li key={d.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-start gap-3">
                  <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[#fef3c7] text-[10px] font-bold text-[#806013] dark:bg-[#f5bd02]/15 dark:text-[#f5bd02]">{d.type === 'OTHER' ? 'FILE' : d.type}</span>
                  <div className="min-w-0">
                    <button type="button" onClick={() => void open(d)} disabled={!d.written && !d.url} className="block max-w-full truncate text-left text-[14px] font-semibold text-[#292929] hover:underline dark:text-white">{d.name}</button>
                    <p className="truncate text-[12px] text-[#656565] dark:text-gray-400">
                      {[d.uploadedBy, dateLabel(d.createdAt), d.formattedSize || sizeLabel(d.size), `${d.downloadCount} open${d.downloadCount === 1 ? '' : 's'}`].filter(Boolean).join(' · ')}
                    </p>
                    {d.description && <p className="truncate text-[12px] text-[#525252] dark:text-gray-300">{d.description}</p>}
                  </div>
                </div>
                <div className="flex shrink-0 flex-wrap items-center gap-2 pl-12 sm:pl-0">
                  {d.projectName && <Pill label={d.projectName} tone="blue" />}
                  <Pill label={d.category} tone="gray" />
                  <Pill label={{ company: 'Company', department: d.department === 'departments' ? (d.sharedDepartments.length === 1 ? `${d.sharedDepartments[0].name} team` : `${d.sharedDepartments.length} departments`) : d.aeDepartmentName ? `${d.aeDepartmentName} team` : 'Department', private: d.uploadedByUid === uid ? 'Only me' : 'Private' }[scopeOf(d)]} tone={{ company: 'amber', department: 'green', private: 'gray' }[scopeOf(d)] as 'amber' | 'green' | 'gray'} />
                  {d.written ? (
                    <button className={action} onClick={() => void open(d)} aria-label={`${canEditDoc(d) ? 'Edit' : 'View'} ${d.name}`}
                      title={canEditDoc(d) ? 'Open it to edit (you can switch to viewing there)' : 'Open it to read'}>
                      {canEditDoc(d) ? <Pencil className="h-4 w-4" aria-hidden /> : <Eye className="h-4 w-4" aria-hidden />}
                      {canEditDoc(d) ? 'Edit' : 'View'}
                    </button>
                  ) : (
                    <>
                      {canBecomeEditable(d.name, d.url) && canEditDoc(d) && (
                        <button className={action} onClick={() => void editFile(d)} disabled={!!converting} aria-label={`Edit ${d.name}`} title="Open it in the editor to edit it">
                          {converting === d.id ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : <Pencil className="h-4 w-4" aria-hidden />} Edit
                        </button>
                      )}
                      <button className={action} onClick={() => void open(d)} disabled={!d.url} aria-label={`View ${d.name}`} title={opensHere(d.name, d.url) ? 'Look at it here' : 'Open the file in a new tab'}>
                        <Eye className="h-4 w-4" aria-hidden /> View
                      </button>
                    </>
                  )}
                  {d.written ? (
                    <button className={action} onClick={() => void download(d)} aria-label={`Download ${d.name}`} title="Download it (in the type it was uploaded as, else Word or Excel)">
                      <Download className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Download</span>
                    </button>
                  ) : d.url ? (
                    <a className={action} href={fileDownloadHref(d.url, d.name)} download aria-label={`Download ${d.name}`} title="Download the file"
                      onClick={() => void updateDoc(doc(authDb, 'documents', d.id), { downloadCount: increment(1) }).catch(() => undefined)}>
                      <Download className="h-4 w-4" aria-hidden /><span className="hidden sm:inline">Download</span>
                    </a>
                  ) : null}
                  {(d.uploadedByUid === uid || isCeo) && (
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
          team={team}
          me={me} />
      )}
      {uploading && user && <UploadDialog department={department} team={team} me={me} onClose={() => setUploading(false)}
        onEditable={id => router.push(docPath(id))} />}
    </div>
  );
}
