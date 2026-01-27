import { NextRequest, NextResponse } from 'next/server';
import { decrypt, isSessionInactive, encrypt } from '@/lib/session';

const publicRoutes = ['/login', '/api/auth/login', '/api/auth/logout', '/api/auth/activity'];
const protectedRoutes = ['/dashboard', '/api/stats', '/api/users', '/api/po', '/api/accessories', '/api/closing'];

// Permission requirements for each route
const routePermissions: Record<string, string> = {
  '/dashboard/po-generator': 'po_sheet',
  '/dashboard/accessories': 'accessories',
  '/dashboard/closing-report': 'closing',
  '/dashboard/sewing-closing-report': 'sewing_closing_report',
  '/dashboard/daily-line-wise-input-report': 'daily_line_wise_input_report',
  '/dashboard/users': 'admin', // Only admin
  '/api/po': 'po_sheet',
  '/api/accessories': 'accessories',
  '/api/closing': 'closing',
  '/api/users': 'admin',
};

// Check if user has permission for a route
function hasPermission(pathname: string, role: string, permissions: string[]): boolean {
  // Admin has access to everything
  if (role === 'admin') return true;
  
  // Check specific route permissions
  for (const [route, requiredPermission] of Object.entries(routePermissions)) {
    if (pathname.startsWith(route)) {
      if (requiredPermission === 'admin') return false; // Non-admin can't access admin routes
      return permissions.includes(requiredPermission);
    }
  }
  
  // Dashboard main page is accessible to all logged-in users
  return true;
}

// Get first allowed route for user
function getDefaultRoute(role: string, permissions: string[]): string {
  if (role === 'admin') return '/dashboard';
  
  // Find first permitted route
  if (permissions.includes('closing')) return '/dashboard/closing-report';
  if (permissions.includes('po_sheet')) return '/dashboard/po-generator';
  if (permissions.includes('accessories')) return '/dashboard/accessories';
  
  return '/dashboard'; // Fallback to main dashboard
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  
  // Check if it's a public route
  if (publicRoutes.some(route => pathname.startsWith(route))) {
    // If user is logged in and trying to access login page, redirect to appropriate dashboard
    const session = request.cookies.get('session')?.value;
    if (session && pathname === '/login') {
      const parsed = await decrypt(session);
      if (parsed) {
        const defaultRoute = getDefaultRoute(
          parsed.role as string, 
          (parsed.permissions as string[]) || []
        );
        return NextResponse.redirect(new URL(defaultRoute, request.url));
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

    // Check for inactivity timeout (10 minutes)
    if (isSessionInactive(parsed)) {
      if (pathname.startsWith('/api/')) {
        const response = NextResponse.json(
          { success: false, message: 'Session inactive - please login again', shouldLogout: true },
          { status: 401 }
        );
        response.cookies.delete('session');
        return response;
      }
      const response = NextResponse.redirect(new URL('/login?reason=inactive', request.url));
      response.cookies.delete('session');
      return response;
    }

    // Update lastActivity on every request (except API calls to prevent too many updates)
    if (!pathname.startsWith('/api/')) {
      parsed.lastActivity = Date.now();
      const newSessionToken = await encrypt(parsed);
      const updatedResponse = NextResponse.next();
      updatedResponse.cookies.set({
        name: 'session',
        value: newSessionToken,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        expires: new Date(parsed.expiresAt),
        sameSite: 'lax',
        path: '/',
      });
      
      // Check permissions for updated response
      const userRole = parsed.role as string;
      const userPermissions = (parsed.permissions as string[]) || [];
      
      if (!hasPermission(pathname, userRole, userPermissions)) {
        const defaultRoute = getDefaultRoute(userRole, userPermissions);
        return NextResponse.redirect(new URL(defaultRoute, request.url));
      }
      
      return updatedResponse;
    }

    // Check permissions
    const userRole = parsed.role as string;
    const userPermissions = (parsed.permissions as string[]) || [];
    
    if (!hasPermission(pathname, userRole, userPermissions)) {
      if (pathname.startsWith('/api/')) {
        return NextResponse.json(
          { success: false, message: 'Access denied. You do not have permission.' },
          { status: 403 }
        );
      }
      // Redirect to their default allowed page
      const defaultRoute = getDefaultRoute(userRole, userPermissions);
      return NextResponse.redirect(new URL(defaultRoute, request.url));
    }

    // Don't update session here - it causes cookie override issues
    // Session renewal is handled by login API's 24-hour expiry
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
