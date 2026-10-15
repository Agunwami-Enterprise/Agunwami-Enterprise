'use client';

/**
 * A document's page (/ws/documents/[id], /ceo/documents/[id]): spreadsheets
 * (and uploaded Excel or CSV files) open in the spreadsheet, everything else
 * in the document editor.
 */

import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { doc, getDoc } from 'firebase/firestore';
import { authDb } from '@/lib/workstation/firebase';
import DocumentEditorPage from './DocumentEditorPage';
import SpreadsheetPage from './SpreadsheetPage';
import { SHEET_FORMAT, fileNameWithType, fileUrlOf, isSheetFile } from '../doc-store';

type Props = { id: string; basePath: string; isCeo: boolean; aeDepartmentId?: string; startInView?: boolean };

export default function DocumentScreen(props: Props) {
  const [kind, setKind] = useState<'doc' | 'sheet' | null>(null);

  useEffect(() => {
    let cancelled = false;
    getDoc(doc(authDb, 'documents', props.id)).then(snap => {
      if (cancelled) return;
      const data = snap.data();
      const url = data ? fileUrlOf(data) : '';
      const name = data ? fileNameWithType(String(data.name || data.fileName || data.title || ''), url, String(data.type ?? '')) : '';
      setKind(data?.format === SHEET_FORMAT || (data && !data.format && isSheetFile(name, url)) ? 'sheet' : 'doc');
    }, () => { if (!cancelled) setKind('doc'); });
    return () => { cancelled = true; };
  }, [props.id]);

  if (!kind) return <div className="flex min-h-[60vh] items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-[#a3a3a3]" aria-hidden="true" /></div>;
  return kind === 'sheet' ? <SpreadsheetPage {...props} /> : <DocumentEditorPage {...props} />;
}
