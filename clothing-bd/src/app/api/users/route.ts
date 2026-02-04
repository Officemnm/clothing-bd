import { NextRequest, NextResponse } from 'next/server';
import { getSession } from '@/lib/session';
import { getUsers, createUser, deleteUser, updateUser, getUserByUsername } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const users = await getUsers();
    
    // Hide admin password from response
    const sanitizedUsers = Object.fromEntries(
      Object.entries(users).map(([username, user]) => [
        username,
        user.role === 'admin' 
          ? { ...user, password: '••••••••' } // Hide admin password
          : user
      ])
    );

    return NextResponse.json({
      success: true,
      users: sanitizedUsers,
    });
  } catch (error) {
    console.error('Get users error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username, password, permissions, role } = body;

    if (!username || !password) {
      return NextResponse.json(
        { success: false, message: 'Username and password are required' },
        { status: 400 }
      );
    }

    const result = await createUser(username, password, permissions || [], role || 'user');

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'User already exists' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User created successfully',
    });
  } catch (error) {
    console.error('Create user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await getSession();
    
    if (!session || session.role !== 'admin') {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { username } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    const result = await deleteUser(username);

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'Cannot delete this user' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User deleted successfully',
    });
  } catch (error) {
    console.error('Delete user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}

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
    const { username, password, permissions, action, role } = body;

    if (!username) {
      return NextResponse.json(
        { success: false, message: 'Username is required' },
        { status: 400 }
      );
    }

    // Get single user details
    if (action === 'get') {
      const user = await getUserByUsername(username);
      if (!user) {
        return NextResponse.json(
          { success: false, message: 'User not found' },
          { status: 404 }
        );
      }
      // Hide admin password
      const sanitizedUser = user.role === 'admin' 
        ? { ...user, password: '••••••••' }
        : user;
      return NextResponse.json({
        success: true,
        user: sanitizedUser,
      });
    }

    // Update user
    const updates: { password?: string; permissions?: string[]; role?: 'admin' | 'moderator' | 'user' } = {};
    if (password !== undefined) updates.password = password;
    if (permissions !== undefined) updates.permissions = permissions;
    if (role !== undefined) updates.role = role;

    const result = await updateUser(username, updates);

    if (!result) {
      return NextResponse.json(
        { success: false, message: 'User not found or cannot be updated' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
    });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    );
  }
}
