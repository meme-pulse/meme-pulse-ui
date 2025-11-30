import { useAccount, useReadContract } from 'wagmi';
import { erc1155Abi, erc20Abi } from 'viem';
import { LB_ROUTER_V22_ADDRESS } from '../lib/sdk';
import { DEFAULT_CHAINID } from '@/constants';

export function useAllowance(tokenAddress: string, spenderAddress: string) {
  const { address } = useAccount();
  const {
    data: allowance,
    // isLoading,
    // error,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc20Abi,
    functionName: 'allowance',
    args: [address as `0x${string}`, spenderAddress as `0x${string}`],
    query: {
      enabled: !!address && !!spenderAddress,
    },
  });

  return allowance ?? 0n;
}

export function useBinAllowance(tokenAddress: string) {
  const { address } = useAccount();
  const {
    data: allowance,
    // isLoading,
    // error,
    refetch: refetchAllowance,
  } = useReadContract({
    address: tokenAddress as `0x${string}`,
    abi: erc1155Abi,
    functionName: 'isApprovedForAll',
    args: [address as `0x${string}`, LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`],
    query: {
      enabled: !!address,
    },
  });

  return { allowance: !!allowance, refetchAllowance };
}
