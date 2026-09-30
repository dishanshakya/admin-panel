'use client';

import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

const LoadingContext = createContext(null);

export function useLoading() {
  const ctx = useContext(LoadingContext);
  if (!ctx) {
    throw new Error('useLoading must be used inside <LoadingProvider>');
  }
  return ctx;
}

// Fires whenever the route finishes changing. Lives in its own component so
// the Suspense boundary that useSearchParams requires stays small.
function RouteWatcher({ onRouteChange }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    onRouteChange();
  }, [pathname, searchParams, onRouteChange]);

  return null;
}

const defaultShouldTrack = (url) =>
  !url.includes('_rsc=') && !url.includes('/_next/');

export function LoadingProvider({
  children,
  colorClass = 'bg-primary-blue text-primary-blue', // bg = bar fill, text = glow color
  heightClass = 'h-[3px]',
  trackNavigation = true,
  trackFetch = false,
  shouldTrackFetch = defaultShouldTrack,
}) {
  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const active = useRef(0); // number of things currently loading
  const trickleTimer = useRef(null);
  const hideTimer = useRef(null);
  const resetTimer = useRef(null);
  const routePending = useRef(false);
  const routeTimeout = useRef(null);

  const start = useCallback(() => {
    active.current += 1;
    if (active.current > 1) return; // bar is already running

    clearTimeout(hideTimer.current);
    clearTimeout(resetTimer.current);
    clearInterval(trickleTimer.current);

    setVisible(true);
    setProgress(10);

    // Creep toward 90% and slow down as it gets closer.
    trickleTimer.current = setInterval(() => {
      setProgress((p) => (p >= 90 ? p : p + (90 - p) * (0.04 + Math.random() * 0.1)));
    }, 300);
  }, []);

  const done = useCallback(() => {
    active.current = Math.max(0, active.current - 1);
    if (active.current > 0) return; // something else is still loading

    clearInterval(trickleTimer.current);
    setProgress(100);
    hideTimer.current = setTimeout(() => setVisible(false), 250);
    resetTimer.current = setTimeout(() => setProgress(0), 600);
  }, []);

  // Wrap a promise (or a function returning one) so the bar follows it.
  const track = useCallback(
    async (work) => {
      start();
      try {
        return await (typeof work === 'function' ? work() : work);
      } finally {
        done();
      }
    },
    [start, done],
  );

  const finishNavigation = useCallback(() => {
    if (!routePending.current) return;
    routePending.current = false;
    clearTimeout(routeTimeout.current);
    done();
  }, [done]);

  const startNavigation = useCallback(() => {
    if (routePending.current) return;
    routePending.current = true;
    start();
    // Safety net: never leave the bar stuck if the route never changes.
    routeTimeout.current = setTimeout(finishNavigation, 10000);
  }, [start, finishNavigation]);

  // Start the bar when an internal link is clicked.
  useEffect(() => {
    if (!trackNavigation) return;

    const onClick = (e) => {
      if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) {
        return;
      }
      const a = e.target.closest?.('a[href]');
      if (!a || a.target === '_blank' || a.hasAttribute('download')) return;

      const url = new URL(a.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (
        url.pathname === window.location.pathname &&
        url.search === window.location.search
      ) {
        return;
      }

      startNavigation();
    };

    // Capture phase, so this runs before Next's <Link> calls preventDefault.
    document.addEventListener('click', onClick, true);
    return () => document.removeEventListener('click', onClick, true);
  }, [trackNavigation, startNavigation]);

  // Optionally follow every fetch call.
  useEffect(() => {
    if (!trackFetch) return;

    const originalFetch = window.fetch;
    window.fetch = (input, init) => {
      const url = typeof input === 'string' ? input : (input?.url ?? String(input));
      if (!shouldTrackFetch(url)) return originalFetch(input, init);

      start();
      return originalFetch(input, init).finally(done);
    };

    return () => {
      window.fetch = originalFetch;
    };
  }, [trackFetch, shouldTrackFetch, start, done]);

  // Clean up timers on unmount.
  useEffect(
    () => () => {
      clearInterval(trickleTimer.current);
      clearTimeout(hideTimer.current);
      clearTimeout(resetTimer.current);
      clearTimeout(routeTimeout.current);
    },
    [],
  );

  const value = useMemo(
    () => ({ start, done, track, startNavigation }),
    [start, done, track, startNavigation],
  );

  return (
    <LoadingContext.Provider value={value}>
      {trackNavigation && (
        <Suspense fallback={null}>
          <RouteWatcher onRouteChange={finishNavigation} />
        </Suspense>
      )}

      <div
        aria-hidden="true"
        className={`pointer-events-none fixed inset-x-0 top-0 z-[9999] transition-opacity duration-300 ${heightClass} ${
          visible ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`h-full w-full origin-left shadow-[0_0_10px_currentColor,0_0_5px_currentColor] transition-transform duration-300 ease-out ${colorClass}`}
          style={{ transform: `scaleX(${progress / 100})` }}
        />
      </div>

      {children}
    </LoadingContext.Provider>
  );
}

