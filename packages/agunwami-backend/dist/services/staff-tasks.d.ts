import type { TaskItem } from "../types/task";
export declare function subscribeStaffTasks(cb: (tasks: TaskItem[]) => void, onError?: (err: any) => void): () => void;
export declare function createStaffTask(payload: Omit<TaskItem, "id">, currentUserId?: string, currentUserName?: string): Promise<import("@firebase/firestore").DocumentReference<Record<string, any>, import("@firebase/firestore").DocumentData>>;
export declare function updateStaffTask(taskId: string, updates: Partial<TaskItem>): Promise<void>;
export declare function deleteStaffTask(taskId: string): Promise<void>;
export declare function fetchStaffUserNames(departmentFilter?: string): Promise<string[]>;
