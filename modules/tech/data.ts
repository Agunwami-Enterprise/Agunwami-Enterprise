'use client';

// ─── Technical workstation data ───────────────────────────────────────────────
// Live data for /tech, read from the workstation (AE Hub) project where the
// team signs in: AE Hub's staff tasks, the team's profiles and presence, and a
// project summary from /api/tech/projects.

import { useEffect, useState } from 'react';
import { collection, getDocs, limit, onSnapshot, orderBy, query, where } from 'firebase/firestore';
import { onValue, ref } from 'firebase/database';
import { authDb, rtdb } from '@/lib/workstation/firebase';
import { TECH_DEPARTMENTS } from '@/lib/workstation/content-access';
import type { TechProjectSummary } from '@/app/api/tech/projects/route';

export type { TechProjectSummary };

// ── Tasks ────────────────────────────────────────────────────────────────────

export type TechTaskStage = 'todo' | 'in-progress' | 'review' | 'done';

export interface TechTask {
  id: string;
  title: string;
  stage: TechTaskStage;
  due: Date | null;
  assigneeUids: string[];
  assigneeNames: string[];
  department: string;
  isSprint: boolean;
  priority: string;
  /** The first meaningful tag (often the product), for the coloured label. */
  tag: string | null;
}

/** "developers", "IT", "Dev Team"… → whether it's a Technical department. */
export function isTechDepartment(value: unknown): boolean {
  const slug = String(value ?? '').trim().toLowerCase().replace(/\s+/g, '-');
  if (!slug) return false;
  return TECH_DEPARTMENTS.includes(slug) || slug.startsWith('developer') || slug.startsWith('dev-') || slug.includes('tech');
}

function stageOf(raw: unknown): TechTaskStage {
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

function taskFromDoc(id: string, data: Record<string, unknown>): TechTask {
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
  };
}

export function isOverdue(task: TechTask, now = new Date()): boolean {
  if (task.stage === 'done' || !task.due) return false;
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return task.due < startOfToday;
}

/** The most recent staff tasks in AE Hub, live. */
export function useStaffTasks(): { tasks: TechTask[]; loading: boolean; error: string } {
  const [state, setState] = useState<{ tasks: TechTask[]; loading: boolean; error: string }>({ tasks: [], loading: true, error: '' });
  useEffect(() => onSnapshot(
    query(collection(authDb, 'staffTasks'), orderBy('createdAt', 'desc'), limit(500)),
    snap => setState({ tasks: snap.docs.map(d => taskFromDoc(d.id, d.data())), loading: false, error: '' }),
    err => {
      console.warn('[tech] staffTasks snapshot error:', err);
      setState({ tasks: [], loading: false, error: 'Tasks could not be loaded.' });
    },
  ), []);
  return state;
}

// ── Team ─────────────────────────────────────────────────────────────────────

export interface TeamMember {
  uid: string;
  name: string;
  department: string;
  online: boolean;
}

const DEPARTMENT_VARIANTS = TECH_DEPARTMENTS.flatMap(d => [d, d.toUpperCase(), d[0].toUpperCase() + d.slice(1)]);

/** Everyone in the Technical departments, with who's online now. */
export function useTechTeam(): { members: TeamMember[]; loading: boolean } {
  const [people, setPeople] = useState<Array<Omit<TeamMember, 'online'>> | null>(null);
  const [presence, setPresence] = useState<Record<string, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    getDocs(query(collection(authDb, 'users'), where('department', 'in', DEPARTMENT_VARIANTS)))
      .then(snap => {
        if (cancelled) return;
        setPeople(snap.docs
          .filter(d => {
            const status = String(d.data().status ?? d.data().accountStatus ?? '').toLowerCase();
            return !['inactive', 'fired', 'deleted'].includes(status) && d.data().isDeleted !== true;
          })
          .map(d => ({
            uid: d.id,
            name: String(d.data().displayName || d.data().email || 'Team member'),
            department: String(d.data().department ?? ''),
          })));
      })
      .catch(err => {
        console.warn('[tech] Team lookup failed:', err);
        if (!cancelled) setPeople([]);
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
    members: (people ?? []).map(person => ({ ...person, online: !!presence[person.uid] })),
    loading: people === null,
  };
}

// ── Projects ─────────────────────────────────────────────────────────────────

export function useTechProjects(): { projects: TechProjectSummary[]; loading: boolean; error: string } {
  const [state, setState] = useState<{ projects: TechProjectSummary[]; loading: boolean; error: string }>({ projects: [], loading: true, error: '' });
  useEffect(() => {
    let cancelled = false;
    fetch('/api/tech/projects', { cache: 'no-store' })
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
