import { type ReactNode, useCallback, useEffect, useMemo, useState } from 'react';
import {
  type ResolvedTheme,
  type ThemePreference,
  applyTheme,
  readThemePreference,
  resolveTheme,
  storeThemePreference,
  watchSystemTheme,
} from '../lib/theme';
import { ThemeContext } from './theme-context';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState<ThemePreference>(readThemePreference);
  const [resolved, setResolved] = useState<ResolvedTheme>(() => resolveTheme(preference));

  useEffect(() => {
    const update = () => {
      const next = resolveTheme(preference);
      setResolved(next);
      applyTheme(next);
    };
    update();
    return preference === 'system' ? watchSystemTheme(update) : undefined;
  }, [preference]);

  const setPreference = useCallback((next: ThemePreference) => {
    storeThemePreference(next);
    setPreferenceState(next);
  }, []);

  const value = useMemo(
    () => ({ preference, resolved, setPreference }),
    [preference, resolved, setPreference],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
