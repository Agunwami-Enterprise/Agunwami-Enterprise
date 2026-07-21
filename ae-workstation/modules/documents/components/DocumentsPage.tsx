'use client';

import { useEffect, useRef, useState } from 'react';
import { subscribeDocs } from '@/modules/documents/services';
import { SkeletonDocuments } from '@/components/Skeleton';

/* ══════════════════════════════════════════════════════════════════════════
   TYPES
══════════════════════════════════════════════════════════════════════════ */

type DocTab      = 'all' | 'personal' | 'team' | 'company';
type DocCategory = 'Legal' | 'Projects' | 'Finance' | 'HR' | 'Meetings';
type FileType    = 'PDF' | 'DOCX';

interface DocFile {
  id: string; name: string; type: FileType;
  category: DocCategory; date: string; tab: Exclude<DocTab, 'all'>;
}

/* ══════════════════════════════════════════════════════════════════════════
   CONSTANTS
══════════════════════════════════════════════════════════════════════════ */


const CATEGORY_STYLE: Record<DocCategory, { bg: string; text: string }> = {
  'Legal':    { bg:'#fef9c3', text:'#854d0e' },
  'Projects': { bg:'#dbeafe', text:'#1e40af' },
  'Finance':  { bg:'#dcfce7', text:'#166534' },
  'HR':       { bg:'#ede9fe', text:'#6d28d9' },
  'Meetings': { bg:'#ccfbf1', text:'#0f766e' },
};

const UPLOAD_CATEGORIES = ['Financial','Human Resources','Strategic','Assets','Governance'];

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
  const [uploadCat,  setUploadCat]  = useState('Financial');
  const [dragOver,   setDragOver]   = useState(false);
  const [pickedFile, setPickedFile] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [MOCK_FILES, setMockFiles]  = useState<DocFile[]>([]);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => subscribeDocs((data) => { setMockFiles(data as DocFile[]); setLoading(false); }), []);

  const filtered = MOCK_FILES.filter(f => {
    if (tab !== 'all' && f.tab !== tab) return false;
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const visibleFolders = tab === 'all' ? FOLDERS : FOLDERS.filter(f => f.tab === tab);

  if (loading) return <SkeletonDocuments />;

  return (
    <>
      <div className="p-4 md:p-5">

        {/* ── Header ── */}
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-[20px] font-bold text-gray-800 dark:text-white">Documents</h1>
            <p className="text-[12px] text-gray-500 dark:text-gray-400">Access and manage company documents</p>
          </div>
          <button
            onClick={() => setShowUpload(true)}
            className="flex items-center gap-1.5 self-start rounded-lg px-4 py-2.5 text-[13px] font-semibold text-[#1a1a1a] shadow-sm hover:opacity-90"
            style={{ backgroundColor: '#f5bd02' }}
          >
            <UploadIcon /> Upload Document
          </button>
        </div>

        {/* ── Search ── */}
        <div className="mb-4 flex items-center gap-2 rounded-xl border border-gray-200 bg-white px-4 py-2.5 shadow-sm dark:border-white/8 dark:bg-[#1e1e1e]">
          <SearchIcon />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search employee..."
            className="flex-1 bg-transparent text-[12px] text-gray-600 placeholder-gray-400 outline-none dark:text-gray-300 dark:placeholder-gray-500"
          />
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
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {visibleFolders.map(f => (
                <button
                  key={f.tab}
                  onClick={() => setTab(f.tab)}
                  className="flex flex-col items-center gap-3 rounded-2xl bg-white p-5 shadow-sm transition-shadow hover:shadow-md dark:bg-[#1e1e1e]"
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
          <h2 className="mb-3 text-[14px] font-bold text-gray-800 dark:text-white">Files</h2>
          <div className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm dark:border-white/6 dark:bg-[#1e1e1e]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-100 dark:border-white/6">
                    {['Name','Type','Category','Date','Actions'].map((h, i) => (
                      <th
                        key={h}
                        className={`px-5 py-3 text-[11px] font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500
                          ${i === 4 ? 'text-right' : 'text-left'}`}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-5 py-10 text-center text-[13px] text-gray-400">
                        No files found
                      </td>
                    </tr>
                  ) : (
                    filtered.map(f => {
                      const cat = CATEGORY_STYLE[f.category];
                      return (
                        <tr
                          key={f.id}
                          className="border-b border-gray-50 last:border-0 hover:bg-gray-50 dark:border-white/4 dark:hover:bg-white/3"
                        >
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2.5">
                              <FileTypeIcon type={f.type} />
                              <span className="text-[13px] font-medium text-gray-700 dark:text-gray-200">{f.name}</span>
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-gray-500 dark:text-gray-400">{f.type}</td>
                          <td className="px-5 py-3.5">
                            <span
                              className="rounded-lg px-3 py-1 text-[11px] font-semibold"
                              style={{ backgroundColor: cat.bg, color: cat.text }}
                            >
                              {f.category}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-[12px] text-gray-500 dark:text-gray-400">{f.date}</td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              className="text-[12px] font-semibold hover:underline"
                              style={{ color: '#f5bd02' }}
                            >
                              Download
                            </button>
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
      {showUpload && (
        <Overlay onClose={() => { setShowUpload(false); setPickedFile(null); }}>
          <div className="w-[460px] rounded-2xl bg-white p-6 shadow-2xl dark:bg-[#1e1e1e]">
            {/* Header */}
            <div className="mb-5 flex items-center justify-between">
              <h2 className="text-[15px] font-bold text-gray-800 dark:text-white">Upload Document</h2>
              <button
                onClick={() => { setShowUpload(false); setPickedFile(null); }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
              >
                <XIcon />
              </button>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={e => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={e => {
                e.preventDefault();
                setDragOver(false);
                const file = e.dataTransfer.files[0];
                if (file) setPickedFile(file.name);
              }}
              className={`mb-4 flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-10 transition-colors
                ${dragOver
                  ? 'border-[#f5bd02] bg-amber-50 dark:bg-amber-900/10'
                  : 'border-gray-200 bg-gray-50 dark:border-white/8 dark:bg-[#2a2a2a]'}`}
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white shadow-sm dark:bg-[#1e1e1e]">
                <UploadCloudIcon />
              </div>
              {pickedFile ? (
                <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">{pickedFile}</p>
              ) : (
                <>
                  <p className="text-[13px] font-semibold text-gray-700 dark:text-gray-200">Drag and drop files here</p>
                  <p className="text-[11px] text-gray-400">or click to browse files</p>
                </>
              )}

              {/* Hidden file input */}
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.doc,.docx,.ppt,.pptx,.png,.jpg"
                onChange={e => {
                  const file = e.target.files?.[0];
                  if (file) setPickedFile(file.name);
                }}
              />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="mt-1 rounded-lg px-6 py-2 text-[12px] font-semibold text-white hover:opacity-90"
                style={{ backgroundColor: '#6366f1' }}
              >
                Choose Files
              </button>
              <p className="mt-1 text-center text-[10px] leading-snug text-gray-400">
                Maximum file size: 10MB. Supported formats: PDF, DOC,<br />
                DOCX, PPT, PPTX, PNG, JPG
              </p>
            </div>

            {/* Category */}
            <div className="mb-5">
              <label className="mb-1.5 block text-[12px] font-medium text-gray-600 dark:text-gray-400">Category</label>
              <select
                value={uploadCat}
                onChange={e => setUploadCat(e.target.value)}
                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-[12px] text-gray-700 outline-none dark:border-white/8 dark:bg-[#2a2a2a] dark:text-gray-200"
              >
                {UPLOAD_CATEGORIES.map(c => <option key={c}>{c}</option>)}
              </select>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={() => { setShowUpload(false); setPickedFile(null); }}
                className="flex-1 rounded-lg border border-gray-200 py-2.5 text-[12px] font-medium text-gray-600 hover:bg-gray-50 dark:border-white/8 dark:text-gray-400 dark:hover:bg-white/4"
              >
                Cancel
              </button>
              <button
                className="flex-1 rounded-lg py-2.5 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90"
                style={{ backgroundColor: '#f5bd02' }}
              >
                Upload
              </button>
            </div>
          </div>
        </Overlay>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════════════
   HELPERS
══════════════════════════════════════════════════════════════════════════ */

function Overlay({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
      onClick={onClose}
    >
      <div onClick={e => e.stopPropagation()}>{children}</div>
    </div>
  );
}

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

function FileTypeIcon({ type }: { type: FileType }) {
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
function UploadCloudIcon() {
  return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.6" strokeLinecap="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/></svg>;
}
function XIcon() {
  return <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="1" y1="1" x2="13" y2="13"/><line x1="13" y1="1" x2="1" y2="13"/></svg>;
}
