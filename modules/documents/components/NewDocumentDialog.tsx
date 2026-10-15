'use client';

/**
 * Start a document or a spreadsheet: a template (built-in, or one the company
 * added), its category and who can see it. Like Google Docs, it's named after
 * its template ("Untitled document" when blank) and renamed in its top bar.
 * Templates can be added here from a file (Word, PDF, text, web page, Excel
 * or CSV); whoever added one, and the CEO, can delete it.
 */

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Check, FileSpreadsheet, FileText, Loader2, RectangleHorizontal, RectangleVertical, Trash2, Upload } from 'lucide-react';
import AeModal, { useConfirm } from '@/app/components/common/AeModal';
import { SHEET_TEMPLATES } from '@/lib/documents/sheets';
import { DOC_CATEGORIES, DOC_TEMPLATES, createDoc, docPath, type DocOrientation, type DocShare, type SharedDepartment, type Viewer } from '../doc-store';
import { addTemplate, deleteTemplate, getTemplate, isTemplateFile, listTemplates, templateFromFile, templateNameOf, type CustomTemplate } from '../template-store';
import DepartmentPicker from './DepartmentPicker';

type Kind = 'doc' | 'sheet';
/** A choice in the grid: a built-in template ("b:<id>") or one the company added ("c:<id>"). */
type Choice = string;

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
  const confirm = useConfirm();
  const [kind, setKind] = useState<Kind>('doc');
  const [choice, setChoice] = useState<Choice>(`b:${initial?.templateId ?? DOC_TEMPLATES[0].id}`);
  const [category, setCategory] = useState(initial?.category ?? (DOC_TEMPLATES.find(t => t.id === initial?.templateId) ?? DOC_TEMPLATES[0]).category);
  const [share, setShare] = useState<DocShare>(initial?.share ?? (team || me.department ? 'department' : 'private'));
  const [departments, setDepartments] = useState<SharedDepartment[]>(team ? [team] : []);
  const [othersCanEdit, setOthersCanEdit] = useState(false);
  const [orientation, setOrientation] = useState<DocOrientation>('portrait');
  const [custom, setCustom] = useState<CustomTemplate[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    listTemplates().then(list => { if (!cancelled) setCustom(list); }, () => { if (!cancelled) setCustom([]); });
    return () => { cancelled = true; };
  }, []);

  const builtIn = kind === 'doc'
    ? DOC_TEMPLATES.map(t => ({ key: `b:${t.id}`, label: t.label, description: t.description, category: t.category }))
    : SHEET_TEMPLATES.map(t => ({ key: `b:${t.id}`, label: t.label, description: t.description, category: t.category }));
  const added = (custom ?? []).filter(t => t.kind === kind);

  function pick(key: Choice, templateCategory: string) {
    setChoice(key);
    setCategory(templateCategory);
  }

  function switchKind(next: Kind) {
    setKind(next);
    const first = next === 'doc' ? DOC_TEMPLATES[0] : SHEET_TEMPLATES[0];
    pick(`b:${first.id}`, first.category);
  }

  async function removeTemplate(t: CustomTemplate) {
    if (!(await confirm({ title: `Delete the “${t.label}” template?`, message: 'It’s removed for everyone. Documents already made from it stay as they are.', confirmLabel: 'Delete', tone: 'danger' }))) return;
    try {
      await deleteTemplate(t.id);
      setCustom(list => (list ?? []).filter(x => x.id !== t.id));
      if (choice === `c:${t.id}`) switchKind(kind);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The template could not be deleted.');
    }
  }

  async function create(e?: React.FormEvent) {
    e?.preventDefault();
    if (share === 'departments' && departments.length === 0) { setError('Choose at least one department to share it with.'); return; }
    setBusy(true);
    setError('');
    try {
      const date = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
      let name: string;
      let content = '';
      let sheets: string | undefined;
      if (choice.startsWith('c:')) {
        const template = added.find(t => `c:${t.id}` === choice);
        const body = await getTemplate(choice.slice(2));
        name = initial?.title || template?.label || 'Untitled document';
        if (kind === 'sheet') sheets = body.sheets; else content = body.content;
      } else if (kind === 'sheet') {
        const template = SHEET_TEMPLATES.find(t => `b:${t.id}` === choice) ?? SHEET_TEMPLATES[0];
        name = initial?.title || (template.id === 'blank-sheet' ? 'Untitled spreadsheet' : template.label);
        sheets = JSON.stringify(template.sheets());
      } else {
        const template = DOC_TEMPLATES.find(t => `b:${t.id}` === choice) ?? DOC_TEMPLATES[0];
        name = initial?.title || (template.id === 'blank' ? 'Untitled document' : template.label);
        content = template.content(me.name, date);
      }
      const id = await createDoc({
        title: name, content, sheets,
        category, description: '', share, othersCanEdit: share !== 'private' && othersCanEdit,
        team: share === 'department' ? team : undefined,
        departments: share === 'departments' ? departments : undefined,
        orientation,
      }, me);
      await onCreated?.(id, name);
      router.push(docPath(id, basePath));
    } catch (err) {
      setError(err instanceof Error && err.message ? err.message : 'It could not be created. Please try again.');
      setBusy(false);
    }
  }

  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
  const Icon = kind === 'sheet' ? FileSpreadsheet : FileText;
  const tile = (selected: boolean) => `relative flex h-full w-full flex-col items-start gap-1 rounded-xl border p-3 text-left transition-colors ${selected
    ? 'border-[#f5bd02] bg-[#fef9e7] dark:bg-[#f5bd02]/10' : 'border-[#e5e5e5] hover:border-[#d4d4d4] dark:border-white/10'}`;

  return (
    <AeModal title={kind === 'sheet' ? 'New spreadsheet' : 'New document'} size="lg" onClose={onClose} dismissible={!busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          <button type="submit" form="new-doc" disabled={busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Create {kind === 'sheet' ? 'spreadsheet' : 'document'}
          </button>
        </>
      )}>
      <form id="new-doc" onSubmit={create} className="space-y-5">
        {/* Document or spreadsheet (a department guide is always a document) */}
        {!initial?.templateId && (
          <div role="radiogroup" aria-label="Type" className="flex gap-2">
            {([['doc', 'Document', FileText], ['sheet', 'Spreadsheet', FileSpreadsheet]] as const).map(([value, label, TypeIcon]) => (
              <button key={value} type="button" role="radio" aria-checked={kind === value} onClick={() => switchKind(value)}
                className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium ${kind === value
                  ? 'border-[#f5bd02] bg-[#fef9e7] text-[#806013] dark:bg-[#f5bd02]/10 dark:text-[#f5bd02]' : 'border-[#e5e5e5] text-[#525252] hover:border-[#d4d4d4] dark:border-white/10 dark:text-gray-300'}`}>
                <TypeIcon className="h-4 w-4" aria-hidden="true" /> {label}
              </button>
            ))}
          </div>
        )}

        <fieldset>
          <legend className="mb-2 text-[13px] font-medium text-[#525252] dark:text-gray-300">Start from</legend>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {builtIn.map(t => (
              <button key={t.key} type="button" aria-pressed={choice === t.key} onClick={() => pick(t.key, t.category)} className={tile(choice === t.key)}>
                <Icon className={`h-5 w-5 ${kind === 'sheet' ? 'text-[#16a34a]' : 'text-[#806013] dark:text-[#f5bd02]'}`} aria-hidden="true" />
                <span className="text-[13px] font-semibold text-[#292929] dark:text-white">{t.label}</span>
                <span className="text-[12px] leading-snug text-[#8a8a8a]">{t.description}</span>
                {choice === t.key && <Check className="absolute right-2.5 top-2.5 h-4 w-4 text-[#806013] dark:text-[#f5bd02]" aria-hidden="true" />}
              </button>
            ))}
            {added.map(t => (
              <div key={t.id} className="relative">
                <button type="button" aria-pressed={choice === `c:${t.id}`} onClick={() => pick(`c:${t.id}`, t.category)} className={tile(choice === `c:${t.id}`)}>
                  <Icon className={`h-5 w-5 ${kind === 'sheet' ? 'text-[#16a34a]' : 'text-[#2563eb]'}`} aria-hidden="true" />
                  <span className="pr-6 text-[13px] font-semibold text-[#292929] dark:text-white">{t.label}</span>
                  <span className="text-[12px] leading-snug text-[#8a8a8a]">{t.description || `Added by ${t.createdBy || 'a colleague'}`}</span>
                </button>
                {choice === `c:${t.id}` && <Check className="pointer-events-none absolute right-2.5 top-2.5 h-4 w-4 text-[#806013] dark:text-[#f5bd02]" aria-hidden="true" />}
                {t.canDelete && (
                  <button type="button" onClick={() => void removeTemplate(t)} aria-label={`Delete the ${t.label} template`} title="Delete this template"
                    className="absolute bottom-2 right-2 rounded-md p-1 text-[#a3a3a3] hover:bg-red-50 hover:text-[#dc2626] dark:hover:bg-red-500/10">
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                )}
              </div>
            ))}
            <button type="button" onClick={() => setAdding(true)} className="flex flex-col items-start gap-1 rounded-xl border border-dashed border-[#d4d4d4] p-3 text-left hover:border-[#f5bd02] dark:border-white/15">
              <Upload className="h-5 w-5 text-[#a3a3a3]" aria-hidden="true" />
              <span className="text-[13px] font-semibold text-[#292929] dark:text-white">Upload a template</span>
              <span className="text-[12px] leading-snug text-[#8a8a8a]">From a Word, PDF, Excel or CSV file</span>
            </button>
          </div>
          {custom === null && <p className="mt-2 flex items-center gap-1.5 text-[12px] text-[#8a8a8a]"><Loader2 className="h-3 w-3 animate-spin" aria-hidden="true" /> Loading the company’s templates…</p>}
        </fieldset>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>
              {!DOC_CATEGORIES.includes(category) && <option>{category}</option>}
              {DOC_CATEGORIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Who can see it</span>
            <select className={field} value={share} onChange={e => setShare(e.target.value as DocShare)}>
              <option value="private">Only me</option>
              {(team || me.department) && <option value="department">{team ? `My team (${team.name})` : 'My department'}</option>}
              <option value="departments">Departments I choose…</option>
              <option value="all">Everyone in the company</option>
            </select>
          </label>
        </div>
        {share === 'departments' && <DepartmentPicker value={departments} onChange={setDepartments} ownTeamId={team?.id} />}
        {kind === 'doc' && (
          <fieldset>
            <legend className="mb-2 text-[13px] font-medium text-[#525252] dark:text-gray-300">Page</legend>
            <div role="radiogroup" aria-label="Page orientation" className="flex gap-2">
              {([['portrait', 'Portrait', RectangleVertical], ['landscape', 'Landscape', RectangleHorizontal]] as const).map(([value, label, OrientationIcon]) => (
                <button key={value} type="button" role="radio" aria-checked={orientation === value} onClick={() => setOrientation(value)}
                  className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 text-[13px] font-medium ${orientation === value
                    ? 'border-[#f5bd02] bg-[#fef9e7] text-[#806013] dark:bg-[#f5bd02]/10 dark:text-[#f5bd02]' : 'border-[#e5e5e5] text-[#525252] hover:border-[#d4d4d4] dark:border-white/10 dark:text-gray-300'}`}>
                  <OrientationIcon className="h-4 w-4" aria-hidden="true" /> {label}
                </button>
              ))}
            </div>
          </fieldset>
        )}
        <label className="flex items-start gap-2 text-[13px] text-[#525252] dark:text-gray-300">
          <input type="checkbox" checked={share !== 'private' && othersCanEdit} disabled={share === 'private'} onChange={e => setOthersCanEdit(e.target.checked)} className="mt-0.5 accent-[#f5bd02]" />
          <span>Others can edit<span className="block text-[12px] text-[#8a8a8a]">Everyone who can see it can change it, one person at a time. You can change this later.</span></span>
        </label>
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </form>

      {adding && (
        <AddTemplateDialog me={me} onClose={() => setAdding(false)} onAdded={template => {
          setCustom(list => [...(list ?? []), template].sort((a, b) => a.label.localeCompare(b.label)));
          setAdding(false);
          setKind(template.kind);
          pick(`c:${template.id}`, template.category);
        }} />
      )}
    </AeModal>
  );
}

/** Adds a template from a file: Word, PDF, text and web page files become document templates; Excel and CSV, spreadsheet ones. */
function AddTemplateDialog({ me, onClose, onAdded }: { me: Viewer; onClose: () => void; onAdded: (t: CustomTemplate) => void }) {
  const input = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [label, setLabel] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('Templates');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  function choose(next: File | null) {
    setError('');
    if (next && !isTemplateFile(next.name)) { setError('Templates can be Word (.docx), PDF, text, web page, Excel (.xlsx) or CSV files.'); return; }
    setFile(next);
    if (next && !label) setLabel(templateNameOf(next));
  }

  async function save() {
    if (!file || !label.trim()) return;
    setBusy(true);
    setError('');
    try {
      const body = await templateFromFile(file, me);
      const id = await addTemplate({ label: label.trim(), description, category, ...body }, me);
      onAdded({ id, label: label.trim(), description, category, kind: body.kind, createdBy: me.name, createdAt: new Date().toISOString(), canDelete: true });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'The template could not be added.');
      setBusy(false);
    }
  }

  const field = 'w-full rounded-lg border border-[#e5e5e5] bg-white px-3 py-2 text-[14px] text-[#292929] outline-none placeholder:text-[#a3a3a3] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100';
  return (
    <AeModal title="Upload a template" onClose={onClose} dismissible={!busy}
      footer={(
        <>
          <button type="button" onClick={onClose} disabled={busy} className="rounded-lg border border-[#e5e5e5] px-4 py-2 text-[14px] font-medium text-[#525252] hover:bg-[#f5f5f5] disabled:opacity-50 dark:border-white/10 dark:text-gray-300">Cancel</button>
          <button type="button" onClick={() => void save()} disabled={!file || !label.trim() || busy}
            className="inline-flex items-center gap-2 rounded-lg bg-[#f5bd02] px-4 py-2 text-[14px] font-semibold text-[#1a1a1a] hover:opacity-90 disabled:opacity-50">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />} Add template
          </button>
        </>
      )}>
      <div className="space-y-4">
        <button type="button" onClick={() => input.current?.click()} disabled={busy}
          onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); choose(e.dataTransfer.files[0] ?? null); }}
          className="flex w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-[#d4d4d4] px-4 py-6 text-center hover:border-[#f5bd02] dark:border-white/15">
          <Upload className="h-6 w-6 text-[#a3a3a3]" aria-hidden="true" />
          <span className="text-[14px] font-medium text-[#292929] dark:text-gray-100">{file ? file.name : 'Choose a file, or drop it here'}</span>
          <span className="text-[12px] text-[#8a8a8a]">Word, PDF, text or web page for a document; Excel or CSV for a spreadsheet</span>
        </button>
        <input ref={input} type="file" className="hidden" accept=".docx,.pdf,.txt,.md,.html,.htm,.xlsx,.csv" onChange={e => choose(e.target.files?.[0] ?? null)} />
        <label className="block">
          <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Template name</span>
          <input className={field} value={label} maxLength={80} onChange={e => setLabel(e.target.value)} placeholder="e.g. Letterhead, Invoice, Monthly report" />
        </label>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Category</span>
            <select className={field} value={category} onChange={e => setCategory(e.target.value)}>
              {['Templates', ...DOC_CATEGORIES.filter(c => c !== 'Templates')].map(c => <option key={c}>{c}</option>)}
            </select>
          </label>
          <label className="block">
            <span className="mb-1 block text-[13px] font-medium text-[#525252] dark:text-gray-300">Description (optional)</span>
            <input className={field} value={description} maxLength={140} onChange={e => setDescription(e.target.value)} />
          </label>
        </div>
        <p className="text-[12px] text-[#8a8a8a]">Everyone in the company can start from it. You and the CEO can delete it. A PDF keeps its text, headings, lists and simple tables, not its images or exact layout.</p>
        {error && <p role="alert" className="text-[13px] text-red-600">{error}</p>}
      </div>
    </AeModal>
  );
}
