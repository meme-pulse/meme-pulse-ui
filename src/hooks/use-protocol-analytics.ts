import { useQuery } from '@tanstack/react-query';
import { getDexAnalytics, getDexHourlyAnalytics } from '@/lib/hasura-client';

export const useProtocolAnalytics = (period?: number) => {
  // period가 없으면 기본값 180일 사용 (하위 호환성)
  const days = period || 180;
  const startTime = Math.floor(Date.now() / 1000) - days * 24 * 60 * 60;
  
  // 7일 이하일 때는 시간별 데이터 사용
  const useHourly = period !== undefined && period <= 7;
  
  return useQuery({
    queryKey: ['analytics', period, useHourly ? 'hourly' : 'daily'],
    queryFn: () => {
      if (useHourly) {
        return getDexHourlyAnalytics(startTime);
      } else {
        return getDexAnalytics(startTime, days);
      }
    },
    staleTime: 1000 * 60,
  });
};
