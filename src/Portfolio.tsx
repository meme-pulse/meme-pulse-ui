import { ChevronDown, ChevronRight, ChevronUp, Search, HelpCircle } from 'lucide-react';
import { useMemo, useState } from 'react';
import { Input } from './components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { useAccount } from 'wagmi';
import { DEFAULT_CHAINID } from './constants';
import { getPortfolio } from './lib/hasura-client';
import { useTokenPrices } from './hooks/use-token-price';
import TokenTicker from './components/token-ticker';
import { useTokenList } from './hooks/use-token-list';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from './components/ui/card';
import { Tooltip, TooltipContent, TooltipTrigger } from './components/ui/tooltip';
import { useLocalStorage } from 'usehooks-ts';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import { customReadClient } from './main';
import { LIQUIDITY_HELPER_V2_ADDRESS, LiquidityHelperV2ABI } from './lib/sdk';

const Portfolio = () => {
  const { address } = useAccount();
  const { data: tokenList } = useTokenList();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  // const { data: userPoolList, isLoading: isUserPoolListLoading } = useQuery({
  //   queryKey: ['userPoolList', address],
  //   queryFn: () => mockUserPoolList(address || ''),
  //   enabled: !!address,
  // });
  const navigate = useNavigate();
  const {
    data: userPortfolioData,
    // isLoading: isUserPortfolioDataLoading,
    // isError: isAllBinIdsError,
  } = useQuery({
    queryKey: ['user-portfolio-data', address],
    queryFn: () => {
      return getPortfolio(address || '');
      // return ponderClient.db.execute(
      //   sql`
      //   SELECT
      //     "lbPair".*,
      //     "tokenX"."decimals" AS "tokenXDecimals",
      //     "tokenY"."decimals" AS "tokenYDecimals",
      //     JSON_AGG("userBinLiquidity".*) AS "userBinLiquidities"
      //   FROM
      //     "userBinLiquidity"
      //   JOIN
      //     "lbPair" ON "userBinLiquidity"."lb_pair_id" = "lbPair"."id"
      //   JOIN
      //     "token" AS "tokenX" ON "lbPair"."token_x_id" = "tokenX"."id"
      //   JOIN
      //     "token" AS "tokenY" ON "lbPair"."token_y_id" = "tokenY"."id"
      //   WHERE
      //     "userBinLiquidity"."user_id" = ${address}
      //   GROUP BY
      //     "lbPair"."id",
      //     "tokenX"."decimals",
      //     "tokenY"."decimals"
      // `
      // );
    },
    enabled: !!address,
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'active' | 'outOfRange'>('all');
  const [sortOption, setSortOption] = useState<
    'depositDesc' | 'depositAsc' | 'feeDesc' | 'feeAsc' | 'activeLiquidityDesc' | 'activeLiquidityAsc' | 'fee/tvlDesc' | 'fee/tvlAsc'
  >('depositDesc');

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
        // console.log('inRangeTokenYAmount', activeBinIndex, allBinLiquidityAmounts?.[poolIdx]?.result?.[0]?.[activeBinIndex]);
        inRangeTokenXPrice = inRangeTokenXAmount * tokenXPrice;
        inRangeTokenYPrice = inRangeTokenYAmount * tokenYPrice;
        inRangeLiquidityUsd = inRangeTokenXPrice + inRangeTokenYPrice;
      }

      const lbPairFeeData = userPortfolioData?.feesEarned?.find((fee: any) => fee.lbPairId === pool.lbPairId);
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
        // add tabs, by status
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

  // const totalTradingVolume = useMemo(() => {
  //   try {
  //     const total = userPortfolioData?.volume?.[0]?.totalVolumeUSD;
  //     if (!total || isNaN(total)) {
  //       return 0;
  //     }

  //     return Number(total);
  //   } catch (error) {
  //     console.error(error);
  //     return 0;
  //   }
  // }, [userPortfolioData]);

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Portfolio</h1>
          <p className="text-muted-foreground">Manage your positions in one place.</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between py-12 px-6 ">
              <div>
                <div className="text-muted-foreground text-sm">Total Portfolio Value</div>
                <div className="text-foreground text-2xl font-bold mt-2">
                  {formatUSDWithLocale(totalPortfolioValue, 2, 0, numberLocale)}
                </div>
              </div>
              <div className=" p-3 rounded-lg">
                <img src="/portfolio/portfolio_tvl.svg" alt="portfolio icon" className="w-6 h-6 " />
              </div>
            </div>
          </div>{' '}
          <div className="bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between py-12 px-6 ">
              <div>
                <div className="text-muted-foreground text-sm">Total Fees Earned</div>
                <div className="text-foreground text-2xl font-bold mt-2">{formatUSDWithLocale(totalFeesEarned, 2, 0, numberLocale)}</div>
              </div>
              <div className=" p-3 rounded-lg">
                <img src="/portfolio/portfolio_fee.svg" alt="portfolio icon" className="w-6 h-6 " />
              </div>
            </div>
          </div>{' '}
          <div className="bg-card border border-border rounded-lg">
            <div className="flex items-center justify-between py-12 px-6 ">
              <div>
                <div className="text-muted-foreground text-sm">Total Positions</div>
                <div className="text-foreground text-2xl font-bold mt-2">{userPortfolioData?.userAllPools?.length || 0}</div>
              </div>
              <div className=" p-3 rounded-lg">
                <img src="/portfolio/portfolio_position.svg" alt="portfolio icon" className="w-6 h-6 " />
              </div>
            </div>
          </div>
        </div>
        <div className="bg-card border border-border rounded-lg px-2 py-2 sm:px-6 sm:py-6 gap-4">
          <div className="flex flex-col gap-2 sm:gap-0 sm:flex-row justify-between items-center">
            {/*  1. card header */}
            <div className="flex flex-col sm:flex-row  gap-6 items-center">
              {/* <h1 className="text-xl sm:*:text-2xl font-bold text-foreground  ">My Portfolio</h1> */}

              {/* Custom Tab (all positions, active, out of ragne)  */}
              {/* tabs wrapper */}
              <div className="grid grid-cols-3 sm:flex items-center justify-between bg-muted p-1 rounded-lg">
                <div
                  className={`text-foreground text-sm px-4 py-2 rounded-lg transition-all duration-500 ease-out ${
                    activeTab === 'all' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50'
                  } cursor-pointer`}
                  onClick={() => setActiveTab('all')}
                >
                  All Positions
                </div>
                <div
                  className={`text-foreground text-sm px-4 py-2 rounded-lg transition-all duration-500 ease-out ${
                    activeTab === 'active' ? 'bg-primary text-primary-foreground' : ''
                  } cursor-pointer`}
                  onClick={() => setActiveTab('active')}
                >
                  Active
                </div>
                <div
                  className={`text-foreground text-sm px-4 py-2 rounded-lg transition-all duration-500 ease-out   ${
                    activeTab === 'outOfRange' ? 'bg-primary text-primary-foreground' : ''
                  } cursor-pointer`}
                  onClick={() => setActiveTab('outOfRange')}
                >
                  Out of Range
                </div>
              </div>
            </div>
            {/*  Search Tab */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name, symbol or address"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10  w-72 bg-background border-border text-foreground placeholder:text-muted-foreground"
              />
            </div>
          </div>
          <div className="hidden md:block overflow-x-auto mt-8">
            <table className="w-full" style={{ tableLayout: 'fixed' }}>
              <colgroup>
                <col style={{ width: '25%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '20%' }} />
                <col style={{ width: '15%' }} />
                <col style={{ width: '5%' }} />
              </colgroup>
              <thead>
                <tr className="border-b border-border-muted text-left">
                  <th className="pb-3 text-body-sm font-medium text-text-secondary uppercase tracking-wider">Pool Name</th>
                  <th className="pb-3 text-body-sm font-medium text-text-secondary uppercase tracking-wider text-right">STATUS</th>
                  <th className="pb-3 text-body-sm font-medium text-text-secondary uppercase tracking-wider text-right">
                    <div
                      className="flex items-center justify-end space-x-1 cursor-pointer"
                      onClick={() => setSortOption(sortOption === 'depositDesc' ? 'depositAsc' : 'depositDesc')}
                    >
                      <span>YOUR DEPOSITS</span>
                      {sortOption === 'depositAsc' ? (
                        <ChevronUp className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" />
                      ) : sortOption === 'depositDesc' ? (
                        <ChevronDown className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" />
                      ) : null}
                    </div>
                  </th>
                  <th className="pb-3 text-body-sm font-medium text-text-secondary uppercase tracking-wider text-right">
                    <div
                      className="flex items-center justify-end space-x-1 cursor-pointer"
                      // onClick={() => setSortOption(sortOption === 'feeDesc' ? 'feeAsc' : 'feeDesc')}
                    >
                      <span>FEES EARNED</span>
                      {/* {sortOption === 'feeAsc' ? (
                        <ChevronUp className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" />
                      ) : sortOption === 'feeDesc' ? (
                        <ChevronDown className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" />
                      ) : null} */}
                    </div>
                  </th>
                  <th className="pb-3 text-body-sm font-medium text-text-secondary uppercase tracking-wider text-right">
                    <div className="flex items-center justify-end space-x-1">
                      <span>LIQUIDITY EFFICIENCY</span>
                      <Tooltip delayDuration={200}>
                        <TooltipTrigger asChild>
                          <HelpCircle className="w-4 h-4 text-muted-foreground cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent className="max-w-xs bg-white border border-gray-200 shadow-lg">
                          <div className="text-sm text-gray-800">
                            <p className="font-semibold mb-2 text-gray-900">Liquidity Efficiency</p>
                            <p className="mb-2 text-gray-700">Shows how much of your deposited liquidity is actively earning fees.</p>
                            <p className="text-xs text-gray-600">Formula: (Active Liquidity ÷ Total Deposits) × 100%</p>
                            <p className="text-xs text-gray-600 mt-1">Higher percentage = More efficient liquidity placement</p>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </div>
                  </th>
                  <th className="pb-3 text-body-sm font-medium text-text-secondary uppercase tracking-wider text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E3E8EF]">
                {filteredUserPortfolioDataWithLiquidityAmounts
                  ?.sort((a: any, b: any) => {
                    if (sortOption === 'depositDesc') return b.totalLiquidityUsd - a.totalLiquidityUsd;
                    if (sortOption === 'depositAsc') return a.totalLiquidityUsd - b.totalLiquidityUsd;
                    if (sortOption === 'activeLiquidityDesc') return b.inRangeLiquidityUsd - a.inRangeLiquidityUsd;
                    if (sortOption === 'activeLiquidityAsc') return a.inRangeLiquidityUsd - b.inRangeLiquidityUsd;
                    // if (sortOption === 'fee/tvlDesc') return b.totalFees24h - a.totalFees24h;
                    // if (sortOption === 'fee/tvlAsc') return a.totalFees24h - b.totalFees24h;
                    return 0;
                  })
                  .map((pool: any) => (
                    <tr
                      className="hover:bg-primary/10 transition-colors cursor-pointer"
                      onClick={() => {
                        navigate(`/pool/v22/${pool.tokenXId}/${pool.tokenYId}/${pool.binStep}`);
                      }}
                    >
                      <td className="py-4">
                        <div className="flex items-center space-x-3">
                          <div className="flex items-center -space-x-2">
                            <TokenTicker
                              logoURI={tokenList?.find((token) => token.address.toLowerCase() === pool.tokenXId.toLowerCase())?.logoURI}
                              symbol={pool.tokenXId}
                              className="w-8 h-8 rounded-full bg-muted"
                            />
                            <TokenTicker
                              logoURI={tokenList?.find((token) => token.address.toLowerCase() === pool.tokenYId.toLowerCase())?.logoURI}
                              symbol={pool.tokenYId}
                              className="w-8 h-8 rounded-full bg-muted"
                            />
                          </div>
                          <div className="flex flex-col ">
                            <span className="font-medium text-foreground">{pool.name.split('-')[0] + '-' + pool.name.split('-')[1]}</span>
                            <div className="flex items-center space-x-2">
                              <span className="text-muted-foreground  py-1 rounded">
                                <span className="text-[1rem]">Bin Step</span> <span className="ml-1 text-foreground">{pool.binStep}</span>
                              </span>
                              <span className="text-muted-foreground  py-1 rounded">
                                <span className="text-[1rem]">Fee</span>{' '}
                                <span className="ml-1 text-foreground">{formatNumber(Number(pool.baseFeePct), 4, 0, numberLocale)} %</span>
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {pool.isInRange ? (
                          <span className="inline-flex items-center gap-2 px-2 py-1 text-green-400 border border-green-400 rounded-md bg-green-400/10">
                            <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                            In Range
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-2 px-2 py-1 text-yellow-400 border border-yellow-400 rounded-md bg-yellow-400/10">
                            <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                            Out of Range
                          </span>
                        )}
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {formatUSDWithLocale(pool.totalLiquidityUsd, 0, 0, numberLocale)}
                      </td>
                      <td className="py-3 text-right font-medium text-green-400">
                        {formatUSDWithLocale(pool.totalFeesUsd, 2, 0, numberLocale)}
                      </td>
                      <td className="py-3 text-right font-medium text-foreground">
                        {pool.totalLiquidityUsd > 0
                          ? formatNumber((pool.inRangeLiquidityUsd / pool.totalLiquidityUsd) * 100, 2, 0, numberLocale)
                          : '0'}{' '}
                        %
                      </td>
                      <td
                        className="py-3 flex h-[88px] items-center justify-end  "
                        onClick={() => {
                          navigate(`/pool/v22/${pool.tokenXId}/${pool.tokenYId}/${pool.binStep}`);
                        }}
                      >
                        <ChevronRight className="w-5 h-5 text-muted-foreground" />
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="block md:hidden mt-4">
            {filteredUserPortfolioDataWithLiquidityAmounts?.map((pool: any) => (
              <Card
                className="mb-4 cursor-pointer hover:shadow-lg transition-shadow bg-card border border-border hover:border-primary/50"
                // onClick={() => navigate(`/pool/v22/${pool.tokenXId}/${pool.tokenYId}/${pool.binStep}`)}
                onClick={() => navigate(`/pool/v22/${pool.tokenXId}/${pool.tokenYId}/${pool.binStep}`)}
              >
                <CardContent className="flex flex-col gap-3 p-4 ">
                  <div className="flex items-center gap-3 w-full">
                    <div className="flex -space-x-2">
                      <img
                        src={tokenList?.find((token) => token.address.toLowerCase() === pool.tokenXId.toLowerCase())?.logoURI}
                        alt={pool.tokenXId}
                        className="w-6 h-6 rounded-full bg-muted"
                      />
                      <img
                        src={tokenList?.find((token) => token.address.toLowerCase() === pool.tokenYId.toLowerCase())?.logoURI}
                        alt={pool.tokenYId}
                        className="w-6 h-6 rounded-full bg-muted"
                      />
                    </div>
                    <div className="flex flex-col flex-1">
                      <div className="font-medium text-foreground text-xs">
                        <div className="flex items-center justify-between w-full">
                          <span>{pool.name.split('-')[0] + '-' + pool.name.split('-')[1]}</span>
                          <div>
                            {pool.isInRange ? (
                              <span className="inline-flex items-center gap-2 px-2 py-1 text-green-400 border border-green-400 rounded-md bg-green-400/10">
                                <div className="w-2 h-2 bg-green-400 rounded-full"></div>
                                In Range
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-2 px-2 py-1 text-yellow-400 border border-yellow-400 rounded-md bg-yellow-400/10">
                                <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                                Out of Range
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2 text-xs">
                        <span className="text-muted-foreground  py-1 rounded">
                          <span className="text-sm">Bin Step</span> <span className="ml-1 text-foreground">{pool.binStep}</span>
                        </span>
                        <span className=" text-muted-foreground  py-1 rounded">
                          <span className="text-sm">Fee</span>{' '}
                          <span className="ml-1 text-foreground">{formatNumber(Number(pool.baseFeePct), 4, 0, numberLocale)} %</span>
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 mt-2 text-sm">
                    <div className="flex flex-col flex-1 min-w-[120px]">
                      <span className="text-muted-foreground">Your Deposits</span>
                      <span className="font-medium text-foreground">{formatUSDWithLocale(pool.totalLiquidityUsd, 0, 0, numberLocale)}</span>
                    </div>
                    <div className="flex flex-col flex-1 min-w-[120px]">
                      <span className="text-muted-foreground">Fees Earned</span>
                      <span className="font-medium text-foreground">{formatUSDWithLocale(pool.totalFeesUsd, 0, 0, numberLocale)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-4 text-sm">
                    <div className="flex flex-col flex-1 min-w-[120px] relative">
                      <div className="flex items-center gap-1">
                        <span className="text-muted-foreground">Liquidity Efficiency</span>
                        <Tooltip delayDuration={200}>
                          <TooltipTrigger asChild>
                            <HelpCircle className="w-3 h-3 text-muted-foreground cursor-help" />
                          </TooltipTrigger>
                          <TooltipContent className="max-w-xs bg-white border border-gray-200 shadow-lg">
                            <div className="text-sm text-gray-800">
                              <p className="font-semibold mb-2 text-gray-900">Liquidity Efficiency</p>
                              <p className="mb-2 text-gray-700">Shows how much of your deposited liquidity is actively earning fees.</p>
                              <p className="text-xs text-gray-600">Formula: (Active Liquidity ÷ Total Deposits) × 100%</p>
                              <p className="text-xs text-gray-600 mt-1">Higher percentage = More efficient liquidity placement</p>
                            </div>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <span className="font-medium text-foreground">
                        {pool.totalLiquidityUsd > 0
                          ? formatNumber((pool.inRangeLiquidityUsd / pool.totalLiquidityUsd) * 100, 2, 0, numberLocale)
                          : '0'}{' '}
                        %
                      </span>
                      <ChevronRight className="w-5 h-5 text-muted-foreground absolute right-0 bottom-0" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
        {/*  tables */}
      </main>
    </div>
  );
};

export default Portfolio;
