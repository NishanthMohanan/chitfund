import { Navigate, type RouteObject, createBrowserRouter } from 'react-router';
import { ActivityPage, OrganizersPage } from '../features/admin/AdminPages';
import { SignInPage } from '../features/auth/SignInPage';
import { CollectionsPage } from '../features/collections/CollectionsPage';
import {
  AdminOverviewPage,
  MemberHomePage,
  OrganizerDashboardPage,
} from '../features/dashboard/DashboardPages';
import { GroupsPage } from '../features/groups/GroupsPage';
import { MembersPage } from '../features/members/MembersPage';
import { NotificationsPage } from '../features/notifications/NotificationsPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { ProfilePage } from '../features/profile/ProfilePage';
import { NotFoundPage } from './NotFoundPage';
import { AppShell } from './layouts/AppShell';
import { type RouteHandle } from './page-title';

const handle = (titleKey: RouteHandle['titleKey']): RouteHandle => ({ titleKey });

export const routes: RouteObject[] = [
  { path: '/', element: <Navigate to="/sign-in" replace /> },
  { path: '/sign-in', element: <SignInPage />, handle: handle('auth.signInTitle') },
  {
    path: '/m',
    element: <AppShell role="MEMBER" />,
    children: [
      { index: true, element: <MemberHomePage />, handle: handle('nav.home') },
      { path: 'groups', element: <GroupsPage role="MEMBER" />, handle: handle('nav.groups') },
      { path: 'payments', element: <PaymentsPage />, handle: handle('nav.payments') },
      {
        path: 'notifications',
        element: <NotificationsPage />,
        handle: handle('nav.notifications'),
      },
      { path: 'profile', element: <ProfilePage />, handle: handle('nav.profile') },
    ],
  },
  {
    path: '/o',
    element: <AppShell role="ORGANIZER" />,
    children: [
      { index: true, element: <OrganizerDashboardPage />, handle: handle('nav.dashboard') },
      { path: 'groups', element: <GroupsPage role="ORGANIZER" />, handle: handle('nav.groups') },
      { path: 'members', element: <MembersPage />, handle: handle('nav.members') },
      { path: 'collections', element: <CollectionsPage />, handle: handle('nav.collections') },
      { path: 'more', element: <ProfilePage />, handle: handle('nav.more') },
    ],
  },
  {
    path: '/admin',
    element: <AppShell role="SUPERADMIN" />,
    children: [
      { index: true, element: <AdminOverviewPage />, handle: handle('nav.overview') },
      { path: 'organizers', element: <OrganizersPage />, handle: handle('nav.organizers') },
      { path: 'groups', element: <GroupsPage role="SUPERADMIN" />, handle: handle('nav.groups') },
      { path: 'activity', element: <ActivityPage />, handle: handle('nav.activity') },
      { path: 'profile', element: <ProfilePage />, handle: handle('nav.profile') },
    ],
  },
  { path: '*', element: <NotFoundPage />, handle: handle('notFound.title') },
];

export const router = createBrowserRouter(routes);
