// DLMM AI Suggestion Hook
// Fetches data and calls AI API for LP strategy recommendations

import { useMutation, useQuery } from '@tanstack/react-query';
import { getAISuggestionData, getPoolsForTokenPair } from '@/lib/hasura-client';

// Types matching the API
export type RiskProfile = 'aggressive' | 'defensive' | 'auto';
export type DistributionShape = 'SPOT' | 'CURVE' | 'BID_ASK';

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface AIStrategyRecommendation {
  recommendedPool: {
    pairAddress: string;
    binStep: number;
    reasoning: string;
  };
  strategy: {
    minBinId: number;
    maxBinId: number;
    binCount: number;
    distributionShape: DistributionShape;
  };
  riskAssessment: {
    expectedAPR: string;
    impermanentLossRisk: 'low' | 'medium' | 'high';
    rebalanceFrequency: 'hourly' | 'daily' | 'weekly' | 'rarely';
  };
  analysis: {
    marketCondition: string;
    keyFactors: string[];
    reasoning: string;
  };
}

export interface CalculatedMetrics {
  tokenXVolatility: number;
  tokenYVolatility: number;
  combinedVolatility: number;
  avgDailyVolumeUSD: number;
  volumeTrend: 'increasing' | 'stable' | 'decreasing';
  volumeToTvlRatio: number;
  avgDailyFeesUSD: number;
  feeAPRByPool: Record<string, number>;
  liquidityConcentration: number;
  activeBinsCount: number;
  marketCondition: 'stable' | 'trending_up' | 'trending_down' | 'volatile';
  priceChange7d: number;
}

export interface DLMMSuggestionResponse {
  success: boolean;
  data?: {
    recommendation: AIStrategyRecommendation;
    calculatedMetrics: CalculatedMetrics;
    metadata: {
      tokenPair: string;
      riskProfile: RiskProfile;
      timestamp: string;
      poolsAnalyzed: number;
    };
  };
  error?: string;
}

interface UseDLMMSuggestionParams {
  tokenX: TokenInfo;
  tokenY: TokenInfo;
  riskProfile: RiskProfile;
  // Best pool info for data fetching
  bestPoolAddress?: string;
  currentActiveId?: number;
}

/**
 * Hook to fetch available pools for a token pair
 */
export function useAvailablePools(tokenXAddress?: string, tokenYAddress?: string) {
  return useQuery({
    queryKey: ['availablePools', tokenXAddress, tokenYAddress],
    queryFn: () => getPoolsForTokenPair(tokenXAddress!, tokenYAddress!),
    enabled: !!tokenXAddress && !!tokenYAddress,
    staleTime: 1000 * 60, // 1 minute
  });
}

/**
 * Hook to generate AI DLMM suggestion
 */
export function useDLMMSuggestion() {
  return useMutation({
    mutationFn: async (params: UseDLMMSuggestionParams) => {
      const { tokenX, tokenY, riskProfile, bestPoolAddress, currentActiveId } = params;

      // 1. Fetch all required data from Hasura
      if (!bestPoolAddress || !currentActiveId) {
        throw new Error('Best pool address and active ID are required');
      }

      const aiData = await getAISuggestionData(
        tokenX.address,
        tokenY.address,
        bestPoolAddress,
        currentActiveId
      );

      // 2. Prepare request payload for API
      const requestPayload = {
        riskProfile,
        tokenX,
        tokenY,
        availablePools: aiData.availablePools,
        tokenXPriceHistory: aiData.tokenXPriceHistory,
        tokenYPriceHistory: aiData.tokenYPriceHistory,
        pairHistory: aiData.pairHistory,
        binDistribution: aiData.binDistribution,
        currentActiveId,
      };

      // 3. Call AI API
      const response = await fetch('/api/dlmm-suggest', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API error: ${response.status}`);
      }

      const result: DLMMSuggestionResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || 'AI suggestion failed');
      }

      return result.data!;
    },
  });
}

/**
 * Map distribution shape string to enum value
 */
export function mapDistributionShape(shape: string): number {
  // Maps to LiquidityDistribution enum from SDK
  switch (shape) {
    case 'SPOT':
      return 0; // LiquidityDistribution.SPOT
    case 'CURVE':
      return 1; // LiquidityDistribution.CURVE
    case 'BID_ASK':
      return 2; // LiquidityDistribution.BID_ASK
    default:
      return 0;
  }
}

