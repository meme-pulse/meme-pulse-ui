// DLMM AI Suggestion Hook
// Fetches additional data and calls AI API for LP strategy recommendations

import { useMutation } from '@tanstack/react-query';
import { getAISuggestionData } from '@/lib/hasura-client';

// Types matching the API
export type RiskProfile = 'aggressive' | 'defensive' | 'auto';
export type DistributionShape = 'SPOT' | 'CURVE' | 'BID_ASK';

export interface TokenInfo {
  address: string;
  symbol: string;
  decimals: number;
}

export interface PoolInfo {
  pairAddress: string;
  binStep: number;
  activeId: number;
  tvlUSD: number;
  volume24hUSD: number;
  fees24hUSD: number;
  txCount24h: number;
  baseFeePct: number;
  lpCount: number;
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

export interface UseDLMMSuggestionParams {
  // Token info
  tokenX: TokenInfo;
  tokenY: TokenInfo;

  // User preference
  riskProfile: RiskProfile;

  // 이미 useGroupedPools에서 가져온 풀 목록 (같은 토큰 페어의 모든 binStep 풀들)
  availablePools: PoolInfo[];

  // Best pool info (최고 TVL 풀)
  bestPoolAddress: string;
  bestPoolActiveId: number;
}

/**
 * Hook to generate AI DLMM suggestion
 * availablePools는 이미 useGroupedPools에서 가져온 데이터를 사용
 */
export function useDLMMSuggestion() {
  return useMutation({
    mutationFn: async (params: UseDLMMSuggestionParams) => {
      const { tokenX, tokenY, riskProfile, availablePools, bestPoolAddress, bestPoolActiveId } = params;

      // 1. 추가 데이터만 Hasura에서 조회 (pools는 이미 있음)
      const additionalData = await getAISuggestionData(tokenX.address, tokenY.address, bestPoolAddress, bestPoolActiveId);

      // 2. API 요청 페이로드 구성
      const requestPayload = {
        riskProfile,
        tokenX,
        tokenY,
        availablePools, // 이미 있는 데이터 사용
        tokenXPriceHistory: additionalData.tokenXPriceHistory,
        tokenYPriceHistory: additionalData.tokenYPriceHistory,
        pairHistory: additionalData.pairHistory,
        binDistribution: additionalData.binDistribution,
        currentActiveId: bestPoolActiveId,
      };

      // 3. AI API 호출 (25초 타임아웃)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 25000);

      try {
        const response = await fetch('/api/dlmm-suggest', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          throw new Error(errorData.error || `API error: ${response.status}`);
        }

        const result: DLMMSuggestionResponse = await response.json();

        if (!result.success) {
          throw new Error(result.error || 'AI suggestion failed');
        }

        return result.data!;
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    },
  });
}

/**
 * Map distribution shape string to LiquidityDistribution enum value
 */
export function mapDistributionShape(shape: string): number {
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

/**
 * AI 분석 결과를 UI에 표시하기 위한 타입
 */
export interface AIAnalysisDisplay {
  expectedAPR: string;
  impermanentLossRisk: 'low' | 'medium' | 'high';
  rebalanceFrequency: string;
  reasoning: string;
  keyFactors: string[];
  marketCondition: string;
}

/**
 * API 응답에서 UI 표시용 분석 결과 추출
 */
export function extractAnalysisDisplay(recommendation: AIStrategyRecommendation): AIAnalysisDisplay {
  return {
    expectedAPR: recommendation.riskAssessment.expectedAPR,
    impermanentLossRisk: recommendation.riskAssessment.impermanentLossRisk,
    rebalanceFrequency: recommendation.riskAssessment.rebalanceFrequency,
    reasoning: recommendation.analysis.reasoning,
    keyFactors: recommendation.analysis.keyFactors,
    marketCondition: recommendation.analysis.marketCondition,
  };
}
