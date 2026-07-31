import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/workstation/firebase';

export type DocTab      = 'all' | 'personal' | 'team' | 'company';
export type DocCategory = 'Legal' | 'Projects' | 'Finance' | 'HR' | 'Meetings';
export type FileType    = 'PDF' | 'DOCX';

export interface DocFile {
  id: string; name: string; type: FileType;
  category: DocCategory; date: string; tab: Exclude<DocTab, 'all'>;
}

function typeToCategory(docType: string): DocCategory {
  const map: Record<string, DocCategory> = {
    policy: 'HR', report: 'Finance', contract: 'Legal', memo: 'Meetings',
  };
  return map[docType] ?? 'Projects';
}

function deptToTab(dept: string): Exclude<DocTab, 'all'> {
  const d = (dept || '').toLowerCase();
  if (d.includes('executive') || d.includes('finance') || d.includes('sales')) return 'company';
  if (d.includes('human') || d.includes('hr') || d.includes('operations')) return 'team';
  return 'personal';
}

// Upload goes through Firebase Storage; this service is read-only.
export function subscribeDocs(cb: (docs: DocFile[]) => void): () => void {
  const q = query(collection(db, 'documents'), orderBy('uploadedAt', 'desc'));
  return onSnapshot(
    q,
    snap => {
      cb(snap.docs.map(d => {
        const data = d.data();
        const url  = (data.fileUrl as string) ?? '';
        const ext  = url.split('.').pop()?.toUpperCase();
        const type: FileType = ext === 'PDF' ? 'PDF' : 'DOCX';
        let uploadedAt = new Date();
        if (data.uploadedAt) {
          uploadedAt = typeof data.uploadedAt === 'string' ? new Date(data.uploadedAt) : (data.uploadedAt.toDate ? data.uploadedAt.toDate() : new Date());
        }
        return {
          id:       d.id,
          name:     (data.title || data.name || 'Document') as string,
          type,
          category: typeToCategory(data.type as string),
          date:     uploadedAt.toISOString().split('T')[0],
          tab:      deptToTab(data.department as string),
        };
      }));
    },
    err => {
      console.warn('Documents snapshot error:', err);
    }
  );
}
