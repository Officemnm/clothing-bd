import { NextRequest, NextResponse } from 'next/server';
import { decrypt } from '@/lib/session';
import { getUserByUsername, updateUserProfile } from '@/lib/auth';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function GET(request: NextRequest) {
  try {
    // Read cookie directly from request
    const sessionCookie = request.cookies.get('session')?.value;
    
    // Log cookie hash for debugging
    const cookieHash = sessionCookie ? sessionCookie.slice(-20) : 'none';
    console.log('[User API] Cookie hash:', cookieHash);
    
    if (!sessionCookie) {
      const res = NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.headers.set('Pragma', 'no-cache');
      return res;
    }

    const session = await decrypt(sessionCookie);
    
    if (!session) {
      const res = NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
      res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
      res.headers.set('Pragma', 'no-cache');
      return res;
    }

    console.log('[User API] Getting data for:', session.username, '- Cookie hash:', cookieHash);

    // Get full user data from database
    const userData = await getUserByUsername(session.username);

    const res = NextResponse.json({ 
      success: true, 
      user: {
        username: session.username,
        role: session.role,
        phone: userData?.phone || '',
        photo: userData?.photo || '',
        email: userData?.email || '',
        designation: userData?.designation || '',
        permissions: userData?.permissions || [],
        last_login: userData?.last_login || '',
        created_at: userData?.created_at || '',
        firstName: userData?.firstName || '',
        lastName: userData?.lastName || '',
      }
    });
    res.headers.set('Cache-Control', 'no-store, no-cache, must-revalidate');
    res.headers.set('Pragma', 'no-cache');
    return res;
  } catch (error) {
    console.error('User GET error:', error);
    const res = NextResponse.json({ success: false, message: 'Failed to get user' }, { status: 500 });
    res.headers.set('Cache-Control', 'no-store');
    return res;
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Read cookie directly from request
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json({ success: false, message: 'Not authenticated' }, { status: 401 });
    }

    const session = await decrypt(sessionCookie);
    
    if (!session) {
      return NextResponse.json({ success: false, message: 'Invalid session' }, { status: 401 });
    }

    const body = await request.json();
    const { phone, email, designation, photo, currentPassword, newPassword, firstName, lastName } = body;

    // Validate password change if requested
    if (newPassword) {
      const userData = await getUserByUsername(session.username);
      if (!userData || userData.password !== currentPassword) {
        return NextResponse.json({ success: false, message: 'Current password is incorrect' }, { status: 400 });
      }
    }

    const updates: {
      phone?: string;
      email?: string;
      designation?: string;
      photo?: string;
      password?: string;
      firstName?: string;
      lastName?: string;
    } = {};

    if (phone !== undefined) updates.phone = phone;
    if (email !== undefined) updates.email = email;
    if (designation !== undefined) updates.designation = designation;
    if (photo !== undefined) updates.photo = photo;
    if (newPassword) updates.password = newPassword;
    if (firstName !== undefined) updates.firstName = firstName;
    if (lastName !== undefined) updates.lastName = lastName;

    const success = await updateUserProfile(session.username, updates);

    if (success) {
      return NextResponse.json({ success: true, message: 'Profile updated successfully' });
    } else {
      return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
    }
  } catch (error) {
    console.error('User PUT error:', error);
    return NextResponse.json({ success: false, message: 'Failed to update profile' }, { status: 500 });
  }
}
