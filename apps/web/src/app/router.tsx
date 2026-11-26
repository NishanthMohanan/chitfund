import { type RouteObject, createBrowserRouter } from 'react-router';
import { SignInPage } from '../features/auth/SignInPage';
import { DashboardPage } from '../features/dashboard/DashboardPage';
import { DuesPage } from '../features/dues/DuesPage';
import { GroupDetailPage } from '../features/groups/GroupDetailPage';
import { GroupsPage } from '../features/groups/GroupsPage';
import { TicketDetailPage } from '../features/groups/TicketDetailPage';
import { MemberDetailPage } from '../features/members/MemberDetailPage';
import { MembersPage } from '../features/members/MembersPage';
import { PaymentsPage } from '../features/payments/PaymentsPage';
import { PlanFormPage } from '../features/plans/PlanFormPage';
import { PlansPage } from '../features/plans/PlansPage';
import { SettingsPage } from '../features/settings/SettingsPage';
import { NotFoundPage } from './NotFoundPage';
import { AppShell } from './layouts/AppShell';
import { type RouteHandle } from './page-title';

const handle = (titleKey: RouteHandle['titleKey']): RouteHandle => ({ titleKey });

export const routes: RouteObject[] = [
  { path: '/sign-in', element: <SignInPage />, handle: handle('auth.signInTitle') },
  {
    path: '/',
    element: <AppShell />,
    children: [
      { index: true, element: <DashboardPage />, handle: handle('nav.dashboard') },
      { path: 'groups', element: <GroupsPage />, handle: handle('nav.groups') },
      { path: 'groups/:groupId', element: <GroupDetailPage />, handle: handle('nav.groups') },
      {
        path: 'groups/:groupId/tickets/:ticketId',
        element: <TicketDetailPage />,
        handle: handle('nav.groups'),
      },
      { path: 'plans', element: <PlansPage />, handle: handle('nav.plans') },
      { path: 'plans/new', element: <PlanFormPage />, handle: handle('nav.plans') },
      { path: 'plans/:planId', element: <PlanFormPage />, handle: handle('nav.plans') },
      { path: 'members', element: <MembersPage />, handle: handle('nav.members') },
      { path: 'members/:memberId', element: <MemberDetailPage />, handle: handle('nav.members') },
      { path: 'payments', element: <PaymentsPage />, handle: handle('nav.payments') },
      { path: 'dues', element: <DuesPage />, handle: handle('nav.dues') },
      { path: 'settings', element: <SettingsPage />, handle: handle('nav.settings') },
    ],
  },
  { path: '*', element: <NotFoundPage />, handle: handle('notFound.title') },
];

export const router = createBrowserRouter(routes);
