import { erc20Abi, isAddress, zeroAddress } from 'viem';
import { useAccount, useReadContracts, useBalance } from 'wagmi';
import { formatUnits } from 'viem';

const extendedErc20Abi = [
  ...erc20Abi,
  {
    inputs: [],
    name: 'decimals',
    outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }],
    stateMutability: 'view',
    type: 'function',
  },
] as const;

export const NATIVE_TOKEN_ADDRESS = zeroAddress;

export interface TokenData {
  address: `0x${string}`;
  rawBalance: bigint | undefined;
  formattedBalance: string | undefined;
  decimals: number | undefined;
  isNative: boolean;
}

interface UseTokenDataProps {
  tokenAddress: `0x${string}`;
  enabled?: boolean;
}

export function useTokenData({ tokenAddress, enabled = true }: UseTokenDataProps) {
  const { address: userAddress } = useAccount();
  const isNative = tokenAddress === NATIVE_TOKEN_ADDRESS;

  const {
    data: nativeBalanceData,
    isLoading: isNativeLoading,
    error: nativeError,
    refetch: refetchNative,
  } = useBalance({
    address: userAddress,
    query: {
      enabled: enabled && isNative && !!userAddress,
    },
  });

  const {
    data: erc20ContractData,
    isLoading: isErc20Loading,
    error: erc20Error,
    refetch: refetchErc20,
  } = useReadContracts({
    contracts: [
      {
        abi: extendedErc20Abi,
        address: tokenAddress as `0x${string}`,
        functionName: 'balanceOf',
        args: [userAddress ?? zeroAddress],
      },
      {
        abi: extendedErc20Abi,
        address: tokenAddress,
        functionName: 'decimals',
      },
    ],
    query: {
      enabled: enabled && !isNative && !!userAddress && !!tokenAddress,
      select: (results) => {
        const balanceResult = results[0];
        const decimalsResult = results[1];

        const rawBalance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : undefined;
        const decimals = decimalsResult.status === 'success' ? (decimalsResult.result as number) : undefined;

        let formattedBalance: string | undefined = undefined;
        if (rawBalance !== undefined && decimals !== undefined) {
          formattedBalance = formatUnits(rawBalance, decimals);
        }

        return { rawBalance, formattedBalance, decimals };
      },
    },
  });

  const isLoading = isNativeLoading || isErc20Loading;
  const error = nativeError || erc20Error;

  let data: TokenData | undefined;
  if (isNative && nativeBalanceData) {
    data = {
      address: tokenAddress,
      rawBalance: nativeBalanceData.value,
      formattedBalance: nativeBalanceData.formatted,
      decimals: nativeBalanceData.decimals,
      isNative: true,
    };
  } else if (!isNative && erc20ContractData) {
    data = {
      address: tokenAddress,
      rawBalance: erc20ContractData.rawBalance,
      formattedBalance: erc20ContractData.formattedBalance,
      decimals: erc20ContractData.decimals,
      isNative: false,
    };
  }

  const refetch = () => {
    if (isNative) {
      refetchNative();
    } else {
      refetchErc20();
    }
  };

  return {
    data,
    isLoading,
    error,
    refetch,
  };
}

interface UseTokensDataProps {
  tokenAddresses: `0x${string}`[];
  enabled?: boolean;
}

export function useTokensData({ tokenAddresses, enabled = true }: UseTokensDataProps) {
  const { address: userAddress } = useAccount();

  const erc20OnlyAddresses = tokenAddresses.filter((addr) => addr !== NATIVE_TOKEN_ADDRESS).filter((addr) => isAddress(addr));

  const includeNative = tokenAddresses.includes(NATIVE_TOKEN_ADDRESS);

  const erc20Contracts = erc20OnlyAddresses.flatMap((tokenAddress) => [
    {
      abi: extendedErc20Abi,
      address: tokenAddress,
      functionName: 'balanceOf',
      args: [userAddress],
    },
    {
      abi: extendedErc20Abi,
      address: tokenAddress,
      functionName: 'decimals',
    },
  ]);

  const {
    data: erc20Results,
    isLoading: isErc20Loading,
    error: erc20Error,
    refetch: refetchErc20s,
  } = useReadContracts({
    contracts: erc20Contracts,
    query: {
      enabled: !!userAddress && erc20OnlyAddresses.length > 0,
      select: (results) => {
        const erc20TokensData: { [key: `0x${string}`]: Omit<TokenData, 'isNative' | 'address'> } = {};
        for (let i = 0; i < erc20OnlyAddresses.length; i++) {
          const tokenAddress = erc20OnlyAddresses[i];
          const balanceResult = results[i * 2];
          const decimalsResult = results[i * 2 + 1];

          const rawBalance = balanceResult.status === 'success' ? (balanceResult.result as bigint) : undefined;
          const decimals = decimalsResult.status === 'success' ? (decimalsResult.result as number) : undefined;

          let formattedBalance: string | undefined = undefined;
          if (rawBalance !== undefined && decimals !== undefined) {
            formattedBalance = formatUnits(rawBalance, decimals);
          }

          erc20TokensData[tokenAddress] = {
            rawBalance,
            formattedBalance,
            decimals,
          };
        }
        return erc20TokensData;
      },
    },
  });

  const {
    data: nativeBalanceData,
    isLoading: isNativeLoading,
    error: nativeError,
    refetch: refetchNative,
  } = useBalance({
    address: userAddress,
    query: {
      enabled: enabled && includeNative && !!userAddress,
    },
  });

  const isLoading = isErc20Loading || isNativeLoading;
  const error = erc20Error || nativeError;

  const allTokensData: { [key: `0x${string}`]: TokenData } = {};

  if (erc20Results) {
    Object.entries(erc20Results).forEach(([address, data]) => {
      allTokensData[address as `0x${string}`] = {
        address: address as `0x${string}`,
        ...data,
        isNative: false,
      };
    });
  }

  if (includeNative && nativeBalanceData) {
    allTokensData[NATIVE_TOKEN_ADDRESS] = {
      address: NATIVE_TOKEN_ADDRESS,
      rawBalance: nativeBalanceData.value,
      formattedBalance: nativeBalanceData.formatted,
      decimals: nativeBalanceData.decimals,
      isNative: true,
    };
  }

  const refetch = () => {
    refetchErc20s();
    if (includeNative) {
      refetchNative();
    }
  };

  return {
    data: Object.values(allTokensData).length > 0 ? allTokensData : undefined,
    isLoading,
    error,
    refetch,
  };
}
