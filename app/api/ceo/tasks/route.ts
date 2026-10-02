/**
 * /api/ceo/tasks
 *
 * GET: Lists tasks or task summary stats from real AEHub Firestore.
 * POST: Creates a new staff task.
 * PATCH: Updates task stage/status.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { TasksService } from '@/backend/modules/tasks';
import type { CreatePersonalTodoDto, CreateTaskDto, TaskPriority, TaskStatus } from '@/backend/modules/tasks/tasks.types';

const TASK_STATUSES: TaskStatus[] = ['Pending', 'In Progress', 'In Review', 'Completed', 'Overdue'];
const TASK_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High', 'Critical'];

function isTaskStatus(value: string): value is TaskStatus {
  return TASK_STATUSES.some(status => status === value);
}

function isTaskPriority(value: string): value is TaskPriority {
  return TASK_PRIORITIES.some(priority => priority === value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDateKey(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value;
}

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'assignees') {
      return NextResponse.json(await TasksService.getTaskAssignees());
    }
    if (mode === 'projects') {
      return NextResponse.json(await TasksService.getTaskProjects());
    }
    if (mode === 'departments') {
      return NextResponse.json(await TasksService.getTaskDepartments());
    }
    if (searchParams.get('source') === 'todos') {
      return NextResponse.json(await TasksService.getPersonalTodos(auth.session.uid));
    }
    if (searchParams.get('source') === 'projects') {
      return NextResponse.json(await TasksService.getProjectTaskData());
    }

    if (mode === 'summary') {
      const summary = await TasksService.getTasksSummary();
      return NextResponse.json(summary);
    }

    const statusParam = searchParams.get('status');
    const priorityParam = searchParams.get('priority');
    if (statusParam !== null && !isTaskStatus(statusParam)) {
      return NextResponse.json({ error: 'Invalid task status filter.' }, { status: 400 });
    }
    if (priorityParam !== null && !isTaskPriority(priorityParam)) {
      return NextResponse.json({ error: 'Invalid task priority filter.' }, { status: 400 });
    }
    const status = statusParam || undefined;
    const priority = priorityParam || undefined;
    const department = searchParams.get('department') || undefined;
    const search = searchParams.get('search') || undefined;

    const tasks = await TasksService.getTasks({ status, priority, department, search });
    return NextResponse.json(tasks);
  } catch (err: unknown) {
    console.error('[/api/ceo/tasks] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    let rawBody: unknown;
    try {
      rawBody = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON.' }, { status: 400 });
    }
    if (!isRecord(rawBody)) {
      return NextResponse.json({ error: 'A task payload is required.' }, { status: 400 });
    }

    const kind = rawBody.kind === undefined ? 'task' : rawBody.kind;
    if (kind !== 'task' && kind !== 'sprint' && kind !== 'todo') {
      return NextResponse.json({ error: 'Task kind must be task, sprint, or todo.' }, { status: 400 });
    }
    if (typeof rawBody.title !== 'string' || !rawBody.title.trim()) {
      return NextResponse.json({ error: 'A task title is required.' }, { status: 400 });
    }
    if (rawBody.title.trim().length > 160) {
      return NextResponse.json({ error: 'Task titles cannot exceed 160 characters.' }, { status: 400 });
    }
    if (rawBody.description !== undefined && typeof rawBody.description !== 'string') {
      return NextResponse.json({ error: 'Task descriptions must be text.' }, { status: 400 });
    }
    if (typeof rawBody.description === 'string' && rawBody.description.length > 5000) {
      return NextResponse.json({ error: 'Task descriptions cannot exceed 5,000 characters.' }, { status: 400 });
    }
    if (typeof rawBody.priority !== 'string' || !isTaskPriority(rawBody.priority)) {
      return NextResponse.json({ error: 'A valid task priority is required.' }, { status: 400 });
    }
    const projectId = typeof rawBody.projectId === 'string' ? rawBody.projectId.trim() : '';
    if (typeof rawBody.departmentId !== 'string' || !rawBody.departmentId.trim()) {
      return NextResponse.json({ error: 'Choose a department.' }, { status: 400 });
    }
    const projects = await TasksService.getTaskProjects();
    const selectedProject = projectId ? projects.find(project => project.id === projectId) : undefined;
    if (projectId && !selectedProject) {
      return NextResponse.json({ error: 'Choose a valid configured project.' }, { status: 400 });
    }
    if (kind === 'todo' && !selectedProject) {
      return NextResponse.json({ error: 'Personal to-dos must be associated with a project.' }, { status: 400 });
    }
    const selectedDepartment = selectedProject
      ? selectedProject.departments.find(department => department.id === rawBody.departmentId)
      : (await TasksService.getTaskDepartments()).find(department => department.id === rawBody.departmentId);
    if (!selectedDepartment) {
      return NextResponse.json({ error: 'Choose a valid department for the selected destination.' }, { status: 400 });
    }

    if (kind === 'todo') {
      if (rawBody.dueDate !== undefined && typeof rawBody.dueDate !== 'string') {
        return NextResponse.json({ error: 'To-do due dates must be valid dates.' }, { status: 400 });
      }
      if (typeof rawBody.dueDate === 'string' && rawBody.dueDate && !isDateKey(rawBody.dueDate)) {
        return NextResponse.json({ error: 'To-do due dates must use YYYY-MM-DD format.' }, { status: 400 });
      }
      const dto: CreatePersonalTodoDto = {
        title: rawBody.title,
        description: typeof rawBody.description === 'string' ? rawBody.description : '',
        priority: rawBody.priority,
        dueDate: typeof rawBody.dueDate === 'string' ? rawBody.dueDate : '',
        projectId: selectedProject!.id,
        projectName: selectedProject!.name,
        department: selectedDepartment.name,
      };
      const created = await TasksService.createPersonalTodo(dto, auth.session.uid);
      if (!created) {
        return NextResponse.json({ error: 'Failed to create personal to-do.' }, { status: 400 });
      }
      return NextResponse.json(created, { status: 201 });
    }

    const assigneeUid = typeof rawBody.assigneeUid === 'string' ? rawBody.assigneeUid.trim() : '';
    const assigneeName = typeof rawBody.assigneeName === 'string' ? rawBody.assigneeName.trim() : '';
    if (Boolean(assigneeUid) !== Boolean(assigneeName)) {
      return NextResponse.json({ error: 'Choose a valid assignee.' }, { status: 400 });
    }
    const projectAssignees = selectedProject?.assignees || [];
    const enterpriseAssignees = selectedProject ? [] : await TasksService.getTaskAssignees();
    const selectedAssignee = assigneeUid
      ? (selectedProject ? projectAssignees : enterpriseAssignees)
        .find(assignee => assignee.id === assigneeUid)
      : undefined;
    if (assigneeUid && (!selectedAssignee || selectedAssignee.name !== assigneeName)) {
      return NextResponse.json({ error: 'The selected assignee is no longer available.' }, { status: 400 });
    }
    if (
      selectedAssignee &&
      selectedAssignee.department &&
      selectedAssignee.department.toLowerCase() !== selectedDepartment.name.toLowerCase()
    ) {
      return NextResponse.json({ error: 'Choose an assignee from the selected department.' }, { status: 400 });
    }

    const dto: CreateTaskDto = {
      kind,
      title: rawBody.title.trim(),
      description: typeof rawBody.description === 'string' ? rawBody.description : '',
      projectId: selectedProject?.id,
      projectName: selectedProject?.name || 'Enterprise',
      department: selectedDepartment.name,
      assigneeUid: assigneeUid || undefined,
      assigneeName: assigneeName || undefined,
      priority: rawBody.priority,
      startDate: typeof rawBody.startDate === 'string' ? rawBody.startDate : '',
      dueDate: typeof rawBody.dueDate === 'string' ? rawBody.dueDate : '',
    };

    if (kind === 'sprint') {
      if (!dto.startDate || !isDateKey(dto.startDate) || !dto.dueDate || !isDateKey(dto.dueDate) || dto.startDate > dto.dueDate) {
        return NextResponse.json({ error: 'A sprint needs valid start and end dates.' }, { status: 400 });
      }
      if (!Array.isArray(rawBody.subTasks) || rawBody.subTasks.length === 0 || rawBody.subTasks.length > 50) {
        return NextResponse.json({ error: 'Add at least one task to the sprint.' }, { status: 400 });
      }
      const subTasks = rawBody.subTasks.flatMap(value => {
        if (!isRecord(value) || typeof value.title !== 'string' || !value.title.trim()) return [];
        if (typeof value.priority !== 'string' || !isTaskPriority(value.priority)) return [];
        const date = typeof value.date === 'string' && value.date ? value.date : dto.dueDate!;
        if (!isDateKey(date) || date < dto.startDate! || date > dto.dueDate!) return [];
        return [{
          title: value.title.trim(),
          description: typeof value.description === 'string' ? value.description : '',
          date,
          priority: value.priority,
        }];
      });
      if (subTasks.length !== rawBody.subTasks.length) {
        return NextResponse.json({ error: 'Each sprint task needs a title and valid priority.' }, { status: 400 });
      }
      dto.subTasks = subTasks;
    } else if (!dto.dueDate) {
      return NextResponse.json({ error: 'A due date is required for a task.' }, { status: 400 });
    } else if (!isDateKey(dto.dueDate)) {
      return NextResponse.json({ error: 'A task due date must use YYYY-MM-DD format.' }, { status: 400 });
    } else if (dto.startDate && (!isDateKey(dto.startDate) || dto.startDate > dto.dueDate)) {
      return NextResponse.json({ error: 'A task start date must be valid and no later than its due date.' }, { status: 400 });
    }

    const created = await TasksService.createTask(dto, auth.session.uid, auth.session.email);
    if (!created) {
      return NextResponse.json({ error: 'Failed to create task' }, { status: 400 });
    }
    return NextResponse.json(created, { status: 201 });
  } catch (err: unknown) {
    console.error('[/api/ceo/tasks POST] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const body = await request.json();
    const { id, ...updates } = body;
    if (!id) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
    }
    const success = await TasksService.updateTask(id, updates);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    console.error('[/api/ceo/tasks PATCH] error:', err);
    return NextResponse.json({ error: err instanceof Error ? err.message : 'Internal error' }, { status: 500 });
  }
}
