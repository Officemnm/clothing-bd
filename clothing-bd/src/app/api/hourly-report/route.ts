import { NextRequest, NextResponse } from 'next/server';
import { fetchHourlyReport, getTodayDateFormatted } from '@/lib/hourly-report';
import { getSession } from '@/lib/session';

/**
 * GET /api/hourly-report
 * Fetch hourly production monitoring report
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
        { success: false, message: 'অননুমোদিত অ্যাক্সেস' },
        { status: 401 }
      );
    }

    // Get query parameters
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || getTodayDateFormatted();
    const line = searchParams.get('line') || undefined;

    // Fetch the report
    const result = await fetchHourlyReport(date, line);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Hourly report API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'সার্ভার এরর হয়েছে',
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
        { success: false, message: 'অননুমোদিত অ্যাক্সেস' },
        { status: 401 }
      );
    }

    // Get body parameters
    const body = await request.json();
    const { date, line } = body;

    if (!date) {
      return NextResponse.json(
        { success: false, message: 'তারিখ দিতে হবে' },
        { status: 400 }
      );
    }

    // Fetch the report
    const result = await fetchHourlyReport(date, line || undefined);

    return NextResponse.json(result);

  } catch (error) {
    console.error('Hourly report API error:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'সার্ভার এরর হয়েছে',
        error: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
