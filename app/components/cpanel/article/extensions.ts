/**
 * The article editor's extensions: StarterKit plus what a Google Docs-style
 * toolbar needs (font, size, colours, highlight colours, sub/superscript,
 * alignment incl. justify, line spacing and indent, checklists, tables and
 * captioned images). Everything they produce is allowed by the site's HTML
 * cleaner (sanitizeArticleHtml), so the published article matches the editor.
 */

import { Extension, type AnyExtension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, TextSelection, type EditorState } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node as PMNode } from '@tiptap/pm/model';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Highlight from '@tiptap/extension-highlight';
import Subscript from '@tiptap/extension-subscript';
import Superscript from '@tiptap/extension-superscript';
import { TaskItem, TaskList } from '@tiptap/extension-list';
import { TableKit } from '@tiptap/extension-table';
import { Color, FontFamily, FontSize, TextStyle } from '@tiptap/extension-text-style';
import { FigureImage } from './FigureImage';

export const LINE_SPACINGS = ['1', '1.15', '1.5', '1.85', '2', '2.5'] as const;
export const MAX_INDENT = 6;

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    paragraphFormat: {
      /** Paragraph line spacing, e.g. "1.5"; null resets it. */
      setLineSpacing: (value: string | null) => ReturnType;
      /** Indents the paragraph (or the list item, in a list). */
      indent: () => ReturnType;
      outdent: () => ReturnType;
    };
  }
}

/** Line spacing and indent on paragraphs and headings (as Google Docs does), and table cell colours, rendered as inline styles. */
const ParagraphFormat = Extension.create({
  name: 'paragraphFormat',
  addGlobalAttributes() {
    return [{
      types: ['paragraph', 'heading'],
      attributes: {
        lineSpacing: {
          default: null,
          parseHTML: el => {
            const v = (el as HTMLElement).style.lineHeight;
            return (LINE_SPACINGS as readonly string[]).includes(v) ? v : null;
          },
          renderHTML: attrs => (attrs.lineSpacing ? { style: `line-height: ${attrs.lineSpacing}` } : {}),
        },
        indent: {
          default: 0,
          parseHTML: el => {
            const m = /^(\d)em$/.exec((el as HTMLElement).style.marginLeft);
            return m ? Math.min(MAX_INDENT, Number(m[1]) / 2) : 0;
          },
          renderHTML: attrs => (attrs.indent ? { style: `margin-left: ${attrs.indent * 2}em` } : {}),
        },
      },
    }, {
      // Table cell shading (Table → Cell background colour).
      types: ['tableCell', 'tableHeader'],
      attributes: {
        backgroundColor: {
          default: null,
          parseHTML: el => (el as HTMLElement).style.backgroundColor || null,
          renderHTML: attrs => (attrs.backgroundColor ? { style: `background-color: ${attrs.backgroundColor}` } : {}),
        },
      },
    }];
  },
  addCommands() {
    const blocks = ['paragraph', 'heading'];
    const updateBlocks = (fn: (attrs: Record<string, unknown>) => Record<string, unknown> | null) =>
      ({ tr, state, dispatch }: { tr: import('@tiptap/pm/state').Transaction; state: EditorState; dispatch?: unknown }) => {
        const { from, to } = state.selection;
        let changed = false;
        state.doc.nodesBetween(from, to, (node, pos) => {
          if (!blocks.includes(node.type.name)) return;
          const next = fn(node.attrs);
          if (next) { tr.setNodeMarkup(pos, undefined, { ...node.attrs, ...next }); changed = true; }
        });
        if (changed && dispatch) (dispatch as (t: typeof tr) => void)(tr);
        return changed;
      };
    return {
      setLineSpacing: value => props => updateBlocks(() => ({ lineSpacing: value }))(props),
      indent: () => props => {
        if (props.editor.isActive('listItem')) return props.commands.sinkListItem('listItem');
        if (props.editor.isActive('taskItem')) return props.commands.sinkListItem('taskItem');
        return updateBlocks(a => (Number(a.indent) < MAX_INDENT ? { indent: Number(a.indent) + 1 } : null))(props);
      },
      outdent: () => props => {
        if (props.editor.isActive('listItem')) return props.commands.liftListItem('listItem');
        if (props.editor.isActive('taskItem')) return props.commands.liftListItem('taskItem');
        return updateBlocks(a => (Number(a.indent) > 0 ? { indent: Number(a.indent) - 1 } : null))(props);
      },
    };
  },
  addKeyboardShortcuts() {
    return {
      'Mod-]': () => this.editor.commands.indent(),
      'Mod-[': () => this.editor.commands.outdent(),
    };
  },
});

// ── Pasting from Google Docs, Word, Sheets and web pages ───────────────────

/**
 * Tidies pasted HTML so it fits the page: drops fixed table and column widths
 * (which made pasted tables overflow), Google Docs' wrapper and Word's
 * leftovers, and the defaults those apps stamp on every run of text (black,
 * Arial 11pt, normal weight), keeping real formatting.
 */
export function cleanPastedHtml(html: string): string {
  if (typeof DOMParser === 'undefined' || !/<[a-z]/i.test(html)) return html;
  const doc = new DOMParser().parseFromString(html, 'text/html');
  // Google Docs wraps the whole paste in <b id="docs-internal-guid-…" style="font-weight:normal">.
  doc.querySelectorAll('b[id^="docs-internal-guid"]').forEach(b => b.replaceWith(...Array.from(b.childNodes)));
  doc.querySelectorAll('colgroup, col, meta, style, script, title, o\\:p').forEach(el => el.remove());
  doc.querySelectorAll<HTMLElement>('table, thead, tbody, tr, td, th').forEach(el => {
    el.removeAttribute('width');
    el.removeAttribute('height');
    el.removeAttribute('data-colwidth');
    for (const prop of ['width', 'min-width', 'max-width', 'height', 'table-layout', 'margin-left', 'margin-right']) el.style.removeProperty(prop);
  });
  doc.querySelectorAll<HTMLElement>('[style]').forEach(el => {
    const st = el.style;
    if (/^(rgb\(0, 0, 0\)|#000000|#000|black|windowtext)$/i.test(st.color)) st.removeProperty('color');
    if (/^(transparent|rgba\(0, 0, 0, 0\)|initial)$/i.test(st.backgroundColor)) st.removeProperty('background-color');
    if (/^"?(arial|calibri|aptos|times new roman)"?/i.test(st.fontFamily) && /^(11pt|12pt|14\.6667px|16px)?$/.test(st.fontSize)) st.removeProperty('font-family');
    if (/^(11pt|12pt)$/.test(st.fontSize)) st.removeProperty('font-size');
    if (/^(400|normal)$/.test(st.fontWeight)) st.removeProperty('font-weight');
    if (!el.getAttribute('style')?.trim()) el.removeAttribute('style');
  });
  return doc.body.innerHTML;
}

const PasteCleanup = Extension.create({
  name: 'pasteCleanup',
  addProseMirrorPlugins() {
    return [new Plugin({ key: new PluginKey('pasteCleanup'), props: { transformPastedHTML: cleanPastedHtml } })];
  },
});

// ── Find and replace ────────────────────────────────────────────────────────

export interface SearchMatch { from: number; to: number }
export interface SearchState { term: string; caseSensitive: boolean; current: number; matches: SearchMatch[] }

export const searchKey = new PluginKey<SearchState>('articleSearch');

/** Every occurrence of `term` in the document's text (within a paragraph, heading, cell…). */
export function findMatches(doc: PMNode, term: string, caseSensitive: boolean): SearchMatch[] {
  if (!term) return [];
  const needle = caseSensitive ? term : term.toLowerCase();
  const found: SearchMatch[] = [];
  doc.descendants((node, pos) => {
    if (!node.isTextblock) return true;
    let text = '';
    const at: number[] = [];
    node.forEach((child, offset) => {
      const start = pos + 1 + offset;
      if (child.isText && child.text) {
        for (let i = 0; i < child.text.length; i++) at.push(start + i);
        text += child.text;
      } else {
        at.push(start);
        text += '\ufffc';
      }
    });
    const lowered = caseSensitive ? text : text.toLowerCase();
    const hay = lowered.length === text.length ? lowered : text;
    for (let i = hay.indexOf(needle); i !== -1; i = hay.indexOf(needle, i + needle.length)) {
      found.push({ from: at[i], to: at[i + needle.length - 1] + 1 });
    }
    return false;
  });
  return found;
}

/** Highlights the matches of the find panel's search; the current one stands out. */
const SearchHighlight = Extension.create({
  name: 'articleSearch',
  addProseMirrorPlugins() {
    return [new Plugin<SearchState>({
      key: searchKey,
      state: {
        init: () => ({ term: '', caseSensitive: false, current: 0, matches: [] }),
        apply(tr, prev, _old, state) {
          const meta = tr.getMeta(searchKey) as Partial<SearchState> | undefined;
          if (!meta && !tr.docChanged) return prev;
          const next = { ...prev, ...meta };
          const matches = findMatches(state.doc, next.term, next.caseSensitive);
          const current = matches.length ? Math.min(Math.max(next.current, 0), matches.length - 1) : 0;
          return { ...next, matches, current };
        },
      },
      props: {
        decorations(state) {
          const search = searchKey.getState(state);
          if (!search?.matches.length) return null;
          return DecorationSet.create(state.doc, search.matches.map((m, i) =>
            Decoration.inline(m.from, m.to, { class: i === search.current ? 'search-match search-match-current' : 'search-match' })));
        },
      },
    })];
  },
});

/** Updates the find panel's search (term, case, current match). */
export function setSearch(editor: Editor, next: Partial<SearchState>) {
  editor.view.dispatch(editor.state.tr.setMeta(searchKey, next));
}

/** Moves to the next (1) or previous (-1) match, selecting it and scrolling to it. */
export function stepSearch(editor: Editor, direction: 1 | -1) {
  const search = searchKey.getState(editor.state);
  if (!search?.matches.length) return;
  const current = (search.current + direction + search.matches.length) % search.matches.length;
  const match = search.matches[current];
  const tr = editor.state.tr.setMeta(searchKey, { current })
    .setSelection(TextSelection.create(editor.state.doc, match.from, match.to)).scrollIntoView();
  editor.view.dispatch(tr);
}

/** Replaces the current match (or every match) with `text`, keeping its formatting. */
export function replaceSearch(editor: Editor, text: string, all: boolean): number {
  const search = searchKey.getState(editor.state);
  if (!search?.matches.length) return 0;
  const targets = all ? search.matches : [search.matches[search.current]];
  const tr = editor.state.tr;
  for (const m of [...targets].reverse()) {
    if (text) tr.insertText(text, m.from, m.to);
    else tr.delete(m.from, m.to);
  }
  if (!all) {
    // Select the match that now follows, ready for the next replace.
    const end = tr.mapping.map(targets[0].to);
    tr.setSelection(TextSelection.create(tr.doc, end));
  }
  editor.view.dispatch(tr.scrollIntoView());
  return targets.length;
}

// ── Text case ───────────────────────────────────────────────────────────────

export type TextCase = 'upper' | 'lower' | 'title' | 'sentence';

/** Changes the selected text to UPPER, lower, Title or Sentence case, keeping its formatting. */
export function changeCase(editor: Editor, kind: TextCase) {
  const { state } = editor;
  const { from, to } = state.selection;
  if (from === to) return;
  const parts: Array<{ from: number; to: number; text: string; marks: PMNode['marks'] }> = [];
  let prev = state.doc.textBetween(Math.max(0, from - 1), from, '\n', ' ') || ' ';
  let sentenceStart = /^[\s]*$/.test(state.doc.textBetween(Math.max(0, from - 3), from, '\n', ' ')) || /[.!?]\s*$/.test(state.doc.textBetween(Math.max(0, from - 3), from, '\n', ' '));
  state.doc.nodesBetween(from, to, (node, pos) => {
    if (node.isTextblock && pos >= from) { prev = ' '; sentenceStart = true; }
    if (!node.isText || !node.text) return;
    const start = Math.max(from, pos);
    const end = Math.min(to, pos + node.text.length);
    const original = node.text.slice(start - pos, end - pos);
    let out = '';
    for (const ch of original) {
      if (kind === 'upper') out += ch.toUpperCase();
      else if (kind === 'lower') out += ch.toLowerCase();
      else if (kind === 'title') out += /\s|[-(\[\/"“]/.test(prev) ? ch.toUpperCase() : ch.toLowerCase();
      else {
        out += sentenceStart && /\p{L}/u.test(ch) ? ch.toUpperCase() : ch.toLowerCase();
        if (/\p{L}|\d/u.test(ch)) sentenceStart = false;
        if (/[.!?]/.test(ch)) sentenceStart = true;
      }
      prev = ch;
    }
    if (out !== original) parts.push({ from: start, to: end, text: out, marks: node.marks });
  });
  if (!parts.length) return;
  const tr = state.tr;
  for (const part of parts.reverse()) tr.replaceWith(part.from, part.to, state.schema.text(part.text, part.marks));
  tr.setSelection(TextSelection.create(tr.doc, from, tr.mapping.map(to)));
  editor.view.dispatch(tr);
  editor.commands.focus();
}

export function articleExtensions(placeholder: string): AnyExtension[] {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3, 4] },
      // Links open in the same tab unless "Open in a new tab" is ticked.
      link: { openOnClick: false, autolink: true, defaultProtocol: 'https', HTMLAttributes: { target: null, rel: null } },
    }),
    TextStyle,
    FontFamily,
    FontSize,
    Color,
    Highlight.configure({ multicolor: true }),
    Subscript,
    Superscript,
    TextAlign.configure({ types: ['heading', 'paragraph'], alignments: ['left', 'center', 'right', 'justify'] }),
    ParagraphFormat,
    TaskList,
    TaskItem.configure({ nested: true }),
    TableKit.configure({ table: { resizable: false } }),
    FigureImage,
    SearchHighlight,
    PasteCleanup,
    Placeholder.configure({ placeholder }),
  ];
}
