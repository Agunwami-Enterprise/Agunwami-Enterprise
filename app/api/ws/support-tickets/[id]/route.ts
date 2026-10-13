/**
 * /api/ws/support-tickets/[id]
 *
 * PATCH { status?, priority?, assigneeUid?, assigneeName? }: IT support only.
 * POST { body }: reply, from IT support or the person who raised the ticket.
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { SupportService } from '@/backend/modules/support';
import { departmentErrorResponse, readJson } from '@/app/api/ceo/departments/shared';
import { ticketPerson } from '../person';

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const { isSupport } = await ticketPerson(auth.session);
    if (!isSupport) return NextResponse.json({ error: 'Only IT support can change a ticket.' }, { status: 403 });
    const body = await readJson(request);
    const ticket = await SupportService.update(id, {
      status: body.status, priority: body.priority, assigneeUid: body.assigneeUid, assigneeName: body.assigneeName,
    });
    return NextResponse.json({ ticket });
  } catch (err) {
    return departmentErrorResponse(err, 'PATCH /api/ws/support-tickets/[id]');
  }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const { id } = await params;
    const body = await readJson(request);
    const { person, isSupport } = await ticketPerson(auth.session);
    const ticket = await SupportService.comment(id, body.body, person, isSupport);
    return NextResponse.json({ ticket });
  } catch (err) {
    return departmentErrorResponse(err, 'POST /api/ws/support-tickets/[id]');
  }
}
