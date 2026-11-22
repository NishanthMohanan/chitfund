import { type QueryKey, keepPreviousData, useInfiniteQuery, useQuery } from '@tanstack/react-query';
import { PAGE_SIZE_DEFAULT, type Paginated } from '@chitfund/shared';

export type PageFetcher<T> = (
  page: number,
  pageSize: number,
  signal: AbortSignal,
) => Promise<Paginated<T>>;

export function pageQueryString(page: number, pageSize: number): string {
  return new URLSearchParams({ page: String(page), pageSize: String(pageSize) }).toString();
}

/**
 * Numbered server-side pagination for desktop tables. The previous page stays
 * on screen while the next one loads, so the layout does not jump.
 */
export function usePagedQuery<T>(
  key: QueryKey,
  fetchPage: PageFetcher<T>,
  page: number,
  pageSize = PAGE_SIZE_DEFAULT,
) {
  return useQuery({
    queryKey: [...key, { page, pageSize }],
    queryFn: ({ signal }) => fetchPage(page, pageSize, signal),
    placeholderData: keepPreviousData,
  });
}

/** "Load more" server-side pagination for mobile lists. */
export function useLoadMoreQuery<T>(
  key: QueryKey,
  fetchPage: PageFetcher<T>,
  pageSize = PAGE_SIZE_DEFAULT,
) {
  const query = useInfiniteQuery({
    queryKey: [...key, { pageSize, mode: 'load-more' }],
    queryFn: ({ pageParam, signal }) => fetchPage(pageParam, pageSize, signal),
    initialPageParam: 1,
    getNextPageParam: (last) => (last.page < last.totalPages ? last.page + 1 : undefined),
  });

  return {
    ...query,
    items: query.data?.pages.flatMap((page) => page.items) ?? [],
    total: query.data?.pages[0]?.total ?? 0,
  };
}
