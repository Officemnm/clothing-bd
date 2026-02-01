import { NextRequest, NextResponse } from 'next/server';
import { refreshERPCookie, getStoredERPCookie, needsCookieRefresh } from '@/lib/erp-cookie';

export const dynamic = 'force-dynamic';

/**
 * GET - Check cookie status
 */
export async function GET() {
  try {
    const cookie = await getStoredERPCookie();
    const needsRefresh = await needsCookieRefresh();

    return NextResponse.json({
      success: true,
      hasCookie: !!cookie,
      needsRefresh,
    });
  } catch (error) {
    console.error('[ERP Cookie API] Status check error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to check cookie status' },
      { status: 500 }
    );
  }
}

/**
 * POST - Refresh ERP cookie
 * Called by client every 4 minutes to keep cookie fresh
 */
export async function POST(request: NextRequest) {
  try {
    // Optional: Check if user is authenticated
    const sessionCookie = request.cookies.get('session');
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log('[ERP Cookie API] Refresh requested');
    
    const cookie = await refreshERPCookie();
    
    if (cookie) {
      console.log('[ERP Cookie API] Cookie refreshed successfully');
      return NextResponse.json({
        success: true,
        message: 'Cookie refreshed successfully',
        refreshedAt: new Date().toISOString(),
      });
    } else {
      console.error('[ERP Cookie API] Failed to refresh cookie');
      return NextResponse.json(
        { success: false, message: 'Failed to refresh ERP cookie' },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[ERP Cookie API] Refresh error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
