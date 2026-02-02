import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { 
  getAllSnapshotsForDate, 
  getSnapshotConfig, 
  updateSnapshotConfig,
  captureAndSaveSnapshot,
  getTodayDateBD 
} from '@/lib/hourly-snapshot';

/**
 * GET /api/snapshot
 * Get snapshots for a specific date
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || getTodayDateBD();
    const action = searchParams.get('action');

    // Get config if requested
    if (action === 'config') {
      const config = await getSnapshotConfig();
      return NextResponse.json({ success: true, config });
    }

    // Get snapshots for date
    const snapshots = await getAllSnapshotsForDate(date);

    return NextResponse.json({
      success: true,
      date,
      snapshots: {
        slot1: snapshots.slot1 ? {
          capturedAt: snapshots.slot1.capturedAt,
          grandTotal: snapshots.slot1.grandTotal,
          floorsCount: snapshots.slot1.floors.length
        } : null,
        slot2: snapshots.slot2 ? {
          capturedAt: snapshots.slot2.capturedAt,
          grandTotal: snapshots.slot2.grandTotal,
          floorsCount: snapshots.slot2.floors.length
        } : null,
        slot3: snapshots.slot3 ? {
          capturedAt: snapshots.slot3.capturedAt,
          grandTotal: snapshots.slot3.grandTotal,
          floorsCount: snapshots.slot3.floors.length
        } : null
      }
    });

  } catch (error) {
    console.error('Snapshot GET error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/snapshot
 * Manually trigger a snapshot or update config
 */
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || !session.userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Check if user is admin
    if (session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Admin access required' },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { action, slot, date, config } = body;

    // Update config
    if (action === 'updateConfig' && config) {
      const success = await updateSnapshotConfig(config);
      return NextResponse.json({ success, message: success ? 'Config updated' : 'Failed to update config' });
    }

    // Manual snapshot trigger
    if (action === 'capture' && slot) {
      if (!['slot1', 'slot2', 'slot3'].includes(slot)) {
        return NextResponse.json(
          { success: false, message: 'Invalid slot. Must be slot1, slot2, or slot3' },
          { status: 400 }
        );
      }

      const targetDate = date || getTodayDateBD();
      const result = await captureAndSaveSnapshot(targetDate, slot);

      return NextResponse.json({
        success: result.success,
        message: result.message,
        date: targetDate,
        slot,
        grandTotal: result.grandTotal
      });
    }

    return NextResponse.json(
      { success: false, message: 'Invalid action' },
      { status: 400 }
    );

  } catch (error) {
    console.error('Snapshot POST error:', error);
    return NextResponse.json(
      { success: false, message: 'Server error' },
      { status: 500 }
    );
  }
}
