import { useState, useMemo, useEffect } from 'react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import type { PoolData, StrategyData } from '@/AIPoolDetail';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useActiveId } from '@/hooks/use-active-id';
import { getPriceFromId } from '@/lib/bin';
import { formatNumber, formatStringOnlyLocale, getNumberStringValue } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { useTokensData, NATIVE_TOKEN_ADDRESS } from '@/hooks/use-token-data';
import { useAccount } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import { useTokenList } from '@/hooks/use-token-list';
import TokenTicker from '../token-ticker';
import {
  LiquidityDistribution,
  WNATIVE,
  Token,
  TokenAmount,
  getUniformDistributionFromBinRange,
  getCurveDistributionFromBinRange,
  getBidAskDistributionFromBinRange,
} from '../../lib/sdk';
import { DEFAULT_CHAINID } from '@/constants';
import { useDebounce } from '@/hooks/use-debounce';
import AutoFillSwitch from '../auto-fill-switch';
import AddLiquidityButton from '../add-liquidity-button';
import { useTokenPrices } from '@/hooks/use-token-price';
import { ArrowLeftRight } from 'lucide-react';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

interface AIStrategyResultProps {
  poolData: PoolData;
  tokenListData?: Array<{ address: string; logoURI?: string }>;
  strategyData?: StrategyData;
}

const DEFAULT_BIN_COUNT = 51;

export function AIStrategyResult({ poolData: originalPoolData, strategyData }: AIStrategyResultProps) {
  const { address } = useAccount();
  const { data: tokenList } = useTokenList();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [autoFill] = useLocalStorage('autoFill', false);
  const [liquidityTolerance] = useLocalStorage('liquidity-tolerance', 0.1);
  const [isNativeIn, setIsNativeIn] = useState(false);
  const { data: tokenPrices } = useTokenPrices({ addresses: [originalPoolData.tokenX.address, originalPoolData.tokenY.address] });

  // Modify poolData based on isNativeIn to use native token address
  const poolData = useMemo(() => {
    if (originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn) {
      return {
        ...originalPoolData,
        tokenX: { ...originalPoolData.tokenX, symbol: 'M', address: NATIVE_TOKEN_ADDRESS as `0x${string}` },
      };
    } else if (originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn) {
      return {
        ...originalPoolData,
        tokenY: { ...originalPoolData.tokenY, symbol: 'M', address: NATIVE_TOKEN_ADDRESS as `0x${string}` },
      };
    } else {
      return originalPoolData;
    }
  }, [originalPoolData, isNativeIn]);

  const activeId = useActiveId(originalPoolData.pairAddress as `0x${string}`, originalPoolData.activeBinId);

  // Get recommended shape based on strategy data or default to SPOT
  const recommendedShape = useMemo(() => {
    return strategyData?.distributionShape ?? LiquidityDistribution.SPOT;
  }, [strategyData]);

  // Get recommended bin count
  const recommendedBinCount = useMemo(() => {
    return strategyData?.binCount ?? DEFAULT_BIN_COUNT;
  }, [strategyData]);

  // Calculate bin range
  const halfBins = Math.floor(recommendedBinCount / 2);
  const minPriceBinId = strategyData?.minBinId ?? activeId - halfBins;
  const maxPriceBinId = strategyData?.maxBinId ?? activeId + halfBins;

  // Token amounts
  const [tokenXAmount, setTokenXAmount] = useState('');
  const [tokenYAmount, setTokenYAmount] = useState('');

  const debouncedAmountX = useDebounce(
    (() => {
      try {
        const cleaned = getNumberStringValue(tokenXAmount, numberLocale);
        parseUnits(cleaned || '0', poolData.tokenX.decimals);
        return cleaned || '0';
      } catch {
        return '0';
      }
    })(),
    500
  );

  const debouncedAmountY = useDebounce(
    (() => {
      try {
        const cleaned = getNumberStringValue(tokenYAmount, numberLocale);
        parseUnits(cleaned || '0', poolData.tokenY.decimals);
        return cleaned || '0';
      } catch {
        return '0';
      }
    })(),
    500
  );

  // Fetch token balances - always include both wrapped and native for tokens that could be WM
  const tokensToFetch = useMemo(() => {
    const tokens: `0x${string}`[] = [];
    if (originalPoolData?.tokenX.address) {
      tokens.push(originalPoolData.tokenX.address as `0x${string}`);
      if (originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address) {
        tokens.push(zeroAddress);
      }
    }
    if (originalPoolData?.tokenY.address) {
      tokens.push(originalPoolData.tokenY.address as `0x${string}`);
      if (originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address) {
        tokens.push(zeroAddress);
      }
    }
    return tokens;
  }, [originalPoolData?.tokenX.address, originalPoolData?.tokenY.address]);

  const { data: tokensData, refetch: refetchTokensData } = useTokensData({
    tokenAddresses: tokensToFetch,
    enabled: !!originalPoolData && !!address,
  });

  // Price calculations - 4 decimal places
  const currentPriceWithDecimals = useMemo(
    () => getPriceFromId(activeId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
    [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
  );

  const minPriceWithDecimals = useMemo(
    () => getPriceFromId(minPriceBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
    [minPriceBinId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
  );

  const maxPriceWithDecimals = useMemo(
    () => getPriceFromId(maxPriceBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
    [maxPriceBinId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
  );

  // Token balances
  const tokenXBalance = useMemo(() => {
    if (!tokensData) return 0;
    const tokenData = tokensData[poolData.tokenX.address as `0x${string}`];
    if (!tokenData?.formattedBalance) return 0;
    return parseFloat(tokenData.formattedBalance);
  }, [tokensData, poolData.tokenX.address]);

  const tokenYBalance = useMemo(() => {
    if (!tokensData) return 0;
    const tokenData = tokensData[poolData.tokenY.address as `0x${string}`];
    if (!tokenData?.formattedBalance) return 0;
    return parseFloat(tokenData.formattedBalance);
  }, [tokensData, poolData.tokenY.address]);

  // Input availability based on bin range
  const inputAmountXAvailable = useMemo(() => maxPriceBinId >= activeId, [maxPriceBinId, activeId]);
  const inputAmountYAvailable = useMemo(() => minPriceBinId <= activeId, [minPriceBinId, activeId]);

  // Auto-fill logic
  useEffect(() => {
    if (!autoFill || !tokenPrices) return;

    const tokenXPrice = tokenPrices.find((t) => t.id.toLowerCase() === poolData.tokenX.address.toLowerCase())?.priceUsd ?? 0;
    const tokenYPrice = tokenPrices.find((t) => t.id.toLowerCase() === poolData.tokenY.address.toLowerCase())?.priceUsd ?? 0;

    if (tokenXAmount && !tokenYAmount && inputAmountYAvailable && tokenXPrice > 0 && tokenYPrice > 0) {
      const xValue = Number(getNumberStringValue(tokenXAmount, numberLocale)) * Number(tokenXPrice);
      const yAmount = xValue / Number(tokenYPrice);
      setTokenYAmount(formatStringOnlyLocale(yAmount.toFixed(poolData.tokenY.decimals), numberLocale));
    } else if (tokenYAmount && !tokenXAmount && inputAmountXAvailable && tokenXPrice > 0 && tokenYPrice > 0) {
      const yValue = Number(getNumberStringValue(tokenYAmount, numberLocale)) * Number(tokenYPrice);
      const xAmount = yValue / Number(tokenXPrice);
      setTokenXAmount(formatStringOnlyLocale(xAmount.toFixed(poolData.tokenX.decimals), numberLocale));
    }
  }, [autoFill, tokenXAmount, tokenYAmount, tokenPrices, poolData, inputAmountXAvailable, inputAmountYAvailable, numberLocale]);

  // Liquidity input state - use originalPoolData for token addresses since liquidity router needs actual wrapped addresses
  const [addLiquidityInput, setAddLiquidityInput] = useState({
    tokenX: originalPoolData.tokenX.address as `0x${string}`,
    tokenY: originalPoolData.tokenY.address as `0x${string}`,
    binStep: originalPoolData.lbBinStep,
    amountX: '0',
    amountY: '0',
    amountXMin: '0',
    amountYMin: '0',
    activeIdDesired: activeId,
    idSlippage: 5,
    deltaIds: [] as number[],
    distributionX: [] as bigint[],
    distributionY: [] as bigint[],
    to: address,
    refundTo: address,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  });

  // Calculate distribution chart data
  const simulationChartData = useMemo(() => {
    if (!activeId || !poolData.lbBinStep) {
      return { datasets: [], labels: [] };
    }

    const binRange = [Math.min(minPriceBinId, maxPriceBinId), Math.max(minPriceBinId, maxPriceBinId)];

    let simulatedDistribution: {
      binIds: number[];
      deltaIds: number[];
      distributionX: bigint[];
      distributionY: bigint[];
    } | null = null;

    // Calculate distribution based on shape
    if (recommendedShape === LiquidityDistribution.BID_ASK) {
      const { deltaIds, distributionX, distributionY } = getBidAskDistributionFromBinRange(activeId, binRange, [
        new TokenAmount(
          new Token(
            DEFAULT_CHAINID,
            poolData.tokenX.address as `0x${string}`,
            poolData.tokenX.decimals,
            poolData.tokenX.symbol,
            poolData.tokenX.name
          ),
          parseUnits(debouncedAmountX || '0', poolData.tokenX.decimals)
        ),
        new TokenAmount(
          new Token(
            DEFAULT_CHAINID,
            poolData.tokenY.address as `0x${string}`,
            poolData.tokenY.decimals,
            poolData.tokenY.symbol,
            poolData.tokenY.name
          ),
          parseUnits(debouncedAmountY || '0', poolData.tokenY.decimals)
        ),
      ]);
      simulatedDistribution = {
        binIds: deltaIds.map((deltaId) => activeId + deltaId),
        deltaIds,
        distributionX,
        distributionY,
      };
    } else if (recommendedShape === LiquidityDistribution.CURVE) {
      const { deltaIds, distributionX, distributionY } = getCurveDistributionFromBinRange(
        activeId,
        binRange,
        [
          new TokenAmount(
            new Token(
              DEFAULT_CHAINID,
              poolData.tokenX.address as `0x${string}`,
              poolData.tokenX.decimals,
              poolData.tokenX.symbol,
              poolData.tokenX.name
            ),
            parseUnits(debouncedAmountX || '0', poolData.tokenX.decimals)
          ),
          new TokenAmount(
            new Token(
              DEFAULT_CHAINID,
              poolData.tokenY.address as `0x${string}`,
              poolData.tokenY.decimals,
              poolData.tokenY.symbol,
              poolData.tokenY.name
            ),
            parseUnits(debouncedAmountY || '0', poolData.tokenY.decimals)
          ),
        ],
        0.1
      );
      simulatedDistribution = {
        binIds: deltaIds.map((deltaId) => activeId + deltaId),
        deltaIds,
        distributionX,
        distributionY,
      };
    } else {
      // SPOT (Uniform)
      const { deltaIds, distributionX, distributionY } = getUniformDistributionFromBinRange(activeId, binRange);
      simulatedDistribution = {
        binIds: deltaIds.map((deltaId) => activeId + deltaId),
        deltaIds,
        distributionX,
        distributionY,
      };
    }

    if (!simulatedDistribution) {
      return { datasets: [], labels: [] };
    }

    // Check if amounts are valid for the range
    if (activeId <= minPriceBinId && !Number(debouncedAmountX)) {
      return { datasets: [], labels: [] };
    }
    if (activeId >= maxPriceBinId && !Number(debouncedAmountY)) {
      return { datasets: [], labels: [] };
    }
    if (minPriceBinId <= activeId && activeId <= maxPriceBinId) {
      if (!Number(debouncedAmountX) || !Number(debouncedAmountY)) {
        return { datasets: [], labels: [] };
      }
    }

    // Update liquidity input
    const slippageToleranceAmountX = (Number(debouncedAmountX) * (1 - liquidityTolerance / 100)).toFixed(poolData.tokenX.decimals);
    const slippageToleranceAmountY = (Number(debouncedAmountY) * (1 - liquidityTolerance / 100)).toFixed(poolData.tokenY.decimals);

    const amountXMorethan0 = simulatedDistribution.distributionX.reduce((acc, val) => acc + val, 0n) > 0n;
    const amountYMorethan0 = simulatedDistribution.distributionY.reduce((acc, val) => acc + val, 0n) > 0n;

    setAddLiquidityInput((prev) => ({
      ...prev,
      deltaIds: simulatedDistribution.deltaIds,
      distributionX: simulatedDistribution.distributionX,
      distributionY: simulatedDistribution.distributionY,
      amountX: amountXMorethan0 ? parseUnits(debouncedAmountX, poolData.tokenX.decimals).toString() : '0',
      amountY: amountYMorethan0 ? parseUnits(debouncedAmountY, poolData.tokenY.decimals).toString() : '0',
      amountXMin: amountXMorethan0 ? parseUnits(slippageToleranceAmountX, poolData.tokenX.decimals).toString() : '0',
      amountYMin: amountYMorethan0 ? parseUnits(slippageToleranceAmountY, poolData.tokenY.decimals).toString() : '0',
      to: address as `0x${string}`,
      refundTo: address as `0x${string}`,
    }));

    const denominator = 1e18;
    const amountX = Number(debouncedAmountX) || 0;
    const amountY = Number(debouncedAmountY) || 0;

    const data = simulatedDistribution.binIds.map((binId, i) => {
      const price = getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
      return {
        bin: binId,
        x: (Number(simulatedDistribution.distributionX[i]) / denominator) * amountX,
        y: (Number(simulatedDistribution.distributionY[i]) / denominator) * amountY,
        price: price,
        yHeight: (1 / price) * (Number(simulatedDistribution.distributionY[i]) / denominator) * amountY,
        xHeight: (Number(simulatedDistribution.distributionX[i]) / denominator) * amountX,
      };
    });

    return {
      labels: simulatedDistribution.binIds,
      datasets: [
        {
          label: poolData.tokenY.symbol,
          data: data.map((bin) => bin.yHeight),
          backgroundColor: '#8bd2c6',
          borderWidth: 0,
          barThickness: 'flex' as const,
          maxBarThickness: 20,
        },
        {
          label: poolData.tokenX.symbol,
          data: data.map((bin) => bin.xHeight),
          backgroundColor: '#ff9f80',
          borderWidth: 0,
          barThickness: 'flex' as const,
          maxBarThickness: 20,
        },
      ],
    };
  }, [activeId, poolData, minPriceBinId, maxPriceBinId, debouncedAmountX, debouncedAmountY, liquidityTolerance, address, recommendedShape]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        enabled: true,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: function (context: any[]) {
            const binId = context[0].label;
            const price = getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
            return `Bin ID: ${binId} | Price: ${formatNumber(price, 4, 0, numberLocale)}`;
          },
        },
      },
    },
    scales: {
      x: {
        display: true,
        stacked: true,
        grid: { display: false },
        ticks: {
          callback: (_value: unknown, index: number) => {
            const binId = simulationChartData.labels?.[index];
            if (!binId) return '';
            const price = getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
            return formatNumber(price, 4, 0, numberLocale) || '';
          },
          maxTicksLimit: 5,
          font: { size: 10, family: 'Inter' },
          color: '#666666',
        },
      },
      y: {
        display: false,
        stacked: true,
        beginAtZero: true,
      },
    },
  };

  // Get shape name for display
  const shapeName = useMemo(() => {
    switch (recommendedShape) {
      case LiquidityDistribution.SPOT:
        return 'Spot';
      case LiquidityDistribution.CURVE:
        return 'Curve';
      case LiquidityDistribution.BID_ASK:
        return 'Bid-Ask';
      default:
        return 'Spot';
    }
  }, [recommendedShape]);

  // Get token logo
  const getTokenLogo = (tokenAddress: string) => {
    return tokenList?.find((t) => t.address.toLowerCase() === tokenAddress.toLowerCase())?.logoURI;
  };

  // USD values - use originalPoolData addresses since tokenPrices is fetched with original addresses
  const tokenXUsdValue = useMemo(() => {
    const price = tokenPrices?.find((t) => t.id.toLowerCase() === originalPoolData.tokenX.address.toLowerCase())?.priceUsd ?? 0;
    const amount = Number(getNumberStringValue(tokenXAmount, numberLocale)) || 0;
    return amount * Number(price);
  }, [tokenPrices, tokenXAmount, originalPoolData.tokenX.address, numberLocale]);

  const tokenYUsdValue = useMemo(() => {
    const price = tokenPrices?.find((t) => t.id.toLowerCase() === originalPoolData.tokenY.address.toLowerCase())?.priceUsd ?? 0;
    const amount = Number(getNumberStringValue(tokenYAmount, numberLocale)) || 0;
    return amount * Number(price);
  }, [tokenPrices, tokenYAmount, originalPoolData.tokenY.address, numberLocale]);

  const hasChartData = simulationChartData.datasets.length > 0 && simulationChartData.labels && simulationChartData.labels.length > 0;

  return (
    <CardWithHeader title="AI Liquidity Management" contentClassName="p-0">
      <div className="space-y-0">
        {/* Recommended Strategy Card */}
        <div
          className="bg-figma-gray-table mx-[14px] mt-[10px] p-4"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        >
          <h2 className="font-tahoma text-[18px] font-bold text-[#1a1a1a] mb-4">Recommended DLMM Strategy</h2>

          {/* Bin Step */}
          <div className="pb-3 border-b border-[#bfbfbf] mb-4">
            <label className="font-inter font-bold text-[14px] text-black">Bin Step</label>
            <p className="mt-1 font-roboto text-[16px] text-[#666666]">{poolData.lbBinStep} basis points</p>
          </div>

          {/* Price Range Distribution */}
          <div className="pb-3 border-b border-[#bfbfbf] mb-4">
            <label className="font-inter font-bold text-[13.7px] text-[#1a1a1a] block mb-4">Price Range Distribution</label>

            <div
              className="bg-white p-3 border-2 border-neutral-700"
              style={{
                boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
              }}
            >
              <div className="h-[200px]">
                {hasChartData ? (
                  <Bar data={simulationChartData} options={chartOptions} />
                ) : (
                  <div className="h-full flex items-center justify-center text-[#666666] font-inter text-[14px]">
                    Enter deposit amounts to see distribution preview
                  </div>
                )}
              </div>
            </div>

            {/* Price Labels - 4 decimal places */}
            <div className="grid grid-cols-3 gap-2 mt-4 font-inter text-[13.7px]">
              <div>
                <span className="font-bold text-[#1a1a1a]">Min Price:</span>{' '}
                <span className="text-[#1a1a1a]">{formatNumber(minPriceWithDecimals, 4, 0, numberLocale)}</span>
              </div>
              <div className="text-center">
                <span className="font-bold text-[#1a1a1a]">Current:</span>{' '}
                <span className="text-[#1a1a1a]">{formatNumber(currentPriceWithDecimals, 4, 0, numberLocale)}</span>
              </div>
              <div className="text-right">
                <span className="font-bold text-[#1a1a1a]">Max Price:</span>{' '}
                <span className="text-[#1a1a1a]">{formatNumber(maxPriceWithDecimals, 4, 0, numberLocale)}</span>
              </div>
            </div>
          </div>

          {/* Strategy Explanation with bin count and shape */}
          <div
            className="bg-[#eaf4ff] p-4"
            style={{
              boxShadow:
                'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
            }}
          >
            <div className="flex items-start gap-3">
              <span className="text-[14px]">💡</span>
              <p className="font-roboto text-[14px] text-[#0f06aa] leading-[18.75px]">
                This strategy uses a <strong>{shapeName}</strong> distribution with <strong>{recommendedBinCount} bins</strong>. The{' '}
                {poolData.lbBinStep} basis points bin step provides balanced trading frequency and fee collection.
              </p>
            </div>
          </div>
        </div>

        {/* Deposit Section */}
        <div
          className="bg-figma-gray-table mx-[14px] mt-[10px] p-4"
          style={{
            boxShadow:
              'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
          }}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-press-start text-[10px] text-[#22222a]">Enter Deposit Amount</h3>
            <AutoFillSwitch />
          </div>

          {/* Token X Input */}
          <div className="mb-4">
            <div
              className={`bg-white p-4 ${!inputAmountXAvailable ? 'opacity-50' : ''}`}
              style={{
                boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
              }}
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={tokenXAmount}
                  onChange={(e) => setTokenXAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={!inputAmountXAvailable}
                  className="font-press-start text-[24px] text-[#22222a] bg-transparent outline-none w-full disabled:cursor-not-allowed"
                />
                <div
                  className="bg-figma-gray-table h-[38px] px-3 flex items-center gap-2"
                  style={{
                    boxShadow:
                      'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  }}
                >
                  <TokenTicker
                    logoURI={getTokenLogo(originalPoolData.tokenX.address)}
                    symbol={poolData.tokenX.symbol}
                    className="w-6 h-6"
                  />
                  <span className="font-press-start text-[12px] text-[#22222a] flex items-center">
                    {poolData.tokenX.symbol}
                    {originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address && (
                      <ArrowLeftRight
                        className="w-4 h-4 ml-1 hover:cursor-pointer text-figma-text-gray"
                        onClick={() => setIsNativeIn(!isNativeIn)}
                      />
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-press-start text-[10px] text-[#22222a]">${formatNumber(tokenXUsdValue, 2, 0, numberLocale)}</span>
              <span className="font-press-start text-[10px] text-[rgba(34,34,42,0.7)]">
                Balance: {formatNumber(tokenXBalance, 4, 0, numberLocale)} |{' '}
                <button
                  onClick={() =>
                    setTokenXAmount(formatStringOnlyLocale((tokenXBalance * 0.5).toFixed(originalPoolData.tokenX.decimals), numberLocale))
                  }
                  className="hover:underline"
                  disabled={!inputAmountXAvailable}
                >
                  50%
                </button>{' '}
                <button
                  onClick={() => {
                    // Reserve gas fee when using native token
                    if (isNativeIn && originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address) {
                      const availableBalance = tokenXBalance - 0.01 > 0 ? tokenXBalance - 0.01 : 0;
                      setTokenXAmount(formatStringOnlyLocale(availableBalance.toFixed(originalPoolData.tokenX.decimals), numberLocale));
                    } else {
                      setTokenXAmount(formatStringOnlyLocale(tokenXBalance.toFixed(originalPoolData.tokenX.decimals), numberLocale));
                    }
                  }}
                  className="hover:underline"
                  disabled={!inputAmountXAvailable}
                >
                  MAX
                </button>
              </span>
            </div>
          </div>

          {/* Token Y Input */}
          <div className="mb-4">
            <div
              className={`bg-white p-4 ${!inputAmountYAvailable ? 'opacity-50' : ''}`}
              style={{
                boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
              }}
            >
              <div className="flex items-center justify-between">
                <input
                  type="text"
                  value={tokenYAmount}
                  onChange={(e) => setTokenYAmount(e.target.value)}
                  placeholder="0.0"
                  disabled={!inputAmountYAvailable}
                  className="font-press-start text-[24px] text-[#22222a] bg-transparent outline-none w-full disabled:cursor-not-allowed"
                />
                <div
                  className="bg-figma-gray-table h-[38px] px-3 flex items-center gap-2"
                  style={{
                    boxShadow:
                      'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  }}
                >
                  <TokenTicker
                    logoURI={getTokenLogo(originalPoolData.tokenY.address)}
                    symbol={poolData.tokenY.symbol}
                    className="w-6 h-6"
                  />
                  <span className="font-press-start text-[12px] text-[#22222a] flex items-center">
                    {poolData.tokenY.symbol}
                    {originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address && (
                      <ArrowLeftRight
                        className="w-4 h-4 ml-1 hover:cursor-pointer text-figma-text-gray"
                        onClick={() => setIsNativeIn(!isNativeIn)}
                      />
                    )}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex justify-between mt-2">
              <span className="font-press-start text-[10px] text-[#22222a]">${formatNumber(tokenYUsdValue, 2, 0, numberLocale)}</span>
              <span className="font-press-start text-[10px] text-[rgba(34,34,42,0.7)]">
                Balance: {formatNumber(tokenYBalance, 4, 0, numberLocale)} |{' '}
                <button
                  onClick={() =>
                    setTokenYAmount(formatStringOnlyLocale((tokenYBalance * 0.5).toFixed(originalPoolData.tokenY.decimals), numberLocale))
                  }
                  className="hover:underline"
                  disabled={!inputAmountYAvailable}
                >
                  50%
                </button>{' '}
                <button
                  onClick={() => {
                    // Reserve gas fee when using native token
                    if (isNativeIn && originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address) {
                      const availableBalance = tokenYBalance - 0.01 > 0 ? tokenYBalance - 0.01 : 0;
                      setTokenYAmount(formatStringOnlyLocale(availableBalance.toFixed(originalPoolData.tokenY.decimals), numberLocale));
                    } else {
                      setTokenYAmount(formatStringOnlyLocale(tokenYBalance.toFixed(originalPoolData.tokenY.decimals), numberLocale));
                    }
                  }}
                  className="hover:underline"
                  disabled={!inputAmountYAvailable}
                >
                  MAX
                </button>
              </span>
            </div>
          </div>
        </div>

        {/* Add Liquidity Button */}
        <div className="px-[14px] py-4">
          <AddLiquidityButton
            inputAmountXAvailable={inputAmountXAvailable}
            inputAmountYAvailable={inputAmountYAvailable}
            typedAmountX={tokenXAmount}
            typedAmountY={tokenYAmount}
            amountXBalance={tokenXBalance.toString()}
            amountYBalance={tokenYBalance.toString()}
            addLiquidityInput={addLiquidityInput}
            onSuccess={() => {
              setTokenXAmount('');
              setTokenYAmount('');
              refetchTokensData();
            }}
            tokenXSymbol={poolData.tokenX.symbol}
            tokenYSymbol={poolData.tokenY.symbol}
            isNativeIn={isNativeIn}
          />
        </div>
      </div>
    </CardWithHeader>
  );
}
