'use client';

import { useEffect, useRef } from 'react';

interface UseActivityTimeoutOptions {
  timeoutMs: number;
  onTimeout: () => void;
  enabled?: boolean;
}

export function useActivityTimeout({
  timeoutMs,
  onTimeout,
  enabled = true,
}: UseActivityTimeoutOptions) {
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onTimeoutRef = useRef(onTimeout);
  
  // Keep callback ref updated
  useEffect(() => {
    onTimeoutRef.current = onTimeout;
  }, [onTimeout]);

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
    const events = ['mousedown', 'mousemove', 'keydown', 'scroll', 'touchstart', 'click'];
    
    // Throttle to prevent excessive resets
    let lastReset = Date.now();
    const handleActivity = () => {
      const now = Date.now();
      if (now - lastReset > 5000) { // Only reset every 5 seconds
        lastReset = now;
        resetTimer();
      }
    };

    // Add listeners
    events.forEach(event => {
      window.addEventListener(event, handleActivity, { passive: true });
    });

    // Start timer
    resetTimer();

    return () => {
      events.forEach(event => {
        window.removeEventListener(event, handleActivity);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [timeoutMs, enabled]);

  const resetTimeout = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    if (enabled) {
      timeoutRef.current = setTimeout(() => {
        onTimeoutRef.current();
      }, timeoutMs);
    }
  };

  return { resetTimeout };
}
