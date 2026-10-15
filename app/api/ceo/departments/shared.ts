import 'server-only';
import { NextResponse } from 'next/server';
import { DepartmentError } from '@/backend/modules/departments';

/** Turns a departments error into a JSON response. */
export function departmentErrorResponse(err: unknown, where: string): NextResponse {
  if (err instanceof DepartmentError) return NextResponse.json({ error: err.message }, { status: err.status });
  console.error(`[${where}] error:`, err);
  return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
}

export async function readJson(request: Request): Promise<Record<string, unknown>> {
  const body = await request.json().catch(() => null);
  return body && typeof body === 'object' ? body as Record<string, unknown> : {};
}
