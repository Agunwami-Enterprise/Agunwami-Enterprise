/**
 * backend/modules/projects/projects.service.ts
 *
 * Enterprise Projects & Ventures Management Service.
 * Robust, dynamic, and fully generic:
 * - Manages user-configured project cards persisted locally and in Firestore.
 * - ZERO predefined, static, or hardcoded projects.
 * - Fetches real-time metrics strictly from user-specified API endpoints.
 */

import fs from 'fs';
import path from 'path';
import { listDocs, createDoc, updateDoc, deleteDoc } from '../../core/firestore';
import type {
  ProjectCardData,
  ProjectCardMetric,
  ProjectApprovalItem,
  ProjectDepartment,
  ProjectStaffMember,
  ProjectTasksSummary,
  ProjectAnalyticsData,
  CreateProjectDto,
  UpdateProjectDto,
} from './projects.types';

function getLocalProjectsFilePath(): string {
  return path.join(process.cwd(), 'data', 'enterprise_projects.json');
}

function readLocalProjects(): any[] {
  try {
    const filePath = getLocalProjectsFilePath();
    if (!fs.existsSync(filePath)) {
      return [];
    }
    const raw = fs.readFileSync(filePath, 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeLocalProjects(projects: any[]): void {
  try {
    const filePath = getLocalProjectsFilePath();
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(filePath, JSON.stringify(projects, null, 2), 'utf-8');
  } catch (err) {
    console.error('[ProjectsService] writeLocalProjects error:', err);
  }
}

function resolveEndpointUrl(url: string): string {
  let trimmed = url.trim();
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }
  // If it starts with a slash, it is a local relative endpoint
  if (trimmed.startsWith('/')) {
    const port = process.env.PORT || 3000;
    const base = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${port}`);
    return `${base.replace(/\/$/, '')}/${trimmed.replace(/^\//, '')}`;
  }
  // If it starts with localhost, default to http://
  if (trimmed.startsWith('localhost')) {
    return `http://${trimmed}`;
  }
  // If it contains a dot (domain name e.g. aehub-eafa6.web.app/...), default to https://
  if (trimmed.includes('.')) {
    return `https://${trimmed}`;
  }
  const port = process.env.PORT || 3000;
  const base = process.env.NEXTAUTH_URL || (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : `http://localhost:${port}`);
  return `${base.replace(/\/$/, '')}/${trimmed}`;
}

async function fetchEndpointData(url: string, timeoutMs = 4000): Promise<any | null> {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    const resolvedUrl = resolveEndpointUrl(url);
    const endpointUrl = new URL(resolvedUrl);
    const isAeHubMetricsEndpoint =
      endpointUrl.hostname === 'aehub-eafa6.web.app' &&
      endpointUrl.pathname.replace(/\/+$/, '') === '/api/enterprise/metrics';
    const integrationToken = process.env.AEHUB_ENTERPRISE_METRICS_TOKEN;

    const res = await fetch(resolvedUrl, {
      headers: {
        Accept: 'application/json',
        'User-Agent': 'AgunwamiEnterprise-Core/1.0',
        ...(isAeHubMetricsEndpoint && integrationToken
          ? { Authorization: `Bearer ${integrationToken}` }
          : {}),
      },
      signal: controller.signal,
      cache: 'no-store',
    });
    clearTimeout(timeoutId);

    if (!res.ok) {
      console.warn(`[ProjectsService] Endpoint ${resolvedUrl} returned status ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[ProjectsService] Endpoint fetch error for ${url}:`, err?.message || err);
    return null;
  }
}

function formatMetricLabel(str: string): string {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .trim()
    .replace(/^./, s => s.toUpperCase());
}

function formatMetricValue(val: any): string {
  if (val == null) return '—';
  if (typeof val === 'number') {
    return val.toLocaleString();
  }
  return String(val);
}

function parseEndpointResponse(data: any, projectName = 'Enterprise'): {
  metrics: ProjectCardMetric[];
  health: number | null;
  revenueTrend: { month: string; revenue: number }[];
  approvals: ProjectApprovalItem[];
  staff?: ProjectStaffMember[];
  departments?: ProjectDepartment[];
  tasks?: ProjectTasksSummary;
  analytics?: ProjectAnalyticsData;
} {
  if (!data || typeof data !== 'object') {
    return { metrics: [], health: null, revenueTrend: [], approvals: [] };
  }

  let metrics: ProjectCardMetric[] = [];
  let health: number | null = null;
  let revenueTrend: { month: string; revenue: number }[] = [];
  let approvals: ProjectApprovalItem[] = [];

  // 1. Parse Metrics
  if (Array.isArray(data.metrics)) {
    metrics = data.metrics
      .map((m: any) => ({
        label: String(m.label || m.name || m.title || 'Metric'),
        value: m.value != null ? String(m.value) : '—',
      }))
      .filter((m: any) => m.label && m.value !== '—');
  } else if (typeof data.metrics === 'object' && data.metrics !== null) {
    metrics = Object.entries(data.metrics).map(([k, v]) => ({
      label: formatMetricLabel(k),
      value: formatMetricValue(v),
    }));
  } else {
    // If payload itself is a flat stats dictionary
    const candidateKeys = Object.entries(data).filter(
      ([k]) => !['health', 'healthScore', 'systemHealth', 'score', 'revenueTrend', 'monthlyRevenue', 'trend', 'status', 'id', 'name', 'subtitle', 'approvals', 'pendingApprovals', 'staff'].includes(k)
    );
    if (candidateKeys.length > 0) {
      metrics = candidateKeys.slice(0, 4).map(([k, v]) => ({
        label: formatMetricLabel(k),
        value: formatMetricValue(v),
      }));
    }
  }

  // 2. Parse Health
  const h = data.health ?? data.healthScore ?? data.systemHealth ?? data.score;
  if (typeof h === 'number' && !isNaN(h)) {
    health = Math.max(0, Math.min(100, Math.round(h)));
  }

  // 3. Parse Revenue Trend
  const rawRev = data.revenueTrend || data.monthlyRevenue || data.revenueSeries || data.trend || data.series;
  if (Array.isArray(rawRev)) {
    revenueTrend = rawRev
      .map((r: any) => ({
        month: String(r.month || r.label || r.name || ''),
        revenue: Number(r.revenue ?? r.amount ?? r.value ?? 0),
      }))
      .filter(r => r.month.length > 0);
  }

  // 4. Parse Pending Approvals (Leave Requests, Staff Requests, Stipend/Salary Disbursements)
  const rawApprovals = data.approvals || data.pendingApprovals;
  if (Array.isArray(rawApprovals)) {
    for (const a of rawApprovals) {
      if (!a || typeof a !== 'object') continue;
      const rawType = String(a.type || '').toLowerCase();
      const type: 'leave' | 'payment' | 'task' | 'staff' =
        rawType === 'leave' ? 'leave' :
        rawType === 'staff' ? 'staff' :
        rawType === 'payment' ? 'payment' : 'task';

      let sourceCollection = String(a.sourceCollection || '');
      if (!sourceCollection) {
        if (type === 'leave') sourceCollection = 'leaveRequests';
        else if (type === 'staff') sourceCollection = 'staffRequests';
        else if (type === 'payment') sourceCollection = 'salary_disbursements';
        else sourceCollection = 'tasks';
      }

      const createdAt = typeof a.createdAt === 'string'
        ? a.createdAt
        : a.createdAt?._seconds
        ? new Date(a.createdAt._seconds * 1000).toISOString()
        : (a.date || a.timestamp || null);

      approvals.push({
        id: String(a.id || a._id || `${projectName}-${Math.random().toString(36).slice(2, 8)}`),
        title: String(a.title || (type === 'leave' ? 'Leave Request' : type === 'staff' ? 'Staff Request' : 'Approval Request')),
        project: String(a.project || projectName),
        urgent: Boolean(a.urgent || a.priority === 'High' || a.urgency === 'urgent'),
        subtitle: String(a.subtitle || a.name || a.employee || a.applicant || 'Pending review'),
        details: String(a.details || a.reason || a.justification || a.notes || 'Awaiting executive review.'),
        type,
        sourceCollection,
        createdAt,
        status: a.status ? String(a.status).toLowerCase() : 'pending',
      });
    }
  }

  const parseStaff = (members: unknown): ProjectStaffMember[] | undefined => {
    if (!Array.isArray(members)) return undefined;
    return members.flatMap((member: unknown) => {
      if (!member || typeof member !== 'object' || Array.isArray(member)) return [];
      const record = member as Record<string, unknown>;
      const name = String(record.name || record.displayName || '').trim();
      const id = String(record.id || record.uid || record._id || name).trim();
      if (!id || !name) return [];
      return [{
        id,
        name,
        ...(record.department ? { department: String(record.department) } : {}),
        ...(record.role ? { role: String(record.role) } : {}),
        ...(record.status ? { status: String(record.status) } : {}),
      }];
    });
  };
  // 5. Parse Departments from Project Endpoint
  let departments: ProjectDepartment[] | undefined = undefined;
  if (Array.isArray(data.departments)) {
    departments = data.departments.map((d: any) => ({
      id: String(d.id || d.name || '').toLowerCase().replace(/\s+/g, '-'),
      name: String(d.name || d.label || d.title || 'Department'),
      headcount: Number(d.headcount || d.count || 0),
      staff: parseStaff(d.staff),
      tasksTotal: d.tasksTotal != null ? Number(d.tasksTotal) : undefined,
      tasksCompleted: d.tasksCompleted != null ? Number(d.tasksCompleted) : undefined,
      tasksPending: d.tasksPending != null ? Number(d.tasksPending) : undefined,
      hoursLogged: d.hoursLogged != null ? Number(d.hoursLogged) : undefined,
      attendanceRate: d.attendanceRate != null ? Number(d.attendanceRate) : undefined,
      productivity: d.productivity != null ? Number(d.productivity) : undefined,
      efficiency: d.efficiency != null ? Number(d.efficiency) : undefined,
      engagement: d.engagement != null ? Number(d.engagement) : undefined,
    }));
  }
  const staff = parseStaff(data.staff) ?? departments?.flatMap((department) => department.staff || []);

  // 6. Parse Tasks Summary & Items from Project Endpoint
  let tasks: ProjectTasksSummary | undefined = undefined;
  if (data.tasks && typeof data.tasks === 'object') {
    tasks = {
      total: Number(data.tasks.total || 0),
      completed: Number(data.tasks.completed || 0),
      inProgress: Number(data.tasks.inProgress || 0),
      inReview: data.tasks.inReview != null ? Number(data.tasks.inReview) : undefined,
      pending: data.tasks.pending != null ? Number(data.tasks.pending) : undefined,
      completionRate: data.tasks.completionRate != null ? Number(data.tasks.completionRate) : undefined,
      byStatus: Array.isArray(data.tasks.byStatus) ? data.tasks.byStatus : undefined,
      byPriority: Array.isArray(data.tasks.byPriority) ? data.tasks.byPriority : undefined,
      items: Array.isArray(data.tasks.items) ? data.tasks.items : undefined,
    };
  }

  // 7. Parse Advanced Analytics Payload from Project Endpoint
  let analytics: ProjectAnalyticsData | undefined = undefined;
  if (data.analytics && typeof data.analytics === 'object') {
    analytics = data.analytics;
  }

  return { metrics, health, revenueTrend, approvals, staff, departments, tasks, analytics };
}

export class ProjectsService {
  /**
   * Fetches all user-configured enterprise projects with live metrics from their API endpoints.
   * Completely dynamic: No predefined or static projects.
   */
  static async getProjectsOverview(): Promise<ProjectCardData[]> {
    const localProjects = readLocalProjects();
    const firestoreProjects = await listDocs('enterprise_projects', 50).catch(() => []);

    // Merge: local projects take precedence, plus any unique from Firestore
    const mergedMap = new Map<string, any>();
    for (const p of firestoreProjects) {
      const id = p._id || p.id;
      if (id) mergedMap.set(id, p);
    }
    for (const p of localProjects) {
      const id = p._id || p.id;
      if (id) mergedMap.set(id, p);
    }

    const projectDocs = Array.from(mergedMap.values());

    // Strict: If no projects configured by user, return empty list
    if (projectDocs.length === 0) {
      return [];
    }

    const results: ProjectCardData[] = [];

    for (const p of projectDocs) {
      const id = p._id || p.id;
      const name = p.name || 'Untitled Project';
      const subtitle = p.subtitle || 'Venture';
      const adminUrl = p.adminUrl || null;
      const apiEndpoint = p.apiEndpoint || null;
      const feedEndpoint = p.feedEndpoint || null;
      const revenueEndpoint = p.revenueEndpoint || null;
      const healthEndpoint = p.healthEndpoint || null;
      const color = p.color || '#3b82f6';

      if (apiEndpoint || healthEndpoint || revenueEndpoint) {
        let isOnline = false;
        let metrics: ProjectCardMetric[] = [];
        let health: number | null = null;
        let revenueTrend: { month: string; revenue: number }[] = [];
        let approvals: ProjectApprovalItem[] = [];
        let staff: ProjectStaffMember[] | undefined = undefined;
        let departments: ProjectDepartment[] | undefined = undefined;
        let tasks: ProjectTasksSummary | undefined = undefined;
        let analytics: ProjectAnalyticsData | undefined = undefined;

        // Fetch Main Unified Endpoint
        if (apiEndpoint) {
          const mainData = await fetchEndpointData(apiEndpoint);
          if (mainData) {
            isOnline = true;
            const parsed = parseEndpointResponse(mainData, name);
            metrics = parsed.metrics;
            health = parsed.health;
            revenueTrend = parsed.revenueTrend;
            approvals = parsed.approvals;
            staff = parsed.staff;
            departments = parsed.departments;
            tasks = parsed.tasks;
            analytics = parsed.analytics;
          }
        }

        // Optional Health Endpoint Override
        if (healthEndpoint) {
          const hData = await fetchEndpointData(healthEndpoint, 3500);
          if (hData) {
            isOnline = true;
            const score = typeof hData === 'number' ? hData : (hData.health ?? hData.score ?? hData.value);
            if (typeof score === 'number' && !isNaN(score)) {
              health = Math.max(0, Math.min(100, Math.round(score)));
            }
          }
        }

        // Optional Revenue Trend Endpoint Override
        if (revenueEndpoint) {
          const rData = await fetchEndpointData(revenueEndpoint, 3500);
          if (rData) {
            isOnline = true;
            const parsed = parseEndpointResponse(rData, name);
            if (parsed.revenueTrend.length > 0) {
              revenueTrend = parsed.revenueTrend;
            }
          }
        }

        results.push({
          id,
          name,
          subtitle,
          description: p.description,
          lead: p.lead,
          adminUrl,
          apiEndpoint,
          feedEndpoint,
          revenueEndpoint,
          healthEndpoint,
          color,
          metrics: metrics.length > 0 ? metrics : (isOnline ? [] : [{ label: 'Endpoint', value: 'Unreachable' }]),
          health,
          revenueTrend,
          approvals: approvals.length > 0 ? approvals : undefined,
          staff,
          departments,
          tasks,
          analytics,
          status: isOnline ? 'online' : 'error',
          lastSyncedAt: isOnline ? new Date().toISOString() : undefined,
        });
        continue;
      }

      // Project without configured endpoint
      results.push({
        id,
        name,
        subtitle,
        description: p.description,
        lead: p.lead,
        adminUrl,
        apiEndpoint: null,
        feedEndpoint,
        revenueEndpoint: null,
        healthEndpoint: null,
        color,
        metrics: [],
        health: null,
        revenueTrend: [],
        status: 'pending',
      });
    }

    return results;
  }

  /**
   * Adds a new project configuration created by the user from the modal.
   * Completely resilient to unhosted or permission restrictions.
   */
  static async createProject(dto: CreateProjectDto): Promise<ProjectCardData | null> {
    const slug = dto.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || `proj-${Date.now()}`;

    const newProject = {
      _id: slug,
      id: slug,
      name: dto.name.trim(),
      subtitle: dto.subtitle.trim(),
      description: dto.description?.trim() || '',
      lead: dto.lead?.trim() || '',
      adminUrl: dto.adminUrl?.trim() || null,
      apiEndpoint: dto.apiEndpoint?.trim() || null,
      feedEndpoint: dto.feedEndpoint?.trim() || null,
      revenueEndpoint: dto.revenueEndpoint?.trim() || null,
      healthEndpoint: dto.healthEndpoint?.trim() || null,
      color: dto.color || '#3b82f6',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    // 1. Persist to local JSON immediately
    const existing = readLocalProjects();
    const updatedList = existing.filter(p => (p.id || p._id) !== slug);
    updatedList.push(newProject);
    writeLocalProjects(updatedList);

    // 2. Fire-and-forget sync to Firestore in background without blocking
    createDoc('enterprise_projects', newProject, slug).catch(err => {
      console.warn('[ProjectsService] Firestore createDoc async fallback:', err?.message || err);
    });

    // 3. If an endpoint is provided, attempt immediate fetch to populate metrics
    let metrics: ProjectCardMetric[] = [];
    let health: number | null = null;
    let revenueTrend: { month: string; revenue: number }[] = [];
    let status: 'online' | 'pending' | 'error' = 'pending';

    if (newProject.apiEndpoint) {
      const data = await fetchEndpointData(newProject.apiEndpoint);
      if (data) {
        status = 'online';
        const parsed = parseEndpointResponse(data);
        metrics = parsed.metrics;
        health = parsed.health;
        revenueTrend = parsed.revenueTrend;
      } else {
        status = 'error';
      }
    }

    return {
      id: slug,
      name: newProject.name,
      subtitle: newProject.subtitle,
      description: newProject.description,
      lead: newProject.lead,
      adminUrl: newProject.adminUrl,
      apiEndpoint: newProject.apiEndpoint,
      feedEndpoint: newProject.feedEndpoint,
      revenueEndpoint: newProject.revenueEndpoint,
      healthEndpoint: newProject.healthEndpoint,
      color: newProject.color,
      metrics,
      health,
      revenueTrend,
      status,
      lastSyncedAt: status === 'online' ? new Date().toISOString() : undefined,
    };
  }

  /**
   * Updates an existing project configuration.
   */
  static async updateProject(id: string, dto: UpdateProjectDto): Promise<boolean> {
    const existing = readLocalProjects();
    const idx = existing.findIndex(p => (p.id || p._id) === id);
    if (idx !== -1) {
      existing[idx] = {
        ...existing[idx],
        ...dto,
        updatedAt: new Date().toISOString(),
      };
      writeLocalProjects(existing);
    }
    updateDoc('enterprise_projects', id, {
      ...dto,
      updatedAt: new Date().toISOString(),
    }).catch(() => null);
    return true;
  }

  /**
   * Deletes a project configuration.
   */
  static async deleteProject(id: string): Promise<boolean> {
    const existing = readLocalProjects();
    const updated = existing.filter(p => (p.id || p._id) !== id);
    writeLocalProjects(updated);
    deleteDoc('enterprise_projects', id).catch(() => null);
    return true;
  }
}

export const getProjectsOverview = ProjectsService.getProjectsOverview;
export const createProject = ProjectsService.createProject;
export const updateProject = ProjectsService.updateProject;
export const deleteProject = ProjectsService.deleteProject;
