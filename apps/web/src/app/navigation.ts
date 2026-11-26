import {
  Catalog,
  Dashboard,
  Events,
  Receipt,
  Settings,
  UserMultiple,
  WarningAlt,
} from '@carbon/icons-react';
import type en from '../locales/en/common.json';
import { type IconComponent } from '../ui/icon';

export type NavKey = `nav.${keyof (typeof en)['nav']}`;

export type NavDefinition = {
  to: string;
  labelKey: NavKey;
  icon: IconComponent;
  end?: boolean;
  /** Shown in the phone tab bar, which holds at most five destinations. */
  onPhone?: boolean;
};

/** The organizer's sections. There is one login, so there is one menu. */
export const NAVIGATION: readonly NavDefinition[] = [
  { to: '/', labelKey: 'nav.dashboard', icon: Dashboard, end: true, onPhone: true },
  { to: '/groups', labelKey: 'nav.groups', icon: UserMultiple, onPhone: true },
  { to: '/plans', labelKey: 'nav.plans', icon: Catalog },
  { to: '/members', labelKey: 'nav.members', icon: Events, onPhone: true },
  { to: '/payments', labelKey: 'nav.payments', icon: Receipt, onPhone: true },
  { to: '/dues', labelKey: 'nav.dues', icon: WarningAlt, onPhone: true },
  { to: '/settings', labelKey: 'nav.settings', icon: Settings },
];
