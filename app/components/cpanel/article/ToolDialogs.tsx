'use client';

/** The editor's Insert → Special characters and Tools → Word count dialogs. */

import { useState } from 'react';
import type { Editor } from '@tiptap/react';
import AeModal from '@/app/components/common/AeModal';
import { cx } from '../ui';

const CHARACTERS: Record<string, string> = {
  Punctuation: '–—…‘’“”«»‹›¡¿·•†‡§¶©®™°′″‰№',
  Currency: '₦$€£¥¢₹₩₽₺₵₱฿₫₴₪',
  Maths: '±×÷≈≠≤≥∞√∑∏∫∂∆∇∈∉∩∪⊂⊃∧∨¬∀∃∅%‰¼½¾⅓⅔⅛¹²³⁴ⁿ₀₁₂₃',
  Arrows: '←→↑↓↔↕⇐⇒⇑⇓⇔↩↪↻↺➜➔▶◀▲▼',
  Greek: 'αβγδεζηθικλμνξοπρστυφχψωΓΔΘΛΞΠΣΦΨΩ',
  Symbols: '✓✔✗✘★☆♥♦♣♠●○■□▪▫◆◇♪♫☀☁☂☎✉✂✎⚑⚠',
  Letters: 'ÀÁÂÃÄÅÆÇÈÉÊËÌÍÎÏÑÒÓÔÕÖØÙÚÛÜÝßàáâãäåæçèéêëìíîïñòóôõöøùúûüýÿẹọṣẸỌṢ',
};

export function SpecialCharsDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const [group, setGroup] = useState(Object.keys(CHARACTERS)[0]);
  const [last, setLast] = useState('');
  return (
    <AeModal title="Special characters" onClose={onClose}
      footer={<button type="button" onClick={onClose} className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black">Done</button>}>
      <div className="space-y-4">
        <div role="tablist" aria-label="Character groups" className="flex flex-wrap gap-1">
          {Object.keys(CHARACTERS).map(name => (
            <button key={name} type="button" role="tab" aria-selected={group === name} onClick={() => setGroup(name)}
              className={cx('rounded-full px-3 py-1 text-[12px] font-semibold', group === name ? 'bg-[#1F1F1F] text-white' : 'bg-[#F3F1EA] text-[#4A4A4A] hover:bg-[#ECEAE3]')}>
              {name}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-8 gap-1 sm:grid-cols-10">
          {[...CHARACTERS[group]].map(ch => (
            <button key={ch} type="button" title={`Insert ${ch}`} aria-label={`Insert ${ch}`}
              onClick={() => { editor.chain().insertContent(ch).run(); setLast(ch); }}
              className="flex h-10 items-center justify-center rounded-lg border border-[#ECEAE3] text-[18px] text-[#1A1A1A] hover:border-[#C89B3C] hover:bg-[#FBFAF6]">
              {ch}
            </button>
          ))}
        </div>
        <p className="text-[12px] text-[#6B6B6B]" role="status">{last ? `Inserted ${last}. Pick more, or press Done.` : 'Click a character to insert it where the cursor is.'}</p>
      </div>
    </AeModal>
  );
}

function counts(text: string, paragraphs: number) {
  return {
    words: text.split(/\s+/).filter(Boolean).length,
    characters: text.replace(/\n/g, '').length,
    noSpaces: text.replace(/\s/g, '').length,
    paragraphs,
  };
}

export function WordCountDialog({ editor, onClose }: { editor: Editor; onClose: () => void }) {
  const { doc, selection } = editor.state;
  let docParagraphs = 0;
  let selParagraphs = 0;
  doc.descendants((node, pos) => {
    if (!node.isTextblock || !node.textContent.trim()) return;
    docParagraphs++;
    if (!selection.empty && pos + node.nodeSize > selection.from && pos < selection.to) selParagraphs++;
  });
  const all = counts(doc.textBetween(0, doc.content.size, '\n', ' '), docParagraphs);
  const sel = selection.empty ? null : counts(doc.textBetween(selection.from, selection.to, '\n', ' '), selParagraphs);
  const rows: Array<[string, keyof typeof all]> = [['Words', 'words'], ['Characters', 'characters'], ['Characters excluding spaces', 'noSpaces'], ['Paragraphs', 'paragraphs']];
  return (
    <AeModal title="Word count" size="sm" onClose={onClose}
      footer={<button type="button" onClick={onClose} className="rounded-lg bg-[#1F1F1F] px-4 py-2 text-[13px] font-semibold text-white hover:bg-black">OK</button>}>
      <table className="w-full text-[14px]">
        <thead>
          <tr className="text-left text-[12px] text-[#8C8679]">
            <th className="pb-2 font-medium"><span className="sr-only">Count</span></th>
            {sel && <th className="pb-2 text-right font-medium">Selection</th>}
            <th className="pb-2 text-right font-medium">Article</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#F0EEE8]">
          {rows.map(([label, key]) => (
            <tr key={key}>
              <td className="py-2 text-[#4A4A4A]">{label}</td>
              {sel && <td className="py-2 text-right tabular-nums text-[#1A1A1A]">{sel[key].toLocaleString()}</td>}
              <td className="py-2 text-right font-semibold tabular-nums text-[#1A1A1A]">{all[key].toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-3 text-[12px] text-[#6B6B6B]">About {Math.max(1, Math.round(all.words / 220))} min read.</p>
    </AeModal>
  );
}
