import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      const res = NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const res = NextResponse.json({ 
      success: true, 
      user: {
        username: session.username,
        role: session.role,
      }
    });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  } catch (error) {
    console.error('User GET error:', error);
    const res = NextResponse.json({ success: false, message: 'Failed to get user' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
