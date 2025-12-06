import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { ResponsiveContainer, BarChart, Bar, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
import { Loader2 } from 'lucide-react';
import { useLocalStorage } from 'usehooks-ts';

import { getPriceFromId } from '@/lib/bin';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import { useTokenList } from '@/hooks/use-token-list';
import TokenTicker from '@/components/token-ticker';
import { mockUserFeeEarned, mockUserFeesAnalytics } from '@/mock/api-data';

interface PoolPosition {
  lbPairId: string;
  tokenXId: string;
  tokenYId: string;
  name: string;
  baseFeePct: number;
  binStep: number;
  activeId: number;
  tokenXDecimals: number;
  tokenYDecimals: number;
  userBinLiquidities: number[];
  isInRange: boolean;
  totalLiquidityUsd: number;
  totalFeesUsd: number;
}

interface PositionExpandableContentProps {
  pool: PoolPosition;
  tokenPrices: Array<{ tokenAddress: string; priceUsd: number }> | null | undefined;
  binLiquidityAmounts?: bigint[][];
}

// Custom tooltip for liquidity chart
function CustomLiquidityTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: Array<{
    payload: {
      price: number;
      tokenXSymbol: string;
      tokenYSymbol: string;
      tokenAAmount: number;
      tokenBAmount: number;
    };
  }>;
}) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="bg-white p-3 border-2 border-figma-text-dark shadow-lg pointer-events-none font-roboto"
        style={{
          boxShadow: 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
        }}
      >
        <div className="space-y-1">
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">Price:</span>{' '}
            <span className="font-medium">{formatNumber(data.price, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">{data.tokenXSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.tokenAAmount, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">{data.tokenYSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.tokenBAmount, 18, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

// Custom tooltip for fees per bin chart
function CustomFeesTooltip({
  active,
  payload,
  tokenXSymbol,
  tokenYSymbol,
}: {
  active?: boolean;
  payload?: Array<{ payload: { accruedFeesX: number; accruedFeesY: number; priceXY: number } }>;
  tokenXSymbol: string;
  tokenYSymbol: string;
}) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="bg-white p-3 border-2 border-figma-text-dark shadow-lg pointer-events-none font-roboto"
        style={{
          boxShadow: 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
        }}
      >
        <div className="space-y-1">
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">Earned {tokenXSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.accruedFeesX, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">Earned {tokenYSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.accruedFeesY, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">Bin Price:</span>{' '}
            <span className="font-medium">{formatNumber(data.priceXY, 18, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

// Custom tooltip for time-based fees chart
function CustomTimeFeesTooltip({
  active,
  payload,
  tokenXSymbol,
  tokenYSymbol,
}: {
  active?: boolean;
  payload?: Array<{ payload: { timestamp: string; tokenX: number; tokenY: number } }>;
  tokenXSymbol: string;
  tokenYSymbol: string;
}) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);

  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="bg-white p-3 border-2 border-figma-text-dark shadow-lg pointer-events-none font-roboto"
        style={{
          boxShadow: 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
        }}
      >
        <div className="space-y-1">
          <p className="text-sm text-figma-text-dark font-medium">
            {new Date(data.timestamp).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
            })}
          </p>
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">Earned {tokenXSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.tokenX, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span className="text-figma-text-gray">Earned {tokenYSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.tokenY, 18, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
}

export function PositionExpandableContent({ pool, tokenPrices, binLiquidityAmounts }: PositionExpandableContentProps) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [selectedPeriod, setSelectedPeriod] = useState<'24h' | '7d' | '30d'>('24h');
  const [feesViewMode, setFeesViewMode] = useState<'time' | 'bin'>('bin');
  const { address } = useAccount();
  const { data: tokenList } = useTokenList();

  const tokenX = tokenList?.find((token) => token.address.toLowerCase() === pool.tokenXId.toLowerCase());
  const tokenY = tokenList?.find((token) => token.address.toLowerCase() === pool.tokenYId.toLowerCase());

  // Get user fees per bin from GraphQL (with 5s cache)
  const { data: userFeeEarnedPerBin = [], isLoading: isFeesPerBinLoading } = useQuery({
    queryKey: ['userFeeEarnedPerBin', pool.lbPairId, address],
    queryFn: () => mockUserFeeEarned(pool.lbPairId as `0x${string}`, address as `0x${string}`),
    enabled: !!address && !!pool.lbPairId,
    staleTime: 5000, // 5 seconds cache
    gcTime: 60000, // Keep in cache for 1 minute
  });

  // Get time-based fees analytics (with 5s cache)
  const { data: userFeesAnalyticsData, isLoading: isFeesAnalyticsLoading } = useQuery({
    queryKey: ['userFeesAnalytics', pool.lbPairId, address],
    queryFn: () => mockUserFeesAnalytics(pool.lbPairId as `0x${string}`, address as `0x${string}`),
    enabled: !!address && !!pool.lbPairId,
    staleTime: 5000, // 5 seconds cache
    gcTime: 60000, // Keep in cache for 1 minute
  });

  // Process liquidity data for chart (using props data instead of fetching again)
  const liquidityData = useMemo(() => {
    if (!binLiquidityAmounts) return { data: [], firstBinId: '', lastBinId: '' };

    const liquidityBaseData = pool.userBinLiquidities
      .map((binId: number, index: number) => {
        const tokenXAmount = Number(binLiquidityAmounts?.[0]?.[index] ?? 0);
        const tokenYAmount = Number(binLiquidityAmounts?.[1]?.[index] ?? 0);

        if (!tokenXAmount && !tokenYAmount) return null;

        const isActiveBin = binId === pool.activeId;
        const price = getPriceFromId(binId, pool.binStep) * 10 ** (pool.tokenXDecimals - pool.tokenYDecimals);

        return {
          binId: binId.toString(),
          price,
          tokenXSymbol: tokenX?.symbol || 'Token X',
          tokenYSymbol: tokenY?.symbol || 'Token Y',
          tokenAAmount: tokenXAmount / 10 ** pool.tokenXDecimals,
          tokenBAmount: tokenYAmount / 10 ** pool.tokenYDecimals,
          tokenBHeight: (1 / price) * (tokenYAmount / 10 ** pool.tokenYDecimals),
          tokenAHeight: tokenXAmount / 10 ** pool.tokenXDecimals,
          isActiveBin,
        };
      })
      .filter((bin) => bin !== null);

    // Add active bin if not in user's bins
    if (!liquidityBaseData.find((bin) => bin?.binId === pool.activeId.toString())) {
      liquidityBaseData.push({
        binId: pool.activeId.toString(),
        price: getPriceFromId(pool.activeId, pool.binStep) * 10 ** (pool.tokenXDecimals - pool.tokenYDecimals),
        tokenXSymbol: tokenX?.symbol || 'Token X',
        tokenYSymbol: tokenY?.symbol || 'Token Y',
        tokenAAmount: 0,
        tokenBAmount: 0,
        tokenBHeight: 0,
        tokenAHeight: 0,
        isActiveBin: true,
      });
    }

    const sorted = liquidityBaseData.sort((a, b) => Number(a!.binId) - Number(b!.binId));

    return {
      data: sorted,
      firstBinId: sorted[0]?.binId || '',
      lastBinId: sorted[sorted.length - 1]?.binId || '',
    };
  }, [binLiquidityAmounts, pool, tokenX?.symbol, tokenY?.symbol]);

  // Calculate deposit balances
  const depositBalances = useMemo(() => {
    const tokenXAmount = liquidityData.data.reduce((acc, curr) => acc + (curr?.tokenAAmount || 0), 0);
    const tokenYAmount = liquidityData.data.reduce((acc, curr) => acc + (curr?.tokenBAmount || 0), 0);

    const tokenXPrice = Number(tokenPrices?.find((t) => t.tokenAddress.toLowerCase() === pool.tokenXId.toLowerCase())?.priceUsd || 0);
    const tokenYPrice = Number(tokenPrices?.find((t) => t.tokenAddress.toLowerCase() === pool.tokenYId.toLowerCase())?.priceUsd || 0);

    return [
      {
        symbol: tokenX?.symbol || 'Token X',
        amount: tokenXAmount,
        icon: tokenX?.logoURI,
        usd: tokenXPrice * tokenXAmount,
      },
      {
        symbol: tokenY?.symbol || 'Token Y',
        amount: tokenYAmount,
        icon: tokenY?.logoURI,
        usd: tokenYPrice * tokenYAmount,
      },
    ];
  }, [liquidityData.data, pool.tokenXId, pool.tokenYId, tokenPrices, tokenX, tokenY]);

  // Process fees per bin data for chart
  const feesPerBinData = useMemo(() => {
    if (!userFeeEarnedPerBin || userFeeEarnedPerBin.length === 0) return [];

    return userFeeEarnedPerBin.map((bin) => ({
      ...bin,
      total: bin.accruedFeesX + bin.accruedFeesY,
    }));
  }, [userFeeEarnedPerBin]);

  // Process time-based fees data
  const feesPeriodData = useMemo(() => {
    const userFeesAnalytics = userFeesAnalyticsData || { '24h': [], '7d': [], '30d': [] };
    const analyticsData = userFeesAnalytics[selectedPeriod] || [];

    return analyticsData
      .filter((entry) => {
        // Filter based on selected period
        const now = Math.floor(Date.now() / 1000);
        let cutoffTime = now - 60 * 60 * 24; // 24h default

        if (selectedPeriod === '7d') {
          cutoffTime = now - 60 * 60 * 24 * 7;
        } else if (selectedPeriod === '30d') {
          cutoffTime = now - 60 * 60 * 24 * 30;
        }

        return entry.timestamp > cutoffTime;
      })
      .map((entry) => ({
        time: new Date(entry.timestamp * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        timestamp: entry.date, // ISO string for XAxis
        tokenX: entry.accruedFeesX || 0,
        tokenY: entry.accruedFeesY || 0,
        total: entry.accruedFeesL || 0,
      }));
  }, [userFeesAnalyticsData, selectedPeriod]);

  // Calculate total fees per bin
  const totalFeesPerBin = useMemo(() => {
    const totalXPerBin = userFeeEarnedPerBin.reduce((sum, bin) => sum + bin.accruedFeesX, 0);
    const totalYPerBin = userFeeEarnedPerBin.reduce((sum, bin) => sum + bin.accruedFeesY, 0);

    const tokenXPrice = Number(tokenPrices?.find((t) => t.tokenAddress.toLowerCase() === pool.tokenXId.toLowerCase())?.priceUsd || 0);
    const tokenYPrice = Number(tokenPrices?.find((t) => t.tokenAddress.toLowerCase() === pool.tokenYId.toLowerCase())?.priceUsd || 0);

    return {
      total: formatUSDWithLocale(totalXPerBin * tokenXPrice + totalYPerBin * tokenYPrice, 4, 0, numberLocale),
      tokenX: {
        amount: formatNumber(totalXPerBin, 5, 0, numberLocale),
        usd: formatUSDWithLocale(totalXPerBin * tokenXPrice, 4, 0, numberLocale),
      },
      tokenY: {
        amount: formatNumber(totalYPerBin, 5, 0, numberLocale),
        usd: formatUSDWithLocale(totalYPerBin * tokenYPrice, 4, 0, numberLocale),
      },
    };
  }, [userFeeEarnedPerBin, tokenPrices, pool.tokenXId, pool.tokenYId, numberLocale]);

  // Calculate total fees for selected period
  const totalFeesPeriod = useMemo(() => {
    const totalXPeriod = feesPeriodData.reduce((sum, entry) => sum + entry.tokenX, 0);
    const totalYPeriod = feesPeriodData.reduce((sum, entry) => sum + entry.tokenY, 0);

    const tokenXPrice = Number(tokenPrices?.find((t) => t.tokenAddress.toLowerCase() === pool.tokenXId.toLowerCase())?.priceUsd || 0);
    const tokenYPrice = Number(tokenPrices?.find((t) => t.tokenAddress.toLowerCase() === pool.tokenYId.toLowerCase())?.priceUsd || 0);

    return {
      total: formatUSDWithLocale(totalXPeriod * tokenXPrice + totalYPeriod * tokenYPrice, 4, 0, numberLocale),
      tokenX: {
        amount: formatNumber(totalXPeriod, 5, 0, numberLocale),
        usd: formatUSDWithLocale(totalXPeriod * tokenXPrice, 4, 0, numberLocale),
      },
      tokenY: {
        amount: formatNumber(totalYPeriod, 5, 0, numberLocale),
        usd: formatUSDWithLocale(totalYPeriod * tokenYPrice, 4, 0, numberLocale),
      },
    };
  }, [feesPeriodData, tokenPrices, pool.tokenXId, pool.tokenYId, numberLocale]);

  const isLoading = isFeesPerBinLoading || isFeesAnalyticsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-figma-purple" />
        <span className="ml-2 font-roboto text-figma-text-gray">Loading position details...</span>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-6">
      {/* Liquidity Distribution Section */}
      <div
        className="bg-white p-2 sm:p-4"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
        }}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-4">
          <h3 className="font-roboto font-semibold text-figma-text-dark text-sm sm:text-[16px]">Liquidity Distribution</h3>
          <div className="flex items-center gap-2 sm:gap-3 text-[10px] sm:text-xs font-roboto">
            <span className="flex items-center gap-1 text-figma-text-gray">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#8BD2C6]" /> {tokenY?.symbol}
            </span>
            <span className="flex items-center gap-1 text-figma-text-gray">
              <span className="w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full bg-[#ff9f80]" /> {tokenX?.symbol}
            </span>
          </div>
        </div>

        {/* Chart */}
        <div className="h-[150px] sm:h-[200px] mb-2 sm:mb-4">
          {liquidityData.data.length === 0 ? (
            <div className="flex items-center justify-center h-full text-figma-text-gray font-roboto">No liquidity data available</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={liquidityData.data} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="binId"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: '#71717a' }}
                  tickFormatter={(value) => {
                    const price = getPriceFromId(Number(value), pool.binStep) * 10 ** (pool.tokenXDecimals - pool.tokenYDecimals);
                    if (liquidityData.firstBinId === value || liquidityData.lastBinId === value) {
                      return formatNumber(price, 4, 0, numberLocale);
                    }
                    return '';
                  }}
                  interval={0}
                />
                <YAxis hide />
                <RechartsTooltip content={<CustomLiquidityTooltip />} cursor={{ opacity: 0.15 }} />
                <Bar dataKey="tokenAHeight" stackId="a" fill="#ff9f80" radius={[0, 0, 0, 0]} />
                <Bar dataKey="tokenBHeight" stackId="a" fill="#8bd2c6" radius={[0, 0, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Deposit Balance */}
        <div className="border-t border-[#c0c0c0] pt-2 sm:pt-4">
          <div className="text-right mb-2 sm:mb-3">
            <span className="font-roboto text-figma-text-gray text-xs sm:text-sm">Total Liquidity: </span>
            <span className="font-roboto font-semibold text-figma-text-dark text-xs sm:text-sm">
              {formatUSDWithLocale(
                depositBalances.reduce((acc, curr) => acc + curr.usd, 0),
                4,
                0,
                numberLocale
              )}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            {depositBalances.map((bal) => (
              <div
                key={bal.symbol}
                className="flex items-center gap-1.5 sm:gap-2 bg-figma-gray-bg px-2 py-1.5 sm:px-3 sm:py-2"
                style={{
                  boxShadow:
                    'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
                }}
              >
                <TokenTicker logoURI={bal.icon} symbol={bal.symbol} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
                <div>
                  <div className="font-roboto font-medium text-figma-text-dark text-[10px] sm:text-xs">
                    {formatNumber(bal.amount, 6, 0, numberLocale)} {bal.symbol}
                  </div>
                  <div className="font-roboto text-figma-text-gray text-[9px] sm:text-[10px]">
                    {formatUSDWithLocale(bal.usd, 4, 0, numberLocale)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Fees Earned Section - Combined with Tabs */}
      <div
        className="bg-white p-2 sm:p-4"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
        }}
      >
        <div className="flex items-center justify-between mb-2 sm:mb-4 flex-wrap gap-2 sm:gap-3">
          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            <h3 className="font-roboto font-semibold text-figma-text-dark text-sm sm:text-[16px]">Fees Earned</h3>
            {/* View Mode Tabs (Time / Per Bin) - Retro style, right next to title */}
            <div
              className="flex items-center bg-figma-gray-bg p-0.5 sm:p-1"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
              }}
            >
              <button
                className={`font-roboto text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 transition-all ${
                  feesViewMode === 'time' ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'
                }`}
                style={{
                  boxShadow:
                    feesViewMode === 'time'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
                }}
                onClick={() => setFeesViewMode('time')}
              >
                Time
              </button>
              <button
                className={`font-roboto text-[10px] sm:text-xs px-2 sm:px-3 py-1 sm:py-1.5 transition-all ${
                  feesViewMode === 'bin' ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'
                }`}
                style={{
                  boxShadow:
                    feesViewMode === 'bin'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
                }}
                onClick={() => setFeesViewMode('bin')}
              >
                Per Bin
              </button>
            </div>
          </div>
          {/* Period Selector (only for Time view) - Top right of card */}
          {feesViewMode === 'time' && (
            <div
              className="flex items-center bg-figma-gray-bg p-0.5 sm:p-1"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
              }}
            >
              {(['24h', '7d', '30d'] as const).map((period) => (
                <button
                  key={period}
                  className={`font-roboto text-[10px] sm:text-xs px-2 sm:px-2.5 py-1 sm:py-1.5 transition-all ${
                    selectedPeriod === period ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'
                  }`}
                  style={{
                    boxShadow:
                      selectedPeriod === period
                        ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                        : 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
                  }}
                  onClick={() => setSelectedPeriod(period)}
                >
                  {period.toUpperCase()}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Chart - Conditional based on view mode */}
        <div className="h-[150px] sm:h-[200px] mb-2 sm:mb-4">
          {feesViewMode === 'time' ? (
            feesPeriodData.length === 0 ? (
              <div className="flex items-center justify-center h-full text-figma-text-gray font-roboto">
                No fees earned in the last {selectedPeriod}
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={feesPeriodData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                  <XAxis
                    dataKey="timestamp"
                    axisLine={false}
                    tickLine={false}
                    tick={{ fontSize: 8, fill: '#71717a' }}
                    interval="preserveStartEnd"
                    tickFormatter={(value) => {
                      return new Date(value).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                      });
                    }}
                  />
                  <YAxis hide />
                  <RechartsTooltip
                    content={<CustomTimeFeesTooltip tokenXSymbol={tokenX?.symbol || ''} tokenYSymbol={tokenY?.symbol || ''} />}
                    cursor={{ opacity: 0.15 }}
                  />
                  <Bar dataKey="total" fill="#895bf5" radius={[2, 2, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )
          ) : feesPerBinData.length === 0 ? (
            <div className="flex items-center justify-center h-full text-figma-text-gray font-roboto">No fees earned yet</div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={feesPerBinData} margin={{ top: 10, right: 10, left: 10, bottom: 5 }}>
                <XAxis
                  dataKey="binId"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fontSize: 8, fill: '#71717a' }}
                  tickFormatter={(value: number) => {
                    const price = getPriceFromId(value, pool.binStep) * 10 ** (pool.tokenXDecimals - pool.tokenYDecimals);
                    return formatNumber(price, 4, 0, numberLocale) || '';
                  }}
                />
                <YAxis hide />
                <RechartsTooltip
                  content={<CustomFeesTooltip tokenXSymbol={tokenX?.symbol || ''} tokenYSymbol={tokenY?.symbol || ''} />}
                  cursor={{ opacity: 0.15 }}
                />
                <Bar dataKey="total" fill="#895bf5" radius={[2, 2, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Total Fees Summary - Conditional based on view mode */}
        <div className="border-t border-[#c0c0c0] pt-2 sm:pt-4">
          <div className="text-right mb-2 sm:mb-3">
            <span className="font-roboto text-figma-text-gray text-xs sm:text-sm">
              {feesViewMode === 'time'
                ? `Total Fees Earned (${selectedPeriod.toUpperCase()}): `
                : 'Total Fees Earned (since last deposit): '}
            </span>
            <span className="font-roboto font-semibold text-figma-purple text-xs sm:text-sm">
              {feesViewMode === 'time' ? totalFeesPeriod.total : totalFeesPerBin.total}
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:gap-3">
            <div
              className="flex items-center gap-1.5 sm:gap-2 bg-figma-gray-bg px-2 py-1.5 sm:px-3 sm:py-2"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
              }}
            >
              <TokenTicker logoURI={tokenX?.logoURI} symbol={tokenX?.symbol} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
              <div>
                <div className="font-roboto font-medium text-figma-purple text-[10px] sm:text-xs">
                  {feesViewMode === 'time' ? totalFeesPeriod.tokenX.amount : totalFeesPerBin.tokenX.amount} {tokenX?.symbol}
                </div>
                <div className="font-roboto text-figma-text-gray text-[9px] sm:text-[10px]">
                  {feesViewMode === 'time' ? totalFeesPeriod.tokenX.usd : totalFeesPerBin.tokenX.usd}
                </div>
              </div>
            </div>
            <div
              className="flex items-center gap-1.5 sm:gap-2 bg-figma-gray-bg px-2 py-1.5 sm:px-3 sm:py-2"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
              }}
            >
              <TokenTicker logoURI={tokenY?.logoURI} symbol={tokenY?.symbol} className="w-4 h-4 sm:w-5 sm:h-5 rounded-full" />
              <div>
                <div className="font-roboto font-medium text-figma-purple text-[10px] sm:text-xs">
                  {feesViewMode === 'time' ? totalFeesPeriod.tokenY.amount : totalFeesPerBin.tokenY.amount} {tokenY?.symbol}
                </div>
                <div className="font-roboto text-figma-text-gray text-[9px] sm:text-[10px]">
                  {feesViewMode === 'time' ? totalFeesPeriod.tokenY.usd : totalFeesPerBin.tokenY.usd}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Note */}
        <div
          className="mt-2 sm:mt-4 p-2 sm:p-3 bg-figma-gray-bg"
          style={{
            boxShadow:
              'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
          }}
        >
          <p className="font-roboto text-figma-text-gray text-[10px] sm:text-[11px]">
            💡 Fees are automatically compounded into your bins. Analytics reset on each deposit or withdraw.
          </p>
        </div>
      </div>
    </div>
  );
}
