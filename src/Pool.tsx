'use client';

import { useMemo, useState } from 'react';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { CardWithHeader } from '@/components/ui/card-with-header';

import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { mockUserPoolList } from './mock/api-data';
import VolumeCard from './components/pool/volume-card';
import { useTokenList } from './hooks/use-token-list';
import { useAccount } from 'wagmi';
import { usePopulatedBinsReservesMultiple } from './hooks/use-depth-reserves';
import TokenTicker from './components/token-ticker';
import { useGroupedPools } from './hooks/use-grouped-pools';
import { formatNumber, formatUSDWithLocale } from './lib/format';
import { useLocalStorage } from 'usehooks-ts';
import TvlCard from './components/pool/tvl-card';
import { GroupPoolRow } from './components/pool/group-pool-row';
import { AiModeSwitch } from './components/pool/ai-mode-switch';
import { useAiMode } from './hooks/use-ai-mode';
import { TypingAnimation } from './components/magicui/typing-animation';
import { motion, AnimatePresence } from 'motion/react';
import { Plus } from 'lucide-react';

export interface PoolRowProps {
  pairAddress: string;
  chain: string;
  status: string;
  name: string;
  version: string;
  tokenX: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  tokenY: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  reserveX: number;
  reserveY: number;
  lbBinStep: number;
  lbBaseFeePct: number;
  lbMaxFeePct: number;
  activeBinId: number;
  liquidityUsd: number;
  liquidityNative: string;
  liquidityDepthMinus: number;
  liquidityDepthPlus: number;
  liquidityDepthTokenX: number;
  liquidityDepthTokenY: number;
  volumeUsd: number;
  volumeNative: string;
  feesUsd: number;
  feesNative: string;
  protocolSharePct: number;
  apr: number;
}

export interface GroupPoolRowProps {
  apr: number;
  name: string;
  tokenX: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  tokenY: {
    address: string;
    name: string;
    symbol: string;
    decimals: number;
    priceUsd: number;
    priceNative: string;
  };
  totalVolume24h: number;
  totalLiquidityUsd: number;
  totalFees24h: number;
  groups: {
    activeBinId: number;
    pairAddress: string;
    reserveX: number;
    reserveY: number;
    lbBinStep: number;
    lbBaseFeePct: number;
    lbMaxFeePct: number;
    liquidityUsd: number;
    volumeUsd: number;
    volume24h: number;
    feesUsd: number;
    fees24h: number;
    protocolSharePct: number;
    apr: number;
  }[];
}

function CampaignTooltip() {
  return (
    <div className="bg-green-dark-950 text-green-dark-100 rounded-lg shadow-lg p-3 w-72 -top-2 left-full ml-2 z-50 border border-green-dark-800">
      <div className="text-sm leading-relaxed">
        {/* Liquidity Providers will accrue 30x Powder per day for liquidity within 20% of the active price as a part of H's Methamorphosis */}
        {/* SZN3 campaign. */}
      </div>
    </div>
  );
}

export function PoolRow({
  // pairAddress,
  // chain,
  name,
  // version,
  tokenX,
  tokenY,
  // reserveX,
  // reserveY,
  lbBinStep,
  lbBaseFeePct,
  // lbMaxFeePct,
  // activeBinId,
  liquidityUsd,
  // liquidityNative,
  // liquidityDepthMinus,
  // liquidityDepthPlus,
  volumeUsd,
  // volumeNative,
  feesUsd,
  // feesNative,
  // protocolSharePct,
  apr,
}: PoolRowProps) {
  const navigate = useNavigate();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [isRewardsTooltipOpen] = useState(false);
  const [isCampaignTooltipOpen] = useState(false);

  const { data: tokenList } = useTokenList();

  return (
    <tr
      className="hover:bg-muted/50 transition-colors cursor-pointer"
      onClick={() => navigate(`/pool/v22/${tokenX.address}/${tokenY.address}/${lbBinStep}`)}
    >
      <td className="py-4">
        <div className="flex items-center space-x-3">
          <div className="flex items-center -space-x-2">
            <TokenTicker
              logoURI={tokenList?.find((token) => token.address.toLowerCase() === tokenX.address.toLowerCase())?.logoURI}
              symbol={tokenX.symbol}
              className="w-8 h-8 rounded-full bg-green-dark-600"
            />
            <TokenTicker
              logoURI={tokenList?.find((token) => token.address.toLowerCase() === tokenY.address.toLowerCase())?.logoURI}
              symbol={tokenY.symbol}
              className="w-8 h-8 rounded-full bg-green-dark-600"
            />
          </div>
          <div className="flex items-center space-x-2">
            <span className="font-medium text-text-primary">{name}</span>
            <div className="flex items-center space-x-2">
              <span className="text-text-secondary px-2 py-1 rounded">
                <span className="text-body-md">Bin Step</span> <span className="ml-1 text-text-primary">{lbBinStep}</span>
              </span>
              <span className="text-text-secondary px-2 py-1 rounded">
                <span className="text-body-md">Fee</span>{' '}
                <span className="ml-1 text-text-primary">{formatNumber(lbBaseFeePct, 4, 0, numberLocale)} %</span>
              </span>
            </div>
            {isRewardsTooltipOpen && (
              <Tooltip delayDuration={0} disableHoverableContent>
                <TooltipTrigger asChild>
                  <span className="bg-green-dark-800 text-green-dark-300 text-xs font-medium px-2 py-1 rounded-full cursor-help">
                    REWARDS
                  </span>
                </TooltipTrigger>
                <TooltipContent asChild></TooltipContent>
              </Tooltip>
            )}
            {isCampaignTooltipOpen && (
              <Tooltip delayDuration={0} disableHoverableContent>
                <TooltipTrigger asChild>
                  <div className="w-5 h-5 bg-green-dark-500 rounded-full flex items-center justify-center cursor-help">
                    <span className="text-green-dark-950 text-xs">!</span>
                  </div>
                </TooltipTrigger>
                <TooltipContent asChild>
                  <CampaignTooltip />
                </TooltipContent>
              </Tooltip>
            )}
          </div>
        </div>
      </td>
      <td className="py-4 text-right font-medium text-text-primary">{formatUSDWithLocale(volumeUsd, 0, 0, numberLocale)}</td>
      <td className="py-4 text-right font-medium text-text-primary">{formatUSDWithLocale(liquidityUsd, 0, 0, numberLocale)}</td>
      <td className="py-4 text-right font-medium text-text-primary">{formatUSDWithLocale(feesUsd, 2, 0, numberLocale)}</td>
      {/* +- 2% liquidity and fee, deduct protocol share */}
      <td className="py-4 text-right font-medium "> {formatNumber(apr, 2, 0, numberLocale)} %</td>
    </tr>
  );
}

export default function Component() {
  const navigate = useNavigate();
  const [aiMode] = useAiMode();

  const { data: groupedPools } = useGroupedPools();
  const { data: populatedBinsReserves } = usePopulatedBinsReservesMultiple(
    groupedPools
      ?.map((grouped) => grouped.groups)
      .flat()
      .map((pool) => ({ poolAddress: pool.pairAddress, activeId: pool.activeBinId, binStep: pool.lbBinStep })) || []
  );

  const poolList = useMemo(() => {
    return groupedPools
      ?.map((grouped) => {
        return {
          ...grouped,
          tokenX: {
            ...grouped.tokenX,
            priceNative: '0',
          },
          tokenY: {
            ...grouped.tokenY,
            priceNative: '0',
          },
          groups: grouped.groups.map((pool) => {
            const reserveXSumInBigInt = populatedBinsReserves?.find((p) => p?.poolAddress === pool.pairAddress)?.reserveXSum || BigInt(0);
            const reserveYSumInBigInt = populatedBinsReserves?.find((p) => p?.poolAddress === pool.pairAddress)?.reserveYSum || BigInt(0);
            const reserveXSumUSD = reserveXSumInBigInt
              ? (Number(reserveXSumInBigInt) / 10 ** grouped.tokenX.decimals) * grouped.tokenX.priceUsd
              : 0;
            const reserveYSumUSD = reserveYSumInBigInt
              ? (Number(reserveYSumInBigInt) / 10 ** grouped.tokenY.decimals) * grouped.tokenY.priceUsd
              : 0;
            let apr = ((pool.feesUsd * 365 * (100 - pool.protocolSharePct)) / 100 / (reserveXSumUSD + reserveYSumUSD)) * 100;
            if (isNaN(apr)) apr = 0;
            if (apr === Infinity) apr = 0;
            return {
              ...pool,
              apr,
            };
          }),
        };
      })
      .map((group) => {
        return {
          ...group,
          // highest , ignore infinity
          apr: group.groups.reduce((acc, curr) => (acc.apr > curr.apr ? acc : curr)).apr,
        };
      });
  }, [groupedPools, populatedBinsReserves]);

  const { address } = useAccount();
  const { data: userPoolList } = useQuery({
    queryKey: ['userPoolList', address],
    queryFn: () => mockUserPoolList(address || ''),
    enabled: !!address,
  });

  const [sortOption, setSortOption] = useState<
    'volumeDesc' | 'volumeAsc' | 'liquidityDesc' | 'liquidityAsc' | 'feesDesc' | 'feesAsc' | 'aprDesc' | 'aprAsc'
  >('liquidityDesc');

  usePopulatedBinsReservesMultiple(
    userPoolList?.map((pool) => ({ poolAddress: pool.pairAddress, activeId: pool.activeBinId, binStep: pool.lbBinStep })) || []
  );

  const filteredPoolList = useMemo(() => {
    return poolList;
  }, [poolList]);

  return (
    <div className="min-h-screen relative overflow-hidden bg-[#060208]">
      {/* Space Background with Stars */}
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
        {/* AI Mode Switch */}
        <div className="mb-8 w-fit">
          <AiModeSwitch />
        </div>

        {/* Header Section */}
        <div className="mb-8">
          <div className="min-h-[42px] flex items-start justify-between">
            <div className="flex items-center gap-4">
              <TypingAnimation
                as="h1"
                className="text-white text-[42px] leading-[15.668px] tracking-[-1.68px] mb-0"
                style={{ fontFamily: '"Press Start 2P", cursive' }}
                duration={50}
                key={aiMode ? 'ai-mode-title' : 'normal-mode-title'}
              >
                {aiMode ? 'MEMEPULSE AI DLMM' : 'MEMEPULSE DLMM'}
              </TypingAnimation>
              {/* Ant Animation - Title Right */}
              <div className="flex-shrink-0 opacity-80">
                <img src="/animations/ants/ant-animation-1.gif" alt="Ant animation" className="w-16 h-16 object-contain" />
              </div>
            </div>
          </div>
          <div className="min-h-[48px] mt-[38px]">
            <AnimatePresence mode="wait">
              <motion.p
                key={aiMode ? 'ai-desc' : 'normal-desc'}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="font-roboto text-zinc-400 text-[16px] leading-normal max-w-[854px]"
              >
                {aiMode
                  ? 'AI analyzes market conditions, volatility, and pool dynamics to recommend optimized DLMM presets. Get AI-powered liquidity strategies tailored to current market conditions.'
                  : 'Explore and manage DLMM pools. Select pools to add liquidity and earn fees from trading activity.'}
              </motion.p>
            </AnimatePresence>
          </div>
        </div>
        {/* Analytics Container */}
        <CardWithHeader title="MemePulse Analytics" className="mb-8">
          {/* Cards Container */}
          <div
            className="grid grid-cols-1 lg:grid-cols-2"
            style={{
              padding: '24px 16px 25px 16px',
              gap: '10px',
            }}
          >
            <TvlCard />
            <VolumeCard />
          </div>
        </CardWithHeader>

        {/* Pool Management */}
        <CardWithHeader title="Pools" contentClassName="p-3">
          {/* Title and Description */}
          <div className="mb-[28px]">
            <div className="flex items-start justify-between mb-2">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={aiMode ? 'ai-title' : 'normal-title'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-roboto font-semibold text-figma-text-dark text-[24px] leading-[36px] tracking-[0.48px]"
                >
                  {aiMode ? 'AI DLMM Pools' : 'DLMM Pools'}
                </motion.h2>
              </AnimatePresence>
              <button
                onClick={() => navigate('/pool/v22/create')}
                className="px-4 py-2 bg-figma-purple text-white font-roboto text-[13px] flex items-center gap-2 hover:bg-figma-purple/90 transition-all"
                style={{
                  boxShadow: 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa',
                }}
              >
                <Plus className="w-4 h-4" />
                Create Pool
              </button>
            </div>
            <div className="min-h-[40px]">
              <AnimatePresence mode="wait">
                <motion.p
                  key={aiMode ? 'ai-pools-desc' : 'normal-pools-desc'}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.3 }}
                  className="font-roboto text-figma-text-gray text-[14px] leading-normal"
                >
                  {aiMode
                    ? 'AI analyzes market conditions and recommends optimized DLMM presets. Select an AI-recommended pool to deploy liquidity with optimal strategies.'
                    : 'Choose pools to add liquidity and earn trading fees. Click on a pool to view details and manage your positions.'}
                </motion.p>
              </AnimatePresence>
            </div>
          </div>

          {/* Table Container */}
          <div
            className="bg-figma-gray-table mx-2"
            style={{
              boxShadow:
                'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #3d3d43, inset -2px -2px 0px 0px #e7e7eb, inset 2px 2px 0px 0px #808088',
              padding: '4px',
            }}
          >
            <div className="overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '20%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '10%' }} />
                </colgroup>
                <thead>
                  <tr className="font-roboto">
                    <th
                      className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                      style={{
                        boxShadow:
                          'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                        paddingLeft: '8px',
                        paddingTop: '18px',
                        paddingBottom: '18px',
                      }}
                    >
                      <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Pools</span>
                    </th>
                    <th
                      className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                      style={{
                        boxShadow:
                          'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                        paddingLeft: '8px',
                        paddingTop: '18px',
                        paddingBottom: '18px',
                      }}
                    >
                      <div
                        className="absolute left-[8px] top-1/2 -translate-y-1/2 flex items-center gap-1 cursor-pointer"
                        onClick={() => setSortOption(sortOption === 'liquidityDesc' ? 'liquidityAsc' : 'liquidityDesc')}
                      >
                        <span>Liquidity</span>
                        <img src="/information.svg" alt="info" className="size-[14px]" style={{ marginLeft: '51px' }} />
                      </div>
                    </th>
                    <th
                      className="h-[36px] text-left font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                      style={{
                        boxShadow:
                          'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                        paddingLeft: '6px',
                        paddingTop: '18px',
                        paddingBottom: '18px',
                      }}
                    >
                      <div
                        className="absolute left-[6px] top-1/2 -translate-y-1/2 flex items-center gap-1 cursor-pointer"
                        onClick={() => setSortOption(sortOption === 'volumeDesc' ? 'volumeAsc' : 'volumeDesc')}
                      >
                        <span>Volume</span>
                        <img src="/information.svg" alt="info" className="size-[14px]" style={{ marginLeft: '51px' }} />
                      </div>
                    </th>
                    <th
                      className="h-[36px] text-center font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                      style={{
                        boxShadow:
                          'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                        paddingTop: '18px',
                        paddingBottom: '18px',
                      }}
                    >
                      <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">Max APR</span>
                    </th>
                    <th
                      className="h-[36px] text-center font-normal text-black text-[16px] leading-[19px] bg-figma-gray-table relative"
                      style={{
                        boxShadow:
                          'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                        paddingTop: '18px',
                        paddingBottom: '18px',
                      }}
                    >
                      <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">Fees (24H)</span>
                    </th>
                    <th
                      className="h-[36px] bg-figma-gray-table"
                      style={{
                        boxShadow:
                          'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                      }}
                    ></th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPoolList
                    ?.sort((a, b) => {
                      if (sortOption === 'volumeDesc') return b.totalVolume24h - a.totalVolume24h;
                      if (sortOption === 'volumeAsc') return a.totalVolume24h - b.totalVolume24h;
                      if (sortOption === 'liquidityDesc') return b.totalLiquidityUsd - a.totalLiquidityUsd;
                      if (sortOption === 'liquidityAsc') return a.totalLiquidityUsd - b.totalLiquidityUsd;
                      if (sortOption === 'feesDesc') return b.totalFees24h - a.totalFees24h;
                      if (sortOption === 'feesAsc') return a.totalFees24h - b.totalFees24h;
                      if (sortOption === 'aprDesc') return b.apr - a.apr;
                      if (sortOption === 'aprAsc') return a.apr - b.apr;
                      return 0;
                    })
                    .map((pool) => (
                      <GroupPoolRow key={pool.name} {...pool} aiMode={aiMode} />
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </CardWithHeader>
      </main>
    </div>
  );
}
