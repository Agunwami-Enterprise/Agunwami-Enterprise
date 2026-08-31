// ─── Staff Tasks Service ────────────────────────────────────────────────────────
// Source: agunwami-backend/src/services/staff-tasks.ts

import {
  collection,
  onSnapshot,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  orderBy,
  getDocs,
  serverTimestamp,
} from "firebase/firestore";
import { getDb } from "./firebase-instance";
import type { TaskItem, TaskStage, Priority } from "../types/task";

/** Helper: Fetch all identifiers (userId, userName, userEmail) for staff members currently on leave */
async function getOnLeaveIdentifiers(): Promise<Set<string>> {
  const onLeaveSet = new Set<string>();
  const db = getDb();

  // 1. Check approved leave requests in leaveRequests collection
  try {
    const leaveSnap = await getDocs(query(collection(db, "leaveRequests"), where("status", "==", "approved")));
    leaveSnap.docs.forEach((d) => {
      const data = d.data();
      if (data.userId) onLeaveSet.add(String(data.userId).toLowerCase());
      if (data.userName) onLeaveSet.add(String(data.userName).toLowerCase());
      if (data.userEmail) onLeaveSet.add(String(data.userEmail).toLowerCase());
    });
  } catch (e) {
    console.error("[agunwami-backend] Error checking approved leaveRequests:", e);
  }

  // 2. Check users collection status === "On Leave" or "leave"
  try {
    const usersSnap = await getDocs(collection(db, "users"));
    usersSnap.docs.forEach((d) => {
      const data = d.data();
      const s = (data.status || "").toLowerCase();
      if (s === "on leave" || s === "leave") {
        onLeaveSet.add(d.id.toLowerCase());
        const name = data.displayName || data.name || data.email?.split("@")[0];
        if (name) onLeaveSet.add(String(name).toLowerCase());
        if (data.email) onLeaveSet.add(String(data.email).toLowerCase());
      }
    });
  } catch (e) {
    console.error("[agunwami-backend] Error checking users status:", e);
  }

  return onLeaveSet;
}

export function subscribeStaffTasks(
  cb: (tasks: TaskItem[]) => void,
  onError?: (err: any) => void
): () => void {
  const q = query(collection(getDb(), "staffTasks"), orderBy("createdAt", "desc"));
  return onSnapshot(
    q,
    (snap) => {
      const items: TaskItem[] = snap.docs.map((d) => {
        const data = d.data();
        const startDate = data.startDate || "";
        const assignee = (data.assignee || "Unassigned") as string;
        let stage = (data.stage || (assignee !== "Unassigned" ? "Assigned" : "Created")) as TaskStage;

        // AUTOMATIC IN PROGRESS: Only if there is a start date and start date <= today
        if (stage === "Assigned" && startDate && assignee !== "Unassigned") {
          const startParsed = new Date(startDate);
          if (!isNaN(startParsed.getTime()) && startParsed <= new Date()) {
            stage = "In Progress";
          }
        }

        return {
          id: d.id,
          title: (data.title || "Untitled Task") as string,
          assignee,
          assigneeUid: data.assigneeUid,
          description: data.description,
          startDate,
          dueDate: (data.dueDate || "8/14/2026") as string,
          stage,
          priority: (data.priority || "Low") as Priority,
          tags: (data.tags as string[]) || ["general"],
          department: (data.department || "Content Team") as string,
          createdBy: data.createdBy,
          createdByName: data.createdByName,
          createdAt: data.createdAt,
          isSprint: data.isSprint,
          subTasks: data.subTasks,
        };
      });
      cb(items);
    },
    (err) => {
      console.warn("[agunwami-backend] staffTasks snapshot error:", err);
      if (onError) onError(err);
    }
  );
}

export async function createStaffTask(
  payload: Omit<TaskItem, "id">,
  currentUserId?: string,
  currentUserName?: string
) {
  const db = getDb();
  // Guard: Prevent assigning tasks to staff members currently on leave
  if (payload.assignee && payload.assignee !== "Unassigned") {
    const onLeaveSet = await getOnLeaveIdentifiers();
    const isAssigneeOnLeave =
      (payload.assigneeUid && onLeaveSet.has(payload.assigneeUid.toLowerCase())) ||
      onLeaveSet.has(payload.assignee.toLowerCase());

    if (isAssigneeOnLeave) {
      throw new Error(`Cannot assign task to ${payload.assignee} because they are currently on leave.`);
    }
  }

  const docData: Record<string, any> = {
    ...payload,
    createdBy: currentUserId || "anonymous",
    createdByName: currentUserName || "Staff Member",
    createdAt: serverTimestamp(),
  };

  // Remove undefined properties to prevent Firestore addDoc errors
  Object.keys(docData).forEach((key) => {
    if (docData[key] === undefined) {
      delete docData[key];
    }
  });

  return await addDoc(collection(db, "staffTasks"), docData);
}

export async function updateStaffTask(taskId: string, updates: Partial<TaskItem>) {
  const db = getDb();
  if (updates.assignee && updates.assignee !== "Unassigned") {
    const onLeaveSet = await getOnLeaveIdentifiers();
    const isAssigneeOnLeave =
      (updates.assigneeUid && onLeaveSet.has(updates.assigneeUid.toLowerCase())) ||
      onLeaveSet.has(updates.assignee.toLowerCase());

    if (isAssigneeOnLeave) {
      throw new Error(`Cannot assign task to ${updates.assignee} because they are currently on leave.`);
    }
  }

  const safeUpdates = { ...updates };
  Object.keys(safeUpdates).forEach((key) => {
    if (safeUpdates[key as keyof TaskItem] === undefined) {
      delete safeUpdates[key as keyof TaskItem];
    }
  });
  return await updateDoc(doc(db, "staffTasks", taskId), safeUpdates);
}

export async function deleteStaffTask(taskId: string) {
  return await deleteDoc(doc(getDb(), "staffTasks", taskId));
}

export async function fetchStaffUserNames(departmentFilter?: string): Promise<string[]> {
  try {
    const db = getDb();
    const [snap, onLeaveSet] = await Promise.all([
      getDocs(query(collection(db, "users"))),
      getOnLeaveIdentifiers(),
    ]);

    const names: string[] = [];

    const getBaseDept = (dept?: string | null) => {
      if (!dept) return "";
      const d = dept.toLowerCase();
      if (d.startsWith("content")) return "content";
      if (d.startsWith("operation")) return "operations";
      if (d.startsWith("dev")) return "developers";
      return d;
    };

    const filterBase = getBaseDept(departmentFilter);
    const filterLower = departmentFilter?.toLowerCase() || "";
    const isFilterAdmin = filterLower.includes("admin");

    snap.docs.forEach((d) => {
      const data = d.data();
      const userId = d.id.toLowerCase();
      const name = data.displayName || data.name || data.email?.split("@")[0];
      const email = (data.email || "").toLowerCase();

      // Filter out staff members currently on leave (via leaveRequests or users status)
      if (
        onLeaveSet.has(userId) ||
        (name && onLeaveSet.has(name.toLowerCase())) ||
        (email && onLeaveSet.has(email))
      ) {
        return;
      }

      const userDeptLower = (data.department || "").toLowerCase();
      
      if (filterBase) {
        // If the assigner is an admin (e.g. content-admin), they should only see their staff (e.g. content-staff)
        if (isFilterAdmin) {
          const expectedStaff = filterLower.replace("-admin", "-staff").replace(" admin", " staff");
          if (userDeptLower !== expectedStaff && !userDeptLower.includes("staff")) {
             return; 
          }
          // Also ensure they are in the same base department
          if (getBaseDept(data.department) !== filterBase) return;
        } else {
          // Normal base department check
          if (getBaseDept(data.department) !== filterBase) return;
        }
      }

      if (name && !names.includes(name)) names.push(name);
    });
    return names;
  } catch (err) {
    console.error("[agunwami-backend] fetchStaffUserNames error:", err);
    return [];
  }
}
