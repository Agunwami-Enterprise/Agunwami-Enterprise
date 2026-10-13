/**
 * /api/ws/team
 *
 * GET: the people in the caller's AE department (all AE department members
 * for the CEO), for the workstation's team cards.
 */

import { NextResponse } from 'next/server';
import { requireWorkstationPage } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { DepartmentsService, positionTitle } from '@/backend/modules/departments';

export interface TeamMemberSummary {
  uid: string;
  name: string;
  email: string;
  /** Position: "<Department> Staff" or "<Department> Admin". */
  title: string;
  departmentId: string;
  departmentName: string;
  isDepartmentAdmin: boolean;
  /** Work shift, "HH:mm" (empty if not set). */
  shiftStart: string;
  shiftEnd: string;
}

export async function GET() {
  const auth = await requireWorkstationPage('dashboard');
  if (auth.error) return auth.error;

  try {
    const access = await getWorkstationAccess(auth.session);
    const { departments, members } = await DepartmentsService.list();
    const names = new Map(departments.map(department => [department.id, department.name]));
    const team: TeamMemberSummary[] = members
      .filter(member => member.status === 'active' && (access.kind === 'ceo' || member.departmentId === access.departmentId))
      .map(member => {
        const departmentName = names.get(member.departmentId) ?? member.departmentId;
        return {
          uid: member.uid,
          name: member.name || member.email || 'Team member',
          email: member.email,
          title: positionTitle(departmentName, member.isDepartmentAdmin),
          departmentId: member.departmentId,
          departmentName,
          isDepartmentAdmin: member.isDepartmentAdmin,
          shiftStart: member.shiftStart,
          shiftEnd: member.shiftEnd,
        };
      })
      .sort((a, b) => Number(b.isDepartmentAdmin) - Number(a.isDepartmentAdmin) || a.name.localeCompare(b.name));
    return NextResponse.json({ team });
  } catch (err) {
    console.error('[/api/ws/team] error:', err);
    return NextResponse.json({ error: 'The team could not be loaded.' }, { status: 500 });
  }
}
