import { DEFAULT_CHAINID } from '@/constants';
import { customReadClient } from '@/main';
import { LIQUIDITY_HELPER_V2_ADDRESS, LiquidityHelperV2ABI } from '../lib/sdk';
import { useQuery } from '@tanstack/react-query';
import { useReadContract } from 'wagmi';

export function usePopulatedBinsReserves(poolAddress: string, startBinId: number, endBinId: number) {
  return useReadContract({
    address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID],
    abi: LiquidityHelperV2ABI,
    functionName: 'getPopulatedBinsReserves',
    args: [poolAddress as `0x${string}`, startBinId, endBinId, 0],
  });
}

const binstepMatchingIds = (binStep: number) => {
  switch (binStep) {
    case 1:
    case 2:
      return 20;
    case 10:
      return 200;
    case 20: // 0.02% * 100 = 2%
      return 100;
    case 25: // 0.025% * 80 = 2%
      return 80;
    default:
      return 50;
  }
};
export function usePopulatedBinsReservesMultiple(poolAddressesAndActiveIds: { poolAddress: string; activeId: number; binStep: number }[]) {
  // const { data: populatedBinsReserves } = useReadContracts({
  //   contracts: poolAddressesAndActiveIds.map(({ poolAddress, activeId, binStep }) => ({
  //     address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID],
  //     abi: LiquidityHelperV2ABI,
  //     functionName: 'getPopulatedBinsReserves',
  //     args: [poolAddress as `0x${string}`, activeId - binstepMatchingIds(binStep), activeId + binstepMatchingIds(binStep), 0],
  //   })),
  //   query: {
  //     enabled: poolAddressesAndActiveIds.length > 0,
  //   },
  // });

  const { data: populatedBinsReserves } = useQuery({
    queryKey: ['populatedBinsReserves', poolAddressesAndActiveIds.length],
    queryFn: () => {
      return customReadClient.multicall({
        contracts: poolAddressesAndActiveIds.map(({ poolAddress, activeId, binStep }) => ({
          address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID],
          abi: LiquidityHelperV2ABI,
          functionName: 'getPopulatedBinsReserves',
          args: [poolAddress as `0x${string}`, activeId - binstepMatchingIds(binStep), activeId + binstepMatchingIds(binStep), 0],
        })),
      });
    },
    enabled: poolAddressesAndActiveIds.length > 0,
  });

  // return reserveXSum, reserveYSum, poolAddress

  return {
    data: populatedBinsReserves?.map((data, index) => {
      if (data.status === 'failure') {
        return {
          poolAddress: poolAddressesAndActiveIds[index].poolAddress,
          activeId: poolAddressesAndActiveIds[index].activeId,
          reserveXSum: BigInt(0),
          reserveYSum: BigInt(0),
        };
      }
      if (data.status === 'success' && data.result) {
        return {
          poolAddress: poolAddressesAndActiveIds[index].poolAddress,
          activeId: poolAddressesAndActiveIds[index].activeId,
          reserveXSum: (data as { result: { reserveX: bigint; reserveY: bigint }[] }).result.reduce(
            (acc: bigint, curr: { reserveX: bigint; reserveY: bigint }) => acc + curr.reserveX,
            BigInt(0)
          ),
          reserveYSum: (data as { result: { reserveX: bigint; reserveY: bigint }[] }).result.reduce(
            (acc: bigint, curr: { reserveX: bigint; reserveY: bigint }) => acc + curr.reserveY,
            BigInt(0)
          ),
        };
      }
    }),
  };
}
