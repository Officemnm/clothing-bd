/**
 * ERP Cookie Management System
 * 
 * This module handles:
 * - ERP authentication and cookie collection
 * - Cookie storage in MongoDB
 * - Automatic cookie refresh (every 4 minutes to prevent 5-minute expiry)
 */

import { getCollection } from './mongodb';

// Cookie expiry time (5 minutes from ERP, we refresh at 4 minutes)
const COOKIE_REFRESH_INTERVAL = 4 * 60 * 1000; // 4 minutes in ms
const COOKIE_EXPIRY = 5 * 60 * 1000; // 5 minutes in ms

interface ERPCookieDoc {
  _id?: string;
  key: string;
  cookie: string;
  createdAt: Date;
  expiresAt: Date;
  lastRefreshed: Date;
}

/**
 * Fetch fresh cookie from ERP by logging in
 */
export async function fetchERPCookie(): Promise<string | null> {
  const loginUrl = process.env.ERP_LOGIN_URL;
  const username = process.env.ERP_USERNAME;
  const password = process.env.ERP_PASSWORD;

  if (!loginUrl || !username || !password) {
    console.error('[ERP Cookie] Missing ERP credentials in environment');
    return null;
  }

  try {
    const formData = new URLSearchParams();
    formData.append('txt_userid', username);
    formData.append('txt_password', password);
    formData.append('submit', 'Login');

    const response = await fetch(loginUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
      body: formData.toString(),
      redirect: 'manual',
    });

    // Get cookies from response
    const cookies = response.headers.get('set-cookie');
    if (cookies) {
      console.log('[ERP Cookie] Successfully fetched new cookie');
      return cookies;
    }
    
    console.error('[ERP Cookie] No cookie received from ERP');
    return null;
  } catch (error) {
    console.error('[ERP Cookie] Login error:', error);
    return null;
  }
}

/**
 * Store ERP cookie in database
 */
export async function storeERPCookie(cookie: string): Promise<boolean> {
  try {
    const collection = await getCollection('erp_cookies');
    const now = new Date();
    const expiresAt = new Date(now.getTime() + COOKIE_EXPIRY);

    await collection.updateOne(
      { key: 'erp_session' },
      {
        $set: {
          cookie,
          createdAt: now,
          expiresAt,
          lastRefreshed: now,
        },
      },
      { upsert: true }
    );

    console.log('[ERP Cookie] Cookie stored successfully, expires at:', expiresAt.toISOString());
    return true;
  } catch (error) {
    console.error('[ERP Cookie] Failed to store cookie:', error);
    return false;
  }
}

/**
 * Get stored ERP cookie from database
 * Returns null if cookie is expired or not found
 */
export async function getStoredERPCookie(): Promise<string | null> {
  try {
    const collection = await getCollection('erp_cookies');
    const doc = await collection.findOne<ERPCookieDoc>({ key: 'erp_session' });

    if (!doc) {
      console.log('[ERP Cookie] No stored cookie found');
      return null;
    }

    const now = new Date();
    if (new Date(doc.expiresAt) < now) {
      console.log('[ERP Cookie] Stored cookie has expired');
      return null;
    }

    console.log('[ERP Cookie] Using stored cookie, expires at:', doc.expiresAt);
    return doc.cookie;
  } catch (error) {
    console.error('[ERP Cookie] Failed to get stored cookie:', error);
    return null;
  }
}

/**
 * Check if cookie needs refresh (older than 4 minutes)
 */
export async function needsCookieRefresh(): Promise<boolean> {
  try {
    const collection = await getCollection('erp_cookies');
    const doc = await collection.findOne<ERPCookieDoc>({ key: 'erp_session' });

    if (!doc) return true;

    const now = new Date();
    const timeSinceRefresh = now.getTime() - new Date(doc.lastRefreshed).getTime();
    
    return timeSinceRefresh >= COOKIE_REFRESH_INTERVAL;
  } catch (error) {
    console.error('[ERP Cookie] Error checking refresh status:', error);
    return true;
  }
}

/**
 * Refresh ERP cookie - fetch new one and store it
 */
export async function refreshERPCookie(): Promise<string | null> {
  console.log('[ERP Cookie] Refreshing cookie...');
  
  const cookie = await fetchERPCookie();
  if (cookie) {
    await storeERPCookie(cookie);
    return cookie;
  }
  
  return null;
}

/**
 * Get valid ERP cookie - either from storage or fetch new one
 * This is the main function to use when making ERP API calls
 */
export async function getValidERPCookie(): Promise<string | null> {
  // First try to get stored cookie
  const storedCookie = await getStoredERPCookie();
  
  if (storedCookie) {
    // Check if needs refresh
    const needsRefresh = await needsCookieRefresh();
    if (!needsRefresh) {
      return storedCookie;
    }
  }
  
  // Fetch new cookie
  return await refreshERPCookie();
}

/**
 * Initialize ERP cookie on user login
 */
export async function initERPCookieOnLogin(): Promise<boolean> {
  console.log('[ERP Cookie] Initializing cookie on login...');
  const cookie = await refreshERPCookie();
  return cookie !== null;
}

/**
 * Get cookie refresh interval in milliseconds
 */
export function getCookieRefreshInterval(): number {
  return COOKIE_REFRESH_INTERVAL;
}
