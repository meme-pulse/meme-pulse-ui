import {
  getUserBinLiquidity,
  getDexAnalytics,
  getUserPoolIds,
  getPoolData,
  getTokenPrices,
  getUserFeesEarned,
  getUserFeesAnalytics,
} from '@/lib/hasura-client';

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

// DEX Analytics (Last 180 days)
export async function mockTvlAnalyticsLast180d() {
  const startTime = Math.floor(Date.now() / 1000) - 180 * 24 * 60 * 60;
  return await getDexAnalytics(startTime);
}

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
    lbBinStep: Number(pool.binStep),
    lbBaseFeePct: Number(pool.baseFeePct),
    lbMaxFeePct:
      Number(pool.baseFeePct) +
      ((Number(lbPairParameterSet?.maxVolatilityAccumulator || 0) * Number(pool.binStep)) ** 2 *
        Number(lbPairParameterSet?.variableFeeControl || 0)) /
        1e18,
    activeBinId: Number(pool.activeId),
    liquidityUsd: Number(pool.totalValueLockedUSD),
    liquidityNative: '0',
    liquidityDepthMinus: 1,
    liquidityDepthPlus: 1,
    liquidityDepthTokenX: 1,
    liquidityDepthTokenY: 1,
    volumeUsd: Number(pool.volumeUSD),
    volumeNative: '0',
    feesUsd: Number(pool.feesUSD),
    feesNative: '0',
    protocolSharePct: Number(lbPairParameterSet?.protocolShare || 0) / 100,
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

// User Fees Analytics
export async function mockUserFeesAnalytics(poolAddress: string, userAddress: string) {
  const result = await getUserFeesAnalytics(poolAddress, userAddress);
  return {
    '24h': result.UserFeesHourData.map((fee) => ({
      date: new Date(Number(fee.date) * 1000).toISOString(),
      timestamp: Number(fee.date),
      accruedFeesX: Number(fee.accruedFeesX),
      accruedFeesY: Number(fee.accruedFeesY),
      accruedFeesL: 0,
    })),
    '7d': result.UserFeesDayData.slice(0, 7).map((fee) => ({
      date: new Date(Number(fee.date) * 1000).toISOString(),
      timestamp: Number(fee.date),
      accruedFeesX: Number(fee.accruedFeesX),
      accruedFeesY: Number(fee.accruedFeesY),
      accruedFeesL: 0,
    })),
    '30d': result.UserFeesDayData.map((fee) => ({
      date: new Date(Number(fee.date) * 1000).toISOString(),
      timestamp: Number(fee.date),
      accruedFeesX: Number(fee.accruedFeesX),
      accruedFeesY: Number(fee.accruedFeesY),
      accruedFeesL: 0,
    })),
  };
}
