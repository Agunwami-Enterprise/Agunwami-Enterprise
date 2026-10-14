'use client';

/**
 * The menu above a table in the editor: rows, columns, merging, headers,
 * cell colour, sizes, alignment, moving rows/columns, delete. Sizes can
 * also be changed by dragging a column's right edge or a row's bottom edge.
 */

import { useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import {
  AlignVerticalJustifyCenter, AlignVerticalJustifyEnd, AlignVerticalJustifyStart, ArrowDown, ArrowLeft, ArrowRight, ArrowUp,
  BetweenHorizontalEnd, BetweenHorizontalStart, BetweenVerticalEnd, BetweenVerticalStart, ChevronLeft, Columns3, Move,
  PaintBucket, Ruler, Rows3, TableCellsMerge, TableCellsSplit, Trash2,
} from 'lucide-react';
import { Divider, ToolButton } from './Toolbar';
import SizePanel from './TableSizePanel';
import { canMoveColumn, canMoveRow, currentVerticalAlign, moveColumn, moveRow, setVerticalAlign, type VerticalAlign } from './table-sizing';

/** The table the cursor is in, for placing the table menu above it. */
export function tableElement(editor: Editor): HTMLElement | null {
  const { $from } = editor.state.selection;
  for (let depth = $from.depth; depth > 0; depth--) {
    if ($from.node(depth).type.name === 'table') {
      const dom = editor.view.nodeDOM($from.before(depth));
      return dom instanceof HTMLElement ? dom : null;
    }
  }
  return null;
}

const CELL_COLORS = ['#FFF2CC', '#FCE5CD', '#F4CCCC', '#EAD1DC', '#D9D2E9', '#C9DAF8', '#D0E0E3', '#D9EAD3', '#FBEEC9', '#EFEFEF'];

type Panel = 'colors' | 'size' | 'align' | 'move' | null;

const textButton = 'rounded-md px-2 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/10 disabled:opacity-40';
const keepFocus = (e: React.MouseEvent) => e.preventDefault();

/** Rows, columns, merging, headers, colour, sizes, alignment, moving and delete, for the table at the cursor. */
export default function TableMenu({ editor }: { editor: Editor }) {
  const [panel, setPanel] = useState<Panel>(null);
  // Follows the cursor, so what can be done is always for the cell it's in.
  const can = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      merge: e.can().mergeCells(), split: e.can().splitCell(), align: currentVerticalAlign(e),
      rowUp: canMoveRow(e, -1), rowDown: canMoveRow(e, 1), columnLeft: canMoveColumn(e, -1), columnRight: canMoveColumn(e, 1),
    }),
  });
  const run = (fn: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => fn(editor.chain().focus()).run();
  const i = 'h-4 w-4';
  const back = (
    <ToolButton dark label="Back to the table menu" onClick={() => setPanel(null)}><ChevronLeft className={i} /></ToolButton>
  );

  if (panel === 'colors') {
    return (
      <div className="flex flex-wrap items-center gap-1 px-1">
        {back}
        {CELL_COLORS.map(color => (
          <button key={color} type="button" title={color} aria-label={`Cell colour ${color}`} onMouseDown={keepFocus}
            onClick={() => { run(c => c.setCellAttribute('backgroundColor', color)); setPanel(null); }}
            className="h-5 w-5 rounded-full border border-white/30 hover:scale-110" style={{ backgroundColor: color }} />
        ))}
        <button type="button" onMouseDown={keepFocus} onClick={() => { run(c => c.setCellAttribute('backgroundColor', null)); setPanel(null); }}
          className="rounded-md px-2 py-1 text-[12px] font-medium text-white/90 hover:bg-white/10">None</button>
      </div>
    );
  }
  if (panel === 'size') return <SizePanel editor={editor} back={back} />;
  if (panel === 'align') {
    const current = can.align;
    const options: Array<[VerticalAlign, string, typeof AlignVerticalJustifyStart]> = [
      ['top', 'Top', AlignVerticalJustifyStart], ['middle', 'Middle', AlignVerticalJustifyCenter], ['bottom', 'Bottom', AlignVerticalJustifyEnd],
    ];
    return (
      <>
        {back}
        <span className="px-1 text-[12px] text-white/60">Cell content</span>
        {options.map(([value, label, Icon]) => (
          <ToolButton key={value} dark label={`Align to the ${label.toLowerCase()}`} active={current === value}
            onClick={() => { setVerticalAlign(editor, value === 'top' ? null : value); setPanel(null); }}><Icon className={i} /></ToolButton>
        ))}
      </>
    );
  }
  if (panel === 'move') {
    return (
      <>
        {back}
        <ToolButton dark label="Move row up" disabled={!can.rowUp} onClick={() => moveRow(editor, -1)}><ArrowUp className={i} /></ToolButton>
        <ToolButton dark label="Move row down" disabled={!can.rowDown} onClick={() => moveRow(editor, 1)}><ArrowDown className={i} /></ToolButton>
        <Divider dark />
        <ToolButton dark label="Move column left" disabled={!can.columnLeft} onClick={() => moveColumn(editor, -1)}><ArrowLeft className={i} /></ToolButton>
        <ToolButton dark label="Move column right" disabled={!can.columnRight} onClick={() => moveColumn(editor, 1)}><ArrowRight className={i} /></ToolButton>
      </>
    );
  }

  return (
    <>
      <ToolButton dark label="Insert row above" onClick={() => run(c => c.addRowBefore())}><BetweenHorizontalStart className={i} /></ToolButton>
      <ToolButton dark label="Insert row below" onClick={() => run(c => c.addRowAfter())}><BetweenHorizontalEnd className={i} /></ToolButton>
      <ToolButton dark label="Insert column left" onClick={() => run(c => c.addColumnBefore())}><BetweenVerticalStart className={i} /></ToolButton>
      <ToolButton dark label="Insert column right" onClick={() => run(c => c.addColumnAfter())}><BetweenVerticalEnd className={i} /></ToolButton>
      <Divider dark />
      <ToolButton dark label="Merge cells (select cells first)" disabled={!can.merge} onClick={() => run(c => c.mergeCells())}><TableCellsMerge className={i} /></ToolButton>
      <ToolButton dark label="Unmerge cells" disabled={!can.split} onClick={() => run(c => c.splitCell())}><TableCellsSplit className={i} /></ToolButton>
      <ToolButton dark label="Header row on/off" onClick={() => run(c => c.toggleHeaderRow())}><Rows3 className={i} /></ToolButton>
      <ToolButton dark label="Header column on/off" onClick={() => run(c => c.toggleHeaderColumn())}><Columns3 className={i} /></ToolButton>
      <Divider dark />
      <ToolButton dark label="Cell background colour" onClick={() => setPanel('colors')}><PaintBucket className={i} /></ToolButton>
      <ToolButton dark label="Column width and row height" onClick={() => setPanel('size')}><Ruler className={i} /></ToolButton>
      <ToolButton dark label="Align cell content (top, middle, bottom)" onClick={() => setPanel('align')}><AlignVerticalJustifyCenter className={i} /></ToolButton>
      <ToolButton dark label="Move row or column" onClick={() => setPanel('move')}><Move className={i} /></ToolButton>
      <Divider dark />
      <button type="button" onMouseDown={keepFocus} onClick={() => run(c => c.deleteRow())} className={textButton}>Delete row</button>
      <button type="button" onMouseDown={keepFocus} onClick={() => run(c => c.deleteColumn())} className={textButton}>Delete column</button>
      <ToolButton dark label="Delete table" onClick={() => run(c => c.deleteTable())}><Trash2 className={i} /></ToolButton>
    </>
  );
}
