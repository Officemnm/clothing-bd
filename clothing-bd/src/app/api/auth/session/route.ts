import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      const res = NextResponse.json(
        { authenticated: false },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const res = NextResponse.json({
      authenticated: true,
      user: {
        username: session.username,
        role: session.role,
        permissions: session.permissions,
      },
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('Session check error:', error);
    const res = NextResponse.json(
      { authenticated: false, message: 'Internal server error' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
