/**
 * /api/ceo/ceo-access
 *
 * GET: the approved-CEO list, the waiting list and past decisions.
 * POST { action, uid, name?, email?, stayOn? }: change CEO access. Only the
 * official CEO can (see ceos.service.ts).
 *   approve:    give CEO access (approve someone waiting, or promote anyone)
 *   decline:    leave someone waiting out, or take CEO access away
 *   reconsider: forget a decision, putting a project's CEO back on the waiting list
 *   handover:   make someone the official CEO; stayOn: false steps you down
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { invalidateAccess } from '@/lib/workstation/access';
import { CeoApprovals } from '@/backend/modules/departments';
import { departmentErrorResponse, readJson } from '../departments/shared';

export async function GET() {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const records = await CeoApprovals.list();
    const me = records.find(r => r.uid === auth.session.uid);
    return NextResponse.json({
      records,
      me: { uid: auth.session.uid, official: me?.official === true },
      // Until someone is approved, every project CEO keeps CEO access.
      approvalsOn: records.some(r => r.status === 'approved'),
    });
  } catch (err) {
    return departmentErrorResponse(err, 'GET /api/ceo/ceo-access');
  }
}

export async function POST(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;
  try {
    const body = await readJson(request);
    const person = {
      uid: String(body.uid ?? ''),
      name: typeof body.name === 'string' ? body.name : undefined,
      email: typeof body.email === 'string' ? body.email : undefined,
    };
    const actor = { uid: auth.session.uid, email: auth.session.email };
    switch (body.action) {
      case 'approve': await CeoApprovals.approve(person, actor); break;
      case 'decline': await CeoApprovals.decline(person, actor); break;
      case 'reconsider': await CeoApprovals.reconsider(person.uid, actor); break;
      case 'handover': await CeoApprovals.handOver(person, actor, body.stayOn !== false); break;
      default: return NextResponse.json({ error: 'Unknown action.' }, { status: 400 });
    }
    invalidateAccess();
    return NextResponse.json({ success: true });
  } catch (err) {
    return departmentErrorResponse(err, 'POST /api/ceo/ceo-access');
  }
}
