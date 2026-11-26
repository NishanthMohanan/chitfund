import { type Paginated } from '@chitfund/shared';
import { type UseQueryResult } from '@tanstack/react-query';
import { type ReactNode } from 'react';
import { errorMessage } from '../../lib/form-helpers';
import { Card } from '../../ui/Card';
import { EmptyState } from '../../ui/EmptyState';
import { InlineAlert } from '../../ui/InlineAlert';
import { Pagination } from '../../ui/Pagination';
import { type Column, ResponsiveTable } from '../../ui/ResponsiveTable';
import { SkeletonListRows } from '../../ui/Skeleton';
import { type IconComponent } from '../../ui/icon';

export type PagedTableProps<T> = {
  query: UseQueryResult<Paginated<T>>;
  caption: string;
  columns: readonly Column<T>[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
  onPageChange: (page: number) => void;
  emptyIcon: IconComponent;
  emptyMessage: string;
  emptyAction?: ReactNode;
  title?: string;
  actions?: ReactNode;
  /** Filters shown above the table inside the card. */
  toolbar?: ReactNode;
};

/** A server-paginated table inside a card, with loading, error and empty states. */
export function PagedTable<T>({
  query,
  caption,
  columns,
  getRowKey,
  onRowClick,
  onPageChange,
  emptyIcon,
  emptyMessage,
  emptyAction,
  title,
  actions,
  toolbar,
}: PagedTableProps<T>) {
  const data = query.data;

  return (
    <Card flush title={title} actions={actions}>
      {toolbar && <div className="border-b border-border px-4 py-3 lg:px-6">{toolbar}</div>}
      <div aria-busy={query.isPending || undefined}>
        {query.isPending ? (
          <SkeletonListRows />
        ) : query.isError ? (
          <div className="p-4">
            <InlineAlert tone="danger">{errorMessage(query.error)}</InlineAlert>
          </div>
        ) : data && data.items.length === 0 ? (
          <EmptyState icon={emptyIcon} message={emptyMessage} action={emptyAction} />
        ) : data ? (
          <>
            <ResponsiveTable
              caption={caption}
              columns={columns}
              rows={data.items}
              getRowKey={getRowKey}
              onRowClick={onRowClick}
            />
            {data.totalPages > 1 && (
              <Pagination
                page={data.page}
                pageSize={data.pageSize}
                total={data.total}
                totalPages={data.totalPages}
                onPageChange={onPageChange}
              />
            )}
          </>
        ) : null}
      </div>
    </Card>
  );
}
