import { PAGE_SIZE_MAX } from '@chitfund/shared';
import { useQuery } from '@tanstack/react-query';
import { chitApi } from '../../lib/chit-api';

/** Every seat of a group with its holder and dues, for pickers. Groups have at most 200 seats. */
export function useAllSeats(groupId: string) {
  return useQuery({
    queryKey: ['groups', groupId, 'all-seats'],
    enabled: Boolean(groupId),
    queryFn: async ({ signal }) => {
      const first = await chitApi.groupTickets(
        groupId,
        { page: 1, pageSize: PAGE_SIZE_MAX },
        signal,
      );
      const rest = await Promise.all(
        Array.from({ length: Math.max(first.totalPages - 1, 0) }, (_, index) =>
          chitApi.groupTickets(groupId, { page: index + 2, pageSize: PAGE_SIZE_MAX }, signal),
        ),
      );
      return [first, ...rest].flatMap((page) => page.items);
    },
  });
}
