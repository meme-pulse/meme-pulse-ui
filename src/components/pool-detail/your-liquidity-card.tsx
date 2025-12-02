import { ArrowLeftRightIcon } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { mockUserFeeEarned } from '../../mock/api-data';
import { useUserLiquidityBinIds } from '../../hooks/use-user-liquidity-bin-ids';
import type { PoolData } from '@/PoolDetail';
import { useAccount, useReadContract } from 'wagmi';
import { LIQUIDITY_HELPER_V2_ADDRESS } from '../../lib/sdk';
import { useMemo } from 'react';
import { LiquidityHelperV2ABI } from '../../lib/sdk';
import { DEFAULT_CHAINID } from '@/constants';
import { useTokenList } from '@/hooks/use-token-list';
import { useTokenPrices } from '@/hooks/use-token-price';
import TokenTicker from '../token-ticker';
import { useLocalStorage } from 'usehooks-ts';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import { CardWithHeader } from '@/components/ui/card-with-header';

interface YourLiquidityCardProps {
  poolData: PoolData;
  yBaseCurrency: boolean;
  setYBaseCurrency: (yBaseCurrency: boolean) => void;
  currentPrice: number;
}

export function YourLiquidityCard({ poolData, yBaseCurrency, setYBaseCurrency, currentPrice }: YourLiquidityCardProps) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const { address } = useAccount();
  const { data: tokenListData } = useTokenList();
  const { data: tokenPrices } = useTokenPrices({ addresses: [] });

  const { data: myBinIds } = useUserLiquidityBinIds({
    poolAddress: poolData.pairAddress,
    userAddress: address || '',
    enabled: !!address,
  });

  // Convert bin IDs to BigInt for contract call (uint256[])
  const binIdsAsBigInt = useMemo(() => {
    if (!myBinIds || myBinIds.length === 0) return [];
    return myBinIds.map((id) => BigInt(id));
  }, [myBinIds]);

  const {
    data: binLiquidityAmounts,
    error: binLiquidityError,
    isError: isBinLiquidityError,
    status: binLiquidityStatus,
  } = useReadContract({
    address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
    abi: LiquidityHelperV2ABI,
    functionName: 'getAmountsOf',
    args: [poolData.pairAddress as `0x${string}`, address as `0x${string}`, binIdsAsBigInt],
    query: {
      enabled: binIdsAsBigInt.length > 0 && !!address,
    },
  });

  // Debug logs for liquidity amounts
  console.log('[YourLiquidityCard] Debug Info:', {
    myBinIds,
    myBinIdsTypes: myBinIds?.slice(0, 3).map((id) => typeof id),
    binIdsAsBigInt: binIdsAsBigInt.slice(0, 3).map(String),
    binLiquidityAmounts,
    binLiquidityError: binLiquidityError?.message || binLiquidityError,
    isBinLiquidityError,
    binLiquidityStatus,
    poolAddress: poolData.pairAddress,
    userAddress: address,
    helperAddress: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID],
    queryEnabled: binIdsAsBigInt.length > 0 && !!address,
  });

  // Get user fee earned data
  const { data: userFeeEarnedPerBin = [] } = useQuery({
    queryKey: ['userFeeEarnedPerBin', poolData.pairAddress, address],
    queryFn: () => mockUserFeeEarned(poolData.pairAddress as `0x${string}`, address as `0x${string}`),
    enabled: !!address && !!poolData.pairAddress,
  });

  const depositBalances = useMemo(() => {
    if (!binLiquidityAmounts || !myBinIds || myBinIds.length === 0) {
      return [
        {
          symbol: poolData.tokenX.symbol,
          amount: 0,
          icon: tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI,
          usd: 0,
        },
        {
          symbol: poolData.tokenY.symbol,
          amount: 0,
          icon: tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI,
          usd: 0,
        },
      ];
    }

    const tokenXAmount = myBinIds.reduce((acc: number, _: number, index: number) => {
      const amount = Number(binLiquidityAmounts?.[0]?.[index] ?? 0);
      return acc + amount / 10 ** poolData.tokenX.decimals;
    }, 0);

    const tokenYAmount = myBinIds.reduce((acc: number, _: number, index: number) => {
      const amount = Number(binLiquidityAmounts?.[1]?.[index] ?? 0);
      return acc + amount / 10 ** poolData.tokenY.decimals;
    }, 0);

    return [
      {
        symbol: poolData.tokenX.symbol,
        amount: tokenXAmount,
        icon: tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI,
        usd:
          Number(tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenX.address.toLowerCase())?.priceUsd) *
          tokenXAmount,
      },
      {
        symbol: poolData.tokenY.symbol,
        amount: tokenYAmount,
        icon: tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI,
        usd:
          Number(tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenY.address.toLowerCase())?.priceUsd) *
          tokenYAmount,
      },
    ];
  }, [
    binLiquidityAmounts,
    myBinIds,
    poolData.tokenX.decimals,
    poolData.tokenX.address,
    poolData.tokenX.symbol,
    poolData.tokenY.decimals,
    poolData.tokenY.address,
    poolData.tokenY.symbol,
    tokenPrices,
    tokenListData,
  ]);

  const totalTvlUsd = useMemo(() => {
    return depositBalances.reduce((acc, curr) => acc + (curr.usd || 0), 0);
  }, [depositBalances]);

  const feesEarned = useMemo(() => {
    if (!userFeeEarnedPerBin || userFeeEarnedPerBin.length === 0) {
      return {
        totalUsd: 0,
        tokenX: { amount: 0, usd: 0 },
        tokenY: { amount: 0, usd: 0 },
      };
    }

    // Hasura에서 반환하는 fee 값은 이미 decimals가 적용된 형태임
    const totalXPerBin = userFeeEarnedPerBin.reduce((sum, bin) => sum + bin.accruedFeesX, 0);
    const totalYPerBin = userFeeEarnedPerBin.reduce((sum, bin) => sum + bin.accruedFeesY, 0);

    const tokenXPrice = Number(
      tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenX.address.toLowerCase())?.priceUsd
    );
    const tokenYPrice = Number(
      tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenY.address.toLowerCase())?.priceUsd
    );

    const tokenXUsd = totalXPerBin * tokenXPrice;
    const tokenYUsd = totalYPerBin * tokenYPrice;

    return {
      totalUsd: tokenXUsd + tokenYUsd,
      tokenX: { amount: totalXPerBin, usd: tokenXUsd },
      tokenY: { amount: totalYPerBin, usd: tokenYUsd },
    };
  }, [userFeeEarnedPerBin, tokenPrices, poolData.tokenX.address, poolData.tokenY.address]);

  return (
    <CardWithHeader title="Your Liquidity" contentClassName="p-4">
      {/* Current Pool Price */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <span className="font-roboto text-figma-text-gray text-[12px]">Current Pool Price:</span>
        <div className="flex items-center gap-2 cursor-pointer hover:opacity-80" onClick={() => setYBaseCurrency(!yBaseCurrency)}>
          <span className="font-roboto text-[#facb25] text-[14px] font-medium">
            {formatNumber(currentPrice, 4, 0, numberLocale)}{' '}
            {yBaseCurrency ? poolData.tokenY.symbol + '/' + poolData.tokenX.symbol : poolData.tokenX.symbol + '/' + poolData.tokenY.symbol}
          </span>
          <ArrowLeftRightIcon className="w-4 h-4 text-[#facb25]" />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div
          className="p-4 bg-figma-gray-table"
          style={{
            boxShadow:
              'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
          }}
        >
          <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px] mb-2">Total Liquidity</div>
          <div className="font-roboto font-semibold text-[#030303] text-[18px]">{formatUSDWithLocale(totalTvlUsd, 4, 0, numberLocale)}</div>
        </div>
        <div
          className="p-4 bg-figma-gray-table"
          style={{
            boxShadow:
              'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
          }}
        >
          <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px] mb-2">Fees Earned</div>
          <div className="font-roboto font-semibold text-[#895bf5] text-[18px]">
            {formatUSDWithLocale(feesEarned.totalUsd, 4, 0, numberLocale)}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-[#c0c0c0] my-4"></div>

      {/* Balance Details Grid */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <div className="font-roboto text-figma-text-gray text-[12px] mb-3">Current Balance</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TokenTicker
                symbol={poolData.tokenX.symbol}
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI}
                className="w-5 h-5 rounded-full"
              />
              <span className="font-roboto font-medium text-[#030303] text-[14px]">
                {formatNumber(depositBalances[0].amount, 4, 0, numberLocale)} {poolData.tokenX.symbol}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TokenTicker
                symbol={poolData.tokenY.symbol}
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI}
                className="w-5 h-5 rounded-full"
              />
              <span className="font-roboto font-medium text-[#030303] text-[14px]">
                {formatNumber(depositBalances[1].amount, 4, 0, numberLocale)} {poolData.tokenY.symbol}
              </span>
            </div>
          </div>
        </div>
        <div>
          <div className="font-roboto text-figma-text-gray text-[12px] mb-3">Fees Earned</div>
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <TokenTicker
                symbol={poolData.tokenX.symbol}
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI}
                className="w-5 h-5 rounded-full"
              />
              <span className="font-roboto font-medium text-[#895bf5] text-[14px]">
                {formatNumber(feesEarned.tokenX.amount, 4, 0, numberLocale)} {poolData.tokenX.symbol}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <TokenTicker
                symbol={poolData.tokenY.symbol}
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI}
                className="w-5 h-5 rounded-full"
              />
              <span className="font-roboto font-medium text-[#895bf5] text-[14px]">
                {formatNumber(feesEarned.tokenY.amount, 4, 0, numberLocale)} {poolData.tokenY.symbol}
              </span>
            </div>
          </div>
        </div>
      </div>
    </CardWithHeader>
  );
}
