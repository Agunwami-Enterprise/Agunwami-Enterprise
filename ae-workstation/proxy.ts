import { type NextRequest, NextResponse } from 'next/server';

const SESSION_COOKIE = 'ae_session';

export function proxy(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);

  if (path.startsWith('/ceo') && !hasSession) {
    return NextResponse.redirect(new URL('/auth/login', req.nextUrl));
  }

  if ((path === '/auth/login' || path.startsWith('/auth/login/')) && hasSession) {
    return NextResponse.redirect(new URL('/ceo/dashboard', req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!api|_next/static|_next/image|favicon\\.ico|.*\\.svg$).*)'],
};
