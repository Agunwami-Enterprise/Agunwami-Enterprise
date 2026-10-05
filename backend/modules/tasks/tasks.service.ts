/**
 * backend/modules/tasks/tasks.service.ts
 *
 * Server-side Task Management Service.
 * Fetches real tasks from AEHub Firestore (staffTasks and tasks collections),
 * enriched with user details from the users collection.
 */

import { randomUUID } from 'node:crypto';
import { listDocs, getDoc, createDoc, updateDoc, deleteDoc } from '../../core/firestore';
import { ProjectsService } from '../projects/projects.service';
import { getTodayDateKey } from '../../core/utils';
import type {
  TaskItem,
  TaskSummaryStats,
  TaskFilterOptions,
  CreateTaskDto,
  UpdateTaskDto,
  TaskStatus,
  TaskPriority,
  TaskStage,
  TaskAssignee,
  TaskProjectOption,
  TaskDepartmentOption,
  PersonalTodo,
  CreatePersonalTodoDto,
} from './tasks.types';

export class TasksService {
  static async getTaskProjects(): Promise<TaskProjectOption[]> {
    return (await this.getProjectTaskData()).projects;
  }

  static async getTaskDepartments(): Promise<TaskDepartmentOption[]> {
    const [departments, users] = await Promise.all([
      listDocs('departments', 250),
      listDocs('users', 250),
    ]);
    const byName = new Map<string, TaskDepartmentOption>();
    for (const item of departments) {
      const name = String(item.name || item.label || item.title || '').trim();
      const id = String(item._id || '').trim();
      if (name && id) byName.set(name.toLowerCase(), { id, name });
    }
    for (const user of users) {
      if (String(user.role || '').toLowerCase() !== 'staff' && user.isStaff !== true) continue;
      const name = String(user.department || user.dept || '').trim();
      if (!name || byName.has(name.toLowerCase())) continue;
      byName.set(name.toLowerCase(), {
        id: name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, ''),
        name,
      });
    }
    return Array.from(byName.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  static async getTaskAssignees(): Promise<TaskAssignee[]> {
    const users = await listDocs('users', 250);
    return users.flatMap(user => {
      const department = String(user.department || user.dept || '').trim();
      const name = String(user.displayName || user.name || user.email || '').trim();
      const status = String(user.status || user.accountStatus || '').trim().toLowerCase();
      const isStaff = String(user.role || '').toLowerCase() === 'staff' || user.isStaff === true;
      const isActive = user.disabled !== true && user.isDisabled !== true &&
        user.isDeleted !== true && user.isFired !== true && user.isSuspended !== true &&
        !['inactive', 'fired', 'suspended', 'terminated', 'deleted', 'disabled'].includes(status);
      return user._id && name && department && isStaff && isActive
        ? [{ id: user._id, name, department }]
        : [];
    });
  }

  static async getPersonalTodos(ownerUid: string): Promise<PersonalTodo[]> {
    const todos = await listDocs('todos', 250);
    return todos
      .filter(todo => todo.ownerUid === ownerUid)
      .map(todo => ({
        id: todo._id,
        title: String(todo.title || ''),
        description: String(todo.description || ''),
        priority: (todo.priority as TaskPriority) || 'Medium',
        dueDate: String(todo.dueDate || ''),
        projectId: String(todo.projectId || ''),
        project: String(todo.project || ''),
        department: String(todo.department || ''),
        status: todo.status === 'Completed'
          ? 'Completed'
          : todo.dueDate && String(todo.dueDate) < getTodayDateKey()
            ? 'Overdue'
            : 'Pending',
        createdAt: String(todo.createdAt || ''),
      }));
  }

  static async createPersonalTodo(dto: CreatePersonalTodoDto, ownerUid: string): Promise<PersonalTodo | null> {
    const createdAt = new Date().toISOString();
    const created = await createDoc('todos', {
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      priority: dto.priority,
      dueDate: dto.dueDate || '',
      projectId: dto.projectId,
      project: dto.projectName,
      department: dto.department,
      status: dto.dueDate && dto.dueDate < getTodayDateKey() ? 'Overdue' : 'Pending',
      ownerUid,
      createdAt,
      updatedAt: createdAt,
    });

    if (!created) return null;
    return {
      id: created._id,
      title: dto.title.trim(),
      description: dto.description?.trim() || '',
      priority: dto.priority,
      dueDate: dto.dueDate || '',
      projectId: dto.projectId,
      project: dto.projectName,
      department: dto.department,
      status: dto.dueDate && dto.dueDate < getTodayDateKey() ? 'Overdue' : 'Pending',
      createdAt,
    };
  }

  /**
   * Returns tasks from each configured venture's live project endpoint.
   */
  static async getProjectTasks(): Promise<TaskItem[]> {
    return (await this.getProjectTaskData()).tasks;
  }

  static async getProjectTaskData(): Promise<{ projects: TaskProjectOption[]; tasks: TaskItem[] }> {
    const projects = await ProjectsService.getProjectsOverview();

    return {
      projects: projects.map(project => ({
        id: project.id,
        name: project.name,
        departments: (project.departments || []).map(department => ({
          id: department.id,
          name: department.name,
        })),
        assignees: (project.staff || []).map(staff => ({
          id: staff.id,
          name: staff.name,
          department: staff.department || '',
        })),
      })),
      tasks: projects.flatMap(project =>
        (project.tasks?.items || []).map(task => {
          const status = task.status === 'Todo' ? 'Pending' : task.status;
          return {
            id: `${project.id}:${task.id}`,
            title: task.task,
            assignee: task.assignee || 'Unassigned',
            department: task.department || '',
            status,
            priority: task.priority,
            stage: status === 'Completed' ? 'Completed' : status === 'In Review' ? 'Submitted' : 'Assigned',
            dueDate: task.dueDate || '',
            project: project.name,
            projectId: project.id,
          } satisfies TaskItem;
        }),
      ),
    };
  }

  /**
   * Aggregates live task summary metrics from analytics_snapshots and real task docs.
   */
  static async getTasksSummary(): Promise<TaskSummaryStats> {
    const today = getTodayDateKey();
    const [snapshot, staffTasks] = await Promise.all([
      getDoc('analytics_snapshots', today).catch(() => null),
      listDocs('staffTasks', 100).catch(() => []),
    ]);

    if (snapshot?.tasksByStatus) {
      const byStatus = snapshot.tasksByStatus as Record<string, number>;
      const pending = byStatus.Pending || 0;
      const completed = byStatus.Completed || 0;
      const inProgress = byStatus['In Progress'] || 0;
      const overdue = byStatus.Overdue || 0;
      const total = pending + completed + inProgress + overdue;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        total,
        pending,
        inProgress,
        completed,
        overdue,
        completionRate,
      };
    }

    // Derive strictly from real staffTasks docs
    let pending = 0;
    let inProgress = 0;
    let completed = 0;
    let overdue = 0;

    staffTasks.forEach(t => {
      const s = String(t.status || 'Pending').toLowerCase();
      if (s.includes('comp')) completed++;
      else if (s.includes('prog')) inProgress++;
      else if (s.includes('over')) overdue++;
      else pending++;
    });

    const total = staffTasks.length;
    const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

    return {
      total,
      pending,
      inProgress,
      completed,
      overdue,
      completionRate,
    };
  }

  /**
   * Fetches task items with optional status, priority, department, and assignee filters.
   */
  static async getTasks(options: TaskFilterOptions = {}): Promise<TaskItem[]> {
    const [staffTasksDocs, usersDocs] = await Promise.all([
      listDocs('staffTasks', options.limit || 50).catch(() => []),
      listDocs('users', 50).catch(() => []),
    ]);

    // Map user id -> display name and email
    const userMap = new Map<string, { name: string; email: string; dept: string }>();
    usersDocs.forEach(u => {
      userMap.set(u._id, {
        name: u.displayName || u.name || u.email || 'Staff Member',
        email: u.email || '',
        dept: u.dept || u.department || 'Operations',
      });
    });

    let items: TaskItem[] = staffTasksDocs.map(doc => {
      const assigneeUid = doc.assigneeUid || doc.assignedTo || '';
      const user = userMap.get(assigneeUid);
      const assigneeName = doc.assignee || doc.assignedToName || user?.name || 'Unassigned';

      return {
        id: doc._id,
        title: doc.title || doc.task || 'Untitled Task',
        description: doc.description || '',
        assignee: assigneeName,
        assigneeUid,
        assigneeEmail: user?.email,
        department: doc.department || user?.dept || 'Operations',
        status: (doc.status as TaskStatus) || 'Pending',
        priority: (doc.priority as TaskPriority) || 'Medium',
        stage: doc.stage || 'Assigned',
        dueDate: doc.dueDate || doc.dueAt || '',
        startDate: doc.startDate,
        createdBy: doc.createdBy || doc.createdById,
        createdByName: doc.createdByName,
        createdAt: doc._createTime,
        tags: doc.tags || [],
        projectId: doc.projectId,
        project: doc.project,
        kind: doc.taskKind === 'sprint' || doc.isSprint ? 'sprint' : 'task',
        isSprint: Boolean(doc.isSprint),
      };
    });

    // Apply in-memory filters if provided
    if (options.status) {
      items = items.filter(i => i.status.toLowerCase() === options.status!.toLowerCase());
    }
    if (options.priority) {
      items = items.filter(i => i.priority.toLowerCase() === options.priority!.toLowerCase());
    }
    if (options.department) {
      items = items.filter(i => i.department.toLowerCase() === options.department!.toLowerCase());
    }
    if (options.assigneeUid) {
      items = items.filter(i => i.assigneeUid === options.assigneeUid);
    }
    if (options.search) {
      const q = options.search.toLowerCase();
      items = items.filter(i =>
        i.title.toLowerCase().includes(q) ||
        i.assignee.toLowerCase().includes(q) ||
        i.department.toLowerCase().includes(q)
      );
    }

    return items;
  }

  /**
   * Get single task by ID.
   */
  static async getTaskById(id: string): Promise<TaskItem | null> {
    const doc = await getDoc('staffTasks', id);
    if (!doc) return null;

    return {
      id: doc._id,
      title: doc.title || doc.task || 'Untitled Task',
      description: doc.description || '',
      assignee: doc.assignee || 'Unassigned',
      assigneeUid: doc.assigneeUid || doc.assignedTo,
      department: doc.department || 'Operations',
      status: (doc.status as TaskStatus) || 'Pending',
      priority: (doc.priority as TaskPriority) || 'Medium',
      stage: doc.stage || 'Assigned',
      dueDate: doc.dueDate || '',
      startDate: doc.startDate,
      createdBy: doc.createdBy,
      createdByName: doc.createdByName,
      createdAt: doc._createTime,
      tags: doc.tags || [],
    };
  }

  /**
   * Create a new task.
   */
  static async createTask(dto: CreateTaskDto, createdBy = 'CEO', createdByName = createdBy): Promise<TaskItem | null> {
    const kind = dto.kind || 'task';
    const assigned = Boolean(dto.assigneeUid && dto.assigneeName);
    const stage: TaskStage = assigned ? 'Assigned' : 'Created';
    const createdAt = new Date().toISOString();
    const subTasks = (dto.subTasks || []).map(subTask => ({
      id: randomUUID(),
      title: subTask.title.trim(),
      description: subTask.description?.trim() || '',
      date: subTask.date,
      priority: subTask.priority,
      stage,
    }));
    if (dto.projectId) {
      const created = await ProjectsService.createProjectTask(dto.projectId, {
        kind,
        title: dto.title,
        description: dto.description || '',
        department: dto.department,
        assigneeUid: dto.assigneeUid,
        assigneeName: dto.assigneeName,
        priority: dto.priority,
        startDate: dto.startDate,
        dueDate: dto.dueDate || '',
        tags: dto.tags || [],
        subTasks: dto.subTasks || [],
        createdBy,
        createdByName,
        projectId: dto.projectId,
        projectName: dto.projectName || dto.projectId,
      });
      return {
        id: created.id,
        title: dto.title,
        description: dto.description || '',
        assignee: dto.assigneeName || 'Unassigned',
        assigneeUid: dto.assigneeUid,
        department: dto.department,
        status: 'Pending',
        priority: dto.priority,
        stage,
        startDate: dto.startDate,
        dueDate: dto.dueDate || '',
        createdBy,
        createdByName,
        createdAt,
        tags: dto.tags || [],
        projectId: dto.projectId,
        project: dto.projectName,
        kind,
        isSprint: kind === 'sprint',
        subTasks,
      };
    }

    const data = {
      title: dto.title,
      task: dto.title,
      description: dto.description || '',
      assignee: dto.assigneeName || 'Unassigned',
      assigneeUid: dto.assigneeUid || '',
      department: dto.department,
      priority: dto.priority,
      status: 'Pending',
      stage,
      startDate: dto.startDate || '',
      dueDate: dto.dueDate || '',
      tags: dto.tags || [],
      ...(dto.projectId ? { projectId: dto.projectId } : {}),
      project: dto.projectName || 'Enterprise',
      taskKind: kind,
      isSprint: kind === 'sprint',
      subTasks,
      createdBy,
      createdByName,
      createdAt,
    };

    const created = await createDoc('staffTasks', data);
    if (!created) return null;

    return {
      id: created._id,
      title: data.title,
      description: data.description,
      assignee: data.assignee,
      assigneeUid: data.assigneeUid,
      department: data.department,
      status: 'Pending',
      priority: dto.priority,
      stage,
      startDate: data.startDate,
      dueDate: data.dueDate,
      createdAt,
      tags: data.tags,
      projectId: data.projectId,
      project: data.project,
      kind,
      isSprint: kind === 'sprint',
      subTasks,
    };
  }

  /**
   * Update task status or fields.
   */
  static async updateTask(id: string, dto: UpdateTaskDto): Promise<boolean> {
    const updated = await updateDoc('staffTasks', id, {
      ...dto,
      updatedAt: new Date().toISOString(),
    });
    return !!updated;
  }

  /**
   * Delete task.
   */
  static async deleteTask(id: string): Promise<boolean> {
    return await deleteDoc('staffTasks', id);
  }
}
