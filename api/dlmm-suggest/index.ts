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
      version: '2.0.0',
      endpoint: '/api/dlmm-suggest',
      method: 'POST',
      description: 'Analyzes market data and generates optimal LP strategy recommendations',
      requiredFields: {
        riskProfile: 'aggressive | defensive | auto',
        tokenX: '{ address, symbol, decimals }',
        tokenY: '{ address, symbol, decimals }',
        availablePools: 'Array of PoolInfo objects',
        currentActiveId: 'Current active bin ID',
      },
      optionalFields: {
        tokenXPriceHistory: 'Array of TokenPriceData (7 days)',
        tokenYPriceHistory: 'Array of TokenPriceData (7 days)',
        pairHistory: 'Array of PairHistoryData (7 days)',
        binDistribution: 'Array of BinData (±50 bins from activeId)',
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

      // 캐싱 (60초)
      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');

      console.log(`DLMM Suggestion generated in ${Date.now() - startTime}ms`);

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
