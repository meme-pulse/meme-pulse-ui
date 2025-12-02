// DLMM AI Suggestion API - Type Definitions
// 클라이언트에서 데이터를 전송하고, 서버는 계산 + AI 호출만 담당

// ========================================
// Client → API Request Types
// ========================================

export type RiskProfile = 'aggressive' | 'defensive' | 'auto';
export type DistributionShape = 'SPOT' | 'CURVE' | 'BID_ASK';

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

export interface TokenPriceData {
  date: number; // timestamp
  openPriceUSD: number;
  highPriceUSD: number;
  lowPriceUSD: number;
  closePriceUSD: number;
  volumeUSD: number;
}

export interface PairHistoryData {
  date: number;
  volumeUSD: number;
  feesUSD: number;
  txCount: number;
  tvlUSD: number;
}

export interface BinData {
  binId: number;
  reserveX: number;
  reserveY: number;
  priceX: number;
  priceY: number;
  lpCount: number;
}

// 클라이언트에서 보내는 전체 요청
export interface DLMMSuggestionRequest {
  // 유저 선택
  riskProfile: RiskProfile;

  // 토큰 정보
  tokenX: {
    address: string;
    symbol: string;
    decimals: number;
  };
  tokenY: {
    address: string;
    symbol: string;
    decimals: number;
  };

  // 같은 토큰 페어의 모든 풀들 (다른 binStep)
  availablePools: PoolInfo[];

  // TokenHourData/TokenDayData에서 가져온 가격 히스토리 (7일)
  tokenXPriceHistory: TokenPriceData[];
  tokenYPriceHistory: TokenPriceData[];

  // LBPairHourData/LBPairDayData에서 가져온 볼륨 히스토리 (7일, 최고 TVL 풀 기준)
  pairHistory: PairHistoryData[];

  // Bin 분포 데이터 (최고 TVL 풀, activeId 기준 ±50 bins)
  binDistribution: BinData[];

  // 현재 활성 bin ID (최고 TVL 풀 기준)
  currentActiveId: number;
}

// ========================================
// Calculated Metrics (서버에서 계산)
// ========================================

export interface CalculatedMetrics {
  // 변동성 (0-100 스케일)
  tokenXVolatility: number;
  tokenYVolatility: number;
  combinedVolatility: number;

  // 볼륨 분석
  avgDailyVolumeUSD: number;
  volumeTrend: 'increasing' | 'stable' | 'decreasing';
  volumeToTvlRatio: number;

  // 수수료 분석
  avgDailyFeesUSD: number;
  feeAPRByPool: Record<string, number>; // pairAddress -> APR

  // 유동성 분포 분석
  liquidityConcentration: number; // 중앙 ±10 bin의 TVL 비율 (0-100)
  activeBinsCount: number;

  // 시장 상태
  marketCondition: 'stable' | 'trending_up' | 'trending_down' | 'volatile';
  priceChange7d: number; // %
}

// ========================================
// AI Response Types
// ========================================

export type ImpermanentLossRisk = 'low' | 'medium' | 'high';
export type RebalanceFrequency = 'hourly' | 'daily' | 'weekly' | 'rarely';

export interface AIStrategyRecommendation {
  // 추천 풀
  recommendedPool: {
    pairAddress: string;
    binStep: number;
    reasoning: string;
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
    impermanentLossRisk: ImpermanentLossRisk;
    rebalanceFrequency: RebalanceFrequency;
  };

  // 분석 설명
  analysis: {
    marketCondition: string;
    keyFactors: string[];
    reasoning: string;
  };
}

// ========================================
// API Response
// ========================================

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
