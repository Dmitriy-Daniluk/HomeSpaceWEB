import { useEffect, useRef } from 'react';

export default function useAutoRefresh(callback, options = {}) {
  const {
    enabled = true,
    intervalMs = 15000,
    refreshOnFocus = true,
    refreshOnVisible = true,
    onlyWhenVisible = true,
    runImmediately = false,
  } = options;
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    if (!enabled || typeof window === 'undefined') return undefined;

    const run = () => {
      if (
        onlyWhenVisible
        && typeof document !== 'undefined'
        && document.visibilityState !== 'visible'
      ) {
        return;
      }

      callbackRef.current?.();
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible' && refreshOnVisible) {
        callbackRef.current?.();
      }
    };

    if (runImmediately) {
      run();
    }

    if (refreshOnFocus) {
      window.addEventListener('focus', run);
    }

    if (refreshOnVisible) {
      document.addEventListener('visibilitychange', handleVisibilityChange);
    }

    const intervalId = intervalMs ? window.setInterval(run, intervalMs) : null;

    return () => {
      if (intervalId) {
        window.clearInterval(intervalId);
      }

      if (refreshOnFocus) {
        window.removeEventListener('focus', run);
      }

      if (refreshOnVisible) {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      }
    };
  }, [enabled, intervalMs, refreshOnFocus, refreshOnVisible, onlyWhenVisible, runImmediately]);
}
