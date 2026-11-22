import { type ReactNode } from 'react';
import { cn } from './cn';

export type CardProps = {
  title?: string;
  description?: string;
  actions?: ReactNode;
  /** Removes inner padding so lists and tables can run edge to edge. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
};

export function Card({
  title,
  description,
  actions,
  flush = false,
  className,
  children,
}: CardProps) {
  const hasHeader = Boolean(title || actions);

  return (
    <section className={cn('rounded-md border border-border bg-surface', className)}>
      {hasHeader && (
        <header className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 lg:px-6">
          <div className="min-w-0">
            {title && <h2 className="text-subheading font-semibold text-text">{title}</h2>}
            {description && <p className="text-body-sm text-text-secondary">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(!flush && 'p-4 lg:p-6')}>{children}</div>
    </section>
  );
}
