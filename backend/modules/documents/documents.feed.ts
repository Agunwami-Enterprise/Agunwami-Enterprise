/**
 * backend/modules/documents/documents.feed.ts
 *
 * The CEO Documents page list: the enterprise's own `documents` records plus
 * every project's `documents` feed, each labelled with where it came from.
 */

import { getAdminAuthToken, listDocs } from '../../core/firestore';
import { ProjectsService } from '../projects/projects.service';
import { ENTERPRISE_SOURCE, type FeedSource, type ProjectFeedStatus } from '../projects/projects.types';
import { ENTERPRISE_READ_ERROR, isoOf, text, type RawRecord } from '../projects/feed-helpers';

export type DocumentFeedTab = 'personal' | 'team' | 'company';

export interface DocumentFeedItem {
  key: string;
  id: string;
  source: FeedSource;
  name: string;
  /** File type, e.g. PDF or DOCX. */
  type: string;
  category: string;
  /** ISO time or null. */
  date: string | null;
  tab: DocumentFeedTab;
  url?: string;
  uploadedBy?: string;
  size?: string;
}

export interface DocumentsFeed {
  items: DocumentFeedItem[];
  projects: ProjectFeedStatus[];
  enterpriseError?: string;
}

const CATEGORY_BY_DOC_TYPE: Record<string, string> = {
  policy: 'HR', report: 'Finance', contract: 'Legal', memo: 'Meetings',
};

/** Which folder a document belongs in, from the department it's shared with. */
function tabFor(department: string): DocumentFeedTab {
  const value = department.toLowerCase();
  if (!value || value === 'all' || /executive|finance|sales|company/.test(value)) return 'company';
  if (/human|hr|operations|team/.test(value)) return 'team';
  return 'personal';
}

function fileTypeOf(name: string, url: string, declared: string): string {
  const fromName = (url || name).split('?')[0].split('.').pop()?.toUpperCase() ?? '';
  if (/^[A-Z0-9]{2,5}$/.test(declared.toUpperCase()) && !CATEGORY_BY_DOC_TYPE[declared.toLowerCase()]) return declared.toUpperCase();
  return /^[A-Z0-9]{2,5}$/.test(fromName) ? fromName : 'FILE';
}

const httpLink = (value: string) => (/^https?:\/\//i.test(value) ? value : undefined);

function enterpriseItem(raw: RawRecord): DocumentFeedItem {
  const id = text(raw._id) || text(raw.id);
  const name = text(raw.title) || text(raw.name) || 'Untitled document';
  const url = text(raw.fileUrl) || text(raw.url);
  const docType = text(raw.type).toLowerCase();
  return {
    key: `${ENTERPRISE_SOURCE.id}:${id}`,
    id,
    source: ENTERPRISE_SOURCE,
    name,
    type: fileTypeOf(name, url, text(raw.fileType) || text(raw.type)),
    category: text(raw.category) || CATEGORY_BY_DOC_TYPE[docType] || 'General',
    date: isoOf(raw.uploadedAt) ?? isoOf(raw.createdAt) ?? isoOf(raw._createTime),
    tab: tabFor(text(raw.department)),
    ...(httpLink(url) ? { url } : {}),
    ...(text(raw.uploadedByName) || text(raw.uploadedBy) ? { uploadedBy: text(raw.uploadedByName) || text(raw.uploadedBy) } : {}),
    ...(text(raw.fileSize) || text(raw.size) ? { size: text(raw.fileSize) || text(raw.size) } : {}),
  };
}

export async function getDocumentsFeed(): Promise<DocumentsFeed> {
  const [token, projectFeed] = await Promise.all([
    getAdminAuthToken().catch(() => null),
    ProjectsService.getProjectFeed('documents'),
  ]);
  const enterpriseDocs = token ? await listDocs('documents', 300).catch(() => []) : [];

  const items: DocumentFeedItem[] = [
    ...enterpriseDocs.map(doc => enterpriseItem(doc as RawRecord)),
    ...projectFeed.entries.flatMap(({ source, data }) => data.map(document => ({
      key: `${source.id}:${document.id}`,
      id: document.id,
      source,
      name: document.name,
      type: fileTypeOf(document.name, document.url ?? '', document.type),
      category: document.category,
      date: document.createdAt,
      tab: tabFor(document.department ?? ''),
      ...(document.url ? { url: document.url } : {}),
      ...(document.uploadedBy ? { uploadedBy: document.uploadedBy } : {}),
      ...(document.size ? { size: document.size } : {}),
    } satisfies DocumentFeedItem))),
  ].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? ''));

  return { items, projects: projectFeed.projects, ...(token ? {} : { enterpriseError: ENTERPRISE_READ_ERROR }) };
}
