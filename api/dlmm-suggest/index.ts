// Vercel Serverless Function - DLMM Suggestion API
import type { VercelRequest, VercelResponse } from '@vercel/node';

export const config = {
  maxDuration: 30,
};

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method === 'GET') {
    return res.json({
      success: true,
      message: 'DLMM Suggestion API is running',
      endpoint: '/api/dlmm-suggest',
      method: 'POST',
      example: {
        tokenX: '0x...',
        tokenY: '0x...',
        priceHistory: [],
        riskTolerance: 'conservative',
      },
    });
  }

  if (req.method === 'POST') {
    try {
      const body = req.body;

      // 간단한 검증
      if (!body.tokenX || !body.tokenY) {
        return res.status(400).json({ success: false, error: 'tokenX and tokenY are required' });
      }

      // 테스트 응답
      const response = {
        success: true,
        data: {
          message: 'API is working on Vercel Serverless!',
          received: {
            tokenX: body.tokenX,
            tokenY: body.tokenY,
            riskTolerance: body.riskTolerance || 'not provided',
            timestamp: new Date().toISOString(),
          },
          test: {
            recommendedPool: {
              pairAddress: '0x0000000000000000000000000000000000000000',
              lbBinStep: 1,
              activeBinId: 8388608,
              score: 85,
              reasoning: 'This is a test response',
            },
            dlmmSuggestion: {
              minBinId: 8388600,
              maxBinId: 8388616,
              binCount: 17,
              distributionShape: 'SPOT',
              reasoning: 'Test suggestion',
            },
          },
        },
      };

      res.setHeader('Cache-Control', 'public, s-maxage=60, stale-while-revalidate=300');
      return res.json(response);
    } catch (error) {
      console.error('API Error:', error);
      return res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
