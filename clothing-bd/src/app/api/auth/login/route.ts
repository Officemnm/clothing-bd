import { NextRequest, NextResponse } from 'next/server';
import { validateUser, updateLastLogin } from '@/lib/auth';
import { encrypt } from '@/lib/session';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      const res = NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const user = await validateUser(username, password);

    if (!user) {
      const res = NextResponse.json(
        { success: false, message: 'Invalid credentials' },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Create session token directly and set in response cookie
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000);
    const sessionToken = await encrypt({
      userId: username,
      username: username,
      role: user.role,
      permissions: user.permissions || [],
      expiresAt,
    });

    await updateLastLogin(username);

    const res = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        username,
        role: user.role,
        permissions: user.permissions,
      },
    });
    
    // Set cookie directly on response - this is the key fix!
    res.cookies.set({
      name: 'session',
      value: sessionToken,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: expiresAt,
      sameSite: 'lax',
      path: '/',
    });
    
    res.headers.set('Cache-Control', 'no-store');
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
