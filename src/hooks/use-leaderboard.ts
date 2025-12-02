import { useQuery } from '@tanstack/react-query';

const LEADERBOARD_API_URL = 'https://viral-score-server-production.up.railway.app/api/score/tokens/leaderboard';

interface LeaderboardToken {
  rank: number;
  tokenSymbol: string;
  tokenName: string;
  imageSrc: string;
  posts: {
    '1h': number;
    '1d': number;
    '7d': number;
  };
  views: {
    '1h': number;
    '1d': number;
    '7d': number;
  };
  likes: {
    '1h': number;
    '1d': number;
    '7d': number;
  };
  pulseScore: number;
}

interface LeaderboardResponse {
  count: number;
  updatedAt: string;
  imageCacheUpdatedAt: string;
  leaderboard: LeaderboardToken[];
}

async function fetchLeaderboard(limit: number = 20): Promise<LeaderboardResponse> {
  const response = await fetch(`${LEADERBOARD_API_URL}?limit=${limit}`);

  if (!response.ok) {
    throw new Error('Failed to fetch leaderboard data');
  }

  return response.json();
}

export function useLeaderboard(limit: number = 20) {
  return useQuery({
    queryKey: ['leaderboard', limit],
    queryFn: () => fetchLeaderboard(limit),
    refetchInterval: 10000, // Refresh every 10 seconds as per API spec
    staleTime: 5000, // Consider data stale after 5 seconds
  });
}

export type { LeaderboardToken, LeaderboardResponse };
