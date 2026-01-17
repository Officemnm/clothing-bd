import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST() {
  try {
    console.log('[Logout API] Clearing session cookie');
    
    const res = NextResponse.json({ success: true, message: 'Logged out successfully' });
    
    // Clear cookie using Set-Cookie header directly - this is more reliable
    const expiredDate = new Date(0).toUTCString();
    const cookieValue = `session=; Path=/; HttpOnly; SameSite=Lax; Expires=${expiredDate}; Max-Age=0`;
    res.headers.set('Set-Cookie', cookieValue);
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.headers.set('Pragma', 'no-cache');
    res.headers.set('Expires', '0');
    
    console.log('[Logout API] Cookie cleared');
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
