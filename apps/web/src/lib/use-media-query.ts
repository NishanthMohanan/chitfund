import { useCallback, useSyncExternalStore } from 'react';

export const DESKTOP_QUERY = '(min-width: 1024px)';

export function useMediaQuery(query: string): boolean {
  const subscribe = useCallback(
    (onChange: () => void) => {
      const list = window.matchMedia(query);
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [query],
  );

  return useSyncExternalStore(
    subscribe,
    () => window.matchMedia(query).matches,
    () => false,
  );
}

/** Mobile-first: everything below 1024px uses the phone layout. */
export function useIsDesktop(): boolean {
  return useMediaQuery(DESKTOP_QUERY);
}
