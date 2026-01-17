'use client';

import { useEffect, useRef, useCallback } from 'react';

interface UseActivityTimeoutOptions {
  timeoutMs?: number; // Default 10 minutes
  onTimeout: () => void;
  enabled?: boolean;
  syncWithServer?: boolean; // Whether to sync activity with server
}

const DEFAULT_TIMEOUT = 10 * 60 * 1000; // 10 minutes
const ACTIVITY_SYNC_INTERVAL = 60 * 1000; // Sync with server every 1 minute
const THROTTLE_INTERVAL = 5000; // Throttle activity detection to every 5 seconds

export function useActivityTimeout({
  timeoutMs = DEFAULT_TIMEOUT,
  onTimeout,
  enabled = true,
  syncWithServer = true,
}: UseActivityTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  const lastActivityRef = useRef(Date.now());
  const lastSyncRef = useRef(Date.now());
  
  // Keep callback ref updated
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

  // Sync activity with server
  const syncActivity = useCallback(async () => {
    if (!syncWithServer) return;
    
    try {
      const res = await fetch('/api/auth/activity', {
        method: 'POST',
        credentials: 'include',
      });
      
      if (!res.ok) {
        const data = await res.json();
        if (data.shouldLogout) {
          onTimeoutRef.current();
        }
      }
      lastSyncRef.current = Date.now();
    } catch (error) {
      console.error('Failed to sync activity:', error);
    }
  }, [syncWithServer]);

  // Check if session is still active
  const checkSession = useCallback(async () => {
    if (!syncWithServer) return;
    
    try {
      const res = await fetch('/api/auth/activity', {
        method: 'GET',
        credentials: 'include',
      });
      
      const data = await res.json();
      if (data.shouldLogout) {
        onTimeoutRef.current();
      }
    } catch (error) {
      console.error('Failed to check session:', error);
    }
  }, [syncWithServer]);

  useEffect(() => {
    if (!enabled) return;

    const resetTimer = () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      timeoutRef.current = setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    };

    // Activity events
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click', 'keypress'];
    
    // Throttle to prevent excessive resets
    let lastReset = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      lastActivityRef.current = now;
      
      if (now - lastReset > THROTTLE_INTERVAL) {
        lastReset = now;
        resetTimer();
        
        // Sync with server if enough time has passed
        if (syncWithServer && now - lastSyncRef.current > ACTIVITY_SYNC_INTERVAL) {
          syncActivity();
        }
      }
    };

    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start timer
    resetTimer();
    
    // Initial sync and periodic session check
    if (syncWithServer) {
      syncActivity();
      syncIntervalRef.current = setInterval(() => {
        // If no activity for a while, check if session is still valid
        if (Date.now() - lastActivityRef.current > ACTIVITY_SYNC_INTERVAL) {
          checkSession();
        }
      }, ACTIVITY_SYNC_INTERVAL);
    }

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
      if (syncIntervalRef.current) {
        clearInterval(syncIntervalRef.current);
      }
    };
  }, [timeoutMs, enabled, syncWithServer, syncActivity, checkSession]);

  const resetTimeout = useCallback(() => {
    lastActivityRef.current = Date.now();
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    }
  }, [enabled, timeoutMs]);

  return { resetTimeout, syncActivity };
}
