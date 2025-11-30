import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      <main className="relative z-10 max-w-screen-xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <Button variant="ghost" onClick={() => navigate('/pool')} className="mb-4 text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Pools
          </Button>
          <h1 className="text-3xl font-bold text-foreground mb-2">Create New Pool</h1>
          <p className="text-muted-foreground">Set up a new liquidity pool with custom parameters</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Form */}
          <div className="lg:col-span-2">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="text-xl text-foreground">Pool Configuration</CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Token Selection */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Token Pair</h3>

                  {/* Base Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Base Token</label>
                    <Button variant="outline" className="w-full h-12 justify-between text-left" onClick={() => setIsTokenModalOpen(true)}>
                      <div className="flex items-center gap-3">
                        {baseToken ? (
                          <>
                            <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                              <TokenTicker
                                logoURI={
                                  tokenList?.find((token) => token.address.toLowerCase() === baseToken.address.toLowerCase())?.logoURI
                                }
                                symbol={baseToken.symbol}
                                className="w-6 h-6 rounded-full bg-green-dark-600"
                              />
                            </div>
                            <span className="font-medium">{baseToken.symbol}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select Base Token</span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    {baseToken && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setBaseToken(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear selection
                      </Button>
                    )}
                  </div>

                  {/* Quote Token */}
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Quote Token</label>
                    <Button
                      variant="outline"
                      className="w-full h-12 justify-between text-left"
                      onClick={() => setIsQuoteTokenModalOpen(true)}
                    >
                      <div className="flex items-center gap-3">
                        {quoteToken ? (
                          <>
                            <div className="w-6 h-6 bg-muted rounded-full flex items-center justify-center">
                              <TokenTicker
                                logoURI={
                                  tokenList?.find((token) => token.address.toLowerCase() === quoteToken.address.toLowerCase())?.logoURI
                                }
                                symbol={quoteToken.symbol}
                                className="w-6 h-6 rounded-full bg-green-dark-600"
                              />
                            </div>
                            <span className="font-medium">{quoteToken.symbol}</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Select Quote Token</span>
                        )}
                      </div>
                      <ChevronDown className="w-4 h-4 text-muted-foreground" />
                    </Button>
                    {quoteToken && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setQuoteToken(null)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        Clear selection
                      </Button>
                    )}
                  </div>
                </div>

                {/* Bin Step Selection */}
                <div className="space-y-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">Bin Step</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      Lower bin steps for stable pairs, higher bin steps for volatile pairs
                    </p>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {openBinParameters?.map((step: any) => (
                      <Button
                        key={step.binStep}
                        variant={binStep === step.binStep ? 'default' : 'outline'}
                        className={`h-16 flex-col gap-1 ${
                          binStep === step.binStep ? 'bg-primary text-primary-foreground border-primary' : 'hover:bg-muted'
                        }`}
                        onClick={() => setBinStep(step.binStep)}
                      >
                        <div className="font-semibold">{step.binStep} </div>
                        <div className="text-xs opacity-75">Fee: {step.baseFee / 100}%</div>
                      </Button>
                    ))}
                  </div>
                </div>

                {/* Active Price */}
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-foreground">Initial Price</h3>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-foreground">Starting Price</label>
                    <div className="flex gap-3">
                      <Input
                        type="number"
                        placeholder="Enter price"
                        value={activePrice}
                        onChange={(e) => setActivePrice(e.target.value)}
                        className="flex-1"
                      />
                      <div className="flex items-center px-3 py-2 bg-muted rounded-md text-sm text-muted-foreground">
                        {quoteToken?.symbol || 'Quote'} / {baseToken?.symbol || 'Base'}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Create Button */}
                <div className="pt-4">
                  <Button
                    className="w-full h-12 text-lg"
                    disabled={!createPoolAvailable || createPoolLoading || !baseToken || !quoteToken || !binStep || !activePrice}
                    onClick={createPoolCall}
                  >
                    {createPoolLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                        Creating Pool...
                      </>
                    ) : createPoolReason ? (
                      <>
                        <AlertCircle className="w-4 h-4 mr-2" />
                        {createPoolReason}
                      </>
                    ) : !quoteToken || !baseToken ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Select tokens
                      </>
                    ) : !binStep ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Select bin step
                      </>
                    ) : !activePrice ? (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Enter initial price
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4 mr-2" />
                        Create Pool
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column: Preview */}
          <div className="lg:col-span-1">
            <Card className="bg-card border border-border sticky top-8">
              <CardHeader>
                <CardTitle className="text-lg text-foreground">Pool Preview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {baseToken && quoteToken ? (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
                      <div className="flex -space-x-2">
                        <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-sm font-bold">
                          <TokenTicker
                            logoURI={tokenList?.find((token) => token.address.toLowerCase() === baseToken.address.toLowerCase())?.logoURI}
                            symbol={baseToken.symbol}
                            className="w-8 h-8 rounded-full bg-green-dark-600"
                          />
                        </div>
                        <div className="w-8 h-8 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground text-sm font-bold">
                          <TokenTicker
                            logoURI={tokenList?.find((token) => token.address.toLowerCase() === quoteToken.address.toLowerCase())?.logoURI}
                            symbol={quoteToken.symbol}
                            className="w-8 h-8 rounded-full bg-green-dark-600"
                          />
                        </div>
                      </div>
                      <div>
                        <div className="font-semibold text-foreground">
                          {baseToken.symbol} / {quoteToken.symbol}
                        </div>
                        <div className="text-sm text-muted-foreground">{binStep ? `${binStep}` : 'No bin step'} bin step</div>
                      </div>
                    </div>

                    {activePrice && (
                      <div className="space-y-2">
                        <div className="text-sm font-medium text-foreground">Initial Price</div>
                        <div className="text-lg font-bold text-primary">
                          {activePrice} {quoteToken.symbol} / {baseToken.symbol}
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <div className="text-sm font-medium text-foreground">Pool Status</div>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                          createPoolAvailable ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                        }`}
                      >
                        {createPoolAvailable ? 'Available' : 'Already Exists'}
                      </span>
                    </div>
                  </>
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <div className="text-sm">Select tokens to see pool preview</div>
                  </div>
                )}
              </CardContent>
            </Card>
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
