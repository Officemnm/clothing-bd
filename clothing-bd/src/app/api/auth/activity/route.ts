import { NextRequest, NextResponse } from 'next/server';
import { decrypt, encrypt, isSessionInactive, INACTIVITY_TIMEOUT } from '@/lib/session';

export const dynamic = 'force-dynamic';

// API to update user activity and check for inactivity timeout
export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { success: false, message: 'No session', shouldLogout: true },
        { status: 401 }
      );
    }

    const session = await decrypt(sessionCookie);
    
    if (!session) {
      return NextResponse.json(
        { success: false, message: 'Invalid session', shouldLogout: true },
        { status: 401 }
      );
    }

    // Check if session has been inactive for too long
    if (isSessionInactive(session)) {
      const response = NextResponse.json(
        { success: false, message: 'Session inactive', shouldLogout: true },
        { status: 401 }
      );
      // Delete the session cookie
      response.cookies.delete('session');
      return response;
    }

    // Update lastActivity timestamp
    session.lastActivity = Date.now();
    
    const response = NextResponse.json({
      success: true,
      message: 'Activity updated',
      inactivityTimeout: INACTIVITY_TIMEOUT,
      lastActivity: session.lastActivity,
    });

    // Set updated session cookie
    response.cookies.set({
      name: 'session',
      value: await encrypt(session),
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      expires: new Date(session.expiresAt),
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Activity update error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

// GET to check activity status without updating
export async function GET(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { active: false, shouldLogout: true },
        { status: 401 }
      );
    }

    const session = await decrypt(sessionCookie);
    
    if (!session) {
      return NextResponse.json(
        { active: false, shouldLogout: true },
        { status: 401 }
      );
    }

    const isInactive = isSessionInactive(session);
    const timeRemaining = INACTIVITY_TIMEOUT - (Date.now() - (session.lastActivity || 0));

    return NextResponse.json({
      active: !isInactive,
      shouldLogout: isInactive,
      lastActivity: session.lastActivity,
      timeRemaining: Math.max(0, timeRemaining),
      inactivityTimeout: INACTIVITY_TIMEOUT,
    });
  } catch (error) {
    console.error('Activity check error:', error);
    return NextResponse.json(
      { active: false, shouldLogout: true },
      { status: 500 }
    );
  }
}
