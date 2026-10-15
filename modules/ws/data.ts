'use client';

// ─── Department workstation data ──────────────────────────────────────────────
// Live data for /ws: staff tasks and presence from the workstation Firebase
// project where everyone signs in, the person's AE department team from
// /api/ws/team, and a project summary from /api/ws/projects.

import { useEffect, useState } from 'react';
import { addDoc, collection, doc, getDoc, limit, onSnapshot, orderBy, query, serverTimestamp, updateDoc } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { authDb, rtdb } from '@/lib/workstation/firebase';
import type { ProjectSummary } from '@/app/api/ws/projects/route';
import type { TeamMemberSummary } from '@/app/api/ws/team/route';

export type { ProjectSummary };

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TaskStage = 'todo' | 'in-progress' | 'review' | 'done';

export interface WsTask {
  id: string;
  title: string;
  stage: TaskStage;
  due: Date | null;
  assigneeUids: string[];
  assigneeNames: string[];
  department: string;
  isSprint: boolean;
  priority: string;
  /** The first meaningful tag (often the product), for the coloured label. */
  tag: string | null;
  /** AE Hub's own stage: Created, Assigned, In Progress, Submitted, Approved, On Hold, Completed. */
  rawStage: string;
  description: string;
  start: Date | null;
  createdByName: string;
  createdByUid: string;
  created: Date | null;
  /** Last change (a completed task's completion time, near enough). */
  updated: Date | null;
  /** Chat-created tasks use another shape and can't be moved here. */
  editable: boolean;
}

function stageOf(raw: unknown): TaskStage {
  const value = String(raw ?? '').trim().toLowerCase();
  if (/(complete|approved|done|closed)/.test(value)) return 'done';
  if (/(submit|review)/.test(value)) return 'review';
  if (/progress/.test(value)) return 'in-progress';
  return 'todo';
}

function dateOf(raw: unknown): Date | null {
  if (!raw) return null;
  if (typeof raw === 'object' && raw !== null && 'toDate' in raw && typeof (raw as { toDate: unknown }).toDate === 'function') {
    return (raw as { toDate: () => Date }).toDate();
  }
  if (typeof raw === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const [y, m, d] = raw.split('-').map(Number);
    return new Date(y, m - 1, d);
  }
  const parsed = new Date(String(raw));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

const GENERIC_TAGS = new Set(['general', 'task', 'tasks', '']);

function taskFromDoc(id: string, data: Record<string, unknown>): WsTask {
  const assignees = Array.isArray(data.assignees) ? data.assignees as Array<{ id?: string; uid?: string; name?: string }> : [];
  const uids = [data.assigneeUid, ...assignees.map(a => a.id ?? a.uid)].filter((v): v is string => typeof v === 'string' && v !== '');
  const names = [data.assignee, ...assignees.map(a => a.name)].filter((v): v is string => typeof v === 'string' && v !== '' && v !== 'Unassigned');
  const tags = Array.isArray(data.tags) ? (data.tags as unknown[]).map(String) : [];
  return {
    id,
    title: String(data.title || data.task || 'Untitled task'),
    stage: stageOf(data.stage ?? data.status),
    due: dateOf(data.dueDate),
    assigneeUids: [...new Set(uids)],
    assigneeNames: [...new Set(names)],
    department: String(data.department ?? ''),
    isSprint: data.isSprint === true,
    priority: String(data.priority || 'Medium'),
    tag: tags.find(tag => !GENERIC_TAGS.has(tag.trim().toLowerCase())) ?? null,
    rawStage: String(data.stage ?? data.status ?? 'Created'),
    description: String(data.description ?? ''),
    start: dateOf(data.startDate),
    createdByName: String(data.createdByName ?? ''),
    createdByUid: String(data.createdBy ?? data.createdById ?? ''),
    created: dateOf(data.createdAt),
    updated: dateOf(data.updatedAt ?? data.approvedAt ?? data.createdAt),
    editable: typeof data.stage === 'string',
  };
}

/** AE Hub's task stages, in order. */
export const AEHUB_STAGES = ['Created', 'Assigned', 'In Progress', 'Submitted', 'Approved', 'On Hold', 'Completed'] as const;

/** Moves a task to another AE Hub stage. */
export async function setTaskStage(taskId: string, stage: string, by: { uid: string; name: string; email: string }): Promise<void> {
  await updateDoc(doc(authDb, 'staffTasks', taskId), {
    stage,
    updatedAt: serverTimestamp(),
    lastEditedByUid: by.uid,
    lastEditedByName: by.name,
    lastEditedByEmail: by.email,
  });
}

const isoDay = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

/**
 * Creates a task in AE Hub's staffTasks, in the shape AE Hub's own task form
 * writes. Sprints (which AE Hub sends for approval) are created in AE Hub.
 */
export async function createTask(input: {
  title: string;
  description: string;
  assignee: { uid: string; name: string; email: string } | null;
  priority: 'Low' | 'Medium' | 'High' | 'Critical';
  dueDate: string;
}, by: { uid: string; name: string }): Promise<void> {
  // The task's department is the assignee's AE Hub department, as AE Hub does it.
  const assigneeDoc = input.assignee ? await getDoc(doc(authDb, 'users', input.assignee.uid)).catch(() => null) : null;
  const department = String(assigneeDoc?.data()?.department ?? '');
  await addDoc(collection(authDb, 'staffTasks'), {
    title: input.title.trim(),
    description: input.description.trim(),
    assignee: input.assignee?.name ?? 'Unassigned',
    assigneeUid: input.assignee?.uid ?? '',
    assigneeEmail: input.assignee?.email ?? '',
    stage: input.assignee ? 'Assigned' : 'Created',
    priority: input.priority,
    tags: [],
    department,
    startDate: isoDay(new Date()),
    dueDate: input.dueDate,
    isSprint: false,
    subTasks: [],
    createdBy: by.uid,
    createdByName: by.name,
    createdAt: serverTimestamp(),
  });
}

export function isOverdue(task: WsTask, now = new Date()): boolean {
  if (task.stage === 'done' || !task.due) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return task.due < startOfToday;
}

/** The most recent staff tasks in AE Hub, live. */
export function useStaffTasks(): { tasks: WsTask[]; loading: boolean; error: string } {
  const [state, setState] = useState<{ tasks: WsTask[]; loading: boolean; error: string }>({ tasks: [], loading: true, error: '' });
  useEffect(() => onSnapshot(
    query(collection(authDb, 'staffTasks'), orderBy('createdAt', 'desc'), limit(500)),
    snap => setState({ tasks: snap.docs.map(d => taskFromDoc(d.id, d.data())), loading: false, error: '' }),
    err => {
      console.warn('[ws] staffTasks snapshot error:', err);
      setState({ tasks: [], loading: false, error: 'Tasks could not be loaded.' });
    },
  ), []);
  return state;
}

// ── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember extends TeamMemberSummary {
  online: boolean;
}

/** The person's AE department team, with who's online now. */
export function useDepartmentTeam(): { members: TeamMember[]; loading: boolean; error: string } {
  const [team, setTeam] = useState<{ list: TeamMemberSummary[] | null; error: string }>({ list: null, error: '' });
  const [presence, setPresence] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    fetch('/api/ws/team', { cache: 'no-store' })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        if (!cancelled) setTeam({ list: body.team ?? [], error: '' });
      })
      .catch(err => {
        if (!cancelled) setTeam({ list: [], error: err instanceof Error ? err.message : 'The team could not be loaded.' });
      });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => onValue(
    ref(rtdb, 'presence'),
    snap => {
      const map: Record<string, boolean> = {};
      for (const [uid, data] of Object.entries((snap.val() ?? {}) as Record<string, { online?: boolean }>)) {
        map[uid] = data?.online === true;
      }
      setPresence(map);
    },
    () => setPresence({}),
  ), []);

  return {
    members: (team.list ?? []).map(member => ({ ...member, online: !!presence[member.uid] })),
    loading: team.list === null,
    error: team.error,
  };
}

// ── Projects ─────────────────────────────────────────────────────────────────

export function useProjects(): { projects: ProjectSummary[]; loading: boolean; error: string } {
  const [state, setState] = useState<{ projects: ProjectSummary[]; loading: boolean; error: string }>({ projects: [], loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/ws/projects', { cache: 'no-store' })
      .then(async res => {
        const body = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(body.error || `Request failed (${res.status})`);
        if (!cancelled) setState({ projects: body.projects ?? [], loading: false, error: '' });
      })
      .catch(err => {
        if (!cancelled) setState({ projects: [], loading: false, error: err instanceof Error ? err.message : 'Projects could not be loaded.' });
      });
    return () => { cancelled = true; };
  }, []);
  return state;
}
