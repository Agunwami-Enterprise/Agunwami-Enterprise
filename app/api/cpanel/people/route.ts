/**
 * GET /api/cpanel/people
 *
 * People to credit as an article's author: everyone in AE (AE department
 * members and approved CEOs) and the people the connected projects list, plus
 * who's signed in (the default author). For the CEO and the content team.
 */

import { NextResponse } from 'next/server';
import { requireContentSession } from '@/lib/workstation/api-auth';
import { getWorkstationAccess } from '@/lib/workstation/access';
import { CeoApprovals, DepartmentsService, positionTitle } from '@/backend/modules/departments';
import { listMetricsPeople } from '@/backend/modules/site-content';

export interface AuthorOption {
  name: string;
  role: string;
  /** "AE" or the project's name. */
  source: string;
  /** AE accounts only, for their profile photo. */
  uid?: string;
  email?: string;
}

export async function GET() {
  const auth = await requireContentSession();
  if (auth.error) return auth.error;
  try {
    const [{ departments, members }, ceos, metrics, access] = await Promise.all([
      DepartmentsService.list(),
      CeoApprovals.list().catch(() => []),
      listMetricsPeople().catch(() => ({ people: [] as Array<{ name: string; role: string; department: string; project: string }> })),
      getWorkstationAccess(auth.session),
    ]);
    const deptName = new Map(departments.map(d => [d.id, d.name]));
    const people: AuthorOption[] = [
      ...ceos.filter(c => c.status === 'approved' && c.name).map(c => ({ name: c.name, role: 'CEO', source: 'AE', uid: c.uid, email: c.email })),
      ...members.filter(m => m.name).map(m => ({
        name: m.name, role: positionTitle(deptName.get(m.departmentId) ?? 'Team', m.isDepartmentAdmin), source: 'AE', uid: m.uid, email: m.email,
      })),
      ...metrics.people.map(p => ({ name: p.name, role: p.role || p.department, source: p.project })),
    ];
    // One entry per person and source.
    const seen = new Set<string>();
    const unique = people.filter(p => {
      const key = `${p.source}|${p.name.toLowerCase()}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).sort((a, b) => a.name.localeCompare(b.name));

    const myMember = members.find(m => m.uid === auth.session.uid);
    const myCeo = ceos.find(c => c.uid === auth.session.uid && c.status === 'approved');
    const me: AuthorOption = {
      name: myMember?.name || myCeo?.name || '',
      role: access.kind === 'ceo' ? 'CEO' : myMember ? positionTitle(deptName.get(myMember.departmentId) ?? 'Team', myMember.isDepartmentAdmin) : '',
      source: 'AE',
      uid: auth.session.uid,
      email: auth.session.email,
    };
    return NextResponse.json({ me, people: unique });
  } catch (err) {
    console.error('[/api/cpanel/people] error:', err);
    return NextResponse.json({ error: 'People could not be loaded.' }, { status: 500 });
  }
}
