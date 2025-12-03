// Hasura GraphQL Client
// Envio API를 대체하여 Hasura GraphQL을 직접 호출합니다

// 프로덕션 환경에서는 Vercel 프록시 사용 (HTTPS), 개발 환경에서는 직접 HTTP 사용 가능
const HASURA_ENDPOINT = import.meta.env.VITE_HASURA_ENDPOINT || 'http://localhost:8080/v1/graphql';

const HASURA_SECRET = import.meta.env.VITE_HASURA_SECRET || '';

console.log('HASURA_ENDPOINT', HASURA_ENDPOINT);
// console.log('HASURA_SECRET', HASURA_SECRET);
// Chain ID for entity ID prefixes
const CHAIN_ID = 43522;

// Helper functions for chainId-prefixed IDs
// 주소를 소문자로 정규화하여 Hasura DB 조회 시 대소문자 불일치 문제 방지
function toChainPairId(pairAddress: string): string {
  return `${CHAIN_ID}:${pairAddress.toLowerCase()}`;
}

function toChainUserId(userAddress: string): string {
  return `${CHAIN_ID}:${userAddress.toLowerCase()}`;
}

function toBundleId(): string {
  return `${CHAIN_ID}:1`;
}

function toChainTokenId(tokenAddress: string): string {
  return `${CHAIN_ID}:${tokenAddress.toLowerCase()}`;
}

// Helper function to extract address from chainId-prefixed ID
// e.g., "43522:0x1234..." -> "0x1234..."
function fromChainId(chainIdPrefixedId: string): string {
  if (chainIdPrefixedId && chainIdPrefixedId.includes(':')) {
    return chainIdPrefixedId.split(':')[1];
  }
  return chainIdPrefixedId;
}

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

async function graphqlRequest<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
  if (!HASURA_ENDPOINT) {
    throw new Error('HASURA_ENDPOINT is not configured');
  }

  if (!HASURA_SECRET) {
    throw new Error('HASURA_SECRET is not configured');
  }

  const response = await fetch(HASURA_ENDPOINT, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // 'x-hasura-admin-secret': HASURA_SECRET,
    },
    body: JSON.stringify({
      query,
      variables,
    }),
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch data from Hasura: ${response.statusText}`);
  }

  const result: GraphQLResponse<T> = await response.json();

  if (result.errors) {
    throw new Error(result.errors.map((e) => e.message).join(', '));
  }

  if (!result.data) {
    throw new Error('No data returned from Hasura');
  }

  return result.data;
}

// Bin Distribution Data Query
export async function getBinDistributionData(pairAddress: string, fromId: number, toId: number) {
  const chainPairId = toChainPairId(pairAddress);
  const query = `
    query GetBinDistribution($pairAddress: String!, $fromId: Int!, $toId: Int!) {
      Bin(
        where: {
          lbPair_id: { _eq: $pairAddress }
          binId: { _gte: $fromId, _lte: $toId }
        }
        order_by: { binId: desc }
      ) {
        id
        binId
        priceX
        priceY
        reserveX
        reserveY
      }
      LBPair(where: { id: { _eq: $pairAddress } }) {
        tokenX {
          symbol
          decimals
        }
        tokenY {
          symbol
          decimals
        }
      }
    }
  `;

  return graphqlRequest<{
    Bin: Array<{
      id: string;
      binId: number;
      priceX: string;
      priceY: string;
      reserveX: string;
      reserveY: string;
    }>;
    LBPair: Array<{
      tokenX: { symbol: string; decimals: number };
      tokenY: { symbol: string; decimals: number };
    }>;
  }>(query, { pairAddress: chainPairId, fromId, toId });
}

// Grouped Pools Query
export async function getGroupedPoolsWithDetails() {
  const twentyFourHoursAgo = Math.floor(Date.now() / 1000 - 24 * 60 * 60);

  const bundleId = toBundleId();
  const query = `
    query GetGroupedPools($twentyFourHoursAgo: Int!, $bundleId: String!) {
      LBPairParameterSet(order_by: { lbPair_id: desc }) {
        lbPair_id
        maxVolatilityAccumulator
        variableFeeControl
        protocolShare
      }
      LBPair(order_by: { totalValueLockedUSD: desc }) {
        id
        binStep
        baseFeePct
        activeId
        reserveX
        reserveY
        totalValueLockedUSD
        tokenX {
          id
          name
          symbol
          decimals
          priceUSD
        }
        tokenY {
          id
          name
          symbol
          decimals
          priceUSD
        }
      }
      Bundle(where: { id: { _eq: $bundleId } }) {
        nativePriceUSD
      }
      LBPairHourData(where: { date: { _gte: $twentyFourHoursAgo } }) {
        lbPair_id
        volumeUSD
        feesUSD
      }
    }
  `;

  const result = await graphqlRequest<{
    LBPairParameterSet: Array<{
      lbPair_id: string;
      maxVolatilityAccumulator: string;
      variableFeeControl: string;
      protocolShare: string;
    }>;
    LBPair: Array<{
      id: string;
      binStep: number;
      baseFeePct: string;
      activeId: number;
      reserveX: string;
      reserveY: string;
      totalValueLockedUSD: string;
      tokenX: {
        id: string;
        name: string;
        symbol: string;
        decimals: number;
        priceUSD: string;
      };
      tokenY: {
        id: string;
        name: string;
        symbol: string;
        decimals: number;
        priceUSD: string;
      };
    }>;
    Bundle: Array<{ nativePriceUSD: string }>;
    LBPairHourData: Array<{
      lbPair_id: string;
      volumeUSD: string;
      feesUSD: string;
    }>;
  }>(query, { twentyFourHoursAgo, bundleId });

  // Envio 코드의 데이터 가공 로직 적용
  interface GroupedPool {
    name: string;
    tokenX: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      priceUsd: number;
    };
    tokenY: {
      address: string;
      name: string;
      symbol: string;
      decimals: number;
      priceUsd: number;
    };
    totalLiquidityUsd: number;
    totalLiquidityNative: number;
    totalVolume24h: number;
    totalFees24h: number;
    groups: Array<{
      pairAddress: string;
      baseFeePct: number;
      activeBinId: number;
      liquidityUsd: number;
      volume24h: number;
      fees24h: number;
      lbMaxFeePct: number;
      reserveX: number;
      reserveY: number;
      lbBinStep: number;
      lbBaseFeePct: number;
      liquidityDepthMinus: number;
      liquidityDepthPlus: number;
      liquidityDepthTokenX: number;
      liquidityDepthTokenY: number;
      volumeUsd: number;
      volumeNative: string;
      feesUsd: number;
      feesNative: string;
      protocolSharePct: number;
    }>;
  }

  const groupedPools = result.LBPair.reduce((acc: Record<string, GroupedPool>, pool) => {
    const tokenXId = pool.tokenX?.id;
    const tokenYId = pool.tokenY?.id;

    // 유효한 토큰 쌍이 아니면 건너뜁니다
    if (!tokenXId || !tokenYId) return acc;

    // Extract actual addresses from chainId-prefixed IDs
    const tokenXAddress = fromChainId(tokenXId);
    const tokenYAddress = fromChainId(tokenYId);

    // 그룹 키 생성 (use addresses for grouping)
    const groupKey = `${tokenXAddress}-${tokenYAddress}`;

    // 그룹이 없으면 초기화합니다
    if (!acc[groupKey]) {
      acc[groupKey] = {
        // 메인 그룹 정보
        name: `${pool.tokenX?.symbol}-${pool.tokenY?.symbol}`,
        tokenX: {
          address: tokenXAddress,
          name: pool.tokenX?.name,
          symbol: pool.tokenX?.symbol,
          decimals: pool.tokenX?.decimals,
          priceUsd: Number(pool.tokenX?.priceUSD),
        },
        tokenY: {
          address: tokenYAddress,
          name: pool.tokenY?.name,
          symbol: pool.tokenY?.symbol,
          decimals: pool.tokenY?.decimals,
          priceUsd: Number(pool.tokenY?.priceUSD),
        },
        totalLiquidityUsd: 0,
        totalLiquidityNative: 0,
        totalVolume24h: 0,
        totalFees24h: 0,
        groups: [], // 개별 풀 데이터를 담을 배열
      };
    }

    // 그룹별 합산 값 업데이트
    acc[groupKey].totalLiquidityUsd += Number(pool.totalValueLockedUSD);

    const poolFees24h = result.LBPairHourData.filter((item) => item.lbPair_id === pool.id).reduce(
      (sum, item) => sum + Number(item.feesUSD),
      0
    );

    const poolVolume24h = result.LBPairHourData.filter((item) => item.lbPair_id === pool.id).reduce(
      (sum, item) => sum + Number(item.volumeUSD),
      0
    );

    acc[groupKey].totalVolume24h += Number(poolVolume24h || 0);
    acc[groupKey].totalFees24h += Number(poolFees24h || 0);

    const lbPairParameterSet = result.LBPairParameterSet.find((item) => item.lbPair_id === pool.id);

    // 개별 풀 데이터를 `groups` 배열에 추가
    acc[groupKey].groups.push({
      pairAddress: fromChainId(pool.id),
      baseFeePct: Number(pool.baseFeePct),
      activeBinId: Number(pool.activeId),
      liquidityUsd: Number(pool.totalValueLockedUSD),
      volume24h: Number(poolVolume24h || 0),
      fees24h: Number(poolFees24h || 0),
      lbMaxFeePct:
        Number(pool.baseFeePct) +
        ((Number(lbPairParameterSet?.maxVolatilityAccumulator) * Number(pool.binStep)) ** 2 *
          Number(lbPairParameterSet?.variableFeeControl)) /
          1e18,
      reserveX: Number(pool.reserveX),
      reserveY: Number(pool.reserveY),
      lbBinStep: Number(pool.binStep),
      lbBaseFeePct: Number(pool.baseFeePct),
      liquidityDepthMinus: 1,
      liquidityDepthPlus: 1,
      liquidityDepthTokenX: 1,
      liquidityDepthTokenY: 1,
      volumeUsd: Number(poolVolume24h || 0),
      volumeNative: '0',
      feesUsd: Number(poolFees24h || 0),
      feesNative: '0',
      protocolSharePct: Number(lbPairParameterSet?.protocolShare) / 100,
    });

    return acc;
  }, {});

  // 객체를 배열로 변환하여 반환
  return Object.values(groupedPools);
}

// Pool Data Query
export async function getPoolData(pairAddress: string) {
  const chainPairId = toChainPairId(pairAddress);
  const bundleId = toBundleId();
  const twentyFourHoursAgo = Math.floor(Date.now() / 1000 - 24 * 60 * 60);
  const query = `
    query GetPool($pairAddress: String!, $bundleId: String!, $twentyFourHoursAgo: Int!) {
      LBPair(where: { id: { _eq: $pairAddress } }) {
        id
        tokenX {
          id
          name
          symbol
          decimals
          priceUSD
        }
        tokenY {
          id
          name
          symbol
          decimals
          priceUSD
        }
        reserveX
        reserveY
        binStep
        baseFeePct
        activeId
        totalValueLockedUSD
        volumeUSD
        feesUSD
      }
      Bundle(where: { id: { _eq: $bundleId } }) {
        nativePriceUSD
      }
      LBPairParameterSet(where: { lbPair_id: { _eq: $pairAddress } }) {
        maxVolatilityAccumulator
        variableFeeControl
        protocolShare
      }
      LBPairHourData(where: { lbPair_id: { _eq: $pairAddress }, date: { _gte: $twentyFourHoursAgo } }) {
        feesUSD
        volumeUSD
      }
    }
  `;

  return graphqlRequest<{
    LBPair: Array<{
      id: string;
      tokenX: {
        id: string;
        name: string;
        symbol: string;
        decimals: number;
        priceUSD: string;
      };
      tokenY: {
        id: string;
        name: string;
        symbol: string;
        decimals: number;
        priceUSD: string;
      };
      reserveX: string;
      reserveY: string;
      binStep: number;
      baseFeePct: string;
      activeId: number;
      totalValueLockedUSD: string;
      volumeUSD: string;
      feesUSD: string;
    }>;
    Bundle: Array<{ nativePriceUSD: string }>;
    LBPairParameterSet: Array<{
      maxVolatilityAccumulator: string;
      variableFeeControl: string;
      protocolShare: string;
    }>;
    LBPairHourData: Array<{
      feesUSD: string;
      volumeUSD: string;
    }>;
  }>(query, { pairAddress: chainPairId, bundleId, twentyFourHoursAgo });
}

// User Pool IDs Query
export async function getUserPoolIds(userAddress: string) {
  const twentyFourHoursAgo = Math.floor(Date.now() / 1000 - 24 * 60 * 60);
  const chainUserId = toChainUserId(userAddress);
  const bundleId = toBundleId();

  const query = `
    query GetUserPoolIds($userAddress: String!, $twentyFourHoursAgo: Int!, $bundleId: String!) {
      UserBinLiquidity(where: { user_id: { _eq: $userAddress } }) {
        lbPair {
          id
          binStep
          baseFeePct
          activeId
          reserveX
          reserveY
          totalValueLockedUSD
          tokenX {
            id
            name
            symbol
            decimals
            priceUSD
          }
          tokenY {
            id
            name
            symbol
            decimals
            priceUSD
          }
        }
      }
      LBPairParameterSet(order_by: { lbPair_id: desc }) {
        lbPair_id
        maxVolatilityAccumulator
        variableFeeControl
        protocolShare
      }
      Bundle(where: { id: { _eq: $bundleId } }) {
        nativePriceUSD
      }
      LBPairHourData(where: { date: { _gte: $twentyFourHoursAgo } }) {
        lbPair_id
        volumeUSD
        feesUSD
      }
    }
  `;

  const result = await graphqlRequest<{
    UserBinLiquidity: Array<{
      lbPair: {
        id: string;
        binStep: number;
        baseFeePct: string;
        activeId: number;
        reserveX: string;
        reserveY: string;
        totalValueLockedUSD: string;
        tokenX: {
          id: string;
          name: string;
          symbol: string;
          decimals: number;
          priceUSD: string;
        };
        tokenY: {
          id: string;
          name: string;
          symbol: string;
          decimals: number;
          priceUSD: string;
        };
      };
    }>;
    LBPairParameterSet: Array<{
      lbPair_id: string;
      maxVolatilityAccumulator: string;
      variableFeeControl: string;
      protocolShare: string;
    }>;
    Bundle: Array<{ nativePriceUSD: string }>;
    LBPairHourData: Array<{
      lbPair_id: string;
      volumeUSD: string;
      feesUSD: string;
    }>;
  }>(query, { userAddress: chainUserId, twentyFourHoursAgo, bundleId });

  // Envio 코드의 데이터 가공 로직 적용
  // 중복 제거 및 데이터 변환
  const returnType = result.UserBinLiquidity.filter(
    (item, index, self) => self.findIndex((t) => t.lbPair.id === item.lbPair.id) === index
  ).map((item) => {
    const pool = item.lbPair;
    const lbPairParameterSet = result.LBPairParameterSet.find((param) => param.lbPair_id === pool.id);
    const poolVolume24h = result.LBPairHourData.filter((hourData) => hourData.lbPair_id === pool.id).reduce(
      (acc, hourData) => acc + Number(hourData.volumeUSD),
      0
    );
    const poolFees24h = result.LBPairHourData.filter((hourData) => hourData.lbPair_id === pool.id).reduce(
      (acc, hourData) => acc + Number(hourData.feesUSD),
      0
    );

    return {
      pairAddress: fromChainId(pool.id),
      name: `${pool.tokenX?.symbol}-${pool.tokenY?.symbol}`,
      tokenX: {
        address: fromChainId(pool.tokenX?.id || ''),
        name: pool.tokenX?.name,
        symbol: pool.tokenX?.symbol,
        decimals: pool.tokenX?.decimals,
        priceUsd: Number(pool.tokenX?.priceUSD),
      },
      tokenY: {
        address: fromChainId(pool.tokenY?.id || ''),
        name: pool.tokenY?.name,
        symbol: pool.tokenY?.symbol,
        decimals: pool.tokenY?.decimals,
        priceUsd: Number(pool.tokenY?.priceUSD),
      },
      reserveX: Number(pool.reserveX),
      reserveY: Number(pool.reserveY),
      lbBinStep: Number(pool.binStep),
      lbBaseFeePct: Number(pool.baseFeePct),
      lbMaxFeePct:
        Number(pool.baseFeePct) +
        ((Number(lbPairParameterSet?.maxVolatilityAccumulator) * Number(pool.binStep)) ** 2 *
          Number(lbPairParameterSet?.variableFeeControl)) /
          1e18,
      activeBinId: Number(pool.activeId),
      liquidityUsd: Number(pool.totalValueLockedUSD),
      liquidityNative: pool.totalValueLockedUSD || '0',
      liquidityDepthMinus: 1,
      liquidityDepthPlus: 1,
      liquidityDepthTokenX: 1,
      liquidityDepthTokenY: 1,
      volumeUsd: Number(poolVolume24h || 0),
      volumeNative: '0',
      feesUsd: Number(poolFees24h || 0),
      feesNative: '0',
      protocolSharePct: Number(lbPairParameterSet?.protocolShare) / 100,
    };
  });

  return returnType;
}

// User Bin Liquidity Query
export async function getUserBinLiquidity(pairAddress: string, userAddress: string) {
  const chainPairId = toChainPairId(pairAddress);
  const chainUserId = toChainUserId(userAddress);
  const query = `
    query GetUserBinLiquidity($pairAddress: String!, $userAddress: String!) {
      UserBinLiquidity(
        where: {
          lbPair_id: { _eq: $pairAddress }
          user_id: { _eq: $userAddress }
        }
      ) {
        binId
      }
    }
  `;

  return graphqlRequest<{
    UserBinLiquidity: Array<{
      binId: number;
    }>;
  }>(query, { pairAddress: chainPairId, userAddress: chainUserId });
}

// Token Prices Query
export async function getTokenPrices() {
  const query = `
    query GetTokensPrices {
      Token {
        id
        symbol
        name
        decimals
        priceUSD
      }
    }
  `;

  return graphqlRequest<{
    Token: Array<{
      id: string;
      symbol: string;
      name: string;
      decimals: number;
      priceUSD: string;
    }>;
  }>(query);
}

// DEX Hourly Analytics Query (for 7-day period)
export async function getDexHourlyAnalytics(startTime: number) {
  const query = `
    query GetDexHourlyAnalytics($startTime: Int!) {
      LBHourData(
        where: { date: { _gte: $startTime } }
        limit: 168
        order_by: { date: asc }
      ) {
        id
        date
        volumeUSD
        feesUSD
        totalValueLockedUSD
        txCount
      }
    }
  `;

  const result = await graphqlRequest<{
    LBHourData: Array<{
      id: string;
      date: number;
      volumeUSD: string;
      feesUSD: string;
      totalValueLockedUSD: string;
      txCount: number;
    }>;
  }>(query, { startTime });

  return result.LBHourData.map((item) => ({
    date: new Date(item.date * 1000).toISOString(),
    timestamp: item.date,
    volumeUSD: Number(item.volumeUSD),
    feesUSD: Number(item.feesUSD),
    totalValueLockedUSD: Number(item.totalValueLockedUSD),
    txCount: Number(item.txCount),
  }));
}

// DEX Analytics Query
export async function getDexAnalytics(startTime: number, limit: number = 180) {
  const query = `
    query GetDexAnalytics($startTime: Int!, $limit: Int!) {
      LBDayData(
        where: { date: { _gte: $startTime } }
        limit: $limit
        order_by: { date: asc }
      ) {
        id
        date
        volumeUSD
        feesUSD
        totalValueLockedUSD
        txCount
      }
    }
  `;

  const result = await graphqlRequest<{
    LBDayData: Array<{
      id: string;
      date: number;
      volumeUSD: string;
      feesUSD: string;
      totalValueLockedUSD: string;
      txCount: number;
    }>;
  }>(query, { startTime, limit });

  return result.LBDayData.map((item) => ({
    date: new Date(item.date * 1000).toISOString(),
    timestamp: item.date,
    volumeUSD: Number(item.volumeUSD),
    feesUSD: Number(item.feesUSD),
    totalValueLockedUSD: Number(item.totalValueLockedUSD),
    txCount: Number(item.txCount),
  }));
}

// User Fees Earned Query
export async function getUserFeesEarned(pairAddress: string, userAddress: string) {
  const chainPairId = toChainPairId(pairAddress);
  const chainUserId = toChainUserId(userAddress);
  const query = `
    query GetUserFeesEarned($pairAddress: String!, $userAddress: String!) {
      UserFeesPerBinData(
        where: {
          lbPair_id: { _eq: $pairAddress }
          user_id: { _eq: $userAddress }
        }
      ) {
        binId
        timestamp
        accruedFeesX
        accruedFeesY
        priceY
        priceX
      }
    }
  `;

  return graphqlRequest<{
    UserFeesPerBinData: Array<{
      binId: number;
      timestamp: number;
      accruedFeesX: string;
      accruedFeesY: string;
      priceY: string;
      priceX: string;
    }>;
  }>(query, { pairAddress: chainPairId, userAddress: chainUserId });
}

// User Fees Analytics Query
export async function getUserFeesAnalytics(pairAddress: string, userAddress: string) {
  const chainPairId = toChainPairId(pairAddress);
  const chainUserId = toChainUserId(userAddress);
  const query = `
    query GetUserFeesAnalytics($pairAddress: String!, $userAddress: String!) {
      UserFeesHourData(
        where: {
          lbPair_id: { _eq: $pairAddress }
          user_id: { _eq: $userAddress }
        }
        order_by: { date: desc }
        limit: 24
      ) {
        date
        accruedFeesX
        accruedFeesY
      }
      UserFeesDayData(
        where: {
          lbPair_id: { _eq: $pairAddress }
          user_id: { _eq: $userAddress }
        }
        order_by: { date: desc }
        limit: 30
      ) {
        date
        accruedFeesX
        accruedFeesY
      }
    }
  `;

  return graphqlRequest<{
    UserFeesHourData: Array<{
      date: number;
      accruedFeesX: string;
      accruedFeesY: string;
    }>;
    UserFeesDayData: Array<{
      date: number;
      accruedFeesX: string;
      accruedFeesY: string;
    }>;
  }>(query, { pairAddress: chainPairId, userAddress: chainUserId });
}

// Portfolio Query
export async function getPortfolio(userAddress: string) {
  const chainUserId = toChainUserId(userAddress);
  const query = `
    query GetPortfolio($userAddress: String!) {
      UserBinLiquidity(where: { user_id: { _eq: $userAddress } }) {
        id
        binId
        lbPair {
          id
          baseFeePct
          activeId
          binStep
          tokenX {
            id
            symbol
            name
            decimals
            priceUSD
          }
          tokenY {
            id
            symbol
            name
            decimals
            priceUSD
          }
        }
      }
      UserFeesPerBinData(where: { user_id: { _eq: $userAddress } }) {
        lbPair_id
        accruedFeesX
        accruedFeesY
      }
    }
  `;

  const result = await graphqlRequest<{
    UserBinLiquidity: Array<{
      id: string;
      binId: number;
      lbPair: {
        id: string;
        baseFeePct: string;
        activeId: number;
        binStep: number;
        tokenX: {
          id: string;
          symbol: string;
          name: string;
          decimals: number;
          priceUSD: string;
        };
        tokenY: {
          id: string;
          symbol: string;
          name: string;
          decimals: number;
          priceUSD: string;
        };
      };
    }>;
    UserFeesPerBinData: Array<{
      lbPair_id: string;
      accruedFeesX: string;
      accruedFeesY: string;
    }>;
  }>(query, { userAddress: chainUserId });

  // Envio 코드의 데이터 가공 로직 적용
  const userFees = result.UserFeesPerBinData.reduce(
    (acc: Record<string, { lbPairId: string; totalAccruedFeesX: number; totalAccruedFeesY: number }>, item) => {
      if (!acc[item.lbPair_id]) {
        acc[item.lbPair_id] = {
          lbPairId: item.lbPair_id,
          totalAccruedFeesX: Number(item.accruedFeesX),
          totalAccruedFeesY: Number(item.accruedFeesY),
        };
      } else {
        acc[item.lbPair_id].totalAccruedFeesX += Number(item.accruedFeesX);
        acc[item.lbPair_id].totalAccruedFeesY += Number(item.accruedFeesY);
      }
      return acc;
    },
    {}
  );

  const objectUserFees = Object.values(userFees).map((item) => ({
    lbPairId: fromChainId(item.lbPairId),
    totalAccruedFeesX: item.totalAccruedFeesX.toString(),
    totalAccruedFeesY: item.totalAccruedFeesY.toString(),
  }));

  const mapedUserPools = result.UserBinLiquidity.reduce(
    (
      acc: Record<
        string,
        {
          lbPairId: string;
          tokenXId: string;
          tokenYId: string;
          name: string;
          baseFeePct: number;
          binStep: number;
          activeId: number;
          tokenXDecimals: number;
          tokenYDecimals: number;
          userBinLiquidities: number[];
        }
      >,
      item
    ) => {
      if (!acc[item.lbPair.id]) {
        acc[item.lbPair.id] = {
          lbPairId: fromChainId(item.lbPair.id),
          tokenXId: fromChainId(item.lbPair.tokenX.id),
          tokenYId: fromChainId(item.lbPair.tokenY.id),
          name: `${item.lbPair.tokenX.symbol}-${item.lbPair.tokenY.symbol}-${item.lbPair.binStep}`,
          baseFeePct: Number(item.lbPair.baseFeePct),
          binStep: Number(item.lbPair.binStep),
          activeId: item.lbPair.activeId,
          tokenXDecimals: Number(item.lbPair.tokenX.decimals),
          tokenYDecimals: Number(item.lbPair.tokenY.decimals),
          userBinLiquidities: [Number(item.binId)],
        };
      } else {
        acc[item.lbPair.id].userBinLiquidities.push(Number(item.binId));
      }
      return acc;
    },
    {}
  );

  const objectUserPools = Object.values(mapedUserPools);

  return {
    userAllPools: objectUserPools,
    feesEarned: objectUserFees,
    volume: [
      {
        userId: userAddress,
        totalVolumeUSD: '0',
      },
    ],
  };
}

// Combined query for AI suggestion - 추가 데이터만 조회 (pools는 이미 useGroupedPools에서 가져옴)
export async function getAISuggestionData(tokenXAddress: string, tokenYAddress: string, bestPairAddress: string, bestPoolActiveId: number) {
  const chainTokenXId = toChainTokenId(tokenXAddress);
  const chainTokenYId = toChainTokenId(tokenYAddress);
  const chainPairId = toChainPairId(bestPairAddress);
  const startTime = Math.floor(Date.now() / 1000 - 7 * 24 * 60 * 60); // 7일 전
  const fromBinId = bestPoolActiveId - 50;
  const toBinId = bestPoolActiveId + 50;

  // 단일 GraphQL 쿼리로 모든 추가 데이터 조회
  const query = `
    query GetAISuggestionData(
      $tokenXId: String!,
      $tokenYId: String!,
      $pairId: String!,
      $startTime: Int!,
      $fromBinId: Int!,
      $toBinId: Int!
    ) {
      # Token X 가격 히스토리 (OHLC - 변동성 분석용)
      tokenXPriceHistory: TokenDayData(
        where: { token_id: { _eq: $tokenXId }, date: { _gte: $startTime } }
        order_by: { date: asc }
        limit: 30
      ) {
        date
        openPriceUSD
        highPriceUSD
        lowPriceUSD
        closePriceUSD
        volumeUSD
      }

      # Token Y 가격 히스토리 (OHLC - 변동성 분석용)
      tokenYPriceHistory: TokenDayData(
        where: { token_id: { _eq: $tokenYId }, date: { _gte: $startTime } }
        order_by: { date: asc }
        limit: 30
      ) {
        date
        openPriceUSD
        highPriceUSD
        lowPriceUSD
        closePriceUSD
        volumeUSD
      }

      # 최고 TVL 풀의 7일 볼륨/수수료 히스토리
      pairHistory: LBPairDayData(
        where: { lbPair_id: { _eq: $pairId }, date: { _gte: $startTime } }
        order_by: { date: asc }
        limit: 30
      ) {
        date
        volumeUSD
        feesUSD
        txCount
        totalValueLockedUSD
      }

      # 최고 TVL 풀의 Bin 분포 (activeId 기준 ±50)
      binDistribution: Bin(
        where: {
          lbPair_id: { _eq: $pairId }
          binId: { _gte: $fromBinId, _lte: $toBinId }
        }
        order_by: { binId: asc }
      ) {
        binId
        priceX
        priceY
        reserveX
        reserveY
        liquidityProviderCount
      }
    }
  `;

  const result = await graphqlRequest<{
    tokenXPriceHistory: Array<{
      date: number;
      openPriceUSD: string;
      highPriceUSD: string;
      lowPriceUSD: string;
      closePriceUSD: string;
      volumeUSD: string;
    }>;
    tokenYPriceHistory: Array<{
      date: number;
      openPriceUSD: string;
      highPriceUSD: string;
      lowPriceUSD: string;
      closePriceUSD: string;
      volumeUSD: string;
    }>;
    pairHistory: Array<{
      date: number;
      volumeUSD: string;
      feesUSD: string;
      txCount: number;
      totalValueLockedUSD: string;
    }>;
    binDistribution: Array<{
      binId: number;
      priceX: string;
      priceY: string;
      reserveX: string;
      reserveY: string;
      liquidityProviderCount: string;
    }>;
  }>(query, {
    tokenXId: chainTokenXId,
    tokenYId: chainTokenYId,
    pairId: chainPairId,
    startTime,
    fromBinId,
    toBinId,
  });

  // 데이터 변환
  return {
    tokenXPriceHistory: result.tokenXPriceHistory.map((item) => ({
      date: item.date,
      openPriceUSD: Number(item.openPriceUSD),
      highPriceUSD: Number(item.highPriceUSD),
      lowPriceUSD: Number(item.lowPriceUSD),
      closePriceUSD: Number(item.closePriceUSD),
      volumeUSD: Number(item.volumeUSD),
    })),
    tokenYPriceHistory: result.tokenYPriceHistory.map((item) => ({
      date: item.date,
      openPriceUSD: Number(item.openPriceUSD),
      highPriceUSD: Number(item.highPriceUSD),
      lowPriceUSD: Number(item.lowPriceUSD),
      closePriceUSD: Number(item.closePriceUSD),
      volumeUSD: Number(item.volumeUSD),
    })),
    pairHistory: result.pairHistory.map((item) => ({
      date: item.date,
      volumeUSD: Number(item.volumeUSD),
      feesUSD: Number(item.feesUSD),
      txCount: Number(item.txCount),
      tvlUSD: Number(item.totalValueLockedUSD),
    })),
    binDistribution: result.binDistribution.map((bin) => ({
      binId: bin.binId,
      priceX: Number(bin.priceX),
      priceY: Number(bin.priceY),
      reserveX: Number(bin.reserveX),
      reserveY: Number(bin.reserveY),
      lpCount: Number(bin.liquidityProviderCount),
    })),
  };
}
