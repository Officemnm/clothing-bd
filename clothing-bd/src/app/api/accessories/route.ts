// GET all bookings, POST search/create booking
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAllAccessoriesBookings, 
  getAccessoryBooking,
  createOrUpdateBooking,
  updateAccessoriesStats
} from '@/lib/accessories';
import { fetchClosingReportData } from '@/lib/closing';
import { getSession } from '@/lib/session';

// GET - List all bookings
export async function GET() {
  try {
    const bookings = await getAllAccessoriesBookings();
    return NextResponse.json({ 
      success: true, 
      bookings,
      count: bookings.length
    });
  } catch (error) {
    console.error('Accessories GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load bookings' }, { status: 500 });
  }
}

// POST - Search/Create booking
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { refNo } = await request.json();
    
    if (!refNo) {
      return NextResponse.json({ success: false, message: 'Reference number required' }, { status: 400 });
    }

    const ref = refNo.trim().toUpperCase();
    
    // Check if booking already exists
    let booking = await getAccessoryBooking(ref);
    
    if (booking) {
      // Booking exists, return it
      return NextResponse.json({ 
        success: true, 
        booking,
        isNew: false
      });
    }
    
    // Booking doesn't exist, fetch from ERP
    const erpData = await fetchClosingReportData(ref);
    
    if (!erpData || erpData.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found in ERP' }, { status: 404 });
    }

    // Extract unique colors from ERP data
    const colors = [...new Set(erpData.map(item => item.color))].sort();
    
    // Create new booking
    booking = await createOrUpdateBooking(ref, {
      style: erpData[0].style || 'N/A',
      buyer: erpData[0].buyer || 'N/A',
      colors
    });
    
    // Log to stats
    await updateAccessoriesStats(session.username, ref, 'Created');

    return NextResponse.json({ 
      success: true, 
      booking,
      isNew: true
    });

  } catch (error) {
    console.error('Accessories POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to process request' }, { status: 500 });
  }
}
