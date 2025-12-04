// DLMM AI Strategy Generator
// Claude (Anthropic)를 사용하여 최적의 LP 전략 생성

import type {
  DLMMSuggestionRequest,
  CalculatedMetrics,
  AIStrategyRecommendation,
  DistributionShape,
  ImpermanentLossRisk,
  RebalanceFrequency,
} from './types.js';
import { generateStrategyHints } from './metrics-calculator.js';

// Vercel/Node.js 환경변수 타입 선언
declare const process: { env: { ANTHROPIC_API_KEY?: string } };

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;

interface ClaudeResponse {
  content: Array<{
    type: 'text';
    text: string;
  }>;
  stop_reason: string;
}

/**
 * System prompt for AI strategy generation
 */
const SYSTEM_PROMPT = `You are an expert DeFi liquidity analyst specializing in Liquidity Book (LB) DEX protocols, specifically for meme tokens with viral mechanics.
Your task is to recommend optimal LP (Liquidity Provider) strategies based on market data, viral scores, and user preferences.

## Liquidity Book Concepts:
- **Bin**: Price range unit. Each bin has a specific price range.
- **Bin Step**: Fee tier in basis points. Higher = wider price range per bin, higher fees.
  - binStep 1 = 0.01% fee, very tight range (for stablecoins)
  - binStep 10 = 0.1% fee (common for volatile pairs)
  - binStep 25 = 0.25% fee (higher volatility)
  - binStep 100 = 1% fee (very volatile)
- **Active Bin**: Current price bin where trades occur.
- **Distribution Shape**:
  - SPOT: Equal liquidity across all bins (balanced, good for range trading)
  - CURVE: Bell curve distribution, concentrated at center (higher fee capture, higher IL risk)
  - BID_ASK: Split liquidity above/below current price (good for trending markets)

## 🔥 VIRAL SCORE & PROTOCOL FEE BOOST SYSTEM:
Meme Pulse has a unique viral scoring system that DIRECTLY affects LP earnings:
- **Default**: Protocol takes 50% of swap fees, LP gets 50%
- **Rank 1 Viral**: Protocol takes only 10%, LP gets 90% → **+80% MORE YIELD** (90/50 - 1 = 0.8)
- **Rank 2 Viral**: Protocol takes 20%, LP gets 80% → **+60% MORE YIELD** (80/50 - 1 = 0.6)
- **Rank 3 Viral**: Protocol takes 40%, LP gets 60% → **+20% MORE YIELD** (60/50 - 1 = 0.2)

This is a CRITICAL factor for strategy recommendations:
- Viral tokens = MUCH higher effective APR for LPs
- Social momentum (rising/declining) indicates viral period sustainability
- Consider tighter, more aggressive positions for viral tokens to maximize the boost period

## Strategy Guidelines:

### Risk Profile → Strategy Mapping:
1. **Aggressive Profile**:
   - Narrower bin range (21-35 bins)
   - Prefer CURVE shape for concentrated fees
   - Choose higher binStep pools for more fee capture per trade
   - Accept higher IL risk for higher potential returns
   - If viral token: Go even tighter (15-25 bins) to maximize boost period

2. **Defensive Profile**:
   - Wider bin range (51-69 bins)
   - Prefer SPOT shape for balanced exposure
   - Choose lower binStep pools for capital efficiency
   - Prioritize IL protection over fee maximization
   - If viral token: Still wider range but acknowledge boost benefit

3. **Auto Profile**:
   - Adapt based on market conditions
   - Balance between APR and risk
   - Consider viral status as bonus, not primary factor

### Market Condition → Adjustments:
- **High Volatility (>60)** → Wider range, larger binStep
- **Low Volatility (<30)** → Tighter range, smaller binStep
- **Trending Up** → Asymmetric range (more bins above activeId)
- **Trending Down** → Asymmetric range (more bins below activeId)
- **Volatile** → Prioritize IL protection, use SPOT

### Viral Token Special Rules:
- **Rising Social Momentum** → More aggressive position, maximize boost
- **Declining Social Momentum** → Prepare for viral period end, consider wider range
- **Viral + Aggressive** → Maximum concentration (CURVE, 15-25 bins)
- **Viral + Defensive** → Moderate (SPOT, 35-51 bins), still benefit from boost

## IMPORTANT: Response Format
You MUST respond with ONLY valid JSON. Do NOT include any markdown code blocks, explanations, or additional text.
Return ONLY the JSON object matching the required format below.`;

/**
 * AI 입력 데이터 포맷팅
 */
function formatAIInput(request: DLMMSuggestionRequest, metrics: CalculatedMetrics, hints: string[]): string {
  const poolSummary = request.availablePools.map((pool) => ({
    pairAddress: pool.pairAddress,
    binStep: pool.binStep,
    tvlUSD: Math.round(pool.tvlUSD),
    volume24hUSD: Math.round(pool.volume24hUSD),
    fees24hUSD: Math.round(pool.fees24hUSD * 100) / 100,
    baseAPR: metrics.feeAPRByPool[pool.pairAddress] || 0,
    effectiveAPR: metrics.effectiveAPRByPool[pool.pairAddress] || metrics.feeAPRByPool[pool.pairAddress] || 0,
    lpCount: pool.lpCount,
    protocolSharePct: pool.parameters?.protocolSharePct || 50,
  }));

  // Viral Score section (if available)
  const viralSection = metrics.viralMetrics.hasViralBoost
    ? `
## 🔥 VIRAL SCORE DATA (CRITICAL FOR STRATEGY)
- Token X (${request.tokenX.symbol}):
  - Viral Score: ${metrics.viralMetrics.tokenXScore}/100
  - Viral Rank: ${metrics.viralMetrics.tokenXRank || 'Not ranked (no boost)'}
- Token Y (${request.tokenY.symbol}):
  - Viral Score: ${metrics.viralMetrics.tokenYScore}/100
  - Viral Rank: ${metrics.viralMetrics.tokenYRank || 'Not ranked (no boost)'}
- VIRAL BOOST ACTIVE: Yes! ${Math.round((metrics.viralMetrics.viralBoostMultiplier - 1) * 100)}% extra LP earnings
- Social Momentum: ${metrics.viralMetrics.socialMomentum.toUpperCase()}
- Effective APR includes viral boost already applied
`
    : `
## Viral Score Data
- No viral boost active for this token pair
- Social Score Token X: ${metrics.viralMetrics.tokenXScore}
- Social Score Token Y: ${metrics.viralMetrics.tokenYScore}
`;

  return `
## User Request
- Risk Profile: ${request.riskProfile.toUpperCase()}
- Token Pair: ${request.tokenX.symbol} / ${request.tokenY.symbol}
- Token X Price: $${request.tokenX.priceUSD?.toFixed(6) || 'N/A'}
- Token Y Price: $${request.tokenY.priceUSD?.toFixed(6) || 'N/A'}

## Available Pools (same token pair, different binStep)
${JSON.stringify(poolSummary, null, 2)}
${viralSection}
## Market Metrics (calculated from 7-day data)
- Combined Volatility Score: ${metrics.combinedVolatility}/100 (0=stable, 100=extremely volatile)
- Token X Volatility: ${metrics.tokenXVolatility}/100
- Token Y Volatility: ${metrics.tokenYVolatility}/100
${metrics.hourlyVolatility !== undefined ? `- Recent 24h Hourly Volatility: ${metrics.hourlyVolatility}/100` : ''}
- Market Condition: ${metrics.marketCondition}
- 7-Day Price Change: ${metrics.priceChange7d}%
- Volume Trend: ${metrics.volumeTrend}
- Avg Daily Volume: $${metrics.avgDailyVolumeUSD.toLocaleString()}
${metrics.avgHourlyVolumeUSD !== undefined ? `- Avg Hourly Volume (24h): $${metrics.avgHourlyVolumeUSD.toLocaleString()}` : ''}
- Avg Daily Fees: $${metrics.avgDailyFeesUSD.toLocaleString()}
- Volume/TVL Ratio: ${metrics.volumeToTvlRatio} (higher = more active trading)
- Liquidity Concentration (±10 bins): ${metrics.liquidityConcentration}%
- Active Bins Count: ${metrics.activeBinsCount}

## Pool Parameter Analysis
- Average Protocol Share: ${metrics.poolParameterAnalysis.avgProtocolShare}%
- Best Pool (lowest protocol share): ${metrics.poolParameterAnalysis.bestProtocolSharePool || 'N/A'}
- Fee Volatility Risk: ${metrics.poolParameterAnalysis.feeVolatilityRisk}

## Current Active Bin ID: ${request.currentActiveId}

## Strategy Hints (pre-calculated recommendations)
${hints.map((h) => `- ${h}`).join('\n')}

## Required Output Format
CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no explanations. Just the raw JSON object.

{
  "recommendedPool": {
    "pairAddress": "0x... (pick from available pools)",
    "binStep": number,
    "reasoning": "string explaining why this pool",
    "protocolSharePct": number (current protocol share of this pool)
  },
  "strategy": {
    "binCount": number (MOST IMPORTANT - typically 15-35 for aggressive, 35-69 for defensive. Server will calculate minBinId/maxBinId from this),
    "distributionShape": "SPOT" | "CURVE" | "BID_ASK"
  },
  "riskAssessment": {
    "expectedAPR": "IGNORE - will be calculated server-side from metrics",
    "baseAPR": "IGNORE - will be calculated server-side from metrics",
    "viralBoostAPR": "DO NOT USE - deprecated field, omit this",
    "impermanentLossRisk": "low" | "medium" | "high",
    "rebalanceFrequency": "hourly" | "daily" | "weekly" | "rarely",
    "viralBoostActive": boolean
  },
    "analysis": {
    "marketCondition": "brief market assessment (max 2-3 words: 'trending up', 'volatile', 'stable', etc.)",
    "keyFactors": ["factor1", "factor2", "factor3", "factor4"] - each factor max 25 characters, keep concise,
    "reasoning": "concise explanation (max 60 words) including viral score impact if applicable. Be brief and direct.",
    "viralAnalysis": "brief analysis of viral score impact (max 30 words, only if viral)",
    "socialSentiment": "bullish" | "neutral" | "bearish"
  },
  "detailedExplanation": {
    "poolSelectionReason": "Why this specific pool was chosen (TVL, fees, binStep suitability)",
    "binRangeReason": "Why this bin range width (volatility, risk profile, market condition)",
    "shapeReason": "Why SPOT/CURVE/BID_ASK (market direction, fee capture vs IL protection)",
    "riskRewardTradeoff": "Clear explanation of what you gain vs what you risk",
    "viralBoostImpact": "If viral: how the X% boost affects your expected returns (omit if no boost)",
    "rebalanceScenarios": ["Scenario 1 that would trigger rebalance", "Scenario 2..."],
    "warnings": ["Warning 1 about risks", "Warning 2..."],
    "tldr": "One sentence summary of the strategy recommendation"
  }
}`;
}

/**
 * Claude (Anthropic) API 호출
 */
async function callClaude(systemPrompt: string, userMessage: string): Promise<string> {
  if (!ANTHROPIC_API_KEY) {
    throw new Error('ANTHROPIC_API_KEY is not configured');
  }

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      // Model options:
      // - 'claude-3-haiku-20240307' (current): Fastest & cheapest (~$0.0035/request)
      // - 'claude-sonnet-4-20250514': Better quality, ~10x more expensive (~$0.0315/request)
      // - 'claude-opus-4-20250514': Best quality, ~30x more expensive (~$0.10/request)
      model: 'claude-3-haiku-20240307',
      max_tokens: 1500, // Reduced from 2048 for cost optimization, still sufficient for detailed responses
      system: systemPrompt,
      messages: [{ role: 'user', content: userMessage }],
      temperature: 0.3, // Lower for more consistent outputs
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${response.status} - ${error}`);
  }

  const data = (await response.json()) as ClaudeResponse;

  // Claude 응답에서 텍스트 추출
  const textContent = data.content.find((block) => block.type === 'text');
  return textContent?.text || '';
}

/**
 * Claude 응답에서 JSON 추출
 * 마크다운 코드 블록이나 추가 텍스트 제거
 */
function extractJSONFromResponse(responseText: string): string {
  let cleaned = responseText.trim();

  // 마크다운 코드 블록에서 JSON 추출 (```json ... ``` 또는 ``` ... ```)
  const codeBlockMatch = cleaned.match(/```(?:json)?\s*([\s\S]*?)```/);
  if (codeBlockMatch && codeBlockMatch[1]) {
    cleaned = codeBlockMatch[1].trim();
  }

  // 중괄호로 시작하는 첫 번째 위치 찾기
  const firstBrace = cleaned.indexOf('{');
  if (firstBrace === -1) {
    return cleaned;
  }

  // 중괄호 매칭을 통한 JSON 객체 추출
  let braceCount = 0;
  const startIdx = firstBrace;
  let endIdx = -1;

  for (let i = startIdx; i < cleaned.length; i++) {
    if (cleaned[i] === '{') {
      braceCount++;
    } else if (cleaned[i] === '}') {
      braceCount--;
      if (braceCount === 0) {
        endIdx = i;
        break;
      }
    }
  }

  if (endIdx !== -1) {
    return cleaned.substring(startIdx, endIdx + 1);
  }

  // 매칭 실패 시 첫 번째 중괄호부터 끝까지 시도
  const fallbackMatch = cleaned.match(/\{[\s\S]*\}/);
  if (fallbackMatch) {
    return fallbackMatch[0];
  }

  return cleaned;
}

/**
 * AI 응답 파싱 및 검증
 */
function parseAIResponse(responseText: string, request: DLMMSuggestionRequest, metrics: CalculatedMetrics): AIStrategyRecommendation {
  let parsed: Partial<AIStrategyRecommendation>;

  try {
    // JSON 추출 시도
    const jsonText = extractJSONFromResponse(responseText);
    parsed = JSON.parse(jsonText);
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    console.error('Response text:', responseText.substring(0, 500));
    throw new Error(`Failed to parse AI response as JSON: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }

  // 기본값으로 폴백
  const defaultPool = request.availablePools.reduce((best, pool) => (pool.tvlUSD > best.tvlUSD ? pool : best), request.availablePools[0]);
  const hasViralBoost = metrics.viralMetrics.hasViralBoost;
  const boostPct = Math.round((metrics.viralMetrics.viralBoostMultiplier - 1) * 100);

  // APR 값 계산 (AI가 생성한 값 대신 계산된 메트릭 사용)
  const recommendedPoolAddress = parsed.recommendedPool?.pairAddress || defaultPool?.pairAddress || '';
  const baseAPR = metrics.feeAPRByPool[recommendedPoolAddress] || metrics.feeAPRByPool[defaultPool?.pairAddress || ''] || 0;
  const effectiveAPR =
    metrics.effectiveAPRByPool[recommendedPoolAddress] || metrics.effectiveAPRByPool[defaultPool?.pairAddress || ''] || baseAPR;

  // APR 범위 계산 (80-120% 범위)
  const expectedAPRMin = Math.round(effectiveAPR * 0.8);
  const expectedAPRMax = Math.round(effectiveAPR * 1.2);
  const expectedAPRStr = `${expectedAPRMin}-${expectedAPRMax}%`;

  const baseAPRMin = Math.round(baseAPR * 0.8);
  const baseAPRMax = Math.round(baseAPR * 1.2);
  const baseAPRStr = hasViralBoost ? `${baseAPRMin}-${baseAPRMax}%` : undefined;

  // Validation and defaults
  const result: AIStrategyRecommendation = {
    recommendedPool: {
      pairAddress: recommendedPoolAddress,
      binStep: parsed.recommendedPool?.binStep || defaultPool?.binStep || 10,
      reasoning: parsed.recommendedPool?.reasoning || 'Selected based on highest TVL',
      protocolSharePct: parsed.recommendedPool?.protocolSharePct || defaultPool?.parameters?.protocolSharePct || 50,
    },
    strategy: {
      // AI가 생성한 binCount를 기준으로 activeId 중심 대칭 범위 계산
      // (AI가 minBinId/maxBinId를 잘못 생성하는 경우 방지)
      minBinId: 0, // 아래에서 재계산
      maxBinId: 0, // 아래에서 재계산
      binCount: parsed.strategy?.binCount || 51,
      distributionShape: validateDistributionShape(parsed.strategy?.distributionShape),
    },
    riskAssessment: {
      expectedAPR: expectedAPRStr, // 계산된 값 사용
      baseAPR: baseAPRStr, // 계산된 값 사용
      viralBoostAPR: undefined, // Deprecated
      impermanentLossRisk: validateILRisk(parsed.riskAssessment?.impermanentLossRisk),
      rebalanceFrequency: validateRebalanceFreq(parsed.riskAssessment?.rebalanceFrequency),
      viralBoostActive: parsed.riskAssessment?.viralBoostActive ?? hasViralBoost,
    },
    analysis: {
      marketCondition: parsed.analysis?.marketCondition || 'Market analysis unavailable',
      keyFactors: parsed.analysis?.keyFactors || ['Data insufficient'],
      reasoning: parsed.analysis?.reasoning || 'AI analysis completed with limited data',
      viralAnalysis: parsed.analysis?.viralAnalysis,
      socialSentiment: validateSocialSentiment(parsed.analysis?.socialSentiment),
    },
    detailedExplanation: {
      poolSelectionReason:
        parsed.detailedExplanation?.poolSelectionReason ||
        `Pool selected based on highest TVL ($${Math.round(defaultPool?.tvlUSD || 0).toLocaleString()}) for better trade execution.`,
      binRangeReason:
        parsed.detailedExplanation?.binRangeReason ||
        `Bin range set based on ${metrics.combinedVolatility > 50 ? 'high' : 'moderate'} volatility (${
          metrics.combinedVolatility
        }/100) and ${request.riskProfile} risk profile.`,
      shapeReason: parsed.detailedExplanation?.shapeReason || 'Distribution shape selected to balance fee capture and IL protection.',
      riskRewardTradeoff:
        parsed.detailedExplanation?.riskRewardTradeoff ||
        'Narrower range = higher fees but more IL risk. Wider range = lower fees but safer.',
      viralBoostImpact: hasViralBoost
        ? parsed.detailedExplanation?.viralBoostImpact ||
          `Viral boost adds +${boostPct}% to your LP yield. Protocol fee reduced, you keep more of the swap fees.`
        : undefined,
      rebalanceScenarios: parsed.detailedExplanation?.rebalanceScenarios || [
        'Price moves outside your bin range',
        'Volatility significantly increases',
      ],
      warnings: parsed.detailedExplanation?.warnings || ['Meme tokens can be highly volatile', 'Impermanent loss risk exists'],
      tldr:
        parsed.detailedExplanation?.tldr ||
        `${request.riskProfile} strategy with ${hasViralBoost ? `+${boostPct}% viral boost` : 'standard yield'}.`,
    },
  };

  // binCount를 기준으로 activeId 중심 대칭 범위 계산
  const halfBins = Math.floor(result.strategy.binCount / 2);
  result.strategy.minBinId = request.currentActiveId - halfBins;
  result.strategy.maxBinId = request.currentActiveId + halfBins;

  // binCount 정확하게 재계산
  result.strategy.binCount = result.strategy.maxBinId - result.strategy.minBinId + 1;

  console.log(
    `🎯 Strategy calculated: binCount=${result.strategy.binCount}, range=[${result.strategy.minBinId}, ${result.strategy.maxBinId}], activeId=${request.currentActiveId}`
  );

  return result;
}

function validateSocialSentiment(sentiment?: string): 'bullish' | 'neutral' | 'bearish' | undefined {
  if (sentiment === 'bullish' || sentiment === 'neutral' || sentiment === 'bearish') {
    return sentiment;
  }
  return undefined;
}

function validateDistributionShape(shape?: string): DistributionShape {
  if (shape === 'SPOT' || shape === 'CURVE' || shape === 'BID_ASK') {
    return shape;
  }
  return 'SPOT';
}

function validateILRisk(risk?: string): ImpermanentLossRisk {
  if (risk === 'low' || risk === 'medium' || risk === 'high') {
    return risk;
  }
  return 'medium';
}

function validateRebalanceFreq(freq?: string): RebalanceFrequency {
  if (freq === 'hourly' || freq === 'daily' || freq === 'weekly' || freq === 'rarely') {
    return freq;
  }
  return 'daily';
}

/**
 * Fallback 전략 생성 (API 실패시)
 */
function generateFallbackStrategy(request: DLMMSuggestionRequest, metrics: CalculatedMetrics): AIStrategyRecommendation {
  // 최고 TVL 풀 선택 (or 가장 낮은 protocol share 풀 if viral)
  let bestPool = request.availablePools.reduce((best, pool) => (pool.tvlUSD > best.tvlUSD ? pool : best), request.availablePools[0]);

  // Viral token인 경우 가장 낮은 protocol share 풀 고려
  if (metrics.viralMetrics.hasViralBoost && metrics.poolParameterAnalysis.bestProtocolSharePool) {
    const viralPool = request.availablePools.find((p) => p.pairAddress === metrics.poolParameterAnalysis.bestProtocolSharePool);
    if (viralPool && viralPool.tvlUSD > 0) {
      bestPool = viralPool;
    }
  }

  // 변동성 기반 bin range 결정
  let binRange: number;
  let shape: DistributionShape;

  if (metrics.combinedVolatility > 60) {
    binRange = 35; // ±35 bins for high volatility
    shape = 'SPOT';
  } else if (metrics.combinedVolatility > 30) {
    binRange = 25; // ±25 bins for medium volatility
    shape = request.riskProfile === 'aggressive' ? 'CURVE' : 'SPOT';
  } else {
    binRange = 15; // ±15 bins for low volatility
    shape = request.riskProfile === 'aggressive' ? 'CURVE' : 'SPOT';
  }

  // 리스크 프로필 조정
  if (request.riskProfile === 'defensive') {
    binRange = Math.round(binRange * 1.5);
    shape = 'SPOT';
  } else if (request.riskProfile === 'aggressive') {
    binRange = Math.round(binRange * 0.7);
    // Viral + Aggressive = even tighter
    if (metrics.viralMetrics.hasViralBoost) {
      binRange = Math.round(binRange * 0.8);
      shape = 'CURVE';
    }
  }

  const minBinId = request.currentActiveId - binRange;
  const maxBinId = request.currentActiveId + binRange;

  // APR 계산 (viral boost 반영)
  const baseAPR = metrics.feeAPRByPool[bestPool?.pairAddress || ''] || 15;
  const effectiveAPR = metrics.effectiveAPRByPool[bestPool?.pairAddress || ''] || baseAPR;

  const hasViralBoost = metrics.viralMetrics.hasViralBoost;
  const boostPercent = Math.round((metrics.viralMetrics.viralBoostMultiplier - 1) * 100);

  // APR 범위 계산 (80-120% 범위)
  const expectedAPRMin = Math.round(effectiveAPR * 0.8);
  const expectedAPRMax = Math.round(effectiveAPR * 1.2);
  const expectedAPRStr = `${expectedAPRMin}-${expectedAPRMax}%`;

  const baseAPRMin = Math.round(baseAPR * 0.8);
  const baseAPRMax = Math.round(baseAPR * 1.2);
  const baseAPRStr = hasViralBoost ? `${baseAPRMin}-${baseAPRMax}%` : undefined;

  // Key factors
  const keyFactors = [
    `Volatility: ${metrics.combinedVolatility}/100`,
    `Volume trend: ${metrics.volumeTrend}`,
    `Market: ${metrics.marketCondition}`,
  ];

  if (hasViralBoost) {
    keyFactors.push(`🔥 Viral Boost: +${boostPercent}% LP earnings`);
  }

  // Detailed explanations based on strategy
  const binCount = maxBinId - minBinId + 1;
  const ilRisk = metrics.combinedVolatility > 60 ? 'high' : metrics.combinedVolatility > 30 ? 'medium' : 'low';

  console.log(`🔄 Fallback strategy: binCount=${binCount}, range=[${minBinId}, ${maxBinId}], activeId=${request.currentActiveId}`);

  return {
    recommendedPool: {
      pairAddress: bestPool?.pairAddress || '',
      binStep: bestPool?.binStep || 10,
      reasoning: hasViralBoost
        ? 'Selected pool with optimal TVL and viral boost consideration'
        : 'Selected pool with highest TVL for better liquidity depth',
      protocolSharePct: bestPool?.parameters?.protocolSharePct || 50,
    },
    strategy: {
      minBinId,
      maxBinId,
      binCount,
      distributionShape: shape,
    },
    riskAssessment: {
      expectedAPR: expectedAPRStr,
      baseAPR: baseAPRStr,
      viralBoostAPR: undefined, // Deprecated - do not use
      impermanentLossRisk: ilRisk,
      rebalanceFrequency: metrics.combinedVolatility > 60 ? 'daily' : metrics.combinedVolatility > 30 ? 'weekly' : 'rarely',
      viralBoostActive: hasViralBoost,
    },
    analysis: {
      marketCondition: metrics.marketCondition,
      keyFactors,
      reasoning: hasViralBoost
        ? `Fallback strategy with viral boost. ${
            metrics.viralMetrics.tokenXRank ? `Token X Rank #${metrics.viralMetrics.tokenXRank}` : ''
          } ${metrics.viralMetrics.tokenYRank ? `Token Y Rank #${metrics.viralMetrics.tokenYRank}` : ''}. Social momentum: ${
            metrics.viralMetrics.socialMomentum
          }.`
        : 'Fallback strategy generated based on calculated metrics. AI service temporarily unavailable.',
      viralAnalysis: hasViralBoost
        ? `Viral boost active with ${boostPercent}% extra earnings. Social momentum: ${metrics.viralMetrics.socialMomentum}`
        : undefined,
      socialSentiment:
        metrics.viralMetrics.socialMomentum === 'rising'
          ? 'bullish'
          : metrics.viralMetrics.socialMomentum === 'declining'
          ? 'bearish'
          : 'neutral',
    },
    detailedExplanation: {
      poolSelectionReason: hasViralBoost
        ? `This pool has $${Math.round(bestPool?.tvlUSD || 0).toLocaleString()} TVL and benefits from viral boost (protocol share ${
            bestPool?.parameters?.protocolSharePct || 50
          }% instead of default 50%).`
        : `Selected the pool with highest TVL ($${Math.round(
            bestPool?.tvlUSD || 0
          ).toLocaleString()}) for better trade execution and lower slippage.`,
      binRangeReason: `With volatility at ${metrics.combinedVolatility}/100 and ${
        request.riskProfile
      } profile, a ${binCount}-bin range (±${binRange} from current price) balances fee capture with IL protection. ${
        request.riskProfile === 'aggressive'
          ? 'Aggressive profile means tighter range for higher fee concentration.'
          : request.riskProfile === 'defensive'
          ? 'Defensive profile means wider range for safety against price swings.'
          : 'Auto profile adapts to current market conditions.'
      }`,
      shapeReason:
        shape === 'CURVE'
          ? 'CURVE shape concentrates liquidity around current price for maximum fee capture, ideal for aggressive strategies or stable markets.'
          : shape === 'SPOT'
          ? 'SPOT shape distributes liquidity evenly across all bins, providing balanced exposure and IL protection.'
          : 'BID_ASK shape splits liquidity above/below price, good for capturing trades in trending markets.',
      riskRewardTradeoff: `This ${request.riskProfile} strategy ${
        binCount < 35
          ? 'prioritizes higher fee capture with a concentrated position. Risk: larger IL if price moves significantly outside range.'
          : binCount > 50
          ? 'prioritizes safety with a wider position. Trade-off: lower fee capture but better IL protection.'
          : 'balances fee capture and IL protection with a moderate position.'
      }`,
      viralBoostImpact: hasViralBoost
        ? `🔥 VIRAL BOOST: This token is ranked in the top 3 viral tokens! Protocol fee is reduced from 50% to ${
            100 - (hasViralBoost ? 50 + boostPercent / 2 : 50)
          }%, meaning you keep ${
            50 + boostPercent / 2
          }% of swap fees instead of 50%. This translates to +${boostPercent}% extra yield on your LP position.`
        : undefined,
      rebalanceScenarios: [
        `Price moves more than ${Math.round(binRange * 0.8)} bins from current position`,
        `7-day volatility changes significantly (currently ${metrics.combinedVolatility}/100)`,
        hasViralBoost ? 'Token drops out of top 3 viral rankings (viral boost ends)' : 'Market structure changes significantly',
      ],
      warnings: [
        ilRisk === 'high' ? '⚠️ HIGH IL RISK: This token pair is very volatile. Consider smaller position size.' : '',
        metrics.volumeTrend === 'decreasing' ? '📉 Volume is declining - fee generation may be lower than historical averages.' : '',
        hasViralBoost && metrics.viralMetrics.socialMomentum === 'declining'
          ? '📉 Social momentum declining - viral boost period may end soon.'
          : '',
        'Meme tokens carry inherent volatility risk. Never invest more than you can afford to lose.',
      ].filter(Boolean),
      tldr: hasViralBoost
        ? `${
            request.riskProfile.charAt(0).toUpperCase() + request.riskProfile.slice(1)
          } ${binCount}-bin ${shape} position with +${boostPercent}% viral yield boost. ${ilRisk === 'high' ? 'High IL risk.' : ''}`
        : `${
            request.riskProfile.charAt(0).toUpperCase() + request.riskProfile.slice(1)
          } ${binCount}-bin ${shape} position targeting ${Math.round(baseAPR)}% APR. ${ilRisk === 'high' ? 'Watch for IL.' : ''}`,
    },
  };
}

/**
 * 메인 AI 전략 생성 함수
 */
export async function generateAIStrategy(request: DLMMSuggestionRequest, metrics: CalculatedMetrics): Promise<AIStrategyRecommendation> {
  // 전략 힌트 생성
  const hints = generateStrategyHints(metrics, request.riskProfile);

  // AI 입력 포맷팅
  const userMessage = formatAIInput(request, metrics, hints);

  // Log viral status for debugging
  if (metrics.viralMetrics.hasViralBoost) {
    console.log(
      `[AI Strategy] Viral boost active! X:${metrics.viralMetrics.tokenXRank || 'N/A'} Y:${
        metrics.viralMetrics.tokenYRank || 'N/A'
      } Boost:${metrics.viralMetrics.viralBoostMultiplier}x`
    );
  }

  try {
    // Claude 호출
    const aiResponse = await callClaude(SYSTEM_PROMPT, userMessage);

    // 응답 파싱 (metrics 전달하여 viral 정보 활용)
    return parseAIResponse(aiResponse, request, metrics);
  } catch (error) {
    console.error('AI Strategy generation failed:', error);
    // Fallback 전략 반환
    return generateFallbackStrategy(request, metrics);
  }
}
