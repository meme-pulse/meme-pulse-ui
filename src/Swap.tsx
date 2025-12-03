import { useState, useEffect, useMemo } from 'react';
import { ArrowUpDown, ChevronDown, Info, Loader2 } from 'lucide-react';
import TokenSelectionModal from '@/token-selection-modal';
import { useTradeQuote } from './hooks/use-trade-quote';
import { useAccount, useWaitForTransactionReceipt, useWatchAsset } from 'wagmi';
import { NATIVE_TOKEN_ADDRESS, useTokenData } from './hooks/use-token-data';
import { parseUnits, zeroAddress } from 'viem';
import { useTokenList } from './hooks/use-token-list';
import debounce from 'lodash.debounce';
import { useTradeExecute } from './hooks/use-trade-execute';
import { useTokenPrices } from './hooks/use-token-price';
import { CardWithHeader } from '@/components/ui/card-with-header';
import ApproveButton from './components/approve-button';
import { retroToast } from '@/components/ui/retro-toast';
import { DEFAULT_CHAINID } from './constants';
import { LB_ROUTER_V22_ADDRESS } from './lib/sdk';
import { Token, WNATIVE } from './lib/sdk';
import { formatNumber, formatUSDWithLocale } from './lib/format';
import { useLocalStorage } from 'usehooks-ts';

export default function SwapComponent() {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [slippage, setSlippage] = useLocalStorage('slippage', '0.5');
  const { address } = useAccount();
  const { watchAsset } = useWatchAsset();
  const { data: tokenList } = useTokenList();
  const initialFromTokenM = new Token(DEFAULT_CHAINID, zeroAddress, 18, 'M', 'Memecore');

  const [fromToken, setFromToken] = useState<Token>(initialFromTokenM);
  const [toToken, setToToken] = useState<Token | null>(null);

  const { data: fromTokenData, refetch: refetchFromTokenData } = useTokenData({
    tokenAddress: fromToken.address as `0x${string}`,
  });

  const { data: toTokenData, refetch: refetchToTokenData } = useTokenData({
    tokenAddress: toToken?.address as `0x${string}`,
  });

  const { data: tokenPrices } = useTokenPrices({
    addresses: [fromToken.address, toToken?.address].filter(Boolean) as string[],
  });

  const [typedValueIn, setTypedValueIn] = useState<string>('');
  const [debouncedValue, setDebouncedValue] = useState<string>('');

  useEffect(() => {
    const handler = debounce((value: string) => setDebouncedValue(value), 500);
    handler(typedValueIn);
    return () => handler.cancel();
  }, [typedValueIn]);

  const {
    quote,
    simulationData,
    isLoading,
    error: quoteError,
    refetch,
    setQuote,
  } = useTradeQuote({
    inputToken: fromToken.address === NATIVE_TOKEN_ADDRESS ? WNATIVE[DEFAULT_CHAINID] : fromToken,
    outputToken: toToken?.address === NATIVE_TOKEN_ADDRESS ? WNATIVE[DEFAULT_CHAINID] : toToken,
    typedValueIn: debouncedValue,
    isExactIn: true,
    isNativeIn: fromToken.address === NATIVE_TOKEN_ADDRESS,
    isNativeOut: toToken?.address === NATIVE_TOKEN_ADDRESS,
  });

  const tradeMutation = useTradeExecute({
    methodName: quote?.methodName ?? '',
    args: quote?.args ?? [],
    value: quote?.value ?? '',
  });

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [selectingTokenFor, setSelectingTokenFor] = useState<'from' | 'to'>('from');

  useEffect(() => {
    if (fromToken && toToken && debouncedValue) {
      refetch();
    }
  }, [debouncedValue, fromToken, toToken, address]);

  const handleTokenSelect = (token: Token) => {
    if (selectingTokenFor === 'from') {
      setFromToken(token);
    } else {
      setToToken(token);
    }
  };

  const handleSwapTokens = () => {
    if (toToken) {
      const tempToken = fromToken;
      setFromToken(toToken);
      setToToken(tempToken);
    }
  };

  const openTokenModal = (type: 'from' | 'to') => {
    setSelectingTokenFor(type);
    setIsTokenModalOpen(true);
  };

  const handleMaxClick = () => {
    setTypedValueIn(fromTokenData?.formattedBalance ?? '0');
  };
  const handleHalfClick = () => {
    setTypedValueIn((Number(fromTokenData?.formattedBalance ?? '0') * 0.5).toString());
  };

  const getUsdValue = (amount: string, token: Token) => {
    if (!amount || !tokenPrices || !token.address) return '';
    let usdPrice = tokenPrices.find((price) => price.tokenAddress.toLowerCase() === token.address.toLowerCase())?.priceUsd ?? 0;
    if (token.address === NATIVE_TOKEN_ADDRESS) {
      usdPrice =
        tokenPrices.find((price) => price.tokenAddress.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase())?.priceUsd ?? 0;
    }
    const usdValue = Number.parseFloat(amount) * usdPrice;
    return `~${formatUSDWithLocale(usdValue, 4, 0, numberLocale)}`;
  };

  const [swapTxHash, setSwapTxHash] = useState<`0x${string}` | null>(null);
  const { isSuccess: isSwapConfirmed } = useWaitForTransactionReceipt({
    hash: swapTxHash as `0x${string}`,
    query: {
      enabled: !!swapTxHash,
    },
  });

  useEffect(() => {
    if (isSwapConfirmed) {
      retroToast.success('Swap transaction confirmed');
      refetchFromTokenData();
      refetchToTokenData();
      setTypedValueIn('');
      setQuote(null);
    }
  }, [isSwapConfirmed]);

  const fromTokenLogoURI = useMemo(() => {
    if (fromToken.address === NATIVE_TOKEN_ADDRESS || fromToken.symbol === 'M') {
      return '/token_m.svg';
    }
    if (fromToken.symbol === 'WM') {
      return '/token_m.svg';
    }
    return tokenList?.find((token) => token.address.toLowerCase() === fromToken.address.toLowerCase())?.logoURI;
  }, [fromToken, tokenList]);

  const toTokenLogoURI = useMemo(() => {
    if (toToken?.address === NATIVE_TOKEN_ADDRESS || toToken?.symbol === 'M') {
      return '/token_m.svg';
    }
    if (toToken?.symbol === 'WM') {
      return '/token_m.svg';
    }
    return tokenList?.find((token) => token.address.toLowerCase() === toToken?.address.toLowerCase())?.logoURI;
  }, [toToken, tokenList]);

  // Swap button state computation
  // Use typedValueIn directly for balance check (not quote which may be null on error)
  const inputAmountNum = typedValueIn ? Number(typedValueIn) : 0;
  const userBalanceNum = fromTokenData?.formattedBalance ? Number(fromTokenData.formattedBalance) : 0;
  const isBalanceInsufficient = inputAmountNum > 0 && userBalanceNum < inputAmountNum;
  const isSimulationBalanceError = simulationData?.revertReason === 'balance' || simulationData?.revertReason === 'gas';
  const isInsufficientBalance = isBalanceInsufficient || isSimulationBalanceError;
  const needsApproval = simulationData?.revertReason === 'allowance';
  const hasQuoteError = !!quoteError;
  const isNoTradesFound = quoteError?.message === 'No trades found';

  // Debug logging
  console.log('[Swap Debug]', {
    inputAmountNum,
    userBalanceNum,
    isBalanceInsufficient,
    isSimulationBalanceError,
    isInsufficientBalance,
    needsApproval,
    hasQuoteError,
    quoteError: quoteError?.message,
    simulationData,
    quote: quote ? { methodName: quote.methodName, inputAmount: quote.inputAmount?.toExact() } : null,
  });

  const isSwapDisabled =
    !quote?.inputAmount ||
    !toToken ||
    !address ||
    isLoading ||
    needsApproval ||
    isInsufficientBalance ||
    hasQuoteError ||
    tradeMutation.isPending;

  // Windows 95 retro box shadow styles
  const retroInsetShadow =
    'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa';
  const retroRaisedShadow =
    'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088';
  const retroInputShadow = 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa';
  const retroErrorShadow =
    'inset 1px 1px 0px 0px #fecaca, inset -1px -1px 0px 0px #991b1b, inset 2px 2px 0px 0px #fee2e2, inset -2px -2px 0px 0px #dc2626';
  const retroWarningShadow =
    'inset 1px 1px 0px 0px #fef3c7, inset -1px -1px 0px 0px #92400e, inset 2px 2px 0px 0px #fef9c3, inset -2px -2px 0px 0px #b45309';

  // Determine swap button styling based on state
  const getSwapButtonStyles = () => {
    if (isInsufficientBalance || hasQuoteError) {
      return { bg: 'bg-red-100', text: 'text-red-600', shadow: retroErrorShadow };
    }
    if (needsApproval) {
      return { bg: 'bg-amber-100', text: 'text-amber-700', shadow: retroWarningShadow };
    }
    return { bg: 'bg-figma-gray-table', text: 'text-[#121213]', shadow: retroRaisedShadow };
  };

  const swapButtonStyles = getSwapButtonStyles();

  // Determine swap button text
  const getSwapButtonText = () => {
    if (isLoading) return null; // handled separately with loader
    if (tradeMutation.isPending) return null; // handled separately with loader
    if (isNoTradesFound) return 'No Route Found';
    if (hasQuoteError) return 'Error Fetching Quote';
    if (isInsufficientBalance) return 'Insufficient Balance';
    if (needsApproval) return 'Approve Token First';
    if (!toToken) return 'Select a Token';
    if (!quote?.inputAmount) return 'Enter an Amount';
    if (!address) return 'Connect Wallet';
    if (quote?.methodName === 'deposit') return 'Wrap';
    if (quote?.methodName === 'withdraw') return 'Unwrap';
    return 'Swap';
  };

  const swapButtonText = getSwapButtonText();

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

      <main className="relative z-10 max-w-screen-2xl mx-auto px-2 sm:px-6 min-h-screen flex items-center justify-center">
        <div className="mx-auto relative w-full" style={{ maxWidth: '600px' }}>
          {/* Ant Animation - Top Right */}
          <div className="absolute top-0 right-0 z-20 opacity-60 pointer-events-none">
            <img src="/animations/ants/ant-animation-1.gif" alt="Ant animation" className="w-24 h-24 object-contain" />
          </div>
          <CardWithHeader title="Swap">
            <div className="p-4">
              {/* From Section */}
              <div className="bg-figma-gray-table p-4 mb-2" style={{ boxShadow: retroInsetShadow }}>
                {/* Label */}
                <span className="text-figma-text-dark text-[10px] mb-3 block" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                  From
                </span>

                {/* Input Box */}
                <div className="bg-white h-[66px] flex items-center justify-between px-4 mb-3" style={{ boxShadow: retroInputShadow }}>
                  {/* Amount Input */}
                  <input
                    type="text"
                    placeholder="0.0"
                    value={typedValueIn}
                    onChange={(e) => setTypedValueIn(e.target.value)}
                    className="bg-transparent text-figma-text-dark text-[24px] w-full outline-none"
                    style={{ fontFamily: '"Press Start 2P", cursive' }}
                  />

                  {/* Token Selector */}
                  <button
                    onClick={() => openTokenModal('from')}
                    className="bg-figma-gray-table h-[38px] px-3 flex items-center gap-2 min-w-[120px]"
                    style={{ boxShadow: retroRaisedShadow }}
                  >
                    {fromTokenLogoURI && <img src={fromTokenLogoURI} alt={fromToken.symbol} className="w-7 h-7 rounded-full" />}
                    <span className="text-figma-text-dark text-[12px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                      {fromToken.symbol}
                    </span>
                    <ChevronDown className="w-4 h-4 text-figma-text-dark" />
                  </button>
                </div>

                {/* Balance Row */}
                <div className="flex items-center justify-between">
                  <span className="text-figma-text-dark text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                    {quote?.inputAmount ? getUsdValue(quote.inputAmount.toExact(), fromToken) : '$0.00'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-figma-text-gray text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                      Balance: {address ? formatNumber(fromTokenData?.formattedBalance || 0, 6, 0, numberLocale) : '0'}
                    </span>
                    <span className="text-figma-text-gray text-[10px]">|</span>
                    <button
                      onClick={handleHalfClick}
                      className="text-figma-text-gray text-[10px] hover:text-figma-text-dark"
                      style={{ fontFamily: '"Press Start 2P", cursive' }}
                    >
                      50%
                    </button>
                    <button
                      onClick={handleMaxClick}
                      className="text-figma-text-gray text-[10px] hover:text-figma-text-dark"
                      style={{ fontFamily: '"Press Start 2P", cursive' }}
                    >
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Swap Direction Button */}
              <div className="flex justify-center -my-3 relative z-10">
                <button
                  onClick={handleSwapTokens}
                  className="bg-figma-gray-table size-[38px] flex items-center justify-center"
                  style={{ boxShadow: retroRaisedShadow }}
                >
                  <ArrowUpDown className="w-[18px] h-[18px] text-figma-text-dark" />
                </button>
              </div>

              {/* To Section */}
              <div className="bg-figma-gray-table p-4 mb-4" style={{ boxShadow: retroInsetShadow }}>
                {/* Label */}
                <span className="text-figma-text-dark text-[10px] mb-3 block" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                  To
                </span>

                {/* Output Box */}
                <div className="bg-white h-[66px] flex items-center justify-between px-4 mb-3" style={{ boxShadow: retroInputShadow }}>
                  {/* Amount Display */}
                  <span className="text-figma-text-dark text-[24px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                    {quote?.outputAmount ? formatNumber(quote.outputAmount.toExact(), 6, 0, numberLocale) : '0.0'}
                  </span>

                  {/* Token Selector */}
                  <button
                    onClick={() => openTokenModal('to')}
                    className="bg-figma-gray-table h-[38px] px-3 flex items-center gap-2 min-w-[120px]"
                    style={{ boxShadow: retroRaisedShadow }}
                  >
                    {toToken ? (
                      <>
                        {toTokenLogoURI && <img src={toTokenLogoURI} alt={toToken.symbol} className="w-7 h-7 rounded-full" />}
                        <span className="text-figma-text-dark text-[12px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                          {toToken.symbol}
                        </span>
                      </>
                    ) : (
                      <span className="text-figma-text-dark text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                        Select
                      </span>
                    )}
                    <ChevronDown className="w-4 h-4 text-figma-text-dark" />
                  </button>
                </div>

                {/* Balance Row */}
                <div className="flex items-center justify-between">
                  <span className="text-figma-text-dark text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                    {quote?.outputAmount && toToken ? getUsdValue(quote.outputAmount.toExact(), toToken) : '$0.00'}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="text-figma-text-gray text-[10px]" style={{ fontFamily: '"Press Start 2P", cursive' }}>
                      Balance: {address ? formatNumber(toTokenData?.formattedBalance || 0, 6, 0, numberLocale) : '0'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Rate Info Section */}
              <div className="bg-figma-gray-light p-4 mb-4 flex items-center justify-between" style={{ boxShadow: retroInsetShadow }}>
                <div className="flex items-center gap-2">
                  <Info className="w-[14px] h-[14px] text-figma-purple" />
                  <span className="font-roboto text-figma-purple text-[14px]">
                    {quote?.executionPrice
                      ? `1 ${fromToken.symbol} = ${formatNumber(quote.executionPrice.toSignificant(6), 6, 0, numberLocale)} ${
                          toToken?.symbol
                        }`
                      : `1 ${fromToken.symbol} = -- ${toToken?.symbol || 'Token'}`}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-figma-purple" />
              </div>

              {/* Slippage Tolerance Section */}
              <div className="bg-figma-gray-table p-4 mb-4 flex items-center justify-between" style={{ boxShadow: retroInsetShadow }}>
                <div className="flex items-center gap-2">
                  <Info className="w-[14px] h-[14px] text-figma-text-dark" />
                  <span className="font-roboto text-figma-text-dark text-[14px]">Slippage Tolerance</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setSlippage('0.5')}
                    className={`h-[38px] w-[60px] font-roboto text-[14px] ${
                      slippage === '0.5' ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-figma-text-dark'
                    }`}
                    style={{
                      boxShadow: slippage === '0.5' ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa' : retroRaisedShadow,
                    }}
                  >
                    0.5%
                  </button>
                  <button
                    onClick={() => setSlippage('1')}
                    className={`h-[38px] w-[60px] font-roboto text-[14px] ${
                      slippage === '1' ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-figma-text-dark'
                    }`}
                    style={{
                      boxShadow: slippage === '1' ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa' : retroRaisedShadow,
                    }}
                  >
                    1.0%
                  </button>
                  <button
                    onClick={() => setSlippage('2')}
                    className={`h-[38px] w-[60px] font-roboto text-[14px] ${
                      slippage === '2' ? 'bg-figma-purple text-white' : 'bg-figma-gray-table text-figma-text-dark'
                    }`}
                    style={{
                      boxShadow: slippage === '2' ? 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa' : retroRaisedShadow,
                    }}
                  >
                    2.0%
                  </button>
                </div>
              </div>

              {/* Approve Button */}
              <ApproveButton
                disabled={quote?.methodName === 'deposit' || quote?.methodName === 'withdraw'}
                tokenAddress={fromToken.address as `0x${string}`}
                spenderAddress={LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID]}
                amountInBigInt={quote?.inputAmount ? parseUnits(quote.inputAmount.toExact(), fromToken.decimals) : BigInt(0)}
                symbol={fromToken.symbol}
                onSuccess={() => {
                  refetch();
                }}
              />

              {/* Swap Button */}
              <button
                className={`w-full h-[59px] ${swapButtonStyles.bg} font-roboto ${swapButtonStyles.text} text-[18px] disabled:cursor-not-allowed flex items-center justify-center gap-2`}
                style={{ boxShadow: swapButtonStyles.shadow }}
                disabled={isSwapDisabled}
                onClick={async () => {
                  if (quote) {
                    const hash = await tradeMutation.mutateAsync();
                    setSwapTxHash(hash);
                  }
                }}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Fetching Best Trade...
                  </>
                ) : tradeMutation.isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Processing...
                  </>
                ) : (
                  swapButtonText
                )}
              </button>

              {/* Add to Wallet */}
              {toToken && address && (
                <div className="text-center mt-4">
                  <button
                    onClick={() => {
                      watchAsset({
                        type: 'ERC20',
                        options: {
                          address: toToken.address as `0x${string}`,
                          symbol: toToken.symbol ?? 'Unknown',
                          decimals: toToken.decimals,
                        },
                      });
                    }}
                    className="text-figma-text-gray hover:text-figma-text-dark font-roboto text-[14px] underline"
                  >
                    Add {toToken.symbol} to Wallet
                  </button>
                </div>
              )}
            </div>
          </CardWithHeader>
        </div>

        {/* Token Selection Modal */}
        <TokenSelectionModal
          isOpen={isTokenModalOpen}
          onClose={() => setIsTokenModalOpen(false)}
          onSelectToken={handleTokenSelect}
          excludeTokenAddresses={
            selectingTokenFor === 'to'
              ? [fromToken.address as `0x${string}`]
              : toToken?.address
              ? [toToken.address as `0x${string}`]
              : undefined
          }
        />
      </main>
    </div>
  );
}
