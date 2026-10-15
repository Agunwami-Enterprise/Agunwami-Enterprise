/**
 * /api/ws/support-tickets
 *
 * GET: every ticket (IT support), or `?scope=mine` for the caller's own.
 * POST { subject, description, category, priority }: raise a ticket (anyone signed in).
 */

import { NextResponse } from 'next/server';
import { requireSession } from '@/lib/workstation/api-auth';
import { SupportService } from '@/backend/modules/support';
import { departmentErrorResponse, readJson } from '@/app/api/ceo/departments/shared';
import { ticketPerson } from './person';

export async function GET(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const mine = new URL(request.url).searchParams.get('scope') === 'mine';
    const { isSupport } = await ticketPerson(auth.session);
    if (!mine && !isSupport) return NextResponse.json({ error: 'Your department does not have IT Support.' }, { status: 403 });
    return NextResponse.json({ tickets: await SupportService.list(mine ? { requesterUid: auth.session.uid } : {}) });
  } catch (err) {
    return departmentErrorResponse(err, 'GET /api/ws/support-tickets');
  }
}

export async function POST(request: Request) {
  const auth = await requireSession();
  if (auth.error) return auth.error;
  try {
    const body = await readJson(request);
    const { person } = await ticketPerson(auth.session);
    const ticket = await SupportService.create({ subject: body.subject, description: body.description, category: body.category, priority: body.priority }, person);
    return NextResponse.json({ ticket }, { status: 201 });
  } catch (err) {
    return departmentErrorResponse(err, 'POST /api/ws/support-tickets');
  }
}
