import { useQuery } from '@tanstack/react-query';
import { getGroupedPoolsWithDetails } from '@/lib/hasura-client';

export const useGroupedPools = () => {
  return useQuery({
    queryKey: ['groupedPools'],
    queryFn: () => getGroupedPoolsWithDetails(),
    staleTime: 1000 * 60,
  });
};
