// DLMM Metrics Calculator
// 클라이언트에서 받은 데이터로 AI 입력용 메트릭 계산

import type {
  DLMMSuggestionRequest,
  CalculatedMetrics,
  TokenPriceData,
  PairHistoryData,
  BinData,
  PoolInfo,
} from './types';

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
function analyzeVolumeTrend(
  pairHistory: PairHistoryData[]
): 'increasing' | 'stable' | 'decreasing' {
  if (pairHistory.length < 7) return 'stable';

  // 날짜순 정렬 (오래된 것 먼저)
  const sorted = [...pairHistory].sort((a, b) => a.date - b.date);

  const recent3Days = sorted.slice(-3);
  const previous4Days = sorted.slice(0, 4);

  const recentAvg =
    recent3Days.reduce((sum, d) => sum + d.volumeUSD, 0) / recent3Days.length;
  const previousAvg =
    previous4Days.reduce((sum, d) => sum + d.volumeUSD, 0) / previous4Days.length;

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
function calculateLiquidityConcentration(
  binDistribution: BinData[],
  activeId: number
): number {
  if (binDistribution.length === 0) return 50;

  // 각 bin의 USD 가치 계산 (reserveX * priceX + reserveY * priceY)
  const binsWithValue = binDistribution.map((bin) => ({
    ...bin,
    valueUSD: bin.reserveX * bin.priceX + bin.reserveY * bin.priceY,
  }));

  const totalValue = binsWithValue.reduce((sum, bin) => sum + bin.valueUSD, 0);
  if (totalValue === 0) return 50;

  // 중앙 ±10 bin의 가치
  const centralBins = binsWithValue.filter(
    (bin) => bin.binId >= activeId - 10 && bin.binId <= activeId + 10
  );
  const centralValue = centralBins.reduce((sum, bin) => sum + bin.valueUSD, 0);

  return (centralValue / totalValue) * 100;
}

/**
 * 활성 bin 수 계산 (유동성이 있는 bin)
 */
function countActiveBins(binDistribution: BinData[]): number {
  return binDistribution.filter(
    (bin) => bin.reserveX > 0 || bin.reserveY > 0
  ).length;
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
  } = request;

  // 변동성 계산
  const tokenXVolatility = calculateVolatility(tokenXPriceHistory);
  const tokenYVolatility = calculateVolatility(tokenYPriceHistory);
  const combinedVolatility = (tokenXVolatility + tokenYVolatility) / 2;

  // 볼륨 분석
  const totalVolume = pairHistory.reduce((sum, d) => sum + d.volumeUSD, 0);
  const avgDailyVolumeUSD = pairHistory.length > 0 ? totalVolume / pairHistory.length : 0;
  const volumeTrend = analyzeVolumeTrend(pairHistory);

  // TVL 대비 볼륨 비율 (최고 TVL 풀 기준)
  const bestPool = availablePools.reduce(
    (best, pool) => (pool.tvlUSD > best.tvlUSD ? pool : best),
    availablePools[0] || { tvlUSD: 0 }
  );
  const volumeToTvlRatio = bestPool.tvlUSD > 0 ? avgDailyVolumeUSD / bestPool.tvlUSD : 0;

  // 수수료 분석
  const totalFees = pairHistory.reduce((sum, d) => sum + d.feesUSD, 0);
  const avgDailyFeesUSD = pairHistory.length > 0 ? totalFees / pairHistory.length : 0;
  const feeAPRByPool = calculateFeeAPRByPool(availablePools);

  // 유동성 분포 분석
  const liquidityConcentration = calculateLiquidityConcentration(
    binDistribution,
    currentActiveId
  );
  const activeBinsCount = countActiveBins(binDistribution);

  // 시장 상태 분석 (TokenX 기준, 보통 base token)
  const marketCondition = analyzeMarketCondition(tokenXPriceHistory, combinedVolatility);
  const priceChange7d = calculatePriceChange7d(tokenXPriceHistory);

  return {
    tokenXVolatility: Math.round(tokenXVolatility * 10) / 10,
    tokenYVolatility: Math.round(tokenYVolatility * 10) / 10,
    combinedVolatility: Math.round(combinedVolatility * 10) / 10,
    avgDailyVolumeUSD: Math.round(avgDailyVolumeUSD * 100) / 100,
    volumeTrend,
    volumeToTvlRatio: Math.round(volumeToTvlRatio * 1000) / 1000,
    avgDailyFeesUSD: Math.round(avgDailyFeesUSD * 100) / 100,
    feeAPRByPool,
    liquidityConcentration: Math.round(liquidityConcentration * 10) / 10,
    activeBinsCount,
    marketCondition,
    priceChange7d: Math.round(priceChange7d * 100) / 100,
  };
}

/**
 * 메트릭 기반 전략 힌트 생성
 * AI에게 전달할 추가 컨텍스트
 */
export function generateStrategyHints(
  metrics: CalculatedMetrics,
  riskProfile: string
): string[] {
  const hints: string[] = [];

  // 변동성 기반 힌트
  if (metrics.combinedVolatility > 70) {
    hints.push('High volatility detected - wider bin range recommended');
    hints.push('Consider larger binStep for fee capture');
  } else if (metrics.combinedVolatility < 30) {
    hints.push('Low volatility - concentrated liquidity can maximize fees');
    hints.push('Smaller binStep may be more capital efficient');
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
  } else if (riskProfile === 'defensive') {
    hints.push('Defensive profile: prioritize stability, minimize IL risk');
    hints.push('Recommend wider range with SPOT shape');
  } else {
    hints.push('Auto profile: balance between APR and risk based on market conditions');
  }

  return hints;
}

