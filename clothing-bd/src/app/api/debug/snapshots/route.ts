import { NextRequest, NextResponse } from 'next/server';
import { getAllSnapshotsForDate } from '@/lib/hourly-snapshot';
import { getCurrentTimeSlot, getTodayDateFormatted } from '@/lib/hourly-report';

/**
 * Debug endpoint to check snapshot status
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || getTodayDateFormatted();
    
    const snapshots = await getAllSnapshotsForDate(date);
    const currentSlot = getCurrentTimeSlot();
    
    // Get Bangladesh time
    const now = new Date();
    const bdTime = new Date(now.toLocaleString('en-US', { timeZone: 'Asia/Dhaka' }));
    
    return NextResponse.json({
      date,
      currentSlot,
      bdTime: bdTime.toISOString(),
      bdTimeFormatted: bdTime.toLocaleString('en-BD', { timeZone: 'Asia/Dhaka' }),
      snapshots: {
        slot1: snapshots.slot1 ? {
          exists: true,
          capturedAt: snapshots.slot1.capturedAt,
          grandTotal: snapshots.slot1.grandTotal,
          floorsCount: snapshots.slot1.floors?.length || 0,
          firstFloorLines: snapshots.slot1.floors?.[0]?.lines?.slice(0, 3) || []
        } : { exists: false },
        slot2: snapshots.slot2 ? {
          exists: true,
          capturedAt: snapshots.slot2.capturedAt,
          grandTotal: snapshots.slot2.grandTotal
        } : { exists: false },
        slot3: snapshots.slot3 ? {
          exists: true,
          capturedAt: snapshots.slot3.capturedAt,
          grandTotal: snapshots.slot3.grandTotal
        } : { exists: false }
      }
    });
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}
