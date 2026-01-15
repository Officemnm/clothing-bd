import { NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUserByUsername } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      const res = NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    // Get full user data from database
    const userData = await getUserByUsername(session.username);

    const res = NextResponse.json({ 
      success: true, 
      user: {
        username: session.username,
        role: session.role,
        phone: userData?.phone || '',
        photo: userData?.photo || '',
        email: userData?.email || '',
        designation: userData?.designation || '',
        permissions: userData?.permissions || [],
        last_login: userData?.last_login || '',
        created_at: userData?.created_at || '',
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
