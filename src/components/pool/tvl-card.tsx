import { formatUSDWithLocale } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { AreaChart, Area, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { useMemo, useState } from 'react';
import { useProtocolAnalytics } from '@/hooks/use-protocol-analytics';

type AnalyticsTooltipPayload = {
  date: string;
  volumeUSD?: number;
  totalValueLockedUSD?: number;
};

const CustomTvlTooltip = ({
  active,
  payload,
  isHourly,
}: {
  active?: boolean;
  payload?: { payload: AnalyticsTooltipPayload }[];
  isHourly?: boolean;
}) => {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const dateOptions: Intl.DateTimeFormatOptions = isHourly
      ? { month: 'short', day: 'numeric', hour: 'numeric' }
      : { month: 'short', day: 'numeric' };

    return (
      <div
        className="bg-figma-gray-bg p-3 border-2 border-white pointer-events-none"
        style={{
          zIndex: 1000,
          boxShadow: '2px 2px 0px 0px #000, inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa',
        }}
      >
        <div className="space-y-1">
          <p className="text-sm text-figma-text-dark">
            <span className="font-medium">{new Date(data.date).toLocaleDateString('en-US', dateOptions)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span>TVL:</span> <span className="font-medium">{formatUSDWithLocale(data.totalValueLockedUSD || 0, 0, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const periods = [7, 30, 90, 180];

export default function TvlCard() {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [selectedTVLPeriod, setSelectedTVLPeriod] = useState(30);
  const { data: tvlAnalytics, isLoading } = useProtocolAnalytics(selectedTVLPeriod);

  const isHourly = selectedTVLPeriod <= 7;

  const tvlData = useMemo(() => {
    if (!tvlAnalytics) return [];
    // 7일 이하일 때는 모든 데이터 사용 (이미 시간별로 필터링됨)
    // 7일 초과일 때는 마지막 N일만 사용
    return isHourly ? tvlAnalytics : tvlAnalytics.slice(-selectedTVLPeriod);
  }, [tvlAnalytics, selectedTVLPeriod, isHourly]);

  return (
    <div
      className="bg-figma-gray-table flex-1 h-[250px]"
      style={{
        boxShadow:
          'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
      }}
    >
      {/* Title Row */}
      <div className="px-4 pt-4 pb-2">
        <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px]">Total Value Locked</div>
      </div>

      {/* Value and Period Buttons Row */}
      <div className="flex justify-between items-center px-4 pb-3">
        <div className="font-roboto font-semibold text-figma-text-dark text-[18px] leading-[21px]">
          {formatUSDWithLocale(tvlData?.[tvlData.length - 1]?.totalValueLockedUSD || 0, 0, 0, numberLocale)}
        </div>
        <div className="flex items-center gap-1">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedTVLPeriod(period)}
              className={`
                px-3 py-1.5 font-roboto text-[13px] font-medium transition-all
                ${
                  selectedTVLPeriod === period
                    ? 'bg-figma-purple text-white'
                    : 'bg-figma-gray-bg text-figma-text-dark hover:bg-figma-gray-table'
                }
              `}
              style={{
                boxShadow:
                  selectedTVLPeriod === period
                    ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                    : 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
              }}
            >
              {period}D
            </button>
          ))}
        </div>
      </div>

      {/* Chart Container */}
      <div className="h-[150px] bg-white mx-4 mb-4" style={{ boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa' }}>
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-figma-purple"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={tvlData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="tvlGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#895bf5" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#895bf5" stopOpacity={0.05} />
                </linearGradient>
              </defs>
              <YAxis tick={false} tickLine={false} axisLine={false} width={0} />
              <Area type="monotone" dataKey="totalValueLockedUSD" stroke="#895bf5" strokeWidth={2} fill="url(#tvlGradient)" />
              <RechartsTooltip content={<CustomTvlTooltip isHourly={isHourly} />} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
