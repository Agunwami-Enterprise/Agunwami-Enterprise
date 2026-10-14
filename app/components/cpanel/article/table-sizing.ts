/**
 * Table sizing for the editor: drag a column's right edge to change its
 * width, or a row's bottom edge to change its height (like Google Docs),
 * or type the sizes in the table menu. Also a cell's vertical alignment and
 * moving rows and columns.
 *
 * Column widths are prosemirror-tables' own (`colwidth` on cells, written
 * out as a <colgroup>); row heights are a `height` style on the row. The
 * resize plugins are always installed and only act while the editor is
 * editable, since documents switch between reading and editing.
 */

import { Extension, type Editor } from '@tiptap/core';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet, type EditorView } from '@tiptap/pm/view';
import { columnResizing, columnResizingPluginKey, moveTableColumn, moveTableRow, selectedRect, type TableRect } from '@tiptap/pm/tables';

/** The narrowest a column can be, in pixels (keep in step with the Table extension's cellMinWidth). */
export const CELL_MIN_WIDTH = 48;
/** The shortest a row can be dragged to, in pixels. */
const ROW_MIN_HEIGHT = 24;
const MAX_SIZE = 2000;
/** How close to a row's bottom edge (in pixels) the pointer turns into a resize handle. */
const ROW_HANDLE = 5;

export const VERTICAL_ALIGNS = ['top', 'middle', 'bottom'] as const;
export type VerticalAlign = (typeof VERTICAL_ALIGNS)[number];

const px = (value: string) => {
  const m = /^(\d+(?:\.\d+)?)px$/.exec(value.trim());
  return m ? Math.min(MAX_SIZE, Math.round(Number(m[1]))) : null;
};

// ── Row resizing ────────────────────────────────────────────────────────────

interface RowResizeState {
  /** The row whose bottom edge is under the pointer. */
  hover: number | null;
  /** The row being dragged and its height so far. */
  dragging: { pos: number; height: number } | null;
}

const rowResizeKey = new PluginKey<RowResizeState>('tableRowResize');

/** The position of the row whose bottom edge the pointer is on, if any. */
function rowEdgeAt(view: EditorView, event: MouseEvent): number | null {
  const target = event.target instanceof Element ? event.target : null;
  const cell = target?.closest('td, th') as HTMLTableCellElement | null;
  if (!cell || !view.dom.contains(cell)) return null;
  const distance = cell.getBoundingClientRect().bottom - event.clientY;
  if (distance < 0 || distance > ROW_HANDLE) return null;
  // A merged cell's bottom edge is the bottom of the last row it spans.
  let row = cell.parentElement;
  for (let i = 1; i < cell.rowSpan && row?.nextElementSibling; i++) row = row.nextElementSibling as HTMLElement;
  if (!row) return null;
  try {
    const $pos = view.state.doc.resolve(view.posAtDOM(row, 0));
    for (let depth = $pos.depth; depth > 0; depth--) {
      if ($pos.node(depth).type.name === 'tableRow') return $pos.before(depth);
    }
  } catch {
    // The row isn't part of the document (yet).
  }
  return null;
}

function setRowResize(view: EditorView, next: Partial<RowResizeState>) {
  view.dispatch(view.state.tr.setMeta(rowResizeKey, next));
}

function rowResizing() {
  return new Plugin<RowResizeState>({
    key: rowResizeKey,
    state: {
      init: () => ({ hover: null, dragging: null }),
      apply(tr, prev) {
        const meta = tr.getMeta(rowResizeKey) as Partial<RowResizeState> | undefined;
        const state = meta ? { ...prev, ...meta } : prev;
        if (!tr.docChanged || (state.hover === null && !state.dragging)) return state;
        return {
          hover: state.hover === null ? null : tr.mapping.map(state.hover),
          dragging: state.dragging && { ...state.dragging, pos: tr.mapping.map(state.dragging.pos) },
        };
      },
    },
    props: {
      attributes(state): Record<string, string> {
        const s = rowResizeKey.getState(state);
        return s && (s.hover !== null || s.dragging) ? { class: 'row-resize-cursor' } : {};
      },
      decorations(state) {
        const drag = rowResizeKey.getState(state)?.dragging;
        const row = drag && state.doc.nodeAt(drag.pos);
        if (!drag || row?.type.name !== 'tableRow') return null;
        return DecorationSet.create(state.doc, [Decoration.node(drag.pos, drag.pos + row.nodeSize, { style: `height: ${drag.height}px` })]);
      },
      handleDOMEvents: {
        mousemove(view, event) {
          const s = rowResizeKey.getState(view.state);
          if (!s || s.dragging || !view.editable) return false;
          // The column handle (a cell's right edge) wins where the two meet.
          const columnActive = (columnResizingPluginKey.getState(view.state)?.activeHandle ?? -1) > -1;
          const hover = columnActive ? null : rowEdgeAt(view, event);
          if (hover !== s.hover) setRowResize(view, { hover });
          return false;
        },
        mouseleave(view) {
          const s = rowResizeKey.getState(view.state);
          if (s && s.hover !== null && !s.dragging) setRowResize(view, { hover: null });
          return false;
        },
        mousedown(view, event) {
          const s = rowResizeKey.getState(view.state);
          if (!s || s.hover === null || !view.editable || event.button !== 0) return false;
          const pos = s.hover;
          const dom = view.nodeDOM(pos);
          if (!(dom instanceof HTMLElement)) return false;
          event.preventDefault();
          const startY = event.clientY;
          const startHeight = Math.round(dom.getBoundingClientRect().height);
          let height = startHeight;
          setRowResize(view, { dragging: { pos, height } });
          const move = (e: MouseEvent) => {
            if (e.buttons === 0) { finish(); return; }
            height = Math.min(MAX_SIZE, Math.max(ROW_MIN_HEIGHT, Math.round(startHeight + e.clientY - startY)));
            const current = rowResizeKey.getState(view.state)?.dragging;
            if (current) setRowResize(view, { dragging: { ...current, height } });
          };
          const finish = () => {
            window.removeEventListener('mousemove', move);
            window.removeEventListener('mouseup', finish);
            const current = rowResizeKey.getState(view.state)?.dragging;
            const tr = view.state.tr.setMeta(rowResizeKey, { dragging: null, hover: null });
            const row = current && view.state.doc.nodeAt(current.pos);
            if (current && row?.type.name === 'tableRow' && Math.abs(height - startHeight) > 1) {
              tr.setNodeMarkup(current.pos, undefined, { ...row.attrs, height });
            }
            view.dispatch(tr);
          };
          window.addEventListener('mousemove', move);
          window.addEventListener('mouseup', finish);
          return true;
        },
      },
    },
  });
}

// ── The extension ───────────────────────────────────────────────────────────

export const TableSizing = Extension.create({
  name: 'tableSizing',
  // Its plugins go before the table's own, so a drag on an edge isn't taken as selecting cells.
  priority: 110,
  addGlobalAttributes() {
    return [{
      types: ['tableRow'],
      attributes: {
        height: {
          default: null,
          parseHTML: el => px((el as HTMLElement).style.height),
          renderHTML: attrs => (attrs.height ? { style: `height: ${attrs.height}px` } : {}),
        },
      },
    }, {
      types: ['tableCell', 'tableHeader'],
      attributes: {
        verticalAlign: {
          default: null,
          parseHTML: el => {
            const v = (el as HTMLElement).style.verticalAlign;
            return (VERTICAL_ALIGNS as readonly string[]).includes(v) ? v : null;
          },
          renderHTML: attrs => (attrs.verticalAlign ? { style: `vertical-align: ${attrs.verticalAlign}` } : {}),
        },
      },
    }];
  },
  addProseMirrorPlugins() {
    return [
      columnResizing({ handleWidth: 5, cellMinWidth: CELL_MIN_WIDTH, defaultCellMinWidth: CELL_MIN_WIDTH, View: null, lastColumnResizable: true }),
      rowResizing(),
    ];
  },
});

// ── Commands for the table menu ─────────────────────────────────────────────

function tableRect(state: EditorState): TableRect | null {
  try {
    return selectedRect(state);
  } catch {
    return null;
  }
}

function run(editor: Editor, build: (tr: Transaction, rect: TableRect) => boolean) {
  const rect = tableRect(editor.state);
  if (!rect) return false;
  const tr = editor.state.tr;
  if (!build(tr, rect)) return false;
  editor.view.dispatch(tr);
  editor.view.focus();
  return true;
}

/** Sets (or, with null, clears) the width of the selected columns; columns without one share the rest of the page. */
export function setColumnWidth(editor: Editor, width: number | null, allColumns = false) {
  return run(editor, (tr, { map, table, tableStart, left, right }) => {
    const value = width === null ? 0 : Math.min(MAX_SIZE, Math.max(CELL_MIN_WIDTH, Math.round(width)));
    const widths = new Map<number, number[]>();
    const [from, to] = allColumns ? [0, map.width] : [left, right];
    for (let row = 0; row < map.height; row++) {
      for (let col = from; col < to; col++) {
        const cellPos = map.map[row * map.width + col];
        const cell = table.nodeAt(cellPos);
        if (!cell) continue;
        const current = widths.get(cellPos) ?? (cell.attrs.colwidth as number[] | null)?.slice() ?? Array(cell.attrs.colspan as number).fill(0);
        current[col - map.colCount(cellPos)] = value;
        widths.set(cellPos, current);
      }
    }
    for (const [cellPos, colwidth] of widths) {
      const cell = table.nodeAt(cellPos)!;
      tr.setNodeMarkup(tableStart + cellPos, undefined, { ...cell.attrs, colwidth: colwidth.some(Boolean) ? colwidth : null });
    }
    return widths.size > 0;
  });
}

/** Sets (or, with null, clears) the height of the selected rows, or of every row. */
export function setRowHeight(editor: Editor, height: number | null, allRows = false) {
  return run(editor, (tr, { table, tableStart, top, bottom }) => {
    const value = height === null ? null : Math.min(MAX_SIZE, Math.max(ROW_MIN_HEIGHT, Math.round(height)));
    let changed = false;
    table.forEach((row, offset, index) => {
      if (!allRows && (index < top || index >= bottom)) return;
      if (row.attrs.height === value) return;
      tr.setNodeMarkup(tableStart + offset, undefined, { ...row.attrs, height: value });
      changed = true;
    });
    return changed;
  });
}

/** Aligns the selected cells' content to the top, middle or bottom. */
export function setVerticalAlign(editor: Editor, align: VerticalAlign | null) {
  return run(editor, (tr, { map, table, tableStart, left, right, top, bottom }) => {
    const cells = map.cellsInRect({ left, right, top, bottom });
    for (const cellPos of cells) {
      const cell = table.nodeAt(cellPos)!;
      tr.setNodeMarkup(tableStart + cellPos, undefined, { ...cell.attrs, verticalAlign: align });
    }
    return cells.length > 0;
  });
}

/** The selected cells' vertical alignment, if they share one. */
export function currentVerticalAlign(editor: Editor): VerticalAlign {
  const rect = tableRect(editor.state);
  const cell = rect && rect.table.nodeAt(rect.map.map[rect.top * rect.map.width + rect.left]);
  return (cell?.attrs.verticalAlign as VerticalAlign | null) ?? 'top';
}

/** The width of the first selected column and the height of the first selected row, as shown on the page. */
export function currentSizes(editor: Editor): { width: number; height: number } | null {
  const rect = tableRect(editor.state);
  if (!rect) return null;
  const cellPos = rect.map.map[rect.top * rect.map.width + rect.left];
  const cell = rect.table.nodeAt(cellPos);
  const dom = editor.view.nodeDOM(rect.tableStart + cellPos);
  const set = (cell?.attrs.colwidth as number[] | null)?.[rect.left - rect.map.colCount(cellPos)];
  const box = dom instanceof HTMLElement ? dom.getBoundingClientRect() : null;
  let rowPos = rect.tableStart;
  rect.table.forEach((row, offset, index) => { if (index === rect.top) rowPos += offset; });
  const rowDom = editor.view.nodeDOM(rowPos);
  return {
    width: set || Math.round(box?.width ?? 0),
    height: (rect.table.child(rect.top).attrs.height as number | null) ?? Math.round(rowDom instanceof HTMLElement ? rowDom.getBoundingClientRect().height : box?.height ?? 0),
  };
}

/** Moves the row (or column) at the cursor one place up/down (left/right). */
export function moveRow(editor: Editor, by: -1 | 1) {
  const rect = tableRect(editor.state);
  if (!rect) return false;
  const to = by < 0 ? rect.top - 1 : rect.bottom;
  if (to < 0 || to >= rect.map.height) return false;
  return editor.chain().focus().command(({ state, dispatch }) => moveTableRow({ from: by < 0 ? rect.top : rect.bottom - 1, to })(state, dispatch)).run();
}

export function moveColumn(editor: Editor, by: -1 | 1) {
  const rect = tableRect(editor.state);
  if (!rect) return false;
  const to = by < 0 ? rect.left - 1 : rect.right;
  if (to < 0 || to >= rect.map.width) return false;
  return editor.chain().focus().command(({ state, dispatch }) => moveTableColumn({ from: by < 0 ? rect.left : rect.right - 1, to })(state, dispatch)).run();
}

/** Whether the row/column at the cursor can move that way (not past the edge or through merged cells). */
export function canMoveRow(editor: Editor, by: -1 | 1) {
  const rect = tableRect(editor.state);
  if (!rect) return false;
  const to = by < 0 ? rect.top - 1 : rect.bottom;
  return to >= 0 && to < rect.map.height && moveTableRow({ from: by < 0 ? rect.top : rect.bottom - 1, to })(editor.state);
}

export function canMoveColumn(editor: Editor, by: -1 | 1) {
  const rect = tableRect(editor.state);
  if (!rect) return false;
  const to = by < 0 ? rect.left - 1 : rect.right;
  return to >= 0 && to < rect.map.width && moveTableColumn({ from: by < 0 ? rect.left : rect.right - 1, to })(editor.state);
}
