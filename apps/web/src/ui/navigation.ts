import { type IconComponent } from './icon';

export type NavItem = {
  to: string;
  label: string;
  icon: IconComponent;
  /** Match the path exactly, for section home routes. */
  end?: boolean;
};
