import 'server-only';
import { DepartmentsService } from '@/backend/modules/departments';
import type { Person } from '@/backend/modules/support';
import { canOpenPage, getWorkstationAccess } from '@/lib/workstation/access';
import type { ApiSession } from '@/lib/workstation/api-auth';

/** The signed-in person as a ticket author, and whether they're IT support. */
export async function ticketPerson(session: ApiSession): Promise<{ person: Person; isSupport: boolean }> {
  const [access, member] = await Promise.all([getWorkstationAccess(session), DepartmentsService.getMember(session.uid)]);
  return {
    person: {
      uid: session.uid,
      name: member?.name || session.email,
      email: session.email,
      department: access.kind === 'ceo' ? 'CEO' : access.departmentName ?? '',
    },
    isSupport: canOpenPage(access, 'it-support'),
  };
}
