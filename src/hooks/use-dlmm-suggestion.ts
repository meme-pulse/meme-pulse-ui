// DLMM AI Suggestion Hook
// Fetches additional data and calls AI API for LP strategy recommendations

import { useMutation } from '@tanstack/react-query';
import { getAISuggestionData } from '@/lib/hasura-client';

// Viral Score Server URL
const VIRAL_SCORE_API_URL = import.meta.env.VITE_VIRAL_SCORE_API_URL || 'https://viral-score-server-production.up.railway.app';

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

// Viral Score Data
export interface ViralScoreData {
  tokenSymbol: string;
  pulseScore: number;
  viralRank: 1 | 2 | 3 | null;
  isViralToken: boolean;
  posts: { '1h': number; '1d': number; '7d': number };
  views: { '1h': number; '1d': number; '7d': number };
  likes: { '1h': number; '1d': number; '7d': number };
}

// Pool Parameters
export interface PoolParameters {
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  protocolShare: number;
  protocolSharePct: number;
  maxVolatilityAccumulator: number;
}

export type ImpermanentLossRisk = 'low' | 'medium' | 'high';
export type RebalanceFrequency = 'hourly' | 'daily' | 'weekly' | 'rarely';

export interface AIStrategyRecommendation {
  // 추천 풀
  recommendedPool: {
    pairAddress: string;
    binStep: number;
    reasoning: string;
    protocolSharePct?: number; // 현재 적용된 protocol share %
  };

  // LP 전략
  strategy: {
    minBinId: number;
    maxBinId: number;
    binCount: number;
    distributionShape: DistributionShape;
  };

  // 리스크 평가
  riskAssessment: {
    expectedAPR: string;
    baseAPR?: string; // viral boost 없는 기본 APR
    viralBoostAPR?: string; // viral boost 포함 APR
    impermanentLossRisk: ImpermanentLossRisk;
    rebalanceFrequency: RebalanceFrequency;
    viralBoostActive: boolean;
  };

  // 분석 설명
  analysis: {
    marketCondition: string;
    keyFactors: string[];
    reasoning: string;
    viralAnalysis?: string; // viral score 관련 분석
    socialSentiment?: 'bullish' | 'neutral' | 'bearish';
  };

  // 상세 설명 (Why this strategy?)
  detailedExplanation: {
    // 왜 이 풀을 선택했는지
    poolSelectionReason: string;
    // 왜 이 bin range를 선택했는지
    binRangeReason: string;
    // 왜 이 distribution shape를 선택했는지
    shapeReason: string;
    // 리스크와 리워드 트레이드오프 설명
    riskRewardTradeoff: string;
    // viral boost가 있다면 어떤 영향을 미치는지
    viralBoostImpact?: string;
    // 재조정이 필요한 상황 설명
    rebalanceScenarios: string[];
    // 주의사항/경고
    warnings: string[];
    // 추천 요약 (한 문장)
    tldr: string;
  };
}

export interface CalculatedMetrics {
  // 변동성 (0-100 스케일)
  tokenXVolatility: number;
  tokenYVolatility: number;
  combinedVolatility: number;
  hourlyVolatility?: number; // 24시간 내 hourly 변동성

  // 볼륨 분석
  avgDailyVolumeUSD: number;
  volumeTrend: 'increasing' | 'stable' | 'decreasing';
  volumeToTvlRatio: number;
  avgHourlyVolumeUSD?: number; // 최근 24시간 평균

  // 수수료 분석
  avgDailyFeesUSD: number;
  feeAPRByPool: Record<string, number>; // pairAddress -> APR
  effectiveAPRByPool: Record<string, number>; // viral boost 반영된 실제 APR

  // 유동성 분포 분석
  liquidityConcentration: number; // 중앙 ±10 bin의 TVL 비율 (0-100)
  activeBinsCount: number;

  // 시장 상태
  marketCondition: 'stable' | 'trending_up' | 'trending_down' | 'volatile';
  priceChange7d: number; // %

  // Viral Score 관련 메트릭
  viralMetrics: {
    tokenXScore: number; // 0-100
    tokenYScore: number; // 0-100
    tokenXRank: 1 | 2 | 3 | null;
    tokenYRank: 1 | 2 | 3 | null;
    hasViralBoost: boolean;
    viralBoostMultiplier: number; // 1.0 = no boost, 1.4 = rank 1 boost
    socialMomentum: 'rising' | 'stable' | 'declining'; // 소셜 트렌드
  };

  // Pool Parameter 분석
  poolParameterAnalysis: {
    avgProtocolShare: number; // 평균 protocol share
    bestProtocolSharePool: string | null; // 가장 낮은 protocol share 풀
    feeVolatilityRisk: 'low' | 'medium' | 'high'; // variableFeeControl 기반
  };
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
 * Fetch viral score data from the viral-score-server
 * Returns viral data for both tokens if available
 */
async function fetchViralScoreData(
  tokenXSymbol: string,
  tokenYSymbol: string
): Promise<{ tokenXViralData?: ViralScoreData; tokenYViralData?: ViralScoreData }> {
  try {
    const response = await fetch(`${VIRAL_SCORE_API_URL}/api/score/tokens/leaderboard?limit=50`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    if (!response.ok) {
      console.warn('[ViralScore] Failed to fetch leaderboard:', response.status);
      return {};
    }

    interface LeaderboardEntry {
      rank: number;
      tokenSymbol: string;
      pulseScore: number;
      posts: { '1h': number; '1d': number; '7d': number };
      views: { '1h': number; '1d': number; '7d': number };
      likes: { '1h': number; '1d': number; '7d': number };
    }

    const data = (await response.json()) as { leaderboard: LeaderboardEntry[] };
    const leaderboard = data.leaderboard || [];

    const findToken = (symbol: string): ViralScoreData | undefined => {
      const entry = leaderboard.find((e) => e.tokenSymbol.toUpperCase() === symbol.toUpperCase());
      if (!entry) return undefined;

      // Viral rank: only top 3 get viral boost
      const viralRank = entry.rank <= 3 ? (entry.rank as 1 | 2 | 3) : null;

      return {
        tokenSymbol: entry.tokenSymbol,
        pulseScore: entry.pulseScore,
        viralRank,
        isViralToken: viralRank !== null,
        posts: entry.posts,
        views: entry.views,
        likes: entry.likes,
      };
    };

    return {
      tokenXViralData: findToken(tokenXSymbol),
      tokenYViralData: findToken(tokenYSymbol),
    };
  } catch (error) {
    console.warn('[ViralScore] Error fetching viral scores:', error);
    return {};
  }
}

/**
 * Hook to generate AI DLMM suggestion
 * availablePools는 이미 useGroupedPools에서 가져온 데이터를 사용
 */
export function useDLMMSuggestion() {
  return useMutation({
    mutationFn: async (params: UseDLMMSuggestionParams) => {
      const { tokenX, tokenY, riskProfile, availablePools, bestPoolAddress, bestPoolActiveId } = params;

      // 1. 추가 데이터 병렬 조회: Hasura + Viral Score
      const [additionalData, viralData] = await Promise.all([
        getAISuggestionData(tokenX.address, tokenY.address, bestPoolAddress, bestPoolActiveId),
        fetchViralScoreData(tokenX.symbol, tokenY.symbol),
      ]);

      // 2. API 요청 페이로드 구성 (모든 데이터 포함)
      const requestPayload = {
        riskProfile,
        tokenX: {
          ...tokenX,
          priceUSD: additionalData.tokenXPriceUSD,
        },
        tokenY: {
          ...tokenY,
          priceUSD: additionalData.tokenYPriceUSD,
        },
        availablePools: availablePools.map((pool) => ({
          ...pool,
          parameters: pool.pairAddress === bestPoolAddress ? additionalData.poolParameters : undefined,
        })),
        tokenXPriceHistory: additionalData.tokenXPriceHistory,
        tokenYPriceHistory: additionalData.tokenYPriceHistory,
        pairHistory: additionalData.pairHistory,
        recentHourlyData: additionalData.recentHourlyData,
        binDistribution: additionalData.binDistribution,
        currentActiveId: bestPoolActiveId,
        // Viral score data
        tokenXViralData: viralData.tokenXViralData,
        tokenYViralData: viralData.tokenYViralData,
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
  baseAPR?: string;
  viralBoostAPR?: string;
  impermanentLossRisk: ImpermanentLossRisk;
  rebalanceFrequency: string;
  reasoning: string;
  keyFactors: string[];
  marketCondition: string;
  viralAnalysis?: string;
  socialSentiment?: 'bullish' | 'neutral' | 'bearish';
  viralBoostActive: boolean;
  detailedExplanation?: AIStrategyRecommendation['detailedExplanation'];
}

/**
 * API 응답에서 UI 표시용 분석 결과 추출
 */
export function extractAnalysisDisplay(recommendation: AIStrategyRecommendation): AIAnalysisDisplay {
  return {
    expectedAPR: recommendation.riskAssessment.expectedAPR,
    baseAPR: recommendation.riskAssessment.baseAPR,
    viralBoostAPR: recommendation.riskAssessment.viralBoostAPR,
    impermanentLossRisk: recommendation.riskAssessment.impermanentLossRisk,
    rebalanceFrequency: recommendation.riskAssessment.rebalanceFrequency,
    reasoning: recommendation.analysis.reasoning,
    keyFactors: recommendation.analysis.keyFactors,
    marketCondition: recommendation.analysis.marketCondition,
    viralAnalysis: recommendation.analysis.viralAnalysis,
    socialSentiment: recommendation.analysis.socialSentiment,
    viralBoostActive: recommendation.riskAssessment.viralBoostActive,
    detailedExplanation: recommendation.detailedExplanation,
  };
}
