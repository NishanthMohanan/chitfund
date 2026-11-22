import { type Role } from '@chitfund/shared';
import { useTranslation } from 'react-i18next';
import { Outlet } from 'react-router';
import { AppBar } from '../../ui/AppBar';
import { BottomTabBar } from '../../ui/BottomTabBar';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { Sidebar } from '../../ui/Sidebar';
import { type NavItem } from '../../ui/navigation';
import { NAVIGATION } from '../navigation';
import { usePageTitle } from '../page-title';

/**
 * Mobile-first shell: top app bar and bottom tabs on phones, a 240px sidebar
 * from 1024px. Content is capped at 1200px.
 */
export function AppShell({ role }: { role: Role }) {
  const { t } = useTranslation();
  const title = usePageTitle();
  const items: NavItem[] = NAVIGATION[role].map((item) => ({ ...item, label: t(item.labelKey) }));

  return (
    <div className="min-h-dvh bg-bg">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-md focus:bg-surface focus:px-4 focus:py-2 focus:shadow-overlay"
      >
        {t('app.skipToContent')}
      </a>
      <Sidebar
        items={items}
        label={t('app.mainNavigation')}
        appName={t('app.name')}
        footer={t(`roles.${role}`)}
      />
      <div className="lg:pl-60">
        <AppBar title={title} />
        <OfflineBanner message={t('app.offline')} />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1200px] px-safe pb-[calc(88px+env(safe-area-inset-bottom))] pt-4 outline-none lg:px-8 lg:pb-8 lg:pt-8"
        >
          <Outlet />
        </main>
      </div>
      <BottomTabBar items={items} label={t('app.mainNavigation')} />
    </div>
  );
}
