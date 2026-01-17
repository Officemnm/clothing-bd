import { NextRequest, NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/stats';
import { decrypt } from '@/lib/session';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Read cookie directly from request
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      const res = NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    const session = await decrypt(sessionCookie);
    
    if (!session) {
      const res = NextResponse.json(
        { success: false, message: 'Invalid session' },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      return res;
    }

    const stats = await getDashboardStats();

    const res = NextResponse.json({
      success: true,
      data: stats,
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    return res;
  } catch (error) {
    console.error('Stats error:', error);
    const res = NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}
