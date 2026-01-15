// GET single booking, DELETE booking/challan, PUT refresh, POST add challan
import { NextRequest, NextResponse } from 'next/server';
import { 
  getAccessoryBooking,
  deleteBooking,
  deleteChallan,
  addChallan,
  updateChallan,
  createOrUpdateBooking,
  updateAccessoriesStats
} from '@/lib/accessories';
import { fetchClosingReportData } from '@/lib/closing';
import { getSession } from '@/lib/session';

interface RouteParams {
  params: Promise<{ ref: string[] }>;
}

// GET - Get single booking details
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { ref: refArr } = await params;
    const ref = refArr.join('/');
    const booking = await getAccessoryBooking(ref.toUpperCase());
    
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, booking });
  } catch (error) {
    console.error('Booking GET error:', error);
    return NextResponse.json({ success: false, message: 'Failed to load booking' }, { status: 500 });
  }
}

// DELETE - Delete entire booking or single challan
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json({ success: false, message: 'Admin access required' }, { status: 403 });
    }

    const { ref: refArr } = await params;
    const ref = refArr.join('/');
    
    // Check if deleting a specific challan
    const { searchParams } = new URL(request.url);
    const challanIndex = searchParams.get('challan');
    
    if (challanIndex !== null) {
      // Delete specific challan
      const index = parseInt(challanIndex);
      if (index < 0) {
        return NextResponse.json({ success: false, message: 'Invalid challan index' }, { status: 400 });
      }
      
      const booking = await deleteChallan(ref.toUpperCase(), index);
      
      if (!booking) {
        return NextResponse.json({ success: false, message: 'Challan not found' }, { status: 404 });
      }

      await updateAccessoriesStats(session.username, ref.toUpperCase(), 'Entry Deleted');
      return NextResponse.json({ success: true, booking, message: 'Challan deleted' });
    }
    
    // Delete entire booking
    const deleted = await deleteBooking(ref.toUpperCase());
    
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    await updateAccessoriesStats(session.username, ref.toUpperCase(), 'Deleted');

    return NextResponse.json({ success: true, message: 'Booking deleted' });
  } catch (error) {
    console.error('Booking DELETE error:', error);
    return NextResponse.json({ success: false, message: 'Failed to delete booking' }, { status: 500 });
  }
}

// PUT - Refresh booking from ERP
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { ref: refArr } = await params;
    const ref = refArr.join('/');
    const refUpper = ref.toUpperCase();
    
    // Fetch fresh data from ERP
    const erpData = await fetchClosingReportData(refUpper);
    
    if (!erpData || erpData.length === 0) {
      return NextResponse.json({ success: false, message: 'Booking not found in ERP' }, { status: 404 });
    }

    // Extract unique colors
    const colors = [...new Set(erpData.map(item => item.color))].sort();
    
    // Update booking
    const booking = await createOrUpdateBooking(refUpper, {
      style: erpData[0].style || 'N/A',
      buyer: erpData[0].buyer || 'N/A',
      colors
    });
    
    await updateAccessoriesStats(session.username, refUpper, 'Refreshed');

    return NextResponse.json({ success: true, booking, message: 'Data refreshed from ERP' });
  } catch (error) {
    console.error('Booking PUT error:', error);
    return NextResponse.json({ success: false, message: 'Failed to refresh booking' }, { status: 500 });
  }
}

// POST - Add new challan
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { ref: refArr } = await params;
    const ref = refArr.join('/');
    const { line, color, size, qty, date } = await request.json();
    
    if (!line || !color || !size || !qty) {
      return NextResponse.json({ success: false, message: 'All fields required' }, { status: 400 });
    }

    const booking = await addChallan(ref.toUpperCase(), {
      line: line.toString(),
      color: color.toString(),
      size: size.toString(),
      qty: Number(qty)
    }, date);
    
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    await updateAccessoriesStats(session.username, ref.toUpperCase(), 'Entry Added');

    return NextResponse.json({ success: true, booking, message: 'Challan added' });
  } catch (error) {
    console.error('Challan POST error:', error);
    return NextResponse.json({ success: false, message: 'Failed to add challan' }, { status: 500 });
  }
}

// PATCH - Edit/Update existing challan
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }

    const { ref: refArr } = await params;
    const ref = refArr.join('/');
    const { index, line, color, size, qty, date } = await request.json();
    
    if (index === undefined || !line || !color || !size || !qty) {
      return NextResponse.json({ success: false, message: 'All fields required including index' }, { status: 400 });
    }

    const booking = await updateChallan(ref.toUpperCase(), Number(index), {
      date: date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      line: line.toString(),
      color: color.toString(),
      size: size.toString(),
      qty: Number(qty)
    });
    
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking or challan not found' }, { status: 404 });
    }

    await updateAccessoriesStats(session.username, ref.toUpperCase(), 'Entry Updated');

    return NextResponse.json({ success: true, booking, message: 'Challan updated' });
  } catch (error) {
    console.error('Challan PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update challan' }, { status: 500 });
  }
}
