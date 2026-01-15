import { NextRequest, NextResponse } from 'next/server';
import { updateSession, decrypt } from '@/lib/session';

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout'];
const protectedRoutes = ['/dashboard', '/api/stats', '/api/users'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is logged in and trying to access login page, redirect to dashboard
    const session = request.cookies.get('session')?.value;
    if (session && pathname === '/login') {
      const parsed = await decrypt(session);
      if (parsed) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.next();
  }

  // Check if it's a protected route
  if (protectedRoutes.some(route => pathname.startsWith(route))) {
    const session = request.cookies.get('session')?.value;
    
    if (!session) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }
      return NextResponse.redirect(new URL('/login', request.url));
    }

    const parsed = await decrypt(session);
    if (!parsed) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: 'Session expired' },
          { status: 401 }
        );
      }
      const response = NextResponse.redirect(new URL('/login', request.url));
      response.cookies.delete('session');
      return response;
    }

    // Don't update session here - just validate and pass through
    // Session renewal will happen on subsequent requests
    return NextResponse.next();
  }

  // Redirect root to login or dashboard based on session
  if (pathname === '/') {
    const session = request.cookies.get('session')?.value;
    if (session) {
      const parsed = await decrypt(session);
      if (parsed) {
        return NextResponse.redirect(new URL('/dashboard', request.url));
      }
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // Security headers for all responses
  const response = NextResponse.next();
  
  // Prevent caching of sensitive pages
  response.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  response.headers.set('Pragma', 'no-cache');
  response.headers.set('Expires', '0');
  
  // Security headers
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-XSS-Protection', '1; mode=block');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  
  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
