// ─── AE workstation pages ─────────────────────────────────────────────────────
// Every page a department workstation (/ws) can have. The CEO chooses which of
// these each AE department gets on the Departments page; the sidebar and the
// server-side page checks both read this list.

export type PageGroup = 'Workspace' | 'Development' | 'Technical Operations' | 'Management';

export interface WorkstationPage {
  id: string;
  label: string;
  description: string;
  group: PageGroup;
  /** Where the page lives. */
  href: string;
  /** Every department gets these. */
  base?: boolean;
}

export const WORKSTATION_PAGES: WorkstationPage[] = [
  { id: 'dashboard', label: 'Overview', description: 'The department’s dashboard', group: 'Workspace', href: '/ws/dashboard', base: true },
  { id: 'tasks', label: 'Tasks', description: 'Tasks, sprints and assignments', group: 'Workspace', href: '/ws/tasks' },
  { id: 'messages', label: 'Messages', description: 'Chats, groups, communities and threads', group: 'Workspace', href: '/ws/messages', base: true },
  { id: 'time-tracking', label: 'Time Tracking', description: 'Clock in and out, attendance history', group: 'Workspace', href: '/ws/time-tracking' },
  { id: 'documents', label: 'Documents', description: 'Shared documents and files', group: 'Workspace', href: '/ws/documents' },
  { id: 'leave-requests', label: 'Leave Request', description: 'Request leave and follow requests', group: 'Workspace', href: '/ws/leave-requests' },
  { id: 'reports', label: 'Reports', description: 'Department reports and analytics', group: 'Workspace', href: '/ws/reports' },
  { id: 'payments', label: 'My Payment', description: 'Salary and payment history', group: 'Workspace', href: '/ws/payments' },
  { id: 'notifications', label: 'Notifications', description: 'Announcements and updates', group: 'Workspace', href: '/ws/notifications', base: true },
  { id: 'development', label: 'Development', description: 'Code reviews, pull requests and deployments', group: 'Development', href: '/ws/development' },
  { id: 'technical-status', label: 'Technical Status', description: 'Website status, hosting and incidents', group: 'Technical Operations', href: '/ws/technical-status' },
  { id: 'it-support', label: 'IT Support', description: 'Support tickets from other departments', group: 'Technical Operations', href: '/ws/it-support' },
  { id: 'staff', label: 'Staff Management', description: 'The department’s members and availability', group: 'Management', href: '/ws/staff' },
  { id: 'training', label: 'Training', description: 'Courses and learning progress', group: 'Management', href: '/ws/training' },
  { id: 'website', label: 'Website C-Panel', description: 'Edit the Agunwami Enterprise website', group: 'Management', href: '/cpanel/dashboard' },
  { id: 'settings', label: 'Settings', description: 'Personal settings', group: 'Management', href: '/ws/settings', base: true },
];

export const PAGE_GROUPS: PageGroup[] = ['Workspace', 'Development', 'Technical Operations', 'Management'];

export const BASE_PAGE_IDS = WORKSTATION_PAGES.filter(page => page.base).map(page => page.id);

const PAGE_IDS = new Set(WORKSTATION_PAGES.map(page => page.id));

export const isPageId = (id: unknown): id is string => typeof id === 'string' && PAGE_IDS.has(id);

/** A department's pages: the chosen ones that exist, plus the base pages, in registry order. */
export function normalizePages(pages: unknown): string[] {
  const chosen = new Set(Array.isArray(pages) ? pages.filter(isPageId) : []);
  for (const id of BASE_PAGE_IDS) chosen.add(id);
  return WORKSTATION_PAGES.filter(page => chosen.has(page.id)).map(page => page.id);
}

export function pageById(id: string): WorkstationPage | undefined {
  return WORKSTATION_PAGES.find(page => page.id === id);
}

/** The /ws page for a path segment ("tasks" → the Tasks page). */
export function pageForSection(section: string): WorkstationPage | undefined {
  return WORKSTATION_PAGES.find(page => page.href === `/ws/${section}`);
}
