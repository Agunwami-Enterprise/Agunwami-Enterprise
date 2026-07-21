import { type NextRequest, NextResponse } from 'next/server';
import { createSession, deleteSession } from '@/lib/session';

export async function POST(req: NextRequest) {
  try {
    const { idToken } = await req.json();
    const { role } = await createSession(idToken);
    return NextResponse.json({ role });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('[/api/session]', message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE() {
  await deleteSession();
  return NextResponse.json({ status: 'ok' });
}
