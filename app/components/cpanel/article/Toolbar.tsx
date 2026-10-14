'use client';

/**
 * The article editor's menus and toolbar, laid out like Google Docs:
 * a menu bar (Edit, View, Insert, Format, Table, Tools) above a toolbar with
 * undo/redo, paint format, zoom, styles, font, a typed font size, text and
 * highlight colours, link/image/table, alignment, line spacing, lists,
 * indent and clear formatting.
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import type { Mark } from '@tiptap/pm/model';
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Baseline, Bold, Check, ChevronDown, ChevronRight, Highlighter, ImagePlus,
  IndentDecrease, IndentIncrease, Italic, Keyboard, Link2, List, ListChecks, ListOrdered, Minus, Paintbrush, Plus, Redo2,
  RemoveFormatting, Search, Table2, Underline, Undo2, UnfoldVertical,
} from 'lucide-react';
import { ARTICLE_FONTS, ARTICLE_FONT_GROUPS } from '@/backend/modules/site-content/site-content.types';
import { cx } from '../ui';
import { LINE_SPACINGS, MAX_INDENT, changeCase } from './extensions';

// ── Shared bits ─────────────────────────────────────────────────────────────

export function ToolButton({ label, active, disabled, onClick, children, dark, className }: {
  label: string; active?: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode; dark?: boolean; className?: string;
}) {
  return (
    <button type="button" title={label} aria-label={label} aria-pressed={active} disabled={disabled}
      onMouseDown={e => e.preventDefault()} onClick={onClick}
      className={cx('rounded-md p-1.5 transition-colors disabled:opacity-30',
        dark
          ? (active ? 'bg-white/20 text-white' : 'text-white/80 hover:bg-white/10 hover:text-white')
          : (active ? 'bg-[#F1E4C3] text-[#1A1A1A]' : 'text-[#4A4A4A] hover:bg-[#F3F1EA]'),
        className)}>
      {children}
    </button>
  );
}

export const Divider = ({ dark }: { dark?: boolean }) => <span className={cx('mx-1 h-5 w-px shrink-0', dark ? 'bg-white/15' : 'bg-[#E5E2D9]')} aria-hidden="true" />;

/** Closes when clicking outside `ref` or pressing Escape. */
function useDismiss(open: boolean, close: () => void) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) close(); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') close(); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open, close]);
  return ref;
}

/** A toolbar button that opens a panel under it. */
function Dropdown({ label, button, children, buttonClass, panelClass, align = 'left' }: {
  label: string;
  button: React.ReactNode;
  children: (close: () => void) => React.ReactNode;
  buttonClass?: string;
  panelClass?: string;
  align?: 'left' | 'right';
}) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  const ref = useDismiss(open, close);
  return (
    <div ref={ref} className="relative">
      <button type="button" title={label} aria-label={label} aria-haspopup="true" aria-expanded={open}
        onMouseDown={e => e.preventDefault()} onClick={() => setOpen(v => !v)}
        className={cx('flex items-center gap-0.5 rounded-md px-1.5 py-1.5 text-[#4A4A4A] transition-colors hover:bg-[#F3F1EA]', open && 'bg-[#F3F1EA]', buttonClass)}>
        {button}
        <ChevronDown className="h-3 w-3 shrink-0 text-[#8C8679]" aria-hidden="true" />
      </button>
      {open && (
        <div className={cx('absolute top-full z-30 mt-1 rounded-lg border border-[#E5E2D9] bg-white py-1 shadow-xl', align === 'right' ? 'right-0' : 'left-0', panelClass)}>
          {children(close)}
        </div>
      )}
    </div>
  );
}

function Option({ selected, onClick, children, style }: { selected?: boolean; onClick: () => void; children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <button type="button" role="menuitemradio" aria-checked={!!selected} onMouseDown={e => e.preventDefault()} onClick={onClick} style={style}
      className="flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#F3F1EA]">
      <Check className={cx('h-3.5 w-3.5 shrink-0', selected ? 'text-[#1A1A1A]' : 'invisible')} aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate">{children}</span>
    </button>
  );
}

/** The fonts, grouped, each shown in itself, with a search box. */
function FontList({ current, onPick }: { current: string; onPick: (css: string | null) => void }) {
  const [query, setQuery] = useState('');
  const term = query.trim().toLowerCase();
  const fonts = ARTICLE_FONTS.filter(f => !term || f.label.toLowerCase().includes(term) || f.group.toLowerCase().includes(term));
  return (
    <div>
      <div className="px-2 pb-1 pt-1">
        <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search fonts" aria-label="Search fonts" autoFocus
          onKeyDown={e => { if (e.key === 'Enter' && fonts[0]) { e.preventDefault(); onPick(fonts[0].css); } }}
          className="w-full rounded-md border border-[#E5E2D9] px-2.5 py-1.5 text-[13px] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]" />
      </div>
      <div className="max-h-[340px] overflow-y-auto">
        {!term && <Option selected={!current} onClick={() => onPick(null)}>Default (site font)</Option>}
        {ARTICLE_FONT_GROUPS.map(group => {
          const inGroup = fonts.filter(f => f.group === group);
          if (!inGroup.length) return null;
          return (
            <div key={group} role="group" aria-label={group}>
              <p className="px-3 pb-1 pt-2 text-[11px] font-semibold uppercase tracking-wider text-[#8C8679]">{group}</p>
              {inGroup.map(f => (
                <Option key={f.label} selected={current === f.label} style={{ fontFamily: f.css }} onClick={() => onPick(f.css)}>
                  <span className="text-[14px]">{f.label}</span>
                </Option>
              ))}
            </div>
          );
        })}
        {fonts.length === 0 && <p className="px-3 py-3 text-center text-[13px] text-[#9A9A9A]">No font matches.</p>}
      </div>
    </div>
  );
}

// ── Formatting helpers ──────────────────────────────────────────────────────

export const STYLES = [
  { id: 'p', label: 'Normal text' },
  { id: 'h2', label: 'Heading 1' },
  { id: 'h3', label: 'Heading 2' },
  { id: 'h4', label: 'Heading 3' },
  { id: 'quote', label: 'Quote' },
  { id: 'code', label: 'Code block' },
] as const;
type StyleId = (typeof STYLES)[number]['id'];

function currentStyle(e: Editor): StyleId {
  if (e.isActive('codeBlock')) return 'code';
  if (e.isActive('heading', { level: 2 })) return 'h2';
  if (e.isActive('heading', { level: 3 })) return 'h3';
  if (e.isActive('heading', { level: 4 })) return 'h4';
  if (e.isActive('blockquote')) return 'quote';
  return 'p';
}

export function setStyle(editor: Editor, id: StyleId) {
  const c = editor.chain().focus();
  if (id === 'h2' || id === 'h3' || id === 'h4') c.setHeading({ level: Number(id[1]) as 2 | 3 | 4 }).run();
  else if (id === 'quote') c.setParagraph().toggleBlockquote().run();
  else if (id === 'code') c.setCodeBlock().run();
  else c.clearNodes().setParagraph().run();
}

/** The text size at the cursor, in px: set by the font size box, or the style's own size. */
export function currentFontSize(e: Editor): number {
  const set = parseFloat(String(e.getAttributes('textStyle').fontSize ?? ''));
  if (Number.isFinite(set)) return Math.round(set);
  const style = currentStyle(e);
  return { p: 16, h2: 22, h3: 18, h4: 16, quote: 19, code: 14 }[style];
}

export const MIN_FONT = 8;
export const MAX_FONT = 72;

export function applyFontSize(editor: Editor, size: number) {
  const px = Math.min(MAX_FONT, Math.max(MIN_FONT, Math.round(size)));
  editor.chain().focus().setFontSize(`${px}px`).run();
}

const normalizeFont = (font: string) => font.replace(/["']/g, '').replace(/\s+/g, ' ').trim().toLowerCase();

function currentFont(e: Editor): string {
  const family = String(e.getAttributes('textStyle').fontFamily ?? '');
  if (!family) return '';
  return ARTICLE_FONTS.find(f => normalizeFont(f.css) === normalizeFont(family))?.label ?? '';
}

function blockAttrs(e: Editor): Record<string, unknown> {
  return e.isActive('heading') ? e.getAttributes('heading') : e.getAttributes('paragraph');
}

export function clearFormatting(editor: Editor) {
  editor.chain().focus().unsetAllMarks().clearNodes().setTextAlign('left').setLineSpacing(null).run();
}

// Google Docs' colour palette, plus the site's gold.
const PALETTE = [
  ['#000000', '#434343', '#666666', '#999999', '#B7B7B7', '#CCCCCC', '#D9D9D9', '#EFEFEF', '#F3F3F3', '#FFFFFF'],
  ['#980000', '#FF0000', '#FF9900', '#FFFF00', '#00FF00', '#00FFFF', '#4A86E8', '#0000FF', '#9900FF', '#FF00FF'],
  ['#E6B8AF', '#F4CCCC', '#FCE5CD', '#FFF2CC', '#D9EAD3', '#D0E0E3', '#C9DAF8', '#CFE2F3', '#D9D2E9', '#EAD1DC'],
  ['#DD7E6B', '#EA9999', '#F9CB9C', '#FFE599', '#B6D7A8', '#A2C4C9', '#A4C2F4', '#9FC5E8', '#B4A7D6', '#D5A6BD'],
  ['#A61C00', '#CC0000', '#E69138', '#F1C232', '#6AA84F', '#45818E', '#3C78D8', '#3D85C6', '#674EA7', '#A64D79'],
  ['#5B0F00', '#660000', '#783F04', '#7F6000', '#274E13', '#0C343D', '#1C4587', '#073763', '#20124D', '#4C1130'],
];
const BRAND = ['#C89B3C', '#8A6A1F', '#1F1F1F', '#FBEEC9'];

function ColorPanel({ current, resetLabel, onPick, onReset }: { current: string; resetLabel: string; onPick: (color: string) => void; onReset: () => void }) {
  const [custom, setCustom] = useState(current && /^#[0-9a-f]{6}$/i.test(current) ? current : '#C89B3C');
  const swatch = (color: string) => (
    <button key={color} type="button" title={color} aria-label={color} onMouseDown={e => e.preventDefault()} onClick={() => onPick(color)}
      className={cx('h-5 w-5 rounded-full border transition-transform hover:scale-110',
        current.toLowerCase() === color.toLowerCase() ? 'border-[#1A1A1A] ring-2 ring-[#C89B3C]' : 'border-black/10')}
      style={{ backgroundColor: color }} />
  );
  return (
    <div className="w-[262px] space-y-2 px-3 py-2">
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={onReset}
        className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-[13px] text-[#1A1A1A] hover:bg-[#F3F1EA]">
        <RemoveFormatting className="h-4 w-4 text-[#6B6B6B]" aria-hidden="true" /> {resetLabel}
      </button>
      <div className="grid grid-cols-10 gap-1">{PALETTE.flat().map(swatch)}</div>
      <p className="pt-1 text-[11px] font-semibold uppercase tracking-wider text-[#8C8679]">Brand</p>
      <div className="flex gap-1">{BRAND.map(swatch)}</div>
      <label className="flex items-center gap-2 border-t border-[#F0EEE8] pt-2 text-[13px] text-[#4A4A4A]">
        <span>Custom</span>
        <input type="color" value={custom} onChange={e => setCustom(e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-[#E5E2D9] bg-white" />
        <button type="button" onClick={() => onPick(custom.toUpperCase())} className="ml-auto rounded-md bg-[#1F1F1F] px-2.5 py-1 text-[12px] font-semibold text-white hover:bg-black">Apply</button>
      </label>
    </div>
  );
}

/** Pick a table size on a grid, as in Google Docs. */
export function TableGrid({ onPick }: { onPick: (rows: number, cols: number, header: boolean) => void }) {
  const [hover, setHover] = useState({ rows: 0, cols: 0 });
  const [header, setHeader] = useState(true);
  return (
    <div className="space-y-2 px-3 py-2">
      <div className="grid w-max grid-cols-10 gap-0.5" onMouseLeave={() => setHover({ rows: 0, cols: 0 })} role="grid" aria-label="Table size">
        {Array.from({ length: 8 * 10 }, (_, i) => {
          const r = Math.floor(i / 10) + 1;
          const c = (i % 10) + 1;
          const on = r <= hover.rows && c <= hover.cols;
          return (
            <button key={i} type="button" aria-label={`${r} by ${c} table`} onMouseEnter={() => setHover({ rows: r, cols: c })} onFocus={() => setHover({ rows: r, cols: c })}
              onMouseDown={e => e.preventDefault()} onClick={() => onPick(r, c, header)}
              className={cx('h-4 w-4 rounded-[3px] border', on ? 'border-[#C89B3C] bg-[#C89B3C]/25' : 'border-[#D9D5CA] bg-white')} />
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-3 text-[12px] text-[#4A4A4A]">
        <span className="font-semibold tabular-nums">{hover.rows ? `${hover.cols} × ${hover.rows}` : 'Choose a size'}</span>
        <label className="flex items-center gap-1.5">
          <input type="checkbox" checked={header} onChange={e => setHeader(e.target.checked)} className="accent-[#C89B3C]" /> Header row
        </label>
      </div>
    </div>
  );
}

export function insertTable(editor: Editor, rows: number, cols: number, withHeaderRow: boolean) {
  editor.chain().focus().insertTable({ rows, cols, withHeaderRow }).run();
}

// ── Paint format ────────────────────────────────────────────────────────────

interface PaintFormat { marks: Mark[]; block: { textAlign?: unknown; lineSpacing?: unknown; indent?: unknown } }

/** Copies the formatting at the cursor; the next selection made with the mouse gets it. */
function usePaintFormat(editor: Editor) {
  const [format, setFormat] = useState<PaintFormat | null>(null);

  useEffect(() => {
    if (!format) return;
    const dom = editor.view.dom;
    dom.classList.add('is-painting');
    const apply = () => setTimeout(() => {
      const { from, to } = editor.state.selection;
      const chain = editor.chain().focus();
      if (from !== to) {
        for (const name of Object.keys(editor.schema.marks)) if (name !== 'link') chain.unsetMark(name);
        for (const mark of format.marks) chain.setMark(mark.type.name, mark.attrs);
      }
      chain.updateAttributes('paragraph', format.block).updateAttributes('heading', format.block).run();
      setFormat(null);
    }, 0);
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setFormat(null); };
    dom.addEventListener('mouseup', apply);
    document.addEventListener('keydown', onKey);
    return () => {
      dom.classList.remove('is-painting');
      dom.removeEventListener('mouseup', apply);
      document.removeEventListener('keydown', onKey);
    };
  }, [editor, format]);

  const toggle = () => {
    if (format) { setFormat(null); return; }
    const { $from } = editor.state.selection;
    const marks = (editor.state.storedMarks ?? $from.marks()).filter(m => m.type.name !== 'link');
    const attrs = $from.parent.attrs;
    setFormat({ marks: [...marks], block: { textAlign: attrs.textAlign ?? null, lineSpacing: attrs.lineSpacing ?? null, indent: attrs.indent ?? 0 } });
  };
  return { painting: !!format, toggle };
}

// ── Menu bar ────────────────────────────────────────────────────────────────

type MenuItem =
  | 'divider'
  | {
    label: string;
    onSelect?: () => void;
    shortcut?: string;
    disabled?: boolean;
    checked?: boolean;
    submenu?: MenuItem[];
    /** Custom content shown as the submenu (e.g. the table grid). */
    panel?: (close: () => void) => React.ReactNode;
  };

function MenuList({ items, close, className }: { items: MenuItem[]; close: () => void; className?: string }) {
  const [sub, setSub] = useState<number | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key !== 'ArrowDown' && e.key !== 'ArrowUp') return;
    e.preventDefault();
    e.stopPropagation();
    const buttons = [...(listRef.current?.querySelectorAll<HTMLButtonElement>(':scope > div > button[role="menuitem"]:not(:disabled)') ?? [])];
    const at = buttons.indexOf(document.activeElement as HTMLButtonElement);
    buttons[(at + (e.key === 'ArrowDown' ? 1 : -1) + buttons.length) % buttons.length]?.focus();
  }

  return (
    <div ref={listRef} role="menu" onKeyDown={onKeyDown}
      className={cx('min-w-[240px] rounded-lg border border-[#E5E2D9] bg-white py-1 shadow-xl', className)}>
      {items.map((item, i) => {
        if (item === 'divider') return <div key={i} role="separator" className="my-1 h-px bg-[#F0EEE8]" />;
        const hasSub = !!(item.submenu || item.panel);
        return (
          <div key={i} className="relative" onMouseEnter={() => setSub(hasSub ? i : null)}>
            <button type="button" role="menuitem" disabled={item.disabled} aria-haspopup={hasSub || undefined} aria-expanded={hasSub ? sub === i : undefined}
              onMouseDown={e => e.preventDefault()}
              onKeyDown={e => { if (hasSub && e.key === 'ArrowRight') { e.preventDefault(); setSub(i); } }}
              onClick={() => { if (hasSub) { setSub(sub === i ? null : i); return; } item.onSelect?.(); close(); }}
              className={cx('flex w-full items-center gap-2 px-3 py-1.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#F3F1EA] disabled:text-[#B5B0A2] disabled:hover:bg-transparent',
                sub === i && 'bg-[#F3F1EA]')}>
              <Check className={cx('h-3.5 w-3.5 shrink-0', item.checked ? '' : 'invisible')} aria-hidden="true" />
              <span className="flex-1">{item.label}</span>
              {item.shortcut && <span className="pl-6 text-[12px] text-[#8C8679]">{item.shortcut}</span>}
              {hasSub && <ChevronRight className="h-3.5 w-3.5 text-[#8C8679]" aria-hidden="true" />}
            </button>
            {hasSub && sub === i && (
              <div className="absolute left-full top-0 z-40 -mt-1 pl-0.5">
                {item.panel
                  ? <div className="rounded-lg border border-[#E5E2D9] bg-white py-1 shadow-xl">{item.panel(close)}</div>
                  : <MenuList items={item.submenu!} close={close} />}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function MenuBar({ menus }: { menus: Array<{ label: string; items: () => MenuItem[] }> }) {
  const [open, setOpen] = useState<string | null>(null);
  const close = useCallback(() => setOpen(null), []);
  const ref = useDismiss(open !== null, close);
  return (
    <div ref={ref} role="menubar" aria-label="Editor menus" className="flex flex-wrap items-center gap-0.5">
      {menus.map(menu => (
        <div key={menu.label} className="relative">
          <button type="button" role="menuitem" aria-haspopup="true" aria-expanded={open === menu.label}
            onMouseDown={e => e.preventDefault()}
            onClick={() => setOpen(v => (v === menu.label ? null : menu.label))}
            onMouseEnter={() => { if (open && open !== menu.label) setOpen(menu.label); }}
            onKeyDown={e => { if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(menu.label); } }}
            className={cx('rounded-md px-2.5 py-1 text-[13px] text-[#3A3A3A] hover:bg-[#F3F1EA]', open === menu.label && 'bg-[#F1E4C3]')}>
            {menu.label}
          </button>
          {open === menu.label && <MenuList items={menu.items()} close={close} className="absolute left-0 top-full z-30 mt-1" />}
        </div>
      ))}
    </div>
  );
}

// ── Toolbar ─────────────────────────────────────────────────────────────────

export const ZOOMS = [50, 75, 90, 100, 125, 150, 200];

export interface ToolbarActions {
  onLink: () => void;
  onImage: () => void;
  onFind: (replace: boolean) => void;
  onSpecialChars: () => void;
  onWordCount: () => void;
  onShortcuts: () => void;
  zoom: number;
  onZoom: (zoom: number) => void;
  spellcheck: boolean;
  onSpellcheck: (on: boolean) => void;
  panelHidden: boolean;
  onTogglePanel: () => void;
}

export default function Toolbar({ editor, ...a }: { editor: Editor } & ToolbarActions) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const block = blockAttrs(e);
      return {
        style: currentStyle(e),
        font: currentFont(e),
        size: currentFontSize(e),
        color: String(e.getAttributes('textStyle').color ?? ''),
        highlight: String(e.getAttributes('highlight').color ?? ''),
        bold: e.isActive('bold'),
        italic: e.isActive('italic'),
        underline: e.isActive('underline'),
        strike: e.isActive('strike'),
        sup: e.isActive('superscript'),
        sub: e.isActive('subscript'),
        code: e.isActive('code'),
        link: e.isActive('link'),
        bullet: e.isActive('bulletList'),
        ordered: e.isActive('orderedList'),
        task: e.isActive('taskList'),
        table: e.isActive('table'),
        align: (['left', 'center', 'right', 'justify'] as const).find(v => e.isActive({ textAlign: v })) ?? 'left',
        spacing: String(block.lineSpacing ?? ''),
        indent: Number(block.indent ?? 0),
        canUndo: e.can().undo(),
        canRedo: e.can().redo(),
        empty: e.state.selection.empty,
      };
    },
  });
  const paint = usePaintFormat(editor);
  const [sizeDraft, setSizeDraft] = useState<string | null>(null);
  const chain = () => editor.chain().focus();
  const i = 'h-4 w-4';

  const ALIGNS = [
    { id: 'left', label: 'Left', shortcut: 'Ctrl+Shift+L', Icon: AlignLeft },
    { id: 'center', label: 'Center', shortcut: 'Ctrl+Shift+E', Icon: AlignCenter },
    { id: 'right', label: 'Right', shortcut: 'Ctrl+Shift+R', Icon: AlignRight },
    { id: 'justify', label: 'Justified', shortcut: 'Ctrl+Shift+J', Icon: AlignJustify },
  ] as const;
  const AlignIcon = ALIGNS.find(x => x.id === s.align)?.Icon ?? AlignLeft;
  const spacingLabel = (v: string) => ({ '1': 'Single', '1.15': '1.15', '1.5': '1.5', '1.85': '1.85 (default)', '2': 'Double', '2.5': '2.5' })[v] ?? v;
  const caseItems: MenuItem[] = [
    { label: 'lowercase', disabled: s.empty, onSelect: () => changeCase(editor, 'lower') },
    { label: 'UPPERCASE', disabled: s.empty, onSelect: () => changeCase(editor, 'upper') },
    { label: 'Title Case', disabled: s.empty, onSelect: () => changeCase(editor, 'title') },
    { label: 'Sentence case', disabled: s.empty, onSelect: () => changeCase(editor, 'sentence') },
  ];
  const tableItems = (): MenuItem[] => [
    { label: 'Insert table', panel: close => <TableGrid onPick={(r, c, h) => { insertTable(editor, r, c, h); close(); }} /> },
    'divider',
    { label: 'Insert row above', disabled: !s.table, onSelect: () => chain().addRowBefore().run() },
    { label: 'Insert row below', disabled: !s.table, onSelect: () => chain().addRowAfter().run() },
    { label: 'Insert column left', disabled: !s.table, onSelect: () => chain().addColumnBefore().run() },
    { label: 'Insert column right', disabled: !s.table, onSelect: () => chain().addColumnAfter().run() },
    'divider',
    { label: 'Delete row', disabled: !s.table, onSelect: () => chain().deleteRow().run() },
    { label: 'Delete column', disabled: !s.table, onSelect: () => chain().deleteColumn().run() },
    { label: 'Delete table', disabled: !s.table, onSelect: () => chain().deleteTable().run() },
    'divider',
    { label: 'Merge cells', disabled: !s.table || !editor.can().mergeCells(), onSelect: () => chain().mergeCells().run() },
    { label: 'Unmerge cells', disabled: !s.table || !editor.can().splitCell(), onSelect: () => chain().splitCell().run() },
    { label: 'Header row', disabled: !s.table, onSelect: () => chain().toggleHeaderRow().run() },
    { label: 'Header column', disabled: !s.table, onSelect: () => chain().toggleHeaderColumn().run() },
  ];

  const menus: Array<{ label: string; items: () => MenuItem[] }> = [
    {
      label: 'Edit',
      items: () => [
        { label: 'Undo', shortcut: 'Ctrl+Z', disabled: !s.canUndo, onSelect: () => chain().undo().run() },
        { label: 'Redo', shortcut: 'Ctrl+Shift+Z', disabled: !s.canRedo, onSelect: () => chain().redo().run() },
        'divider',
        { label: 'Select all', shortcut: 'Ctrl+A', onSelect: () => chain().selectAll().run() },
        'divider',
        { label: 'Find', shortcut: 'Ctrl+F', onSelect: () => a.onFind(false) },
        { label: 'Find and replace', shortcut: 'Ctrl+H', onSelect: () => a.onFind(true) },
      ],
    },
    {
      label: 'View',
      items: () => [
        { label: 'Zoom', submenu: ZOOMS.map(z => ({ label: `${z}%`, checked: a.zoom === z, onSelect: () => a.onZoom(z) })) },
        'divider',
        { label: 'Show details panel', checked: !a.panelHidden, onSelect: a.onTogglePanel },
      ],
    },
    {
      label: 'Insert',
      items: () => [
        { label: 'Image', onSelect: a.onImage },
        { label: 'Table', panel: close => <TableGrid onPick={(r, c, h) => { insertTable(editor, r, c, h); close(); }} /> },
        { label: 'Link', shortcut: 'Ctrl+K', onSelect: a.onLink },
        'divider',
        { label: 'Horizontal line', onSelect: () => chain().setHorizontalRule().run() },
        { label: 'Quote', onSelect: () => chain().toggleBlockquote().run() },
        { label: 'Code block', onSelect: () => chain().toggleCodeBlock().run() },
        { label: 'Checklist', onSelect: () => chain().toggleTaskList().run() },
        'divider',
        { label: 'Special characters', onSelect: a.onSpecialChars },
      ],
    },
    {
      label: 'Format',
      items: () => [
        {
          label: 'Text',
          submenu: [
            { label: 'Bold', shortcut: 'Ctrl+B', checked: s.bold, onSelect: () => chain().toggleBold().run() },
            { label: 'Italic', shortcut: 'Ctrl+I', checked: s.italic, onSelect: () => chain().toggleItalic().run() },
            { label: 'Underline', shortcut: 'Ctrl+U', checked: s.underline, onSelect: () => chain().toggleUnderline().run() },
            { label: 'Strikethrough', shortcut: 'Ctrl+Shift+S', checked: s.strike, onSelect: () => chain().toggleStrike().run() },
            { label: 'Superscript', shortcut: 'Ctrl+.', checked: s.sup, onSelect: () => chain().toggleSuperscript().run() },
            { label: 'Subscript', shortcut: 'Ctrl+,', checked: s.sub, onSelect: () => chain().toggleSubscript().run() },
            { label: 'Inline code', shortcut: 'Ctrl+E', checked: s.code, onSelect: () => chain().toggleCode().run() },
            'divider',
            { label: 'Increase font size', shortcut: 'Ctrl+Shift+.', onSelect: () => applyFontSize(editor, s.size + 1) },
            { label: 'Decrease font size', shortcut: 'Ctrl+Shift+,', onSelect: () => applyFontSize(editor, s.size - 1) },
            'divider',
            { label: 'Capitalisation', submenu: caseItems },
          ],
        },
        { label: 'Paragraph styles', submenu: STYLES.map(st => ({ label: st.label, checked: s.style === st.id, onSelect: () => setStyle(editor, st.id) })) },
        {
          label: 'Align & indent',
          submenu: [
            ...ALIGNS.map(al => ({ label: al.label, shortcut: al.shortcut, checked: s.align === al.id, onSelect: () => chain().setTextAlign(al.id).run() })),
            'divider',
            { label: 'Increase indent', shortcut: 'Ctrl+]', onSelect: () => chain().indent().run() },
            { label: 'Decrease indent', shortcut: 'Ctrl+[', onSelect: () => chain().outdent().run() },
          ],
        },
        {
          label: 'Line spacing',
          submenu: [
            ...LINE_SPACINGS.map(v => ({ label: spacingLabel(v), checked: (s.spacing || '1.85') === v, onSelect: () => chain().setLineSpacing(v === '1.85' ? null : v).run() })),
          ],
        },
        {
          label: 'Bullets & numbering',
          submenu: [
            { label: 'Bulleted list', shortcut: 'Ctrl+Shift+8', checked: s.bullet, onSelect: () => chain().toggleBulletList().run() },
            { label: 'Numbered list', shortcut: 'Ctrl+Shift+7', checked: s.ordered, onSelect: () => chain().toggleOrderedList().run() },
            { label: 'Checklist', shortcut: 'Ctrl+Shift+9', checked: s.task, onSelect: () => chain().toggleTaskList().run() },
          ],
        },
        { label: 'Table', submenu: tableItems() },
        'divider',
        { label: 'Clear formatting', shortcut: 'Ctrl+\\', onSelect: () => clearFormatting(editor) },
      ],
    },
    { label: 'Table', items: tableItems },
    {
      label: 'Tools',
      items: () => [
        { label: 'Word count', shortcut: 'Ctrl+Shift+C', onSelect: a.onWordCount },
        { label: 'Spell check', checked: a.spellcheck, onSelect: () => a.onSpellcheck(!a.spellcheck) },
        'divider',
        { label: 'Keyboard shortcuts', shortcut: 'Ctrl+/', onSelect: a.onShortcuts },
      ],
    },
  ];

  function commitSize() {
    if (sizeDraft === null) return;
    const n = Number(sizeDraft);
    if (sizeDraft.trim() && Number.isFinite(n) && n > 0) applyFontSize(editor, n);
    setSizeDraft(null);
  }

  return (
    <div className="sticky top-0 z-20 rounded-t-xl border-b border-[#ECEAE3] bg-white/95 backdrop-blur">
      <div className="border-b border-[#F3F1EA] px-2 pt-1.5 pb-1">
        <MenuBar menus={menus} />
      </div>
      <div className="flex flex-wrap items-center gap-0.5 px-2 py-1.5" role="toolbar" aria-label="Formatting">
        <ToolButton label="Undo (Ctrl+Z)" disabled={!s.canUndo} onClick={() => chain().undo().run()}><Undo2 className={i} /></ToolButton>
        <ToolButton label="Redo (Ctrl+Shift+Z)" disabled={!s.canRedo} onClick={() => chain().redo().run()}><Redo2 className={i} /></ToolButton>
        <ToolButton label={paint.painting ? 'Paint format: select text to apply (Esc to cancel)' : 'Paint format: copy formatting to other text'} active={paint.painting} onClick={paint.toggle}><Paintbrush className={i} /></ToolButton>
        <Dropdown label="Zoom" button={<span className="w-10 text-left text-[13px] tabular-nums">{a.zoom}%</span>}>
          {close => ZOOMS.map(z => <Option key={z} selected={a.zoom === z} onClick={() => { a.onZoom(z); close(); }}>{z}%</Option>)}
        </Dropdown>
        <Divider />

        <Dropdown label="Styles" button={<span className="w-[92px] truncate text-left text-[13px]">{STYLES.find(x => x.id === s.style)?.label}</span>} panelClass="w-56">
          {close => STYLES.map(st => (
            <Option key={st.id} selected={s.style === st.id} onClick={() => { setStyle(editor, st.id); close(); }}>
              <span className={cx(st.id === 'h2' && 'font-primary text-[18px]', st.id === 'h3' && 'text-[15px] font-semibold', st.id === 'h4' && 'font-semibold',
                st.id === 'quote' && 'font-primary italic', st.id === 'code' && 'font-mono text-[12px]')}>{st.label}</span>
            </Option>
          ))}
        </Dropdown>
        <Divider />
        <Dropdown label="Font" button={<span className="w-[104px] truncate text-left text-[13px]" style={{ fontFamily: ARTICLE_FONTS.find(f => f.label === s.font)?.css }}>{s.font || 'Default'}</span>} panelClass="w-60">
          {close => <FontList current={s.font} onPick={css => { (css ? chain().setFontFamily(css) : chain().unsetFontFamily()).run(); close(); }} />}
        </Dropdown>
        <Divider />

        {/* Font size: type a size, or step it */}
        <div className="flex items-center">
          <ToolButton label="Decrease font size (Ctrl+Shift+,)" disabled={s.size <= MIN_FONT} onClick={() => applyFontSize(editor, s.size - 1)}><Minus className="h-3.5 w-3.5" /></ToolButton>
          <input aria-label="Font size" title="Font size (8–72)" inputMode="numeric"
            value={sizeDraft ?? String(s.size)}
            onFocus={e => { setSizeDraft(String(s.size)); e.currentTarget.select(); }}
            onChange={e => setSizeDraft(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
            onBlur={commitSize}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); commitSize(); }
              if (e.key === 'Escape') { setSizeDraft(null); editor.commands.focus(); }
              if (e.key === 'ArrowUp' || e.key === 'ArrowDown') { e.preventDefault(); setSizeDraft(String(Math.min(MAX_FONT, Math.max(MIN_FONT, Number(sizeDraft ?? s.size) + (e.key === 'ArrowUp' ? 1 : -1))))); }
            }}
            className="w-10 rounded-md border border-[#E5E2D9] bg-white py-1 text-center text-[13px] tabular-nums text-[#1A1A1A] outline-none focus:border-[#C89B3C]" />
          <ToolButton label="Increase font size (Ctrl+Shift+.)" disabled={s.size >= MAX_FONT} onClick={() => applyFontSize(editor, s.size + 1)}><Plus className="h-3.5 w-3.5" /></ToolButton>
        </div>
        <Divider />

        <ToolButton label="Bold (Ctrl+B)" active={s.bold} onClick={() => chain().toggleBold().run()}><Bold className={i} /></ToolButton>
        <ToolButton label="Italic (Ctrl+I)" active={s.italic} onClick={() => chain().toggleItalic().run()}><Italic className={i} /></ToolButton>
        <ToolButton label="Underline (Ctrl+U)" active={s.underline} onClick={() => chain().toggleUnderline().run()}><Underline className={i} /></ToolButton>
        <Dropdown label="Text colour" button={(
          <span className="flex flex-col items-center"><Baseline className={i} aria-hidden="true" /><span className="-mt-0.5 h-1 w-4 rounded-sm" style={{ backgroundColor: s.color || '#1A1A1A' }} /></span>
        )}>
          {close => <ColorPanel current={s.color} resetLabel="Default colour" onPick={c => { chain().setColor(c).run(); close(); }} onReset={() => { chain().unsetColor().run(); close(); }} />}
        </Dropdown>
        <Dropdown label="Highlight colour" button={(
          <span className="flex flex-col items-center"><Highlighter className={i} aria-hidden="true" /><span className="-mt-0.5 h-1 w-4 rounded-sm border border-black/5" style={{ backgroundColor: s.highlight || 'transparent' }} /></span>
        )}>
          {close => <ColorPanel current={s.highlight} resetLabel="No highlight" onPick={c => { chain().setHighlight({ color: c }).run(); close(); }} onReset={() => { chain().unsetHighlight().run(); close(); }} />}
        </Dropdown>
        <Divider />

        <ToolButton label="Insert link (Ctrl+K)" active={s.link} onClick={a.onLink}><Link2 className={i} /></ToolButton>
        <ToolButton label="Insert image" onClick={a.onImage}><ImagePlus className={i} /></ToolButton>
        <Dropdown label="Insert table" button={<Table2 className={i} aria-hidden="true" />}>
          {close => <TableGrid onPick={(r, c, h) => { insertTable(editor, r, c, h); close(); }} />}
        </Dropdown>
        <Divider />

        <Dropdown label="Align" button={<AlignIcon className={i} aria-hidden="true" />}>
          {close => (
            <div className="flex gap-0.5 px-1">
              {ALIGNS.map(al => (
                <ToolButton key={al.id} label={`${al.label} (${al.shortcut})`} active={s.align === al.id} onClick={() => { chain().setTextAlign(al.id).run(); close(); }}><al.Icon className={i} /></ToolButton>
              ))}
            </div>
          )}
        </Dropdown>
        <Dropdown label="Line spacing" button={<UnfoldVertical className={i} aria-hidden="true" />} panelClass="w-48">
          {close => LINE_SPACINGS.map(v => (
            <Option key={v} selected={(s.spacing || '1.85') === v} onClick={() => { chain().setLineSpacing(v === '1.85' ? null : v).run(); close(); }}>{spacingLabel(v)}</Option>
          ))}
        </Dropdown>
        <ToolButton label="Checklist (Ctrl+Shift+9)" active={s.task} onClick={() => chain().toggleTaskList().run()}><ListChecks className={i} /></ToolButton>
        <ToolButton label="Bulleted list (Ctrl+Shift+8)" active={s.bullet} onClick={() => chain().toggleBulletList().run()}><List className={i} /></ToolButton>
        <ToolButton label="Numbered list (Ctrl+Shift+7)" active={s.ordered} onClick={() => chain().toggleOrderedList().run()}><ListOrdered className={i} /></ToolButton>
        <ToolButton label="Decrease indent (Ctrl+[)" disabled={s.indent <= 0 && !s.bullet && !s.ordered && !s.task} onClick={() => chain().outdent().run()}><IndentDecrease className={i} /></ToolButton>
        <ToolButton label="Increase indent (Ctrl+])" disabled={s.indent >= MAX_INDENT} onClick={() => chain().indent().run()}><IndentIncrease className={i} /></ToolButton>
        <ToolButton label="Clear formatting (Ctrl+\)" onClick={() => clearFormatting(editor)}><RemoveFormatting className={i} /></ToolButton>

        <span className="ml-auto" />
        <ToolButton label="Find and replace (Ctrl+H)" onClick={() => a.onFind(true)}><Search className={i} /></ToolButton>
        <ToolButton label="Keyboard shortcuts (Ctrl+/)" onClick={a.onShortcuts}><Keyboard className={i} /></ToolButton>
      </div>
    </div>
  );
}
