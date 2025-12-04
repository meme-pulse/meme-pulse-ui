'use client';

import { useState, useEffect } from 'react';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { useLeaderboard } from './hooks/use-leaderboard';
import { useEpochStatus, calculateTimeUntilNextUpdate } from './hooks/use-epoch-status';
import { formatNumber } from './lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { Info, Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';

type TimePeriod = '1h' | '1d' | '7d';

const TIME_PERIOD_LABELS: Record<TimePeriod, string> = {
  '1h': '1H',
  '1d': '24H',
  '7d': '7D',
};

function PulseScoreBar({ score }: { score: number }) {
  // Score is 0-100, gradient from orange to green
  const percentage = Math.min(100, Math.max(0, score));

  return (
    <div className="flex flex-col gap-1">
      <span className="text-[9px] text-figma-text-gray">
        Score: <span className="text-figma-text-dark font-semibold">{score}</span>
      </span>
      <div className="w-full h-[18px] bg-gray-200 relative overflow-hidden">
        <div
          className="h-full transition-all duration-500"
          style={{
            width: `${percentage}%`,
            background: `linear-gradient(90deg, #f97316 0%, #facc15 40%, #84cc16 70%, #22c55e 100%)`,
          }}
        />
        {/* Windows 95 style inset shadow */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
          }}
        />
      </div>
    </div>
  );
}

function RankDisplay({ rank }: { rank: number }) {
  if (rank === 1) {
    return (
      <div className="flex items-center justify-center">
        <img src="/leaderboard/crown-gold.png" alt="1st place" className="w-[37px] h-[29px] object-contain" />
      </div>
    );
  }
  if (rank === 2) {
    return (
      <div className="flex items-center justify-center">
        <img src="/leaderboard/crown-silver.png" alt="2nd place" className="w-[37px] h-[29px] object-contain" />
      </div>
    );
  }
  if (rank === 3) {
    return (
      <div className="flex items-center justify-center">
        <img src="/leaderboard/crown-bronze.png" alt="3rd place" className="w-[37px] h-[29px] object-contain" />
      </div>
    );
  }
  return <div className="flex items-center justify-center font-roboto text-[16px] text-figma-text-dark">{rank}</div>;
}

function BoostBadge({ rank }: { rank: number }) {
  if (rank > 3) return null;

  const boostPercentage = rank === 1 ? 80 : rank === 2 ? 60 : 20;

  return (
    <div className="flex items-center gap-1">
      <img src="/leaderboard/fire-icon.png" alt="boost" className="w-3 h-3 object-contain" />
      <span className="text-[9px] text-figma-text-gray">
        Boost: <span className="text-figma-text-dark font-semibold">+{boostPercentage}%</span>
      </span>
    </div>
  );
}

function TimePeriodSelector({ selected, onChange }: { selected: TimePeriod; onChange: (period: TimePeriod) => void }) {
  const periods: TimePeriod[] = ['1h', '1d', '7d'];

  return (
    <div className="flex items-center gap-1">
      {periods.map((period) => (
        <button
          key={period}
          onClick={() => onChange(period)}
          className={`
            px-3 py-1.5 font-roboto text-[13px] font-medium transition-all
            ${selected === period ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'}
          `}
          style={{
            boxShadow:
              selected === period
                ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                : 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
          }}
        >
          {TIME_PERIOD_LABELS[period]}
        </button>
      ))}
    </div>
  );
}

function EpochInfo() {
  const { data: epochStatus, isLoading } = useEpochStatus();
  const [timeUntilUpdate, setTimeUntilUpdate] = useState(calculateTimeUntilNextUpdate());

  // Update countdown every second
  useEffect(() => {
    const interval = setInterval(() => {
      setTimeUntilUpdate(calculateTimeUntilNextUpdate());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (isLoading || !epochStatus) {
    return null;
  }

  return (
    <div className="flex items-center gap-3 flex-wrap">
      {/* Current Epoch */}
      <div
        className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px]"
        style={{
          background: '#f0f0f0',
          border: '1px solid #808088',
          boxShadow: 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43',
        }}
      >
        <span className="font-roboto text-[11px] text-figma-text-gray">Epoch:</span>
        <span className="font-roboto text-[11px] text-figma-text-dark font-semibold">{epochStatus.currentEpoch}</span>
      </div>

      {/* Time Until Next Update */}
      <div
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[4px]"
        style={{
          background: '#f0f0f0',
          border: '1px solid #808088',
          boxShadow: 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43',
        }}
      >
        <Clock className="w-3 h-3 text-figma-text-gray" />
        <span className="font-roboto text-[11px] text-figma-text-gray">Next update:</span>
        <span className="text-[11px] text-figma-text-dark font-semibold font-mono">{timeUntilUpdate.formatted}</span>
      </div>

      {/* Last Submitted Epoch */}
      {epochStatus.lastEpoch !== '0' && (
        <div
          className="inline-flex items-center gap-2 px-2.5 py-1 rounded-[4px]"
          style={{
            background: '#f0f0f0',
            border: '1px solid #808088',
            boxShadow: 'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43',
          }}
        >
          <span className="font-roboto text-[11px] text-figma-text-gray">Last:</span>
          <span className="font-roboto text-[11px] text-figma-text-dark font-semibold">{epochStatus.lastEpoch}</span>
        </div>
      )}
    </div>
  );
}

function LeaderboardCard() {
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1d');

  return (
    <CardWithHeader title="Leaderboard" contentClassName="p-0">
      {/* Title and Description */}
      <div className="p-3 pb-0">
        <div className="flex items-start justify-between mb-2">
          <h2 className="font-roboto font-semibold text-figma-text-dark text-[24px] leading-[36px] tracking-[0.48px]">
            Virality Leaderboard
          </h2>
        </div>
        <div className="flex items-center justify-between mb-3">
          <p className="font-roboto text-figma-text-gray text-[14px] leading-normal">
            Track the most viral meme pools from MemeX. Higher virality earns boosted rewards for LPs.
          </p>
          {/* Time Period Selector */}
          <div className="flex items-center gap-2 ml-4">
            <span className="font-roboto text-[12px] text-figma-text-gray">Time:</span>
            <TimePeriodSelector selected={timePeriod} onChange={setTimePeriod} />
          </div>
        </div>
        {/* Epoch Info */}
        <div className="mb-4">
          <EpochInfo />
        </div>
      </div>

      {/* Leaderboard Table */}
      <LeaderboardTable timePeriod={timePeriod} />
    </CardWithHeader>
  );
}

function LeaderboardTable({ timePeriod }: { timePeriod: TimePeriod }) {
  const { data, isLoading, error } = useLeaderboard(20);
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);

  if (error) {
    return <div className="flex items-center justify-center h-[280px] text-red-500 font-roboto">Failed to load leaderboard data</div>;
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-[280px]">
        <div className="animate-pulse font-roboto text-figma-text-gray">Loading leaderboard...</div>
      </div>
    );
  }

  return (
    <div
      className="bg-figma-gray-table mx-3 mb-3"
      style={{
        boxShadow:
          'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #3d3d43, inset -2px -2px 0px 0px #e7e7eb, inset 2px 2px 0px 0px #808088',
        padding: '4px',
      }}
    >
      {/* Desktop Table */}
      <div className="hidden md:block overflow-x-auto max-h-[400px] overflow-y-auto">
        <table className="w-full" style={{ tableLayout: 'fixed' }}>
          <colgroup>
            <col style={{ width: '76px' }} />
            <col style={{ width: '20%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '15%' }} />
            <col style={{ width: '25%' }} />
          </colgroup>
          <thead className="sticky top-0 z-10">
            <tr className="font-roboto">
              <th
                className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                style={{
                  boxShadow:
                    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  paddingLeft: '8px',
                }}
              >
                <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Rank</span>
              </th>
              <th
                className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                style={{
                  boxShadow:
                    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  paddingLeft: '8px',
                }}
              >
                <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Token</span>
              </th>
              <th
                className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                style={{
                  boxShadow:
                    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  paddingLeft: '8px',
                }}
              >
                <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Posts</span>
              </th>
              <th
                className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                style={{
                  boxShadow:
                    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  paddingLeft: '8px',
                }}
              >
                <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Views</span>
              </th>
              <th
                className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                style={{
                  boxShadow:
                    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  paddingLeft: '8px',
                }}
              >
                <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Likes</span>
              </th>
              <th
                className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                style={{
                  boxShadow:
                    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                  paddingLeft: '6px',
                }}
              >
                <div className="absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center gap-1">
                  <span>Pulse Score</span>
                  <Tooltip delayDuration={0}>
                    <TooltipTrigger asChild>
                      <Info className="w-[14px] h-[14px] text-figma-text-gray cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom" className="max-w-[260px] p-3">
                      <p className="font-roboto text-[12px] leading-normal text-figma-text-dark">
                        Pulse Score combines recent{' '}
                        <span className="font-bold">posts, views, likes, reposts, replies and unique users</span> with stronger weight for
                        fresh activity and a bonus for image posts, bonded tokens and active price moves.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {data?.leaderboard.map((token, index) => (
              <tr key={token.tokenSymbol} className={`font-roboto ${index % 2 === 0 ? 'bg-figma-gray-light' : 'bg-white'}`}>
                <td className="h-[60px] text-center">
                  <RankDisplay rank={token.rank} />
                </td>
                <td className="h-[60px] pl-2">
                  <div className="flex items-center gap-2">
                    {token.imageSrc ? (
                      <img
                        src={token.imageSrc}
                        alt={token.tokenSymbol}
                        className="w-6 h-6 rounded-full object-cover"
                        onError={(e) => {
                          // Fallback to gradient if image fails to load
                          e.currentTarget.style.display = 'none';
                          e.currentTarget.nextElementSibling?.classList.remove('hidden');
                        }}
                      />
                    ) : null}
                    <div
                      className={`w-6 h-6 rounded-full bg-gradient-to-br from-figma-purple to-figma-purple-light flex items-center justify-center text-white text-[10px] font-bold ${
                        token.imageSrc ? 'hidden' : ''
                      }`}
                    >
                      {token.tokenSymbol.charAt(0)}
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[16px] text-figma-text-dark leading-tight">{token.tokenSymbol}</span>
                      {token.tokenName && <span className="text-[11px] text-figma-text-gray leading-tight">{token.tokenName}</span>}
                    </div>
                  </div>
                </td>
                <td className="h-[60px] pl-2 text-[16px] text-figma-text-dark">
                  {formatNumber(token.posts[timePeriod], 0, 0, numberLocale)}
                </td>
                <td className="h-[60px] pl-2 text-[16px] text-figma-text-dark">
                  {formatNumber(token.views[timePeriod], 0, 0, numberLocale)}
                </td>
                <td className="h-[60px] pl-2 text-[16px] text-figma-text-dark">
                  {formatNumber(token.likes[timePeriod], 0, 0, numberLocale)}
                </td>
                <td className="h-[60px] px-3">
                  <div className="flex flex-col gap-1">
                    <BoostBadge rank={token.rank} />
                    <PulseScoreBar score={token.pulseScore} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <div className="block md:hidden p-2 space-y-3 max-h-[500px] overflow-y-auto">
        {data?.leaderboard.map((token) => (
          <div
            key={token.tokenSymbol}
            className="bg-figma-gray-light"
            style={{
              boxShadow:
                'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
            }}
          >
            <div className="p-4">
              {/* Header with Rank and Token */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-shrink-0 w-10">
                  <RankDisplay rank={token.rank} />
                </div>
                <div className="flex items-center gap-2 flex-1">
                  {token.imageSrc ? (
                    <img
                      src={token.imageSrc}
                      alt={token.tokenSymbol}
                      className="w-8 h-8 rounded-full object-cover"
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                        e.currentTarget.nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  ) : null}
                  <div
                    className={`w-8 h-8 rounded-full bg-gradient-to-br from-figma-purple to-figma-purple-light flex items-center justify-center text-white text-[12px] font-bold ${
                      token.imageSrc ? 'hidden' : ''
                    }`}
                  >
                    {token.tokenSymbol.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <span className="font-roboto font-medium text-figma-text-dark">{token.tokenSymbol}</span>
                    {token.tokenName && <span className="font-roboto text-[11px] text-figma-text-gray">{token.tokenName}</span>}
                  </div>
                </div>
                <BoostBadge rank={token.rank} />
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-3 gap-2 mb-3 font-roboto">
                <div className="text-center">
                  <div className="text-[10px] text-figma-text-gray">Posts</div>
                  <div className="text-[14px] text-figma-text-dark font-medium">
                    {formatNumber(token.posts[timePeriod], 0, 0, numberLocale)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-figma-text-gray">Views</div>
                  <div className="text-[14px] text-figma-text-dark font-medium">
                    {formatNumber(token.views[timePeriod], 0, 0, numberLocale)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-[10px] text-figma-text-gray">Likes</div>
                  <div className="text-[14px] text-figma-text-dark font-medium">
                    {formatNumber(token.likes[timePeriod], 0, 0, numberLocale)}
                  </div>
                </div>
              </div>

              {/* Pulse Score Bar */}
              <div className="mt-2">
                <PulseScoreBar score={token.pulseScore} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function Leaderboard() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060208]">
      {/* Space Background with Stars - reused from Pool.tsx */}
      <div className="absolute inset-0 z-0 overflow-hidden">
        {/* Gradient overlay */}
        <div
          className="absolute inset-0"
          style={{
            background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #060208 50%, #060208 100%)',
          }}
        />
        {/* Stars layer 1 - small stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(1px 1px at 20px 30px, white, transparent),
              radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 50px 160px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 90px 40px, white, transparent),
              radial-gradient(1px 1px at 130px 80px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 160px 120px, white, transparent),
              radial-gradient(1px 1px at 200px 50px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 250px 180px, white, transparent),
              radial-gradient(1px 1px at 300px 90px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 350px 30px, white, transparent),
              radial-gradient(1px 1px at 400px 150px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 450px 60px, white, transparent),
              radial-gradient(1px 1px at 500px 200px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 550px 100px, white, transparent),
              radial-gradient(1px 1px at 600px 40px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 650px 170px, white, transparent),
              radial-gradient(1px 1px at 700px 80px, rgba(255,255,255,0.8), transparent),
              radial-gradient(1px 1px at 750px 130px, white, transparent),
              radial-gradient(1px 1px at 800px 20px, rgba(255,255,255,0.6), transparent),
              radial-gradient(1px 1px at 850px 190px, white, transparent),
              radial-gradient(1px 1px at 900px 70px, rgba(255,255,255,0.7), transparent),
              radial-gradient(1px 1px at 950px 140px, white, transparent),
              radial-gradient(1px 1px at 1000px 50px, rgba(255,255,255,0.5), transparent),
              radial-gradient(1px 1px at 1050px 110px, white, transparent),
              radial-gradient(1px 1px at 1100px 30px, rgba(255,255,255,0.8), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '1200px 250px',
          }}
        />
        {/* Stars layer 2 - medium stars */}
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `
              radial-gradient(2px 2px at 100px 50px, white, transparent),
              radial-gradient(2px 2px at 220px 150px, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 340px 80px, white, transparent),
              radial-gradient(2px 2px at 460px 200px, rgba(255,255,255,0.8), transparent),
              radial-gradient(2px 2px at 580px 30px, white, transparent),
              radial-gradient(2px 2px at 700px 170px, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 820px 100px, white, transparent),
              radial-gradient(2px 2px at 940px 220px, rgba(255,255,255,0.8), transparent),
              radial-gradient(2px 2px at 1060px 60px, white, transparent),
              radial-gradient(2px 2px at 180px 250px, rgba(255,255,255,0.7), transparent),
              radial-gradient(2px 2px at 400px 300px, white, transparent),
              radial-gradient(2px 2px at 620px 280px, rgba(255,255,255,0.9), transparent),
              radial-gradient(2px 2px at 840px 320px, white, transparent),
              radial-gradient(2px 2px at 1000px 290px, rgba(255,255,255,0.8), transparent)
            `,
            backgroundRepeat: 'repeat',
            backgroundSize: '1200px 400px',
          }}
        />
        {/* Purple glow accent */}
        <div
          className="absolute top-0 left-1/4 w-[600px] h-[400px] opacity-30"
          style={{
            background: 'radial-gradient(ellipse at center, rgba(137, 91, 245, 0.3) 0%, transparent 70%)',
          }}
        />
      </div>

      <main className="relative z-10 max-w-screen-2xl mx-auto px-2 sm:px-6 py-8">
        {/* Real-time Update Badge - matches Pool's AiModeSwitch structure */}
        <div className="mb-8 w-fit">
          <div
            className="inline-flex items-center gap-2 px-3 h-[29px] rounded-[6px]"
            style={{
              background: 'rgba(0,0,0,0.4)',
              border: '1px solid #ccff99',
            }}
          >
            <div className="w-[7px] h-[7px] rounded-full bg-[#39ff14] animate-pulse" />
            <span className="font-roboto text-[14px] text-[#39ff14]">REAL TIME UPDATE</span>
          </div>
        </div>

        {/* Header Section with Colosseum */}
        <PageHeader
          title="MEMEPULSE COLOSSEUM"
          description="Powered by MemeX. MemePulse tracks meme mentions, likes and interactions across the social feed to build a virality score and reward LPs in the most active communities."
          rightContent={
            <div className="hidden lg:block flex-shrink-0 ml-8">
              <img src="/leaderboard/colosseum.png" alt="Colosseum" className="w-[240px] xl:w-[320px] h-auto object-contain" />
            </div>
          }
        />

        {/* Leaderboard Card */}
        <LeaderboardCard />
      </main>
    </div>
  );
}
