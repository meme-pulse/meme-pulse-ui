import { ChevronDown, ChevronRight, ChevronUp, Search, HelpCircle, ExternalLink } from 'lucide-react';
import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { DEFAULT_CHAINID } from './constants';
import { getPortfolio } from './lib/hasura-client';
import { useTokenPrices } from './hooks/use-token-price';
import TokenTicker from './components/token-ticker';
import { useTokenList } from './hooks/use-token-list';
import { useNavigate } from 'react-router-dom';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { useLocalStorage } from 'usehooks-ts';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import { customReadClient } from './main';
import { LIQUIDITY_HELPER_V2_ADDRESS, LiquidityHelperV2ABI } from './lib/sdk';
import { PageHeader } from '@/components/ui/page-header';
import { CardWithHeader } from './components/ui/card-with-header';
import { motion, AnimatePresence } from 'motion/react';
import { PositionExpandableContent } from './components/portfolio/position-expandable-content';

const Portfolio = () => {
  const { address } = useAccount();
  const { data: tokenList } = useTokenList();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const navigate = useNavigate();
  const { data: userPortfolioData } = useQuery({
    queryKey: ['user-portfolio-data', address],
    queryFn: () => {
      return getPortfolio(address || '');
    },
    enabled: !!address,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'outOfRange'>('all');
  const [sortOption, setSortOption] = useState<
    'depositDesc' | 'depositAsc' | 'feeDesc' | 'feeAsc' | 'activeLiquidityDesc' | 'activeLiquidityAsc' | 'fee/tvlDesc' | 'fee/tvlAsc'
  >('depositDesc');
  const [expandedPoolId, setExpandedPoolId] = useState<string | null>(null);

  const { data: tokenPrices } = useTokenPrices({ addresses: [] });
  const { data: allBinLiquidityAmounts } = useQuery({
    queryKey: ['allBinLiquidityAmounts', userPortfolioData?.userAllPools?.length],
    queryFn: () => {
      if (!userPortfolioData?.userAllPools || userPortfolioData.userAllPools.length === 0) {
        return Promise.resolve([]);
      }
      return customReadClient.multicall({
        contracts: userPortfolioData.userAllPools.map((pool: any) => ({
          address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
          abi: LiquidityHelperV2ABI,
          functionName: 'getAmountsOf',
          args: [pool.lbPairId as `0x${string}`, address as `0x${string}`, pool.userBinLiquidities],
        })),
      });
    },
    enabled: !!userPortfolioData?.userAllPools && userPortfolioData.userAllPools.length > 0,
    refetchInterval: 10000,
  });

  const userPortfolioDataWithLiquidityAmounts = useMemo(() => {
    return userPortfolioData?.userAllPools?.map((pool: any, poolIdx: number) => {
      const liquidityData = allBinLiquidityAmounts?.[poolIdx]?.result;
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const totalTokenXAmount = liquidityData?.[0]?.reduce((acc: any, liquidity: any) => acc + Number(liquidity), 0);
      // eslint-disable-next-line @typescript-eslint/ban-ts-comment
      // @ts-ignore
      const totalTokenYAmount = liquidityData?.[1]?.reduce((acc: any, liquidity: any) => acc + Number(liquidity), 0);

      const totalTokenX = Number(totalTokenXAmount) / 10 ** pool.tokenXDecimals;
      const totalTokenY = Number(totalTokenYAmount) / 10 ** pool.tokenYDecimals;

      const tokenXPrice = Number(tokenPrices?.find((token) => token.tokenAddress === pool.tokenXId)?.priceUsd ?? 0);
      const tokenYPrice = Number(tokenPrices?.find((token) => token.tokenAddress === pool.tokenYId)?.priceUsd ?? 0);
      const totalTokenXPrice = totalTokenX * tokenXPrice;
      const totalTokenYPrice = totalTokenY * tokenYPrice;
      const totalLiquidityUsd = totalTokenXPrice + totalTokenYPrice;

      let inRangeTokenXAmount = 0;
      let inRangeTokenYAmount = 0;
      let inRangeTokenXPrice = 0;
      let inRangeTokenYPrice = 0;
      let inRangeLiquidityUsd = 0;
      const isInRange = pool.userBinLiquidities.includes(Number(pool.activeId));

      if (isInRange) {
        const activeBinIndex = pool.userBinLiquidities.indexOf(Number(pool.activeId));
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const activeBinLiquidityX = allBinLiquidityAmounts?.[poolIdx]?.result?.[0]?.[activeBinIndex];
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        const activeBinLiquidityY = allBinLiquidityAmounts?.[poolIdx]?.result?.[1]?.[activeBinIndex];
        inRangeTokenXAmount = Number(activeBinLiquidityX) / 10 ** pool.tokenXDecimals;
        inRangeTokenYAmount = Number(activeBinLiquidityY) / 10 ** pool.tokenYDecimals;
        inRangeTokenXPrice = inRangeTokenXAmount * tokenXPrice;
        inRangeTokenYPrice = inRangeTokenYAmount * tokenYPrice;
        inRangeLiquidityUsd = inRangeTokenXPrice + inRangeTokenYPrice;
      }

      const lbPairFeeData = userPortfolioData?.feesEarned?.find((fee: any) => fee.lbPairId === pool.lbPairId);
      // Hasura에서 반환하는 fee 값은 이미 decimals가 적용된 형태임
      const totalTokenXFee = Number(lbPairFeeData?.totalAccruedFeesX);
      const totalTokenYFee = Number(lbPairFeeData?.totalAccruedFeesY);
      const totalTokenXFeePrice = totalTokenXFee * tokenXPrice;
      const totalTokenYFeePrice = totalTokenYFee * tokenYPrice;
      const totalFeesUsd = totalTokenXFeePrice + totalTokenYFeePrice;

      return {
        ...pool,
        isInRange,
        totalTokenXAmount: isNaN(totalTokenXAmount) ? 0 : totalTokenXAmount,
        totalTokenYAmount: isNaN(totalTokenYAmount) ? 0 : totalTokenYAmount,
        totalTokenXPrice: isNaN(totalTokenXPrice) ? 0 : totalTokenXPrice,
        totalTokenYPrice: isNaN(totalTokenYPrice) ? 0 : totalTokenYPrice,
        totalLiquidityUsd: isNaN(totalLiquidityUsd) ? 0 : totalLiquidityUsd,
        inRangeTokenXAmount: isNaN(inRangeTokenXAmount) ? 0 : inRangeTokenXAmount,
        inRangeTokenYAmount: isNaN(inRangeTokenYAmount) ? 0 : inRangeTokenYAmount,
        inRangeTokenXPrice: isNaN(inRangeTokenXPrice) ? 0 : inRangeTokenXPrice,
        inRangeTokenYPrice: isNaN(inRangeTokenYPrice) ? 0 : inRangeTokenYPrice,
        inRangeLiquidityUsd: isNaN(inRangeLiquidityUsd) ? 0 : inRangeLiquidityUsd,
        totalFeesUsd: isNaN(totalFeesUsd) ? 0 : totalFeesUsd,
        feesInLiquidityUsd: isNaN(totalFeesUsd / totalLiquidityUsd) ? 0 : totalFeesUsd / totalLiquidityUsd,
      };
    });
  }, [userPortfolioData, allBinLiquidityAmounts, tokenPrices]);

  const filteredUserPortfolioDataWithLiquidityAmounts = useMemo(() => {
    return userPortfolioDataWithLiquidityAmounts
      ?.filter((pool: any) => {
        if (activeTab === 'all') {
          return true;
        }
        if (activeTab === 'active') {
          return pool.isInRange;
        }
        if (activeTab === 'outOfRange') {
          return !pool.isInRange;
        }
      })
      .filter((pool: any) => {
        return (
          pool.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pool.tokenXId.toLowerCase().includes(searchTerm.toLowerCase()) ||
          pool.tokenYId.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
  }, [userPortfolioDataWithLiquidityAmounts, searchTerm, activeTab]);

  const totalPortfolioValue = useMemo(() => {
    try {
      const total = userPortfolioDataWithLiquidityAmounts?.reduce((acc: any, pool: any) => acc + pool.totalLiquidityUsd, 0);
      if (!total || isNaN(total)) {
        return 0;
      }
      return total;
    } catch (error) {
      console.error(error);
      return 0;
    }
  }, [userPortfolioDataWithLiquidityAmounts]);

  const totalFeesEarned = useMemo(() => {
    try {
      const total = userPortfolioDataWithLiquidityAmounts?.reduce((acc: any, pool: any) => acc + pool.totalFeesUsd, 0);
      if (!total || isNaN(total)) {
        return 0;
      }
      return total;
    } catch (error) {
      console.error(error);
      return 0;
    }
  }, [userPortfolioDataWithLiquidityAmounts]);

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
        {/* Spacer to match Pool/Leaderboard header alignment */}
        <div className="mb-8 w-fit">
          <div className="h-[29px]" />
        </div>

        {/* Page Header with Pixel Font */}
        <PageHeader
          title="MY PORTFOLIO"
          description="Manage your liquidity positions in one place. Track your deposits, fees earned, and liquidity efficiency across all pools."
          icon={<img src="/animations/ants/ant-animation-1.gif" alt="Ant animation" className="w-12 h-12 sm:w-16 sm:h-16 object-contain" />}
        />

        {/* Stats Cards - Retro Windows 95 Style */}
        <CardWithHeader title="Portfolio Overview" className="mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 p-4">
            {/* Total Portfolio Value Card */}
            <div
              className="bg-figma-gray-bg p-4"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-roboto text-figma-text-gray text-sm">Total Portfolio Value</div>
                  <div className="font-roboto text-figma-text-dark text-2xl font-bold mt-2">
                    {formatUSDWithLocale(totalPortfolioValue, 2, 0, numberLocale)}
                  </div>
                </div>
                <div className="p-3">
                  <img src="/portfolio/portfolio_tvl.svg" alt="portfolio icon" className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Total Fees Earned Card */}
            <div
              className="bg-figma-gray-bg p-4"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-roboto text-figma-text-gray text-sm">Total Fees Earned</div>
                  <div className="font-roboto text-green-600 text-2xl font-bold mt-2">
                    {formatUSDWithLocale(totalFeesEarned, 2, 0, numberLocale)}
                  </div>
                </div>
                <div className="p-3">
                  <img src="/portfolio/portfolio_fee.svg" alt="portfolio icon" className="w-8 h-8" />
                </div>
              </div>
            </div>

            {/* Total Positions Card */}
            <div
              className="bg-figma-gray-bg p-4"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
              }}
            >
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-roboto text-figma-text-gray text-sm">Total Positions</div>
                  <div className="font-roboto text-figma-text-dark text-2xl font-bold mt-2">
                    {userPortfolioData?.userAllPools?.length || 0}
                  </div>
                </div>
                <div className="p-3">
                  <img src="/portfolio/portfolio_position.svg" alt="portfolio icon" className="w-8 h-8" />
                </div>
              </div>
            </div>
          </div>
        </CardWithHeader>

        {/* Positions Table - Retro Style */}
        <CardWithHeader title="My Positions" contentClassName="p-3">
          {/* Title and Filter Controls */}
          <div className="mb-[28px]">
            <div className="flex items-start justify-between mb-2">
              <h2 className="font-roboto font-semibold text-figma-text-dark text-[24px] leading-[36px] tracking-[0.48px]">
                Liquidity Positions
              </h2>
            </div>
            <p className="font-roboto text-figma-text-gray text-[14px] leading-normal">
              View and manage your active liquidity positions across all pools.
            </p>
          </div>

          {/* Controls Row */}
          <div className="flex flex-col gap-4 sm:flex-row justify-between items-center mb-4">
            {/* Tabs */}
            <div
              className="flex items-center bg-figma-gray-bg p-1"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
              }}
            >
              <button
                className={`font-roboto text-sm px-4 py-2 transition-all ${
                  activeTab === 'all' ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'
                }`}
                style={{
                  boxShadow:
                    activeTab === 'all'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
                }}
                onClick={() => setActiveTab('all')}
              >
                All Positions
              </button>
              <button
                className={`font-roboto text-sm px-4 py-2 transition-all ${
                  activeTab === 'active' ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'
                }`}
                style={{
                  boxShadow:
                    activeTab === 'active'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
                }}
                onClick={() => setActiveTab('active')}
              >
                Active
              </button>
              <button
                className={`font-roboto text-sm px-4 py-2 transition-all ${
                  activeTab === 'outOfRange' ? 'bg-figma-purple text-white' : 'bg-figma-gray-bg text-figma-text-dark hover:bg-gray-300'
                }`}
                style={{
                  boxShadow:
                    activeTab === 'outOfRange'
                      ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                      : 'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc',
                }}
                onClick={() => setActiveTab('outOfRange')}
              >
                Out of Range
              </button>
            </div>

            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-figma-text-gray" />
              <input
                type="text"
                placeholder="Search by name, symbol or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-72 h-10 bg-white font-roboto text-figma-text-dark placeholder:text-figma-text-gray text-sm"
                style={{
                  boxShadow:
                    'inset -1px -1px 0px 0px #fcfcfc, inset 1px 1px 0px 0px #828282, inset -2px -2px 0px 0px #e8e8e8, inset 2px 2px 0px 0px #9c9c9c',
                }}
              />
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
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" style={{ tableLayout: 'fixed' }}>
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '18%' }} />
                  <col style={{ width: '17%' }} />
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
                      <span className="absolute left-[8px] top-1/2 -translate-y-1/2">Pool Name</span>
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
                      <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">Status</span>
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
                        onClick={() => setSortOption(sortOption === 'depositDesc' ? 'depositAsc' : 'depositDesc')}
                      >
                        <span>Your Deposits</span>
                        {sortOption === 'depositAsc' ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : sortOption === 'depositDesc' ? (
                          <ChevronDown className="w-4 h-4" />
                        ) : null}
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
                      <span className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2">Fees Earned</span>
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
                      <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center gap-1">
                        <span>Efficiency</span>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-4 h-4 text-figma-text-gray cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs">
                            <div className="text-sm text-figma-text-dark">
                              <p className="font-semibold mb-2">Liquidity Efficiency</p>
                              <p className="mb-2">Shows how much of your deposited liquidity is actively earning fees.</p>
                              <p className="text-xs text-figma-text-gray">Formula: (Active Liquidity / Total Deposits) x 100%</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
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
                  {filteredUserPortfolioDataWithLiquidityAmounts
                    ?.sort((a: any, b: any) => {
                      if (sortOption === 'depositDesc') return b.totalLiquidityUsd - a.totalLiquidityUsd;
                      if (sortOption === 'depositAsc') return a.totalLiquidityUsd - b.totalLiquidityUsd;
                      if (sortOption === 'activeLiquidityDesc') return b.inRangeLiquidityUsd - a.inRangeLiquidityUsd;
                      if (sortOption === 'activeLiquidityAsc') return a.inRangeLiquidityUsd - b.inRangeLiquidityUsd;
                      return 0;
                    })
                    .map((pool: any, idx: number) => {
                      const isExpanded = expandedPoolId === pool.lbPairId;
                      return (
                        <>
                          <tr
                            key={idx}
                            className={`bg-white hover:bg-figma-purple/10 transition-colors cursor-pointer font-roboto ${
                              isExpanded ? 'bg-figma-purple/5' : ''
                            }`}
                            onClick={() => {
                              setExpandedPoolId(isExpanded ? null : pool.lbPairId);
                            }}
                            style={{
                              boxShadow:
                                'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
                            }}
                          >
                            <td className="py-4 px-2">
                              <div className="flex items-center space-x-3">
                                <div className="flex items-center -space-x-2">
                                  <TokenTicker
                                    logoURI={
                                      tokenList?.find((token) => token.address.toLowerCase() === pool.tokenXId.toLowerCase())?.logoURI
                                    }
                                    symbol={pool.tokenXId}
                                    className="w-8 h-8 rounded-full bg-gray-200"
                                  />
                                  <TokenTicker
                                    logoURI={
                                      tokenList?.find((token) => token.address.toLowerCase() === pool.tokenYId.toLowerCase())?.logoURI
                                    }
                                    symbol={pool.tokenYId}
                                    className="w-8 h-8 rounded-full bg-gray-200"
                                  />
                                </div>
                                <div className="flex flex-col">
                                  <span className="font-medium text-figma-text-dark">
                                    {pool.name.split('-')[0] + '-' + pool.name.split('-')[1]}
                                  </span>
                                  <div className="flex items-center space-x-2 text-xs text-figma-text-gray">
                                    <span>Bin Step {pool.binStep}</span>
                                    <span>|</span>
                                    <span>Fee {formatNumber(Number(pool.baseFeePct), 4, 0, numberLocale)}%</span>
                                  </div>
                                </div>
                              </div>
                            </td>
                            <td className="py-4 text-center">
                              {pool.isInRange ? (
                                <motion.span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 border-2"
                                  style={{
                                    background: '#4ade80',
                                    borderColor: '#22c55e',
                                    color: '#030303',
                                    boxShadow:
                                      'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0',
                                    fontFamily: '"Press Start 2P", cursive',
                                  }}
                                  animate={{
                                    boxShadow: [
                                      'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0',
                                      'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0, 0 0 8px #4ade8080',
                                      'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0',
                                    ],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                >
                                  <motion.div
                                    className="w-2 h-2 bg-[#030303]"
                                    style={{
                                      boxShadow: 'inset -1px -1px 0px 0px #16a34a, inset 1px 1px 0px 0px #86efac',
                                    }}
                                    animate={{
                                      scale: [1, 1.2, 1],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                    }}
                                  />
                                  <span className="text-[8px] font-bold leading-tight whitespace-nowrap">IN RANGE</span>
                                </motion.span>
                              ) : (
                                <motion.span
                                  className="inline-flex items-center gap-1 px-2 py-0.5 border-2"
                                  style={{
                                    background: '#f59e0b',
                                    borderColor: '#d97706',
                                    color: '#030303',
                                    boxShadow:
                                      'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d',
                                    fontFamily: '"Press Start 2P", cursive',
                                  }}
                                  animate={{
                                    boxShadow: [
                                      'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d',
                                      'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d, 0 0 8px #f59e0b80',
                                      'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d',
                                    ],
                                  }}
                                  transition={{
                                    duration: 2,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                >
                                  <motion.div
                                    className="w-2 h-2 bg-[#030303]"
                                    style={{
                                      boxShadow: 'inset -1px -1px 0px 0px #b45309, inset 1px 1px 0px 0px #fbbf24',
                                    }}
                                    animate={{
                                      scale: [1, 1.2, 1],
                                    }}
                                    transition={{
                                      duration: 1.5,
                                      repeat: Infinity,
                                      ease: 'easeInOut',
                                    }}
                                  />
                                  <span className="text-[8px] font-bold leading-tight whitespace-nowrap">OUT OF RANGE</span>
                                </motion.span>
                              )}
                            </td>
                            <td className="py-4 px-2 font-medium text-figma-text-dark">
                              {formatUSDWithLocale(pool.totalLiquidityUsd, 0, 0, numberLocale)}
                            </td>
                            <td className="py-4 text-center font-medium text-green-600">
                              {formatUSDWithLocale(pool.totalFeesUsd, 2, 0, numberLocale)}
                            </td>
                            <td className="py-4 text-center font-medium text-figma-text-dark">
                              {pool.totalLiquidityUsd > 0
                                ? formatNumber((pool.inRangeLiquidityUsd / pool.totalLiquidityUsd) * 100, 2, 0, numberLocale)
                                : '0'}
                              %
                            </td>
                            <td className="py-4 pr-4 text-right">
                              <div className="flex items-center justify-end gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    navigate(`/pool/v22/${pool.tokenXId}/${pool.tokenYId}/${pool.binStep}`);
                                  }}
                                  className="p-1 hover:bg-figma-purple/20 rounded transition-colors"
                                  title="Go to Pool Detail"
                                >
                                  <ExternalLink className="w-4 h-4 text-figma-purple" />
                                </button>
                                <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                                  <ChevronRight className="w-5 h-5 text-figma-text-gray" />
                                </motion.div>
                              </div>
                            </td>
                          </tr>
                          {/* Expandable Content Row */}
                          <AnimatePresence>
                            {isExpanded && (
                              <tr key={`${idx}-expanded`}>
                                <td colSpan={6} className="p-0">
                                  <motion.div
                                    initial={{ height: 0, opacity: 0 }}
                                    animate={{ height: 'auto', opacity: 1 }}
                                    exit={{ height: 0, opacity: 0 }}
                                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                                    className="overflow-hidden"
                                  >
                                    <div
                                      className="p-6 bg-figma-gray-bg"
                                      style={{
                                        boxShadow: 'inset 0px 4px 8px -2px rgba(0,0,0,0.1)',
                                      }}
                                    >
                                      <PositionExpandableContent
                                        pool={pool}
                                        tokenPrices={tokenPrices}
                                        binLiquidityAmounts={allBinLiquidityAmounts?.[idx]?.result as bigint[][] | undefined}
                                      />
                                    </div>
                                  </motion.div>
                                </td>
                              </tr>
                            )}
                          </AnimatePresence>
                        </>
                      );
                    })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="block md:hidden p-2">
              {filteredUserPortfolioDataWithLiquidityAmounts?.map((pool: any, idx: number) => {
                const isExpanded = expandedPoolId === pool.lbPairId;
                return (
                  <div
                    key={idx}
                    className="mb-4 bg-white"
                    style={{
                      boxShadow:
                        'inset -1px -1px 0px 0px #828282, inset 1px 1px 0px 0px #fcfcfc, inset -2px -2px 0px 0px #9c9c9c, inset 2px 2px 0px 0px #e8e8e8',
                    }}
                  >
                    <div
                      className={`p-4 cursor-pointer hover:bg-figma-purple/5 transition-colors ${isExpanded ? 'bg-figma-purple/5' : ''}`}
                      onClick={() => setExpandedPoolId(isExpanded ? null : pool.lbPairId)}
                    >
                      {/* Header */}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="flex -space-x-2">
                          <img
                            src={tokenList?.find((token) => token.address.toLowerCase() === pool.tokenXId.toLowerCase())?.logoURI}
                            alt={pool.tokenXId}
                            className="w-8 h-8 rounded-full bg-gray-200"
                          />
                          <img
                            src={tokenList?.find((token) => token.address.toLowerCase() === pool.tokenYId.toLowerCase())?.logoURI}
                            alt={pool.tokenYId}
                            className="w-8 h-8 rounded-full bg-gray-200"
                          />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-roboto font-medium text-figma-text-dark">
                              {pool.name.split('-')[0] + '-' + pool.name.split('-')[1]}
                            </span>
                            {pool.isInRange ? (
                              <motion.span
                                className="inline-flex items-center gap-1 px-2 py-0.5 border-2"
                                style={{
                                  background: '#4ade80',
                                  borderColor: '#22c55e',
                                  color: '#030303',
                                  boxShadow:
                                    'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0',
                                  fontFamily: '"Press Start 2P", cursive',
                                }}
                                animate={{
                                  boxShadow: [
                                    'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0',
                                    'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0, 0 0 8px #4ade8080',
                                    'inset -1px -1px 0px 0px #22c55e, inset 1px 1px 0px 0px #86efac, inset -2px -2px 0px 0px #16a34a, inset 2px 2px 0px 0px #a7f3d0',
                                  ],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                              >
                                <motion.div
                                  className="w-2 h-2 bg-[#030303]"
                                  style={{
                                    boxShadow: 'inset -1px -1px 0px 0px #16a34a, inset 1px 1px 0px 0px #86efac',
                                  }}
                                  animate={{
                                    scale: [1, 1.2, 1],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                />
                                <span className="text-[8px] font-bold leading-tight whitespace-nowrap">IN RANGE</span>
                              </motion.span>
                            ) : (
                              <motion.span
                                className="inline-flex items-center gap-1 px-2 py-0.5 border-2"
                                style={{
                                  background: '#f59e0b',
                                  borderColor: '#d97706',
                                  color: '#030303',
                                  boxShadow:
                                    'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d',
                                  fontFamily: '"Press Start 2P", cursive',
                                }}
                                animate={{
                                  boxShadow: [
                                    'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d',
                                    'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d, 0 0 8px #f59e0b80',
                                    'inset -1px -1px 0px 0px #d97706, inset 1px 1px 0px 0px #fbbf24, inset -2px -2px 0px 0px #b45309, inset 2px 2px 0px 0px #fcd34d',
                                  ],
                                }}
                                transition={{
                                  duration: 2,
                                  repeat: Infinity,
                                  ease: 'easeInOut',
                                }}
                              >
                                <motion.div
                                  className="w-2 h-2 bg-[#030303]"
                                  style={{
                                    boxShadow: 'inset -1px -1px 0px 0px #b45309, inset 1px 1px 0px 0px #fbbf24',
                                  }}
                                  animate={{
                                    scale: [1, 1.2, 1],
                                  }}
                                  transition={{
                                    duration: 1.5,
                                    repeat: Infinity,
                                    ease: 'easeInOut',
                                  }}
                                />
                                <span className="text-[8px] font-bold leading-tight whitespace-nowrap">OUT OF RANGE</span>
                              </motion.span>
                            )}
                          </div>
                          <div className="flex items-center space-x-2 text-xs text-figma-text-gray font-roboto">
                            <span>Bin Step {pool.binStep}</span>
                            <span>|</span>
                            <span>Fee {formatNumber(Number(pool.baseFeePct), 4, 0, numberLocale)}%</span>
                          </div>
                        </div>
                      </div>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 gap-4 font-roboto">
                        <div>
                          <div className="text-xs text-figma-text-gray">Your Deposits</div>
                          <div className="font-medium text-figma-text-dark">
                            {formatUSDWithLocale(pool.totalLiquidityUsd, 0, 0, numberLocale)}
                          </div>
                        </div>
                        <div>
                          <div className="text-xs text-figma-text-gray">Fees Earned</div>
                          <div className="font-medium text-green-600">{formatUSDWithLocale(pool.totalFeesUsd, 2, 0, numberLocale)}</div>
                        </div>
                        <div className="col-span-2 flex items-center justify-between">
                          <div>
                            <div className="text-xs text-figma-text-gray flex items-center gap-1">
                              Efficiency
                              <Tooltip delayDuration={200}>
                                <TooltipTrigger asChild>
                                  <HelpCircle className="w-3 h-3 text-figma-text-gray cursor-help" />
                                </TooltipTrigger>
                                <TooltipContent className="max-w-xs">
                                  <div className="text-sm text-figma-text-dark">
                                    <p className="font-semibold mb-2">Liquidity Efficiency</p>
                                    <p className="mb-2">Shows how much of your deposited liquidity is actively earning fees.</p>
                                  </div>
                                </TooltipContent>
                              </Tooltip>
                            </div>
                            <div className="font-medium text-figma-text-dark">
                              {pool.totalLiquidityUsd > 0
                                ? formatNumber((pool.inRangeLiquidityUsd / pool.totalLiquidityUsd) * 100, 2, 0, numberLocale)
                                : '0'}
                              %
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                navigate(`/pool/v22/${pool.tokenXId}/${pool.tokenYId}/${pool.binStep}`);
                              }}
                              className="p-1 hover:bg-figma-purple/20 rounded transition-colors"
                              title="Go to Pool Detail"
                            >
                              <ExternalLink className="w-4 h-4 text-figma-purple" />
                            </button>
                            <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                              <ChevronRight className="w-5 h-5 text-figma-text-gray" />
                            </motion.div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Content */}
                    <AnimatePresence>
                      {isExpanded && (
                        <motion.div
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          transition={{ duration: 0.3, ease: 'easeInOut' }}
                          className="overflow-hidden"
                        >
                          <div className="p-4 bg-figma-gray-bg border-t border-[#c0c0c0]">
                            <PositionExpandableContent
                              pool={pool}
                              tokenPrices={tokenPrices}
                              binLiquidityAmounts={allBinLiquidityAmounts?.[idx]?.result as bigint[][] | undefined}
                            />
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                );
              })}
            </div>
          </div>
        </CardWithHeader>
      </main>
    </div>
  );
};

export default Portfolio;
