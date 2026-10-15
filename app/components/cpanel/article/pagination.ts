/**
 * Pages in the document editor, like Google Docs' "Pages" setup: the text
 * is shown on separate sheets (Letter size, portrait or landscape) with a gap
 * and the page number between them. Turned off, it's one long page
 * ("Pageless").
 *
 * Only the display changes: page breaks are decorations placed before the
 * first paragraph, heading, table... that doesn't fit on the page, worked
 * out from their measured heights, so the document itself is untouched. A
 * single block taller than a page (a long table) runs over onto the next.
 */

import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';

/**
 * A break before the block at `pos`: `fill` is the page's empty space left, `after` the margin under
 * the block before it and `before` the margin above the block after it (both cancelled at the break).
 */
interface PageBreak { pos: number; fill: number; after: number; before: number }
interface PaginationState { enabled: boolean; breaks: PageBreak[] }

export const paginationKey = new PluginKey<PaginationState>('pagination');

/** Letter paper: height for a width. */
const pageHeight = (width: number, landscape: boolean) => Math.round(width * (landscape ? 8.5 / 11 : 11 / 8.5));
/** The gap between sheets, in pixels. */
const GAP = 24;

const same = (a: PageBreak[], b: PageBreak[]) => a.length === b.length
  && a.every((x, i) => x.pos === b[i].pos && Math.abs(x.fill - b[i].fill) < 2 && x.after === b[i].after && x.before === b[i].before);

/** Where pages break: before each top-level block that doesn't fit on the current page. */
function measure(view: EditorView): PageBreak[] {
  const dom = view.dom as HTMLElement;
  const style = getComputedStyle(dom);
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const landscape = dom.closest('[data-orientation]')?.getAttribute('data-orientation') === 'landscape';
  const content = pageHeight(dom.offsetWidth, landscape) - padTop - padBottom;
  if (content < 120) return [];

  const breaks: PageBreak[] = [];
  let used = 0;
  let prevMarginBottom = 0;
  view.state.doc.forEach((node, offset) => {
    const el = view.nodeDOM(offset);
    if (!(el instanceof HTMLElement)) return;
    const s = getComputedStyle(el);
    const marginTop = parseFloat(s.marginTop) || 0;
    const marginBottom = parseFloat(s.marginBottom) || 0;
    // Margins between blocks collapse into the larger one; the first block on a page has none above it.
    const above = used === 0 ? 0 : Math.max(marginTop, prevMarginBottom) - prevMarginBottom;
    const height = el.offsetHeight;
    if (used > 0 && used + above + height > content) {
      breaks.push({ pos: offset, fill: Math.max(0, content - used), after: prevMarginBottom, before: marginTop });
      used = height % content;
    } else {
      used += above + height;
      if (used > content) used %= content;
    }
    prevMarginBottom = marginBottom;
  });
  return breaks;
}

/** The space at the bottom of one sheet, the gap with its page number, and the top margin of the next. */
function breakWidget(view: EditorView, { fill, after, before }: PageBreak, page: number): HTMLElement {
  const dom = view.dom as HTMLElement;
  const style = getComputedStyle(dom);
  const padLeft = parseFloat(style.paddingLeft) || 0;
  const padRight = parseFloat(style.paddingRight) || 0;
  const padTop = parseFloat(style.paddingTop) || 0;
  const padBottom = parseFloat(style.paddingBottom) || 0;
  const el = document.createElement('div');
  el.className = 'page-break';
  el.contentEditable = 'false';
  el.setAttribute('aria-hidden', 'true');
  // Negative margins cancel the margins of the blocks either side, so a page starts at its top margin
  // and the blocks themselves (and so their measured sizes) don't change with the breaks.
  el.style.cssText = `margin: -${after}px -${padRight}px -${before}px -${padLeft}px; height: ${fill + padBottom + GAP + padTop}px; user-select: none;`;
  const gap = document.createElement('div');
  gap.className = 'page-break-gap';
  gap.style.cssText = `position: relative; top: ${fill + padBottom}px; height: ${GAP}px;`;
  const label = document.createElement('span');
  label.className = 'page-break-number';
  label.textContent = `Page ${page}`;
  gap.appendChild(label);
  el.appendChild(gap);
  return el;
}

export const Pagination = Extension.create<{ enabled: boolean }>({
  name: 'pagination',
  addOptions() {
    return { enabled: false };
  },
  addProseMirrorPlugins() {
    const initial = this.options.enabled;
    return [new Plugin<PaginationState>({
      key: paginationKey,
      state: {
        init: () => ({ enabled: initial, breaks: [] }),
        apply(tr, prev) {
          const meta = tr.getMeta(paginationKey) as Partial<PaginationState> | undefined;
          const next = meta ? { ...prev, ...meta } : prev;
          if (!next.enabled) return next.breaks.length ? { enabled: false, breaks: [] } : next;
          if (!tr.docChanged || meta?.breaks) return next;
          return { ...next, breaks: next.breaks.map(b => ({ ...b, pos: tr.mapping.map(b.pos) })) };
        },
      },
      props: {
        decorations(state) {
          const s = paginationKey.getState(state);
          if (!s?.enabled || !s.breaks.length) return null;
          return DecorationSet.create(state.doc, s.breaks.map((b, i) => Decoration.widget(b.pos, view => breakWidget(view, b, i + 2), {
            side: -1, ignoreSelection: true, key: `page-${i + 2}-${b.pos}-${Math.round(b.fill)}-${b.after}-${b.before}`,
          })));
        },
        attributes(state): Record<string, string> {
          return paginationKey.getState(state)?.enabled ? { class: 'is-paginated' } : {};
        },
      },
      view(view) {
        let frame = 0;
        const schedule = () => {
          cancelAnimationFrame(frame);
          frame = requestAnimationFrame(() => {
            const s = paginationKey.getState(view.state);
            if (!s?.enabled || view.isDestroyed) return;
            const breaks = measure(view);
            if (!same(breaks, s.breaks)) view.dispatch(view.state.tr.setMeta(paginationKey, { breaks }).setMeta('addToHistory', false).setMeta('loading', true));
          });
        };
        // Pictures loading, fonts, the window or the page orientation changing all move the breaks.
        const resize = new ResizeObserver(schedule);
        resize.observe(view.dom);
        const onLoad = (e: Event) => { if (e.target instanceof HTMLImageElement) schedule(); };
        view.dom.addEventListener('load', onLoad, true);
        schedule();
        return {
          update: (_view, prevState) => {
            const s = paginationKey.getState(view.state);
            const prev = paginationKey.getState(prevState);
            if (s?.enabled && (view.state.doc !== prevState.doc || !prev?.enabled)) schedule();
          },
          destroy: () => {
            cancelAnimationFrame(frame);
            resize.disconnect();
            view.dom.removeEventListener('load', onLoad, true);
          },
        };
      },
    })];
  },
});

/** Turns pages on or off in an editor. */
export function setPaginated(view: EditorView, enabled: boolean) {
  if (paginationKey.getState(view.state)?.enabled === enabled) return;
  view.dispatch(view.state.tr.setMeta(paginationKey, { enabled, breaks: [] }).setMeta('addToHistory', false).setMeta('loading', true));
}
