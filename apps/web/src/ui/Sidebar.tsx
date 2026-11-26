import { type ReactNode } from 'react';
import { NavLink } from 'react-router';
import { cn } from './cn';
import { ICON_SIZE } from './icon';
import { type NavItem } from './navigation';

export type SidebarProps = {
  items: readonly NavItem[];
  label: string;
  appName: string;
  /** Shown under the navigation, e.g. the signed-in account. */
  footer?: ReactNode;
};

/** Desktop navigation (1024px and up), fixed at 240px. */
export function Sidebar({ items, label, appName, footer }: SidebarProps) {
  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-60 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-14 items-center gap-2 border-b border-border px-4">
        <img src="/logo.svg" alt="" width={24} height={24} className="h-6 w-6" />
        <span className="text-subheading font-semibold text-text">{appName}</span>
      </div>
      <nav aria-label={label} className="flex-1 overflow-y-auto p-2">
        <ul className="flex flex-col gap-1">
          {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
            <li key={to}>
              <NavLink
                to={to}
                end={end}
                className={({ isActive }) =>
                  cn(
                    'flex h-10 items-center gap-3 rounded-md px-3 text-body-sm transition-colors duration-150 ease-out',
                    isActive
                      ? 'bg-primary-subtle font-medium text-primary'
                      : 'text-text-secondary hover:bg-surface-muted hover:text-text',
                  )
                }
              >
                <Icon size={ICON_SIZE.standalone} aria-hidden />
                {itemLabel}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
      {footer && (
        <div className="border-t border-border px-4 py-3 text-caption text-text-secondary">
          {footer}
        </div>
      )}
    </aside>
  );
}
