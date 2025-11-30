import { LBPairV21ABI } from '../lib/sdk';
import { useReadContract } from 'wagmi';

export function useActiveId(pairAddress: `0x${string}`, activeBinId: number, enabled?: boolean): number {
  const data = useReadContract({
    address: pairAddress,
    abi: LBPairV21ABI,
    functionName: 'getActiveId',
    query: {
      enabled,
      refetchInterval: 5000,
    },
  });
  return data.data ? Number(data.data) : activeBinId;
}
