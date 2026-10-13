'use client';

/**
 * Find and replace, as in Google Docs: matches are highlighted in the
 * article, Enter / Shift+Enter step through them, and one or all of them
 * can be replaced. It floats beside the article so the text stays visible.
 */

import { useEffect, useRef, useState } from 'react';
import { useEditorState, type Editor } from '@tiptap/react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';
import { cx } from '../ui';
import { replaceSearch, searchKey, setSearch, stepSearch } from './extensions';

export default function FindReplace({ editor, showReplace, onClose }: { editor: Editor; showReplace: boolean; onClose: () => void }) {
  const [term, setTerm] = useState(() => {
    const { from, to } = editor.state.selection;
    const selected = editor.state.doc.textBetween(from, to, ' ');
    return selected.length <= 80 && !selected.includes('\n') ? selected : '';
  });
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [replacement, setReplacement] = useState('');
  const [replaceOpened, setReplacing] = useState(false);
  const replacing = replaceOpened || showReplace;
  const [note, setNote] = useState('');
  const findRef = useRef<HTMLInputElement>(null);
  const { count, current } = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      const state = searchKey.getState(e.state);
      return { count: state?.matches.length ?? 0, current: state?.current ?? 0 };
    },
  });

  useEffect(() => { findRef.current?.focus(); findRef.current?.select(); }, [showReplace]);
  useEffect(() => { setSearch(editor, { term, caseSensitive, current: 0 }); }, [editor, term, caseSensitive]);
  // Clear the highlights when the panel closes.
  useEffect(() => () => { if (!editor.isDestroyed) setSearch(editor, { term: '' }); }, [editor]);

  function replace(all: boolean) {
    const n = replaceSearch(editor, replacement, all);
    setNote(n ? `Replaced ${n} ${n === 1 ? 'match' : 'matches'}.` : '');
  }

  const input = 'w-full rounded-lg border border-[#E5E2D9] bg-white px-3 py-1.5 text-[13px] text-[#1A1A1A] outline-none placeholder:text-[#8C8679] focus:border-[#C89B3C]';
  const nav = 'rounded-md p-1.5 text-[#4A4A4A] hover:bg-[#F3F1EA] disabled:opacity-30';

  return (
    <div role="dialog" aria-label="Find and replace"
      onKeyDown={e => { if (e.key === 'Escape') { e.stopPropagation(); onClose(); } }}
      className="fixed right-6 top-24 z-40 w-[340px] max-w-[calc(100vw-2rem)] space-y-3 rounded-xl border border-[#E5E2D9] bg-white p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <p className="text-[14px] font-semibold text-[#1A1A1A]">{replacing ? 'Find and replace' : 'Find'}</p>
        <button type="button" onClick={onClose} aria-label="Close" className={nav}><X className="h-4 w-4" /></button>
      </div>
      <div className="flex items-center gap-1">
        <label className="relative min-w-0 flex-1">
          <span className="sr-only">Find</span>
          <input ref={findRef} className={cx(input, 'pr-14')} value={term} onChange={e => { setTerm(e.target.value); setNote(''); }} placeholder="Find in article"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); stepSearch(editor, e.shiftKey ? -1 : 1); } }} />
          <span className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-[12px] tabular-nums text-[#8C8679]" aria-live="polite">
            {term ? `${count ? current + 1 : 0} of ${count}` : ''}
          </span>
        </label>
        <button type="button" className={nav} disabled={!count} onClick={() => stepSearch(editor, -1)} title="Previous (Shift+Enter)" aria-label="Previous match"><ChevronUp className="h-4 w-4" /></button>
        <button type="button" className={nav} disabled={!count} onClick={() => stepSearch(editor, 1)} title="Next (Enter)" aria-label="Next match"><ChevronDown className="h-4 w-4" /></button>
      </div>
      {replacing && (
        <label className="block">
          <span className="sr-only">Replace with</span>
          <input className={input} value={replacement} onChange={e => setReplacement(e.target.value)} placeholder="Replace with"
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); replace(false); } }} />
        </label>
      )}
      <label className="flex items-center gap-2 text-[13px] text-[#4A4A4A]">
        <input type="checkbox" checked={caseSensitive} onChange={e => setCaseSensitive(e.target.checked)} className="accent-[#C89B3C]" /> Match case
      </label>
      <div className="flex items-center gap-2">
        {replacing ? (
          <>
            <button type="button" disabled={!count} onClick={() => replace(false)}
              className="rounded-lg border border-[#E5E2D9] px-3 py-1.5 text-[13px] font-medium text-[#1A1A1A] hover:bg-[#F3F1EA] disabled:opacity-40">Replace</button>
            <button type="button" disabled={!count} onClick={() => replace(true)}
              className="rounded-lg bg-[#1F1F1F] px-3 py-1.5 text-[13px] font-semibold text-white hover:bg-black disabled:opacity-40">Replace all</button>
          </>
        ) : (
          <button type="button" onClick={() => setReplacing(true)} className="text-[13px] font-semibold text-[#8A6A1F] hover:underline">Replace…</button>
        )}
        {note && <span className="ml-auto text-[12px] text-[#6B6B6B]" role="status">{note}</span>}
      </div>
    </div>
  );
}
