import { NextRequest, NextResponse } from 'next/server';
import { fetchClosingReportData, calculateMetrics, calculateTotals } from '@/lib/closing';
import { getSession } from '@/lib/session';
import { updateClosingStats } from '@/lib/stats';

export async function POST(request: NextRequest) {
  try {
    // Get session for username
    const session = await getSession();
    
    const { refNo } = await request.json();

    if (!refNo || refNo.trim() === '') {
      return NextResponse.json(
        { success: false, message: 'Please enter a booking number' },
        { status: 400 }
      );
    }

    const data = await fetchClosingReportData(refNo.trim());

    if (!data || data.length === 0) {
      return NextResponse.json(
        { success: false, message: 'No data found for this booking' },
        { status: 404 }
      );
    }

    // Process data for preview
    const processedData = data.map(block => {
      const sizes = block.headers.map((size, index) => {
        const metrics = calculateMetrics(block, index);
        return {
          size,
          ...metrics,
        };
      });

      const totals = calculateTotals(block);

      return {
        color: block.color,
        style: block.style,
        buyer: block.buyer,
        sizes,
        totals,
      };
    });

    // Update stats/history for dashboard
    if (session?.username) {
      await updateClosingStats(session.username, refNo.trim().toUpperCase(), 'success');
    }

    return NextResponse.json({
      success: true,
      data: processedData,
      refNo: refNo.trim().toUpperCase(),
      meta: {
        buyer: data[0]?.buyer || 'N/A',
        style: data[0]?.style || 'N/A',
      },
    });
  } catch (error) {
    console.error('Closing report error:', error);
    
    // Log failed attempt if session exists
    const session = await getSession();
    if (session?.username) {
      try {
        await updateClosingStats(session.username, 'Unknown', 'failed');
      } catch (e) {
        console.error('Failed to log failed closing stats:', e);
      }
    }
    
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
