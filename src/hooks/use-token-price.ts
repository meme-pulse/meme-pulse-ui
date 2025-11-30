import { useQuery } from '@tanstack/react-query';
import { mockTokenPrices } from '../mock/api-data';

interface UseTokenPriceParams {
  addresses: string[] | null;
}

interface UseTokenPriceReturn {
  data: { id: string; tokenAddress: string; symbol: string; name: string; decimals: number; priceUsd: number }[] | null;
  isLoading: boolean;
  error: Error | null;
}

export function useTokenPrices({ addresses }: UseTokenPriceParams): UseTokenPriceReturn {
  const { data, isLoading, error } = useQuery({
    queryKey: ['tokenPrices', addresses],
    queryFn: () => mockTokenPrices(),
    staleTime: 1000 * 60,
    refetchInterval: 1000 * 60 * 5,
  });

  return {
    data: data ?? null,
    isLoading,
    error: error as Error | null,
  };
}
