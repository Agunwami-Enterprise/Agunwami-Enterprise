import type { Task as LiveTask } from '@/modules/tasks/services';

export type TaskStatus = 'To Do' | 'In Progress' | 'In Review' | 'Completed' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskKind = 'task' | 'sprint' | 'todo';

export interface Task {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  department: string;
  project?: string;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: string;
  kind?: TaskKind;
}

export interface ProjectTaskResponse {
  id: string;
  title: string;
  description?: string;
  assignee?: string;
  department?: string;
  project?: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  kind?: TaskKind;
  projectId?: string;
}

export interface ProjectTasksResponse {
  tasks: ProjectTaskResponse[];
}

export function normalizeStatus(status?: string): TaskStatus {
  switch (status?.trim().toLowerCase().replace(/[_-]/g, ' ')) {
    case 'in progress':
      return 'In Progress';
    case 'in review':
    case 'submitted':
      return 'In Review';
    case 'completed':
    case 'approved':
    case 'done':
      return 'Completed';
    case 'overdue':
      return 'Overdue';
    default:
      return 'To Do';
  }
}

export function normalizePriority(priority?: string): TaskPriority {
  switch (priority?.trim().toLowerCase()) {
    case 'critical':
      return 'Critical';
    case 'high':
      return 'High';
    case 'medium':
      return 'Medium';
    default:
      return 'Low';
  }
}

export function toProjectTask(task: ProjectTaskResponse): Task {
  return {
    id: task.id,
    title: task.title || 'Untitled task',
    description: task.description,
    assignee: task.assignee || 'Unassigned',
    department: task.department || '',
    project: task.project,
    status: normalizeStatus(task.status),
    priority: normalizePriority(task.priority),
    dueDate: task.dueDate || '',
    kind: task.kind,
  };
}

export function toLiveTask(task: LiveTask): Task {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    assignee: task.assignee || 'Unassigned',
    department: task.department || '',
    project: task.project,
    status: normalizeStatus(task.status),
    priority: normalizePriority(task.priority),
    dueDate: task.dueDate,
    kind: task.kind || 'task',
  };
}

export function toPersonalTodo(todo: ProjectTaskResponse): Task {
  return {
    ...toProjectTask(todo),
    id: `todo:${todo.id}`,
    assignee: 'You',
    kind: 'todo',
  };
}
