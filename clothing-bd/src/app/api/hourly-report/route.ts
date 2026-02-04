import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyReport, getTodayDateFormatted } from '@/lib/hourly-report';
import { getAllSnapshotsForDate } from '@/lib/hourly-snapshot';
import { fetchFactoryReport } from '@/lib/factory-report';
import { getSession } from '@/lib/session';
import { updateHourlyStats } from '@/lib/stats';

/**
 * GET /api/hourly-report
 * Fetch hourly production monitoring report
 * Uses saved snapshots to calculate time-slot-wise input
 * Also fetches buyer-wise summary from factory report
 * 
 * Query params:
 * - date: Date in DD-MMM-YYYY format (e.g., "28-Jan-2026")
 * - line: (optional) Specific line number to filter
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
    const date = searchParams.get('date') || getTodayDateFormatted();
    const line = searchParams.get('line') || undefined;

    // Fetch snapshots and factory report in parallel
    const [snapshots, factoryReport] = await Promise.all([
      getAllSnapshotsForDate(date),
      fetchFactoryReport(date)
    ]);

    // Fetch the hourly report with snapshots
    const result = await fetchHourlyReport(date, line, snapshots);

    // Track successful report generation
    if (result.success && session.username) {
      await updateHourlyStats(session.username, date, 'success', line);
    } else if (!result.success && session.username) {
      await updateHourlyStats(session.username, date, 'failed', line);
    }

    // Add snapshot info and factory summary to response
    return NextResponse.json({
      ...result,
      snapshotsAvailable: {
        slot1: snapshots.slot1 ? new Date(snapshots.slot1.capturedAt).toISOString() : null,
        slot2: snapshots.slot2 ? new Date(snapshots.slot2.capturedAt).toISOString() : null,
        slot3: snapshots.slot3 ? new Date(snapshots.slot3.capturedAt).toISOString() : null,
      },
      factorySummary: factoryReport.success ? {
        buyerSummary: factoryReport.buyerSummary,
        totalSewingInput: factoryReport.totalSewingInput
      } : null
    });

  } catch (error) {
    console.error('Hourly report API error:', error);
    
    // Track failed attempt
    const session = await getSession();
    if (session?.username) {
      try {
        await updateHourlyStats(session.username, 'Unknown', 'failed');
      } catch (e) {
        console.error('Failed to log hourly stats:', e);
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

/**
 * POST /api/hourly-report
 * Alternative endpoint with body parameters
 */
export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized access' },
        { status: 401 }
      );
    }

    // Get body parameters
    const body = await request.json();
    const { date, line } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, message: 'Date is required' },
        { status: 400 }
      );
    }

    // Get saved snapshots for this date
    const snapshots = await getAllSnapshotsForDate(date);

    // Fetch the report with snapshots
    const result = await fetchHourlyReport(date, line || undefined, snapshots);

    // Track successful report generation
    if (result.success && session.username) {
      await updateHourlyStats(session.username, date, 'success', line);
    } else if (!result.success && session.username) {
      await updateHourlyStats(session.username, date, 'failed', line);
    }

    // Add snapshot info to response
    return NextResponse.json({
      ...result,
      snapshotsAvailable: {
        slot1: snapshots.slot1 ? new Date(snapshots.slot1.capturedAt).toISOString() : null,
        slot2: snapshots.slot2 ? new Date(snapshots.slot2.capturedAt).toISOString() : null,
        slot3: snapshots.slot3 ? new Date(snapshots.slot3.capturedAt).toISOString() : null,
      }
    });

  } catch (error) {
    console.error('Hourly report API error:', error);
    
    // Track failed attempt
    const session = await getSession();
    if (session?.username) {
      try {
        await updateHourlyStats(session.username, 'Unknown', 'failed');
      } catch (e) {
        console.error('Failed to log hourly stats:', e);
      }
    }
    
    return NextResponse.json(
      { 
        success: false, 
        message: 'Server error occurred',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
