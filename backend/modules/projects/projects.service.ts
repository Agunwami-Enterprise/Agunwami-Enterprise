/**
 * backend/modules/projects/projects.service.ts
 *
 * Manages enterprise project records and reads each configured metrics endpoint.
 */

import fs from 'fs';
import path from 'path';
import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'node:crypto';
import { listDocs, getDoc, createDoc, updateDoc, deleteDoc } from '../../core/firestore';
import type { FirestoreDoc } from '../../core/types';
import type {
  ProjectActivityItem,
  ProjectApprovalItem,
  ProjectCardData,
  ProjectCardMetric,
  ProjectDepartment,
  ProjectLeaveRequest,
  ProjectMonthlyRevenue,
  ProjectStaffMember,
  ProjectTaskCreatePayload,
  ProjectTaskItem,
  ProjectTasksSummary,
  CreateProjectDto,
  UpdateProjectDto,
} from './projects.types';

type StoredProject = Record<string, unknown> & {
  _id?: string;
  id?: string;
  name?: string;
  subtitle?: string;
  adminUrl?: string | null;
  apiEndpoint?: string | null;
  apiTokenEncrypted?: string | null;
  color?: string;
};

type DataRecord = Record<string, unknown>;

interface ProjectMetricsData {
  metrics: ProjectCardMetric[];
  health: number | null;
  revenueTrend: ProjectMonthlyRevenue[];
  approvals?: ProjectApprovalItem[];
  activity?: ProjectActivityItem[];
  staff?: ProjectStaffMember[];
  departments?: ProjectDepartment[];
  tasks?: ProjectTasksSummary;
  leaveRequests?: ProjectLeaveRequest[];
}

const METRICS_TIMEOUT_MS = 5_000;
const API_TOKEN_ENCRYPTION_VERSION = 'v1';

export class ProjectAlreadyExistsError extends Error {
  constructor() {
    super('A project with this name already exists. Edit the existing project instead.');
    this.name = 'ProjectAlreadyExistsError';
  }
}

function getApiTokenEncryptionKey(): Buffer {
  const secret = process.env.SESSION_SECRET || 'agunwami_enterprise_ae_workstation_secret_key_2026_super_secure';
  return createHash('sha256').update(secret).digest();
}

function encryptApiToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getApiTokenEncryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  return [
    API_TOKEN_ENCRYPTION_VERSION,
    iv.toString('base64url'),
    cipher.getAuthTag().toString('base64url'),
    ciphertext.toString('base64url'),
  ].join('.');
}

function decryptApiToken(encrypted: string): string {
  const [version, encodedIv, encodedTag, encodedCiphertext] = encrypted.split('.');
  if (
    version !== API_TOKEN_ENCRYPTION_VERSION ||
    !encodedIv ||
    !encodedTag ||
    !encodedCiphertext
  ) {
    throw new Error('Stored project metrics token has an unsupported format.');
  }
  const decipher = createDecipheriv(
    'aes-256-gcm',
    getApiTokenEncryptionKey(),
    Buffer.from(encodedIv, 'base64url'),
  );
  decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
    decipher.final(),
  ]).toString('utf8');
}

function getLocalProjectsFilePath(): string {
  return path.join(process.cwd(), 'data', 'enterprise_projects.json');
}

const DEFAULT_PROJECTS: StoredProject[] = [
  {
    _id: 'aehub',
    id: 'aehub',
    name: 'AEHUB',
    subtitle: 'Education',
    description: 'Agunwami Enterprise Education & Professional Workspace Solution',
    lead: '',
    adminUrl: null,
    apiEndpoint: 'https://aehub-eafa6.web.app/api/enterprise/metrics',
    color: '#d97706',
    createdAt: '2026-10-02T12:48:44.905Z',
    updatedAt: '2026-10-02T12:48:44.905Z',
  },
];

function readLocalProjects(): StoredProject[] {
  try {
    const filePath = getLocalProjectsFilePath();
    if (!fs.existsSync(filePath)) return DEFAULT_PROJECTS;
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_PROJECTS;
    return parsed as StoredProject[];
  } catch (err) {
    console.warn('[backend/modules/projects] Failed to read local enterprise_projects.json:', err);
    return DEFAULT_PROJECTS;
  }
}

function writeLocalProjects(projects: StoredProject[]): void {
  const filePath = getLocalProjectsFilePath();
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf-8');
}

async function loadStoredProjects(): Promise<StoredProject[]> {
  let firestoreProjects: FirestoreDoc[] = [];
  try {
    firestoreProjects = await listDocs('enterprise_projects', 50);
  } catch (err) {
    console.warn('[backend/modules/projects] Could not fetch enterprise_projects from Firestore:', err);
  }

  const localProjects = readLocalProjects();
  if (localProjects.length === 0 && firestoreProjects.length === 0) {
    return DEFAULT_PROJECTS;
  }

  const merged = new Map<string, StoredProject>();
  for (const project of firestoreProjects) {
    const id = project._id || project.id;
    if (typeof id === 'string' && id) merged.set(id, project as StoredProject);
  }
  for (const project of localProjects) {
    const id = project._id || project.id;
    if (typeof id === 'string' && id) {
      const firestoreProject = merged.get(id);
      merged.set(id, firestoreProject ? { ...firestoreProject, ...project } : project);
    }
  }
  return Array.from(merged.values());
}

function asRecord(value: unknown): DataRecord | null {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
    ? value as DataRecord
    : null;
}

function stringValue(value: unknown): string | undefined {
  if (typeof value === 'string' && value.trim()) return value.trim();
  if (typeof value === 'number' && Number.isFinite(value)) return String(value);
  return undefined;
}

function numberValue(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string') return null;
  const parsed = Number(value.replace(/[^\d.-]/g, ''));
  return Number.isFinite(parsed) ? parsed : null;
}

function metricLabel(value: string): string {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/^./, first => first.toUpperCase());
}

function parseMetrics(data: DataRecord): ProjectCardMetric[] {
  const source = data.metrics ?? data.kpis ?? data.stats;
  if (Array.isArray(source)) {
    return source.flatMap(item => {
      const record = asRecord(item);
      if (!record) return [];
      const label = stringValue(record.label ?? record.name ?? record.title);
      const value = record.value;
      if (!label || value == null || typeof value === 'object') return [];
      return [{ label, value: String(value) }];
    });
  }

  const values = asRecord(source);
  if (values) {
    return Object.entries(values).flatMap(([key, value]) => {
      if (value == null || typeof value === 'object') return [];
      return [{ label: metricLabel(key), value: String(value) }];
    });
  }

  const excludedKeys = new Set([
    'health', 'healthScore', 'systemHealth', 'score', 'revenueTrend', 'monthlyRevenue',
    'revenueSeries', 'trend', 'series', 'status', 'id', 'name', 'subtitle', 'approvals',
    'pendingApprovals', 'staff', 'departments', 'tasks', 'activity', 'activities', 'feed',
    'events', 'analytics',
  ]);
  return Object.entries(data)
    .filter(([key, value]) => !excludedKeys.has(key) && value != null && typeof value !== 'object')
    .map(([key, value]) => ({ label: metricLabel(key), value: String(value) }));
}

function parseStaff(value: unknown): ProjectStaffMember[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    const record = asRecord(item);
    if (!record) return [];
    const name = stringValue(record.name ?? record.displayName);
    const id = stringValue(record.id ?? record.uid ?? record._id) ?? name;
    if (!id || !name) return [];
    return [{
      id,
      name,
      ...(stringValue(record.department) ? { department: stringValue(record.department) } : {}),
      ...(stringValue(record.role) ? { role: stringValue(record.role) } : {}),
      ...(stringValue(record.status) ? { status: stringValue(record.status) } : {}),
    }];
  });
}

function dateString(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : date.toISOString();
  }
  if (value && typeof value === 'object') {
    const timestamp = value as { toDate?: () => Date; seconds?: number; _seconds?: number };
    const date = typeof timestamp.toDate === 'function'
      ? timestamp.toDate()
      : typeof (timestamp.seconds ?? timestamp._seconds) === 'number'
        ? new Date((timestamp.seconds ?? timestamp._seconds)! * 1000)
        : null;
    return date && !Number.isNaN(date.getTime()) ? date.toISOString() : '';
  }
  return '';
}

function parseLeaveRequests(value: unknown, projectId: string, projectName: string): ProjectLeaveRequest[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    const record = asRecord(item);
    if (!record) return [];
    const id = stringValue(record.id ?? record._id);
    if (!id) return [];
    const rawStatus = String(record.status ?? 'pending').trim().toLowerCase();
    const status: ProjectLeaveRequest['status'] =
      rawStatus === 'approved' ? 'Approved' :
      rawStatus === 'rejected' ? 'Rejected' : 'Pending';
    return [{
      id,
      projectId,
      project: projectName,
      userId: stringValue(record.userId ?? record.aehubId) ?? '',
      employeeName: stringValue(record.employeeName ?? record.userName ?? record.staffName ?? record.employee) ?? 'Staff Member',
      ...(stringValue(record.userEmail ?? record.employeeEmail) ? { employeeEmail: stringValue(record.userEmail ?? record.employeeEmail) } : {}),
      department: stringValue(record.department) ?? 'Operations',
      type: stringValue(record.type ?? record.leaveType) ?? 'Annual Leave',
      startDate: dateString(record.startDate),
      endDate: dateString(record.endDate),
      days: numberValue(record.days) ?? 0,
      status,
      ...(stringValue(record.reason ?? record.notes) ? { reason: stringValue(record.reason ?? record.notes) } : {}),
      appliedAt: dateString(record.appliedAt ?? record.createdAt ?? record.timestamp),
      ...(stringValue(record.reviewedByName ?? record.reviewerName ?? record.reviewedBy) ? { reviewedBy: stringValue(record.reviewedByName ?? record.reviewerName ?? record.reviewedBy) } : {}),
      ...(dateString(record.reviewedAt) ? { reviewedAt: dateString(record.reviewedAt) } : {}),
    }];
  });
}

function taskStatus(value: unknown): ProjectTaskItem['status'] {
  const status = String(value ?? '').trim().toLowerCase();
  if (['completed', 'approved', 'done', 'closed'].includes(status)) return 'Completed';
  if (['in progress', 'in-progress', 'inprogress', 'progress'].includes(status)) return 'In Progress';
  if (['in review', 'in-review', 'review'].includes(status)) return 'In Review';
  if (['overdue', 'expired'].includes(status)) return 'Overdue';
  if (status === 'pending') return 'Pending';
  return 'Todo';
}

function taskPriority(value: unknown): ProjectTaskItem['priority'] {
  const priority = String(value ?? '').toLowerCase();
  if (priority === 'high' || priority === 'critical' || priority === 'urgent') return 'High';
  if (priority === 'low') return 'Low';
  return 'Medium';
}

function parseTasks(value: unknown): ProjectTasksSummary | undefined {
  const record = asRecord(value);
  if (!record) return undefined;

  const items = Array.isArray(record.items)
    ? record.items.flatMap((item, index): ProjectTaskItem[] => {
        const task = asRecord(item);
        if (!task) return [];
        const title = stringValue(task.task ?? task.title ?? task.name);
        if (!title) return [];
        return [{
          id: stringValue(task.id ?? task._id) ?? `task-${index + 1}`,
          task: title,
          ...(stringValue(task.assignee ?? task.assigneeName) ? { assignee: stringValue(task.assignee ?? task.assigneeName) } : {}),
          ...(stringValue(task.department) ? { department: stringValue(task.department) } : {}),
          ...(stringValue(task.dueDate) ? { dueDate: stringValue(task.dueDate) } : {}),
          status: taskStatus(task.status),
          priority: taskPriority(task.priority),
        }];
      })
    : undefined;

  const total = numberValue(record.total) ?? items?.length;
  const completed = numberValue(record.completed) ?? items?.filter(item => item.status === 'Completed').length;
  if (total == null && completed == null && !items) return undefined;

  const byStatus = Array.isArray(record.byStatus) ? record.byStatus.flatMap(item => {
    const row = asRecord(item);
    if (!row) return [];
    const label = stringValue(row.label ?? row.status);
    const count = numberValue(row.count);
    if (!label || count == null) return [];
    return [{ label, count, pct: numberValue(row.pct) ?? 0, color: stringValue(row.color) }];
  }) : undefined;

  const byPriority = Array.isArray(record.byPriority) ? record.byPriority.flatMap(item => {
    const row = asRecord(item);
    if (!row) return [];
    const label = stringValue(row.label ?? row.priority);
    const count = numberValue(row.count);
    if (!label || count == null) return [];
    return [{ label, count, pct: numberValue(row.pct) ?? 0, color: stringValue(row.color) }];
  }) : undefined;

  return {
    total: total ?? 0,
    completed: completed ?? 0,
    inProgress: numberValue(record.inProgress) ?? items?.filter(item => item.status === 'In Progress').length ?? 0,
    inReview: numberValue(record.inReview) ?? items?.filter(item => item.status === 'In Review').length,
    pending: numberValue(record.pending) ?? items?.filter(item => item.status === 'Pending' || item.status === 'Todo').length,
    completionRate: numberValue(record.completionRate) ?? undefined,
    byStatus,
    byPriority,
    items,
  };
}

function parseDepartments(value: unknown): ProjectDepartment[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    const record = asRecord(item);
    if (!record) return [];
    const name = stringValue(record.name ?? record.label ?? record.title);
    if (!name) return [];
    return [{
      id: stringValue(record.id) ?? name.toLowerCase().replace(/\s+/g, '-'),
      name,
      headcount: numberValue(record.headcount ?? record.count) ?? 0,
      staff: parseStaff(record.staff),
      tasksTotal: numberValue(record.tasksTotal) ?? undefined,
      tasksCompleted: numberValue(record.tasksCompleted) ?? undefined,
      tasksPending: numberValue(record.tasksPending) ?? undefined,
      hoursLogged: numberValue(record.hoursLogged) ?? undefined,
      attendanceRate: numberValue(record.attendanceRate) ?? undefined,
      productivity: numberValue(record.productivity) ?? undefined,
      efficiency: numberValue(record.efficiency) ?? undefined,
      engagement: numberValue(record.engagement) ?? undefined,
    }];
  });
}

function parseApprovals(value: unknown, projectName: string): ProjectApprovalItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap(item => {
    const record = asRecord(item);
    if (!record) return [];
    const status = String(record.status ?? 'pending').toLowerCase();
    if (['approved', 'completed', 'resolved', 'rejected', 'cancelled'].includes(status)) return [];
    const id = stringValue(record.id ?? record._id);
    if (!id) return [];
    const rawType = String(record.type ?? '').toLowerCase();
    const type: ProjectApprovalItem['type'] =
      rawType === 'leave' ? 'leave' :
      rawType === 'staff' ? 'staff' :
      rawType === 'payment' ? 'payment' : 'task';
    const createdAt = stringValue(record.createdAt ?? record.date ?? record.timestamp) ?? null;
    return [{
      id,
      title: stringValue(record.title) ?? (type === 'leave' ? 'Leave Request' : type === 'staff' ? 'Staff Request' : type === 'payment' ? 'Payment Approval' : 'Approval Request'),
      project: stringValue(record.project) ?? projectName,
      urgent: Boolean(record.urgent) || String(record.priority).toLowerCase() === 'high',
      subtitle: stringValue(record.subtitle ?? record.name ?? record.employee) ?? 'Pending review',
      details: stringValue(record.details ?? record.reason ?? record.notes) ?? 'Awaiting review.',
      type,
      sourceCollection: 'projectEndpoint',
      createdAt,
      status,
    }];
  });
}

function parseActivity(value: unknown): ProjectActivityItem[] | undefined {
  if (!Array.isArray(value)) return undefined;
  return value.flatMap((item, index) => {
    const record = asRecord(item);
    if (!record) return [];
    const text = stringValue(record.text ?? record.title ?? record.message ?? record.description);
    if (!text) return [];
    const rawType = String(record.type ?? '').toLowerCase();
    const type: ProjectActivityItem['type'] =
      rawType === 'announcement' || rawType === 'leave' || rawType === 'payment' || rawType === 'course'
        ? rawType
        : 'task';
    return [{
      id: stringValue(record.id ?? record._id) ?? `activity-${index + 1}`,
      text,
      time: stringValue(record.time ?? record.createdAt ?? record.timestamp ?? record.date) ?? null,
      type,
    }];
  });
}

function parseMetricsResponse(response: unknown): ProjectMetricsData {
  const outer = asRecord(response);
  if (!outer) throw new Error('Metrics endpoint response must be a JSON object.');
  const data = asRecord(outer.data) ?? outer;

  const rawRevenue = data.revenueTrend ?? data.monthlyRevenue ?? data.revenueSeries ?? data.trend ?? data.series;
  const revenueTrend = Array.isArray(rawRevenue)
    ? rawRevenue.flatMap(item => {
        const record = asRecord(item);
        const month = record && stringValue(record.month ?? record.label ?? record.name);
        const revenue = record && numberValue(record.revenue ?? record.amount ?? record.value);
        return month && revenue != null ? [{ month, revenue }] : [];
      })
    : [];

  const departments = parseDepartments(data.departments);
  const staff = parseStaff(data.staff) ?? departments?.flatMap(department => department.staff ?? []);
  const tasks = parseTasks(data.tasks);
  const leaveRequests = parseLeaveRequests(data.leaveRequests, '', stringValue(data.projectName ?? data.name) ?? 'Project');
  const rawApprovals = data.approvals ?? (Array.isArray(data.pendingApprovals) ? data.pendingApprovals : undefined);
  const approvals = parseApprovals(rawApprovals, stringValue(data.projectName ?? data.name) ?? 'Project');
  const activity = parseActivity(data.activity ?? data.activities ?? data.feed ?? data.events);
  const metrics = parseMetrics(data);
  const pendingApprovals = Array.isArray(data.pendingApprovals)
    ? data.pendingApprovals.length
    : numberValue(asRecord(data.pendingApprovals)?.count ?? data.pendingApprovals);
  if (
    pendingApprovals != null &&
    !metrics.some(metric => /pending\s*approvals/i.test(metric.label))
  ) {
    metrics.push({ label: 'Pending Approvals', value: String(pendingApprovals) });
  }
  const healthMetricIndex = metrics.findIndex(metric => /\bhealth\b/i.test(metric.label));
  const rawHealth = numberValue(
    data.health ??
    data.healthScore ??
    data.systemHealth ??
    data.score ??
    (healthMetricIndex >= 0 ? metrics[healthMetricIndex].value : undefined),
  );
  const health = rawHealth == null ? null : Math.max(0, Math.min(100, Math.round(rawHealth)));
  if (health != null) {
    const healthMetric = { label: 'Health Score', value: `${health}%` };
    if (healthMetricIndex >= 0) metrics[healthMetricIndex] = healthMetric;
    else metrics.push(healthMetric);
  }

  return {
    metrics,
    health,
    revenueTrend,
    ...(approvals ? { approvals } : {}),
    ...(activity ? { activity } : {}),
    ...(staff ? { staff } : {}),
    ...(departments ? { departments } : {}),
    ...(tasks ? { tasks } : {}),
    ...(leaveRequests ? { leaveRequests } : {}),
  };
}

function normalizeMetricsUrl(endpoint: string): string {
  const url = new URL(endpoint.trim());
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new Error('Metrics endpoint must be an HTTP(S) URL without embedded credentials.');
  }
  return url.toString();
}

async function fetchProjectMetrics(endpoint: string, apiToken?: string): Promise<ProjectMetricsData> {
  const url = normalizeMetricsUrl(endpoint);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), METRICS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/json',
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!response.ok) {
      throw new Error(`Metrics endpoint returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`);
    }
    return parseMetricsResponse(await response.json());
  } finally {
    clearTimeout(timeout);
  }
}

function toProjectCard(project: StoredProject): ProjectCardData | null {
  const id = project._id || project.id;
  if (typeof id !== 'string' || !id) return null;
  const apiEndpoint = typeof project.apiEndpoint === 'string' && project.apiEndpoint.trim()
    ? project.apiEndpoint.trim()
    : null;

  return {
    id,
    name: typeof project.name === 'string' ? project.name : 'Untitled Project',
    subtitle: typeof project.subtitle === 'string' ? project.subtitle : 'Project',
    description: typeof project.description === 'string' ? project.description : undefined,
    lead: typeof project.lead === 'string' ? project.lead : undefined,
    adminUrl: typeof project.adminUrl === 'string' ? project.adminUrl : null,
    apiEndpoint,
    hasApiToken: typeof project.apiTokenEncrypted === 'string' && project.apiTokenEncrypted.length > 0,
    color: typeof project.color === 'string' ? project.color : '#3b82f6',
    metrics: [],
    health: null,
    revenueTrend: [],
    status: 'pending',
  };
}

async function loadProject(project: StoredProject): Promise<ProjectCardData | null> {
  const card = toProjectCard(project);
  if (!card || !card.apiEndpoint) return card;

  try {
    const apiToken = typeof project.apiTokenEncrypted === 'string'
      ? decryptApiToken(project.apiTokenEncrypted)
      : undefined;
    const metrics = await fetchProjectMetrics(card.apiEndpoint, apiToken);
    return {
      ...card,
      ...metrics,
      leaveRequests: metrics.leaveRequests?.map(request => ({
        ...request,
        projectId: card.id,
        project: card.name,
      })),
      status: 'online',
      lastSyncedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      ...card,
      status: 'error',
      endpointError: error instanceof Error ? error.message : String(error),
    };
  }
}

export class ProjectsService {
  static async getProjectsOverview(): Promise<ProjectCardData[]> {
    return Promise.all((await loadStoredProjects()).map(loadProject))
      .then(projects => projects.filter((project): project is ProjectCardData => project !== null));
  }

  static async getProjectLeaveRequests(): Promise<{
    requests: ProjectLeaveRequest[];
    projectErrors: Array<{ project: string; error: string }>;
  }> {
    const projects = await this.getProjectsOverview();
    return {
      requests: projects.flatMap(project => project.leaveRequests || []),
      projectErrors: projects.flatMap(project =>
        !project.apiEndpoint
          ? []
          : project.status === 'error'
            ? [{ project: project.name, error: project.endpointError || 'Project endpoint failed.' }]
            : project.leaveRequests === undefined
              ? [{ project: project.name, error: 'Metrics response does not include leaveRequests.' }]
              : [],
      ),
    };
  }

  static async updateProjectLeaveStatus(
    projectId: string,
    requestId: string,
    status: 'Approved' | 'Rejected',
    reviewerId: string,
    reviewerName: string,
    comments?: string,
  ): Promise<void> {
    const project = (await loadStoredProjects()).find(item => (item._id || item.id) === projectId);
    if (!project || typeof project.apiEndpoint !== 'string' || !project.apiEndpoint.trim()) {
      throw new Error('The selected project has no configured metrics endpoint.');
    }

    const metricsUrl = new URL(normalizeMetricsUrl(project.apiEndpoint));
    if (!metricsUrl.pathname.endsWith('/metrics')) {
      throw new Error('The selected project endpoint does not support leave-request updates.');
    }
    metricsUrl.pathname = `${metricsUrl.pathname.slice(0, -'metrics'.length)}leave-requests`;

    const apiToken = typeof project.apiTokenEncrypted === 'string'
      ? decryptApiToken(project.apiTokenEncrypted)
      : undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), METRICS_TIMEOUT_MS);
    try {
      const response = await fetch(metricsUrl, {
        method: 'PATCH',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify({ id: requestId, status, reviewerId, reviewerName, comments }),
        signal: controller.signal,
        cache: 'no-store',
      });
      const result = asRecord(await response.json().catch(() => null));
      if (!response.ok) {
        throw new Error(
          stringValue(result?.error) ||
          `Project leave endpoint returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`,
        );
      }
      if (result?.success !== true) throw new Error('Project leave endpoint did not confirm the status update.');
    } finally {
      clearTimeout(timeout);
    }
  }

  static async createProjectTask(projectId: string, payload: ProjectTaskCreatePayload): Promise<{ id: string }> {
    const project = (await loadStoredProjects()).find(item => (item._id || item.id) === projectId);
    if (!project || typeof project.apiEndpoint !== 'string' || !project.apiEndpoint.trim()) {
      throw new Error('The selected project has no configured metrics endpoint.');
    }

    const metricsUrl = new URL(normalizeMetricsUrl(project.apiEndpoint));
    if (!metricsUrl.pathname.endsWith('/metrics')) {
      throw new Error('The selected project endpoint does not support project task creation.');
    }
    metricsUrl.pathname = `${metricsUrl.pathname.slice(0, -'metrics'.length)}tasks`;

    const apiToken = typeof project.apiTokenEncrypted === 'string'
      ? decryptApiToken(project.apiTokenEncrypted)
      : undefined;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), METRICS_TIMEOUT_MS);
    try {
      const response = await fetch(metricsUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
        cache: 'no-store',
      });
      const result = asRecord(await response.json().catch(() => null));
      if (!response.ok) {
        throw new Error(
          stringValue(result?.error) ||
          `Project task endpoint returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`,
        );
      }
      const id = stringValue(result?.id);
      if (!id) throw new Error('Project task endpoint returned an invalid task response.');
      return { id };
    } finally {
      clearTimeout(timeout);
    }
  }

  static async createProject(dto: CreateProjectDto): Promise<ProjectCardData> {
    const slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `proj-${Date.now()}`;
    if (await getDoc('enterprise_projects', slug)) {
      throw new ProjectAlreadyExistsError();
    }
    const now = new Date().toISOString();
    const project: StoredProject = {
      _id: slug,
      id: slug,
      name: dto.name.trim(),
      subtitle: dto.subtitle.trim(),
      description: dto.description?.trim() || '',
      lead: dto.lead?.trim() || '',
      adminUrl: dto.adminUrl?.trim() || null,
      apiEndpoint: dto.apiEndpoint?.trim() || null,
      apiTokenEncrypted: dto.apiToken?.trim() ? encryptApiToken(dto.apiToken.trim()) : null,
      color: dto.color || '#3b82f6',
      createdAt: now,
      updatedAt: now,
    };

    const created = await createDoc('enterprise_projects', project, slug);
    if (!created) throw new Error('Could not save the project record.');
    const existing = readLocalProjects().filter(item => (item.id || item._id) !== slug);
    writeLocalProjects([...existing, project]);

    const card = await loadProject(project);
    if (!card) throw new Error('Unable to create a project response.');
    return card;
  }

  static async updateProject(id: string, dto: UpdateProjectDto): Promise<boolean> {
    const allowedUpdates: Record<string, unknown> = {};
    if (dto.name !== undefined) allowedUpdates.name = dto.name;
    if (dto.subtitle !== undefined) allowedUpdates.subtitle = dto.subtitle;
    if (dto.description !== undefined) allowedUpdates.description = dto.description;
    if (dto.lead !== undefined) allowedUpdates.lead = dto.lead;
    if (dto.adminUrl !== undefined) allowedUpdates.adminUrl = dto.adminUrl;
    if (dto.apiEndpoint !== undefined) allowedUpdates.apiEndpoint = dto.apiEndpoint?.trim() || '';
    if (dto.apiToken?.trim()) allowedUpdates.apiTokenEncrypted = encryptApiToken(dto.apiToken.trim());
    else if (dto.clearApiToken) allowedUpdates.apiTokenEncrypted = null;
    if (dto.color !== undefined) allowedUpdates.color = dto.color;
    const updatedAt = new Date().toISOString();
    const updated = await updateDoc('enterprise_projects', id, { ...allowedUpdates, updatedAt });
    if (!updated) throw new Error('Could not save the project update.');
    const existing = readLocalProjects();
    const index = existing.findIndex(project => (project.id || project._id) === id);
    if (index !== -1) {
      existing[index] = { ...existing[index], ...allowedUpdates, updatedAt };
      writeLocalProjects(existing);
    }
    return true;
  }

  static async deleteProject(id: string): Promise<boolean> {
    const deleted = await deleteDoc('enterprise_projects', id);
    if (!deleted) throw new Error('Could not delete the project record.');
    writeLocalProjects(readLocalProjects().filter(project => (project.id || project._id) !== id));
    return true;
  }
}

export const getProjectsOverview = ProjectsService.getProjectsOverview;
export const createProject = ProjectsService.createProject;
export const updateProject = ProjectsService.updateProject;
export const deleteProject = ProjectsService.deleteProject;
