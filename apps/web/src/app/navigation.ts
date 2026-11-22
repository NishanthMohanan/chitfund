import {
  Activity,
  Dashboard,
  Events,
  Home,
  Money,
  Notification,
  OverflowMenuHorizontal,
  Receipt,
  UserAdmin,
  UserAvatar,
  UserMultiple,
} from '@carbon/icons-react';
import { type Role } from '@chitfund/shared';
import type en from '../locales/en/common.json';
import { type IconComponent } from '../ui/icon';

export type NavKey = `nav.${keyof (typeof en)['nav']}`;

export type NavDefinition = {
  to: string;
  labelKey: NavKey;
  icon: IconComponent;
  end?: boolean;
};

export const ROLE_HOME: Record<Role, string> = {
  MEMBER: '/m',
  ORGANIZER: '/o',
  SUPERADMIN: '/admin',
};

export const NAVIGATION: Record<Role, readonly NavDefinition[]> = {
  MEMBER: [
    { to: '/m', labelKey: 'nav.home', icon: Home, end: true },
    { to: '/m/groups', labelKey: 'nav.groups', icon: UserMultiple },
    { to: '/m/payments', labelKey: 'nav.payments', icon: Receipt },
    { to: '/m/notifications', labelKey: 'nav.notifications', icon: Notification },
    { to: '/m/profile', labelKey: 'nav.profile', icon: UserAvatar },
  ],
  ORGANIZER: [
    { to: '/o', labelKey: 'nav.dashboard', icon: Dashboard, end: true },
    { to: '/o/groups', labelKey: 'nav.groups', icon: UserMultiple },
    { to: '/o/members', labelKey: 'nav.members', icon: Events },
    { to: '/o/collections', labelKey: 'nav.collections', icon: Money },
    { to: '/o/more', labelKey: 'nav.more', icon: OverflowMenuHorizontal },
  ],
  SUPERADMIN: [
    { to: '/admin', labelKey: 'nav.overview', icon: Dashboard, end: true },
    { to: '/admin/organizers', labelKey: 'nav.organizers', icon: UserAdmin },
    { to: '/admin/groups', labelKey: 'nav.groups', icon: UserMultiple },
    { to: '/admin/activity', labelKey: 'nav.activity', icon: Activity },
    { to: '/admin/profile', labelKey: 'nav.profile', icon: UserAvatar },
  ],
};
