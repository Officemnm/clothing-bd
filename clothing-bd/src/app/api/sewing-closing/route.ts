import { NextRequest, NextResponse } from 'next/server';
import { fetchSewingClosingReportData } from '@/lib/sewing-closing';
import { getSession } from '@/lib/session';
import { updateSewingClosingStats } from '@/lib/stats';

export async function POST(request: NextRequest) {
  try {
    // Get session for authentication check
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Not authenticated' },
        { status: 401 }
      );
    }

    const { refNo } = await request.json();

    if (!refNo || refNo.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Please enter a booking number' },
        { status: 400 }
      );
    }

    console.log('[Sewing Closing API] Fetching data for:', refNo.trim());

    const data = await fetchSewingClosingReportData(refNo.trim());

    if (!data || !data.success || data.data.length === 0) {
      // Track failed attempt
      if (session.username) {
        await updateSewingClosingStats(session.username, refNo.trim().toUpperCase(), 'failed');
      }
      
      return NextResponse.json(
        { success: false, message: 'No data found for this booking' },
        { status: 404 }
      );
    }

    // Track successful report generation
    if (session.username) {
      await updateSewingClosingStats(session.username, refNo.trim().toUpperCase(), 'success');
    }

    console.log('[Sewing Closing API] Successfully fetched data for:', refNo.trim());

    return NextResponse.json({
      success: true,
      data: data.data,
      refNo: refNo.trim().toUpperCase(),
      meta: data.meta,
    });
  } catch (error) {
    console.error('[Sewing Closing API] Error:', error);
    
    // Track failed attempt
    const session = await getSession();
    if (session?.username) {
      try {
        await updateSewingClosingStats(session.username, 'Unknown', 'failed');
      } catch (e) {
        console.error('Failed to log sewing closing stats:', e);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
