/**
 * /api/ws/team
 *
 * GET: the people in the caller's AE department (all AE department members
 * for the CEO), for the workstation's team cards.
 */

import { NextResponse } from 'next/server';
import { requireWorkstationPage } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { DepartmentsService } from '@/backend/modules/departments';

export interface TeamMemberSummary {
  uid: string;
  name: string;
  title: string;
  departmentId: string;
}

export async function GET() {
  const auth = await requireWorkstationPage('dashboard');
  if (auth.error) return auth.error;

  try {
    const access = await getWorkstationAccess(auth.session);
    const { members } = await DepartmentsService.list();
    const team: TeamMemberSummary[] = members
      .filter(member => member.status === 'active' && (access.kind === 'ceo' || member.departmentId === access.departmentId))
      .map(member => ({ uid: member.uid, name: member.name || member.email || 'Team member', title: member.title, departmentId: member.departmentId }));
    return NextResponse.json({ team });
  } catch (err) {
    console.error('[/api/ws/team] error:', err);
    return NextResponse.json({ error: 'The team could not be loaded.' }, { status: 500 });
  }
}
