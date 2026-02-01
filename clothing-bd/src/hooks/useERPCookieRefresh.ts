'use client';

import { useEffect, useRef, useCallback } from 'react';

// Refresh interval: 4 minutes (in milliseconds)
const REFRESH_INTERVAL = 4 * 60 * 1000;

interface UseERPCookieRefreshOptions {
  enabled?: boolean;
  onRefreshSuccess?: () => void;
  onRefreshError?: (error: Error) => void;
}

/**
 * Custom hook to automatically refresh ERP cookie every 4 minutes
 * This keeps the ERP session alive so closing reports can be generated without re-login
 */
export function useERPCookieRefresh(options: UseERPCookieRefreshOptions = {}) {
  const { enabled = true, onRefreshSuccess, onRefreshError } = options;
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const lastRefreshRef = useRef<Date | null>(null);

  const refreshCookie = useCallback(async () => {
    try {
      console.log('[ERP Cookie] Refreshing...');
      
      const response = await fetch('/api/erp-cookie', {
        method: 'POST',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          lastRefreshRef.current = new Date();
          console.log('[ERP Cookie] Refreshed at:', lastRefreshRef.current.toLocaleTimeString());
          onRefreshSuccess?.();
        } else {
          throw new Error(data.message || 'Refresh failed');
        }
      } else if (response.status === 401) {
        // User not logged in, stop refreshing
        console.log('[ERP Cookie] User not authenticated, stopping refresh');
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } else {
        throw new Error(`HTTP ${response.status}`);
      }
    } catch (error) {
      console.error('[ERP Cookie] Refresh error:', error);
      onRefreshError?.(error instanceof Error ? error : new Error(String(error)));
    }
  }, [onRefreshSuccess, onRefreshError]);

  useEffect(() => {
    if (!enabled) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    // Initial refresh after 1 second (give time for login to complete)
    const initialTimeout = setTimeout(() => {
      refreshCookie();
    }, 1000);

    // Set up interval for subsequent refreshes
    intervalRef.current = setInterval(refreshCookie, REFRESH_INTERVAL);

    // Cleanup
    return () => {
      clearTimeout(initialTimeout);
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, refreshCookie]);

  return {
    lastRefresh: lastRefreshRef.current,
    refreshNow: refreshCookie,
  };
}
