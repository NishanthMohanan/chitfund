import { NavLink } from 'react-router';
import { cn } from './cn';
import { ICON_SIZE } from './icon';
import { type NavItem } from './navigation';

/** Primary navigation on phones. Up to five destinations, always labelled. */
export function BottomTabBar({ items, label }: { items: readonly NavItem[]; label: string }) {
  return (
    <nav
      aria-label={label}
      className="fixed inset-x-0 bottom-0 z-30 border-t border-border bg-surface pb-safe lg:hidden"
    >
      <ul className="grid auto-cols-fr grid-flow-col">
        {items.map(({ to, label: itemLabel, icon: Icon, end }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={end}
              className={({ isActive }) =>
                cn(
                  'relative flex h-16 flex-col items-center justify-center gap-1 px-1 text-caption font-medium',
                  isActive ? 'text-primary' : 'text-text-secondary',
                )
              }
            >
              {({ isActive }) => (
                <>
                  {isActive && (
                    <span aria-hidden className="absolute inset-x-4 top-0 h-0.5 bg-primary" />
                  )}
                  <Icon size={ICON_SIZE.standalone} aria-hidden />
                  <span className="max-w-full truncate">{itemLabel}</span>
                </>
              )}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
