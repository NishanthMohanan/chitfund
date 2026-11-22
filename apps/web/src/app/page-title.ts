import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useMatches } from 'react-router';
import { type NavKey } from './navigation';

export type RouteHandle = { titleKey: NavKey | 'auth.signInTitle' | 'notFound.title' };

function isRouteHandle(value: unknown): value is RouteHandle {
  return typeof value === 'object' && value !== null && 'titleKey' in value;
}

/** Title of the deepest matched route, shared by the app bar, page header and tab title. */
export function usePageTitle(): string {
  const { t } = useTranslation();
  const matches = useMatches();
  const handle = [...matches].reverse().find((match) => isRouteHandle(match.handle))?.handle;
  const appName = t('app.name');
  const title = isRouteHandle(handle) ? t(handle.titleKey) : appName;

  useEffect(() => {
    document.title = title === appName ? appName : `${title} · ${appName}`;
  }, [title, appName]);

  return title;
}
