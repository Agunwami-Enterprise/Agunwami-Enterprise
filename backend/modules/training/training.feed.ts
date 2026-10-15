/**
 * backend/modules/training/training.feed.ts
 *
 * The CEO Training page list: the enterprise's own `courses` records plus
 * every project's `training` feed, each labelled with where it came from.
 */

import { getAdminAuthToken, listDocs } from '../../core/firestore';
import { ProjectsService } from '../projects/projects.service';
import { ENTERPRISE_SOURCE, type FeedSource, type ProjectFeedStatus } from '../projects/projects.types';
import { ENTERPRISE_READ_ERROR, isoOf, text, type RawRecord } from '../projects/feed-helpers';

export type TrainingFeedStatus = 'not-started' | 'in-progress' | 'completed' | 'published' | 'draft' | 'archived';

export interface TrainingFeedItem {
  key: string;
  id: string;
  source: FeedSource;
  title: string;
  category: string;
  hours: number;
  status: TrainingFeedStatus;
  /** Completion, 0–100. */
  progress: number;
  /** ISO time or null. */
  dueDate: string | null;
  overdue: boolean;
  mandatory: boolean;
  assignedTo: string[];
  learners?: number;
  instructor?: string;
  level?: string;
  color: string;
}

export interface TrainingFeed {
  items: TrainingFeedItem[];
  projects: ProjectFeedStatus[];
  enterpriseError?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  Security: '#3b82f6', Leadership: '#f5bd02', Finance: '#22c55e',
  Compliance: '#8b5cf6', Engineering: '#ec4899', 'Customer Service': '#0d9488',
  'Health & Safety': '#f97316',
};
const colorFor = (category: string) => CATEGORY_COLORS[category] ?? '#6366f1';
const percent = (value: unknown) => Math.max(0, Math.min(100, Math.round(Number(value) || 0)));

function enterpriseItem(raw: RawRecord, now: number): TrainingFeedItem {
  const id = text(raw._id) || text(raw.id);
  const rawStatus = text(raw.status).toLowerCase();
  const status: TrainingFeedStatus = rawStatus === 'completed' || rawStatus === 'in-progress' ? rawStatus : 'not-started';
  const dueDate = isoOf(raw.dueDate);
  const category = text(raw.category) || 'General';
  const assigned = Array.isArray(raw.assignedTo) ? raw.assignedTo.filter((v): v is string => typeof v === 'string') : [];
  return {
    key: `${ENTERPRISE_SOURCE.id}:${id}`,
    id,
    source: ENTERPRISE_SOURCE,
    title: text(raw.title) || text(raw.name) || 'Course',
    category,
    hours: Number(raw.hours) || 0,
    status,
    progress: percent(raw.completionRate),
    dueDate,
    overdue: status !== 'completed' && !!dueDate && Date.parse(dueDate) < now,
    mandatory: raw.isMandatory === true,
    assignedTo: assigned.slice(0, 2).map(value => (value.length > 20 ? value.slice(0, 8) : value)),
    color: colorFor(category),
  };
}

export async function getTrainingFeed(): Promise<TrainingFeed> {
  const now = Date.now();
  const [token, projectFeed] = await Promise.all([
    getAdminAuthToken().catch(() => null),
    ProjectsService.getProjectFeed('training'),
  ]);
  const enterpriseDocs = token ? await listDocs('courses', 300).catch(() => []) : [];

  const items: TrainingFeedItem[] = [
    ...enterpriseDocs.map(doc => enterpriseItem(doc as RawRecord, now)),
    ...projectFeed.entries.flatMap(({ source, data }) => data.map(course => {
      const status: TrainingFeedStatus = /archiv/i.test(course.status)
        ? 'archived'
        : /draft/i.test(course.status) ? 'draft' : 'published';
      return {
        key: `${source.id}:${course.id}`,
        id: course.id,
        source,
        title: course.title,
        category: course.category,
        hours: course.hours,
        status,
        progress: percent(course.completionRate),
        dueDate: null,
        overdue: false,
        mandatory: false,
        assignedTo: [],
        learners: course.learners,
        ...(course.instructor ? { instructor: course.instructor } : {}),
        ...(course.level ? { level: course.level } : {}),
        color: colorFor(course.category),
      } satisfies TrainingFeedItem;
    })),
  ];

  return { items, projects: projectFeed.projects, ...(token ? {} : { enterpriseError: ENTERPRISE_READ_ERROR }) };
}
