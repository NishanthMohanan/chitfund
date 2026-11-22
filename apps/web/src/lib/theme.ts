export type ThemePreference = 'system' | 'light' | 'dark';
export type ResolvedTheme = 'light' | 'dark';

const STORAGE_KEY = 'chitfund.theme';
const DARK_QUERY = '(prefers-color-scheme: dark)';

export function parseThemePreference(value: string | null): ThemePreference {
  return value === 'light' || value === 'dark' ? value : 'system';
}

export function readThemePreference(): ThemePreference {
  try {
    return parseThemePreference(window.localStorage.getItem(STORAGE_KEY));
  } catch {
    return 'system';
  }
}

export function storeThemePreference(preference: ThemePreference): void {
  try {
    if (preference === 'system') {
      window.localStorage.removeItem(STORAGE_KEY);
    } else {
      window.localStorage.setItem(STORAGE_KEY, preference);
    }
  } catch {
    // Storage can be unavailable (private browsing); the choice then lasts for the session.
  }
}

export function resolveTheme(preference: ThemePreference): ResolvedTheme {
  if (preference !== 'system') {
    return preference;
  }
  return window.matchMedia(DARK_QUERY).matches ? 'dark' : 'light';
}

const THEME_COLORS: Record<ResolvedTheme, string> = { light: '#0F4C81', dark: '#171B20' };

export function applyTheme(theme: ResolvedTheme): void {
  document.documentElement.dataset.theme = theme;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', THEME_COLORS[theme]);
}

export function watchSystemTheme(onChange: () => void): () => void {
  const list = window.matchMedia(DARK_QUERY);
  list.addEventListener('change', onChange);
  return () => list.removeEventListener('change', onChange);
}
