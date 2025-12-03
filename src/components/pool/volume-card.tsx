import { formatUSDWithLocale } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { BarChart, Bar, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, Cell } from 'recharts';
import { useMemo, useState } from 'react';
import { useProtocolAnalytics } from '@/hooks/use-protocol-analytics';

type AnalyticsTooltipPayload = {
  date: string;
  volumeUSD?: number;
  feesUSD?: number;
};

const CustomVolumeTooltip = ({
  active,
  payload,
  dataType,
  isHourly,
}: {
  active?: boolean;
  payload?: { payload: AnalyticsTooltipPayload }[];
  dataType: 'volume' | 'fee';
  isHourly?: boolean;
}) => {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = dataType === 'volume' ? data.volumeUSD : data.feesUSD;
    const label = dataType === 'volume' ? 'Volume' : 'Fee';
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
            <span>{label}:</span> <span className="font-medium">{formatUSDWithLocale(value || 0, 0, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const periods = [7, 30, 90, 180];

export default function VolumeCard() {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [selectedVolumePeriod, setSelectedVolumePeriod] = useState(30);
  const { data: volumeAnalytics, isLoading } = useProtocolAnalytics(selectedVolumePeriod);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dataType] = useState<'volume' | 'fee'>('volume');

  const isHourly = selectedVolumePeriod <= 7;

  const volumeData = useMemo(() => {
    if (!volumeAnalytics) return [];
    // 7일 이하일 때는 모든 데이터 사용 (이미 시간별로 필터링됨)
    // 7일 초과일 때는 마지막 N일만 사용
    return isHourly ? volumeAnalytics : volumeAnalytics.slice(-selectedVolumePeriod);
  }, [volumeAnalytics, selectedVolumePeriod, isHourly]);

  const totalValue = volumeData?.reduce((acc: number, curr: any) => {
    const value = dataType === 'volume' ? curr.volumeUSD : curr.feesUSD;
    return acc + (value || 0);
  }, 0) || 0;

  return (
    <div
      className="bg-figma-gray-table flex-1 h-[250px]"
      style={{
        boxShadow: 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
      }}
    >
      {/* Title Row */}
      <div className="px-4 pt-4 pb-2">
        <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px]">Volume</div>
      </div>
      
      {/* Value and Period Buttons Row */}
      <div className="flex justify-between items-center px-4 pb-3">
        <div className="font-roboto font-semibold text-figma-text-dark text-[18px] leading-[21px]">
          {formatUSDWithLocale(totalValue, 0, 0, numberLocale)}
        </div>
        <div className="flex items-center gap-1">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedVolumePeriod(period)}
              className={`
                px-3 py-1.5 font-roboto text-[13px] font-medium transition-all
                ${selectedVolumePeriod === period ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-figma-gray-table'}
              `}
              style={{
                boxShadow:
                  selectedVolumePeriod === period
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
      <div 
        className="h-[150px] bg-white mx-4 mb-4" 
        style={{ boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa' }}
      >
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-figma-purple"></div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={volumeData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
              <YAxis
                tick={false}
                tickLine={false}
                axisLine={false}
                width={0}
              />
              <RechartsTooltip content={<CustomVolumeTooltip dataType={dataType} isHourly={isHourly} />} cursor={false} />
              <Bar
                dataKey={dataType === 'volume' ? 'volumeUSD' : 'feesUSD'}
                fill="rgba(137, 91, 245, 0.6)"
                stroke="rgba(137, 91, 245, 0.6)"
                strokeWidth={1}
                radius={[2, 2, 0, 0]}
                onMouseEnter={(_, index) => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                {volumeData.map((_: any, index: number) => (
                  <Cell
                    key={`cell-${index}`}
                    fill={hoveredIndex === index ? '#895bf5' : 'rgba(137, 91, 245, 0.6)'}
                    stroke={hoveredIndex === index ? '#895bf5' : 'rgba(137, 91, 245, 0.6)'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}
