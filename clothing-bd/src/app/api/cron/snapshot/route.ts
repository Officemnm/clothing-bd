import { NextResponse } from 'next/server';
import { captureAndSaveSnapshot, getTodayDateBD, getSnapshotConfig } from '@/lib/hourly-snapshot';

// This endpoint is called by cron jobs at specific times
// It captures the current ERP data and saves it as a snapshot

// Cron secret for security (set in environment variables)
const CRON_SECRET = process.env.CRON_SECRET || 'hourly-snapshot-secret';

export async function GET(request: Request) {
  try {
    // Verify cron secret
    const { searchParams } = new URL(request.url);
    const secret = searchParams.get('secret');
    
    if (secret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    // Get which slot to capture
    const slot = searchParams.get('slot') as 'slot1' | 'slot2' | 'slot3';
    
    if (!slot || !['slot1', 'slot2', 'slot3'].includes(slot)) {
      return NextResponse.json(
        { error: 'Invalid slot parameter. Must be slot1, slot2, or slot3' },
        { status: 400 }
      );
    }

    // Optional: custom date (default is today in Bangladesh time)
    const date = searchParams.get('date') || getTodayDateBD();

    console.log(`Cron triggered: Capturing ${slot} snapshot for ${date}`);

    // Capture and save the snapshot
    const result = await captureAndSaveSnapshot(date, slot);

    if (!result.success) {
      console.error(`Snapshot capture failed: ${result.message}`);
      return NextResponse.json(
        { success: false, error: result.message },
        { status: 500 }
      );
    }

    console.log(`Snapshot captured successfully: ${result.message}`);
    return NextResponse.json({
      success: true,
      message: result.message,
      date,
      slot,
      grandTotal: result.grandTotal,
      capturedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error('Cron snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST endpoint for manual trigger or testing
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { slot, date, secret } = body;

    // Verify secret
    if (secret !== CRON_SECRET) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      );
    }

    if (!slot || !['slot1', 'slot2', 'slot3'].includes(slot)) {
      return NextResponse.json(
        { error: 'Invalid slot parameter. Must be slot1, slot2, or slot3' },
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

  } catch (error) {
    console.error('Manual snapshot error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
