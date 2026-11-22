import { ChevronLeft, ChevronRight } from '@carbon/icons-react';
import { useTranslation } from 'react-i18next';
import { Button } from './Button';
import { IconButton } from './IconButton';

export type PaginationProps = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  onPageChange: (page: number) => void;
};

/** Numbered pagination for desktop tables, driven by the server's page metadata. */
export function Pagination({ page, pageSize, total, totalPages, onPageChange }: PaginationProps) {
  const { t } = useTranslation();
  const from = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);

  return (
    <nav
      aria-label={t('pagination.label')}
      className="flex items-center justify-between gap-4 border-t border-border px-4 py-2"
    >
      <p className="text-body-sm text-text-secondary tabular">
        {t('pagination.summary', { from, to, total })}
      </p>
      <div className="flex items-center gap-1">
        <span className="mr-2 text-body-sm text-text-secondary tabular">
          {t('pagination.page', { page, totalPages: Math.max(totalPages, 1) })}
        </span>
        <IconButton
          icon={ChevronLeft}
          label={t('actions.previousPage')}
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        />
        <IconButton
          icon={ChevronRight}
          label={t('actions.nextPage')}
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        />
      </div>
    </nav>
  );
}

export type LoadMoreProps = {
  shown: number;
  total: number;
  hasMore: boolean;
  loading: boolean;
  onLoadMore: () => void;
};

/** Phone lists append the next server page instead of paging. */
export function LoadMore({ shown, total, hasMore, loading, onLoadMore }: LoadMoreProps) {
  const { t } = useTranslation();

  return (
    <div className="flex flex-col items-stretch gap-2 border-t border-border px-4 py-3">
      <p className="text-center text-body-sm text-text-secondary tabular">
        {t('pagination.showing', { shown, total })}
      </p>
      {hasMore && (
        <Button
          variant="secondary"
          fullWidth
          pending={loading}
          requiresNetwork
          onClick={onLoadMore}
        >
          {t('actions.loadMore')}
        </Button>
      )}
    </div>
  );
}
