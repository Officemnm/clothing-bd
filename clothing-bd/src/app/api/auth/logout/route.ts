import { NextResponse } from 'next/server';
import { deleteSession } from '@/lib/session';

export async function POST() {
  try {
    await deleteSession();
    const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
    res.headers.set('Cache-Control', 'no-store');
    // Force cookie expire in response as well (belt-and-suspenders)
    res.cookies.set({
      name: 'session',
      value: '',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(0),
      sameSite: 'lax',
      path: '/',
    });
    return res;
  } catch (error) {
    console.error('Logout error:', error);
    const res = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
