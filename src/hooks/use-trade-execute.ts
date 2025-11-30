import { useMutation, type UseMutationResult } from '@tanstack/react-query';
import { LB_ROUTER_V22_ADDRESS } from '../lib/sdk';
import { useCallback } from 'react';
import { toast } from 'sonner';
import { getAddress, parseAbi, zeroAddress, zeroHash } from 'viem';
import { useAccount, useContractWrite } from 'wagmi';
import { DEFAULT_CHAINID } from '@/constants';
import { LBRouterV22ABI, WNATIVE } from '../lib/sdk';

interface UseTradeExecuteParams {
  methodName: string;
  args: unknown[];
  value: string;
}

export function useTradeExecute({
  methodName,
  args,
  value,
}: UseTradeExecuteParams): UseMutationResult<`0x${string}`, Error, void, unknown> {
  const { writeContractAsync } = useContractWrite();
  const { address } = useAccount();

  const trade = useCallback(async () => {
    try {
      if (methodName === 'deposit') {
        const hash = await writeContractAsync({
          address: WNATIVE[DEFAULT_CHAINID].address as `0x${string}`,
          abi: parseAbi(['function deposit() external payable']),
          functionName: methodName,
          args: [],
          value: BigInt(value),
        });
        return hash;
      }
      if (methodName === 'withdraw') {
        const hash = await writeContractAsync({
          address: WNATIVE[DEFAULT_CHAINID].address as `0x${string}`,
          abi: parseAbi(['function withdraw(uint256 amount) external']),
          functionName: methodName,
          args: args as [bigint],
        });
        return hash;
      }
      if (methodName === 'swapExactTokensForNATIVE' || methodName === 'swapExactTokensForTokens') {
        if (getAddress(args[3] as `0x${string}`) !== address) {
          throw new Error('Cannot swap to the other address');
        }
        if (args[3] === zeroAddress) {
          throw new Error('Cannot swap to the zero address');
        }
      }
      if (methodName === 'swapExactNATIVEForTokens') {
        if (getAddress(args[2] as `0x${string}`) !== address) {
          throw new Error('Cannot swap to the other address');
        }
        if (args[2] === zeroAddress) {
          throw new Error('Cannot swap to the zero address');
        }
      }

      const hash = await writeContractAsync({
        address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID],
        abi: LBRouterV22ABI,
        functionName: methodName as any,
        args: args as any,
        value: BigInt(value),
      });
      return hash;
    } catch (error) {
      console.error(error);
      return zeroHash as `0x${string}`;
    }
  }, [writeContractAsync, methodName, args, value, address]);

  return useMutation<`0x${string}`, Error, void, unknown>({
    mutationFn: trade,
    onSuccess: async (data) => {
      if (data === zeroHash) {
        return;
      }
      toast.success('Transaction Submitted', {
        description: data,
        action: {
          label: 'View on Explorer',
          onClick: () => {
            window.open(`https://hyperevmscan.io/tx/${data}`, '_blank');
          },
        },
      });
    },
  });
}
