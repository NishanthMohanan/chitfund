import { type ReactNode } from 'react';
import { usePageTitle } from '../../app/page-title';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { PageHeader } from '../../ui/PageHeader';
import { type IconComponent } from '../../ui/icon';

/** A section with nothing to list yet: page header plus its empty state. */
export function EmptySection({
  icon,
  message,
  action,
}: {
  icon: IconComponent;
  message: string;
  action?: ReactNode;
}) {
  const title = usePageTitle();

  return (
    <>
      <PageHeader title={title} />
      <Card flush>
        <EmptyState icon={icon} message={message} action={action} />
      </Card>
    </>
  );
}
