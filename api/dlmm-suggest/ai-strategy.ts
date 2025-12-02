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
const SYSTEM_PROMPT = `You are an expert DeFi liquidity analyst specializing in Liquidity Book (LB) DEX protocols.
Your task is to recommend optimal LP (Liquidity Provider) strategies based on market data and user preferences.

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

## Strategy Guidelines:
1. **High Volatility** → Wider range (more bins), larger binStep
2. **Low Volatility** → Tighter range (fewer bins), smaller binStep
3. **Trending Market** → Asymmetric range in trend direction
4. **Aggressive Profile** → Concentrated liquidity, accept IL risk for higher fees
5. **Defensive Profile** → Wide range, minimize IL risk

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
    estimatedAPR: metrics.feeAPRByPool[pool.pairAddress] || 0,
    lpCount: pool.lpCount,
  }));

  return `
## User Request
- Risk Profile: ${request.riskProfile}
- Token Pair: ${request.tokenX.symbol} / ${request.tokenY.symbol}

## Available Pools (same token pair, different binStep)
${JSON.stringify(poolSummary, null, 2)}

## Market Metrics (calculated from 7-day data)
- Combined Volatility Score: ${metrics.combinedVolatility}/100
- Token X Volatility: ${metrics.tokenXVolatility}/100
- Token Y Volatility: ${metrics.tokenYVolatility}/100
- Market Condition: ${metrics.marketCondition}
- 7-Day Price Change: ${metrics.priceChange7d}%
- Volume Trend: ${metrics.volumeTrend}
- Avg Daily Volume: $${metrics.avgDailyVolumeUSD.toLocaleString()}
- Avg Daily Fees: $${metrics.avgDailyFeesUSD.toLocaleString()}
- Volume/TVL Ratio: ${metrics.volumeToTvlRatio}
- Liquidity Concentration (±10 bins): ${metrics.liquidityConcentration}%
- Active Bins Count: ${metrics.activeBinsCount}

## Current Active Bin ID: ${request.currentActiveId}

## Strategy Hints
${hints.map((h) => `- ${h}`).join('\n')}

## Required Output Format
CRITICAL: Respond with ONLY valid JSON. No markdown, no code blocks, no explanations. Just the raw JSON object.

{
  "recommendedPool": {
    "pairAddress": "0x...",
    "binStep": number,
    "reasoning": "string explaining why this pool"
  },
  "strategy": {
    "minBinId": number (relative to activeId, e.g., activeId - 25),
    "maxBinId": number (relative to activeId, e.g., activeId + 25),
    "binCount": number (typically 21-69 for most strategies),
    "distributionShape": "SPOT" | "CURVE" | "BID_ASK"
  },
  "riskAssessment": {
    "expectedAPR": "string like '15-25%'",
    "impermanentLossRisk": "low" | "medium" | "high",
    "rebalanceFrequency": "hourly" | "daily" | "weekly" | "rarely"
  },
  "analysis": {
    "marketCondition": "brief market assessment",
    "keyFactors": ["factor1", "factor2", "factor3"],
    "reasoning": "detailed explanation of the recommendation"
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
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2048,
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
function parseAIResponse(responseText: string, request: DLMMSuggestionRequest): AIStrategyRecommendation {
  let parsed: AIStrategyRecommendation;

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

  // Validation and defaults
  const result: AIStrategyRecommendation = {
    recommendedPool: {
      pairAddress: parsed.recommendedPool?.pairAddress || defaultPool?.pairAddress || '',
      binStep: parsed.recommendedPool?.binStep || defaultPool?.binStep || 10,
      reasoning: parsed.recommendedPool?.reasoning || 'Selected based on highest TVL',
    },
    strategy: {
      minBinId: parsed.strategy?.minBinId || request.currentActiveId - 25,
      maxBinId: parsed.strategy?.maxBinId || request.currentActiveId + 25,
      binCount: parsed.strategy?.binCount || 51,
      distributionShape: validateDistributionShape(parsed.strategy?.distributionShape),
    },
    riskAssessment: {
      expectedAPR: parsed.riskAssessment?.expectedAPR || '10-20%',
      impermanentLossRisk: validateILRisk(parsed.riskAssessment?.impermanentLossRisk),
      rebalanceFrequency: validateRebalanceFreq(parsed.riskAssessment?.rebalanceFrequency),
    },
    analysis: {
      marketCondition: parsed.analysis?.marketCondition || 'Market analysis unavailable',
      keyFactors: parsed.analysis?.keyFactors || ['Data insufficient'],
      reasoning: parsed.analysis?.reasoning || 'AI analysis completed with limited data',
    },
  };

  // binCount 계산 보정
  result.strategy.binCount = result.strategy.maxBinId - result.strategy.minBinId + 1;

  return result;
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
  // 최고 TVL 풀 선택
  const bestPool = request.availablePools.reduce((best, pool) => (pool.tvlUSD > best.tvlUSD ? pool : best), request.availablePools[0]);

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
  }

  const minBinId = request.currentActiveId - binRange;
  const maxBinId = request.currentActiveId + binRange;

  return {
    recommendedPool: {
      pairAddress: bestPool?.pairAddress || '',
      binStep: bestPool?.binStep || 10,
      reasoning: 'Selected pool with highest TVL for better liquidity depth',
    },
    strategy: {
      minBinId,
      maxBinId,
      binCount: maxBinId - minBinId + 1,
      distributionShape: shape,
    },
    riskAssessment: {
      expectedAPR: `${Math.round((metrics.feeAPRByPool[bestPool?.pairAddress || ''] || 15) * 0.8)}-${Math.round(
        (metrics.feeAPRByPool[bestPool?.pairAddress || ''] || 15) * 1.2
      )}%`,
      impermanentLossRisk: metrics.combinedVolatility > 60 ? 'high' : metrics.combinedVolatility > 30 ? 'medium' : 'low',
      rebalanceFrequency: metrics.combinedVolatility > 60 ? 'daily' : metrics.combinedVolatility > 30 ? 'weekly' : 'rarely',
    },
    analysis: {
      marketCondition: metrics.marketCondition,
      keyFactors: [
        `Volatility: ${metrics.combinedVolatility}/100`,
        `Volume trend: ${metrics.volumeTrend}`,
        `Market: ${metrics.marketCondition}`,
      ],
      reasoning: 'Fallback strategy generated based on calculated metrics. AI service temporarily unavailable.',
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

  try {
    // Claude 호출
    const aiResponse = await callClaude(SYSTEM_PROMPT, userMessage);

    // 응답 파싱
    return parseAIResponse(aiResponse, request);
  } catch (error) {
    console.error('AI Strategy generation failed:', error);
    // Fallback 전략 반환
    return generateFallbackStrategy(request, metrics);
  }
}
