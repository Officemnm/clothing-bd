import { NextRequest, NextResponse } from 'next/server';
import { validateUser, updateLastLogin } from '@/lib/auth';
import { encrypt } from '@/lib/session';
import { initERPCookieOnLogin } from '@/lib/erp-cookie';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    console.log('[Login API] Login attempt for:', username);

    if (!username || !password) {
      const res = NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    const user = await validateUser(username, password);

    if (!user) {
      console.log('[Login API] Invalid credentials for:', username);
      const res = NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    console.log('[Login API] Credentials valid for:', username, 'role:', user.role);

    // Initialize ERP cookie on successful login (non-blocking)
    initERPCookieOnLogin().then(success => {
      if (success) {
        console.log('[Login API] ERP cookie initialized successfully');
      } else {
        console.warn('[Login API] Failed to initialize ERP cookie');
      }
    }).catch(err => {
      console.error('[Login API] ERP cookie init error:', err);
    });

    // Create session token directly and set in response cookie
    // Session expires in 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    const sessionToken = await encrypt({
      userId: username,
      username: username,
      role: user.role,
      permissions: user.permissions || [],
      expiresAt,
      lastActivity: Date.now(), // Track last activity for inactivity timeout
    });

    await updateLastLogin(username);

    console.log('[Login API] Session created for:', username);

    const res = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        name: username,
        username,
        role: user.role,
        permissions: user.permissions,
      },
    });
    
    // Set new session cookie - use Set-Cookie header directly for reliability
    const cookieValue = `session=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Expires=${expiresAt.toUTCString()}${process.env.NODE_ENV === 'production' ? '; Secure' : ''}`;
    res.headers.set('Set-Cookie', cookieValue);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    
    console.log('[Login API] Cookie set for:', username);
    return res;
  } catch (error) {
    console.error('Login error:', error);
    const res = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
