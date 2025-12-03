import { useParams } from 'react-router-dom';
import { Tabs, TabsContent } from '@/components/ui/tabs';
import { PlusIcon, SearchIcon } from 'lucide-react';
import { AddPositionCard } from './components/pool-detail/add-position-card';
import { RemovePositionCard } from './components/pool-detail/remove-position-card';

import { PoolDetailHeader } from './components/pool-detail/pool-detail-header';
import { PoolAnalytics } from './components/pool-detail/pool-analytics';
import { CardWithHeader } from '@/components/ui/card-with-header';
import { useQuery } from '@tanstack/react-query';
import { mockPoolData } from './mock/api-data';
import { useMemo, useState } from 'react';
import { LB_FACTORY_V22_ADDRESS, LBFactoryV21ABI } from './lib/sdk';

import { useAccount } from 'wagmi';
import { DEFAULT_CHAINID } from './constants';
import { useActiveId } from './hooks/use-active-id';
import { getPriceFromId } from './lib/bin';
import { useTokenList } from './hooks/use-token-list';
import { customReadClient } from './main';
import { YourLiquidityCard } from './components/pool-detail/your-liquidity-card';
import { useUserLiquidityBinIds } from './hooks/use-user-liquidity-bin-ids';

export interface PoolData {
  pairAddress: string;
  chain: string;
  name: string;
  status: string;
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
  dynamicFeePct: number;
  protocolFeePct: number;
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
}

export default function PoolDetail() {
  const { tokenAAddress, tokenBAddress, lbBinStep } = useParams();
  const [activeTab, setActiveTab] = useState('add');
  const { address } = useAccount();

  const { data: tokenListData } = useTokenList();

  const {
    data: lbPairData,
    isLoading: lbPairLoading,
    isError: lbPairError,
    error: lbPairErrorData,
  } = useQuery({
    queryKey: ['lbPairAddr', tokenAAddress, tokenBAddress, lbBinStep],
    queryFn: async () => {
      const lbPairInfo = await customReadClient?.readContract({
        address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
        abi: LBFactoryV21ABI,
        functionName: 'getLBPairInformation',
        args: [tokenAAddress as `0x${string}`, tokenBAddress as `0x${string}`, BigInt(lbBinStep || 0)],
      });
      console.log(lbPairInfo, 'lbPairInfo');

      return lbPairInfo as { LBPair: string };
    },
    enabled: !!tokenAAddress && !!tokenBAddress && !!lbBinStep,
    staleTime: 1000 * 60,
  });
  console.log(lbPairLoading, lbPairError, lbPairErrorData, 'lbPairLoading, lbPairError, lbPairErrorData');

  const {
    data: poolData,
    isLoading,
    isError: poolError,
  } = useQuery<PoolData>({
    queryKey: ['poolData', tokenAAddress, tokenBAddress, lbBinStep],
    queryFn: async () => {
      const poolData = await mockPoolData(lbPairData?.LBPair as string);
      console.log(poolData, 'poolData');
      return poolData;
    },
    enabled: !!lbPairData,
    staleTime: 1000 * 60,
    retry: false,
  });
  const activeId = useActiveId(poolData?.pairAddress as `0x${string}`, poolData?.activeBinId as number, !!poolData);

  const [yBaseCurrency, setYBaseCurrency] = useState<boolean>(false);
  // view price in y per X
  const currentPrice = useMemo(() => {
    if (activeId && poolData?.lbBinStep) {
      if (yBaseCurrency) {
        // decimals of tokenX
        return (1 / getPriceFromId(activeId, poolData?.lbBinStep)) * 10 ** (poolData?.tokenY.decimals - poolData?.tokenX.decimals);
      } else {
        // decimals of tokenY
        return getPriceFromId(activeId, poolData?.lbBinStep) * 10 ** (poolData?.tokenX.decimals - poolData?.tokenY.decimals);
      }
    }
    return 0;
  }, [poolData, yBaseCurrency, activeId]);

  // Check if user has positions
  const { data: myBinIds } = useUserLiquidityBinIds({
    poolAddress: poolData?.pairAddress || '',
    userAddress: address || '',
    enabled: !!address && !!poolData?.pairAddress,
  });

  const hasPositions = myBinIds && myBinIds.length > 0;

  console.log(isLoading, poolData);

  if (isLoading || !poolData) {
    return (
      <div className="min-h-[90vh] bg-[#060208] flex justify-center items-center relative overflow-hidden">
        <div className="flex flex-col justify-center items-center z-10 gap-4">
          <img src="/pixel_pulse_white.png" alt="MemePulse Logo" className="w-16 h-20 object-contain animate-pulse" />
          <span className="text-[#facb25] text-[12px] animate-pulse" style={{ fontFamily: '"Press Start 2P", cursive' }}>
            Loading...
          </span>
        </div>
      </div>
    );
  }
  if (poolError) {
    return (
      <div className="min-h-[90vh] bg-[#060208] flex justify-center items-center relative overflow-hidden">
        {/* Space Background with Stars */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          <div
            className="absolute inset-0"
            style={{
              background: 'radial-gradient(ellipse at top, #1a0a2e 0%, #060208 50%, #060208 100%)',
            }}
          />
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                radial-gradient(1px 1px at 20px 30px, white, transparent),
                radial-gradient(1px 1px at 40px 70px, rgba(255,255,255,0.8), transparent),
                radial-gradient(1px 1px at 90px 40px, white, transparent),
                radial-gradient(1px 1px at 160px 120px, white, transparent),
                radial-gradient(1px 1px at 250px 180px, white, transparent),
                radial-gradient(1px 1px at 350px 30px, white, transparent),
                radial-gradient(1px 1px at 500px 200px, rgba(255,255,255,0.7), transparent),
                radial-gradient(1px 1px at 650px 170px, white, transparent),
                radial-gradient(1px 1px at 800px 20px, rgba(255,255,255,0.6), transparent)
              `,
              backgroundRepeat: 'repeat',
              backgroundSize: '1200px 250px',
            }}
          />
          <div
            className="absolute top-0 left-1/4 w-[600px] h-[400px] opacity-20"
            style={{
              background: 'radial-gradient(ellipse at center, rgba(239, 68, 68, 0.4) 0%, transparent 70%)',
            }}
          />
        </div>

        {/* Error Content */}
        <div className="flex flex-col justify-center items-center z-10 gap-6 px-4 text-center">
          {/* Error Icon */}
          <div
            className="w-20 h-20 bg-figma-gray-table flex items-center justify-center"
            style={{
              boxShadow:
                'inset -2px -2px 0px 0px #f9f9fa, inset 2px 2px 0px 0px #a1a1aa, inset -4px -4px 0px 0px #a1a1aa, inset 4px 4px 0px 0px #f9f9fa',
            }}
          >
            <span className="text-4xl">❌</span>
          </div>

          {/* Error Title */}
          <h1 className="text-[#ef4444] text-[16px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
            Pool Not Found
          </h1>

          {/* Error Message */}
          <p className="text-[#a1a1aa] font-roboto text-[14px] max-w-md">
            The pool you're looking for doesn't exist or hasn't been indexed yet.
            <br />
            Please check the URL or try again later.
          </p>

          {/* Back Button */}
          <button
            onClick={() => window.history.back()}
            className="mt-4 px-6 py-3 bg-figma-gray-table font-roboto text-[#030303] text-[14px] hover:bg-[#d0d0d4] transition-colors"
            style={{
              boxShadow:
                'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
            }}
          >
            ← Go Back
          </button>

          {/* Pool List Link */}
          <a href="/pool" className="text-figma-purple font-roboto text-[13px] hover:underline">
            or browse all pools
          </a>
        </div>
      </div>
    );
  }

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
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 pt-8 relative z-10">
        <PoolDetailHeader
          poolData={poolData}
          yBaseCurrency={yBaseCurrency}
          setYBaseCurrency={setYBaseCurrency}
          currentPrice={currentPrice}
          tokenListData={tokenListData}
        />

        {/* Main Content Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-6">
          {/* Left Column: Pool Information (1/3) */}
          <div className="lg:col-span-1 space-y-6">
            <PoolAnalytics poolData={poolData} activeId={activeId} yBaseCurrency={yBaseCurrency} />
          </div>

          {/* Right Column: User Information (2/3) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Box 1: User Liquidity Card */}
            <YourLiquidityCard
              poolData={poolData}
              yBaseCurrency={yBaseCurrency}
              setYBaseCurrency={setYBaseCurrency}
              currentPrice={currentPrice}
            />

            {/* Box 2: Liquidity Management Tabs */}
            <CardWithHeader title="Liquidity Management" contentClassName="p-3 pt-4">
              <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                {/* Custom Tab Buttons */}
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setActiveTab('add')}
                    className={`px-4 py-2 font-roboto text-[13px] transition-all ${
                      activeTab === 'add' ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-[#030303] hover:bg-figma-gray-table/80'
                    }`}
                    style={{
                      boxShadow:
                        activeTab === 'add'
                          ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                          : 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                    }}
                  >
                    Add Position
                  </button>
                  <button
                    onClick={() => setActiveTab('positions')}
                    className={`px-4 py-2 font-roboto text-[13px] transition-all ${
                      activeTab === 'positions'
                        ? 'bg-figma-purple text-white'
                        : 'bg-figma-gray-table text-[#030303] hover:bg-figma-gray-table/80'
                    }`}
                    style={{
                      boxShadow:
                        activeTab === 'positions'
                          ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                          : 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                    }}
                  >
                    Your Positions
                  </button>
                </div>

                <TabsContent value="positions" className="mt-0">
                  {hasPositions ? (
                    <div
                      className="p-4 bg-figma-gray-table"
                      style={{
                        boxShadow:
                          'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                      }}
                    >
                      <RemovePositionCard poolData={poolData} yBaseCurrency={yBaseCurrency} setYBaseCurrency={setYBaseCurrency} />
                    </div>
                  ) : (
                    <div
                      className="text-center py-12 bg-figma-gray-table"
                      style={{
                        boxShadow:
                          'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                      }}
                    >
                      <div className="flex justify-center mb-4">
                        <SearchIcon className="w-12 h-12 text-figma-text-gray" />
                      </div>
                      <h3 className="font-roboto font-semibold text-[#030303] text-[16px] mb-2">No Position Found</h3>
                      <p className="font-roboto text-figma-text-gray text-[14px] mb-6">
                        You don't have any liquidities in this pool. Add liquidity to earn pool rewards.
                      </p>
                      <button
                        onClick={() => setActiveTab('add')}
                        className="px-4 py-2 bg-figma-purple text-white font-roboto text-[13px] flex items-center gap-2 mx-auto"
                        style={{
                          boxShadow: 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa',
                        }}
                      >
                        <PlusIcon className="w-4 h-4" /> Add Liquidity
                      </button>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="add" className="mt-0">
                  <div
                    className="p-4 bg-figma-gray-table"
                    style={{
                      boxShadow:
                        'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
                    }}
                  >
                    <AddPositionCard
                      poolData={poolData}
                      tokenListData={tokenListData}
                      yBaseCurrency={yBaseCurrency}
                      setYBaseCurrency={setYBaseCurrency}
                    />
                  </div>
                </TabsContent>
              </Tabs>
            </CardWithHeader>
          </div>
        </div>
      </div>
    </div>
  );
}
