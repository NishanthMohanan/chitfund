import { Logout } from '@carbon/icons-react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { Navigate, Outlet, useNavigate } from 'react-router';
import { ApiError } from '../../lib/api';
import { chitApi } from '../../lib/chit-api';
import { AppBar } from '../../ui/AppBar';
import { BottomTabBar } from '../../ui/BottomTabBar';
import { Button } from '../../ui/Button';
import { OfflineBanner } from '../../ui/OfflineBanner';
import { Sidebar } from '../../ui/Sidebar';
import { Skeleton } from '../../ui/Skeleton';
import { type NavItem } from '../../ui/navigation';
import { NAVIGATION } from '../navigation';
import { usePageTitle } from '../page-title';

/**
 * Laptop-first shell: a 240px sidebar from 1024px, with a top bar and tabs on
 * smaller screens. Every page inside needs a signed-in session.
 */
export function AppShell() {
  const { t } = useTranslation();
  const title = usePageTitle();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const session = useQuery({
    queryKey: ['session'],
    queryFn: ({ signal }) => chitApi.me(signal),
    staleTime: 5 * 60_000,
  });
  const signOut = useMutation({
    mutationFn: chitApi.logout,
    onSettled: () => {
      queryClient.clear();
      void navigate('/sign-in', { replace: true });
    },
  });

  if (session.error instanceof ApiError && session.error.status === 401) {
    return <Navigate to="/sign-in" replace />;
  }

  const items: NavItem[] = NAVIGATION.map((item) => ({ ...item, label: t(item.labelKey) }));
  const phoneItems = NAVIGATION.flatMap((item, index) =>
    item.onPhone ? [items[index] as NavItem] : [],
  );

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
        footer={
          <div className="flex items-center justify-between gap-2">
            <span className="min-w-0 truncate text-body-sm text-text">
              {session.data?.name ?? ''}
            </span>
            <Button
              variant="ghost"
              size="sm"
              icon={Logout}
              pending={signOut.isPending}
              onClick={() => signOut.mutate()}
            >
              {t('actions.signOut')}
            </Button>
          </div>
        }
      />
      <div className="lg:pl-60">
        <AppBar title={title} />
        <OfflineBanner message={t('app.offline')} />
        <main
          id="main"
          tabIndex={-1}
          className="mx-auto w-full max-w-[1400px] px-safe pb-[calc(88px+env(safe-area-inset-bottom))] pt-4 outline-none lg:px-8 lg:pb-8 lg:pt-8"
        >
          {session.isPending ? (
            <div aria-busy className="flex flex-col gap-4">
              <Skeleton className="h-8 w-1/3" />
              <Skeleton className="h-40 w-full" />
            </div>
          ) : (
            <Outlet />
          )}
        </main>
      </div>
      <BottomTabBar items={phoneItems} label={t('app.mainNavigation')} />
    </div>
  );
}
