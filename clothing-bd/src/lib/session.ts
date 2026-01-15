import { SignJWT, jwtVerify } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

const secretKey = process.env.JWT_SECRET || 'fallback-secret-key';
const key = new TextEncoder().encode(secretKey);

export interface SessionPayload {
  userId: string;
  username: string;
  role: string;
  permissions: string[];
  expiresAt: Date;
}

export async function encrypt(payload: SessionPayload): Promise<string> {
  return await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('24h')
    .sign(key);
}

export async function decrypt(token: string): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, key, {
      algorithms: ['HS256'],
    });
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

export async function createSession(user: {
  username: string;
  role: string;
  permissions: string[];
}): Promise<string> {
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  const session = await encrypt({
    userId: user.username,
    username: user.username,
    role: user.role,
    permissions: user.permissions,
    expiresAt,
  });

  const cookieStore = await cookies();
  cookieStore.set('session', session, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  return session;
}

export async function getSession(): Promise<SessionPayload | null> {
  const cookieStore = await cookies();
  const session = cookieStore.get('session')?.value;
  if (!session) return null;
  return await decrypt(session);
}

export async function deleteSession(): Promise<void> {
  const cookieStore = await cookies();
  // Delete and also expire to cover all browsers
  cookieStore.delete('session');
  cookieStore.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: new Date(0),
    sameSite: 'lax',
    path: '/',
  });
}

export async function updateSession(request: NextRequest): Promise<NextResponse | null> {
  const session = request.cookies.get('session')?.value;
  if (!session) return null;

  const parsed = await decrypt(session);
  if (!parsed) return null;

  parsed.expiresAt = new Date(Date.now() + 5 * 60 * 1000);
  const response = NextResponse.next();
  response.cookies.set({
    name: 'session',
    value: await encrypt(parsed),
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    expires: parsed.expiresAt,
    sameSite: 'lax',
    path: '/',
  });

  return response;
}
