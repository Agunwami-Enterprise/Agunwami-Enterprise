'use client';

import { useConfirm } from '@/app/components/common/AeModal';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/workstation/auth-context';
import { subscribeUserProfile } from '@/modules/settings/services';
import { toast } from 'react-toastify';
import NewDocumentDialog from './NewDocumentDialog';
import UploadDialog from './UploadDialog';
import { useProjects } from './ProjectPicker';
import { ENTERPRISE_SOURCE, type FeedSource } from '@/backend/modules/projects/projects.types';
import {
  canBecomeEditable, downloadDocCopy, editNote, fileDownloadHref, makeFileEditable, opensHere, permissionsOf, removeDoc, subscribeDocs, type Viewer, type WorkDoc,
} from '../doc-store';
import { SkeletonDocuments } from '@/app/components/ceo/Skeleton';
import {
  ALL_SOURCES, FeedError, FeedNotices, SourceBadge, SourceFilter, formatDate, sourcesOf, useFeed,
} from '@/app/components/ceo/feed';
import type { DocumentFeedItem, DocumentsFeed } from '@/backend/modules/documents/documents.feed';

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

type DocTab  = 'all' | 'personal' | 'team' | 'company';
type DocFile = DocumentFeedItem;

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════ */


const DEFAULT_CATEGORY_STYLE = { bg:'#f3f4f6', text:'#4b5563' };
const CATEGORY_STYLE: Record<string, { bg: string; text: string }> = {
  'Legal':    { bg:'#fef9c3', text:'#854d0e' },
  'Projects': { bg:'#dbeafe', text:'#1e40af' },
  'Finance':  { bg:'#dcfce7', text:'#166534' },
  'HR':       { bg:'#ede9fe', text:'#6d28d9' },
  'Meetings': { bg:'#ccfbf1', text:'#0f766e' },
};

const FOLDERS: { label: string; tab: Exclude<DocTab,'all'> }[] = [
  { label:'Personal Documents', tab:'personal' },
  { label:'Team Documents',     tab:'team'     },
  { label:'Company Documents',  tab:'company'  },
];

/* ══════════════════════════════════════════════════════════════════════════
   MAIN PAGE
══════════════════════════════════════════════════════════════════════════ */

export default function DocumentsPage() {
  const [tab,        setTab]        = useState<DocTab>('all');
  const [search,     setSearch]     = useState('');
  const [showUpload, setShowUpload] = useState(false);
  const [converting, setConverting] = useState('');
  const router = useRouter();
  const confirm = useConfirm();
  const [sourceF,    setSourceF]    = useState(ALL_SOURCES);
  const feed = useFeed<DocumentsFeed>('/api/ceo/documents');
  const { user } = useAuth();
  const [creating, setCreating] = useState(false);
  const [department, setDepartment] = useState('');
  useEffect(() => (user?.uid ? subscribeUserProfile(user.uid, p => setDepartment(String(p?.department ?? '').toLowerCase())) : undefined), [user?.uid]);
  // The workstation's documents (AE Hub's): written ones open here, read-only unless the CEO was given
  // editing; uploaded Word, text and web page files can be opened for editing by whoever can edit them.
  const [hubDocs, setHubDocs] = useState<Map<string, WorkDoc>>(new Map());
  // Workstation documents seen while the page is open: one that's gone was deleted (here or elsewhere),
  // so its row goes at once instead of waiting for AE Hub's report, which is cached for a minute.
  const [seenHub, setSeenHub] = useState<{ ids: Set<string>; urls: Set<string> }>({ ids: new Set(), urls: new Set() });
  useEffect(() => (user?.uid ? subscribeDocs(next => {
    setHubDocs(next);
    setSeenHub(prev => {
      const ids = new Set(prev.ids);
      const urls = new Set(prev.urls);
      for (const d of next.values()) { ids.add(d.id); if (d.fileUrl) urls.add(d.fileUrl); }
      return ids.size === prev.ids.size && urls.size === prev.urls.size ? prev : { ids, urls };
    });
  }, () => setHubDocs(new Map())) : undefined), [user?.uid]);
  // Rows deleted here, hidden straight away.
  const [removed, setRemoved] = useState<Set<string>>(new Set());
  const markRemoved = (f: DocFile) => setRemoved(prev => new Set(prev).add(f.key));
  const me: Viewer | null = user ? { uid: user.uid, name: user.displayName || user.email || 'CEO', email: user.email || '', department, isCeo: true, aeDepartmentId: '' } : null;
  // AE Hub's feed may use its own ids: files are also matched by their address.
  const hubByUrl = new Map([...hubDocs.values()].filter(d => d.fileUrl).map(d => [d.fileUrl, d]));
  const canEdit = (d: WorkDoc | undefined) => !!d && !!me && permissionsOf(d, me).canEdit;
  const download = (f: DocFile) => downloadDocCopy(f.id).catch(() => toast.error(`${f.name} could not be downloaded.`));

  async function editFile(d: WorkDoc) {
    if (!me) return;
    const ok = await confirm({
      title: `Edit ${d.title} here?`,
      message: `It opens in the document editor and is kept as a written document in the same place, shared the same way. The original file stays available to download from the document’s details. ${editNote(d.fileName)}${d.owner.uid ? '' : ' It has no owner yet, so you’ll become its owner.'}`,
      confirmLabel: 'Open in editor',
    });
    if (!ok) return;
    setConverting(d.id);
    try {
      await makeFileEditable(d.id, me, d.fileName, d.fileUrl);
      router.push(`/ceo/documents/${d.id}`);
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : `${d.title} could not be opened for editing.`);
      setConverting('');
    }
  }
  const liveUrls = new Set([...hubDocs.values()].map(d => d.fileUrl).filter(Boolean));
  const deletedHubDoc = (f: DocFile) => (seenHub.ids.has(f.id) && !hubDocs.has(f.id))
    || (!!f.url && seenHub.urls.has(f.url) && !liveUrls.has(f.url) && !hubDocs.has(f.id));
  const files: DocFile[] = (feed.data?.items ?? []).filter(f => !removed.has(f.key) && !deletedHubDoc(f));
  // A workstation file filed under a project is listed (and filtered) under that project.
  const projects = useProjects();
  const hubDocOf = (f: DocFile) => hubDocs.get(f.id) ?? (f.url ? hubByUrl.get(f.url) : undefined);
  const sourceOf = (f: DocFile): FeedSource => {
    const d = hubDocOf(f);
    const project = d?.project;
    // Made in the workstation with no project: the enterprise's own, not AE Hub's (where it's stored).
    if (!project) return d?.fromWorkstation ? ENTERPRISE_SOURCE : f.source;
    return { id: project.id, name: project.name, kind: 'project', color: projects?.find(p => p.id === project.id)?.color || f.source.color };
  };
  const sources = sourcesOf(files.map(f => ({ source: sourceOf(f) })));

  const term = search.trim().toLowerCase();
  const filtered = files.filter(f => {
    if (sourceF !== ALL_SOURCES && sourceOf(f).id !== sourceF) return false;
    if (tab !== 'all' && f.tab !== tab) return false;
    if (term && ![f.name, f.category, sourceOf(f).name, f.uploadedBy ?? ''].some(v => v.toLowerCase().includes(term))) return false;
    return true;
  });

  const visibleFolders = tab === 'all' ? FOLDERS : FOLDERS.filter(f => f.tab === tab);

  const link = 'text-[12px] font-semibold hover:underline disabled:opacity-50';
  /** A row's actions: Edit or View, and Download (and Edit for uploaded files that can be edited). */
  const [deleting, setDeleting] = useState('');

  // The CEO can delete any workstation document or file, and the enterprise's own entries (e.g. samples).
  const canRemove = (f: DocFile, d: WorkDoc | undefined) => (d ? !!me && permissionsOf(d, me).canDelete : f.source.id === 'enterprise');

  /** Deletes one row: a workstation document or file, or one of the enterprise's entries. */
  async function deleteOne(f: DocFile, d: WorkDoc | undefined) {
    if (d) {
      await removeDoc(d.id);
      return;
    }
    const res = await fetch(`/api/ceo/documents?id=${encodeURIComponent(f.id)}`, { method: 'DELETE' });
    if (!res.ok) throw new Error(((await res.json().catch(() => ({}))) as { error?: string }).error || 'It could not be deleted.');
  }

  // Selecting rows to delete several at once.
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkDeleting, setBulkDeleting] = useState<{ done: number; total: number } | null>(null);
  const toggleSelected = (key: string) => setSelected(prev => {
    const next = new Set(prev);
    if (next.has(key)) next.delete(key); else next.add(key);
    return next;
  });

  async function deleteSelected(rows: Array<{ f: DocFile; d: WorkDoc | undefined }>) {
    if (!rows.length) return;
    const ok = await confirm({
      title: `Delete ${rows.length} item${rows.length === 1 ? '' : 's'}?`,
      message: 'They’re removed for everyone (workstation files in AE Hub too). This can’t be undone.',
      confirmLabel: `Delete ${rows.length}`, tone: 'danger',
    });
    if (!ok) return;
    let failed = 0;
    setBulkDeleting({ done: 0, total: rows.length });
    for (const [i, { f, d }] of rows.entries()) {
      try {
        await deleteOne(f, d);
        markRemoved(f);
      } catch {
        failed++;
      }
      setBulkDeleting({ done: i + 1, total: rows.length });
    }
    setBulkDeleting(null);
    setSelected(new Set());
    if (failed) toast.error(`${rows.length - failed} deleted; ${failed} couldn’t be deleted.`);
    else toast.success(`${rows.length} item${rows.length === 1 ? '' : 's'} deleted.`);
    void feed.reload();
  }

  async function removeRow(f: DocFile, d: WorkDoc | undefined) {
    const name = d?.title || f.name;
    const ok = await confirm({
      title: `Delete “${name}”?`,
      message: d ? 'It’s removed for everyone, in AE Hub too. This can’t be undone.' : 'It’s removed from the enterprise’s documents. This can’t be undone.',
      confirmLabel: 'Delete', tone: 'danger',
    });
    if (!ok) return;
    setDeleting(f.key);
    try {
      await deleteOne(f, d);
      markRemoved(f);
      toast.success(`“${name}” was deleted.`);
      void feed.reload();
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : 'It could not be deleted.');
    } finally {
      setDeleting('');
    }
  }

  const rowActions = (f: DocFile, d: WorkDoc | undefined) => (
    <span className="inline-flex items-center gap-3">
      {openActions(f, d)}
      {canRemove(f, d) && (
        <button type="button" onClick={() => void removeRow(f, d)} disabled={deleting === f.key} title="Delete it" className={`${link} text-red-600 dark:text-red-400`}>
          {deleting === f.key ? 'Deleting…' : 'Delete'}
        </button>
      )}
    </span>
  );

  const openActions = (f: DocFile, d: WorkDoc | undefined) => {
    if (f.written || d?.written) {
      return (
        <span className="inline-flex items-center gap-3">
          <Link href={`/ceo/documents/${f.id}`} title={canEdit(d) ? 'Open it to edit (you can switch to viewing)' : 'Open it to read'} className={link} style={{ color: '#f5bd02' }}>
            {canEdit(d) ? 'Edit' : 'View'}
          </Link>
          <button type="button" onClick={() => void download(f)} title="Download it (in the type it was uploaded as, else Word or Excel)" className={`${link} text-gray-500 dark:text-gray-400`}>Download</button>
        </span>
      );
    }
    if (f.sample && !d) return <span className="text-[12px] text-gray-400" title="A sample entry: its link points at no real file">Sample · no file</span>;
    const url = d?.fileUrl || f.url;
    if (!url) return <span className="text-[12px] text-gray-400" title="No download link was shared for this document">No file link</span>;
    return (
      <span className="inline-flex items-center gap-3">
        {d && canEdit(d) && canBecomeEditable(d.fileName, url) && (
          <button type="button" onClick={() => void editFile(d)} disabled={!!converting} title="Open it in the editor to edit it" className={link} style={{ color: '#f5bd02' }}>
            {converting === d.id ? 'Opening…' : 'Edit'}
          </button>
        )}
        {d && opensHere(d.fileName, url)
          ? <Link href={`/ceo/documents/${d.id}`} title="Look at it here" className={link} style={{ color: canEdit(d) ? undefined : '#f5bd02' }}>View</Link>
          : <a href={url} target="_blank" rel="noopener noreferrer" title="Open the file in a new tab" className={link} style={{ color: d && canEdit(d) && canBecomeEditable(d.fileName, url) ? undefined : '#f5bd02' }}>View</a>}
        {d
          ? <a href={fileDownloadHref(url, d.fileName)} download title="Download the file" className={`${link} text-gray-500 dark:text-gray-400`}>Download</a>
          : <a href={url} target="_blank" rel="noopener noreferrer" download title="Download the file" className={`${link} text-gray-500 dark:text-gray-400`}>Download</a>}
      </span>
    );
  };

  // The rows shown that can be deleted, and those of them selected.
  const selectable = filtered.map(f => ({ f, d: hubDocOf(f) })).filter(r => canRemove(r.f, r.d));
  const selectedRows = selectable.filter(r => selected.has(r.f.key));
  const allSelected = selectable.length > 0 && selectedRows.length === selectable.length;

  if (feed.loading) return <SkeletonDocuments />;
  if (!feed.data) return <FeedError message={feed.error} onRetry={() => void feed.reload()} />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* ── Header ── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Documents</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Documents across the enterprise and every project, labelled by project</p>
          </div>
          <div className="flex flex-wrap gap-2 self-start">
            <button
              onClick={() => setShowUpload(true)}
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-4 py-2.5 text-[13px] font-semibold text-gray-700 shadow-sm hover:bg-gray-50 dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5"
            >
              <UploadIcon /> Upload Document
            </button>
            <button
              onClick={() => setCreating(true)}
              disabled={!user}
              className="flex items-center gap-1.5 rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90 disabled:opacity-50"
              style={{ backgroundColor: '#f5bd02' }}
            >
              + New Document
            </button>
          </div>
        </div>

        <FeedNotices projects={feed.data.projects} enterpriseError={feed.data.enterpriseError} section="documents" />

        {/* ── Search ── */}
        <div className="mb-4 flex flex-wrap items-center gap-3">
          <div className="flex min-w-0 flex-1 items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-white/8 dark:bg-[#1e1e1e]">
            <SearchIcon />
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search documents..."
              className="flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500"
            />
          </div>
          <SourceFilter sources={sources} value={sourceF} onChange={setSourceF} />
        </div>

        {/* ── Tabs ── */}
        <div className="mb-5 flex border-b border-gray-200 dark:border-white/6">
          {(['all','personal','team','company'] as DocTab[]).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-2.5 text-[13px] font-medium capitalize transition-colors
                ${tab === t
                  ? 'border-b-2 border-[#f5bd02] text-[#f5bd02]'
                  : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
            >
              {t === 'all' ? 'All' : t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>

        {/* ── Folders ── */}
        {visibleFolders.length > 0 && (
          <div className="mb-6">
            <h2 className="mb-3 text-[14px] font-bold text-gray-800 dark:text-white">Folders</h2>
            <div className="ae-stagger grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFolders.map(f => (
                <button
                  key={f.tab}
                  onClick={() => setTab(f.tab)}
                  className="ae-lift flex flex-col items-center gap-3 rounded-2xl bg-white p-5 shadow-sm dark:bg-[#1e1e1e]"
                >
                  <FolderIllustration />
                  <span className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">{f.label}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── Files table ── */}
        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <h2 className="text-[14px] font-bold text-gray-800 dark:text-white">Files</h2>
            {selectedRows.length > 0 && (
              <div className="ml-auto flex flex-wrap items-center gap-2 rounded-xl border border-red-200 bg-red-50 px-3 py-1.5 text-[12px] dark:border-red-500/30 dark:bg-red-500/10">
                <span className="font-semibold text-red-700 dark:text-red-300">{selectedRows.length} selected</span>
                <button type="button" onClick={() => void deleteSelected(selectedRows)} disabled={!!bulkDeleting}
                  className="rounded-lg bg-red-600 px-3 py-1 font-semibold text-white hover:bg-red-700 disabled:opacity-60">
                  {bulkDeleting ? `Deleting ${bulkDeleting.done} of ${bulkDeleting.total}…` : 'Delete selected'}
                </button>
                <button type="button" onClick={() => setSelected(new Set())} disabled={!!bulkDeleting} className="font-semibold text-gray-600 hover:underline dark:text-gray-300">Clear</button>
              </div>
            )}
          </div>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/6">
                    <th className="w-10 py-3 pl-5 pr-0 text-left">
                      {selectable.length > 0 && (
                        <input type="checkbox" aria-label="Select all" title="Select all you can delete" className="h-4 w-4 accent-[#f5bd02]"
                          checked={allSelected} ref={el => { if (el) el.indeterminate = !allSelected && selectedRows.length > 0; }}
                          onChange={() => setSelected(allSelected ? new Set() : new Set(selectable.map(r => r.f.key)))} />
                      )}
                    </th>
                    {['Name','Project','Type','Category','Date','Actions'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500
                          ${i === 5 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="px-5 py-10 text-center text-[13px] text-gray-400">
                        No files found
                      </td>
                    </tr>
                  ) : (
                    filtered.map(f => {
                      const cat = CATEGORY_STYLE[f.category] ?? DEFAULT_CATEGORY_STYLE;
                      return (
                        <tr
                          key={f.key}
                          className={`border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-white/4 dark:hover:bg-white/3 ${selected.has(f.key) ? 'bg-amber-50/60 dark:bg-amber-500/5' : ''}`}
                        >
                          <td className="w-10 py-3.5 pl-5 pr-0">
                            {canRemove(f, hubDocOf(f)) && (
                              <input type="checkbox" aria-label={`Select ${f.name}`} className="h-4 w-4 accent-[#f5bd02]"
                                checked={selected.has(f.key)} onChange={() => toggleSelected(f.key)} />
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <FileTypeIcon type={f.type} />
                              <div className="min-w-0">
                                <span className="block truncate text-[13px] font-medium text-gray-700 dark:text-gray-200">{f.name}</span>
                                {(f.uploadedBy || f.size) && (
                                  <span className="block text-[11px] text-gray-400">{[f.uploadedBy, f.size].filter(Boolean).join(' · ')}</span>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5"><SourceBadge source={sourceOf(f)} /></td>
                          <td className="px-5 py-3.5 text-[12px] text-gray-500 dark:text-gray-400">{f.type}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className="rounded-lg px-3 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: cat.bg, color: cat.text }}
                            >
                              {f.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-gray-500 dark:text-gray-400">{formatDate(f.date)}</td>
                          <td className="px-5 py-3.5 text-right">
                            {rowActions(f, hubDocOf(f))}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* ══════════════════════════════════════════════════════════════════
          UPLOAD MODAL
      ══════════════════════════════════════════════════════════════════ */}
      {creating && me && (
        <NewDocumentDialog basePath="/ceo/documents" onClose={() => setCreating(false)}
          me={me} />
      )}

      {showUpload && me && (
        <UploadDialog me={me} department={department} onClose={() => setShowUpload(false)}
          onUploaded={() => void feed.reload()} onEditable={id => router.push(`/ceo/documents/${id}`)} />
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════ */


/* Cream-colored manila folder illustration */
function FolderIllustration() {
  return (
    <svg width="110" height="82" viewBox="0 0 110 82" fill="none" xmlns="http://www.w3.org/2000/svg">
      {/* Folder back */}
      <rect x="2" y="16" width="106" height="64" rx="5" fill="#dfc98a"/>
      {/* Tab */}
      <path d="M2 16 Q2 10 8 10 L44 10 Q50 10 52 16 Z" fill="#dfc98a"/>
      {/* Folder body (lighter front) */}
      <rect x="2" y="20" width="106" height="60" rx="5" fill="#eddfa8"/>
      {/* White paper sheets peeking */}
      <rect x="12" y="16" width="86" height="6" rx="2" fill="white" fillOpacity="0.55"/>
      {/* Subtle lines on folder body */}
      <line x1="18" y1="38" x2="92" y2="38" stroke="#d4b97a" strokeWidth="1" strokeLinecap="round"/>
      <line x1="18" y1="48" x2="78" y2="48" stroke="#d4b97a" strokeWidth="1" strokeLinecap="round"/>
      <line x1="18" y1="58" x2="85" y2="58" stroke="#d4b97a" strokeWidth="1" strokeLinecap="round"/>
    </svg>
  );
}

function FileTypeIcon({ type }: { type: string }) {
  const isPdf = type === 'PDF';
  return (
    <div
      className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-[9px] font-bold text-white"
      style={{ backgroundColor: isPdf ? '#ef4444' : '#2563eb' }}
    >
      {type}
    </div>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   ICONS
══════════════════════════════════════════════════════════════════════════ */

function SearchIcon() {
  return <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#9ca3af" strokeWidth="1.8"><circle cx="7" cy="7" r="5"/><line x1="10.5" y1="10.5" x2="14" y2="14"/></svg>;
}
function UploadIcon() {
  return <svg width="13" height="13" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="4,6 8,2 12,6"/><line x1="8" y1="2" x2="8" y2="11"/><rect x="2" y="12" width="12" height="2" rx="1"/></svg>;
}
