// import { useEffect, useMemo, useState } from 'react';
// import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
// import { Button } from '@/components/ui/button';
// import { Input } from '@/components/ui/input';
// import { Card, CardContent } from '@/components/ui/card';
// import { Label } from '@/components/ui/label';
// import { ExternalLink, RotateCcw } from 'lucide-react';
// import { type PoolData } from '../../PoolDetail';
// import { NATIVE_TOKEN_ADDRESS, useTokensData } from '@/hooks/use-token-data';
// import { useAccount, usePublicClient, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
// import {
//   getBidAskDistributionFromBinRange,
//   getCurveDistributionFromBinRange,
//   getUniformDistributionFromBinRange,
//   jsonAbis,
//   LB_ROUTER_V22_ADDRESS,
//   LIQUIDITY_HELPER_V2_ADDRESS,
//   LiquidityDistribution,
//   // PairV2,
// } from 'sdk-v2';
// import { Token, TokenAmount, WNATIVE } from 'sdk-core';
// import { getIdFromPrice, getPriceFromId } from '@/lib/bin';
// import { DualRangeSlider } from '../ui/dual-range-slider';
// import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, Cell, ReferenceLine } from 'recharts';
// import { useDebounce } from '@/hooks/use-debounce';
// import { parseUnits, zeroAddress } from 'viem';
// import { useUserLiquidityBinIds } from '@/hooks/use-user-liquidity-bin-ids';
// import { useBinAllowance } from '@/hooks/use-allowance';
// import { Loader2 } from 'lucide-react';
// import { useQuery } from '@tanstack/react-query';
// import ApproveButton from '../approve-button';
// import { useLocalStorage, useMediaQuery } from 'usehooks-ts';
// import AddLiquidityButton from '../add-liquidity-button';
// import { useActiveId } from '@/hooks/use-active-id';
// import { DEFAULT_CHAINID } from '@/constants';
// import { useTokenList } from '@/hooks/use-token-list';
// import { toast } from 'sonner';
// import TokenTicker from '../token-ticker';
// import AutoFillSwitch from '../auto-fill-switch';
// import { formatNumber, formatStringOnlyLocale, getNumberStringValue, getNumberValue } from '@/lib/format';
// import { useBigBlock } from '@/hooks/use-big-block';
// import PriceDiffWarning from '../price-diff-warning';

// const liquidityShapes = [
//   {
//     id: LiquidityDistribution.SPOT,
//     name: 'Spot',
//     icon: '/shape_spot.svg',
//     description: 'Concentrated liquidity',
//   },
//   {
//     id: LiquidityDistribution.CURVE,
//     name: 'Curve',
//     icon: '/shape_curve.svg',
//     description: 'Curved distribution',
//   },
//   {
//     id: LiquidityDistribution.BID_ASK,
//     name: 'Bid-Ask',
//     icon: '/shape_bidask.svg',
//     description: 'Bid-ask spread',
//   },
// ];

// const CustomLiquidityTooltip = ({
//   active,
//   payload,
//   tokenXSymbol,
//   tokenYSymbol,
// }: {
//   active?: boolean;
//   payload?: { payload: { bin: number; x: number; y: number; price: number } }[];
//   tokenXSymbol: string;
//   tokenYSymbol: string;
// }) => {
//   const [numberLocale] = useLocalStorage('number-locale', navigator.language);
//   if (active && payload && payload.length) {
//     const data = payload[0].payload;
//     return (
//       <div className="bg-card p-3 border border-border rounded-lg shadow-lg pointer-events-none" style={{ zIndex: 1000 }}>
//         <div className="space-y-1">
//           <p className="text-sm">
//             <p className="font-medium text-foreground">
//               Price ({tokenXSymbol} / {tokenYSymbol} )
//             </p>
//             <p className="font-medium text-foreground">{formatNumber(data.price, 18, 0, numberLocale)}</p>
//           </p>
//           {Number(data.x) > 0 && (
//             <p className="text-sm">
//               <span className="text-foreground00">{tokenXSymbol}:</span>{' '}
//               <span className="font-medium text-foreground">{formatNumber(data.x, 18, 0, numberLocale)}</span>
//             </p>
//           )}
//           {Number(data.y) > 0 && (
//             <p className="text-sm">
//               <span className="text-foreground00">{tokenYSymbol}:</span>{' '}
//               <span className="font-medium text-foreground">{formatNumber(data.y, 18, 0, numberLocale)}</span>
//             </p>
//           )}
//         </div>
//       </div>
//     );
//   }
//   return null;
// };
// // Helper to build chart data from simulatedDistribution
// function buildChartData(
//   simulatedDistribution: { binIds: number[]; distributionX: bigint[]; distributionY: bigint[] } | null,
//   typedAmountX: string,
//   typedAmountY: string,
//   lbBinStep: number,
//   tokenXDecimals: number,
//   tokenYDecimals: number,
//   yBaseCurrency: boolean
// ) {
//   if (!simulatedDistribution) return [];

//   const denominator = 1e18;
//   const amountX = Number(typedAmountX) || 0;
//   const amountY = Number(typedAmountY) || 0;
//   return simulatedDistribution.binIds.map((binId, i) => {
//     const price = yBaseCurrency
//       ? (1 / getPriceFromId(binId, lbBinStep)) * 10 ** (tokenYDecimals - tokenXDecimals)
//       : getPriceFromId(binId, lbBinStep) * 10 ** (tokenXDecimals - tokenYDecimals);
//     return {
//       bin: binId,
//       x: (Number(simulatedDistribution.distributionX[i]) / denominator) * amountX,
//       y: (Number(simulatedDistribution.distributionY[i]) / denominator) * amountY,
//       price: price,
//       yHeight: (yBaseCurrency ? price : 1 / price) * (Number(simulatedDistribution.distributionY[i]) / denominator) * amountY,
//       xHeight: (Number(simulatedDistribution.distributionX[i]) / denominator) * amountX,
//     };
//   });
// }

// export function LiquidityActionsCard({
//   poolData: originalPoolData,
//   yBaseCurrency,
//   setYBaseCurrency,
// }: {
//   poolData: PoolData;
//   yBaseCurrency: boolean;
//   setYBaseCurrency: (yBaseCurrency: boolean) => void;
// }) {
//   const { isUsingBigBlocks } = useBigBlock();
//   const [isNativeIn, setIsNativeIn] = useState(false);
//   const [numberLocale] = useLocalStorage('number-locale', navigator.language);
//   const isMobile = useMediaQuery('(max-width: 768px)');
//   const [liquidityTolerance] = useLocalStorage('liquidity-tolerance', 0.1);
//   const [binCountLimit] = useLocalStorage('bin-count-limit', '21');
//   const [autoFill] = useLocalStorage('autoFill', false);
//   const [activeTab, setActiveTab] = useState('add');
//   const activeId = useActiveId(originalPoolData.pairAddress as `0x${string}`, originalPoolData.activeBinId);
//   const { data: tokenListData } = useTokenList();
//   // const [priceMode, setPriceMode] = useState('range');
//   const [sliderPriceRange, setSliderPriceRange] = useState<[number, number]>([-10, 10]);
//   const [sliderMinValue, setSliderMinValue] = useState(-10);
//   const [sliderMaxValue, setSliderMaxValue] = useState(10);
//   const [minPriceBinId, setMinPriceBinId] = useState(activeId - 10);
//   const [maxPriceBinId, setMaxPriceBinId] = useState(activeId + 10);
//   const publicClient = usePublicClient();

//   const poolData = useMemo(() => {
//     if (originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn) {
//       return {
//         ...originalPoolData,
//         tokenX: { ...originalPoolData.tokenX, symbol: 'HYPE', address: NATIVE_TOKEN_ADDRESS as `0x${string}` },
//       };
//     } else if (originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn) {
//       return {
//         ...originalPoolData,
//         tokenY: { ...originalPoolData.tokenY, symbol: 'HYPE', address: NATIVE_TOKEN_ADDRESS as `0x${string}` },
//       };
//     } else {
//       return originalPoolData;
//     }
//   }, [originalPoolData, isNativeIn]);
//   //

//   // active

//   // const minPriceWithDecimalsRef = useRef<HTMLInputElement>(null);
//   // const minPricePercentRef = useRef<HTMLInputElement>(null);
//   // const maxPriceWithDecimalsRef = useRef<HTMLInputElement>(null);
//   // const maxPricePercentRef = useRef<HTMLInputElement>(null);
//   // const numBinsRef = useRef<HTMLInputElement>(null);
//   const [minPriceWithDecimals, setMinPriceWithDecimals] = useState('');
//   const [minPricePercent, setMinPricePercent] = useState('');
//   const [maxPriceWithDecimals, setMaxPriceWithDecimals] = useState('');
//   const [maxPricePercent, setMaxPricePercent] = useState('');
//   const [numBins, setNumBins] = useState('');

//   const currentPriceWithDecimals = useMemo(
//     () =>
//       yBaseCurrency
//         ? (1 / getPriceFromId(activeId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//         : getPriceFromId(activeId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
//     [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals, yBaseCurrency]
//   );
//   const currentPriceXInYWithDecimals = useMemo(
//     () => getPriceFromId(activeId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
//     [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
//   );
//   const currentPriceYInXWithDecimals = useMemo(
//     () => (1 / getPriceFromId(activeId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals),
//     [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
//   );

//   const onAddLiquidityParamChange = (action: string, value: string) => {
//     // 1. min Price value change -> (set minPricePercent, set numBins, set sliderPriceRange , set minPriceBinId)
//     // 2. min Price percent value change -> (set minPriceWithDecimals, set numBins, set sliderPriceRange , set minPriceBinId)
//     // 3. max Price value change -> (set maxPricePercent, set numBins, set sliderPriceRange , set maxPriceBinId)
//     // 4. max Price percent value change -> (set maxPriceWithDecimals, set numBins, set sliderPriceRange , set maxPriceBinId)
//     // 5. numBins value change -> (set sliderPriceRange ,  set maxPriceBinId, set maxPrice, setMaxPricePercent)
//     // 6-1. on slider min changes -> (set minPriceBinId, set minPriceWithDecimals, set minPricePercent, set numBins)
//     // 6-2. on slider max changes -> (set maxPriceBinId, set maxPriceWithDecimals, set maxPricePercent, set numBins)

//     // 1. min Price value change
//     if (action === 'minPriceValueChange') {
//       // set minPricePercent, set numBins, set sliderPriceRange , set minPriceBinId
//       const minPriceRefValue = value;
//       if (minPriceRefValue === '' || minPriceRefValue === '.') {
//         return;
//       }

//       const price = getNumberValue(minPriceRefValue, numberLocale);
//       if (isNaN(price) || price < 0 || minPriceRefValue.endsWith('.')) {
//         return;
//       } else {
//         const binId = yBaseCurrency
//           ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
//           : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

//         if (binId === Infinity || binId === -Infinity) {
//           return;
//         }

//         const priceFromId = yBaseCurrency
//           ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//           : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//         // console.log(price, 'priceFromRealBinId', priceFromId);
//         setMinPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));
//         setMinPriceBinId(binId);
//         const awayFromActiveId = binId - activeId;
//         setSliderMinValue(awayFromActiveId);
//         setSliderPriceRange((prev) => [awayFromActiveId, prev[1]]);
//         setNumBins((maxPriceBinId - binId + 1).toString());

//         // caclulate percent from current price
//         const percent = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;
//         setMinPricePercent(formatNumber(percent, 2, 0, numberLocale));

//         // when minPrice is greater than maxPrice, set maxPrice to minPrice
//         // if (price > maxPriceWithDecimals) {
//         // setMaxPriceWithDecimals(price.toString());
//         // setMaxPricePercent((((Number(price) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100).toString());
//         // }
//       }
//     } else if (action === 'minPricePercentChange') {
//       // set minPriceWithDecimals, set numBins, set sliderPriceRange , set minPriceBinId
//       const minPricePercentRefValue = value;
//       const percentage = getNumberValue(minPricePercentRefValue, numberLocale);
//       const newPriceWithDecimals = currentPriceWithDecimals * (1 + percentage / 100);

//       const price = Number(newPriceWithDecimals);
//       if (isNaN(price) || price < 0 || newPriceWithDecimals.toString().endsWith('.')) {
//         return;
//       } else {
//         const binId = yBaseCurrency
//           ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
//           : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

//         if (binId === Infinity || binId === -Infinity) {
//           return;
//         }

//         const priceFromId = yBaseCurrency
//           ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//           : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//         const percentFromPriceFromId = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;

//         setMinPriceBinId(binId);
//         const awayFromActiveId = binId - activeId;
//         setSliderMinValue(awayFromActiveId);
//         setSliderPriceRange((prev) => [awayFromActiveId, prev[1]]);
//         setNumBins((maxPriceBinId - binId + 1).toString());
//         setMinPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));
//         setMinPricePercent(formatNumber(percentFromPriceFromId, 2, 0, numberLocale));
//       }
//     }
//     if (action === 'maxPriceValueChange') {
//       // set maxPricePercent, set numBins, set sliderPriceRange , set maxPriceBinId
//       const maxPriceRefValue = value;
//       if (maxPriceRefValue === '' || maxPriceRefValue === '.') {
//         return;
//       }

//       const price = getNumberValue(maxPriceRefValue, numberLocale);
//       if (isNaN(price) || price < 0 || maxPriceRefValue.endsWith('.')) {
//         return;
//       } else {
//         const binId = yBaseCurrency
//           ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
//           : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

//         if (binId === Infinity || binId === -Infinity) {
//           return;
//         }

//         const priceFromId = yBaseCurrency
//           ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//           : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//         setMaxPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));
//         setMaxPriceBinId(binId);
//         const awayFromActiveId = binId - activeId;
//         setSliderMaxValue(awayFromActiveId);
//         setSliderPriceRange((prev) => [prev[0], awayFromActiveId]);

//         setNumBins((binId - minPriceBinId + 1).toString());

//         // caclulate percent from current price
//         const percent = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;
//         setMaxPricePercent(formatNumber(percent, 2, 0, numberLocale));
//       }
//     } else if (action === 'maxPricePercentChange') {
//       // set maxPriceWithDecimals, set numBins, set sliderPriceRange , set maxPriceBinId
//       const maxPricePercentRefValue = value;
//       const percentage = getNumberValue(maxPricePercentRefValue, numberLocale);
//       const newPriceWithDecimals = currentPriceWithDecimals * (1 + percentage / 100);

//       const price = Number(newPriceWithDecimals);
//       if (isNaN(price) || price < 0 || newPriceWithDecimals.toString().endsWith('.')) {
//         return;
//       } else {
//         const binId = yBaseCurrency
//           ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
//           : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

//         if (binId === Infinity || binId === -Infinity) {
//           return;
//         }

//         const priceFromId = yBaseCurrency
//           ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//           : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//         setMaxPriceBinId(binId);
//         const awayFromActiveId = binId - activeId;
//         setSliderMaxValue(awayFromActiveId);
//         setSliderPriceRange((prev) => [prev[0], awayFromActiveId]);

//         setNumBins((binId - minPriceBinId + 1).toString());
//         setMaxPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));

//         const percentFromPriceFromId = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;

//         setMaxPricePercent(formatNumber(percentFromPriceFromId, 2, 0, numberLocale));
//       }
//     }
//     if (action === 'numBinsChange') {
//       // alway change maxbinid
//       const numBins = Number(value);
//       if (isNaN(numBins) || value.toString().endsWith('.')) {
//         return;
//       }

//       const maxBinId = minPriceBinId + numBins - 1;

//       const awayFromActiveId = maxBinId - activeId;
//       setSliderMaxValue(awayFromActiveId);
//       setSliderPriceRange((prev) => [prev[0], awayFromActiveId]);
//       setMaxPriceBinId(maxBinId);
//       const newMaxPriceWithDecimals = yBaseCurrency
//         ? (1 / getPriceFromId(maxBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//         : getPriceFromId(maxBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//       setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
//       setMaxPricePercent(
//         formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//       );
//     }
//   };

//   // when ybasecurrency change, set the value of the input
//   useEffect(() => {
//     const newMinPriceWithDecimals = yBaseCurrency
//       ? (1 / getPriceFromId(activeId - 10, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//       : getPriceFromId(activeId - 10, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//     const newMaxPriceWithDecimals = yBaseCurrency
//       ? (1 / getPriceFromId(activeId + 10, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//       : getPriceFromId(activeId + 10, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//     setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
//     setMinPricePercent(
//       formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//     );
//     setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
//     setMaxPricePercent(
//       formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//     );
//     setNumBins((maxPriceBinId - minPriceBinId + 1).toString());
//   }, [yBaseCurrency, activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]);
//   const onSliderChange = (sliderValues: number[]) => {
//     const minValue = sliderValues[0];
//     const maxValue = sliderValues[1];
//     setSliderMinValue(minValue);
//     setSliderMaxValue(maxValue);

//     if (yBaseCurrency) {
//       const minBinId = activeId + sliderPriceRange[0] - (maxValue - sliderPriceRange[1]);
//       setMinPriceBinId(minBinId);
//       const newMinPriceWithDecimals = yBaseCurrency
//         ? (1 / getPriceFromId(minBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//         : getPriceFromId(minBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
//       setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
//       setMinPricePercent(
//         formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//       );

//       const maxBinId = activeId + sliderPriceRange[1] - (minValue - sliderPriceRange[0]);
//       setMaxPriceBinId(maxBinId);
//       const newMaxPriceWithDecimals = yBaseCurrency
//         ? (1 / getPriceFromId(maxBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//         : getPriceFromId(maxBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
//       setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
//       setMaxPricePercent(
//         formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//       );
//     } else {
//       const minBinId = activeId + minValue;
//       setMinPriceBinId(minBinId);
//       const newMinPriceWithDecimals = yBaseCurrency
//         ? (1 / getPriceFromId(minBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//         : getPriceFromId(minBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
//       setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
//       setMinPricePercent(
//         formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//       );

//       const maxBinId = activeId + maxValue;
//       setMaxPriceBinId(maxBinId);
//       const newMaxPriceWithDecimals = yBaseCurrency
//         ? (1 / getPriceFromId(maxBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//         : getPriceFromId(maxBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
//       setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
//       setMaxPricePercent(
//         formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//       );
//     }

//     setNumBins((maxValue - minValue + 1).toString());
//   };

//   const onResetPriceRange = () => {
//     setSliderPriceRange([-10, 10]);

//     setSliderMinValue(-10);
//     setSliderMaxValue(10);

//     setMinPriceBinId(activeId - 10);
//     setMaxPriceBinId(activeId + 10);

//     const newMinPriceWithDecimals = yBaseCurrency
//       ? (1 / getPriceFromId(activeId - 10, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//       : getPriceFromId(activeId - 10, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//     setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
//     setMinPricePercent(
//       formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//     );

//     const newMaxPriceWithDecimals = yBaseCurrency
//       ? (1 / getPriceFromId(activeId + 10, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//       : getPriceFromId(activeId + 10, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//     setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
//     setMaxPricePercent(
//       formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//     );

//     setNumBins((activeId + 10 - (activeId - 10) + 1).toString());

//     setEasyModePreset(null);
//   };

//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const [easyModePreset, setEasyModePreset] = useState<0 | 1 | 2 | 5 | 10 | null>(null);
//   const [easyModeEnabled] = useState(true);
//   const onSetPriceRange = (percent: number) => {
//     const currentBinStep = poolData.lbBinStep;

//     let lower_bin_id = activeId;
//     let upper_bin_id = activeId;

//     if (poolData.lbBinStep === 1) {
//       if (percent === 0) {
//         lower_bin_id = activeId;
//         upper_bin_id = activeId;
//       }
//       if (percent === 1) {
//         lower_bin_id = activeId - 1;
//         upper_bin_id = activeId + 1;
//       } else if (percent === 2) {
//         lower_bin_id = activeId - 2;
//         upper_bin_id = activeId + 2;
//       } else if (percent === 5) {
//         const bins_for_percent = Math.floor((1 * 100) / currentBinStep);
//         lower_bin_id = activeId - bins_for_percent;
//         upper_bin_id = activeId + bins_for_percent;
//       }
//     } else {
//       const bins_for_percent = Math.floor((percent * 100) / currentBinStep);
//       lower_bin_id = activeId - bins_for_percent;
//       upper_bin_id = activeId + bins_for_percent;
//     }
//     const lowerBinAwayFromActiveId = lower_bin_id - activeId;
//     const upperBinAwayFromActiveId = upper_bin_id - activeId;

//     setSliderPriceRange([lowerBinAwayFromActiveId, upperBinAwayFromActiveId]);
//     setSliderMinValue(lowerBinAwayFromActiveId);
//     setSliderMaxValue(upperBinAwayFromActiveId);
//     setMinPriceBinId(lower_bin_id);
//     setMaxPriceBinId(upper_bin_id);

//     const newMinPriceWithDecimals = yBaseCurrency
//       ? (1 / getPriceFromId(lower_bin_id, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//       : getPriceFromId(lower_bin_id, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//     setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));

//     setMinPricePercent(
//       formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//     );

//     const newMaxPriceWithDecimals = yBaseCurrency
//       ? (1 / getPriceFromId(upper_bin_id, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//       : getPriceFromId(upper_bin_id, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

//     setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
//     setMaxPricePercent(
//       formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
//     );

//     setNumBins((upper_bin_id - lower_bin_id + 1).toString());
//     setEasyModePreset(percent as 0 | 1 | 2 | 5 | 10);
//   };

//   const { address } = useAccount();

//   const { data: tokenBalanceData, refetch: refetchTokenBalanceData } = useTokensData({
//     tokenAddresses: [poolData.tokenX.address as `0x${string}`, poolData.tokenY.address as `0x${string}`, zeroAddress],
//     enabled: true,
//   });
//   const [typedAmountX, setTypedAmountX] = useState('');
//   const [typedAmountY, setTypedAmountY] = useState('');

//   const [selectedShape, setSelectedShape] = useState<LiquidityDistribution>(LiquidityDistribution.SPOT);

//   // const publicClient = usePublicClient();
//   // const tokenX = useMemo(
//   //   () =>
//   //     new Token(
//   //       DEFAULT_CHAINID,
//   //       poolData.tokenX.address as `0x${string}`,
//   //       poolData.tokenX.decimals,
//   //       poolData.tokenX.symbol,
//   //       poolData.tokenX.name
//   //     ),
//   //   [poolData.tokenX]
//   // );
//   // const tokenY = useMemo(
//   //   () =>
//   //     new Token(
//   //       DEFAULT_CHAINID,
//   //       poolData.tokenY.address as `0x${string}`,
//   //       poolData.tokenY.decimals,
//   //       poolData.tokenY.symbol,
//   //       poolData.tokenY.name
//   //     ),
//   //   [poolData.tokenY]
//   // );

//   // const [pair, setPair] = useState<PairV2 | null>(null);
//   // useEffect(() => {
//   //   const fetchLBPair = async () => {
//   //     const pair = new PairV2(tokenX, tokenY);
//   //     setPair(pair);
//   //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   //     // @ts-ignore
//   //     const lbPair = await pair.fetchLBPair(poolData.lbBinStep, 'v22', publicClient, DEFAULT_CHAINID);
//   //     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//   //     // @ts-ignore
//   //     await PairV2.getLBPairReservesAndId(lbPair.LBPair, 'v22', publicClient);
//   //   };
//   //   fetchLBPair();
//   // }, [tokenX, tokenY, poolData.lbBinStep, publicClient]);

//   const debouncedAmountX = useDebounce(
//     (() => {
//       try {
//         const cleanedTypedAmountX = getNumberStringValue(typedAmountX, numberLocale);
//         parseUnits(cleanedTypedAmountX, poolData.tokenX.decimals);
//         return cleanedTypedAmountX;
//       } catch (error) {
//         console.error(error);
//         return '0';
//       }
//     })(),
//     500
//   );
//   const debouncedAmountY = useDebounce(
//     (() => {
//       try {
//         const cleanedTypedAmountY = getNumberStringValue(typedAmountY, numberLocale);
//         parseUnits(cleanedTypedAmountY, poolData.tokenY.decimals);
//         return cleanedTypedAmountY;
//       } catch (error) {
//         console.error(error);
//         return '0';
//       }
//     })(),
//     500
//   );
//   // const debouncedPriceRange = useDebounce(sliderPriceRange, 500);
//   const debouncedMinPriceBinId = useDebounce(minPriceBinId, 500);
//   const debouncedMaxPriceBinId = useDebounce(maxPriceBinId, 500);
//   const [isChartLoading, setIsChartLoading] = useState(false);

//   const inputAmountXAvailable = useMemo(() => {
//     if (debouncedMaxPriceBinId < activeId) {
//       setTypedAmountX('0');
//       return false;
//     }

//     return true;
//   }, [activeId, debouncedMaxPriceBinId]);

//   const inputAmountYAvailable = useMemo(() => {
//     if (debouncedMinPriceBinId > activeId) {
//       setTypedAmountY('0');
//       return false;
//     }

//     return true;
//   }, [activeId, debouncedMinPriceBinId]);

//   // declare liquidity parameters
//   const [addLiquidityInput, setAddLiquidityInput] = useState({
//     tokenX: originalPoolData.tokenX.address as `0x${string}`,
//     tokenY: originalPoolData.tokenY.address as `0x${string}`,
//     binStep: originalPoolData.lbBinStep,
//     amountX: '0',
//     amountY: '0',
//     amountXMin: '0',
//     amountYMin: '0',
//     activeIdDesired: activeId,
//     idSlippage: 5,
//     deltaIds: [] as number[],
//     distributionX: [] as bigint[],
//     distributionY: [] as bigint[],
//     to: address,
//     refundTo: address,
//     deadline: Math.floor(Date.now() / 1000) + 3600,
//   });
//   const chartData = useMemo(() => {
//     if (!poolData.lbBinStep || !poolData.tokenX.decimals || !poolData.tokenY.decimals) return [];

//     const binRange = [Math.min(debouncedMinPriceBinId, debouncedMaxPriceBinId), Math.max(debouncedMinPriceBinId, debouncedMaxPriceBinId)];

//     let simulatedDistribution: {
//       binIds: number[];
//       deltaIds: number[];
//       distributionX: bigint[];
//       distributionY: bigint[];
//     } | null = null;
//     if (selectedShape === LiquidityDistribution.BID_ASK) {
//       // getBidAskDistributionFromBinRange(activeId, binRange);
//       const { deltaIds, distributionX, distributionY } = getBidAskDistributionFromBinRange(activeId, binRange, [
//         new TokenAmount(
//           new Token(
//             DEFAULT_CHAINID,
//             originalPoolData.tokenX.address as `0x${string}`,
//             originalPoolData.tokenX.decimals,
//             originalPoolData.tokenX.symbol,
//             originalPoolData.tokenX.name
//           ),
//           parseUnits(debouncedAmountX, originalPoolData.tokenX.decimals)
//         ),
//         new TokenAmount(
//           new Token(
//             DEFAULT_CHAINID,
//             originalPoolData.tokenY.address as `0x${string}`,
//             originalPoolData.tokenY.decimals,
//             originalPoolData.tokenY.symbol,
//             originalPoolData.tokenY.name
//           ),
//           parseUnits(debouncedAmountY, originalPoolData.tokenY.decimals)
//         ),
//       ]);
//       simulatedDistribution = {
//         binIds: deltaIds.map((deltaId) => deltaId + activeId),
//         deltaIds,
//         distributionX,
//         distributionY,
//       };
//     } else if (selectedShape === LiquidityDistribution.CURVE) {
//       // getCurveDistributionFromBinRange(activeId, binRange);
//       const { deltaIds, distributionX, distributionY } = getCurveDistributionFromBinRange(
//         activeId,
//         binRange,
//         [
//           new TokenAmount(
//             new Token(
//               DEFAULT_CHAINID,
//               originalPoolData.tokenX.address as `0x${string}`,
//               originalPoolData.tokenX.decimals,
//               originalPoolData.tokenX.symbol,
//               originalPoolData.tokenX.name
//             ),
//             parseUnits(debouncedAmountX, originalPoolData.tokenX.decimals)
//           ),
//           new TokenAmount(
//             new Token(
//               DEFAULT_CHAINID,
//               originalPoolData.tokenY.address as `0x${string}`,
//               originalPoolData.tokenY.decimals,
//               originalPoolData.tokenY.symbol,
//               originalPoolData.tokenY.name
//             ),
//             parseUnits(debouncedAmountY, originalPoolData.tokenY.decimals)
//           ),
//         ],
//         0.1 // 0~1
//       );
//       simulatedDistribution = {
//         binIds: deltaIds.map((deltaId) => deltaId + activeId),
//         deltaIds,
//         distributionX,
//         distributionY,
//       };
//     } else {
//       const { deltaIds, distributionX, distributionY } = getUniformDistributionFromBinRange(activeId, binRange);
//       simulatedDistribution = {
//         binIds: deltaIds.map((deltaId) => deltaId + activeId),
//         deltaIds,
//         distributionX,
//         distributionY,
//       };
//     }
//     if (!simulatedDistribution) {
//       return [];
//     }

//     // check availavilit
//     //  1. price range includes current price bin? must have 2 amounts

//     // 2. min price is greater than current price? must have 1 amount X
//     // 3. max price is less than current price? must have 1 amount Y

//     const minBinId = debouncedMinPriceBinId;
//     const maxBinId = debouncedMaxPriceBinId;

//     if (activeId <= minBinId) {
//       if (!Number(debouncedAmountX)) {
//         return [];
//       }
//     }

//     if (activeId >= maxBinId) {
//       if (!Number(debouncedAmountY)) {
//         return [];
//       }
//     }

//     if (minBinId <= activeId && activeId <= maxBinId) {
//       if (!Number(debouncedAmountX) || !Number(debouncedAmountY)) {
//         return [];
//       }
//     }

//     // (1 - liquidityTolerance / 100)
//     // 0.1 -> 0.1%
//     const slippageToleranceAmountX = (Number(debouncedAmountX) * (1 - liquidityTolerance / 100)).toFixed(poolData.tokenX.decimals);
//     const slippageToleranceAmountY = (Number(debouncedAmountY) * (1 - liquidityTolerance / 100)).toFixed(poolData.tokenY.decimals);

//     console.log({
//       minBinId,
//       maxBinId,
//       binRange,
//       amountX: debouncedAmountX,
//       amountY: debouncedAmountY,
//       amountXParsed: parseUnits(debouncedAmountX, poolData.tokenX.decimals).toString(),
//       amountYParsed: parseUnits(debouncedAmountY, poolData.tokenY.decimals).toString(),
//       simulatedDistribution,
//     });

//     const amountXMorethan0 = simulatedDistribution.distributionX.reduce((acc, val) => acc + val, 0n) > 0n;
//     const amountYMorethan0 = simulatedDistribution.distributionY.reduce((acc, val) => acc + val, 0n) > 0n;

//     setAddLiquidityInput({
//       ...addLiquidityInput,
//       deltaIds: simulatedDistribution.deltaIds,
//       distributionX: simulatedDistribution.distributionX,
//       distributionY: simulatedDistribution.distributionY,
//       amountX: amountXMorethan0 ? parseUnits(debouncedAmountX, poolData.tokenX.decimals).toString() : '0',
//       amountY: amountYMorethan0 ? parseUnits(debouncedAmountY, poolData.tokenY.decimals).toString() : '0',
//       amountXMin: amountXMorethan0 ? parseUnits(slippageToleranceAmountX, poolData.tokenX.decimals).toString() : '0',
//       amountYMin: amountYMorethan0 ? parseUnits(slippageToleranceAmountY, poolData.tokenY.decimals).toString() : '0',
//       to: address as `0x${string}`,
//       refundTo: address as `0x${string}`,
//     });

//     if (binRange[1] - binRange[0] > 120) {
//       return [];
//     }
//     setIsChartLoading(true);

//     const data = buildChartData(
//       simulatedDistribution,
//       debouncedAmountX,
//       debouncedAmountY,
//       poolData.lbBinStep,
//       poolData.tokenX.decimals,
//       poolData.tokenY.decimals,
//       yBaseCurrency
//     );
//     if (!data.find((entry) => entry.bin === activeId)) {
//       data.push({
//         bin: activeId,
//         x: 0,
//         y: 0,
//         price: currentPriceWithDecimals,
//         yHeight: 0,
//         xHeight: 0,
//       });
//       data.sort((a, b) => a.bin - b.bin);
//     }
//     setIsChartLoading(false);
//     return yBaseCurrency ? data.reverse() : data;
//   }, [
//     originalPoolData,
//     poolData.lbBinStep,
//     poolData.tokenX.decimals,
//     poolData.tokenY.decimals,
//     debouncedMinPriceBinId,
//     debouncedMaxPriceBinId,
//     selectedShape,
//     activeId,
//     debouncedAmountX,
//     liquidityTolerance,
//     debouncedAmountY,
//     address,
//     yBaseCurrency,
//   ]);

//   const { writeContractAsync } = useWriteContract();

//   // removable liquidity bins
//   // eslint-disable-next-line @typescript-eslint/no-unused-vars
//   const [withdrawTab, setWithdrawTab] = useState<'both' | 'tokenX' | 'tokenY'>('both');
//   const [withdrawPriceRange, setWithdrawPriceRange] = useState<[number, number]>([0, 0]);
//   // removable liquidity bins
//   const {
//     data: myBinIds,
//     isFetched: isMyBinIdsFetched,
//     refetch: refetchMyBinIds,
//   } = useUserLiquidityBinIds({
//     poolAddress: poolData.pairAddress,
//     userAddress: address || '',
//     enabled: !!address,
//     select: (data) => data.sort((a: string, b: string) => Number(a) - Number(b)),
//   });

//   useEffect(() => {
//     if (myBinIds && myBinIds.length > 0) {
//       setWithdrawPriceRange([0, myBinIds.length - 1]);
//     }
//   }, [myBinIds]);

//   const { data: binLiquidityAmounts, refetch: refetchBinLiquidityAmounts } = useReadContract({
//     address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
//     abi: jsonAbis.LiquidityHelperV2ABI,
//     functionName: 'getAmountsOf',
//     args: [poolData.pairAddress as `0x${string}`, address as `0x${string}`, myBinIds],
//     query: {
//       enabled: myBinIds && myBinIds.length > 0,
//     },
//   });
//   const { data: binSharesAmounts, refetch: refetchBinSharesAmounts } = useReadContract({
//     address: LIQUIDITY_HELPER_V2_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
//     abi: jsonAbis.LiquidityHelperV2ABI,
//     functionName: 'getSharesOf',
//     args: [poolData.pairAddress as `0x${string}`, address as `0x${string}`, myBinIds],
//     query: {
//       enabled: myBinIds && myBinIds.length > 0,
//     },
//   });

//   const userBinsAmounts = useMemo<
//     {
//       binId: number;
//       tokenXAmount: number;
//       tokenYAmount: number;
//       tokenXAmountBigInt: bigint;
//       tokenYAmountBigInt: bigint;
//       amount: bigint; // receipt token amount
//     }[]
//   >(() => {
//     if (!binLiquidityAmounts || !binSharesAmounts) return [];
//     return myBinIds.map((binId: number, index: number) => ({
//       binId,
//       tokenXAmount: Number((binLiquidityAmounts as bigint[][])[0][index]),
//       tokenYAmount: Number((binLiquidityAmounts as bigint[][])[1][index]),
//       tokenXAmountBigInt: (binLiquidityAmounts as bigint[][])[0][index],
//       tokenYAmountBigInt: (binLiquidityAmounts as bigint[][])[1][index],
//       amount: (binSharesAmounts as bigint[])[index],
//     }));
//   }, [binLiquidityAmounts, binSharesAmounts, myBinIds]);

//   useEffect(() => {
//     if (myBinIds && myBinIds.length > 0) {
//       setWithdrawPriceRange([0, (myBinIds?.length ?? 0) - 1]);
//     }
//   }, [myBinIds]);

//   const removeLiquidityInput = useMemo(() => {
//     const currentTimeInSec = Math.floor(Date.now() / 1000);
//     if (withdrawTab === 'both') {
//       const tokenXAmount =
//         userBinsAmounts.slice(withdrawPriceRange[0], withdrawPriceRange[1] + 1).reduce((acc, bin) => acc + bin.tokenXAmount, 0) /
//         10 ** poolData.tokenX.decimals;
//       const tokenYAmount =
//         userBinsAmounts.slice(withdrawPriceRange[0], withdrawPriceRange[1] + 1).reduce((acc, bin) => acc + bin.tokenYAmount, 0) /
//         10 ** poolData.tokenY.decimals;

//       return {
//         tokenX: poolData.tokenX.address,
//         tokenY: poolData.tokenY.address,
//         binStep: poolData.lbBinStep,
//         amountXmin: 0,
//         amountYmin: 0,
//         ids: userBinsAmounts
//           .slice(withdrawPriceRange[0], withdrawPriceRange[1] + 1)
//           .filter((bin) => bin.amount > 0n)
//           .map((bin) => bin.binId),
//         amounts: userBinsAmounts
//           .slice(withdrawPriceRange[0], withdrawPriceRange[1] + 1)
//           .filter((bin) => bin.amount > 0n)
//           .map((bin) => bin.amount),
//         to: address as `0x${string}`,
//         deadline: currentTimeInSec + 3600,
//         tokenXAmount,
//         tokenYAmount,
//         bins: userBinsAmounts.slice(withdrawPriceRange[0], withdrawPriceRange[1] + 1).filter((bin) => bin.amount > 0n),
//       };
//     }
//     const currentActiveId = activeId;
//     if (withdrawTab === 'tokenX') {
//       // filter binIds that is greater than currentActiveId
//       const binIds = userBinsAmounts
//         .filter((bin) => bin.binId > currentActiveId)
//         .filter((bin) => bin.amount > 0n)
//         .map((bin) => bin.binId);
//       const amounts = userBinsAmounts
//         .filter((bin) => bin.binId > currentActiveId)
//         .filter((bin) => bin.amount > 0n)
//         .map((bin) => bin.amount);
//       const tokenXAmount = userBinsAmounts.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
//       const tokenYAmount = userBinsAmounts.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;

//       return {
//         tokenX: poolData.tokenX.address,
//         tokenY: poolData.tokenY.address,
//         binStep: poolData.lbBinStep,
//         amountXmin: 0,
//         amountYmin: 0,
//         ids: binIds,
//         amounts: amounts,
//         to: address as `0x${string}`,
//         deadline: currentTimeInSec + 3600,
//         tokenXAmount,
//         tokenYAmount,
//         bins: userBinsAmounts.filter((bin) => bin.binId > currentActiveId).filter((bin) => bin.amount > 0n),
//       };
//     }

//     const binIds = userBinsAmounts
//       .filter((bin) => bin.binId < currentActiveId)
//       .filter((bin) => bin.amount > 0n)
//       .map((bin) => bin.binId);
//     const amounts = userBinsAmounts
//       .filter((bin) => bin.binId < currentActiveId)
//       .filter((bin) => bin.amount > 0n)
//       .map((bin) => bin.amount);
//     const tokenXAmount = userBinsAmounts.reduce((acc, bin) => acc + bin.tokenXAmount, 0) / 10 ** poolData.tokenX.decimals;
//     const tokenYAmount = userBinsAmounts.reduce((acc, bin) => acc + bin.tokenYAmount, 0) / 10 ** poolData.tokenY.decimals;

//     return {
//       tokenX: poolData.tokenX.address,
//       tokenY: poolData.tokenY.address,
//       binStep: poolData.lbBinStep,
//       amountXmin: 0,
//       amountYmin: 0,
//       ids: binIds,
//       amounts: amounts,
//       to: address as `0x${string}`,
//       deadline: currentTimeInSec + 3600,
//       tokenXAmount,
//       tokenYAmount,
//       bins: userBinsAmounts.filter((bin) => bin.binId < currentActiveId).filter((bin) => bin.amount > 0n),
//     };
//   }, [
//     address,
//     activeId,
//     poolData.lbBinStep,
//     poolData.tokenX.address,
//     poolData.tokenY.address,
//     userBinsAmounts,
//     withdrawPriceRange,
//     withdrawTab,
//   ]);

//   const minWithdrawPriceWithDecimals = useMemo(() => {
//     if (myBinIds) {
//       return (
//         getPriceFromId(myBinIds[0 + withdrawPriceRange[0]], poolData.lbBinStep) *
//         10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals)
//       );
//     }
//     return 0;
//   }, [poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals, withdrawPriceRange, myBinIds]);
//   const maxWithdrawPriceWithDecimals = useMemo(() => {
//     if (myBinIds) {
//       return (
//         getPriceFromId(myBinIds[0 + withdrawPriceRange[1]], poolData.lbBinStep) *
//         10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals)
//       );
//     }
//     return 0;
//   }, [poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals, withdrawPriceRange, myBinIds]);

//   const { allowance: binApproved, refetchAllowance: refetchBinApproved } = useBinAllowance(poolData.pairAddress);
//   const [isApproveBinLoading, setIsApproveBinLoading] = useState(false);
//   const handleApproveBinCall = async () => {
//     try {
//       setIsApproveBinLoading(true);
//       await writeContractAsync({
//         address: poolData.pairAddress as `0x${string}`,
//         abi: jsonAbis.LBPairV21ABI,
//         functionName: 'approveForAll',
//         args: [LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID], true],
//       });
//       setIsApproveBinLoading(false);
//       await new Promise((resolve) => setTimeout(resolve, 1000));
//       refetchBinApproved();
//     } catch (error) {
//       console.error(error);
//     } finally {
//       setIsApproveBinLoading(false);
//     }
//   };

//   const [isRemoveLiquidityLoading, setIsRemoveLiquidityLoading] = useState<
//     'idle' | 'removeLiquidity' | 'waitingForRemoveLiquidityConfirmation'
//   >('idle');
//   const [removeLiquidityTxHash, setRemoveLiquidityTxHash] = useState<`0x${string}` | null>(null);
//   const [currentRemoveLiquidityBatch, setCurrentRemoveLiquidityBatch] = useState(0);
//   const [totalRemoveLiquidityBatches, setTotalRemoveLiquidityBatches] = useState(0);

//   // Remove liquidity chunks calculation

//   const removeLiquidityChunks = useMemo(() => {
//     if (!removeLiquidityInput || !removeLiquidityInput.ids.length) return [];

//     const binLimit = Number(binCountLimit);
//     const ids = removeLiquidityInput.ids;
//     const amounts = removeLiquidityInput.amounts;
//     const bins = removeLiquidityInput.bins;

//     // If binCountLimit doesn't exist, or ids is smaller than binCountLimit, return original
//     if (!binLimit || ids.length <= binLimit || isUsingBigBlocks) {
//       return [removeLiquidityInput];
//     }

//     const chunks = [];
//     for (let i = 0; i < ids.length; i += binLimit) {
//       const currentTimeInSec = Math.floor(Date.now() / 1000);
//       const liquidityToleranceFrom10000 = BigInt((10000 - liquidityTolerance * 100).toFixed(0));
//       const amountXmin =
//         (bins
//           .slice(i, i + binLimit)
//           .map((bin) => bin.tokenXAmountBigInt)
//           .reduce((acc, curr) => acc + curr, 0n) *
//           liquidityToleranceFrom10000) /
//         10000n;
//       const amountYmin =
//         (bins
//           .slice(i, i + binLimit)
//           .map((bin) => bin.tokenYAmountBigInt)
//           .reduce((acc, curr) => acc + curr, 0n) *
//           liquidityToleranceFrom10000) /
//         10000n;
//       chunks.push({
//         ...removeLiquidityInput,
//         ids: ids.slice(i, i + binLimit),
//         amounts: amounts.slice(i, i + binLimit),
//         deadline: currentTimeInSec + 3600,
//         amountXmin: amountXmin,
//         amountYmin: amountYmin,
//       });
//     }
//     return chunks;
//   }, [removeLiquidityInput, binCountLimit, isUsingBigBlocks, liquidityTolerance]);

//   console.log(removeLiquidityChunks);

//   const sendNextRemoveLiquidityTransaction = async (index: number) => {
//     if (index >= removeLiquidityChunks.length) {
//       // All transactions completed successfully
//       const message =
//         totalRemoveLiquidityBatches > 1
//           ? `Remove Liquidity completed (${totalRemoveLiquidityBatches} batches)`
//           : 'Remove Liquidity transaction confirmed';
//       toast.success(message);
//       setIsRemoveLiquidityLoading('idle');
//       setCurrentRemoveLiquidityBatch(0);
//       setTotalRemoveLiquidityBatches(0);
//       refetchTokenBalanceData();
//       refetchBinLiquidityAmounts();
//       refetchBinSharesAmounts();
//       setTimeout(() => {
//         refetchMyBinIds();
//       }, 2000);
//       return;
//     }

//     try {
//       setIsRemoveLiquidityLoading('removeLiquidity');
//       const chunk = removeLiquidityChunks[index];
//       console.log(chunk);

//       const contractParamsObj = {
//         address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
//         abi: jsonAbis.LBRouterV22ABI,
//         functionName: isNativeIn ? 'removeLiquidityNATIVE' : 'removeLiquidity',
//         args:
//           isNativeIn && originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address
//             ? [chunk.tokenY, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
//             : isNativeIn && originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address
//             ? [chunk.tokenX, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
//             : [
//                 chunk.tokenX,
//                 chunk.tokenY,
//                 chunk.binStep,
//                 chunk.amountXmin,
//                 chunk.amountYmin,
//                 chunk.ids,
//                 chunk.amounts,
//                 chunk.to,
//                 chunk.deadline,
//               ],
//       };
//       const simulatedGas = await publicClient?.estimateContractGas({
//         account: address as `0x${string}`,
//         ...contractParamsObj,
//       });

//       const hash = await writeContractAsync({
//         address: LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`,
//         abi: jsonAbis.LBRouterV22ABI,
//         functionName: isNativeIn ? 'removeLiquidityNATIVE' : 'removeLiquidity',
//         args:
//           isNativeIn && originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address
//             ? [chunk.tokenY, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
//             : isNativeIn && originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address
//             ? [chunk.tokenX, chunk.binStep, chunk.amountXmin, chunk.amountYmin, chunk.ids, chunk.amounts, chunk.to, chunk.deadline]
//             : [
//                 chunk.tokenX,
//                 chunk.tokenY,
//                 chunk.binStep,
//                 chunk.amountXmin,
//                 chunk.amountYmin,
//                 chunk.ids,
//                 chunk.amounts,
//                 chunk.to,
//                 chunk.deadline,
//               ],
//         gas: isUsingBigBlocks && simulatedGas ? (simulatedGas * 120n) / 100n : undefined,
//       });

//       toast.success(`Remove Liquidity transaction ${index + 1} of ${removeLiquidityChunks.length} sent`, {
//         action: {
//           label: 'View on Explorer',
//           onClick: () => window.open(`https://insectarium.blockscout.memecore.com/tx/${hash}`, '_blank'),
//         },
//       });

//       setRemoveLiquidityTxHash(hash);
//       setCurrentRemoveLiquidityBatch(index + 1);
//       setIsRemoveLiquidityLoading('waitingForRemoveLiquidityConfirmation');
//     } catch (error) {
//       console.error(error);
//       toast.error(`Failed to remove liquidity`, {
//         description: `Transaction ${index + 1} failed. Please try again.`,
//       });
//       setIsRemoveLiquidityLoading('idle');
//       setCurrentRemoveLiquidityBatch(0);
//       setTotalRemoveLiquidityBatches(0);
//       refetchTokenBalanceData();
//       refetchBinLiquidityAmounts();
//       refetchBinSharesAmounts();
//       setTimeout(() => {
//         refetchMyBinIds();
//       }, 2000);
//     }
//   };

//   const handleRemoveLiquidityContractCall = async () => {
//     if (!removeLiquidityInput || removeLiquidityInput.ids.length === 0) {
//       toast.error('No liquidity to remove');
//       return;
//     }

//     setRemoveLiquidityTxHash(null);
//     setCurrentRemoveLiquidityBatch(0);
//     setTotalRemoveLiquidityBatches(removeLiquidityChunks.length);
//     sendNextRemoveLiquidityTransaction(0);
//   };

//   const { isSuccess: isRemoveLiquidityConfirmed, isError: isRemoveLiquidityConfirmationError } = useWaitForTransactionReceipt({
//     hash: removeLiquidityTxHash as `0x${string}`,
//     query: {
//       enabled: !!removeLiquidityTxHash,
//     },
//   });
//   useEffect(() => {
//     if (isRemoveLiquidityConfirmed) {
//       sendNextRemoveLiquidityTransaction(currentRemoveLiquidityBatch);
//     }
//   }, [isRemoveLiquidityConfirmed]);

//   useEffect(() => {
//     if (isRemoveLiquidityConfirmationError) {
//       toast.error(`Failed to remove liquidity`, {
//         description: `Please try again`,
//       });
//       setIsRemoveLiquidityLoading('idle');
//     }
//   }, [isRemoveLiquidityConfirmationError]);
//   const [activeIndex, setActiveIndex] = useState(-1);

//   const handleMouseMove = (state: { activePayload?: { payload: { price: number; x: number; y: number } } }) => {
//     if (state.isTooltipActive) {
//       setActiveIndex(typeof state.activeLabel === 'number' ? state.activeLabel : -1);
//     } else {
//       setActiveIndex(-1);
//     }
//   };

//   const handleMouseLeave = () => {
//     setActiveIndex(-1);
//   };

//   return (
//     <div className="max-w-2xl mx-auto p-4 sm:p-6 bg-card rounded-2xl shadow-lg border border-border">
//       {/* Tabs */}
//       <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
//         <TabsList className="grid w-full grid-cols-2 mb-6 sm:mb-8 bg-card">
//           <TabsTrigger value="add" className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground">
//             Add Liquidity
//           </TabsTrigger>
//           <TabsTrigger
//             value="remove"
//             className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-foreground"
//           >
//             Remove Liquidity
//           </TabsTrigger>
//         </TabsList>

//         <TabsContent value="add" className="space-y-4 sm:space-y-6">
//           {/* Deposit Liquidity Section */}
//           <div>
//             <div className="flex items-center justify-between">
//               <h2 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">Deposit Liquidity</h2>
//               <AutoFillSwitch />
//             </div>

//             {/* Input Fields */}
//             <div className="space-y-3 sm:space-y-4">
//               <div className="">
//                 {address && (
//                   <div className=" text-right text-xs text-muted-foreground">
//                     Balance:{' '}
//                     {formatNumber(
//                       tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || 0,
//                       18,
//                       0,
//                       numberLocale
//                     )}
//                   </div>
//                 )}
//                 <div className="relative">
//                   <Input
//                     placeholder="Enter Amount"
//                     value={inputAmountXAvailable ? typedAmountX : ''}
//                     disabled={!inputAmountXAvailable}
//                     onChange={(e) => {
//                       setTypedAmountX(e.target.value);
//                       if (autoFill) {
//                         try {
//                           const price = currentPriceYInXWithDecimals;
//                           const amountY = getNumberValue(e.target.value, numberLocale) / price;
//                           if (!isNaN(amountY)) {
//                             setTypedAmountY(formatNumber(amountY, poolData.tokenY.decimals, 0, numberLocale));
//                           } else if (e.target.value === '') {
//                             setTypedAmountY('');
//                           }
//                         } catch (error) {
//                           console.error(error);
//                         }
//                       }
//                     }}
//                     className="pr-20 h-12 sm:h-14 text-base sm:text-lg bg-background border-border text-foreground  placeholder:text-muted-foreground"
//                   />
//                   <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="text-xs px-2 text-muted-foreground hover:text-foreground00"
//                       onClick={() => {
//                         // if isNativeIn, reserve gas fee
//                         if (isNativeIn && originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address) {
//                           const availableBalance =
//                             Number(tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '') -
//                               0.01 >
//                             0
//                               ? Number(
//                                   tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || ''
//                                 ) - 0.01
//                               : 0;

//                           setTypedAmountX(formatNumber(availableBalance, 18, 0, numberLocale));
//                         } else {
//                           setTypedAmountX(
//                             formatStringOnlyLocale(
//                               tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
//                               // 18,
//                               // 0,
//                               numberLocale
//                             )
//                           );
//                         }

//                         if (autoFill) {
//                           try {
//                             const price = currentPriceXInYWithDecimals;
//                             const amountY =
//                               getNumberValue(
//                                 tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
//                                 numberLocale
//                               ) * price;
//                             if (!isNaN(amountY)) {
//                               setTypedAmountY(formatNumber(amountY, poolData.tokenY.decimals, 0, numberLocale));
//                             }
//                           } catch (error) {
//                             console.error(error);
//                           }
//                         }
//                       }}
//                     >
//                       MAX
//                     </Button>
//                     <span className="font-medium text-sm sm:text-base text-foreground flex items-center">
//                       {poolData.tokenX.symbol}
//                       {originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address && (
//                         <>
//                           <img
//                             src="/horizontal_switch.svg"
//                             alt="switch"
//                             className="w-4 h-4 ml-1 hover:cursor-pointer"
//                             onClick={() => setIsNativeIn(!isNativeIn)}
//                           />
//                         </>
//                       )}
//                     </span>
//                   </div>
//                 </div>
//               </div>

//               <div>
//                 {address && (
//                   <div className="text-right text-xs text-muted-foreground">
//                     Balance:{' '}
//                     {formatNumber(
//                       tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || 0,
//                       18,
//                       0,
//                       numberLocale
//                     )}
//                   </div>
//                 )}
//                 <div className="relative">
//                   <Input
//                     placeholder="Enter Amount"
//                     value={inputAmountYAvailable ? typedAmountY : ''}
//                     disabled={!inputAmountYAvailable}
//                     onChange={(e) => {
//                       setTypedAmountY(e.target.value);
//                       if (autoFill) {
//                         try {
//                           const price = currentPriceXInYWithDecimals;
//                           const amountX = getNumberValue(e.target.value, numberLocale) / price;
//                           if (!isNaN(amountX)) {
//                             setTypedAmountX(formatNumber(amountX, poolData.tokenX.decimals, 0, numberLocale));
//                           } else if (e.target.value === '') {
//                             setTypedAmountX('');
//                           }
//                         } catch (error) {
//                           console.error(error);
//                         }
//                       }
//                     }}
//                     className="pr-20 h-12 sm:h-14 text-base sm:text-lg bg-background border-border text-foreground placeholder:text-muted-foreground"
//                   />
//                   <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 sm:gap-2">
//                     <Button
//                       variant="ghost"
//                       size="sm"
//                       className="text-xs px-2 text-muted-foreground hover:text-foreground00"
//                       onClick={() => {
//                         if (isNativeIn && originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address) {
//                           const availableBalance =
//                             Number(tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '') -
//                               0.01 >
//                             0
//                               ? Number(
//                                   tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || ''
//                                 ) - 0.01
//                               : 0;

//                           setTypedAmountY(formatNumber(availableBalance, 18, 0, numberLocale));
//                         } else {
//                           setTypedAmountY(
//                             formatStringOnlyLocale(
//                               tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
//                               // 18,
//                               // 0,
//                               numberLocale
//                             )
//                           );
//                         }
//                         if (autoFill) {
//                           try {
//                             const price = currentPriceYInXWithDecimals;
//                             const amountX =
//                               getNumberValue(
//                                 tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
//                                 numberLocale
//                               ) * price;
//                             if (!isNaN(amountX)) {
//                               setTypedAmountX(formatNumber(amountX, poolData.tokenX.decimals, 0, numberLocale));
//                             }
//                           } catch (error) {
//                             console.error(error);
//                           }
//                         }
//                       }}
//                     >
//                       MAX
//                     </Button>
//                     <span className="font-medium text-sm sm:text-base text-foreground flex items-center">
//                       {poolData.tokenY.symbol}
//                       {originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address && (
//                         <>
//                           <img
//                             src="/horizontal_switch.svg"
//                             alt="switch"
//                             className="w-4 h-4 ml-1 hover:cursor-pointer"
//                             onClick={() => setIsNativeIn(!isNativeIn)}
//                           />
//                         </>
//                       )}
//                     </span>
//                   </div>
//                 </div>
//               </div>
//             </div>
//           </div>

//           {/* Choose Liquidity Shape */}
//           <div>
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4">
//               <h3 className="text-base sm:text-lg font-semibold text-foreground">Choose Liquidity Shape</h3>
//               <Button
//                 variant="ghost"
//                 size="sm"
//                 className="text-text-secondary text-sm hover:text-foreground"
//                 onClick={() => {
//                   window.open('https://docs.memepulse.xyz/liquidity-book/liquidity-book-overview', '_blank');
//                 }}
//               >
//                 Learn more <ExternalLink className="w-3 h-3 ml-1" />
//               </Button>
//             </div>

//             <div className="grid grid-cols-3 gap-2 sm:gap-3">
//               {liquidityShapes.map((shape) => (
//                 <Card
//                   key={shape.id}
//                   className={`cursor-pointer transition-all  ${selectedShape === shape.id ? ' bg-muted' : '  bg-card  hover:bg-muted '}`}
//                   onClick={() => setSelectedShape(shape.id)}
//                 >
//                   <CardContent
//                     className={`p-3 sm:p-4 text-center border border-border-dark  ${
//                       selectedShape === shape.id ? 'border-accent-primary' : ''
//                     } rounded-lg`}
//                   >
//                     <div className="text-xl sm:text-2xl mb-1 sm:mb-2 flex items-center justify-center">
//                       <img src={shape.icon} alt={shape.name} />
//                     </div>
//                     <div className="font-medium text-xs sm:text-sm text-[#D8F7F4]">{shape.name}</div>
//                   </CardContent>
//                 </Card>
//               ))}
//             </div>
//           </div>

//           {/* Price Section */}
//           <div>
//             <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
//               <div className="flex  gap-2">
//                 <h3 className="text-base sm:text-lg font-semibold text-foreground">
//                   Price
//                   {/* Price Controls */}
//                 </h3>
//                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
//                   <Button
//                     variant="ghost"
//                     size="sm"
//                     className="text-text-secondary hover:text-foreground bg-background rounded-lg p-2"
//                     onClick={onResetPriceRange}
//                   >
//                     <RotateCcw className="w-4 h-4 mr-1" />
//                     Reset price
//                   </Button>
//                 </div>
//               </div>
//               {/* <div className="flex rounded-lg border border-border gap-1">
//                 <Button
//                   variant={'ghost'}
//                   size="sm"
//                   onClick={() => {
//                     setEasyModeEnabled(true);
//                     onSetPriceRange(easyModePreset ?? 0);
//                   }}
//                   className={easyModeEnabled ? 'bg-primary text-primary-foreground ' : 'bg-background text-foreground00 hover:text-foreground'}
//                 >
//                   Easy
//                 </Button>
//                 <Button
//                   variant={'ghost'}
//                   size="sm"
//                   onClick={() => {
//                     onResetPriceRange();
//                     setEasyModeEnabled(false);
//                   }}
//                   className={easyModeEnabled ? '  bg-background text-foreground00 hover:text-foreground' : 'bg-primary text-primary-foreground'}
//                 >
//                   Advanced
//                 </Button>
//               </div> */}
//             </div>

//             {/* Current Price Indicator */}
//             <div className="text-center mb-4 sm:mb-6">
//               <div className="text-sm text-foreground00 mb-2 bg-background rounded-lg p-2">
//                 Active Bin: {formatNumber(currentPriceWithDecimals, 8, 0, numberLocale)}{' '}
//                 {yBaseCurrency ? poolData.tokenX.symbol : poolData.tokenY.symbol} per{' '}
//                 {yBaseCurrency ? poolData.tokenY.symbol : poolData.tokenX.symbol}
//               </div>
//             </div>

//             {easyModeEnabled && (
//               <div>
//                 <div className="grid grid-cols-2 gap-2 justify-center mb-6">
//                   <Button
//                     variant="ghost"
//                     className={`hover:text-foreground border border-border-subtle rounded-lg p-2 ${
//                       easyModePreset === 0 ? 'border border-accent-primary ' : ''
//                     }`}
//                     onClick={() => {
//                       onSetPriceRange(0);
//                     }}
//                   >
//                     Aggressive (1 bin)
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     className={`hover:text-foreground border border-border-subtle rounded-lg p-2 ${
//                       easyModePreset === 1 ? 'border border-accent-primary ' : ''
//                     }`}
//                     onClick={() => onSetPriceRange(1)}
//                   >
//                     Narrow {poolData.lbBinStep === 1 ? '(3 Bins)' : '(± 1%)'}
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     className={`hover:text-foreground border border-border-subtle rounded-lg p-2 ${
//                       easyModePreset === 2 ? 'border border-accent-primary ' : ''
//                     }`}
//                     onClick={() => onSetPriceRange(2)}
//                   >
//                     Moderate {poolData.lbBinStep === 1 ? '(5 Bins)' : '(± 2%)'}
//                   </Button>
//                   <Button
//                     variant="ghost"
//                     className={`hover:text-foreground border border-border-subtle rounded-lg p-2 ${
//                       easyModePreset === 5 ? 'border border-accent-primary ' : ''
//                     }`}
//                     onClick={() => onSetPriceRange(5)}
//                   >
//                     Wide {poolData.lbBinStep === 1 ? '(± 1%)' : '(± 5%)'}
//                   </Button>
//                 </div>
//               </div>
//             )}

//             {/* Distribution Bar Chart */}
//             {chartData.length > 0 && (
//               <>
//                 <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
//                   <div className="flex items-center gap-4 text-xs mb-2 ml-2">
//                     <span className="flex items-center gap-2 text-[#8A939E] ">
//                       <span className="w-2 h-2 rounded-full bg-[#fbbf24] " /> {poolData.tokenY.symbol}
//                     </span>
//                     <span className="flex items-center gap-2 text-[#8A939E] ">
//                       <span className="w-2 h-2 rounded-full bg-[#34d399] " /> {poolData.tokenX.symbol}
//                     </span>
//                   </div>
//                   <div className="flex rounded-lg border border-border">
//                     <Button
//                       variant={'ghost'}
//                       size="sm"
//                       onClick={() => {
//                         setYBaseCurrency(false);
//                       }}
//                       className={!yBaseCurrency ? 'bg-[#303136] text-foreground ' : 'bg-background text-[#8A939E] hover:text-foreground'}
//                     >
//                       <TokenTicker
//                         className="w-4 h-4 mr-1"
//                         symbol={poolData.tokenX.symbol}
//                         logoURI={
//                           tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI
//                         }
//                       />
//                       {poolData.tokenX.symbol}
//                     </Button>
//                     <Button
//                       variant={'ghost'}
//                       size="sm"
//                       onClick={() => {
//                         setYBaseCurrency(true);
//                       }}
//                       className={!yBaseCurrency ? '  bg-background text-[#8A939E] hover:text-foreground' : 'bg-[#303136] text-foreground'}
//                     >
//                       <TokenTicker
//                         className="w-4 h-4 mr-1"
//                         symbol={poolData.tokenY.symbol}
//                         logoURI={
//                           tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI
//                         }
//                       />
//                       {poolData.tokenY.symbol}
//                     </Button>
//                   </div>
//                 </div>{' '}
//                 <div className="w-full  h-40  sm:h-72 mb-6 ">
//                   {isChartLoading ? (
//                     <div className="flex items-center justify-center h-full text-text-secondary">Loading chart...</div>
//                   ) : (
//                     <ResponsiveContainer width="100%" height="100%" className="z-10">
//                       <BarChart
//                         data={chartData}
//                         margin={{ top: 65, right: 15, left: 15, bottom: 10 }}
//                         barCategoryGap={1}
//                         onMouseMove={handleMouseMove}
//                         onMouseLeave={handleMouseLeave}
//                       >
//                         <XAxis
//                           dataKey="bin"
//                           axisLine={false}
//                           tickLine={false}
//                           tick={{ fontSize: 10, fill: '#6C737C' }}
//                           interval="equidistantPreserveStart"
//                           tickFormatter={(value) => {
//                             const price = yBaseCurrency
//                               ? (1 / getPriceFromId(value, poolData.lbBinStep)) *
//                                 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
//                               : getPriceFromId(value, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
//                             return formatNumber(price, 4, 0, numberLocale);
//                           }}
//                         />
//                         <YAxis hide />
//                         <RechartsTooltip
//                           content={<CustomLiquidityTooltip tokenXSymbol={poolData.tokenX.symbol} tokenYSymbol={poolData.tokenY.symbol} />}
//                           cursor={{ opacity: 0.15 }}
//                         />
//                         <Bar dataKey="yHeight" stackId="a" radius={[0, 0, 4, 4]}>
//                           {chartData.map((entry, index) => (
//                             <Cell
//                               key={`cell-yHeight-${index}`}
//                               fill={entry.bin === activeIndex ? '#fbbf24' : activeIndex === -1 ? '#fbbf24' : 'rgba(251, 191, 36, 0.4)'} // Original color on hover, transparency applied when not
//                             />
//                           ))}
//                         </Bar>

//                         {/* xHeight (green) bar */}
//                         <Bar dataKey="xHeight" stackId="a" radius={[4, 4, 0, 0]}>
//                           {chartData.map((entry, index) => (
//                             <Cell
//                               key={`cell-xHeight-${index}`}
//                               fill={entry.bin === activeIndex ? '#34d399' : activeIndex === -1 ? '#34d399' : 'rgba(52, 211, 153, 0.4)'} // Original color on hover, transparency applied when not
//                             />
//                           ))}
//                         </Bar>
//                         <ReferenceLine
//                           x={activeId}
//                           stroke="#fff"
//                           // strokeWidth={2}
//                           // y=
//                           strokeDasharray="3 3"
//                           // label={{ value: 'Current Price', position: 'top',
//                           label={{
//                             value: 'Current Price',
//                             position: 'top',

//                             content: ({ viewBox }) => {
//                               const boxWidth = 190;
//                               // const boxHeight = isMobile ? 46 : 56;
//                               const chartWidth = isMobile ? 270 : 480;

//                               // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                               // @ts-ignore
//                               const currentX = viewBox?.x ?? 0;

//                               let boxX = currentX - boxWidth / 2;

//                               if (boxX < 0) {
//                                 boxX = 0;
//                               }

//                               if (boxX + boxWidth > chartWidth) {
//                                 boxX = chartWidth - boxWidth;
//                               }

//                               const textX = boxX + boxWidth / 2;

//                               return (
//                                 <g>
//                                   {/* eslint-disable-next-line @typescript-eslint/ban-ts-comment */}
//                                   {/* @ts-ignore */}
//                                   {/* <rect x={boxX} y={viewBox?.y - 55} width={boxWidth} height={boxHeight} fill="#292A2F" rx={6} /> */}
//                                   <text
//                                     x={textX}
//                                     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                                     // @ts-ignore
//                                     y={viewBox?.y - 45}
//                                     textAnchor="middle"
//                                     fill="#fff"
//                                     // when mobile 12px
//                                     fontSize={isMobile ? 12 : 12}
//                                   >
//                                     Current Price
//                                   </text>
//                                   <text
//                                     x={textX}
//                                     // eslint-disable-next-line @typescript-eslint/ban-ts-comment
//                                     // @ts-ignore
//                                     y={viewBox?.y - (isMobile ? 12 : 24)}
//                                     textAnchor="middle"
//                                     fill="#fff"
//                                     fontSize={isMobile ? 12 : 12}
//                                   >
//                                     {formatNumber(currentPriceWithDecimals, 4, 0, numberLocale)}
//                                     {yBaseCurrency
//                                       ? ` ${poolData.tokenX.symbol}/${poolData.tokenY.symbol}`
//                                       : ` ${poolData.tokenY.symbol}/${poolData.tokenX.symbol}`}
//                                   </text>
//                                 </g>
//                               );
//                             },
//                           }}
//                         />
//                       </BarChart>
//                     </ResponsiveContainer>
//                   )}
//                 </div>
//               </>
//             )}
//             {chartData.length === 0 && debouncedMaxPriceBinId - debouncedMinPriceBinId > 120 && (
//               <div className="py-2 text-center text-accent-primary">Chart simulation is available for ranges up to 120 bins</div>
//             )}

//             {/* Price Range Slider */}
//             <div className="relative mb-6 sm:mb-8">
//               <div className="px-4">
//                 <DualRangeSlider
//                   // key={`${sliderMinValue}-${sliderMaxValue}`}
//                   key={easyModePreset}
//                   value={[sliderMinValue, sliderMaxValue]}
//                   onValueChange={(value) => {
//                     onSliderChange(value);
//                   }}
//                   min={sliderPriceRange[0]}
//                   max={sliderPriceRange[1]}
//                   step={1}
//                   className="w-full"
//                 />
//               </div>
//             </div>

//             {/* Price Values */}
//             <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 mb-4">
//               {yBaseCurrency ? (
//                 <>
//                   <div className="flex flex-col gap-2 col-span-5">
//                     <Label className="text-xs sm:text-sm text-[#f5ffff]">Min Price</Label>
//                     <div className="flex flex-row border border-border-subtle rounded-lg overflow-hidden ">
//                       <Input
//                         value={maxPriceWithDecimals}
//                         onChange={(e) => setMaxPriceWithDecimals(e.target.value)}
//                         className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[#1E1E1E]"
//                         onBlur={(e) => onAddLiquidityParamChange('maxPriceValueChange', e.target.value)}
//                       />
//                       <div className="w-px bg-background"></div>
//                       <div className="relative">
//                         <Input
//                           value={maxPricePercent}
//                           onChange={(e) => setMaxPricePercent(e.target.value)}
//                           className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-[#1E1E1E]"
//                           onBlur={(e) => onAddLiquidityParamChange('maxPricePercentChange', e.target.value)}
//                         />
//                         <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm pointer-events-none">
//                           %
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex flex-col gap-2 col-span-5">
//                     <Label className="text-xs sm:text-sm text-[#f5ffff]">Max Price</Label>
//                     <div className="flex flex-row border border-border-subtle rounded-lg overflow-hidden">
//                       <Input
//                         value={minPriceWithDecimals}
//                         onChange={(e) => setMinPriceWithDecimals(e.target.value)}
//                         className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-surface-default"
//                         onBlur={(e) => onAddLiquidityParamChange('minPriceValueChange', e.target.value)}
//                       />
//                       <div className="w-px bg-background"></div>
//                       <div className="relative">
//                         <Input
//                           value={minPricePercent}
//                           onChange={(e) => setMinPricePercent(e.target.value)}
//                           className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-[#1E1E1E]"
//                           onBlur={(e) => onAddLiquidityParamChange('minPricePercentChange', e.target.value)}
//                         />
//                         <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm pointer-events-none">
//                           %
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               ) : (
//                 <>
//                   <div className="flex flex-col gap-2 col-span-5">
//                     <Label className="text-xs sm:text-sm text-[#f5ffff]">Min Price</Label>
//                     <div className="flex flex-row border border-border-subtle rounded-lg overflow-hidden ">
//                       <Input
//                         value={minPriceWithDecimals}
//                         onChange={(e) => setMinPriceWithDecimals(e.target.value)}
//                         className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[#1E1E1E]"
//                         onBlur={(e) => onAddLiquidityParamChange('minPriceValueChange', e.target.value)}
//                       />
//                       <div className="w-px bg-background"></div>
//                       <div className="relative">
//                         <Input
//                           value={minPricePercent}
//                           onChange={(e) => setMinPricePercent(e.target.value)}
//                           className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-[#1E1E1E]"
//                           onBlur={(e) => onAddLiquidityParamChange('minPricePercentChange', e.target.value)}
//                         />
//                         <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm pointer-events-none">
//                           %
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                   <div className="flex flex-col gap-2 col-span-5">
//                     <Label className="text-xs sm:text-sm text-[#f5ffff]">Max Price</Label>
//                     <div className="flex flex-row border border-border-subtle rounded-lg overflow-hidden">
//                       <Input
//                         value={maxPriceWithDecimals}
//                         onChange={(e) => setMaxPriceWithDecimals(e.target.value)}
//                         className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-surface-default"
//                         onBlur={(e) => onAddLiquidityParamChange('maxPriceValueChange', e.target.value)}
//                       />
//                       <div className="w-px bg-background"></div>
//                       <div className="relative">
//                         <Input
//                           value={maxPricePercent}
//                           onChange={(e) => setMaxPricePercent(e.target.value)}
//                           className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-[#1E1E1E]"
//                           onBlur={(e) => onAddLiquidityParamChange('maxPricePercentChange', e.target.value)}
//                         />
//                         <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-text-secondary text-sm pointer-events-none">
//                           %
//                         </span>
//                       </div>
//                     </div>
//                   </div>
//                 </>
//               )}
//               <div className="flex flex-col gap-2 col-span-2 text-right">
//                 <Label className="text-xs sm:text-sm text-left">Num Bins</Label>
//                 <div className="flex flex-row border border-border-subtle rounded-lg overflow-hidden">
//                   <Input
//                     value={numBins}
//                     className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-[#1E1E1E] text-right"
//                     onChange={(e) => setNumBins(e.target.value)}
//                     onBlur={(e) => {
//                       onAddLiquidityParamChange('numBinsChange', e.target.value);
//                     }}
//                   />
//                 </div>
//               </div>
//             </div>
//             <PriceDiffWarning
//               tokenIn={poolData.tokenX.address}
//               tokenOut={poolData.tokenY.address}
//               currentPrice={currentPriceWithDecimals}
//               ybasecurrency={yBaseCurrency}
//             />
//           </div>

//           {/* Submit Button */}
//           {/* {tokenXNeedApprove && (
//             <Button
//               className="w-full h-12 sm:h-14 text-base sm:text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
//               onClick={() => {
//                 handleApproveTokenCall(poolData.tokenX.address);
//               }}
//             >
//               {isApproveTokenXLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve ${poolData.tokenX.symbol}`}
//             </Button>
//           )} */}
//           <ApproveButton
//             tokenAddress={
//               poolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn
//                 ? NATIVE_TOKEN_ADDRESS
//                 : (poolData.tokenX.address as `0x${string}`)
//             }
//             spenderAddress={LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`}
//             amountInBigInt={debouncedAmountX ? parseUnits(debouncedAmountX, poolData.tokenX.decimals) : BigInt(0)}
//             symbol={poolData.tokenX.symbol}
//           />
//           <ApproveButton
//             tokenAddress={
//               poolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn
//                 ? NATIVE_TOKEN_ADDRESS
//                 : (poolData.tokenY.address as `0x${string}`)
//             }
//             spenderAddress={LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID] as `0x${string}`}
//             amountInBigInt={debouncedAmountY ? parseUnits(debouncedAmountY, poolData.tokenY.decimals) : BigInt(0)}
//             symbol={poolData.tokenY.symbol}
//           />
//           {/* {tokenYNeedApprove && (
//             <Button
//               className="w-full h-12 sm:h-14 text-base sm:text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
//               onClick={() => {
//                 handleApproveTokenCall(poolData.tokenY.address);
//               }}
//             >
//               {isApproveTokenYLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve ${poolData.tokenY.symbol}`}
//             </Button>
//           )} */}
//           {/* <Button
//             className="w-full h-12 sm:h-14 text-base sm:text-lg bg-primary hover:bg-primary/90 text-primary-foreground"
//             disabled={addLiquidityButtonMemo.disabled}
//             onClick={handleAddLiquidityContractCall}
//           >
//             {isAddLiquidityLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : addLiquidityButtonMemo.text}
//           </Button> */}
//           <AddLiquidityButton
//             inputAmountXAvailable={inputAmountXAvailable}
//             inputAmountYAvailable={inputAmountYAvailable}
//             typedAmountX={debouncedAmountX}
//             typedAmountY={debouncedAmountY}
//             amountXBalance={
//               poolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn
//                 ? tokenBalanceData?.[NATIVE_TOKEN_ADDRESS as keyof typeof tokenBalanceData]?.formattedBalance ?? '0'
//                 : tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance ?? '0'
//             }
//             amountYBalance={
//               poolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address && isNativeIn
//                 ? tokenBalanceData?.[NATIVE_TOKEN_ADDRESS as keyof typeof tokenBalanceData]?.formattedBalance ?? '0'
//                 : tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance ?? '0'
//             }
//             addLiquidityInput={addLiquidityInput}
//             onSuccess={() => {
//               setTypedAmountX('0');
//               setTypedAmountY('0');
//               refetchTokenBalanceData();
//               // refetch mybin
//               setTimeout(() => {
//                 refetchMyBinIds().then(() => {
//                   refetchBinLiquidityAmounts();
//                   refetchBinSharesAmounts();
//                 });
//               }, 2000);
//             }}
//             onFail={() => {
//               refetchTokenBalanceData();
//               // refetch mybin
//               setTimeout(() => {
//                 refetchMyBinIds();
//               }, 2000);
//             }}
//             tokenXSymbol={poolData.tokenX.symbol}
//             tokenYSymbol={poolData.tokenY.symbol}
//             binCountLimit={Number(binCountLimit)}
//             isNativeIn={isNativeIn}
//           />
//         </TabsContent>

//         <TabsContent value="remove">
//           <Tabs value={withdrawTab} onValueChange={(value) => setWithdrawTab(value as 'both' | 'tokenX' | 'tokenY')} className="w-full">
//             <TabsList className="grid w-full grid-cols-3 mb-6 bg-card">
//               <TabsTrigger
//                 value="both"
//                 className="data-[state=active]:text-accent-primary data-[state=active]:border-b-2 data-[state=active]:border-none text-text-primary"
//               >
//                 Remove Both
//               </TabsTrigger>
//               <TabsTrigger
//                 value="tokenX"
//                 className="data-[state=active]:text-accent-primary data-[state=active]:border-b-2 data-[state=active]:border-none text-text-primary"
//               >
//                 Remove {poolData.tokenX.symbol}
//               </TabsTrigger>
//               <TabsTrigger
//                 value="tokenY"
//                 className="data-[state=active]:text-accent-primary data-[state=active]:border-b-2 data-[state=active]:border-none text-text-primary"
//               >
//                 Remove {poolData.tokenY.symbol}
//               </TabsTrigger>
//             </TabsList>

//             {/* Remove Both Tab */}
//             {isMyBinIdsFetched && (
//               <>
//                 <TabsContent value="both" className="space-y-6">
//                   {/* Price Range Section */}
//                   {removeLiquidityInput?.ids?.length === 0 ? (
//                     <div className="text-center py-12">
//                       <p className="">You have no liquidity in this range.</p>
//                     </div>
//                   ) : (
//                     <>
//                       <div>
//                         <h3 className="text-lg font-semibold mb-4 text-foreground ">Price Range</h3>

//                         {/* Price Range Slider */}
//                         <div className="relative mb-8">
//                           <div className="px-4">
//                             <DualRangeSlider
//                               value={withdrawPriceRange}
//                               onValueChange={(value) => {
//                                 setWithdrawPriceRange([value[0], value[1]]);
//                               }}
//                               max={(myBinIds?.length ?? 0) - 1}
//                               step={1}
//                               className="w-full"
//                               /*
//                                          <DualRangeSlider
//                   value={[minPriceBinId, maxPriceBinId]}
//                   onValueChange={(value) => {
//                     onMinBinIdChange(value[0]);
//                     onMaxBinIdChange(value[1]);
//                   }}
//                   min={sliderPriceRange[0]}
//                   max={sliderPriceRange[1]}
//                   step={1}
//                   className="w-full"
//                 />
//                               */
//                             />
//                           </div>
//                         </div>

//                         {/* Price Values */}
//                         <div className="grid grid-cols-3 gap-4 mb-6">
//                           <div>
//                             <div className="text-sm  mb-1">Min Price:</div>
//                             <div className="font-mono text-lg ">{formatNumber(minWithdrawPriceWithDecimals, 4, 0, numberLocale)}</div>
//                             <div className="text-xs ">
//                               {poolData.tokenY.symbol} per {poolData.tokenX.symbol}
//                             </div>
//                           </div>
//                           <div className="text-center">
//                             <div className="text-sm  mb-1">Num Bins:</div>
//                             <div className="font-mono text-lg ">{withdrawPriceRange[1] - withdrawPriceRange[0] + 1}</div>
//                           </div>
//                           <div className="text-right">
//                             <div className="text-sm  mb-1">Max Price:</div>
//                             <div className="font-mono text-lg ">{formatNumber(maxWithdrawPriceWithDecimals, 4, 0, numberLocale)}</div>
//                             <div className="text-xs ">
//                               {poolData.tokenY.symbol} per {poolData.tokenX.symbol}
//                             </div>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Approve Button */}
//                       {!binApproved && (
//                         <Button
//                           className="w-full h-12 bg-green-dark-500 hover:bg-green-dark-400 text-green-dark-950"
//                           onClick={handleApproveBinCall}
//                           disabled={isApproveBinLoading}
//                         >
//                           {isApproveBinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve to continue`}
//                         </Button>
//                       )}

//                       {/* You will receive section */}
//                       <div>
//                         <h4 className="font-semibold mb-4 ">You will receive:</h4>

//                         <div className="flex items-center justify-center gap-4 mb-6">
//                           <div className="flex items-center gap-2">
//                             <TokenTicker
//                               logoURI={
//                                 tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())
//                                   ?.logoURI
//                               }
//                               symbol={poolData.tokenX.symbol}
//                               className="w-6 h-6"
//                             />
//                             <span className="text-xl font-semibold ">
//                               {formatNumber(removeLiquidityInput.tokenXAmount, 4, 0, numberLocale)}
//                             </span>
//                           </div>

//                           <span className="text-2xl text-green-dark-400">+</span>

//                           <div className="flex items-center gap-2">
//                             <TokenTicker
//                               logoURI={
//                                 tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())
//                                   ?.logoURI
//                               }
//                               symbol={poolData.tokenY.symbol}
//                               className="w-6 h-6"
//                             />
//                             <span className="text-xl font-semibold ">
//                               {formatNumber(removeLiquidityInput.tokenYAmount, 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                         </div>

//                         {/* Details */}
//                         <div className="space-y-3 text-sm">
//                           <div className="flex justify-between">
//                             <span className="">Price Range</span>
//                             <span className="">
//                               {formatNumber(minWithdrawPriceWithDecimals, 4, 0, numberLocale)}-{' '}
//                               {formatNumber(maxWithdrawPriceWithDecimals, 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="">Amount Slippage Tolerance</span>
//                             <span className="">{liquidityTolerance}%</span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="">Minimum Expected {poolData.tokenX.symbol}</span>
//                             <span className="">
//                               {formatNumber(removeLiquidityInput.tokenXAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="">Minimum Expected {poolData.tokenY.symbol}</span>
//                             <span className="">
//                               {formatNumber(removeLiquidityInput.tokenYAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Remove Liquidity Button */}
//                       <Button
//                         className="w-full h-12 bg-primary hover:bg-green-dark-400 text-green-dark-950"
//                         onClick={handleRemoveLiquidityContractCall}
//                         disabled={
//                           isRemoveLiquidityLoading === 'removeLiquidity' ||
//                           isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ||
//                           !binApproved
//                         }
//                       >
//                         {isRemoveLiquidityLoading === 'removeLiquidity' ||
//                         isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ? (
//                           <Loader2 className="w-4 h-4 animate-spin" />
//                         ) : removeLiquidityChunks.length > 1 ? (
//                           `Remove Liquidity (${removeLiquidityChunks.length} transactions)`
//                         ) : (
//                           'Remove Liquidity'
//                         )}
//                       </Button>
//                     </>
//                   )}
//                 </TabsContent>
//                 {/* Remove MNT Tab */}
//                 <TabsContent value="tokenX" className="space-y-6">
//                   {/* Explanation */}
//                   <div className="bg-green-dark-800 p-4 rounded-lg border border-green-dark-700">
//                     <p className="text-sm text-green-dark-100">
//                       You will remove <span className="font-semibold text-green-dark-400">{poolData.tokenX.symbol}</span> tokens from bins
//                       with prices <span className="font-semibold">higher</span> than that of the{' '}
//                       <span className="font-semibold text-green-dark-400">active bin</span>.{' '}
//                       <span className="font-semibold text-green-dark-400">{poolData.tokenX.symbol}</span> tokens in the{' '}
//                       <span className="font-semibold text-green-dark-400">active bin</span> will remain in the pool.
//                     </p>
//                   </div>
//                   {removeLiquidityInput?.ids?.length === 0 ? (
//                     <div className="text-center py-12">
//                       <p className="">You have no liquidity in this range.</p>
//                     </div>
//                   ) : (
//                     <>
//                       {/* Approve Button */}
//                       {!binApproved && (
//                         <Button
//                           className="w-full h-12 bg-green-dark-500 hover:bg-green-dark-400 text-green-dark-950"
//                           onClick={handleApproveBinCall}
//                           disabled={isApproveBinLoading}
//                         >
//                           {isApproveBinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve to continue`}
//                         </Button>
//                       )}

//                       {/* You will receive section */}
//                       <div>
//                         <h4 className="font-semibold mb-4 ">You will receive:</h4>

//                         <div className="flex items-center justify-center gap-2 mb-6">
//                           <TokenTicker
//                             logoURI={
//                               tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI
//                             }
//                             symbol={poolData.tokenX.symbol}
//                             className="w-6 h-6"
//                           />
//                           <span className="text-xl font-semibold ">{removeLiquidityInput.tokenXAmount}</span>
//                         </div>

//                         {/* Details */}
//                         <div className="space-y-3 text-sm">
//                           <div className="flex justify-between">
//                             <span className="">Price Range</span>
//                             <span className="">
//                               {formatNumber(minWithdrawPriceWithDecimals, 4, 0, numberLocale)}-{' '}
//                               {formatNumber(maxWithdrawPriceWithDecimals, 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="">Amount Slippage Tolerance</span>
//                             <span className="">{liquidityTolerance}%</span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="">Minimum Expected {poolData.tokenX.symbol}</span>
//                             <span className="">
//                               {formatNumber(removeLiquidityInput.tokenXAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Remove Liquidity Button */}
//                       <Button
//                         className="w-full h-12 bg-green-dark-500 hover:bg-green-dark-400 text-green-dark-950"
//                         onClick={handleRemoveLiquidityContractCall}
//                         disabled={
//                           isRemoveLiquidityLoading === 'removeLiquidity' ||
//                           isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ||
//                           !binApproved
//                         }
//                       >
//                         {isRemoveLiquidityLoading === 'removeLiquidity' ||
//                         isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ? (
//                           <Loader2 className="w-4 h-4 animate-spin" />
//                         ) : removeLiquidityChunks.length > 1 ? (
//                           `Remove Liquidity (${removeLiquidityChunks.length} transactions)`
//                         ) : (
//                           'Remove Liquidity'
//                         )}
//                       </Button>
//                     </>
//                   )}
//                 </TabsContent>
//                 {/* Remove USDT Tab */}
//                 <TabsContent value="tokenY" className="space-y-6">
//                   {/* Explanation */}
//                   <div className="bg-green-dark-800 p-4 rounded-lg border border-green-dark-700">
//                     <p className="text-sm text-green-dark-100">
//                       You will remove <span className="font-semibold text-green-dark-400">{poolData.tokenY.symbol}</span> tokens from bins
//                       with prices <span className="font-semibold">lower</span> than that of the{' '}
//                       <span className="font-semibold text-green-dark-400">active bin</span>.{' '}
//                       <span className="font-semibold text-green-dark-400">{poolData.tokenY.symbol}</span> tokens in the{' '}
//                       <span className="font-semibold text-green-dark-400">active bin</span> will remain in the pool.
//                     </p>
//                   </div>

//                   {/* No Liquidity Message */}
//                   {removeLiquidityInput?.ids?.length === 0 ? (
//                     <div className="text-center py-12">
//                       <p className="">You have no liquidity in this range.</p>
//                     </div>
//                   ) : (
//                     <>
//                       {/* Approve Button */}
//                       {!binApproved && (
//                         <Button
//                           className="w-full h-12 bg-green-dark-500 hover:bg-green-dark-400 text-green-dark-950"
//                           onClick={handleApproveBinCall}
//                           disabled={isApproveBinLoading}
//                         >
//                           {isApproveBinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : `Approve to continue`}
//                         </Button>
//                       )}

//                       {/* You will receive section */}
//                       <div>
//                         <h4 className="font-semibold mb-4 text-green-dark-100">You will receive:</h4>

//                         <div className="flex items-center justify-center gap-2 mb-6">
//                           <TokenTicker
//                             logoURI={
//                               tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI
//                             }
//                             symbol={poolData.tokenY.symbol}
//                             className="w-6 h-6"
//                           />
//                           <span className="text-xl font-semibold text-green-dark-100">
//                             {formatNumber(removeLiquidityInput.tokenYAmount, 4, 0, numberLocale)}
//                           </span>
//                         </div>

//                         {/* Details */}
//                         <div className="space-y-3 text-sm">
//                           <div className="flex justify-between">
//                             <span className="text-green-dark-300">Price Range</span>
//                             <span className="text-green-dark-100">
//                               {formatNumber(minWithdrawPriceWithDecimals, 4, 0, numberLocale)}-{' '}
//                               {formatNumber(maxWithdrawPriceWithDecimals, 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="text-green-dark-300">Amount Slippage Tolerance</span>
//                             <span className="text-green-dark-100">{liquidityTolerance}%</span>
//                           </div>
//                           <div className="flex justify-between">
//                             <span className="text-green-dark-300">Minimum Expected {poolData.tokenY.symbol}</span>
//                             <span className="text-green-dark-100">
//                               {formatNumber(removeLiquidityInput.tokenYAmount * (1 - liquidityTolerance / 100), 4, 0, numberLocale)}
//                             </span>
//                           </div>
//                         </div>
//                       </div>

//                       {/* Remove Liquidity Button */}
//                       <Button
//                         className="w-full h-12 bg-green-dark-500 hover:bg-green-dark-400 text-green-dark-950"
//                         onClick={handleRemoveLiquidityContractCall}
//                         disabled={
//                           isRemoveLiquidityLoading === 'removeLiquidity' ||
//                           isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ||
//                           !binApproved
//                         }
//                       >
//                         {isRemoveLiquidityLoading === 'removeLiquidity' ||
//                         isRemoveLiquidityLoading === 'waitingForRemoveLiquidityConfirmation' ? (
//                           <Loader2 className="w-4 h-4 animate-spin" />
//                         ) : removeLiquidityChunks.length > 1 ? (
//                           `Remove Liquidity (${removeLiquidityChunks.length} transactions)`
//                         ) : (
//                           'Remove Liquidity'
//                         )}
//                       </Button>
//                     </>
//                   )}
//                 </TabsContent>
//               </>
//             )}
//           </Tabs>
//         </TabsContent>
//       </Tabs>
//     </div>
//   );
// }
