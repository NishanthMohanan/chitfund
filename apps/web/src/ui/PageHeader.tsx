import { type ReactNode } from 'react';

export type PageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
};

/**
 * On phones the top app bar already shows the title, so only the description
 * and actions render here; desktop shows the full header.
 */
export function PageHeader({ title, description, actions }: PageHeaderProps) {
  if (!description && !actions) {
    return (
      <h1 className="sr-only lg:not-sr-only lg:mb-6 lg:text-h2 lg:font-semibold lg:text-text">
        {title}
      </h1>
    );
  }

  return (
    <header className="mb-4 flex flex-col gap-3 lg:mb-6 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0">
        <h1 className="sr-only lg:not-sr-only lg:text-h2 lg:font-semibold lg:text-text">{title}</h1>
        {description && <p className="text-body-sm text-text-secondary lg:mt-1">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </header>
  );
}
