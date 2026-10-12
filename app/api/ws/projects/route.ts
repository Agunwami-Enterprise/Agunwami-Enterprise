/**
 * /api/ws/projects
 *
 * GET: the projects' names, sync status and task counts for department
 * workstations. Endpoints, tokens and admin links stay CEO-only.
 */

import { NextResponse } from 'next/server';
import { requireWorkstationPage } from '@/lib/workstation/api-auth';
import { ProjectsService } from '@/backend/modules/projects';

export interface ProjectSummary {
  id: string;
  name: string;
  color: string | null;
  status: 'online' | 'pending' | 'error';
  stale: boolean;
  health: number | null;
  tasks: { total: number; completed: number; inProgress: number } | null;
}

export async function GET() {
  const auth = await requireWorkstationPage('dashboard');
  if (auth.error) return auth.error;

  try {
    const projects = await ProjectsService.getProjectsOverview();
    const summaries: ProjectSummary[] = projects.map(project => ({
      id: project.id,
      name: project.name,
      color: project.color ?? null,
      status: project.status,
      stale: Boolean(project.stale),
      health: project.health,
      tasks: project.tasks
        ? { total: project.tasks.total, completed: project.tasks.completed, inProgress: project.tasks.inProgress }
        : null,
    }));
    return NextResponse.json({ projects: summaries });
  } catch (err) {
    console.error('[/api/ws/projects] error:', err);
    return NextResponse.json({ error: 'Projects could not be loaded.' }, { status: 500 });
  }
}
