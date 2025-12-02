// Local Bun API Server for development
// Run with: bun run api/server.ts

import type { DLMMSuggestionRequest, DLMMSuggestionResponse } from './dlmm-suggest/types';
import { calculateMetrics } from './dlmm-suggest/metrics-calculator';
import { generateAIStrategy } from './dlmm-suggest/ai-strategy';

const PORT = 3002;

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

Bun.serve({
  port: PORT,
  async fetch(req: Request) {
    const url = new URL(req.url);

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle preflight
    if (req.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // Route: /api/dlmm-suggest
    if (url.pathname === '/api/dlmm-suggest') {
      if (req.method === 'GET') {
        return Response.json(
          {
            success: true,
            message: 'DLMM AI Suggestion API (Bun local)',
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
          },
          { headers: corsHeaders }
        );
      }

      if (req.method === 'POST') {
        const startTime = Date.now();

        try {
          const body = await req.json();

          // 요청 검증
          const validation = validateRequest(body);
          if (!validation.valid) {
            return Response.json(
              {
                success: false,
                error: validation.error,
              } as DLMMSuggestionResponse,
              { status: 400, headers: corsHeaders }
            );
          }

          const request = body as DLMMSuggestionRequest;

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

          console.log(`DLMM Suggestion generated in ${Date.now() - startTime}ms`);

          return Response.json(response, {
            headers: {
              ...corsHeaders,
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
          });
        } catch (error) {
          console.error('DLMM Suggestion API Error:', error);

          return Response.json(
            {
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error occurred',
            } as DLMMSuggestionResponse,
            { status: 500, headers: corsHeaders }
          );
        }
      }

      return Response.json({ error: 'Method not allowed' }, { status: 405, headers: corsHeaders });
    }

    return new Response('Not found', { status: 404 });
  },
});

console.log(`🐰 Bun API server running at http://localhost:${PORT}`);
console.log(`   - GET  /api/dlmm-suggest`);
console.log(`   - POST /api/dlmm-suggest`);
