import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

// Decode JWT from cookie without network — works offline
async function getSessionRole(request: NextRequest): Promise<string | null> {
  try {
    // getToken() reads & verifies the JWT cookie using NEXTAUTH_SECRET — no DB needed
    const token = await getToken({
      req: request,
      secret: process.env.NEXTAUTH_SECRET,
    });
    if (token?.role) return token.role as string;
  } catch {
    // If getToken throws, try reading the raw cookie name to at least know a session exists
    const hasCookie =
      request.cookies.has('next-auth.session-token') ||
      request.cookies.has('__Secure-next-auth.session-token');
    if (hasCookie) return 'unknown'; // can't determine role, but user is logged in
  }
  return null;
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: public auth pages, offline page, static files
  const publicPaths = ['/auth/login', '/auth/signup', '/auth/error', '/', '/offline'];
  const isPublicPath = publicPaths.some((path) => pathname === path);
  const isPublicApiPath =
    pathname.startsWith('/api/auth') || pathname.startsWith('/api/migrate');

  if (isPublicApiPath) return NextResponse.next();

  const role = await getSessionRole(request);

  // ── User IS logged in ────────────────────────────────────────────────
  if (role && role !== 'unknown') {
    // Redirect away from public pages (login, signup) to their dashboard
    if (isPublicPath) {
      if (role === 'farmer') return NextResponse.redirect(new URL('/farmer/dashboard', request.url));
      if (role === 'vendor') return NextResponse.redirect(new URL('/vendor/dashboard', request.url));
      if (role === 'admin')  return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Role-based access control
    if (pathname.startsWith('/farmer') && role !== 'farmer' && role !== 'admin')
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    if (pathname.startsWith('/vendor') && role !== 'vendor' && role !== 'admin')
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    if (pathname.startsWith('/admin') && role !== 'admin')
      return NextResponse.redirect(new URL('/unauthorized', request.url));

    return NextResponse.next();
  }

  // ── Role unknown (cookie exists but couldn't decode) — likely offline ──
  if (role === 'unknown') {
    // For public pages keep them accessible; for protected pages pass through
    // The client-side session will handle further auth checks
    return NextResponse.next();
  }

  // ── No session at all ─────────────────────────────────────────────────
  if (!isPublicPath) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  return NextResponse.next();
}


export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public files
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.png$|.*\\.jpg$|.*\\.svg$|manifest.json|sw.js|workbox-.*\\.js).*)',
  ],
};
