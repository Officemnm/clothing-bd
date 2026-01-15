import { NextRequest, NextResponse } from 'next/server';
import { fetchClosingReportData, calculateMetrics, calculateTotals } from '@/lib/closing';

export async function POST(request: NextRequest) {
  try {
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
    return NextResponse.json(
      { success: false, message: 'Server error. Please try again.' },
      { status: 500 }
    );
  }
}
