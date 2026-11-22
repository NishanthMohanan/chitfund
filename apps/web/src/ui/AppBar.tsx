import { type ReactNode } from 'react';

/** Phone top bar with the page title. Hidden from 1024px, where the sidebar takes over. */
export function AppBar({ title, actions }: { title: string; actions?: ReactNode }) {
  return (
    <div className="sticky top-0 z-30 border-b border-border bg-surface pt-safe lg:hidden">
      <div className="flex h-14 items-center justify-between gap-2 px-safe">
        <p aria-hidden className="truncate text-subheading font-semibold text-text">
          {title}
        </p>
        {actions && <div className="-mr-2 flex items-center">{actions}</div>}
      </div>
    </div>
  );
}
