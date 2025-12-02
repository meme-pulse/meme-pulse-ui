import { useQuery } from '@tanstack/react-query';
import { getUserLiquidityBinIds } from '../mock/api-data';

interface UseUserLiquidityBinIdsProps {
  poolAddress: string;
  userAddress: string;
  enabled?: boolean;
  select?: (data: number[]) => number[];
}

export function useUserLiquidityBinIds({ poolAddress, userAddress, enabled = true, select }: UseUserLiquidityBinIdsProps) {
  return useQuery({
    queryKey: ['userLiquidityBinIds', poolAddress, userAddress],
    queryFn: async () => {
      const result = await getUserLiquidityBinIds(poolAddress, userAddress);
      console.log('[useUserLiquidityBinIds] Raw bin IDs from API:', {
        poolAddress,
        userAddress,
        binIds: result,
        binIdsTypes: result?.map((id) => typeof id),
      });
      return result;
    },
    enabled: enabled && !!userAddress && !!poolAddress,
    refetchInterval: 5000,
    select,
  });
}
