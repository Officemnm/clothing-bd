import { NextResponse } from 'next/server';
import { getDashboardStats } from '@/lib/stats';
import { getSession } from '@/lib/session';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session) {
      const res = NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
      res.headers.set('Cache-Control', 'no-store');
      return res;
    }

    const stats = await getDashboardStats();

    const res = NextResponse.json({
      success: true,
      data: stats,
    });
    res.headers.set('Cache-Control', 'no-store');
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
