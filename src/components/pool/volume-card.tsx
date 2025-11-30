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
}: {
  active?: boolean;
  payload?: { payload: AnalyticsTooltipPayload }[];
  dataType: 'volume' | 'fee';
}) => {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    const value = dataType === 'volume' ? data.volumeUSD : data.feesUSD;
    const label = dataType === 'volume' ? 'Volume' : 'Fee';

    return (
      <div className="bg-popover p-3 border border-border rounded-lg shadow-lg pointer-events-none" style={{ zIndex: 1000 }}>
        <div className="space-y-1">
          <p className="text-sm">
            <span className="font-medium">{new Date(data.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span>
          </p>
          <p className="text-sm">
            <span>{label}:</span> <span className="font-medium">{formatUSDWithLocale(value || 0, 0, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

const periods = [30, 90, 180];

export default function VolumeCard() {
  const { data: volumeAnalytics, isLoading } = useProtocolAnalytics();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [selectedVolumePeriod, setSelectedVolumePeriod] = useState(30);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [dataType] = useState<'volume' | 'fee'>('volume');

  const volumeData = useMemo(() => {
    if (!volumeAnalytics) return [];
    return volumeAnalytics.slice(-selectedVolumePeriod);
  }, [volumeAnalytics, selectedVolumePeriod]);

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
        <div className="font-roboto font-semibold text-[#030303] text-[18px] leading-[21px]">
          {formatUSDWithLocale(totalValue, 0, 0, numberLocale)}
        </div>
        <div className="flex gap-[8px]">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => setSelectedVolumePeriod(period)}
              className={`h-[20.8px] w-[48px] font-press-start text-[8px] leading-[12.8px] ${
                selectedVolumePeriod === period
                  ? 'bg-figma-purple text-[#f2f0ff]'
                  : 'text-zinc-900 hover:bg-zinc-300'
              }`}
              style={{ width: period === 180 ? '56px' : '48px' }}
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
              <RechartsTooltip content={<CustomVolumeTooltip dataType={dataType} />} cursor={false} />
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
