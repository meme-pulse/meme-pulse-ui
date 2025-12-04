// Vercel Serverless Function - DLMM AI Suggestion API
// 클라이언트에서 데이터를 받아 메트릭 계산 + AI 전략 생성

import type { VercelRequest, VercelResponse } from '@vercel/node';
import type { DLMMSuggestionRequest, DLMMSuggestionResponse } from './types.js';
import { calculateMetrics } from './metrics-calculator.js';
import { generateAIStrategy } from './ai-strategy.js';

export const config = {
  maxDuration: 30, // AI 호출 시간 고려
};

/**
 * 요청 데이터 검증
 */
function validateRequest(body: unknown): { valid: boolean; error?: string } {
  if (!body || typeof body !== 'object') {
    return { valid: false, error: 'Request body is required' };
  }

  const req = body as Partial<DLMMSuggestionRequest>;

  // 필수 필드 검증
  if (!req.tokenX?.address || !req.tokenY?.address) {
    return { valid: false, error: 'tokenX and tokenY with addresses are required' };
  }

  if (!req.riskProfile) {
    return { valid: false, error: 'riskProfile is required (aggressive | defensive | auto)' };
  }

  if (!['aggressive', 'defensive', 'auto'].includes(req.riskProfile)) {
    return { valid: false, error: 'Invalid riskProfile. Must be: aggressive, defensive, or auto' };
  }

  if (!req.availablePools || req.availablePools.length === 0) {
    return { valid: false, error: 'availablePools array is required with at least one pool' };
  }

  if (typeof req.currentActiveId !== 'number') {
    return { valid: false, error: 'currentActiveId is required' };
  }

  return { valid: true };
}

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  // GET - API 정보
  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'DLMM AI Suggestion API',
      version: '3.0.0',
      endpoint: '/api/dlmm-suggest',
      method: 'POST',
      description: 'Analyzes market data, viral scores, and generates optimal LP strategy recommendations with detailed explanations',
      requiredFields: {
        riskProfile: 'aggressive | defensive | auto',
        tokenX: '{ address, symbol, decimals, priceUSD? }',
        tokenY: '{ address, symbol, decimals, priceUSD? }',
        availablePools: 'Array of PoolInfo objects (with optional parameters)',
        currentActiveId: 'Current active bin ID',
      },
      optionalFields: {
        tokenXPriceHistory: 'Array of TokenPriceData (7 days OHLC)',
        tokenYPriceHistory: 'Array of TokenPriceData (7 days OHLC)',
        pairHistory: 'Array of PairHistoryData (7 days)',
        recentHourlyData: 'Array of hourly data (24h for fine-grained volatility)',
        binDistribution: 'Array of BinData (±50 bins from activeId)',
        tokenXViralData: 'ViralScoreData (pulseScore, viralRank, social metrics)',
        tokenYViralData: 'ViralScoreData (pulseScore, viralRank, social metrics)',
      },
      features: {
        viralBoost: 'Detects viral tokens and calculates yield boost (+20% to +80%)',
        detailedExplanations: 'Provides why explanations for each strategy decision',
        socialMomentum: 'Analyzes rising/declining social engagement',
        poolParameterAnalysis: 'Considers protocolShare and fee volatility',
      },
    });
  }

  // POST - AI 추천 생성
  if (req.method === 'POST') {
    const startTime = Date.now();

    try {
      // 요청 검증
      const validation = validateRequest(req.body);
      if (!validation.valid) {
        return res.status(400).json({
          success: false,
          error: validation.error,
        } as DLMMSuggestionResponse);
      }

      const request = req.body as DLMMSuggestionRequest;

      // 1. 메트릭 계산
      const calculatedMetrics = calculateMetrics(request);

      // Log viral status
      if (calculatedMetrics.viralMetrics.hasViralBoost) {
        const boost = Math.round((calculatedMetrics.viralMetrics.viralBoostMultiplier - 1) * 100);
        console.log(
          `🔥 VIRAL BOOST DETECTED: +${boost}% yield | X:${calculatedMetrics.viralMetrics.tokenXRank || 'N/A'} Y:${
            calculatedMetrics.viralMetrics.tokenYRank || 'N/A'
          }`
        );
      }

      // 2. AI 전략 생성
      const recommendation = await generateAIStrategy(request, calculatedMetrics);

      // 3. 응답 구성
      const response: DLMMSuggestionResponse = {
        success: true,
        data: {
          recommendation,
          calculatedMetrics,
          metadata: {
            tokenPair: `${request.tokenX.symbol}-${request.tokenY.symbol}`,
            riskProfile: request.riskProfile,
            timestamp: new Date().toISOString(),
            poolsAnalyzed: request.availablePools.length,
          },
        },
      };

      // Optimized: Extended caching (120초) for better cost efficiency
      res.setHeader('Cache-Control', 'public, s-maxage=120, stale-while-revalidate=600');

      console.log(`✅ DLMM Suggestion generated in ${Date.now() - startTime}ms`);
      console.log(
        `   Strategy: ${recommendation.strategy.binCount} bins | ${recommendation.strategy.distributionShape} | APR: ${recommendation.riskAssessment.expectedAPR}`
      );

      return res.json(response);
    } catch (error) {
      console.error('DLMM Suggestion API Error:', error);

      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      } as DLMMSuggestionResponse);
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
