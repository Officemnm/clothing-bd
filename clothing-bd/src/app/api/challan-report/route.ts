import { NextRequest, NextResponse } from 'next/server';
import { fetchChallanReport } from '@/lib/challan-report';
import { getSession } from '@/lib/session';

/**
 * GET /api/challan-report
 * Fetch challan wise input report from ERP
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

    // Fetch the challan report
    const result = await fetchChallanReport(booking.trim());

    return NextResponse.json(result);

  } catch (error) {
    console.error('Challan report API error:', error);
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
 * POST /api/challan-report
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

    const body = await request.json();
    const booking = body.booking;

    if (!booking || !booking.trim()) {
      return NextResponse.json(
        { success: false, message: 'Booking number is required' },
        { status: 400 }
      );
    }

    // Fetch the challan report
    const result = await fetchChallanReport(booking.trim());

    return NextResponse.json(result);

  } catch (error) {
    console.error('Challan report API error:', error);
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
