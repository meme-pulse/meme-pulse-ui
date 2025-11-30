import { useState, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowUpDown, ChevronDown, Loader2 } from 'lucide-react';
import TokenSelectionModal from '@/token-selection-modal';
import { useTradeQuote } from './hooks/use-trade-quote';
import { useAccount, useWaitForTransactionReceipt, useWatchAsset } from 'wagmi';
import { NATIVE_TOKEN_ADDRESS, useTokenData } from './hooks/use-token-data';
import { parseUnits, zeroAddress } from 'viem';
import { useTokenList } from './hooks/use-token-list';
import debounce from 'lodash.debounce';
import { useTradeExecute } from './hooks/use-trade-execute';
import { useTokenPrices } from './hooks/use-token-price';
import { Card } from './components/ui/card';
import { SwapSettingPopover } from './components/swap-setting-popover';
import ApproveButton from './components/approve-button';
import { toast } from 'sonner';
import { DEFAULT_CHAINID } from './constants';
import { LB_ROUTER_V22_ADDRESS } from './lib/sdk';
import { Token, WNATIVE } from './lib/sdk';
import { formatNumber, formatUSDWithLocale } from './lib/format';
import { useLocalStorage } from 'usehooks-ts';

export default function SwapComponent() {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const { address } = useAccount();
  const { watchAsset } = useWatchAsset();
  const { data: tokenList } = useTokenList();
  const initialFromTokenHYPE = new Token(DEFAULT_CHAINID, zeroAddress, 18, 'HYPE', 'HYPE');
  // const USDT = new Token(DEFAULT_CHAINID, checksumAddress('0x201eba5cc46d216ce6dc03f6a759e8e766e956ae'), 6, 'USDT', 'Tether USD');

  const [fromToken, setFromToken] = useState<Token>(initialFromTokenHYPE);
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

  const { quote, simulationData, isLoading, refetch, setQuote } = useTradeQuote({
    inputToken: fromToken.address === NATIVE_TOKEN_ADDRESS ? WNATIVE[DEFAULT_CHAINID] : fromToken,
    outputToken: toToken?.address === NATIVE_TOKEN_ADDRESS ? WNATIVE[DEFAULT_CHAINID] : toToken,
    typedValueIn: debouncedValue,
    isExactIn: true,
    isNativeIn: fromToken.address === NATIVE_TOKEN_ADDRESS, // if the input token is native
    isNativeOut: toToken?.address === NATIVE_TOKEN_ADDRESS, // if the output token is native
  });

  const tradeMutation = useTradeExecute({
    methodName: quote?.methodName ?? '',
    args: quote?.args ?? [],
    value: quote?.value ?? '',
  });

  const [isTokenModalOpen, setIsTokenModalOpen] = useState(false);
  const [selectingTokenFor, setSelectingTokenFor] = useState<'from' | 'to'>('from');

  // exchange rate calculation
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
      // setFromAmount(toAmount);
      // setToAmount(fromAmount);
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
      usdPrice = tokenPrices.find((price) => price.tokenAddress.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase())?.priceUsd ?? 0;
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
      toast.success('Swap transaction confirmed');
      refetchFromTokenData();
      refetchToTokenData();
      setTypedValueIn('');
      setQuote(null);
    }
  }, [isSwapConfirmed]);

  const fromTokenLogoURI = useMemo(() => {
    if (fromToken.address === NATIVE_TOKEN_ADDRESS) {
      return '/tokens/hype.png';
    }
    return tokenList?.find((token) => token.address.toLowerCase() === fromToken.address.toLowerCase())?.logoURI;
  }, [fromToken, tokenList]);

  const toTokenLogoURI = useMemo(() => {
    if (toToken?.address === NATIVE_TOKEN_ADDRESS) {
      return '/tokens/hype.png';
    }
    return tokenList?.find((token) => token.address.toLowerCase() === toToken?.address.toLowerCase())?.logoURI;
  }, [toToken, tokenList]);

  return (
    <div className="min-h-[90vh]  relative overflow-hidden">
      <main className="relative z-10 max-w-screen-2xl mx-auto px-2 sm:px-6  py-8">
        <Card className="bg-card mx-auto px-6 py-8 mt-10 shadow-xl border border-border/50" style={{ maxWidth: '500px' }}>
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-xl font-semibold text-foreground">Swap</h2>
            <div className="flex items-center gap-2">
              {/* <Button variant="ghost" size="sm" className="text-green-dark-300 hover:text-green-dark-100" onClick={() => refetch()}>
                <RefreshCw className="w-4 h-4" />
              </Button> */}
              <SwapSettingPopover />
            </div>
          </div>

          {/* From Section */}
          <div className="space-y-4 p-5 bg-muted/30 rounded-lg border border-border/50 pb-6 mb-2">
            {/* First row: Label + Percentage buttons */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Swap from</span>
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHalfClick}
                  className="hover:border-0 text-primary hover:text-primary/80 px-2 py-1 text-xs rounded-md bg-muted"
                >
                  25%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleHalfClick}
                  className="hover:border-0 text-primary hover:text-primary/80 px-2 py-1 text-xs rounded-md bg-muted"
                >
                  50%
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleMaxClick}
                  className="hover:border-0 text-primary hover:text-primary/80 px-2 py-1 text-xs rounded-md bg-muted"
                >
                  Max
                </Button>
              </div>
            </div>

            {/* Second row: Token selector + Input */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-3 text-foreground border border-border rounded-lg min-w-[120px]"
                onClick={() => openTokenModal('from')}
              >
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                  {fromTokenLogoURI && <img src={fromTokenLogoURI} alt={fromToken.symbol} className="w-6 h-6" />}
                </div>
                <span className="font-medium">{fromToken.symbol}</span>
                <ChevronDown className="w-4 h-4" />
              </Button>

              <Input
                placeholder="Amount"
                value={typedValueIn}
                onChange={(e) => setTypedValueIn(e.target.value)}
                className="border-0 bg-transparent font-semibold flex-1 py-2 w-full min-h-[48px] pl-1 focus-visible:ring-0 md:text-2xl text-foreground placeholder:text-muted-foreground text-right"
              />
            </div>

            {/* Third row: Balance + USD value */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Balance: {address ? formatNumber(fromTokenData?.formattedBalance || 0, 18, 0, numberLocale) : '0.188259'}
              </div>
              <div className="text-xs text-muted-foreground">
                {quote?.inputAmount ? getUsdValue(quote.inputAmount.toExact(), fromToken) : '≈ $0.00'}
              </div>
            </div>
          </div>

          {/* Swap Direction Button */}
          <div className="flex justify-center relative -my-4  z-20">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSwapTokens}
              className="hover:bg-muted border-2 rounded-full p-2 border-primary bg-card shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <ArrowUpDown className="w-4 h-4 text-primary" />
            </Button>
          </div>

          {/* To Section */}
          <div className="space-y-4 p-5 bg-muted/30 rounded-lg border border-border/50 pt-6 mb-2">
            {/* First row: Label */}
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">To</span>
            </div>

            {/* Second row: Token selector + Output display */}
            <div className="flex items-center gap-3">
              <Button
                variant="ghost"
                className="flex items-center gap-2 p-3 text-foreground border border-border rounded-lg min-w-[120px]"
                onClick={() => openTokenModal('to')}
              >
                {toToken ? (
                  <>
                    <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center text-primary-foreground text-xs font-bold">
                      {toTokenLogoURI && <img src={toTokenLogoURI} alt={toToken.symbol} className="w-6 h-6" />}
                    </div>
                    <span className="font-medium">{toToken.symbol}</span>
                  </>
                ) : (
                  <>
                    <span className="font-medium">Select token</span>
                  </>
                )}
                <ChevronDown className="w-4 h-4" />
              </Button>

              <div className="flex-1">
                <div className="md:text-2xl font-semibold flex-1 py-2 w-full min-h-[48px] flex items-center justify-end text-foreground overflow-hidden">
                  {quote?.outputAmount ? quote.outputAmount.toExact() : '0.0'}
                </div>
              </div>
            </div>

            {/* Third row: Balance + USD value */}
            <div className="flex items-center justify-between">
              <div className="text-sm text-muted-foreground">
                Balance: {address ? formatNumber(toTokenData?.formattedBalance || 0, 18, 0, numberLocale) : '0'}
              </div>
              <div className="text-xs text-muted-foreground">
                {quote?.outputAmount && toToken ? getUsdValue(quote.outputAmount.toExact(), toToken) : '≈ $0.00'}
              </div>
            </div>
          </div>

          {/* Rate Section */}
          <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border/30 mb-6">
            <div className="flex items-center justify-between">
              <span className="text-sm text-muted-foreground">Rate</span>
              <div className="flex items-center gap-1">
                {/* <ArrowUpDown className="w-3 h-3 text-muted-foreground" /> */}
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              </div>
            </div>
            {quote?.executionPrice && (
              <div className="text-sm text-muted-foreground">
                1 {fromToken.symbol} = {formatNumber(quote.executionPrice.toSignificant(6), 6, 0, numberLocale)} {toToken?.symbol}
              </div>
            )}
          </div>

          {/* {simulationData?.revertReason === 'allowance' && (
            <Button
              className="w-full h-12 text-lg bg-green-dark-600 hover:bg-green-dark-500 text-green-dark-950 mb-4"
              disabled={!quote?.inputAmount || !toToken || !address}
              onClick={() => handleApproveTokenCall(fromToken.address)}
            >
              {isApproveTokenLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve ${fromToken.symbol}`}
            </Button>
          )} */}
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
          <div className="mb-6">
            <Button
              className="w-full h-12 text-lg bg-primary hover:bg-primary/90 text-primary-foreground disabled:opacity-50 border border-primary"
              disabled={
                !quote?.inputAmount ||
                !toToken ||
                !address ||
                isLoading ||
                simulationData?.revertReason === 'allowance' ||
                simulationData?.revertReason === 'balance' ||
                simulationData?.revertReason === 'gas' ||
                tradeMutation.isPending
              }
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
              ) : (
                <>
                  {simulationData?.revertReason === 'balance' || simulationData?.revertReason === 'gas'
                    ? 'Insufficient Balance'
                    : quote?.methodName === 'deposit'
                    ? 'Wrap'
                    : quote?.methodName === 'withdraw'
                    ? 'Unwrap'
                    : 'Swap'}
                </>
              )}
            </Button>
          </div>

          {/* Add to Wallet */}
          {toToken && address && (
            <div className="text-center">
              <Button
                variant="link"
                className="text-muted-foreground"
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
              >
                Add {toToken.symbol} to Wallet
              </Button>
            </div>
          )}

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
        </Card>
      </main>
    </div>
  );
}
