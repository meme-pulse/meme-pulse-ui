// Local Bun API Server for development
// Run with: bun run api/server.ts

const PORT = 3002;

const server = Bun.serve({
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
            message: 'DLMM Suggestion API is running (Bun local)',
            endpoint: '/api/dlmm-suggest',
            method: 'POST',
            example: {
              tokenX: '0x...',
              tokenY: '0x...',
              priceHistory: [],
              riskTolerance: 'conservative',
            },
          },
          { headers: corsHeaders }
        );
      }

      if (req.method === 'POST') {
        try {
          const body = await req.json();

          if (!body.tokenX || !body.tokenY) {
            return Response.json({ success: false, error: 'tokenX and tokenY are required' }, { status: 400, headers: corsHeaders });
          }

          const response = {
            success: true,
            data: {
              message: `API is working on Bun ${Bun.version}!`,
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

          return Response.json(response, {
            headers: {
              ...corsHeaders,
              'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300',
            },
          });
        } catch (error) {
          return Response.json(
            { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
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
