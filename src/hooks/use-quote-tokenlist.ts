import { DEFAULT_CHAINID } from '@/constants';
import { useQuery } from '@tanstack/react-query';
import { LB_FACTORY_V22_ADDRESS } from '../lib/sdk';
import { usePublicClient } from 'wagmi';
import { LBFactoryV21ABI } from '../lib/sdk';

export function useQuoteTokenAddresses() {
  const publicClient = usePublicClient();
  // 1. getNumberOfQuoteAssets

  return useQuery({
    queryKey: ['quote-token-addresses'],
    queryFn: async () => {
      console.log(publicClient, 'publicClient');
      if (!publicClient) return [];
      const numberOfQuoteAssets = (await publicClient.readContract({
        address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
        abi: LBFactoryV21ABI,
        functionName: 'getNumberOfQuoteAssets',
      })) as bigint;

      const quoteTokenAddresses = await Promise.all(
        Array.from({ length: Number(numberOfQuoteAssets) }, (_, i) => {
          return publicClient.readContract({
            address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
            abi: LBFactoryV21ABI,
            functionName: 'getQuoteAssetAtIndex',
            args: [BigInt(i)],
          });
        })
      );
      return quoteTokenAddresses as `0x${string}`[];
    },
    enabled: !!publicClient,
    staleTime: 1000 * 60,
  });

  // getQuoteAssetAtIndex
}

export function useOpenBinParameters() {
  const publicClient = usePublicClient();
  return useQuery({
    queryKey: ['open-binstep'],
    queryFn: async () => {
      try {
        if (!publicClient) return [];
        const openBinstep = (await publicClient.readContract({
          address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
          abi: LBFactoryV21ABI,
          functionName: 'getOpenBinSteps',
        })) as bigint[];

        const presets = await Promise.all(
          openBinstep.map((binStep: bigint) => {
            return publicClient.readContract({
              address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
              abi: LBFactoryV21ABI,
              functionName: 'getPreset',
              args: [binStep],
            });
          })
        ).catch((error) => {
          console.log(error, 'error');
          return [];
        });

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        return presets.map((preset: any, index: number) => {
          return {
            baseFee: (Number(preset[0]) * Number(openBinstep[index])) / 10000,
            binStep: Number(openBinstep[index]),
          };
        });
        // console.log(presets, 'presets');
      } catch (error) {
        console.log(error, 'error');
        return [
          {
            baseFee: 1,
            binStep: 1,
          },
          {
            baseFee: 25,
            binStep: 25,
          },
          {
            baseFee: 40,
            binStep: 50,
          },
          {
            baseFee: 80,
            binStep: 100,
          },
        ];
      }
    },
    enabled: !!publicClient,
    staleTime: 1000 * 60,
  });
}
