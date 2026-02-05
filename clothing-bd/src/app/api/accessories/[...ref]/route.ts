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
import { getCollection, COLLECTIONS } from '@/lib/mongodb';

interface RouteParams {
  params: Promise<{ ref: string[] }>;
}

// Helper function to send notification when moderator edits/deletes
async function sendModeratorNotification(actionBy: string, action: 'edit' | 'delete', bookingRef: string, message: string) {
  try {
    const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
    // Use docId field for admin notifications document
    const record = await collection.findOne({ docId: 'admin_notifications' });
    const notifications = record?.notifications || [];
    const newNotification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: action === 'delete' ? 'warning' : 'info',
      title: action === 'delete' ? 'Accessories Deleted' : 'Accessories Updated',
      message,
      action,
      actionBy,
      actionByRole: 'moderator',
      createdAt: new Date().toISOString(),
      read: false,
      bookingRef,
    };
    notifications.unshift(newNotification);
    const trimmedNotifications = notifications.slice(0, 50);
    await collection.replaceOne(
      { docId: 'admin_notifications' },
      { docId: 'admin_notifications', notifications: trimmedNotifications },
      { upsert: true }
    );
  } catch (error) {
    console.error('Failed to send moderator notification:', error);
  }
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
    
    // Allow admin and moderator
    if (!session || (session.role !== 'admin' && session.role !== 'moderator')) {
      return NextResponse.json({ success: false, message: 'Admin or Moderator access required' }, { status: 403 });
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
      
      // Send notification if moderator
      if (session.role === 'moderator') {
        await sendModeratorNotification(session.username, 'delete', ref.toUpperCase(), `Challan entry deleted from booking ${ref.toUpperCase()}`);
      }
      
      return NextResponse.json({ success: true, booking, message: 'Challan deleted' });
    }
    
    // Delete entire booking
    const deleted = await deleteBooking(ref.toUpperCase());
    
    if (!deleted) {
      return NextResponse.json({ success: false, message: 'Booking not found' }, { status: 404 });
    }

    await updateAccessoriesStats(session.username, ref.toUpperCase(), 'Deleted');
    
    // Send notification if moderator
    if (session.role === 'moderator') {
      await sendModeratorNotification(session.username, 'delete', ref.toUpperCase(), `Entire booking ${ref.toUpperCase()} deleted`);
    }

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
    const { line, color, size, qty, date, itemType } = await request.json();
    
    if (!line || !color || !size || !qty) {
      return NextResponse.json({ success: false, message: 'All fields required' }, { status: 400 });
    }

    const booking = await addChallan(ref.toUpperCase(), {
      line: line.toString(),
      color: color.toString(),
      size: size.toString(),
      qty: Number(qty),
      itemType: itemType || 'Top'
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
    const { index, line, color, size, qty, date, itemType } = await request.json();
    
    if (index === undefined || !line || !color || !size || !qty) {
      return NextResponse.json({ success: false, message: 'All fields required including index' }, { status: 400 });
    }

    const booking = await updateChallan(ref.toUpperCase(), Number(index), {
      date: date || new Date().toLocaleDateString('en-GB').replace(/\//g, '-'),
      line: line.toString(),
      color: color.toString(),
      size: size.toString(),
      qty: Number(qty),
      itemType: itemType || 'Top'
    });
    
    if (!booking) {
      return NextResponse.json({ success: false, message: 'Booking or challan not found' }, { status: 404 });
    }

    await updateAccessoriesStats(session.username, ref.toUpperCase(), 'Entry Updated');
    
    // Send notification if moderator
    if (session.role === 'moderator') {
      await sendModeratorNotification(session.username, 'edit', ref.toUpperCase(), `Challan entry updated in booking ${ref.toUpperCase()}`);
    }

    return NextResponse.json({ success: true, booking, message: 'Challan updated' });
  } catch (error) {
    console.error('Challan PATCH error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update challan' }, { status: 500 });
  }
}
