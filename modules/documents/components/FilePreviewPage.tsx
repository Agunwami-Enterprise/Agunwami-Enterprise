'use client';

/**
 * A file that isn't in Documents (e.g. a chat attachment), opened read-only
 * in the document view or the spreadsheet: /ws/documents/file and
 * /ceo/documents/file, with ?url=&name=. "Save to Documents" lists it there
 * (for you only at first), where it can be shared or edited.
 */

import { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor } from '@tiptap/react';
import { ArrowLeft, Download, ExternalLink, FilePlus2, FileSpreadsheet, FileText, Loader2 } from 'lucide-react';
import '@fortune-sheet/react/dist/index.css';
import { useAuth } from '@/lib/workstation/auth-context';
import { subscribeUserProfile } from '@/modules/settings/services';
import { articleExtensions } from '@/app/components/cpanel/article/extensions';
import { articleFontsUrl } from '@/backend/modules/site-content/site-content.types';
import { parseSheets, prepareSheets, type StoredSheet } from '@/lib/documents/sheets';
import { addFileRecord, convertFile, convertSheetFile, docPath, fileDownloadHref, fileExtOf, isEditableFile, isSheetFile, pdfViewHref, previewHtml } from '../doc-store';

const Workbook = dynamic(() => import('@fortune-sheet/react').then(m => m.Workbook), { ssr: false });

export default function FilePreviewPage({ url, name, basePath, isCeo, aeDepartmentId = '' }: {
  url: string; name: string; basePath: string; isCeo: boolean; aeDepartmentId?: string;
}) {
  const router = useRouter();
  const { user } = useAuth();
  const [department, setDepartment] = useState<string | null>(null);
  const sheet = isSheetFile(name, url);
  const shown = sheet || isEditableFile(name, url);
  const [html, setHtml] = useState<string | null>(null);
  const [sheets, setSheets] = useState<StoredSheet[] | null>(null);
  const [error, setError] = useState(shown ? '' : 'This kind of file opens in your browser.');
  const [saving, setSaving] = useState(false);
  // A PDF with no text to convert (scanned pages) is shown as it is.
  const pdfAsIs = !!error && shown && fileExtOf(name, url) === 'pdf';

  useEffect(() => (user?.uid
    ? subscribeUserProfile(user.uid, p => setDepartment(String(p?.department ?? '').toLowerCase()), () => setDepartment(''))
    : undefined), [user?.uid]);

  const editor = useEditor({
    immediatelyRender: false,
    editable: false,
    extensions: articleExtensions(''),
    content: '',
    editorProps: { attributes: { class: 'article-content article-editor ProseMirror min-h-[60vh] px-5 py-8 sm:px-10 md:px-16 md:py-14', 'aria-label': name } },
  });

  useEffect(() => {
    if (!shown || !url) return;
    let cancelled = false;
    const done = (e: unknown) => { if (!cancelled) setError(e instanceof Error && e.message ? e.message : 'The file could not be shown here.'); };
    if (sheet) convertSheetFile(url, name).then(json => { if (!cancelled) setSheets(parseSheets(json)); }, done);
    else convertFile(url, name).then(previewHtml).then(result => { if (!cancelled) setHtml(result); }, done);
    return () => { cancelled = true; };
  }, [shown, sheet, url, name]);

  useEffect(() => {
    if (editor && !editor.isDestroyed && html !== null) editor.commands.setContent(html, { emitUpdate: false });
  }, [editor, html]);

  async function save() {
    if (!user || department === null) return;
    setSaving(true);
    try {
      const id = await addFileRecord({ url, name }, { uid: user.uid, name: user.displayName || user.email || 'Team member', email: user.email || '', department, isCeo, aeDepartmentId });
      router.push(docPath(id, basePath));
    } catch {
      setError('It could not be saved to Documents. Please try again.');
      setSaving(false);
    }
  }

  const button = 'inline-flex items-center gap-1.5 rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[13px] font-medium text-[#292929] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:bg-transparent dark:text-gray-200 dark:hover:bg-white/5';
  const Icon = sheet ? FileSpreadsheet : FileText;
  return (
    <div className="flex flex-col gap-3 p-4 md:p-6">
      <link rel="stylesheet" href={articleFontsUrl()} precedence="default" />
      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <button type="button" onClick={() => router.back()} aria-label="Back" title="Back"
          className="rounded-lg p-2 text-[#656565] hover:bg-black/5 hover:text-[#1a1a1a] dark:text-gray-400 dark:hover:bg-white/5 dark:hover:text-white">
          <ArrowLeft className="h-5 w-5" aria-hidden="true" />
        </button>
        <Icon className={`hidden h-8 w-8 shrink-0 sm:block ${sheet ? 'text-[#16a34a]' : 'text-[#2563eb]'}`} aria-hidden="true" />
        <div className="min-w-0 flex-1">
          <h1 className="truncate px-1.5 py-0.5 text-[18px] font-medium text-[#1a1a1a] dark:text-white">{name || 'File'}</h1>
          <p className="px-1.5 text-[12px] text-[#8a8a8a]">Shown read-only · save it to Documents to share or edit it</p>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          <button type="button" onClick={() => void save()} disabled={saving || !user || department === null}
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#f5bd02] px-3 py-2 text-[13px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
            {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <FilePlus2 className="h-4 w-4" aria-hidden="true" />} Save to Documents
          </button>
          <a href={fileDownloadHref(url, name)} download className={button}><Download className="h-4 w-4" aria-hidden="true" /> Download</a>
          <a href={url} target="_blank" rel="noopener noreferrer" className={button}><ExternalLink className="h-4 w-4" aria-hidden="true" /><span className="hidden sm:inline">Open the file</span></a>
        </div>
      </div>

      {error && (pdfAsIs
        ? <p role="status" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-[13px] text-amber-900 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200">{error} It’s shown below as it is.</p>
        : <p role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-2.5 text-[13px] text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-300">{error} You can open it in your browser or download it.</p>)}
      {pdfAsIs && <iframe src={pdfViewHref(url, name)} title={name} className="block h-[calc(100vh-220px)] min-h-[420px] w-full rounded-xl border border-[#e5e5e5] dark:border-white/10" />}

      {shown && !error && (sheet ? (
        <div className="h-[calc(100vh-200px)] min-h-[420px] overflow-hidden rounded-xl border border-[#e5e5e5] bg-white dark:border-white/10">
          {sheets ? (
            <Workbook data={prepareSheets(sheets)} allowEdit={false} showToolbar={false} showFormulaBar showSheetTabs lang="en" forceCalculation
              cellContextMenu={[]} headerContextMenu={[]} sheetTabContextMenu={[]} />
          ) : <div className="flex h-full items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" /></div>}
        </div>
      ) : (
        <div className="rounded-xl border border-[#e5e5e5] bg-[#f1f0ec] dark:border-white/10 dark:bg-[#151515] sm:py-6 md:py-10">
          <div className="mx-auto max-w-[860px] bg-white shadow-sm dark:bg-[#1e1e1e]">
            {html === null
              ? <div className="flex min-h-[40vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" /></div>
              : <EditorContent editor={editor} />}
          </div>
        </div>
      ))}
    </div>
  );
}
