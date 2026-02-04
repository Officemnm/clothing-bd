import { NextRequest, NextResponse } from 'next/server';
import { getCollection, COLLECTIONS } from '@/lib/mongodb';
import { getSession } from '@/lib/session';

export interface Notification {
  id: string;
  type: 'info' | 'warning' | 'success' | 'error';
  title: string;
  message: string;
  action?: string;
  actionBy: string;
  actionByRole: string;
  createdAt: string;
  read: boolean;
  bookingRef?: string;
}

interface NotificationsDocument {
  _id: string;
  notifications: Notification[];
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const createFilter = (id: string): any => ({ _id: id });

// GET - Fetch all notifications for admin
export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
    const record = await collection.findOne(createFilter('admin_notifications')) as NotificationsDocument | null;
    
    const notifications = record?.notifications || [];
    const unreadCount = notifications.filter(n => !n.read).length;

    return NextResponse.json({
      success: true,
      notifications: notifications.slice(0, 50), // Return latest 50
      unreadCount,
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// POST - Create a new notification (for moderators/co-admins)
export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { type, title, message, action, bookingRef } = body;

    if (!title || !message) {
      return NextResponse.json(
        { success: false, message: 'Title and message are required' },
        { status: 400 }
      );
    }

    const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
    const record = await collection.findOne(createFilter('admin_notifications')) as NotificationsDocument | null;
    
    const notifications = record?.notifications || [];
    
    const newNotification: Notification = {
      id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type: type || 'info',
      title,
      message,
      action,
      actionBy: session.username,
      actionByRole: session.role,
      createdAt: new Date().toISOString(),
      read: false,
      bookingRef,
    };

    // Add to beginning of array (newest first)
    notifications.unshift(newNotification);

    // Keep only last 100 notifications
    const trimmedNotifications = notifications.slice(0, 100);

    await collection.replaceOne(
      createFilter('admin_notifications'),
      { _id: 'admin_notifications', notifications: trimmedNotifications },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Notification created',
      notification: newNotification,
    });
  } catch (error) {
    console.error('Create notification error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// PUT - Mark notifications as read
export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { ids, markAllRead } = body;

    const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
    const record = await collection.findOne(createFilter('admin_notifications')) as NotificationsDocument | null;
    
    if (!record) {
      return NextResponse.json({
        success: true,
        message: 'No notifications to update',
      });
    }

    let notifications = record.notifications;

    if (markAllRead) {
      notifications = notifications.map(n => ({ ...n, read: true }));
    } else if (ids && Array.isArray(ids)) {
      notifications = notifications.map(n => 
        ids.includes(n.id) ? { ...n, read: true } : n
      );
    }

    await collection.replaceOne(
      createFilter('admin_notifications'),
      { _id: 'admin_notifications', notifications },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'Notifications updated',
    });
  } catch (error) {
    console.error('Update notifications error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// DELETE - Clear all notifications
export async function DELETE() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const collection = await getCollection(COLLECTIONS.NOTIFICATIONS);
    
    await collection.replaceOne(
      createFilter('admin_notifications'),
      { _id: 'admin_notifications', notifications: [] },
      { upsert: true }
    );

    return NextResponse.json({
      success: true,
      message: 'All notifications cleared',
    });
  } catch (error) {
    console.error('Clear notifications error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
