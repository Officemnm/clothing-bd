import { NextRequest, NextResponse } from 'next/server';
import { decrypt, isSessionInactive } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Read cookie directly from request - more reliable in Next.js 15+
    const sessionCookie = request.cookies.get('session')?.value;
    
    // Log cookie hash for debugging
    const cookieHash = sessionCookie ? sessionCookie.slice(-20) : 'none';
    console.log('[Session API] Cookie hash:', cookieHash);
    
    console.log('[Session API] Cookie value exists:', !!sessionCookie);
    
    if (!sessionCookie) {
      const res = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    const session = await decrypt(sessionCookie);
    
    console.log('[Session API] Decrypted username:', session?.username);

    if (!session) {
      const res = NextResponse.json(
        { authenticated: false, message: 'Invalid session' },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      return res;
    }

    // Check for inactivity timeout
    if (isSessionInactive(session)) {
      const res = NextResponse.json(
        { authenticated: false, message: 'Session inactive', shouldLogout: true },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
      res.headers.set('Pragma', 'no-cache');
      res.headers.set('Expires', '0');
      // Delete the session cookie
      res.cookies.delete('session');
      return res;
    }

    const res = NextResponse.json({
      authenticated: true,
      user: {
        name: session.username,
        username: session.username,
        role: session.role,
        permissions: session.permissions,
      },
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    return res;
  } catch (error) {
    console.error('Session check error:', error);
    const res = NextResponse.json(
      { authenticated: false, message: 'Internal server error' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    return res;
  }
}
