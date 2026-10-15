'use client';

/**
 * Upload a file to Documents (AE Hub's storage, listed in AE Hub too): its
 * category, who sees it, and, for Word, text and web page files, whether to
 * open it in the editor straight away. Used by the CEO's and departments'
 * Documents pages.
 */

import { useRef, useState } from 'react';
import { Loader2, Upload } from 'lucide-react';
import AeModal from '@/app/components/common/AeModal';
import {
  MAX_FILE_BYTES, type DocProject, canBecomeEditable, editNote, fileExtOf, isSheetFile, makeFileEditable, sizeLabel, uploadFileDoc, type SharedDepartment, type Viewer,
} from '../doc-store';
import DepartmentPicker from './DepartmentPicker';
import ProjectPicker from './ProjectPicker';

export const UPLOAD_CATEGORIES = ['Policy & Handbook', 'Finance & Budget', 'Operations', 'Onboarding', 'Templates', 'Technical', 'Legal', 'General'];

type Share = 'private' | 'department' | 'departments' | 'all';

/** Why an upload failed, in words (Firebase Storage errors carry a code). */
function uploadError(e: unknown): string {
  const code = typeof e === 'object' && e && 'code' in e ? String((e as { code: unknown }).code) : '';
  if (code === 'storage/unauthorized' || code === 'permission-denied') return 'AE Hub’s storage didn’t allow the upload. Sign out and in again, and if it keeps happening, ask for upload access in AE Hub.';
  if (code === 'storage/unauthenticated') return 'You’re signed out of AE Hub’s storage. Sign in again and retry.';
  if (code === 'storage/retry-limit-exceeded' || code === 'unavailable') return 'The connection dropped during the upload. Check your connection and try again.';
  if (code === 'storage/quota-exceeded') return 'AE Hub’s storage is full. Ask an administrator to free up space.';
  return `The upload failed${e instanceof Error && e.message ? ` (${e.message})` : ''}. Please try again.`;
}

export default function UploadDialog({ me, department, team, onClose, onUploaded, onEditable }: {
  me: Viewer;
  /** My AE Hub department (lowercase), for "My department" when I'm not in an AE team. */
  department: string;
  /** My AE department: "My team" files are kept under it. */
  team?: { id: string; name: string };
  onClose: () => void;
  /** Called once a file is uploaded (e.g. to refresh the list). */
  onUploaded?: (id: string) => void;
  /** Called with the document's id once an uploaded file is opened for editing. */
  onEditable: (id: string) => void;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('General');
  const [share, setShare] = useState<Share>(team || department ? 'department' : 'all');
  const [departments, setDepartments] = useState<SharedDepartment[]>(team ? [team] : []);
  const [description, setDescription] = useState('');
  const [project, setProject] = useState<DocProject | null>(null);
  // Word, PDF, text and web page files can be edited here. Most open in the editor unless unticked;
  // PDFs stay as they are unless ticked, since they're usually kept as they are.
  const [editChoice, setEditChoice] = useState<boolean | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [converting, setConverting] = useState(false);
  const [error, setError] = useState('');

  const editable = !!file && canBecomeEditable(file.name);
  const editHere = editChoice ?? (!!file && fileExtOf(file.name) !== 'pdf');

  async function upload() {
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { setError('Files can be up to 25 MB.'); return; }
    if (share === 'departments' && departments.length === 0) { setError('Choose at least one department to share it with.'); return; }
    setError('');
    setProgress(0);
    let id: string;
    try {
      id = await uploadFileDoc(file, {
        category, description, project,
        where: share === 'all' || share === 'private' ? { department: share } : share === 'departments' ? { departments } : team ? { team } : { department },
      }, me, setProgress);
    } catch (e) {
      setError(uploadError(e));
      setProgress(null);
      return;
    }
    onUploaded?.(id);
    if (!(editable && editHere)) { onClose(); return; }
    setConverting(true);
    try {
      await makeFileEditable(id, me, file.name);
      onEditable(id);
    } catch (e) {
      // The file is uploaded either way; it can be opened for editing from the list later.
      setError(`Uploaded, but it could not be opened for editing${e instanceof Error && e.message ? `: ${e.message}` : '.'}`);
      setConverting(false);
      setProgress(null);
      setFile(null);
    }
  }

  const busy = progress !== null || converting;
  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
  const label = 'mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300';

  return (
    <AeModal title="Upload a document" size="lg" onClose={onClose} dismissible={!busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          <button type="button" onClick={() => void upload()} disabled={!file || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            {converting ? 'Opening in the editor…' : busy ? `Uploading ${progress}%…` : 'Upload'}
          </button>
        </>
      )}>
      <div className="space-y-4">
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          onDragOver={e => e.preventDefault()}
          onDrop={e => { e.preventDefault(); const dropped = e.dataTransfer.files[0]; if (dropped && !busy) { setFile(dropped); setEditChoice(null); setError(''); } }}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#d4d4d4] px-4 py-6 text-center hover:border-[#f5bd02] dark:border-white/15">
          <Upload className="h-6 w-6 text-[#a3a3a3]" aria-hidden="true" />
          <span className="text-[14px] font-medium text-[#292929] dark:text-gray-100">{file ? file.name : 'Choose a file, or drop it here'}</span>
          <span className="text-[12px] text-[#8a8a8a]">{file ? sizeLabel(file.size) : 'PDF, Word, Excel, PowerPoint, text, images or zip, up to 25 MB'}</span>
        </button>
        <input ref={input} type="file" className="hidden" onChange={e => { setFile(e.target.files?.[0] ?? null); setEditChoice(null); setError(''); }} />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className={label}>Category</span>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>{UPLOAD_CATEGORIES.map(c => <option key={c}>{c}</option>)}</select>
          </label>
          <label className="block">
            <span className={label}>Who can see it</span>
            <select className={field} value={share} onChange={e => setShare(e.target.value as Share)}>
              <option value="private">Only me</option>
              {(team || department) && <option value="department">{team ? `My team (${team.name})` : 'My department'}</option>}
              <option value="departments">Departments I choose…</option>
              <option value="all">Everyone in the company</option>
            </select>
          </label>
        </div>
        {share === 'departments' && <DepartmentPicker value={departments} onChange={setDepartments} ownTeamId={team?.id} />}
        <label className="block">
          <span className={label}>Project (optional: which project it belongs to)</span>
          <ProjectPicker className={field} value={project} onChange={setProject} />
        </label>
        <label className="block">
          <span className={label}>Description (optional)</span>
          <input className={field} value={description} maxLength={300} onChange={e => setDescription(e.target.value)} />
        </label>
        {editable && (
          <label className="flex items-start gap-2 text-[13px] text-[#525252] dark:text-gray-300">
            <input type="checkbox" checked={editHere} disabled={busy} onChange={e => setEditChoice(e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
            <span>Open it in the editor so it can be edited<span className="block text-[12px] text-[#8a8a8a]">It becomes a {isSheetFile(file.name) ? 'spreadsheet' : 'document'} you can change here. The original file stays available to download. {editNote(file.name)}</span></span>
          </label>
        )}
        {busy && <div className="h-2 overflow-hidden rounded-full bg-[#e5e5e5] dark:bg-white/10"><div className="h-full bg-[#f5bd02] transition-all" style={{ width: `${progress ?? 100}%` }} /></div>}
        {error && <p role="alert" className="text-[13px] text-[#b91c1c] dark:text-red-300">{error}</p>}
      </div>
    </AeModal>
  );
}
