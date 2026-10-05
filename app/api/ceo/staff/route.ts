/**
 * GET /api/ceo/staff
 *
 * Returns real staff/workforce overview metrics and directory for the CEO dashboard.
 * Reads from real AEHub Firestore users collection (where role == 'staff')
 * and attendanceLogs via backend/modules/staff.
 */

import { NextResponse } from 'next/server';
import { requireCeoSession } from '@/lib/workstation/api-auth';
import { StaffService } from '@/backend/modules/staff';

export async function GET(request: Request) {
  const auth = await requireCeoSession();
  if (auth.error) return auth.error;

  try {
    const { searchParams } = new URL(request.url);
    const mode = searchParams.get('mode');

    if (mode === 'list') {
      const department = searchParams.get('department') || undefined;
      const search = searchParams.get('search') || undefined;
      const staffList = await StaffService.getStaffList({ department, search });
      return NextResponse.json(staffList);
    }

    const stats = await StaffService.getStaffStats();
    return NextResponse.json({
      totalStaff: stats.totalStaff,
      activeStaff: stats.activeToday,
      clockedIn: stats.activeToday,
      onLeave: stats.onLeave,
      departments: Object.entries(stats.byDepartment).map(([name, count]) => ({
        name,
        count,
      })),
    });
  } catch (err: any) {
    console.error('[/api/ceo/staff] error:', err);
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
