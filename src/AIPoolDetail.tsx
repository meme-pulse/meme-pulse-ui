import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState, useCallback } from 'react';
import { usePublicClient } from 'wagmi';

import { LB_FACTORY_V22_ADDRESS, LBFactoryV21ABI, LiquidityDistribution } from './lib/sdk';
import { DEFAULT_CHAINID } from './constants';
import { useActiveId } from './hooks/use-active-id';
import { useTokenList } from './hooks/use-token-list';
import { customReadClient } from './main';
import { mockPoolData } from './mock/api-data';
import { useGroupedPools } from './hooks/use-grouped-pools';

import { AIStrategySelection, type RiskPreference } from './components/pool-detail/ai-strategy-selection';
import { AIAnalysisProgress } from './components/pool-detail/ai-analysis-progress';
import { AIStrategyResult } from './components/pool-detail/ai-strategy-result';

export interface PoolData {
  pairAddress: string;
  chain: string;
  name: string;
  status: string;
  version: string;
  tokenX: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  tokenY: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  reserveX: number;
  reserveY: number;
  lbBinStep: number;
  lbBaseFeePct: number;
  lbMaxFeePct: number;
  activeBinId: number;
  liquidityUsd: number;
  liquidityNative: string;
  liquidityDepthMinus: number;
  liquidityDepthPlus: number;
  liquidityDepthTokenX: number;
  liquidityDepthTokenY: number;
  volumeUsd: number;
  volumeNative: string;
  feesUsd: number;
  feesNative: string;
  protocolSharePct: number;
}

// Aggregated data for all pools in a token pair
export interface AggregatedPoolData {
  totalLiquidityUsd: number;
  totalVolumeUsd: number;
  totalFeesUsd: number;
  poolCount: number;
}

// Best pool data for the token pair
export interface BestPoolInfo {
  pairAddress: string;
  lbBinStep: number;
  liquidityUsd: number;
  activeBinId: number;
}

type AIFlowStep = 'selection' | 'analysis' | 'result';

export interface StrategyData {
  minBinId: number;
  maxBinId: number;
  binCount: number;
  distributionShape: LiquidityDistribution;
}

const DEFAULT_BIN_COUNT = 51;

export default function AIPoolDetail() {
  const { tokenAAddress, tokenBAddress } = useParams();
  const publicClient = usePublicClient();

  // AI Flow state
  const [aiFlowStep, setAiFlowStep] = useState<AIFlowStep>('selection');
  const [strategyData, setStrategyData] = useState<StrategyData | undefined>(undefined);
  const [isGeneratingStrategy, setIsGeneratingStrategy] = useState(false);

  const { data: tokenListData } = useTokenList();

  // Fetch all grouped pools to get aggregated data
  const { data: groupedPoolsData } = useGroupedPools();

  // Find the matching token pair group
  const matchingGroup = useMemo(() => {
    if (!groupedPoolsData || !tokenAAddress || !tokenBAddress) return undefined;

    return groupedPoolsData.find(
      (group) =>
        (group.tokenX.address.toLowerCase() === tokenAAddress.toLowerCase() &&
          group.tokenY.address.toLowerCase() === tokenBAddress.toLowerCase()) ||
        (group.tokenX.address.toLowerCase() === tokenBAddress.toLowerCase() &&
          group.tokenY.address.toLowerCase() === tokenAAddress.toLowerCase())
    );
  }, [groupedPoolsData, tokenAAddress, tokenBAddress]);

  // Find the aggregated data for this token pair
  const aggregatedData = useMemo<AggregatedPoolData | undefined>(() => {
    if (!matchingGroup) return undefined;

    return {
      totalLiquidityUsd: matchingGroup.totalLiquidityUsd,
      totalVolumeUsd: matchingGroup.totalVolume24h,
      totalFeesUsd: matchingGroup.totalFees24h,
      poolCount: matchingGroup.groups.length,
    };
  }, [matchingGroup]);

  // Find the pool with highest liquidity for default strategy
  const bestPoolInfo = useMemo<BestPoolInfo | undefined>(() => {
    if (!matchingGroup || matchingGroup.groups.length === 0) return undefined;

    // Sort by liquidity and get the highest
    const sortedPools = [...matchingGroup.groups].sort((a, b) => b.liquidityUsd - a.liquidityUsd);
    const bestPool = sortedPools[0];

    return {
      pairAddress: bestPool.pairAddress,
      lbBinStep: bestPool.lbBinStep,
      liquidityUsd: bestPool.liquidityUsd,
      activeBinId: bestPool.activeBinId,
    };
  }, [matchingGroup]);

  // First, get the best pool for this token pair
  const { data: lbPairData } = useQuery({
    queryKey: ['lbPairAddr-ai', tokenAAddress, tokenBAddress, bestPoolInfo?.pairAddress],
    queryFn: async () => {
      // If we have best pool info from grouped data, use it
      if (bestPoolInfo) {
        return { LBPair: bestPoolInfo.pairAddress, binStep: bestPoolInfo.lbBinStep };
      }

      // Fallback: Try common bin steps to find available pools
      const binSteps = [1, 5, 10, 15, 20, 25, 50, 100];

      for (const binStep of binSteps) {
        try {
          const lbPairInfo = await customReadClient?.readContract({
            address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
            abi: LBFactoryV21ABI,
            functionName: 'getLBPairInformation',
            args: [tokenAAddress as `0x${string}`, tokenBAddress as `0x${string}`, BigInt(binStep)],
          });

          const pairInfo = lbPairInfo as { LBPair: string };
          if (pairInfo?.LBPair && pairInfo.LBPair !== '0x0000000000000000000000000000000000000000') {
            return { LBPair: pairInfo.LBPair, binStep };
          }
        } catch {
          // Continue to next bin step
        }
      }

      // Fallback: return first bin step (will likely fail but shows loading)
      return { LBPair: '', binStep: 1 };
    },
    enabled: !!tokenAAddress && !!tokenBAddress && !!publicClient,
    staleTime: 1000 * 60,
  });

  const { data: poolData, isLoading } = useQuery<PoolData>({
    queryKey: ['poolData-ai', tokenAAddress, tokenBAddress, lbPairData?.binStep],
    queryFn: async () => {
      const data = await mockPoolData(lbPairData?.LBPair as string);
      return data;
    },
    enabled: !!lbPairData?.LBPair,
    staleTime: 1000 * 60,
  });

  const activeId = useActiveId(poolData?.pairAddress as `0x${string}`, poolData?.activeBinId as number, !!poolData);

  // Get default strategy using highest liquidity pool's bin step with SPOT shape
  const getDefaultStrategy = useCallback((): StrategyData => {
    const halfBins = Math.floor((DEFAULT_BIN_COUNT - 1) / 2);
    return {
      minBinId: activeId - halfBins,
      maxBinId: activeId + halfBins,
      binCount: DEFAULT_BIN_COUNT,
      distributionShape: LiquidityDistribution.SPOT,
    };
  }, [activeId]);

  // AI Flow handlers
  const handleGenerateStrategy = useCallback(
    async (preference: RiskPreference) => {
      setIsGeneratingStrategy(true);
      setAiFlowStep('analysis');

      // Default strategy: highest liquidity pool's bin step, SPOT shape, default range
      const defaultStrategy = getDefaultStrategy();

      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 5000);

        const response = await fetch('/api/dlmm-suggest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokenX: poolData?.tokenX.address,
            tokenY: poolData?.tokenY.address,
            riskTolerance: preference,
            activeBinId: activeId,
            binStep: poolData?.lbBinStep,
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          console.warn('AI API returned non-ok response, using default SPOT strategy');
          setStrategyData(defaultStrategy);
          return;
        }

        const result = await response.json();

        if (result.success && result.data?.test?.dlmmSuggestion) {
          const suggestion = result.data.test.dlmmSuggestion;
          // Map string to LiquidityDistribution enum
          let shape = LiquidityDistribution.SPOT;
          if (suggestion.distributionShape === 'CURVE') shape = LiquidityDistribution.CURVE;
          else if (suggestion.distributionShape === 'BID_ASK') shape = LiquidityDistribution.BID_ASK;

          setStrategyData({
            minBinId: suggestion.minBinId,
            maxBinId: suggestion.maxBinId,
            binCount: suggestion.binCount,
            distributionShape: shape,
          });
        } else {
          console.warn('AI API response missing data, using default SPOT strategy');
          setStrategyData(defaultStrategy);
        }
      } catch {
        console.warn('AI API error, using default SPOT strategy with highest liquidity pool');
        setStrategyData(defaultStrategy);
      } finally {
        setIsGeneratingStrategy(false);
      }
    },
    [poolData, activeId, getDefaultStrategy]
  );

  const handleAnalysisComplete = useCallback(() => {
    setAiFlowStep('result');
  }, []);

  if (isLoading || !poolData) {
    return (
      <div className="min-h-[90vh] bg-[#060208] flex justify-center items-center relative overflow-hidden">
        <div className="flex flex-col justify-center items-center z-10 gap-4">
          <img src="/pixel_pulse_white.png" alt="MemePulse Logo" className="w-16 h-20 object-contain animate-pulse" />
          <span className="text-[#facb25] text-[12px] animate-pulse" style={{ fontFamily: '"Press Start 2P", cursive' }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060208]">
      {/* Space Background with Stars */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #060208 50%, #060208 100%)',
          }}
        />
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, white, transparent),
              radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 90px 40px, white, transparent),
              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 160px 120px, white, transparent),
              radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 250px 180px, white, transparent),
              radial-gradient(1px 1px at 300px 90px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 350px 30px, white, transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '400px 200px',
          }}
        />
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[400px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(137, 91, 245, 0.3) 0%, transparent 70%)',
          }}
        />
      </div>

      {/* AI Flow Content */}
      <div className="max-w-[700px] mx-auto px-4 sm:px-6 lg:px-8 pt-8 pb-16 relative z-10">
        {aiFlowStep === 'selection' && (
          <AIStrategySelection
            poolData={poolData}
            aggregatedData={aggregatedData}
            onGenerateStrategy={handleGenerateStrategy}
            isLoading={isGeneratingStrategy}
          />
        )}

        {aiFlowStep === 'analysis' && <AIAnalysisProgress poolData={poolData} onAnalysisComplete={handleAnalysisComplete} />}

        {aiFlowStep === 'result' && <AIStrategyResult poolData={poolData} tokenListData={tokenListData} strategyData={strategyData} />}
      </div>
    </div>
  );
}
