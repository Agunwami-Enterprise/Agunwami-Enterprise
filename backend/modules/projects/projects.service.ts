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
  ProjectRecordTone,
  ProjectRecordsTable,
  ProjectStaffMember,
  ProjectTaskCreatePayload,
  ProjectTaskItem,
  ProjectTasksSummary,
  ProjectTopItems,
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
  name?: string;
  subtitle?: string;
  description?: string;
  lead?: string;
  adminUrl?: string | null;
  color?: string;
  metrics: ProjectCardMetric[];
  health: number | null;
  revenueTrend: ProjectMonthlyRevenue[];
  approvals?: ProjectApprovalItem[];
  activity?: ProjectActivityItem[];
  staff?: ProjectStaffMember[];
  departments?: ProjectDepartment[];
  tasks?: ProjectTasksSummary;
  leaveRequests?: ProjectLeaveRequest[];
  topItems?: ProjectTopItems;
  recentRecords?: ProjectRecordsTable;
}

const METRICS_TIMEOUT_MS = 5_000;
// Successful endpoint responses are reused for this long so one dashboard load
// (which reads project data from several services) hits each project once.
const METRICS_CACHE_TTL_MS = 60_000;
const SNAPSHOT_COLLECTION = 'enterprise_project_snapshots';
const API_TOKEN_ENCRYPTION_VERSION = 'v1';
const DEV_ONLY_TOKEN_SECRET = 'agunwami_enterprise_ae_workstation_secret_key_2026_super_secure';
const IS_PRODUCTION = process.env.NODE_ENV === 'production';

export class ProjectAlreadyExistsError extends Error {
  constructor() {
    super('A project with this name already exists. Edit the existing project instead.');
    this.name = 'ProjectAlreadyExistsError';
  }
}

export class ProjectValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ProjectValidationError';
  }
}

/**
 * Keys that can decrypt stored project tokens, primary first. A dedicated
 * PROJECT_TOKEN_ENCRYPTION_KEY lets SESSION_SECRET be rotated (to sign
 * everyone out) without breaking saved project credentials.
 */
function getApiTokenEncryptionKeys(): Buffer[] {
  const secrets = [process.env.PROJECT_TOKEN_ENCRYPTION_KEY, process.env.SESSION_SECRET]
    .filter((secret): secret is string => Boolean(secret?.trim()));
  if (secrets.length === 0) {
    if (IS_PRODUCTION) {
      throw new Error('Server is missing PROJECT_TOKEN_ENCRYPTION_KEY (or SESSION_SECRET); project tokens cannot be stored or read.');
    }
    secrets.push(DEV_ONLY_TOKEN_SECRET);
  }
  return secrets.map(secret => createHash('sha256').update(secret).digest());
}

function encryptApiToken(token: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', getApiTokenEncryptionKeys()[0], iv);
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
  for (const key of getApiTokenEncryptionKeys()) {
    try {
      const decipher = createDecipheriv('aes-256-gcm', key, Buffer.from(encodedIv, 'base64url'));
      decipher.setAuthTag(Buffer.from(encodedTag, 'base64url'));
      return Buffer.concat([
        decipher.update(Buffer.from(encodedCiphertext, 'base64url')),
        decipher.final(),
      ]).toString('utf8');
    } catch {
      // GCM authentication failed: wrong key, try the next one.
    }
  }
  throw new Error('Stored project token could not be decrypted with the server key. Re-enter the token for this project.');
}

function storedApiToken(project: StoredProject): string | undefined {
  return typeof project.apiTokenEncrypted === 'string' && project.apiTokenEncrypted
    ? decryptApiToken(project.apiTokenEncrypted)
    : undefined;
}

function getLocalProjectsFilePath(): string {
  return path.join(process.cwd(), 'data', 'configured_endpoints.json');
}

function readLocalProjects(): StoredProject[] {
  try {
    const filePath = getLocalProjectsFilePath();
    if (!fs.existsSync(filePath)) return [];
    const parsed: unknown = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    if (!Array.isArray(parsed)) return [];
    return parsed as StoredProject[];
  } catch (err) {
    console.warn('[backend/modules/projects] Failed to read local configured_endpoints.json:', err);
    return [];
  }
}

/** Returns false when the file could not be written (e.g. read-only disk). */
function writeLocalProjects(projects: StoredProject[]): boolean {
  try {
    const filePath = getLocalProjectsFilePath();
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    // Write then rename so a crash mid-write cannot leave truncated JSON,
    // which readLocalProjects would treat as an empty store.
    const tempPath = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tempPath, JSON.stringify(projects, null, 2), 'utf-8');
    fs.renameSync(tempPath, filePath);
    return true;
  } catch (err) {
    console.warn('[backend/modules/projects] Failed to write local configured_endpoints.json:', err);
    return false;
  }
}

async function loadStoredProjects(): Promise<StoredProject[]> {
  let firestoreProjects: FirestoreDoc[] = [];
  try {
    firestoreProjects = await listDocs('enterprise_projects', 50);
  } catch (err) {
    console.warn('[backend/modules/projects] Could not fetch enterprise_projects from Firestore:', err);
  }

  const localProjects = readLocalProjects();

  // Firestore wins where both stores have a project; the local file (used on
  // hosts without Firestore credentials) fills the gaps.
  const merged = new Map<string, StoredProject>();
  for (const project of localProjects) {
    const id = (project._id || project.id) as string;
    if (typeof id === 'string' && id) merged.set(id, project);
  }
  for (const project of firestoreProjects) {
    const id = (project._id || project.id) as string;
    if (typeof id === 'string' && id) {
      const localProject = merged.get(id);
      merged.set(id, localProject ? { ...localProject, ...project } : project as StoredProject);
    }
  }

  // Also support PROJECT_METRICS_ENDPOINTS env variable if configured
  if (process.env.PROJECT_METRICS_ENDPOINTS) {
    const envEndpoints = process.env.PROJECT_METRICS_ENDPOINTS.split(',')
      .map(url => url.trim())
      .filter(Boolean);
    for (const url of envEndpoints) {
      const id = url.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 32);
      if (!merged.has(id)) {
        merged.set(id, {
          _id: id,
          id,
          apiEndpoint: url,
          name: 'Connected Project',
          subtitle: 'Venture',
        });
      }
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
      const hint = stringValue(record.hint ?? record.change ?? record.caption);
      const trend = record.trend === 'up' || record.trend === 'down'
        ? record.trend
        : hint?.startsWith('+') ? 'up' : hint?.startsWith('-') || hint?.startsWith('−') ? 'down' : undefined;
      return [{ label, value: String(value), ...(hint ? { hint } : {}), ...(trend ? { trend } : {}) }];
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
    'events', 'analytics', 'topItems', 'recentRecords',
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

/** Optional ranked chart: { title, subtitle?, items: [{ label, value }] }. */
function parseTopItems(raw: unknown): ProjectTopItems | undefined {
  const record = asRecord(raw);
  const title = record && stringValue(record.title);
  if (!record || !title || !Array.isArray(record.items)) return undefined;
  const items = record.items.flatMap(item => {
    const entry = asRecord(item);
    const label = entry && stringValue(entry.label ?? entry.name);
    const value = entry && numberValue(entry.value ?? entry.count);
    return label && value != null ? [{ label, value }] : [];
  }).slice(0, 10);
  if (items.length === 0) return undefined;
  const subtitle = stringValue(record.subtitle);
  return { title, ...(subtitle ? { subtitle } : {}), items };
}

const RECORD_TONES: ProjectRecordTone[] = ['success', 'info', 'warning', 'danger', 'neutral'];

/** Optional table: { title, columns: [...], rows: [{ cells: [...], status?, tone? }] }. */
function parseRecordsTable(raw: unknown): ProjectRecordsTable | undefined {
  const record = asRecord(raw);
  const title = record && stringValue(record.title);
  if (!record || !title || !Array.isArray(record.columns) || !Array.isArray(record.rows)) return undefined;
  const columns = record.columns.map(column => stringValue(column) ?? '').slice(0, 6);
  const rows = record.rows.flatMap(row => {
    const entry = asRecord(row);
    if (!entry || !Array.isArray(entry.cells)) return [];
    const cells = entry.cells.map(cell => (cell == null || typeof cell === 'object' ? '' : String(cell))).slice(0, columns.length);
    const status = stringValue(entry.status);
    const tone = RECORD_TONES.includes(entry.tone as ProjectRecordTone) ? entry.tone as ProjectRecordTone : undefined;
    return [{ cells, ...(status ? { status } : {}), ...(tone ? { tone } : {}) }];
  }).slice(0, 10);
  return columns.length ? { title, columns, rows } : undefined;
}

function parseMetricsResponse(response: unknown): ProjectMetricsData {
  const outer = asRecord(response);
  if (!outer) throw new Error('Metrics endpoint response must be a JSON object.');
  const data = asRecord(outer.data) ?? outer;

  const endpointName = stringValue(data.projectName ?? data.name ?? data.title);
  const endpointSubtitle = stringValue(data.subtitle ?? data.category ?? data.type);
  const endpointDescription = stringValue(data.description ?? data.summary);
  const endpointColor = stringValue(data.color ?? data.themeColor);
  const endpointLead = stringValue(data.lead ?? data.projectLead ?? data.manager);
  const endpointAdminUrl = stringValue(data.adminUrl ?? data.dashboardUrl);

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
  const leaveRequests = parseLeaveRequests(data.leaveRequests, '', endpointName ?? 'Project');
  const rawApprovals = data.approvals ?? (Array.isArray(data.pendingApprovals) ? data.pendingApprovals : undefined);
  const approvals = parseApprovals(rawApprovals, endpointName ?? 'Project');
  const activity = parseActivity(data.activity ?? data.activities ?? data.feed ?? data.events);
  const metrics = parseMetrics(data);
  const topItems = parseTopItems(data.topItems);
  const recentRecords = parseRecordsTable(data.recentRecords);
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
    ...(endpointName ? { name: endpointName } : {}),
    ...(endpointSubtitle ? { subtitle: endpointSubtitle } : {}),
    ...(endpointDescription ? { description: endpointDescription } : {}),
    ...(endpointColor ? { color: endpointColor } : {}),
    ...(endpointLead ? { lead: endpointLead } : {}),
    ...(endpointAdminUrl ? { adminUrl: endpointAdminUrl } : {}),
    metrics,
    health,
    revenueTrend,
    ...(approvals ? { approvals } : {}),
    ...(activity ? { activity } : {}),
    ...(staff ? { staff } : {}),
    ...(departments ? { departments } : {}),
    ...(tasks ? { tasks } : {}),
    ...(leaveRequests ? { leaveRequests } : {}),
    ...(topItems ? { topItems } : {}),
    ...(recentRecords ? { recentRecords } : {}),
  };
}

function isPrivateHostname(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.internal') ||
    host.endsWith('.local')
  ) {
    return true;
  }

  const ipv4 = host.replace(/^::ffff:/, '').match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4) {
    const [a, b] = [Number(ipv4[1]), Number(ipv4[2])];
    return (
      a === 0 || a === 10 || a === 127 ||
      (a === 100 && b >= 64 && b <= 127) ||
      (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) ||
      (a === 192 && b === 168)
    );
  }

  return host.includes(':') && (host === '::' || host === '::1' || /^f[cd]/.test(host) || /^fe[89ab]/.test(host));
}

/**
 * Validates a project endpoint before any token is sent to it. In production
 * the token must travel over HTTPS to a public host; local development may
 * point at http://localhost projects.
 */
function normalizeMetricsUrl(endpoint: string): string {
  let url: URL;
  try {
    url = new URL(endpoint.trim());
  } catch {
    throw new ProjectValidationError('Metrics endpoint must be a valid URL.');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new ProjectValidationError('Metrics endpoint must be an HTTP(S) URL without embedded credentials.');
  }
  if (IS_PRODUCTION && url.protocol !== 'https:') {
    throw new ProjectValidationError('Metrics endpoint must use HTTPS so the bearer token is not sent in plain text.');
  }
  if (IS_PRODUCTION && isPrivateHostname(url.hostname)) {
    throw new ProjectValidationError('Metrics endpoint must be a public host, not a local or private network address.');
  }
  return url.toString();
}

/** Derives a sibling action endpoint, e.g. `/api/enterprise/metrics` → `/api/enterprise/tasks`. */
function projectActionUrl(project: StoredProject | undefined, action: 'leave-requests' | 'tasks'): URL {
  if (!project || typeof project.apiEndpoint !== 'string' || !project.apiEndpoint.trim()) {
    throw new Error('The selected project has no configured metrics endpoint.');
  }
  const url = new URL(normalizeMetricsUrl(project.apiEndpoint));
  if (!url.pathname.endsWith('/metrics')) {
    throw new Error(`The selected project endpoint does not support ${action === 'tasks' ? 'project task creation' : 'leave-request updates'}.`);
  }
  url.pathname = `${url.pathname.slice(0, -'metrics'.length)}${action}`;
  return url;
}

/** Calls a project endpoint with its bearer token, a timeout, and no redirects. */
async function callProjectEndpoint(
  url: string | URL,
  apiToken: string | undefined,
  init: { method?: 'GET' | 'POST' | 'PATCH'; body?: unknown } = {},
): Promise<{ response: Response; body: unknown }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), METRICS_TIMEOUT_MS);
  try {
    const response = await fetch(url, {
      method: init.method ?? 'GET',
      headers: {
        Accept: 'application/json',
        ...(init.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(apiToken ? { Authorization: `Bearer ${apiToken}` } : {}),
      },
      ...(init.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
      // Never follow a redirect: it could carry the token somewhere unvetted.
      redirect: 'error',
      signal: controller.signal,
      cache: 'no-store',
    });
    const body: unknown = await response.json().catch(() => null);
    return { response, body };
  } catch (error) {
    if (controller.signal.aborted) {
      throw new Error(`Project endpoint did not respond within ${METRICS_TIMEOUT_MS / 1000}s.`);
    }
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

function httpErrorMessage(label: string, response: Response, body: unknown): string {
  return (
    stringValue(asRecord(body)?.error) ||
    `${label} returned HTTP ${response.status}${response.statusText ? ` ${response.statusText}` : ''}.`
  );
}

async function fetchProjectMetrics(endpoint: string, apiToken?: string): Promise<ProjectMetricsData> {
  const { response, body } = await callProjectEndpoint(normalizeMetricsUrl(endpoint), apiToken);
  if (!response.ok) {
    throw new Error(httpErrorMessage('Metrics endpoint', response, body));
  }
  return parseMetricsResponse(body);
}

// ── Metrics cache & last-known-good snapshots ───────────────────────────────

interface CachedMetrics {
  fingerprint: string;
  data: ProjectMetricsData;
  fetchedAt: number;
  /** Set when a later fetch failed, so the entry is only used as a fallback. */
  expired?: boolean;
}

const metricsCache = new Map<string, CachedMetrics>();
const metricsInFlight = new Map<string, Promise<ProjectMetricsData>>();

/** Changes whenever the endpoint or token changes, so edits bypass old data. */
function metricsFingerprint(project: StoredProject): string {
  return createHash('sha256')
    .update(`${project.apiEndpoint ?? ''}\n${project.apiTokenEncrypted ?? ''}`)
    .digest('base64url');
}

function invalidateProjectMetrics(projectId: string): void {
  metricsCache.delete(projectId);
}

async function saveSnapshot(projectId: string, cached: CachedMetrics): Promise<void> {
  try {
    await updateDoc(SNAPSHOT_COLLECTION, projectId, {
      fingerprint: cached.fingerprint,
      data: JSON.stringify(cached.data),
      syncedAt: new Date(cached.fetchedAt).toISOString(),
    });
  } catch (err) {
    console.warn(`[backend/modules/projects] Could not save metrics snapshot for ${projectId}:`, err);
  }
}

async function loadSnapshot(projectId: string, fingerprint: string): Promise<CachedMetrics | null> {
  try {
    const doc = await getDoc(SNAPSHOT_COLLECTION, projectId);
    if (!doc || doc.fingerprint !== fingerprint || typeof doc.data !== 'string') return null;
    const fetchedAt = Date.parse(String(doc.syncedAt));
    if (Number.isNaN(fetchedAt)) return null;
    return { fingerprint, data: JSON.parse(doc.data) as ProjectMetricsData, fetchedAt };
  } catch {
    return null;
  }
}

/**
 * Returns fresh metrics, reusing a response younger than the cache TTL and
 * sharing a single request between concurrent callers.
 */
async function getProjectMetrics(
  projectId: string,
  project: StoredProject,
  endpoint: string,
  forceRefresh: boolean,
): Promise<CachedMetrics> {
  const fingerprint = metricsFingerprint(project);
  const cached = metricsCache.get(projectId);
  if (
    !forceRefresh &&
    cached?.fingerprint === fingerprint &&
    !cached.expired &&
    Date.now() - cached.fetchedAt < METRICS_CACHE_TTL_MS
  ) {
    return cached;
  }

  const inFlightKey = `${projectId}:${fingerprint}`;
  let request = metricsInFlight.get(inFlightKey);
  if (!request) {
    request = fetchProjectMetrics(endpoint, storedApiToken(project))
      .finally(() => metricsInFlight.delete(inFlightKey));
    metricsInFlight.set(inFlightKey, request);
  }
  const data = await request;
  const fresh = metricsCache.get(projectId);
  if (fresh?.fingerprint === fingerprint && fresh.data === data) return fresh;

  const entry = { fingerprint, data, fetchedAt: Date.now() };
  metricsCache.set(projectId, entry);
  void saveSnapshot(projectId, entry);
  return entry;
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

function mergeMetricsIntoCard(card: ProjectCardData, metrics: ProjectMetricsData): ProjectCardData {
  const resolvedName = metrics.name || card.name;
  return {
    ...card,
    ...metrics,
    name: resolvedName,
    subtitle: metrics.subtitle || card.subtitle,
    description: metrics.description ?? card.description,
    lead: metrics.lead ?? card.lead,
    adminUrl: metrics.adminUrl !== undefined ? metrics.adminUrl : card.adminUrl,
    color: metrics.color || card.color,
    leaveRequests: metrics.leaveRequests?.map(request => ({
      ...request,
      projectId: card.id,
      project: resolvedName,
    })),
  };
}

async function loadProject(project: StoredProject, forceRefresh = false): Promise<ProjectCardData | null> {
  const card = toProjectCard(project);
  if (!card || !card.apiEndpoint) return card;

  try {
    const { data, fetchedAt } = await getProjectMetrics(card.id, project, card.apiEndpoint, forceRefresh);
    return {
      ...mergeMetricsIntoCard(card, data),
      status: 'online',
      lastSyncedAt: new Date(fetchedAt).toISOString(),
    };
  } catch (error) {
    const endpointError = error instanceof Error ? error.message : String(error);
    // Keep showing the last good data (flagged as stale) while a project is down.
    const fingerprint = metricsFingerprint(project);
    const cached = metricsCache.get(card.id);
    if (cached?.fingerprint === fingerprint) cached.expired = true;
    const lastGood = cached?.fingerprint === fingerprint
      ? cached
      : await loadSnapshot(card.id, fingerprint);
    if (lastGood) {
      return {
        ...mergeMetricsIntoCard(card, lastGood.data),
        status: 'online',
        stale: true,
        endpointError,
        lastSyncedAt: new Date(lastGood.fetchedAt).toISOString(),
      };
    }
    return { ...card, status: 'error', endpointError };
  }
}

/** A saved workstation project record. Holds the encrypted token, so keep it server-side. */
export type ProjectRecord = StoredProject;

/**
 * Saved workstation projects (Firestore merged with the local file),
 * without fetching metrics. Endpoints configured only through
 * PROJECT_METRICS_ENDPOINTS have no saved record and are skipped.
 */
export async function listProjectRecords(): Promise<ProjectRecord[]> {
  const configuredOnlyByEnv = new Set(
    (process.env.PROJECT_METRICS_ENDPOINTS ?? '').split(',').map(url => url.trim()).filter(Boolean)
      .map(url => url.replace(/[^a-zA-Z0-9]/g, '-').slice(0, 32)),
  );
  return (await loadStoredProjects()).filter(project => {
    const id = project._id || project.id;
    return typeof id === 'string' && !!id && !(configuredOnlyByEnv.has(id) && project.name === 'Connected Project');
  });
}

export class ProjectsService {
  /**
   * Project cards with endpoint data. Responses are cached for a minute;
   * pass `forceRefresh` to re-read every endpoint now.
   */
  static async getProjectsOverview(forceRefresh = false): Promise<ProjectCardData[]> {
    const stored = await loadStoredProjects();
    if (stored.length === 0) {
      return [];
    }
    return Promise.all(stored.map(project => loadProject(project, forceRefresh)))
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
            : project.stale
              ? [{ project: project.name, error: `Showing requests from the last sync (${project.lastSyncedAt}); endpoint failed: ${project.endpointError}` }]
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
    const url = projectActionUrl(project, 'leave-requests');
    const { response, body } = await callProjectEndpoint(url, storedApiToken(project!), {
      method: 'PATCH',
      body: { id: requestId, status, reviewerId, reviewerName, comments },
    });
    if (!response.ok) throw new Error(httpErrorMessage('Project leave endpoint', response, body));
    if (asRecord(body)?.success !== true) throw new Error('Project leave endpoint did not confirm the status update.');
    invalidateProjectMetrics(projectId);
  }

  static async createProjectTask(projectId: string, payload: ProjectTaskCreatePayload): Promise<{ id: string }> {
    const project = (await loadStoredProjects()).find(item => (item._id || item.id) === projectId);
    const url = projectActionUrl(project, 'tasks');
    const { response, body } = await callProjectEndpoint(url, storedApiToken(project!), {
      method: 'POST',
      body: payload,
    });
    if (!response.ok) throw new Error(httpErrorMessage('Project task endpoint', response, body));
    const id = stringValue(asRecord(body)?.id);
    if (!id) throw new Error('Project task endpoint returned an invalid task response.');
    invalidateProjectMetrics(projectId);
    return { id };
  }

  /**
   * Creates a workstation project. The CEO dashboard requires a metrics
   * endpoint and token; the website C-panel creates projects without them
   * (`requireMetrics: false`) and adds them later from the dashboard.
   */
  static async createProject(dto: CreateProjectDto, { requireMetrics = true } = {}): Promise<ProjectCardData> {
    const endpoint = dto.apiEndpoint?.trim() || null;
    if (!endpoint && requireMetrics) {
      throw new ProjectValidationError('Project metrics endpoint URL is required.');
    }
    if (endpoint) normalizeMetricsUrl(endpoint);
    const token = dto.apiToken?.trim() || null;
    if (!token && (requireMetrics || endpoint)) {
      throw new ProjectValidationError('Project endpoint Bearer Token is required.');
    }

    const slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `proj-${Date.now()}`;

    // Check both stores: on a host without Firestore credentials getDoc
    // returns null, and the local file would otherwise be silently overwritten.
    if (readLocalProjects().some(item => (item.id || item._id) === slug)) {
      throw new ProjectAlreadyExistsError();
    }
    try {
      if (await getDoc('enterprise_projects', slug)) {
        throw new ProjectAlreadyExistsError();
      }
    } catch (err) {
      if (err instanceof ProjectAlreadyExistsError) throw err;
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
      apiEndpoint: endpoint,
      apiTokenEncrypted: token ? encryptApiToken(token) : null,
      color: dto.color || '#3b82f6',
      ...(dto.website ? { website: dto.website } : {}),
      createdAt: now,
      updatedAt: now,
    };

    const savedToFirestore = await createDoc('enterprise_projects', project, slug).catch(err => {
      console.warn('[backend/modules/projects] Could not save project to Firestore:', err);
      return null;
    });
    const existing = readLocalProjects().filter(item => (item.id || item._id) !== slug);
    const savedLocally = writeLocalProjects([...existing, project]);
    if (!savedToFirestore && !savedLocally) {
      throw new Error('Could not save the project: Firestore is unavailable and the local data file is not writable.');
    }

    const card = await loadProject(project, true);
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
    if (dto.apiEndpoint !== undefined) {
      const endpoint = dto.apiEndpoint?.trim() || '';
      if (endpoint) normalizeMetricsUrl(endpoint);
      allowedUpdates.apiEndpoint = endpoint;
    }
    if (dto.apiToken?.trim()) allowedUpdates.apiTokenEncrypted = encryptApiToken(dto.apiToken.trim());
    else if (dto.clearApiToken) allowedUpdates.apiTokenEncrypted = null;
    if (dto.color !== undefined) allowedUpdates.color = dto.color;
    if (dto.website !== undefined) allowedUpdates.website = dto.website;
    const updatedAt = new Date().toISOString();

    // Firestore PATCH upserts, so only send it for a project Firestore already
    // has; otherwise a local-only project would get a partial Firestore copy.
    const inFirestore = await getDoc('enterprise_projects', id).catch(() => null);
    const savedToFirestore = inFirestore
      ? await updateDoc('enterprise_projects', id, { ...allowedUpdates, updatedAt }).catch(err => {
          console.warn('[backend/modules/projects] Could not update project in Firestore:', err);
          return null;
        })
      : null;

    const existing = readLocalProjects();
    const index = existing.findIndex(project => (project.id || project._id) === id);
    if (!inFirestore && index === -1) {
      throw new Error('Project not found, or Firestore is unavailable and the project is not in the local data file.');
    }
    let savedLocally = false;
    if (index !== -1) {
      existing[index] = { ...existing[index], ...allowedUpdates, updatedAt };
      savedLocally = writeLocalProjects(existing);
    }
    if (!savedToFirestore && !savedLocally) {
      throw new Error('Could not save the project changes: the Firestore update failed and the local data file is not writable.');
    }
    invalidateProjectMetrics(id);
    return true;
  }

  static async deleteProject(id: string): Promise<boolean> {
    const deletedInFirestore = await deleteDoc('enterprise_projects', id).catch(err => {
      console.warn('[backend/modules/projects] Could not delete project in Firestore:', err);
      return false;
    });
    await deleteDoc(SNAPSHOT_COLLECTION, id).catch(() => false);
    const local = readLocalProjects();
    const remaining = local.filter(project => (project.id || project._id) !== id);
    const inLocalFile = remaining.length < local.length;
    // A project left in the local file reappears on the next load, so the
    // delete only counts if that write succeeds too.
    if (inLocalFile && !writeLocalProjects(remaining)) {
      throw new Error('Could not delete the project: the local data file is not writable.');
    }
    if (!deletedInFirestore && !inLocalFile) {
      throw new Error('Could not delete the project: Firestore is unavailable and the project is not in the local data file.');
    }
    invalidateProjectMetrics(id);
    return true;
  }
}

export const getProjectsOverview = ProjectsService.getProjectsOverview;
export const createProject = ProjectsService.createProject;
export const updateProject = ProjectsService.updateProject;
export const deleteProject = ProjectsService.deleteProject;
