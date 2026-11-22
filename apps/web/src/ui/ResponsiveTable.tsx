import { ChevronRight } from '@carbon/icons-react';
import { type ReactNode } from 'react';
import { useIsDesktop } from '../lib/use-media-query';
import { cn } from './cn';
import { ICON_SIZE } from './icon';

export type Column<T> = {
  key: string;
  header: string;
  cell: (row: T) => ReactNode;
  align?: 'start' | 'end';
  /** Shown as the row title on phones. Exactly one column should set this. */
  primary?: boolean;
  /** Omitted from the phone layout to keep rows short. */
  hideOnMobile?: boolean;
};

export type ResponsiveTableProps<T> = {
  caption: string;
  columns: readonly Column<T>[];
  rows: readonly T[];
  getRowKey: (row: T) => string;
  onRowClick?: (row: T) => void;
};

/** A table on desktop; on phones each row becomes a list item with label and value pairs. */
export function ResponsiveTable<T>(props: ResponsiveTableProps<T>) {
  return useIsDesktop() ? <DesktopTable {...props} /> : <MobileList {...props} />;
}

function DesktopTable<T>({
  caption,
  columns,
  rows,
  getRowKey,
  onRowClick,
}: ResponsiveTableProps<T>) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-body-sm">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr className="border-b border-border bg-surface-muted">
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                className={cn(
                  'h-10 px-4 font-medium text-text-secondary',
                  column.align === 'end' ? 'text-right' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={getRowKey(row)}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              className={cn(
                'border-b border-border last:border-b-0',
                onRowClick && 'cursor-pointer hover:bg-surface-muted',
              )}
            >
              {columns.map((column, index) => (
                <td
                  key={column.key}
                  className={cn(
                    'h-12 px-4 text-text',
                    column.align === 'end' ? 'text-right' : 'text-left',
                  )}
                >
                  {index === 0 && onRowClick ? (
                    <button
                      type="button"
                      onClick={(event) => {
                        event.stopPropagation();
                        onRowClick(row);
                      }}
                      className="text-left font-medium text-primary hover:underline"
                    >
                      {column.cell(row)}
                    </button>
                  ) : (
                    column.cell(row)
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function MobileList<T>({ caption, columns, rows, getRowKey, onRowClick }: ResponsiveTableProps<T>) {
  const primary = columns.find((column) => column.primary) ?? columns[0];
  const details = columns.filter((column) => column !== primary && !column.hideOnMobile);

  return (
    <ul aria-label={caption} className="divide-y divide-border">
      {rows.map((row) => {
        const content = (
          <>
            <div className="min-w-0 flex-1">
              <div className="text-body font-medium text-text">{primary?.cell(row)}</div>
              <dl className="mt-1 flex flex-col gap-1">
                {details.map((column) => (
                  <div key={column.key} className="flex items-center justify-between gap-4">
                    <dt className="text-body-sm text-text-secondary">{column.header}</dt>
                    <dd className="text-right text-body-sm text-text">{column.cell(row)}</dd>
                  </div>
                ))}
              </dl>
            </div>
            {onRowClick && (
              <ChevronRight
                size={ICON_SIZE.standalone}
                aria-hidden
                className="shrink-0 text-text-muted"
              />
            )}
          </>
        );

        return (
          <li key={getRowKey(row)}>
            {onRowClick ? (
              <button
                type="button"
                onClick={() => onRowClick(row)}
                className="flex w-full items-center gap-3 px-4 py-3 text-left active:bg-surface-muted"
              >
                {content}
              </button>
            ) : (
              <div className="flex items-center gap-3 px-4 py-3">{content}</div>
            )}
          </li>
        );
      })}
    </ul>
  );
}
