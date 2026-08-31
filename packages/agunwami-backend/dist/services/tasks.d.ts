import type { Task, TaskStatus, TaskPriority } from '../types/task';
export type { Task, TaskStatus, TaskPriority };
/** Subscribe to staff tasks ordered by creation date (newest first). */
export declare function subscribeTasks(cb: (tasks: Task[]) => void): () => void;
export * from './staff-tasks';
