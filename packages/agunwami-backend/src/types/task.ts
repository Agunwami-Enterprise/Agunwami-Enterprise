// ─── Task Types ───────────────────────────────────────────────────────────────
// Staff task management types — shared between both apps.
// Source: aehub-onboarding/models/task.ts

export type TaskStatus   = 'In Progress' | 'Pending' | 'Completed' | 'Overdue';
export type TaskPriority = 'High' | 'Medium' | 'Low';
export type Priority     = 'Low' | 'Medium' | 'High' | 'Critical';
export type TaskStage    =
  | 'Created'
  | 'Assigned'
  | 'In Progress'
  | 'Submitted'
  | 'Approved'
  | 'Completed';

export type SprintStatus = 'Draft' | 'Pending Approval' | 'Unassigned' | 'Pending' | 'In Review' | 'Completed';


/** Simple task shape used by dashboards */
export interface Task {
  id:       string;
  title:    string;
  assignee: string;
  dueDate:  string;
  status:   TaskStatus;
  priority: TaskPriority;
}

/** Onboarding platform task (XP/gamification) */
export interface OnboardingTask {
  id:          string;
  title:       string;
  description: string;
  icon:        string;
  xpReward:    number;
  category:    string;
  link:        string;
  requirement: string;
}

export interface CompletedTask {
  id:         string;
  taskId:     string;
  completedAt: any; // Firestore Timestamp
  userName?:  string;
  userEmail?: string;
}

/** Full staff task with assignees, sprint support, sub-tasks */
export interface TaskData {
  id:          string;
  task:        string;
  assignee:    string;
  dueDate:     string;
  status:      TaskStatus;
  priority:    TaskPriority;
  title?:      string;
  tab?:        string;
  taskMode?:   'shared' | 'individual';
  assignees?:  Array<{ id: string; name: string; email?: string | null }>;
  createdById?:   string | null;
  createdByName?: string;
}

export interface SubTaskItem {
  id:       string;
  title:    string;
  date:     string;
  priority: Priority;
  stage:    TaskStage;
}

export interface TaskItem {
  id:           string;
  title:        string;
  assignee:     string;
  assigneeUid?: string;
  description?: string;
  startDate?:   string;
  dueDate:      string;
  stage:        TaskStage;
  priority:     Priority;
  tags:         string[];
  department:   string;
  createdBy?:   string;
  createdByName?: string;
  createdAt?:   any;
  isSprint?:    boolean;
  subTasks?:    SubTaskItem[];
}
