import { getUserBinLiquidity, getUserPoolIds, getPoolData, getTokenPrices, getUserFeesEarned, getUserFeesAnalytics } from '@/lib/hasura-client';

// Helper function to extract address from chainId-prefixed ID
// e.g., "43522:0x1234..." -> "0x1234..."
function fromChainId(chainIdPrefixedId: string): string {
  if (chainIdPrefixedId && chainIdPrefixedId.includes(':')) {
    return chainIdPrefixedId.split(':')[1];
  }
  return chainIdPrefixedId;
}

// User Bin Liquidity IDs
export const getUserLiquidityBinIds = async (poolAddress: string, userAddress: string) => {
  const result = await getUserBinLiquidity(poolAddress, userAddress);
  // Convert binId to number to ensure proper type for contract calls
  // GraphQL may return binId as string for large integers
  return result.UserBinLiquidity.map((item) => Number(item.binId));
};

// User Pool List
export async function mockUserPoolList(userAddress: string) {
  return await getUserPoolIds(userAddress);
}

// Pool Data
export async function mockPoolData(poolAddress: string) {
  const result = await getPoolData(poolAddress);
  const pool = result.LBPair[0];
  const lbPairParameterSet = result.LBPairParameterSet[0];

  // Pool이 존재하지 않는 경우 에러 throw
  if (!pool) {
    throw new Error('Pool not found');
  }

  // 24시간 수수료 집계
  const fees24h = result.LBPairHourData?.reduce((sum, item) => sum + Number(item.feesUSD || 0), 0) || 0;

  // Fee 계산을 위한 파라미터
  const binStep = Number(pool.binStep);
  const baseFeePct = Number(pool.baseFeePct);
  const maxVolatilityAccumulator = Number(lbPairParameterSet?.maxVolatilityAccumulator || 0);
  const variableFeeControl = Number(lbPairParameterSet?.variableFeeControl || 0);
  const protocolShare = Number(lbPairParameterSet?.protocolShare || 0);

  // Max Fee = BaseFee + ((maxVolatilityAccumulator × binStep)² × variableFeeControl) / 10¹⁸
  const maxFeePct = baseFeePct + ((maxVolatilityAccumulator * binStep) ** 2 * variableFeeControl) / 1e18;

  // Dynamic Fee는 실시간 volatilityAccumulator 값이 필요하지만,
  // GraphQL에서 제공하지 않으므로 스마트 컨트랙트에서 직접 읽어야 함
  // 현재는 maxVolatilityAccumulator를 기준으로 최대값을 표시
  const dynamicFeePct = ((maxVolatilityAccumulator * binStep) ** 2 * variableFeeControl) / 1e18;

  // Protocol Fee = BaseFee × (protocolShare / 10000)
  // protocolShare is in basis points (e.g., 2500 = 25%)
  const protocolFeePct = baseFeePct * (protocolShare / 10000);

  return {
    pairAddress: fromChainId(pool.id),
    chain: 'memecore_testnet',
    name: `${pool.tokenX.symbol}-${pool.tokenY.symbol}`,
    status: 'main',
    version: 'v2.2',
    tokenX: {
      address: fromChainId(pool.tokenX.id),
      name: pool.tokenX.name,
      symbol: pool.tokenX.symbol,
      decimals: pool.tokenX.decimals,
      priceUsd: Number(pool.tokenX.priceUSD),
      priceNative: '0',
    },
    tokenY: {
      address: fromChainId(pool.tokenY.id),
      name: pool.tokenY.name,
      symbol: pool.tokenY.symbol,
      decimals: pool.tokenY.decimals,
      priceUsd: Number(pool.tokenY.priceUSD),
      priceNative: '0',
    },
    reserveX: Number(pool.reserveX),
    reserveY: Number(pool.reserveY),
    lbBinStep: binStep,
    lbBaseFeePct: baseFeePct,
    lbMaxFeePct: maxFeePct,
    dynamicFeePct: dynamicFeePct,
    protocolFeePct: protocolFeePct,
    activeBinId: Number(pool.activeId),
    liquidityUsd: Number(pool.totalValueLockedUSD),
    liquidityNative: '0',
    liquidityDepthMinus: 1,
    liquidityDepthPlus: 1,
    liquidityDepthTokenX: 1,
    liquidityDepthTokenY: 1,
    volumeUsd: Number(pool.volumeUSD),
    volumeNative: '0',
    feesUsd: fees24h,
    feesNative: '0',
    protocolSharePct: protocolShare / 100,
  };
}

// Token Prices
export async function mockTokenPrices() {
  const result = await getTokenPrices();
  return result.Token.map((item) => ({
    id: item.id,
    tokenAddress: fromChainId(item.id),
    symbol: item.symbol,
    name: item.name,
    decimals: item.decimals,
    priceUsd: Number(item.priceUSD),
  }));
}

// User Fees Earned
export async function mockUserFeeEarned(poolAddress: string, userAddress: string) {
  const result = await getUserFeesEarned(poolAddress, userAddress);
  return result.UserFeesPerBinData.map((item) => ({
    binId: Number(item.binId),
    mostRecentDepositTime: 0,
    timestamp: Number(item.timestamp),
    accruedFeesX: Number(item.accruedFeesX),
    accruedFeesY: Number(item.accruedFeesY),
    accruedFeesL: Number(item.accruedFeesX) + Number(item.accruedFeesY) * Number(item.priceY),
    priceXY: Number(item.priceY),
    priceYX: Number(item.priceX),
  }));
}

// User Fees Analytics (Time-based)
export async function mockUserFeesAnalytics(poolAddress: string, userAddress: string) {
  const result = await getUserFeesAnalytics(poolAddress, userAddress);
  
  // Transform hour data (24 hours)
  const hourData = result.UserFeesHourData.map((item) => ({
    date: new Date(item.date * 1000).toISOString(),
    timestamp: item.date,
    accruedFeesX: Number(item.accruedFeesX),
    accruedFeesY: Number(item.accruedFeesY),
    accruedFeesL: Number(item.accruedFeesX) + Number(item.accruedFeesY),
  }));

  // Transform day data (30 days)
  const dayData = result.UserFeesDayData.map((item) => ({
    date: new Date(item.date * 1000).toISOString(),
    timestamp: item.date,
    accruedFeesX: Number(item.accruedFeesX),
    accruedFeesY: Number(item.accruedFeesY),
    accruedFeesL: Number(item.accruedFeesX) + Number(item.accruedFeesY),
  }));

  return {
    '24h': hourData.reverse(), // Reverse to show chronological order
    '7d': dayData.slice(-7).reverse(), // Last 7 days
    '30d': dayData.reverse(), // Last 30 days
  };
}
