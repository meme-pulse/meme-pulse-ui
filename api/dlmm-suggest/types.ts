// DLMM AI Suggestion API - Type Definitions
// 클라이언트에서 데이터를 전송하고, 서버는 계산 + AI 호출만 담당

// ========================================
// Client → API Request Types
// ========================================

export type RiskProfile = 'aggressive' | 'defensive' | 'auto';
export type DistributionShape = 'SPOT' | 'CURVE' | 'BID_ASK';

// Viral Score 관련 데이터
export interface ViralScoreData {
  tokenSymbol: string;
  pulseScore: number; // 0-100 normalized score
  viralRank: 1 | 2 | 3 | null; // null if not in top 3
  isViralToken: boolean;
  posts: { '1h': number; '1d': number; '7d': number };
  views: { '1h': number; '1d': number; '7d': number };
  likes: { '1h': number; '1d': number; '7d': number };
}

// Pool Parameter Set (동적 수수료 관련)
export interface PoolParameters {
  baseFactor: number;
  filterPeriod: number;
  decayPeriod: number;
  reductionFactor: number;
  variableFeeControl: number;
  protocolShare: number; // 0-10000 basis points (현재 적용된)
  protocolSharePct: number; // 0-100% for display
  maxVolatilityAccumulator: number;
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
  // NEW: Pool parameters for advanced analysis
  parameters?: PoolParameters;
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
    priceUSD?: number;
  };
  tokenY: {
    address: string;
    symbol: string;
    decimals: number;
    priceUSD?: number;
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

  // NEW: Viral Score 데이터 (옵션)
  tokenXViralData?: ViralScoreData;
  tokenYViralData?: ViralScoreData;

  // NEW: 24시간 hourly 데이터 (더 세밀한 변동성 분석)
  recentHourlyData?: Array<{
    date: number;
    volumeUSD: number;
    feesUSD: number;
    txCount: number;
  }>;
}

// ========================================
// Calculated Metrics (서버에서 계산)
// ========================================

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

  // NEW: Viral Score 관련 메트릭
  viralMetrics: {
    tokenXScore: number; // 0-100
    tokenYScore: number; // 0-100
    tokenXRank: 1 | 2 | 3 | null;
    tokenYRank: 1 | 2 | 3 | null;
    hasViralBoost: boolean;
    viralBoostMultiplier: number; // 1.0 = no boost, 1.4 = rank 1 boost
    socialMomentum: 'rising' | 'stable' | 'declining'; // 소셜 트렌드
  };

  // NEW: Pool Parameter 분석
  poolParameterAnalysis: {
    avgProtocolShare: number; // 평균 protocol share
    bestProtocolSharePool: string | null; // 가장 낮은 protocol share 풀
    feeVolatilityRisk: 'low' | 'medium' | 'high'; // variableFeeControl 기반
  };
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

  // NEW: 상세 설명 (Why this strategy?)
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
