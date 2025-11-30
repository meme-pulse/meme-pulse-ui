import { useQuery } from '@tanstack/react-query';
import { getDexAnalytics } from '@/lib/hasura-client';

export const useProtocolAnalytics = () => {
  const startTime = Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60;
  return useQuery({
    queryKey: ['analytics'],
    queryFn: () => getDexAnalytics(startTime),
    staleTime: 1000 * 60,
  });
};
