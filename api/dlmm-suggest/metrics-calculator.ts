// DLMM Metrics Calculator
// 클라이언트에서 받은 데이터로 AI 입력용 메트릭 계산

import type { DLMMSuggestionRequest, CalculatedMetrics, TokenPriceData, PairHistoryData, BinData, PoolInfo, ViralScoreData } from './types.js';

// Protocol Share to Boost Multiplier mapping
// Default: Protocol 50%, LP gets 50%
// Rank 1: Protocol 10%, LP gets 90% → (90-50)/50 = 80% boost → multiplier 1.80
// Rank 2: Protocol 20%, LP gets 80% → (80-50)/50 = 60% boost → multiplier 1.60
// Rank 3: Protocol 40%, LP gets 60% → (60-50)/50 = 20% boost → multiplier 1.20
const VIRAL_BOOST_MAP: Record<number, number> = {
  1: 1.8, // Rank 1: 80% more earnings (LP gets 90% vs default 50%)
  2: 1.6, // Rank 2: 60% more earnings (LP gets 80% vs default 50%)
  3: 1.2, // Rank 3: 20% more earnings (LP gets 60% vs default 50%)
};

/**
 * Get viral boost multiplier based on rank
 */
function getViralBoostMultiplier(viralRank: 1 | 2 | 3 | null): number {
  if (viralRank === null) return 1.0;
  return VIRAL_BOOST_MAP[viralRank] || 1.0;
}

/**
 * 가격 변동성 계산 (OHLC 데이터 기반)
 * ATR(Average True Range) 방식 사용
 * @returns 0-100 스케일의 변동성 점수
 */
function calculateVolatility(priceHistory: TokenPriceData[]): number {
  if (priceHistory.length < 2) return 50; // 데이터 부족시 중간값

  const ranges = priceHistory.map((d) => {
    const range = d.highPriceUSD - d.lowPriceUSD;
    const avgPrice = (d.highPriceUSD + d.lowPriceUSD) / 2;
    return avgPrice > 0 ? (range / avgPrice) * 100 : 0;
  });

  const avgRange = ranges.reduce((a, b) => a + b, 0) / ranges.length;

  // 0-100 스케일로 변환 (5% 변동 = 50점, 10% 이상 = 100점)
  return Math.min(100, avgRange * 10);
}

/**
 * 볼륨 트렌드 분석
 * 최근 3일 vs 이전 4일 비교
 */
function analyzeVolumeTrend(pairHistory: PairHistoryData[]): 'increasing' | 'stable' | 'decreasing' {
  if (pairHistory.length < 7) return 'stable';

  // 날짜순 정렬 (오래된 것 먼저)
  const sorted = [...pairHistory].sort((a, b) => a.date - b.date);

  const recent3Days = sorted.slice(-3);
  const previous4Days = sorted.slice(0, 4);

  const recentAvg = recent3Days.reduce((sum, d) => sum + d.volumeUSD, 0) / recent3Days.length;
  const previousAvg = previous4Days.reduce((sum, d) => sum + d.volumeUSD, 0) / previous4Days.length;

  if (previousAvg === 0) return 'stable';

  const changeRatio = (recentAvg - previousAvg) / previousAvg;

  if (changeRatio > 0.2) return 'increasing';
  if (changeRatio < -0.2) return 'decreasing';
  return 'stable';
}

/**
 * 시장 상태 분석
 * 가격 변화 + 변동성 기반
 */
function analyzeMarketCondition(
  priceHistory: TokenPriceData[],
  volatility: number
): 'stable' | 'trending_up' | 'trending_down' | 'volatile' {
  if (priceHistory.length < 2) return 'stable';

  // 날짜순 정렬
  const sorted = [...priceHistory].sort((a, b) => a.date - b.date);
  const firstPrice = sorted[0].closePriceUSD;
  const lastPrice = sorted[sorted.length - 1].closePriceUSD;

  if (firstPrice === 0) return 'stable';

  const priceChange = ((lastPrice - firstPrice) / firstPrice) * 100;

  // 높은 변동성 (70 이상)이면 volatile
  if (volatility > 70) return 'volatile';

  // 가격 변화 기준
  if (priceChange > 10) return 'trending_up';
  if (priceChange < -10) return 'trending_down';

  return 'stable';
}

/**
 * 7일 가격 변화율 계산
 */
function calculatePriceChange7d(priceHistory: TokenPriceData[]): number {
  if (priceHistory.length < 2) return 0;

  const sorted = [...priceHistory].sort((a, b) => a.date - b.date);
  const firstPrice = sorted[0].closePriceUSD;
  const lastPrice = sorted[sorted.length - 1].closePriceUSD;

  if (firstPrice === 0) return 0;

  return ((lastPrice - firstPrice) / firstPrice) * 100;
}

/**
 * 유동성 집중도 계산
 * 중앙 ±10 bin에 얼마나 유동성이 집중되어 있는지
 * @returns 0-100 (100 = 완전 집중)
 */
function calculateLiquidityConcentration(binDistribution: BinData[], activeId: number): number {
  if (binDistribution.length === 0) return 50;

  // 각 bin의 USD 가치 계산 (reserveX * priceX + reserveY * priceY)
  const binsWithValue = binDistribution.map((bin) => ({
    ...bin,
    valueUSD: bin.reserveX * bin.priceX + bin.reserveY * bin.priceY,
  }));

  const totalValue = binsWithValue.reduce((sum, bin) => sum + bin.valueUSD, 0);
  if (totalValue === 0) return 50;

  // 중앙 ±10 bin의 가치
  const centralBins = binsWithValue.filter((bin) => bin.binId >= activeId - 10 && bin.binId <= activeId + 10);
  const centralValue = centralBins.reduce((sum, bin) => sum + bin.valueUSD, 0);

  return (centralValue / totalValue) * 100;
}

/**
 * 활성 bin 수 계산 (유동성이 있는 bin)
 */
function countActiveBins(binDistribution: BinData[]): number {
  return binDistribution.filter((bin) => bin.reserveX > 0 || bin.reserveY > 0).length;
}

/**
 * 풀별 예상 APR 계산
 */
function calculateFeeAPRByPool(pools: PoolInfo[]): Record<string, number> {
  const result: Record<string, number> = {};

  for (const pool of pools) {
    if (pool.tvlUSD > 0) {
      // 일일 수수료 → 연간화
      const dailyFeeRate = pool.fees24hUSD / pool.tvlUSD;
      const apr = dailyFeeRate * 365 * 100;
      result[pool.pairAddress] = Math.round(apr * 100) / 100; // 소수점 2자리
    } else {
      result[pool.pairAddress] = 0;
    }
  }

  return result;
}

/**
 * 소셜 모멘텀 분석 (1h vs 7d engagement)
 */
function analyzeSocialMomentum(viralData?: ViralScoreData): 'rising' | 'stable' | 'declining' {
  if (!viralData) return 'stable';

  const recentEngagement = viralData.views['1d'] + viralData.likes['1d'];
  const weeklyEngagement = viralData.views['7d'] + viralData.likes['7d'];

  if (weeklyEngagement === 0) return 'stable';

  // 24h가 7d의 1/7보다 훨씬 높으면 rising
  const dailyAvg = weeklyEngagement / 7;
  const ratio = recentEngagement / dailyAvg;

  if (ratio > 1.5) return 'rising';
  if (ratio < 0.5) return 'declining';
  return 'stable';
}

/**
 * Hourly 변동성 계산 (최근 24시간)
 */
function calculateHourlyVolatility(
  hourlyData?: Array<{ date: number; volumeUSD: number; feesUSD: number; txCount: number }>
): number | undefined {
  if (!hourlyData || hourlyData.length < 2) return undefined;

  const volumes = hourlyData.map((d) => d.volumeUSD);
  const avgVolume = volumes.reduce((a, b) => a + b, 0) / volumes.length;

  if (avgVolume === 0) return 0;

  // 표준편차 / 평균 = 변동계수 (CV)
  const variance = volumes.reduce((sum, v) => sum + Math.pow(v - avgVolume, 2), 0) / volumes.length;
  const stdDev = Math.sqrt(variance);
  const cv = (stdDev / avgVolume) * 100;

  return Math.min(100, cv);
}

/**
 * Pool Parameter 분석
 */
function analyzePoolParameters(pools: PoolInfo[]): {
  avgProtocolShare: number;
  bestProtocolSharePool: string | null;
  feeVolatilityRisk: 'low' | 'medium' | 'high';
} {
  const poolsWithParams = pools.filter((p) => p.parameters);

  if (poolsWithParams.length === 0) {
    return {
      avgProtocolShare: 50, // Default
      bestProtocolSharePool: null,
      feeVolatilityRisk: 'medium',
    };
  }

  // 평균 protocol share
  const avgProtocolShare =
    poolsWithParams.reduce((sum, p) => sum + (p.parameters?.protocolSharePct || 50), 0) / poolsWithParams.length;

  // 가장 낮은 protocol share (LP에게 유리)
  const bestPool = poolsWithParams.reduce(
    (best, pool) => {
      const share = pool.parameters?.protocolSharePct || 50;
      return share < best.share ? { pool, share } : best;
    },
    { pool: poolsWithParams[0], share: poolsWithParams[0].parameters?.protocolSharePct || 50 }
  );

  // variableFeeControl 기반 수수료 변동성 리스크
  const maxVFC = Math.max(...poolsWithParams.map((p) => p.parameters?.variableFeeControl || 0));
  let feeVolatilityRisk: 'low' | 'medium' | 'high' = 'low';
  if (maxVFC > 500000) feeVolatilityRisk = 'high';
  else if (maxVFC > 100000) feeVolatilityRisk = 'medium';

  return {
    avgProtocolShare: Math.round(avgProtocolShare * 10) / 10,
    bestProtocolSharePool: bestPool.pool.pairAddress,
    feeVolatilityRisk,
  };
}

/**
 * Effective APR 계산 (viral boost 반영)
 */
function calculateEffectiveAPRByPool(
  feeAPRByPool: Record<string, number>,
  tokenXViralRank: 1 | 2 | 3 | null,
  tokenYViralRank: 1 | 2 | 3 | null
): Record<string, number> {
  // Use the better viral rank (lower rank = better)
  const bestRank =
    tokenXViralRank !== null && tokenYViralRank !== null
      ? Math.min(tokenXViralRank, tokenYViralRank)
      : tokenXViralRank || tokenYViralRank;

  const boostMultiplier = getViralBoostMultiplier(bestRank as 1 | 2 | 3 | null);

  const result: Record<string, number> = {};
  for (const [address, apr] of Object.entries(feeAPRByPool)) {
    result[address] = Math.round(apr * boostMultiplier * 100) / 100;
  }

  return result;
}

/**
 * 메인 계산 함수
 * 클라이언트 데이터 → 계산된 메트릭
 */
export function calculateMetrics(request: DLMMSuggestionRequest): CalculatedMetrics {
  const {
    tokenXPriceHistory,
    tokenYPriceHistory,
    pairHistory,
    binDistribution,
    availablePools,
    currentActiveId,
    tokenXViralData,
    tokenYViralData,
    recentHourlyData,
  } = request;

  // 변동성 계산
  const tokenXVolatility = calculateVolatility(tokenXPriceHistory);
  const tokenYVolatility = calculateVolatility(tokenYPriceHistory);
  const combinedVolatility = (tokenXVolatility + tokenYVolatility) / 2;
  const hourlyVolatility = calculateHourlyVolatility(recentHourlyData);

  // 볼륨 분석
  const totalVolume = pairHistory.reduce((sum, d) => sum + d.volumeUSD, 0);
  const avgDailyVolumeUSD = pairHistory.length > 0 ? totalVolume / pairHistory.length : 0;
  const volumeTrend = analyzeVolumeTrend(pairHistory);

  // Hourly 볼륨 평균
  const avgHourlyVolumeUSD = recentHourlyData?.length
    ? recentHourlyData.reduce((sum, d) => sum + d.volumeUSD, 0) / recentHourlyData.length
    : undefined;

  // TVL 대비 볼륨 비율 (최고 TVL 풀 기준)
  const bestPool = availablePools.reduce((best, pool) => (pool.tvlUSD > best.tvlUSD ? pool : best), availablePools[0] || { tvlUSD: 0 });
  const volumeToTvlRatio = bestPool.tvlUSD > 0 ? avgDailyVolumeUSD / bestPool.tvlUSD : 0;

  // 수수료 분석
  const totalFees = pairHistory.reduce((sum, d) => sum + d.feesUSD, 0);
  const avgDailyFeesUSD = pairHistory.length > 0 ? totalFees / pairHistory.length : 0;
  const feeAPRByPool = calculateFeeAPRByPool(availablePools);

  // Viral boost 반영 APR
  const effectiveAPRByPool = calculateEffectiveAPRByPool(
    feeAPRByPool,
    tokenXViralData?.viralRank || null,
    tokenYViralData?.viralRank || null
  );

  // 유동성 분포 분석
  const liquidityConcentration = calculateLiquidityConcentration(binDistribution, currentActiveId);
  const activeBinsCount = countActiveBins(binDistribution);

  // 시장 상태 분석 (TokenX 기준, 보통 base token)
  const marketCondition = analyzeMarketCondition(tokenXPriceHistory, combinedVolatility);
  const priceChange7d = calculatePriceChange7d(tokenXPriceHistory);

  // Viral 메트릭
  const tokenXScore = tokenXViralData?.pulseScore || 0;
  const tokenYScore = tokenYViralData?.pulseScore || 0;
  const tokenXRank = tokenXViralData?.viralRank || null;
  const tokenYRank = tokenYViralData?.viralRank || null;
  const hasViralBoost = tokenXRank !== null || tokenYRank !== null;
  const bestRank =
    tokenXRank !== null && tokenYRank !== null
      ? (Math.min(tokenXRank, tokenYRank) as 1 | 2 | 3)
      : ((tokenXRank || tokenYRank) as 1 | 2 | 3 | null);
  const viralBoostMultiplier = getViralBoostMultiplier(bestRank);

  // 소셜 모멘텀 (더 높은 점수 토큰 기준)
  const primaryViralData = tokenXScore >= tokenYScore ? tokenXViralData : tokenYViralData;
  const socialMomentum = analyzeSocialMomentum(primaryViralData);

  // Pool 파라미터 분석
  const poolParameterAnalysis = analyzePoolParameters(availablePools);

  return {
    tokenXVolatility: Math.round(tokenXVolatility * 10) / 10,
    tokenYVolatility: Math.round(tokenYVolatility * 10) / 10,
    combinedVolatility: Math.round(combinedVolatility * 10) / 10,
    hourlyVolatility: hourlyVolatility !== undefined ? Math.round(hourlyVolatility * 10) / 10 : undefined,
    avgDailyVolumeUSD: Math.round(avgDailyVolumeUSD * 100) / 100,
    volumeTrend,
    volumeToTvlRatio: Math.round(volumeToTvlRatio * 1000) / 1000,
    avgHourlyVolumeUSD: avgHourlyVolumeUSD !== undefined ? Math.round(avgHourlyVolumeUSD * 100) / 100 : undefined,
    avgDailyFeesUSD: Math.round(avgDailyFeesUSD * 100) / 100,
    feeAPRByPool,
    effectiveAPRByPool,
    liquidityConcentration: Math.round(liquidityConcentration * 10) / 10,
    activeBinsCount,
    marketCondition,
    priceChange7d: Math.round(priceChange7d * 100) / 100,
    viralMetrics: {
      tokenXScore,
      tokenYScore,
      tokenXRank,
      tokenYRank,
      hasViralBoost,
      viralBoostMultiplier,
      socialMomentum,
    },
    poolParameterAnalysis,
  };
}

/**
 * 메트릭 기반 전략 힌트 생성
 * AI에게 전달할 추가 컨텍스트
 */
export function generateStrategyHints(metrics: CalculatedMetrics, riskProfile: string): string[] {
  const hints: string[] = [];

  // 변동성 기반 힌트
  if (metrics.combinedVolatility > 70) {
    hints.push('High volatility detected - wider bin range recommended');
    hints.push('Consider larger binStep for fee capture');
  } else if (metrics.combinedVolatility < 30) {
    hints.push('Low volatility - concentrated liquidity can maximize fees');
    hints.push('Smaller binStep may be more capital efficient');
  }

  // 24시간 hourly 변동성 추가 분석
  if (metrics.hourlyVolatility !== undefined) {
    if (metrics.hourlyVolatility > metrics.combinedVolatility * 1.5) {
      hints.push('⚠️ Recent 24h shows higher volatility than 7d average - expect more price movement');
    } else if (metrics.hourlyVolatility < metrics.combinedVolatility * 0.5) {
      hints.push('Recent 24h relatively calm - good entry point for tighter positions');
    }
  }

  // 볼륨 트렌드 힌트
  if (metrics.volumeTrend === 'increasing') {
    hints.push('Volume trending up - good time for LP entry');
  } else if (metrics.volumeTrend === 'decreasing') {
    hints.push('Volume declining - consider more conservative position');
  }

  // 시장 상태 힌트
  if (metrics.marketCondition === 'trending_up') {
    hints.push('Uptrend detected - consider asymmetric position (more TokenY)');
  } else if (metrics.marketCondition === 'trending_down') {
    hints.push('Downtrend detected - consider asymmetric position (more TokenX)');
  } else if (metrics.marketCondition === 'volatile') {
    hints.push('High volatility market - prioritize IL protection over fee capture');
  }

  // 리스크 프로필 힌트
  if (riskProfile === 'aggressive') {
    hints.push('Aggressive profile: prioritize higher APR, accept more IL risk');
    hints.push('Recommend CURVE or BID_ASK shape for higher fees');
    hints.push('Consider narrower bin range (fewer bins) for concentrated fees');
  } else if (riskProfile === 'defensive') {
    hints.push('Defensive profile: prioritize stability, minimize IL risk');
    hints.push('Recommend wider range with SPOT shape');
    hints.push('Consider pools with lower baseFee and variableFeeControl');
  } else {
    hints.push('Auto profile: balance between APR and risk based on market conditions');
  }

  // ===== VIRAL SCORE 기반 힌트 (NEW) =====
  const { viralMetrics } = metrics;

  if (viralMetrics.hasViralBoost) {
    hints.push(`🔥 VIRAL BOOST ACTIVE: +${Math.round((viralMetrics.viralBoostMultiplier - 1) * 100)}% extra LP yield!`);

    if (viralMetrics.tokenXRank === 1 || viralMetrics.tokenYRank === 1) {
      hints.push('🥇 TOP 1 VIRAL: Protocol share reduced 50%→10% | LP gets 90% of fees (+80% yield boost)');
      hints.push('STRONG OPPORTUNITY: Maximize this viral period with aggressive concentrated position');
    } else if (viralMetrics.tokenXRank === 2 || viralMetrics.tokenYRank === 2) {
      hints.push('🥈 TOP 2 VIRAL: Protocol share reduced 50%→20% | LP gets 80% of fees (+60% yield boost)');
    } else if (viralMetrics.tokenXRank === 3 || viralMetrics.tokenYRank === 3) {
      hints.push('🥉 TOP 3 VIRAL: Protocol share reduced 50%→40% | LP gets 60% of fees (+20% yield boost)');
    }
  }

  // 소셜 모멘텀 힌트
  if (viralMetrics.socialMomentum === 'rising') {
    hints.push('📈 Social momentum RISING: Token gaining traction, expect more volume');
    hints.push('Consider entering now before more attention arrives');
  } else if (viralMetrics.socialMomentum === 'declining') {
    hints.push('📉 Social momentum declining: Early viral period may be ending');
    hints.push('Consider wider range or earlier exit strategy');
  }

  // Viral + Risk Profile 조합 힌트
  if (viralMetrics.hasViralBoost && riskProfile === 'aggressive') {
    hints.push('🚀 AGGRESSIVE + VIRAL: Maximize gains with CURVE shape and tight bin range');
    hints.push('Viral boost amplifies concentrated liquidity returns');
  } else if (viralMetrics.hasViralBoost && riskProfile === 'defensive') {
    hints.push('Viral token detected but defensive profile - still use viral boost but with safer range');
  }

  // Pool Parameter 기반 힌트
  const { poolParameterAnalysis } = metrics;

  if (poolParameterAnalysis.feeVolatilityRisk === 'high') {
    hints.push('⚠️ High dynamic fee volatility - fees may spike during volatile periods');
  }

  if (poolParameterAnalysis.bestProtocolSharePool && poolParameterAnalysis.avgProtocolShare < 50) {
    hints.push(`💰 Best pool has ${poolParameterAnalysis.avgProtocolShare}% protocol share (below 50% default)`);
  }

  return hints;
}
