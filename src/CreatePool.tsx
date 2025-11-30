import { CardWithHeader } from '@/components/ui/card-with-header';
import { useEffect, useState } from 'react';
import TokenSelectionModal from './token-selection-modal';
import { useOpenBinParameters, useQuoteTokenAddresses } from './hooks/use-quote-tokenlist';
import { usePublicClient, useWriteContract } from 'wagmi';
import { zeroAddress } from 'viem';
import { getIdFromPrice } from './lib/bin';
import { DEFAULT_CHAINID } from './constants';
import { useNavigate } from 'react-router-dom';
import { LBFactoryV21ABI, Token, LB_FACTORY_V22_ADDRESS, PairV2 } from './lib/sdk';
import { ChevronDown, ArrowLeft, CheckCircle, AlertCircle } from 'lucide-react';
import TokenTicker from './components/token-ticker';
import { useTokenList } from './hooks/use-token-list';

export function CreatePool() {
  const navigate = useNavigate();
  // Placeholder state for selections
  const [baseToken, setBaseToken] = useState<Token | null>(null);
  const [quoteToken, setQuoteToken] = useState<Token | null>(null);
  const [binStep, setBinStep] = useState<number | null>(null);
  const [activePrice, setActivePrice] = useState<string>('');

  const { data: quoteTokenAddresses } = useQuoteTokenAddresses();

  const { data: openBinParameters } = useOpenBinParameters();
  const publicClient = usePublicClient();
  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [isQuoteTokenModalOpen, setIsQuoteTokenModalOpen] = useState(false);

  const [createPoolAvailable, setCreatePoolAvailable] = useState(false);
  const [createPoolReason, setCreatePoolReason] = useState<string | null>(null);
  const { data: tokenList } = useTokenList();
  const handleTokenSelect = (token: Token) => {
    setBaseToken(token);
    setIsTokenModalOpen(false);
  };

  const handleQuoteTokenSelect = (token: Token) => {
    setQuoteToken(token);
    setIsQuoteTokenModalOpen(false);
  };

  const { writeContractAsync } = useWriteContract();
  const [createPoolLoading, setCreatePoolLoading] = useState(false);
  const createPoolCall = async () => {
    if (baseToken && quoteToken && binStep) {
      try {
        setCreatePoolLoading(true);
        const activePriceWithDecimalsPrecision = Number(activePrice) * 10 ** (quoteToken.decimals - baseToken.decimals);
        const activeBinId = getIdFromPrice(Number(activePriceWithDecimalsPrecision), binStep);

        await writeContractAsync({
          address: LB_FACTORY_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
          abi: LBFactoryV21ABI,
          functionName: 'createLBPair',
          args: [baseToken.address as `0x${string}`, quoteToken.address as `0x${string}`, activeBinId, binStep],
        });

        await new Promise((resolve) => setTimeout(resolve, 5000));

        navigate(`/pool`);
      } catch (error) {
        console.error(error);
      } finally {
        setCreatePoolLoading(false);
      }
    }
  };

  useEffect(() => {
    async function fetchLbInfo() {
      if (binStep && baseToken && quoteToken) {
        console.log(binStep, baseToken, quoteToken);

        const pair = new PairV2(baseToken, quoteToken);

        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-expect-error
        const lbPair = await pair.fetchLBPair(binStep, 'v22', publicClient, DEFAULT_CHAINID);
        console.log(lbPair, 'lbPair');

        //

        if (lbPair && lbPair.LBPair === zeroAddress) {
          setCreatePoolAvailable(true);
          setCreatePoolReason(null);
        } else {
          setCreatePoolAvailable(false);
          setCreatePoolReason('Pool already exists');
        }
      }
    }

    fetchLbInfo();
  }, [binStep, baseToken, quoteToken, publicClient]);

  // Retro inset shadow styles
  const retroInsetShadow =
    'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa';
  const retroInputShadow = 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa';

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
      <main className="relative z-10 max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/pool')}
            className="mb-6 px-3 py-1.5 bg-figma-gray-table text-figma-text-dark font-roboto text-[12px] flex items-center gap-2 hover:bg-figma-gray-table/80 transition-all"
            style={{
              boxShadow: retroInsetShadow,
            }}
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Pools
          </button>
          <h1 className="text-white text-[42px] leading-[15.668px] tracking-[-1.68px] mb-2" style={{ fontFamily: '"Press Start 2P", cursive' }}>
            CREATE NEW POOL
          </h1>
          <p className="font-roboto text-zinc-400 text-[16px] leading-normal max-w-[854px]">
            Set up a new liquidity pool with custom parameters
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Column: Form */}
          <div className="lg:col-span-2">
            <CardWithHeader title="Pool Configuration" contentClassName="p-4 space-y-6">
              {/* Token Selection */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold font-roboto text-figma-text-dark">Token Pair</h3>

                {/* Base Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium font-roboto text-figma-text-dark">Base Token</label>
                  <button
                    className="w-full h-12 px-3 bg-figma-gray-table text-figma-text-dark font-roboto text-[14px] flex items-center justify-between hover:bg-figma-gray-table/80 transition-all"
                    style={{
                      boxShadow: retroInsetShadow,
                    }}
                    onClick={() => setIsTokenModalOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      {baseToken ? (
                        <>
                          <TokenTicker
                            logoURI={
                              tokenList?.find((token) => token.address.toLowerCase() === baseToken.address.toLowerCase())?.logoURI
                            }
                            symbol={baseToken.symbol}
                            className="w-6 h-6 rounded-full bg-green-dark-600"
                          />
                          <span className="font-medium">{baseToken.symbol}</span>
                        </>
                      ) : (
                        <span className="text-figma-text-gray">Select Base Token</span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-figma-text-gray" />
                  </button>
                  {baseToken && (
                    <button
                      onClick={() => setBaseToken(null)}
                      className="px-2 py-1 text-xs font-roboto text-figma-text-gray hover:text-figma-text-dark transition-all"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                {/* Quote Token */}
                <div className="space-y-2">
                  <label className="text-sm font-medium font-roboto text-figma-text-dark">Quote Token</label>
                  <button
                    className="w-full h-12 px-3 bg-figma-gray-table text-figma-text-dark font-roboto text-[14px] flex items-center justify-between hover:bg-figma-gray-table/80 transition-all"
                    style={{
                      boxShadow: retroInsetShadow,
                    }}
                    onClick={() => setIsQuoteTokenModalOpen(true)}
                  >
                    <div className="flex items-center gap-3">
                      {quoteToken ? (
                        <>
                          <TokenTicker
                            logoURI={
                              tokenList?.find((token) => token.address.toLowerCase() === quoteToken.address.toLowerCase())?.logoURI
                            }
                            symbol={quoteToken.symbol}
                            className="w-6 h-6 rounded-full bg-green-dark-600"
                          />
                          <span className="font-medium">{quoteToken.symbol}</span>
                        </>
                      ) : (
                        <span className="text-figma-text-gray">Select Quote Token</span>
                      )}
                    </div>
                    <ChevronDown className="w-4 h-4 text-figma-text-gray" />
                  </button>
                  {quoteToken && (
                    <button
                      onClick={() => setQuoteToken(null)}
                      className="px-2 py-1 text-xs font-roboto text-figma-text-gray hover:text-figma-text-dark transition-all"
                    >
                      Clear selection
                    </button>
                  )}
                </div>
              </div>

              {/* Bin Step Selection */}
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold font-roboto text-figma-text-dark">Bin Step</h3>
                  <p className="text-sm font-roboto text-figma-text-gray mt-1">
                    Lower bin steps for stable pairs, higher bin steps for volatile pairs
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {openBinParameters?.map((step: any) => (
                    <button
                      key={step.binStep}
                      className={`h-16 flex-col gap-1 font-roboto text-[14px] transition-all ${
                        binStep === step.binStep
                          ? 'bg-figma-purple text-white'
                          : 'bg-figma-gray-table text-figma-text-dark hover:bg-figma-gray-table/80'
                      }`}
                      style={{
                        boxShadow:
                          binStep === step.binStep
                            ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                            : retroInsetShadow,
                      }}
                      onClick={() => setBinStep(step.binStep)}
                    >
                      <div className="font-semibold">{step.binStep}</div>
                      <div className={`text-xs ${binStep === step.binStep ? 'opacity-90' : 'opacity-75'}`}>
                        Fee: {step.baseFee / 100}%
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Active Price */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold font-roboto text-figma-text-dark">Initial Price</h3>
                <div className="space-y-2">
                  <label className="text-sm font-medium font-roboto text-figma-text-dark">Starting Price</label>
                  <div className="flex gap-3">
                    <input
                      type="number"
                      placeholder="Enter price"
                      value={activePrice}
                      onChange={(e) => setActivePrice(e.target.value)}
                      className="flex-1 h-[38px] px-3 bg-figma-gray-table text-figma-text-dark font-roboto text-[14px] focus:outline-none"
                      style={{
                        boxShadow: retroInputShadow,
                      }}
                    />
                    <div
                      className="flex items-center px-3 py-2 bg-figma-gray-table text-figma-text-gray font-roboto text-sm"
                      style={{
                        boxShadow: retroInsetShadow,
                      }}
                    >
                      {quoteToken?.symbol || 'Quote'} / {baseToken?.symbol || 'Base'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Create Button */}
              <div className="pt-4">
                <button
                  className="w-full h-[59px] font-roboto text-[18px] flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={!createPoolAvailable || createPoolLoading || !baseToken || !quoteToken || !binStep || !activePrice}
                  onClick={createPoolCall}
                  style={{
                    backgroundColor: createPoolAvailable && baseToken && quoteToken && binStep && activePrice ? '#895bf5' : '#dadae0',
                    color: createPoolAvailable && baseToken && quoteToken && binStep && activePrice ? 'white' : '#121213',
                    boxShadow:
                      createPoolAvailable && baseToken && quoteToken && binStep && activePrice
                        ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa'
                        : retroInsetShadow,
                  }}
                >
                  {createPoolLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Creating Pool...
                    </>
                  ) : createPoolReason ? (
                    <>
                      <AlertCircle className="w-4 h-4" />
                      {createPoolReason}
                    </>
                  ) : !quoteToken || !baseToken ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Select tokens
                    </>
                  ) : !binStep ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Select bin step
                    </>
                  ) : !activePrice ? (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Enter initial price
                    </>
                  ) : (
                    <>
                      <CheckCircle className="w-4 h-4" />
                      Create Pool
                    </>
                  )}
                </button>
              </div>
            </CardWithHeader>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-1">
            <CardWithHeader title="Pool Preview" className="sticky top-8" contentClassName="p-4 space-y-4">
              {baseToken && quoteToken ? (
                <>
                  <div
                    className="flex items-center gap-3 p-3 bg-figma-gray-table"
                    style={{
                      boxShadow: retroInsetShadow,
                    }}
                  >
                    <div className="flex -space-x-2">
                      <TokenTicker
                        logoURI={tokenList?.find((token) => token.address.toLowerCase() === baseToken.address.toLowerCase())?.logoURI}
                        symbol={baseToken.symbol}
                        className="w-8 h-8 rounded-full bg-green-dark-600"
                      />
                      <TokenTicker
                        logoURI={tokenList?.find((token) => token.address.toLowerCase() === quoteToken.address.toLowerCase())?.logoURI}
                        symbol={quoteToken.symbol}
                        className="w-8 h-8 rounded-full bg-green-dark-600"
                      />
                    </div>
                    <div>
                      <div className="font-semibold font-roboto text-figma-text-dark">
                        {baseToken.symbol} / {quoteToken.symbol}
                      </div>
                      <div className="text-sm font-roboto text-figma-text-gray">
                        {binStep ? `${binStep}` : 'No bin step'} bin step
                      </div>
                    </div>
                  </div>

                  {activePrice && (
                    <div className="space-y-2">
                      <div className="text-sm font-medium font-roboto text-figma-text-dark">Initial Price</div>
                      <div className="text-lg font-bold font-roboto text-figma-purple">
                        {activePrice} {quoteToken.symbol} / {baseToken.symbol}
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <div className="text-sm font-medium font-roboto text-figma-text-dark">Pool Status</div>
                    <span
                      className={`inline-flex items-center px-2.5 py-0.5 text-xs font-medium font-roboto ${
                        createPoolAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                      }`}
                      style={{
                        boxShadow: retroInsetShadow,
                      }}
                    >
                      {createPoolAvailable ? 'Available' : 'Already Exists'}
                    </span>
                  </div>
                </>
              ) : (
                <div className="text-center py-8 text-figma-text-gray">
                  <div className="text-sm font-roboto">Select tokens to see pool preview</div>
                </div>
              )}
            </CardWithHeader>
          </div>
        </div>
      </main>

      {/* Token Selection Modals */}
      <TokenSelectionModal
        withoutNativeToken
        isOpen={isTokenModalOpen}
        onClose={() => setIsTokenModalOpen(false)}
        onSelectToken={handleTokenSelect}
        excludeTokenAddresses={quoteToken ? [quoteToken.address as `0x${string}`] : undefined}
      />
      <TokenSelectionModal
        isOpen={isQuoteTokenModalOpen}
        onClose={() => setIsQuoteTokenModalOpen(false)}
        onSelectToken={handleQuoteTokenSelect}
        onlyQuoteTokenAddresses={quoteTokenAddresses}
        excludeTokenAddresses={baseToken ? [baseToken.address as `0x${string}`] : undefined}
      />
    </div>
  );
}
