'use client';

/** The menu above a table in the editor: rows, columns, merging, header row, cell colour, delete. */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import {
  BetweenHorizontalEnd, BetweenHorizontalStart, BetweenVerticalEnd, BetweenVerticalStart, PaintBucket, Rows3,
  TableCellsMerge, TableCellsSplit, Trash2,
} from 'lucide-react';
import { Divider, ToolButton } from './Toolbar';

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

/** Rows, columns, merging, header row, cell colour and delete, for the table at the cursor. */
export default function TableMenu({ editor }: { editor: Editor }) {
  const [colors, setColors] = useState(false);
  const run = (fn: (c: ReturnType<Editor['chain']>) => ReturnType<Editor['chain']>) => fn(editor.chain().focus()).run();
  const i = 'h-4 w-4';
  if (colors) {
    return (
      <div className="flex items-center gap-1 px-1">
        {CELL_COLORS.map(color => (
          <button key={color} type="button" title={color} aria-label={`Cell colour ${color}`} onMouseDown={e => e.preventDefault()}
            onClick={() => { run(c => c.setCellAttribute('backgroundColor', color)); setColors(false); }}
            className="h-5 w-5 rounded-full border border-white/30 hover:scale-110" style={{ backgroundColor: color }} />
        ))}
        <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => { run(c => c.setCellAttribute('backgroundColor', null)); setColors(false); }}
          className="rounded-md px-2 py-1 text-[12px] font-medium text-white/90 hover:bg-white/10">None</button>
      </div>
    );
  }
  return (
    <>
      <ToolButton dark label="Insert row above" onClick={() => run(c => c.addRowBefore())}><BetweenHorizontalStart className={i} /></ToolButton>
      <ToolButton dark label="Insert row below" onClick={() => run(c => c.addRowAfter())}><BetweenHorizontalEnd className={i} /></ToolButton>
      <ToolButton dark label="Insert column left" onClick={() => run(c => c.addColumnBefore())}><BetweenVerticalStart className={i} /></ToolButton>
      <ToolButton dark label="Insert column right" onClick={() => run(c => c.addColumnAfter())}><BetweenVerticalEnd className={i} /></ToolButton>
      <Divider dark />
      <ToolButton dark label="Merge cells (select cells first)" disabled={!editor.can().mergeCells()} onClick={() => run(c => c.mergeCells())}><TableCellsMerge className={i} /></ToolButton>
      <ToolButton dark label="Unmerge cells" disabled={!editor.can().splitCell()} onClick={() => run(c => c.splitCell())}><TableCellsSplit className={i} /></ToolButton>
      <ToolButton dark label="Header row on/off" onClick={() => run(c => c.toggleHeaderRow())}><Rows3 className={i} /></ToolButton>
      <ToolButton dark label="Cell background colour" onClick={() => setColors(true)}><PaintBucket className={i} /></ToolButton>
      <Divider dark />
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => run(c => c.deleteRow())} className="rounded-md px-2 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/10">Delete row</button>
      <button type="button" onMouseDown={e => e.preventDefault()} onClick={() => run(c => c.deleteColumn())} className="rounded-md px-2 py-1.5 text-[12px] font-medium text-white/85 hover:bg-white/10">Delete column</button>
      <ToolButton dark label="Delete table" onClick={() => run(c => c.deleteTable())}><Trash2 className={i} /></ToolButton>
    </>
  );
}
