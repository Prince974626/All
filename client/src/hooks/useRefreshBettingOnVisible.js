import { useEffect, useRef } from 'react';

/**
 * When the browser tab becomes visible/focused again, refetch betting data
 * so the UI does not stay stuck on stale markets missed while backgrounded.
 */
export default function useRefreshBettingOnVisible(gameid, refreshFn) {
  const refreshRef = useRef(refreshFn);
  refreshRef.current = refreshFn;

  useEffect(() => {
    if (!gameid) return;

    let lastRefreshAt = 0;
    const refreshIfVisible = () => {
      if (document.visibilityState !== 'visible') return;
      const now = Date.now();
      // Debounce focus+visibility double-fire
      if (now - lastRefreshAt < 800) return;
      lastRefreshAt = now;
      refreshRef.current?.(gameid);
    };

    document.addEventListener('visibilitychange', refreshIfVisible);
    window.addEventListener('focus', refreshIfVisible);
    window.addEventListener('pageshow', refreshIfVisible);

    return () => {
      document.removeEventListener('visibilitychange', refreshIfVisible);
      window.removeEventListener('focus', refreshIfVisible);
      window.removeEventListener('pageshow', refreshIfVisible);
    };
  }, [gameid]);
}
