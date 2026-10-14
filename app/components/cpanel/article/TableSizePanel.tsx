'use client';

/** Column width and row height for the table at the cursor, in the table menu and the menu bar's Table menu. */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import { currentSizes, setColumnWidth, setRowHeight } from './table-sizing';

const keepFocus = (e: React.MouseEvent) => e.preventDefault();

/** Column width and row height in pixels, for the column and row at the cursor (or the selected ones). */
export default function SizePanel({ editor, back, light }: { editor: Editor; back?: React.ReactNode; light?: boolean }) {
  const [sizes] = useState(() => currentSizes(editor));
  const [width, setWidth] = useState(String(sizes?.width || ''));
  const [height, setHeight] = useState(String(sizes?.height || ''));
  const input = `w-[4.5rem] rounded-md border px-2 py-1 text-[12px] outline-none ${light
    ? 'border-[#e5e5e5] bg-white text-[#292929] focus:border-[#f5bd02] dark:border-white/10 dark:bg-[#2a2a2a] dark:text-gray-100'
    : 'border-white/20 bg-white/10 text-white focus:border-[#f5bd02]'}`;
  const label = `text-[12px] ${light ? 'text-[#525252] dark:text-gray-300' : 'text-white/70'}`;
  const button = `rounded-md px-2 py-1 text-[12px] font-medium ${light
    ? 'text-[#292929] hover:bg-black/5 dark:text-gray-100 dark:hover:bg-white/10' : 'text-white/90 hover:bg-white/10'}`;
  const apply = () => {
    const w = Number(width);
    const h = Number(height);
    if (w > 0 && w !== sizes?.width) setColumnWidth(editor, w);
    if (h > 0 && h !== sizes?.height) setRowHeight(editor, h);
  };
  return (
    <form className={`flex flex-wrap items-center gap-x-2 gap-y-1.5 ${light ? 'w-[19rem] px-3 py-2' : 'px-1 py-0.5'}`} onSubmit={e => { e.preventDefault(); apply(); }}>
      {back}
      <label className="flex items-center gap-1.5">
        <span className={label}>Column width</span>
        <input type="number" min={48} max={2000} inputMode="numeric" className={input} value={width} onChange={e => setWidth(e.target.value)} aria-label="Column width in pixels" />
      </label>
      <label className="flex items-center gap-1.5">
        <span className={label}>Row height</span>
        <input type="number" min={24} max={2000} inputMode="numeric" className={input} value={height} onChange={e => setHeight(e.target.value)} aria-label="Row height in pixels" />
      </label>
      <span className={label}>px</span>
      <button type="submit" className="rounded-md bg-[#f5bd02] px-2.5 py-1 text-[12px] font-semibold text-[#1a1a1a] hover:opacity-90">Apply</button>
      <button type="button" className={button} onMouseDown={keepFocus} title="Give every column the same width, filling the page"
        onClick={() => setColumnWidth(editor, null, true)}>Even out columns</button>
      <button type="button" className={button} onMouseDown={keepFocus} title="Rows fit their content again"
        onClick={() => setRowHeight(editor, null, true)}>Fit rows to content</button>
    </form>
  );
}
