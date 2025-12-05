import { useQuery } from '@tanstack/react-query';

const EPOCH_STATUS_API_URL = 'https://viral-score-server-production.up.railway.app/api/score/epoch/status';

export interface EpochStatus {
  ready: boolean;
  signerAddress: string | null;
  currentEpoch: string;
  lastEpoch: string;
  canSubmit: boolean;
  activePairs: number;
}

async function fetchEpochStatus(): Promise<EpochStatus> {
  const response = await fetch(EPOCH_STATUS_API_URL);

  if (!response.ok) {
    throw new Error('Failed to fetch epoch status');
  }

  return response.json();
}

/**
 * Calculate time until next epoch update (next hour :00)
 */
export function calculateTimeUntilNextUpdate(): { minutes: number; seconds: number; formatted: string } {
  const now = new Date();
  const nextHour = new Date(now);
  nextHour.setHours(now.getHours() + 1, 0, 0, 0); // Next hour at :00

  const diffMs = nextHour.getTime() - now.getTime();
  const totalSeconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  // Format: "45m 30s" or "30s" if less than 1 minute
  const formatted = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`;

  return { minutes, seconds, formatted };
}

export function useEpochStatus() {
  return useQuery({
    queryKey: ['epoch-status'],
    queryFn: fetchEpochStatus,
    refetchInterval: 1000, // Update every second for countdown
    staleTime: 0, // Always consider stale to get fresh data
  });
}




