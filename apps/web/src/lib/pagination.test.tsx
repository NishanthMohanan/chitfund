import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import { type ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { type Paginated } from '@chitfund/shared';
import { pageQueryString, useLoadMoreQuery, usePagedQuery } from './pagination';

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

function fakeServer(total: number) {
  return vi.fn(async (page: number, pageSize: number): Promise<Paginated<number>> => {
    const start = (page - 1) * pageSize;
    const items = Array.from(
      { length: Math.max(0, Math.min(pageSize, total - start)) },
      (_, i) => start + i,
    );
    return { items, total, page, pageSize, totalPages: Math.ceil(total / pageSize) };
  });
}

describe('pageQueryString', () => {
  it('encodes page parameters', () => {
    expect(pageQueryString(2, 50)).toBe('page=2&pageSize=50');
  });
});

describe('usePagedQuery', () => {
  it('requests the given page from the server', async () => {
    const fetchPage = fakeServer(45);
    const { result } = renderHook(() => usePagedQuery(['numbers'], fetchPage, 3, 20), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(fetchPage).toHaveBeenCalledWith(3, 20, expect.any(AbortSignal));
    expect(result.current.data?.items).toEqual([40, 41, 42, 43, 44]);
  });
});

describe('useLoadMoreQuery', () => {
  it('appends pages until the last one', async () => {
    const fetchPage = fakeServer(25);
    const { result } = renderHook(() => useLoadMoreQuery(['numbers'], fetchPage, 10), { wrapper });

    await waitFor(() => expect(result.current.items).toHaveLength(10));
    expect(result.current.total).toBe(25);
    expect(result.current.hasNextPage).toBe(true);

    await act(() => result.current.fetchNextPage());
    await act(() => result.current.fetchNextPage());

    await waitFor(() => expect(result.current.items).toHaveLength(25));
    expect(result.current.hasNextPage).toBe(false);
  });
});
