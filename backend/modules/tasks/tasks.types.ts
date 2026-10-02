/**
 * backend/modules/tasks/tasks.types.ts
 *
 * Types for CEO Task Management.
 */

export type TaskStatus = 'Pending' | 'In Progress' | 'In Review' | 'Completed' | 'Overdue';
export type TaskPriority = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStage = 'Created' | 'Assigned' | 'In Progress' | 'Submitted' | 'Approved' | 'Completed';
export type TaskKind = 'task' | 'sprint' | 'todo';

export interface TaskAssignee {
  id: string;
  name: string;
  department: string;
}

export interface TaskProjectOption {
  id: string;
  name: string;
  departments: Array<{ id: string; name: string }>;
}

export interface PersonalTodo {
  id: string;
  title: string;
  description: string;
  priority: TaskPriority;
  dueDate: string;
  projectId: string;
  project: string;
  department: string;
  status: 'Pending' | 'Completed' | 'Overdue';
  createdAt: string;
}

export interface TaskItem {
  id: string;
  title: string;
  description?: string;
  assignee: string;
  assigneeUid?: string;
  assigneeEmail?: string;
  department: string;
  status: TaskStatus;
  priority: TaskPriority;
  stage: TaskStage;
  dueDate: string;
  startDate?: string;
  createdBy?: string;
  createdByName?: string;
  createdAt?: string;
  tags?: string[];
  project?: string;
  projectId?: string;
  kind?: TaskKind;
  isSprint?: boolean;
  subTasks?: Array<{
    id: string;
    title: string;
    date?: string;
    description?: string;
    stage: TaskStage;
    priority: TaskPriority;
  }>;
}

export interface TaskSummaryStats {
  total: number;
  pending: number;
  inProgress: number;
  completed: number;
  overdue: number;
  completionRate: number;
}

export interface TaskFilterOptions {
  status?: TaskStatus;
  priority?: TaskPriority;
  department?: string;
  assigneeUid?: string;
  search?: string;
  limit?: number;
}

export interface CreateTaskDto {
  title: string;
  description?: string;
  kind?: 'task' | 'sprint';
  projectId: string;
  projectName: string;
  department: string;
  assigneeUid?: string;
  assigneeName?: string;
  priority: TaskPriority;
  startDate?: string;
  dueDate?: string;
  tags?: string[];
  subTasks?: Array<{
    title: string;
    description?: string;
    date: string;
    priority: TaskPriority;
  }>;
}

export interface CreatePersonalTodoDto {
  title: string;
  description?: string;
  priority: TaskPriority;
  dueDate?: string;
  projectId: string;
  projectName: string;
  department: string;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  status?: TaskStatus;
  stage?: TaskStage;
  priority?: TaskPriority;
  dueDate?: string;
  assigneeUid?: string;
  assigneeName?: string;
}
