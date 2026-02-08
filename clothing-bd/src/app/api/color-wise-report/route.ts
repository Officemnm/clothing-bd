import { NextRequest, NextResponse } from 'next/server';
import { fetchColorWiseReport } from '@/lib/color-wise-report';
import { getSession } from '@/lib/session';
import { updateChallanStats } from '@/lib/stats';

/**
 * GET /api/color-wise-report
 * Fetch color-wise input report from ERP
 * Groups challan data by color with line details
 * 
 * Query params:
 * - booking: Booking/Internal Reference number (required)
 */
export async function GET(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const booking = searchParams.get('booking');

    if (!booking || !booking.trim()) {
      return NextResponse.json(
        { success: false, message: 'Booking number is required' },
        { status: 400 }
      );
    }

    console.log(`[Color Wise API] Fetching report for booking: ${booking}`);
    const startTime = Date.now();

    // Fetch the color-wise report
    const result = await fetchColorWiseReport(booking.trim());

    const elapsed = Date.now() - startTime;
    console.log(`[Color Wise API] Completed in ${elapsed}ms`);

    // Track stats
    if (result.success && session.username) {
      await updateChallanStats(session.username, booking.trim().toUpperCase(), 'success');
    } else if (!result.success && session.username) {
      await updateChallanStats(session.username, booking.trim().toUpperCase(), 'failed');
    }

    return NextResponse.json(result);

  } catch (error) {
    console.error('Color-wise report API error:', error);
    
    // Track failed attempt
    const session = await getSession();
    if (session?.username) {
      try {
        await updateChallanStats(session.username, 'Unknown', 'failed');
      } catch (e) {
        console.error('Failed to log stats:', e);
      }
    }

    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
