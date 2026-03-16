import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getToken } from 'next-auth/jwt';

export async function middleware(request: NextRequest) {
  const token = await getToken({ req: request });
  const { pathname } = request.nextUrl;

  // Public paths that don't require authentication
  const publicPaths = ['/auth/login', '/auth/signup', '/auth/error', '/'];
  const isPublicPath = publicPaths.some((path) => pathname === path);

  // API paths that are public
  const publicApiPaths = ['/api/auth', '/api/migrate']; // Note: /api/migrate requires ?key=NEXTAUTH_SECRET for CLI access
  const isPublicApiPath = publicApiPaths.some((path) => pathname.startsWith(path));

  // If trying to access public path while logged in, redirect to dashboard
  if (isPublicPath && token) {
    const role = token.role as string;
    if (role === 'farmer') {
      return NextResponse.redirect(new URL('/farmer/dashboard', request.url));
    } else if (role === 'vendor') {
      return NextResponse.redirect(new URL('/vendor/dashboard', request.url));
    } else if (role === 'admin') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // If trying to access protected path without being logged in
  if (!isPublicPath && !isPublicApiPath && !token) {
    return NextResponse.redirect(new URL('/auth/login', request.url));
  }

  // Role-based access control
  if (token) {
    const role = token.role as string;

    // Farmer can only access farmer routes
    if (pathname.startsWith('/farmer') && role !== 'farmer' && role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Vendor can only access vendor routes
    if (pathname.startsWith('/vendor') && role !== 'vendor' && role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }

    // Admin routes
    if (pathname.startsWith('/admin') && role !== 'admin') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
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
