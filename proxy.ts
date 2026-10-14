import { NextResponse, type NextRequest } from 'next/server';

/**
 * Tells the department workstation's layout which address was asked for
 * (layouts don't get it otherwise), so it can send the CEO to the same
 * thing in the CEO Workstation (e.g. a document) instead of a department's.
 */
export function proxy(request: NextRequest) {
  const headers = new Headers(request.headers);
  headers.set('x-ae-path', `${request.nextUrl.pathname}${request.nextUrl.search}`);
  return NextResponse.next({ request: { headers } });
}

export const config = {
  matcher: ['/ws/:path*'],
};
