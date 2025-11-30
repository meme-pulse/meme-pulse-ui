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

const CustomTvlTooltip = ({ active, payload }: { active?: boolean; payload?: { payload: AnalyticsTooltipPayload }[] }) => {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div className="bg-popover p-3 border border-border rounded-lg shadow-lg pointer-events-none" style={{ zIndex: 1000 }}>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-medium">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </p>
          <p className="text-sm">
            <span>TVL:</span> <span className="font-medium">{formatUSDWithLocale(data.totalValueLockedUSD || 0, 0, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const periods = [30, 90, 180];

export default function TvlCard() {
  const { data: tvlAnalytics, isLoading } = useProtocolAnalytics();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [selectedTVLPeriod, setSelectedTVLPeriod] = useState(30);

  const tvlData = useMemo(() => {
    if (!tvlAnalytics) return [];
    return tvlAnalytics.slice(-selectedTVLPeriod);
  }, [tvlAnalytics, selectedTVLPeriod]);

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
        <div className="font-roboto font-semibold text-[#030303] text-[18px] leading-[21px]">
          {formatUSDWithLocale(tvlData?.[tvlData.length - 1]?.totalValueLockedUSD || 0, 0, 0, numberLocale)}
        </div>
        <div className="flex gap-[8px]">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedTVLPeriod(period)}
              className={`h-[20.8px] w-[48px] font-press-start text-[8px] leading-[12.8px] ${
                selectedTVLPeriod === period ? 'bg-figma-purple text-[#f2f0ff]' : 'text-zinc-900 hover:bg-zinc-300'
              }`}
              style={{ width: period === 180 ? '56px' : '48px' }}
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
              <RechartsTooltip content={<CustomTvlTooltip />} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
