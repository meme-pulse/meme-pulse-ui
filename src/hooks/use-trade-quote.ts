import { useState } from 'react';
import { usePublicClient, useAccount } from 'wagmi';
import { WNATIVE, Token, TokenAmount, Percent, Price } from '../lib/sdk';
import { LB_ROUTER_V22_ADDRESS, PairV2, RouteV2, TradeV2, type Quote } from '../lib/sdk';
import { LBRouterV22ABI } from '../lib/sdk';
import { BaseError, ContractFunctionRevertedError, getAddress, parseUnits, zeroAddress } from 'viem';
import { DEFAULT_CHAINID } from '@/constants';

interface UseTradeQuoteParams {
  inputToken: Token | null;
  outputToken: Token | null;
  typedValueIn: string | null;
  isExactIn: boolean;
  isNativeIn: boolean;
  isNativeOut: boolean;
}

interface TradeQuoteResult {
  methodName: string;
  args: unknown[];
  value: string;
  exactQuote: TokenAmount;
  executionPrice: Price;
  inputAmount: TokenAmount;
  outputAmount: TokenAmount;
  priceImpact: Percent;
  quote: Quote;
  route: RouteV2;
}

interface SimulationData {
  revertReason: 'allowance' | 'balance' | 'gas' | 'unknown' | null;
}

interface UseTradeQuoteReturn {
  quote: TradeQuoteResult | null;
  simulationData: SimulationData | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
  setQuote: (quote: TradeQuoteResult | null) => void;
}

export function useTradeQuote({
  inputToken,
  outputToken,
  typedValueIn,
  isExactIn,
  isNativeIn,
  isNativeOut,
}: UseTradeQuoteParams): UseTradeQuoteReturn {
  const publicClient = usePublicClient();
  const { address } = useAccount();
  const [quote, setQuote] = useState<TradeQuoteResult | null>(null);
  const [simulationData, setSimulationData] = useState<SimulationData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // const chainId = useChainId();

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const BASES = [
    WNATIVE[DEFAULT_CHAINID],
    new Token(DEFAULT_CHAINID, getAddress('0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb'), 6, 'USDT0', 'USDT0'),
  ];

  const fetchQuote = async () => {
    setIsLoading(true);
    setError(null);
    setSimulationData(null);
    try {
      console.log('fetching quote', { inputToken, outputToken, typedValueIn, isExactIn, isNativeIn, isNativeOut });
      if (!inputToken || !outputToken || !typedValueIn || typedValueIn === '0') throw new Error('Invalid input');
      if (isNativeIn && outputToken.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase()) {
        const typedValueInParsed = parseUnits(typedValueIn, inputToken.decimals);
        const amountIn = new TokenAmount(inputToken, typedValueInParsed);
        setQuote({
          methodName: 'deposit',
          args: [],
          value: typedValueInParsed.toString(),
          exactQuote: amountIn,
          executionPrice: new Price(inputToken, outputToken, 1n, 1n),
          inputAmount: amountIn,
          outputAmount: amountIn,
          priceImpact: new Percent(0n, 10000n),
          quote: {
            route: [],
            pairs: [],
            binSteps: [],
            versions: [],
            amounts: [],
            virtualAmountsWithoutSlippage: [],
            fees: [],
          },
          route: {
            pairs: [],
            path: [],
            input: inputToken,
            output: outputToken,
            pathToStrArr: () => [],
          },
        });
        return;
      }
      if (isNativeOut && inputToken.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase()) {
        const typedValueInParsed = parseUnits(typedValueIn, inputToken.decimals);
        const amountIn = new TokenAmount(inputToken, typedValueInParsed);
        console.log('amountIn', amountIn);
        setQuote({
          methodName: 'withdraw',
          args: [typedValueInParsed],
          value: '0',
          exactQuote: amountIn,
          executionPrice: new Price(inputToken, outputToken, 1n, 1n),
          inputAmount: amountIn,
          outputAmount: amountIn,
          priceImpact: new Percent(0n, 10000n),
          quote: {
            route: [],
            pairs: [],
            binSteps: [],
            versions: [],
            amounts: [],
            virtualAmountsWithoutSlippage: [],
            fees: [],
          },
          route: {
            pairs: [],
            path: [],
            input: inputToken,
            output: outputToken,
            pathToStrArr: () => [],
          },
        });
        return;
      }
      const typedValueInParsed = parseUnits(typedValueIn, inputToken.decimals);
      const amountIn = new TokenAmount(inputToken, typedValueInParsed);
      const allTokenPairs = PairV2.createAllTokenPairs(inputToken, outputToken, BASES);
      const allPairs = PairV2.initPairs(allTokenPairs);
      const allRoutes = RouteV2.createAllRoutes(allPairs, inputToken, outputToken);
      const trades = await TradeV2.getTradesExactIn(
        allRoutes,
        amountIn,
        outputToken,
        isNativeIn,
        isNativeOut,
        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
        // @ts-ignore
        publicClient,
        DEFAULT_CHAINID
      );
      if (trades.length === 0) throw new Error('No trades found');
      const bestTrade: TradeV2 = TradeV2.chooseBestTrade(
        trades.filter((trade) => trade !== undefined),
        isExactIn
      )!;

      const userSlippageTolerance = new Percent('50', '10000'); // 0.5%
      const swapOptions = {
        allowedSlippage: userSlippageTolerance,
        ttl: 3600,
        recipient: address ?? zeroAddress, // ensure string
        feeOnTransfer: false,
      };

      const { methodName, args, value } = bestTrade.swapCallParameters(swapOptions);

      try {
        await publicClient?.simulateContract({
          address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID],
          abi: LBRouterV22ABI,
          functionName: methodName as any,
          args: args as any,
          account: address,
          value: BigInt(value),
        });
      } catch (err) {
        console.log('error simulating contract', args, methodName, value);
        if (err instanceof BaseError) {
          const revertError = err.walk((err) => err instanceof ContractFunctionRevertedError);
          if (revertError instanceof ContractFunctionRevertedError) {
            // For a simple `revert("some reason")`
            // console.log('Simple Revert Reason:', revertError.revertReason);
            // Or access the data directly if it's a custom error with named parameters
            // console.log('Revert Data:', revertError.data);

            // If it's a custom error defined in your ABI, Viem will often decode it automatically
            if (revertError.data?.args) {
              console.log('Custom Error Args:', revertError.data.args[0] as string);
              // ERC20: transfer amount exceeds balance
              // ERC20: transfer amount exceeds allowance
              if (revertError.data.args[0] === 'ERC20: transfer amount exceeds balance') {
                console.log('Transfer amount exceeds balance');
                setSimulationData({ revertReason: 'balance' });
              } else if (revertError.data.args[0] === 'ERC20: transfer amount exceeds allowance') {
                console.log('Transfer amount exceeds allowance');
                setSimulationData({ revertReason: 'allowance' });
              }

              // If your CustomError has a 'reason' parameter
              // if (revertError.data.args.reason) {
              // console.log('Custom Error Reason:', revertError.data.args.reason);
              // }
            }
          } else {
            console.log(err.shortMessage);
            console.error('Non-revert error:', err.shortMessage || err.message);
            if (err.shortMessage.includes('exceeds the balance of the account')) {
              setSimulationData({ revertReason: 'gas' });
            }
          }
        } else {
          console.error('Unknown error:', err);
        }
      }

      setQuote({
        methodName,
        args,
        value,
        exactQuote: bestTrade.exactQuote,
        executionPrice: bestTrade.executionPrice,
        inputAmount: bestTrade.inputAmount,
        outputAmount: bestTrade.outputAmount,
        priceImpact: bestTrade.priceImpact,
        quote: bestTrade.quote,
        route: bestTrade.route,
      });

      console.log('quote fetched', {
        methodName,
        args,
        value,
        exactQuote: bestTrade.exactQuote,
        executionPrice: bestTrade.executionPrice,
        inputAmount: bestTrade.inputAmount,
        outputAmount: bestTrade.outputAmount,
        priceImpact: bestTrade.priceImpact,
        quote: bestTrade.quote,
        route: bestTrade.route,
      });
    } catch (err) {
      console.log('error fetching quote', err);
      setError(err as Error);
      setQuote(null);
    } finally {
      setIsLoading(false);
    }
  };

  return { quote, simulationData, isLoading, error, refetch: fetchQuote, setQuote };
}
