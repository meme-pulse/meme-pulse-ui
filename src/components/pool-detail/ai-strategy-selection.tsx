import { useState } from 'react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import type { PoolData, AggregatedPoolData } from '@/AIPoolDetail';
import { formatUSDWithLocale } from '@/lib/format';

type RiskPreference = 'conservative' | 'aggressive' | 'auto';

interface AnalystCard {
  id: RiskPreference;
  name: string;
  title: string;
  description: string;
  icon: React.ReactNode;
}

interface AIStrategySelectionProps {
  poolData: PoolData;
  aggregatedData?: AggregatedPoolData;
  onGenerateStrategy: (riskPreference: RiskPreference) => void;
  isLoading?: boolean;
}

// Pixel art icons for each analyst
function DrSafuIcon() {
  return (
    <div className="w-[66px] h-[66px] relative">
      {/* Conservative analyst - shield-like character */}
      <svg viewBox="0 0 66 66" className="w-full h-full">
        {/* Face */}
        <rect x="20" y="12" width="26" height="28" fill="#ffbb86" />
        {/* Hair */}
        <rect x="20" y="8" width="26" height="8" fill="#000" />
        <rect x="16" y="12" width="4" height="12" fill="#000" />
        <rect x="46" y="12" width="4" height="12" fill="#000" />
        {/* Eyes */}
        <rect x="24" y="20" width="6" height="4" fill="#dceeff" />
        <rect x="36" y="20" width="6" height="4" fill="#dceeff" />
        <rect x="26" y="20" width="2" height="2" fill="#000" />
        <rect x="38" y="20" width="2" height="2" fill="#000" />
        {/* Body - green shirt */}
        <rect x="20" y="40" width="26" height="20" fill="#498529" />
        <rect x="16" y="44" width="4" height="12" fill="#498529" />
        <rect x="46" y="44" width="4" height="12" fill="#498529" />
        {/* Hands */}
        <rect x="12" y="48" width="4" height="8" fill="#ffbb86" />
        <rect x="50" y="48" width="4" height="8" fill="#ffbb86" />
      </svg>
    </div>
  );
}

function ProfPumpIcon() {
  return (
    <div className="w-[70px] h-[70px] relative">
      {/* Aggressive analyst - rocket character */}
      <svg viewBox="0 0 70 70" className="w-full h-full">
        {/* Face */}
        <rect x="17" y="13" width="36" height="32" fill="#ffbb86" />
        {/* Hair - wild */}
        <rect x="13" y="0" width="8" height="8" fill="#000" />
        <rect x="21" y="0" width="8" height="12" fill="#000" />
        <rect x="29" y="0" width="12" height="8" fill="#000" />
        <rect x="41" y="0" width="8" height="12" fill="#000" />
        <rect x="49" y="0" width="8" height="8" fill="#000" />
        <rect x="17" y="4" width="4" height="12" fill="#000" />
        <rect x="49" y="4" width="4" height="12" fill="#000" />
        {/* Eyes */}
        <rect x="22" y="17" width="10" height="10" fill="#dbeeff" />
        <rect x="38" y="17" width="10" height="10" fill="#dbeeff" />
        <rect x="26" y="21" width="4" height="4" fill="#000" />
        <rect x="42" y="21" width="4" height="4" fill="#000" />
        {/* Mouth */}
        <rect x="30" y="35" width="10" height="4" fill="#000" />
        {/* Body - pink shirt */}
        <rect x="17" y="45" width="36" height="20" fill="#ff8ddb" />
        <rect x="13" y="49" width="4" height="12" fill="#ff8ddb" />
        <rect x="53" y="49" width="4" height="12" fill="#ff8ddb" />
        {/* Hands */}
        <rect x="9" y="53" width="4" height="8" fill="#ffbb86" />
        <rect x="57" y="53" width="4" height="8" fill="#ffbb86" />
      </svg>
    </div>
  );
}

function AgentPulseIcon() {
  return (
    <div className="w-[70px] h-[70px] relative">
      {/* AI/Robot analyst */}
      <svg viewBox="0 0 70 70" className="w-full h-full">
        {/* Antenna */}
        <rect x="13" y="0" width="4" height="8" fill="#000" />
        <rect x="17" y="4" width="4" height="8" fill="#000" />
        <rect x="21" y="0" width="4" height="8" fill="#000" />
        <rect x="35" y="0" width="4" height="8" fill="#000" />
        <rect x="39" y="4" width="4" height="8" fill="#000" />
        <rect x="43" y="0" width="4" height="8" fill="#000" />
        <rect x="48" y="4" width="4" height="8" fill="#000" />
        {/* Head */}
        <rect x="17" y="12" width="36" height="32" fill="#f7f7f7" />
        <rect x="13" y="16" width="4" height="24" fill="#f7f7f7" />
        <rect x="53" y="16" width="4" height="24" fill="#f7f7f7" />
        {/* Eyes - screen like */}
        <rect x="21" y="20" width="12" height="12" fill="#000" />
        <rect x="37" y="20" width="12" height="12" fill="#000" />
        <rect x="25" y="24" width="4" height="4" fill="#f7f7f7" />
        <rect x="41" y="24" width="4" height="4" fill="#f7f7f7" />
        {/* Mouth - LED display */}
        <rect x="26" y="36" width="18" height="4" fill="#000" />
        {/* Body */}
        <rect x="17" y="44" width="36" height="22" fill="#f7f7f7" />
        <rect x="13" y="48" width="4" height="14" fill="#f7f7f7" />
        <rect x="53" y="48" width="4" height="14" fill="#f7f7f7" />
        {/* Border */}
        <rect x="17" y="44" width="36" height="2" fill="#000" />
        <rect x="61" y="30" width="4" height="8" fill="#000" />
        <rect x="65" y="35" width="4" height="12" fill="#000" />
      </svg>
    </div>
  );
}

const analysts: AnalystCard[] = [
  {
    id: 'conservative',
    name: 'Dr. Safu',
    title: 'Conservative Analyst',
    description: 'Specializes in stable, low-risk strategies. Focuses on established pools with proven track records.',
    icon: <DrSafuIcon />,
  },
  {
    id: 'aggressive',
    name: 'Prof. Pump',
    title: 'Aggressive Analyst',
    description: 'Hunts for high-yield opportunities. Embraces volatility for maximum potential returns.',
    icon: <ProfPumpIcon />,
  },
  {
    id: 'auto',
    name: 'Agent Pulse',
    title: 'Auto Analyst',
    description: 'Uses real-time on-chain data to dynamically adjust strategy based on market conditions.',
    icon: <AgentPulseIcon />,
  },
];

export function AIStrategySelection({ poolData, aggregatedData, onGenerateStrategy, isLoading = false }: AIStrategySelectionProps) {
  const [selectedAnalyst, setSelectedAnalyst] = useState<RiskPreference>('auto');

  const handleGenerateStrategy = () => {
    onGenerateStrategy(selectedAnalyst);
  };

  // Use aggregated data if available, otherwise fallback to single pool data
  const totalLiquidity = aggregatedData?.totalLiquidityUsd ?? poolData.liquidityUsd;
  const totalVolume = aggregatedData?.totalVolumeUsd ?? poolData.volumeUsd;
  const totalFees = aggregatedData?.totalFeesUsd ?? poolData.feesUsd;

  // Calculate APR based on aggregated or single pool data
  const estimatedAPR = totalFees > 0 && totalLiquidity > 0 ? (((totalFees * 365) / totalLiquidity) * 100).toFixed(1) : '24.5';

  return (
    <CardWithHeader title="AI Liquidity Management" contentClassName="p-0">
      <div className="space-y-0">
        {/* Pool Info Card */}
        <div
          className="bg-white mx-[10px] mt-[10px] p-4"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-tahoma text-[18px] font-bold text-[#1a1a1a]">
                {poolData.tokenX.symbol}-{poolData.tokenY.symbol} Pool
                {aggregatedData && aggregatedData.poolCount > 1 && (
                  <span className="ml-2 text-[12px] text-[#666666] font-normal">({aggregatedData.poolCount} pools)</span>
                )}
              </h2>
              <p className="text-[14px] text-[#666666] font-tahoma">Total Liquidity: {formatUSDWithLocale(totalLiquidity)}</p>
            </div>
            <div className="text-right">
              <p className="font-tahoma text-[24px] font-bold text-blue-600">{estimatedAPR}% APR</p>
              <p className="text-[14px] text-[#666666] font-tahoma">24h Volume: {formatUSDWithLocale(totalVolume)}</p>
            </div>
          </div>
          {aggregatedData && (
            <div className="mt-2 pt-2 border-t border-[#e0e0e0]">
              <p className="text-[12px] text-[#666666] font-tahoma">24h Fees: {formatUSDWithLocale(totalFees)}</p>
            </div>
          )}
        </div>

        {/* Analyst Selection Card */}
        <div
          className="bg-white mx-[10px] mt-[10px] p-4"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        >
          <h3 className="font-inter font-bold text-[15.6px] text-[#1a1a1a] mb-4">Choose Your Research Analyst</h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {analysts.map((analyst) => (
              <div
                key={analyst.id}
                onClick={() => setSelectedAnalyst(analyst.id)}
                className={`p-4 cursor-pointer transition-all ${
                  selectedAnalyst === analyst.id ? 'bg-[#dedede]' : 'bg-white hover:bg-[#f5f5f5]'
                }`}
                style={{
                  boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
                }}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="mb-3">{analyst.icon}</div>
                  <h4 className="font-tahoma font-bold text-[18px] text-[#1a1a1a]">{analyst.name}</h4>
                  <p className="text-[12px] text-[#666666] font-inter mb-2">{analyst.title}</p>
                  <p className="text-[14px] text-[#1a1a1a] font-inter leading-[20px]">{analyst.description}</p>
                  {selectedAnalyst === analyst.id && (
                    <div className="mt-3">
                      <span className="text-[10.3px] font-inter font-bold text-blue-600">✓ Selected</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Generate Strategy Button */}
        <div className="flex justify-end p-4">
          <button
            onClick={handleGenerateStrategy}
            disabled={isLoading}
            className="bg-figma-gray-table px-6 py-3 font-roboto text-[18px] text-[#121213] disabled:opacity-50 disabled:cursor-not-allowed"
            style={{
              boxShadow:
                'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
            }}
          >
            {isLoading ? 'Generating...' : 'Generate Strategy'}
          </button>
        </div>
      </div>
    </CardWithHeader>
  );
}

export type { RiskPreference };

