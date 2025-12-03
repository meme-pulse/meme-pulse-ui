import { useState, useMemo, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import AutoFillSwitch from '../auto-fill-switch';
import TokenTicker from '../token-ticker';
import { DualRangeSlider } from '../ui/dual-range-slider';
import {
  LiquidityDistribution,
  getBidAskDistributionFromBinRange,
  getCurveDistributionFromBinRange,
  getUniformDistributionFromBinRange,
  LB_ROUTER_V22_ADDRESS,
} from '../../lib/sdk';
import { Token, TokenAmount, WNATIVE, NATIVE_SYMBOL } from '../../lib/sdk';
import ApproveButton from '../approve-button';
import type { PoolData } from '@/PoolDetail';
import { Bar } from 'react-chartjs-2';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend } from 'chart.js';
import { useQuery } from '@tanstack/react-query';
import { DEFAULT_CHAINID } from '@/constants';
import { getBinDistributionData } from '@/lib/hasura-client';
import { getPriceFromId, getIdFromPrice } from '@/lib/bin';
import { formatNumber, formatStringOnlyLocale, formatUSDWithLocale, getNumberStringValue, getNumberValue } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { useActiveId } from '@/hooks/use-active-id';
import { useTokensData, NATIVE_TOKEN_ADDRESS } from '@/hooks/use-token-data';
import { useAllowance } from '@/hooks/use-allowance';
import { useAccount } from 'wagmi';
import { parseUnits, zeroAddress } from 'viem';
import AddLiquidityButton from '../add-liquidity-button';
import { useDebounce } from '@/hooks/use-debounce';
import { ArrowLeftRight, RotateCcw } from 'lucide-react';
import { useTokenPrices } from '@/hooks/use-token-price';
import annotationPlugin from 'chartjs-plugin-annotation';

// Register Chart.js components
ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend, annotationPlugin);

const liquidityShapes = [
  {
    id: LiquidityDistribution.SPOT,
    name: 'Spot',
    icon: '/shape_spot.svg',
    description: 'Concentrated liquidity',
  },
  {
    id: LiquidityDistribution.CURVE,
    name: 'Curve',
    icon: '/shape_curve.svg',
    description: 'Curved distribution',
  },
  {
    id: LiquidityDistribution.BID_ASK,
    name: 'Bid-Ask',
    icon: '/shape_bidask.svg',
    description: 'Bid-ask spread',
  },
];

interface BinData {
  priceX: number;
  priceY: number;
  reserveX: number;
  reserveY: number;
  binId: number;
  tokenXHeight: number;
  tokenYHeight: number;
  tokenXSymbol: string;
  tokenYSymbol: string;
}

interface AddPositionCardProps {
  poolData: PoolData;
  tokenListData?: Array<{ address: string; logoURI?: string }>;
  yBaseCurrency: boolean;
  setYBaseCurrency: (value: boolean) => void;
}

const DEFAULT_BIN_COUNT = 51;

export function AddPositionCard({ poolData: originalPoolData, tokenListData, yBaseCurrency, setYBaseCurrency }: AddPositionCardProps) {
  const { address } = useAccount();

  const [isNativeIn, setIsNativeIn] = useState(false);
  const { data: tokenPrices } = useTokenPrices({ addresses: [originalPoolData.tokenX.address, originalPoolData.tokenY.address] });
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const [liquidityTolerance] = useLocalStorage('liquidity-tolerance', 0.1);
  const [autoFill] = useLocalStorage('autoFill', false);
  const [selectedShape, setSelectedShape] = useState(LiquidityDistribution.SPOT);
  const activeId = useActiveId(originalPoolData.pairAddress as `0x${string}`, originalPoolData.activeBinId);

  const [sliderPriceRange, setSliderPriceRange] = useState<[number, number]>([-(DEFAULT_BIN_COUNT - 1) / 2, (DEFAULT_BIN_COUNT - 1) / 2]);
  const [sliderMinValue, setSliderMinValue] = useState(-(DEFAULT_BIN_COUNT - 1) / 2);
  const [sliderMaxValue, setSliderMaxValue] = useState((DEFAULT_BIN_COUNT - 1) / 2);
  const [minPriceBinId, setMinPriceBinId] = useState(activeId - (DEFAULT_BIN_COUNT - 1) / 2);
  const [maxPriceBinId, setMaxPriceBinId] = useState(activeId + (DEFAULT_BIN_COUNT - 1) / 2);

  const poolData = useMemo(() => {
    const wnativeAddress = WNATIVE[DEFAULT_CHAINID].address.toLowerCase();
    const nativeSymbol = NATIVE_SYMBOL[DEFAULT_CHAINID];
    if (originalPoolData.tokenX.address.toLowerCase() === wnativeAddress && isNativeIn) {
      return {
        ...originalPoolData,
        tokenX: { ...originalPoolData.tokenX, symbol: nativeSymbol, address: NATIVE_TOKEN_ADDRESS as `0x${string}` },
      };
    } else if (originalPoolData.tokenY.address.toLowerCase() === wnativeAddress && isNativeIn) {
      return {
        ...originalPoolData,
        tokenY: { ...originalPoolData.tokenY, symbol: nativeSymbol, address: NATIVE_TOKEN_ADDRESS as `0x${string}` },
      };
    } else {
      return originalPoolData;
    }
  }, [originalPoolData, isNativeIn]);

  const [minPriceWithDecimals, setMinPriceWithDecimals] = useState('');
  const [minPricePercent, setMinPricePercent] = useState('');
  const [maxPriceWithDecimals, setMaxPriceWithDecimals] = useState('');
  const [maxPricePercent, setMaxPricePercent] = useState('');
  const [numBins, setNumBins] = useState('');

  const currentPriceWithDecimals = useMemo(
    () =>
      yBaseCurrency
        ? (1 / getPriceFromId(activeId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : getPriceFromId(activeId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
    [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals, yBaseCurrency]
  );
  const currentPriceXInYWithDecimals = useMemo(
    () => getPriceFromId(activeId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
    [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
  );
  const currentPriceYInXWithDecimals = useMemo(
    () => (1 / getPriceFromId(activeId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals),
    [activeId, poolData.lbBinStep, poolData.tokenX.decimals, poolData.tokenY.decimals]
  );
  const onAddLiquidityParamChange = (action: string, value: string) => {
    // 1. min Price value change -> (set minPricePercent, set numBins, set sliderPriceRange , set minPriceBinId)
    // 2. min Price percent value change -> (set minPriceWithDecimals, set numBins, set sliderPriceRange , set minPriceBinId)
    // 3. max Price value change -> (set maxPricePercent, set numBins, set sliderPriceRange , set maxPriceBinId)
    // 4. max Price percent value change -> (set maxPriceWithDecimals, set numBins, set sliderPriceRange , set maxPriceBinId)
    // 5. numBins value change -> (set sliderPriceRange ,  set maxPriceBinId, set maxPrice, setMaxPricePercent)
    // 6-1. on slider min changes -> (set minPriceBinId, set minPriceWithDecimals, set minPricePercent, set numBins)
    // 6-2. on slider max changes -> (set maxPriceBinId, set maxPriceWithDecimals, set maxPricePercent, set numBins)

    // 1. min Price value change
    if (action === 'minPriceValueChange') {
      // set minPricePercent, set numBins, set sliderPriceRange , set minPriceBinId
      const minPriceRefValue = value;
      if (minPriceRefValue === '' || minPriceRefValue === '.') {
        return;
      }

      const price = getNumberValue(minPriceRefValue, numberLocale);
      if (isNaN(price) || price < 0 || minPriceRefValue.endsWith('.')) {
        return;
      } else {
        const binId = yBaseCurrency
          ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
          : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

        if (binId === Infinity || binId === -Infinity) {
          return;
        }

        const priceFromId = yBaseCurrency
          ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
          : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

        // console.log(price, 'priceFromRealBinId', priceFromId);
        setMinPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));
        setMinPriceBinId(binId);
        const awayFromActiveId = binId - activeId;
        setSliderMinValue(awayFromActiveId);
        setSliderPriceRange((prev) => [awayFromActiveId, prev[1]]);
        setNumBins((maxPriceBinId - binId + 1).toString());

        // caclulate percent from current price
        const percent = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;
        setMinPricePercent(formatNumber(percent, 2, 0, numberLocale));

        // when minPrice is greater than maxPrice, set maxPrice to minPrice
        // if (price > maxPriceWithDecimals) {
        // setMaxPriceWithDecimals(price.toString());
        // setMaxPricePercent((((Number(price) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100).toString());
        // }
      }
    } else if (action === 'minPricePercentChange') {
      // set minPriceWithDecimals, set numBins, set sliderPriceRange , set minPriceBinId
      const minPricePercentRefValue = value;
      const percentage = getNumberValue(minPricePercentRefValue, numberLocale);
      const newPriceWithDecimals = currentPriceWithDecimals * (1 + percentage / 100);

      const price = Number(newPriceWithDecimals);
      if (isNaN(price) || price < 0 || newPriceWithDecimals.toString().endsWith('.')) {
        return;
      } else {
        const binId = yBaseCurrency
          ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
          : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

        if (binId === Infinity || binId === -Infinity) {
          return;
        }

        const priceFromId = yBaseCurrency
          ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
          : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

        const percentFromPriceFromId = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;

        setMinPriceBinId(binId);
        const awayFromActiveId = binId - activeId;
        setSliderMinValue(awayFromActiveId);
        setSliderPriceRange((prev) => [awayFromActiveId, prev[1]]);
        setNumBins((maxPriceBinId - binId + 1).toString());
        setMinPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));
        setMinPricePercent(formatNumber(percentFromPriceFromId, 2, 0, numberLocale));
      }
    }
    if (action === 'maxPriceValueChange') {
      // set maxPricePercent, set numBins, set sliderPriceRange , set maxPriceBinId
      const maxPriceRefValue = value;
      if (maxPriceRefValue === '' || maxPriceRefValue === '.') {
        return;
      }

      const price = getNumberValue(maxPriceRefValue, numberLocale);
      if (isNaN(price) || price < 0 || maxPriceRefValue.endsWith('.')) {
        return;
      } else {
        const binId = yBaseCurrency
          ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
          : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

        if (binId === Infinity || binId === -Infinity) {
          return;
        }

        const priceFromId = yBaseCurrency
          ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
          : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

        setMaxPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));
        setMaxPriceBinId(binId);
        const awayFromActiveId = binId - activeId;
        setSliderMaxValue(awayFromActiveId);
        setSliderPriceRange((prev) => [prev[0], awayFromActiveId]);

        setNumBins((binId - minPriceBinId + 1).toString());

        // caclulate percent from current price
        const percent = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;
        setMaxPricePercent(formatNumber(percent, 2, 0, numberLocale));
      }
    } else if (action === 'maxPricePercentChange') {
      // set maxPriceWithDecimals, set numBins, set sliderPriceRange , set maxPriceBinId
      const maxPricePercentRefValue = value;
      const percentage = getNumberValue(maxPricePercentRefValue, numberLocale);
      const newPriceWithDecimals = currentPriceWithDecimals * (1 + percentage / 100);

      const price = Number(newPriceWithDecimals);
      if (isNaN(price) || price < 0 || newPriceWithDecimals.toString().endsWith('.')) {
        return;
      } else {
        const binId = yBaseCurrency
          ? getIdFromPrice((1 / price) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep)
          : getIdFromPrice(price * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals), poolData.lbBinStep);

        if (binId === Infinity || binId === -Infinity) {
          return;
        }

        const priceFromId = yBaseCurrency
          ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
          : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

        setMaxPriceBinId(binId);
        const awayFromActiveId = binId - activeId;
        setSliderMaxValue(awayFromActiveId);
        setSliderPriceRange((prev) => [prev[0], awayFromActiveId]);

        setNumBins((binId - minPriceBinId + 1).toString());
        setMaxPriceWithDecimals(formatNumber(priceFromId, 18, 0, numberLocale));

        const percentFromPriceFromId = ((priceFromId - currentPriceWithDecimals) / currentPriceWithDecimals) * 100;

        setMaxPricePercent(formatNumber(percentFromPriceFromId, 2, 0, numberLocale));
      }
    }
    if (action === 'numBinsChange') {
      // alway change maxbinid
      const numBins = Number(value);
      if (isNaN(numBins) || value.toString().endsWith('.')) {
        return;
      }

      const maxBinId = minPriceBinId + numBins - 1;

      const awayFromActiveId = maxBinId - activeId;
      setSliderMaxValue(awayFromActiveId);
      setSliderPriceRange((prev) => [prev[0], awayFromActiveId]);
      setMaxPriceBinId(maxBinId);
      const newMaxPriceWithDecimals = yBaseCurrency
        ? (1 / getPriceFromId(maxBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : getPriceFromId(maxBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

      setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
      setMaxPricePercent(
        formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
      );
    }
  };
  // when ybasecurrency change or activeId changes, set the value of the input
  useEffect(() => {
    const newMinPriceBinId = activeId - (DEFAULT_BIN_COUNT - 1) / 2;
    const newMaxPriceBinId = activeId + (DEFAULT_BIN_COUNT - 1) / 2;

    setMinPriceBinId(newMinPriceBinId);
    setMaxPriceBinId(newMaxPriceBinId);
    setSliderMinValue(-(DEFAULT_BIN_COUNT - 1) / 2);
    setSliderMaxValue((DEFAULT_BIN_COUNT - 1) / 2);
    setSliderPriceRange([-(DEFAULT_BIN_COUNT - 1) / 2, (DEFAULT_BIN_COUNT - 1) / 2]);

    const newMinPriceWithDecimals = yBaseCurrency
      ? (1 / getPriceFromId(newMinPriceBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
      : getPriceFromId(newMinPriceBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

    const newMaxPriceWithDecimals = yBaseCurrency
      ? (1 / getPriceFromId(newMaxPriceBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
      : getPriceFromId(newMaxPriceBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

    setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
    setMinPricePercent(
      formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
    );
    setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
    setMaxPricePercent(
      formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
    );
    setNumBins((newMaxPriceBinId - newMinPriceBinId + 1).toString());
  }, [
    yBaseCurrency,
    activeId,
    poolData.lbBinStep,
    poolData.tokenX.decimals,
    poolData.tokenY.decimals,
    currentPriceWithDecimals,
    numberLocale,
  ]);
  const onSliderChange = (sliderValues: number[]) => {
    const minValue = sliderValues[0];
    const maxValue = sliderValues[1];
    setSliderMinValue(minValue);
    setSliderMaxValue(maxValue);

    if (yBaseCurrency) {
      console.log('yBaseCurrency', yBaseCurrency, sliderPriceRange);
      const minBinId = activeId + sliderPriceRange[0] - (maxValue - sliderPriceRange[1]);
      setMinPriceBinId(minBinId);
      const newMinPriceWithDecimals = yBaseCurrency
        ? (1 / getPriceFromId(minBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : getPriceFromId(minBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
      setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
      setMinPricePercent(
        formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
      );

      const maxBinId = activeId + sliderPriceRange[1] - (minValue - sliderPriceRange[0]);
      setMaxPriceBinId(maxBinId);
      const newMaxPriceWithDecimals = yBaseCurrency
        ? (1 / getPriceFromId(maxBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : getPriceFromId(maxBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
      setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
      setMaxPricePercent(
        formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
      );
    } else {
      const minBinId = activeId + minValue;
      setMinPriceBinId(minBinId);
      const newMinPriceWithDecimals = yBaseCurrency
        ? (1 / getPriceFromId(minBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : getPriceFromId(minBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
      setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
      setMinPricePercent(
        formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
      );

      const maxBinId = activeId + maxValue;
      setMaxPriceBinId(maxBinId);
      const newMaxPriceWithDecimals = yBaseCurrency
        ? (1 / getPriceFromId(maxBinId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
        : getPriceFromId(maxBinId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
      setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
      setMaxPricePercent(
        formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
      );
    }

    setNumBins((maxValue - minValue + 1).toString());
  };

  const onResetPriceRange = () => {
    setSliderPriceRange([-(DEFAULT_BIN_COUNT - 1) / 2, (DEFAULT_BIN_COUNT - 1) / 2]);

    setSliderMinValue(-(DEFAULT_BIN_COUNT - 1) / 2);
    setSliderMaxValue((DEFAULT_BIN_COUNT - 1) / 2);

    setMinPriceBinId(activeId - (DEFAULT_BIN_COUNT - 1) / 2);
    setMaxPriceBinId(activeId + (DEFAULT_BIN_COUNT - 1) / 2);

    const newMinPriceWithDecimals = yBaseCurrency
      ? (1 / getPriceFromId(activeId - (DEFAULT_BIN_COUNT - 1) / 2, poolData.lbBinStep)) *
        10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
      : getPriceFromId(activeId - (DEFAULT_BIN_COUNT - 1) / 2, poolData.lbBinStep) *
        10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

    setMinPriceWithDecimals(formatNumber(newMinPriceWithDecimals, 18, 0, numberLocale));
    setMinPricePercent(
      formatNumber(((Number(newMinPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
    );

    const newMaxPriceWithDecimals = yBaseCurrency
      ? (1 / getPriceFromId(activeId + (DEFAULT_BIN_COUNT - 1) / 2, poolData.lbBinStep)) *
        10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
      : getPriceFromId(activeId + (DEFAULT_BIN_COUNT - 1) / 2, poolData.lbBinStep) *
        10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

    setMaxPriceWithDecimals(formatNumber(newMaxPriceWithDecimals, 18, 0, numberLocale));
    setMaxPricePercent(
      formatNumber(((Number(newMaxPriceWithDecimals) - currentPriceWithDecimals) / currentPriceWithDecimals) * 100, 2, 0, numberLocale)
    );

    setNumBins((activeId + (DEFAULT_BIN_COUNT - 1) / 2 - (activeId - (DEFAULT_BIN_COUNT - 1) / 2) + 1).toString());

    // setEasyModePreset(null);
  };

  const { data: tokenBalanceData } = useTokensData({
    tokenAddresses: [poolData.tokenX.address as `0x${string}`, poolData.tokenY.address as `0x${string}`, zeroAddress],
    enabled: true,
  });
  const [typedAmountX, setTypedAmountX] = useState('');
  const [typedAmountY, setTypedAmountY] = useState('');

  const debouncedAmountX = useDebounce(
    (() => {
      try {
        const cleanedTypedAmountX = getNumberStringValue(typedAmountX, numberLocale);
        parseUnits(cleanedTypedAmountX, poolData.tokenX.decimals);
        return cleanedTypedAmountX;
      } catch (error) {
        console.error(error);
        return '0';
      }
    })(),
    500
  );
  const debouncedAmountY = useDebounce(
    (() => {
      try {
        const cleanedTypedAmountY = getNumberStringValue(typedAmountY, numberLocale);
        parseUnits(cleanedTypedAmountY, poolData.tokenY.decimals);
        return cleanedTypedAmountY;
      } catch (error) {
        console.error(error);
        return '0';
      }
    })(),
    500
  );
  const debouncedMinPriceBinId = useDebounce(minPriceBinId, 500);
  const debouncedMaxPriceBinId = useDebounce(maxPriceBinId, 500);

  const inputAmountXAvailable = useMemo(() => {
    const balanceX = Number(tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance ?? '0');
    const isDisabled = debouncedMaxPriceBinId < activeId;

    console.log('[Input X Availability Check]', {
      debouncedMaxPriceBinId,
      minPriceBinId,
      maxPriceBinId,
      activeId,
      balanceX,
      hasBalance: balanceX > 0,
      isDisabled,
      condition: `debouncedMaxPriceBinId (${debouncedMaxPriceBinId}) < activeId (${activeId})`,
    });

    if (isDisabled) {
      console.log('[Input X Disabled]', {
        reason: 'debouncedMaxPriceBinId < activeId',
        debouncedMaxPriceBinId,
        activeId,
        balanceX,
        hasBalance: balanceX > 0,
        message: `Max price bin (${debouncedMaxPriceBinId}) is below active bin (${activeId}). X token can only be used when binId >= activeId.`,
      });
      return false;
    }

    return true;
  }, [activeId, debouncedMaxPriceBinId, tokenBalanceData, poolData.tokenX.address, minPriceBinId, maxPriceBinId]);

  const inputAmountYAvailable = useMemo(() => {
    const balanceY = Number(tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance ?? '0');
    const isDisabled = debouncedMinPriceBinId > activeId;

    console.log('[Input Y Availability Check]', {
      debouncedMinPriceBinId,
      minPriceBinId,
      maxPriceBinId,
      activeId,
      balanceY,
      hasBalance: balanceY > 0,
      isDisabled,
      condition: `debouncedMinPriceBinId (${debouncedMinPriceBinId}) > activeId (${activeId})`,
    });

    if (isDisabled) {
      console.log('[Input Y Disabled]', {
        reason: 'debouncedMinPriceBinId > activeId',
        debouncedMinPriceBinId,
        activeId,
        balanceY,
        hasBalance: balanceY > 0,
        message: `Min price bin (${debouncedMinPriceBinId}) is above active bin (${activeId}). Y token can only be used when binId <= activeId.`,
      });
      return false;
    }

    return true;
  }, [activeId, debouncedMinPriceBinId, tokenBalanceData, poolData.tokenY.address, minPriceBinId, maxPriceBinId]);

  // Reset typed amounts when inputs become disabled
  useEffect(() => {
    if (!inputAmountXAvailable) {
      setTypedAmountX('0');
    }
  }, [inputAmountXAvailable]);

  useEffect(() => {
    if (!inputAmountYAvailable) {
      setTypedAmountY('0');
    }
  }, [inputAmountYAvailable]);

  // declare liquidity parameters
  const [addLiquidityInput, setAddLiquidityInput] = useState({
    tokenX: originalPoolData.tokenX.address as `0x${string}`,
    tokenY: originalPoolData.tokenY.address as `0x${string}`,
    binStep: originalPoolData.lbBinStep,
    amountX: '0',
    amountY: '0',
    amountXMin: '0',
    amountYMin: '0',
    activeIdDesired: activeId,
    idSlippage: 5,
    deltaIds: [] as number[],
    distributionX: [] as bigint[],
    distributionY: [] as bigint[],
    to: address,
    refundTo: address,
    deadline: Math.floor(Date.now() / 1000) + 3600,
  });

  // Fetch chart data
  const { data: binDistributionData, isLoading: isBinDistributionDataLoading } = useQuery({
    queryKey: ['binDistributionData', poolData.pairAddress, activeId, sliderPriceRange],
    refetchInterval: 10000,
    queryFn: () => {
      const fromId = activeId + sliderPriceRange[0];
      const toId = activeId + sliderPriceRange[1];
      return getBinDistributionData(poolData.pairAddress, fromId, toId);
    },
    select: (data) => {
      // Create a map of existing data by binId
      const existingDataMap = new Map<number, BinData>();

      type BinDataBody = {
        priceX: string;
        priceY: string;
        reserveX: string;
        reserveY: string;
        binId: number;
      };

      // Process the fetched data - API returns { Bin: [...] }
      data.Bin.forEach((row: BinDataBody) => {
        const binId = Number(row.binId);
        existingDataMap.set(binId, {
          priceX: Number(row.priceX),
          priceY: Number(row.priceY),
          reserveX: Number(row.reserveX),
          reserveY: Number(row.reserveY),
          binId,
          tokenXHeight: Number(row.priceX) * Number(row.reserveY),
          tokenYHeight: Number(row.reserveX),
          tokenXSymbol: poolData.tokenX.symbol,
          tokenYSymbol: poolData.tokenY.symbol,
        });
      });

      // Create complete data array with all bins from fromId to toId
      const completeData: BinData[] = [];
      for (let binId = activeId + sliderPriceRange[0]; binId <= activeId + sliderPriceRange[1]; binId++) {
        const existingData = existingDataMap.get(binId);
        if (existingData) {
          completeData.push(existingData);
        } else {
          // Create empty bin data for missing bins
          const priceY = getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
          completeData.push({
            priceX: 0,
            priceY: priceY,
            reserveX: 0,
            reserveY: 0,
            binId,
            tokenXHeight: 0,
            tokenYHeight: 0,
            tokenXSymbol: poolData.tokenX.symbol,
            tokenYSymbol: poolData.tokenY.symbol,
          });
        }
      }

      return completeData;
    },
    enabled: !!poolData.pairAddress && !!activeId,
  });

  // Chart.js data format with distribution simulation
  const binDistributionChartData = useMemo(() => {
    if (!binDistributionData || !activeId || !poolData.lbBinStep || !poolData.tokenX.decimals || !poolData.tokenY.decimals)
      return { datasets: [] };
    const minBinId = yBaseCurrency ? activeId + sliderPriceRange[0] - (sliderMaxValue - sliderPriceRange[1]) : activeId + sliderMinValue;
    const maxBinId = yBaseCurrency ? activeId + sliderPriceRange[1] - (sliderMinValue - sliderPriceRange[0]) : activeId + sliderMaxValue;

    // Create labels array for x-axis
    const labels = yBaseCurrency
      ? binDistributionData.map((bin: BinData) => bin.binId).reverse()
      : binDistributionData.map((bin: BinData) => bin.binId);

    // Create data arrays for each token
    const tokenYData = binDistributionData.map((bin: BinData) => ({
      x: bin.binId,
      y: bin.tokenYHeight, // Keep height for visual scaling
      reserve: bin.reserveY, // Store actual reserve for tooltip
    }));

    const tokenXData = binDistributionData.map((bin: BinData) => ({
      x: bin.binId,
      y: bin.tokenXHeight, // Keep height for visual scaling
      reserve: bin.reserveX, // Store actual reserve for tooltip
    }));

    // Reverse data arrays when yBaseCurrency is true to match reversed labels
    const finalTokenYData = yBaseCurrency ? tokenYData.reverse() : tokenYData;
    const finalTokenXData = yBaseCurrency ? tokenXData.reverse() : tokenXData;

    // Create background colors array with lighter neutral colors
    const tokenYColors = binDistributionData.map((bin: BinData) => {
      const isInRange = bin.binId >= minBinId && bin.binId <= maxBinId;
      return isInRange ? 'rgba(107, 114, 128, 0.6)' : 'rgba(107, 114, 128, 0.2)'; // Lighter Gray
    });

    const tokenXColors = binDistributionData.map((bin: BinData) => {
      const isInRange = bin.binId >= minBinId && bin.binId <= maxBinId;
      return isInRange ? 'rgba(107, 114, 128, 0.6)' : 'rgba(107, 114, 128, 0.2)'; // Same Lighter Gray
    });

    // Reverse color arrays when yBaseCurrency is true to match reversed data
    const finalTokenYColors = yBaseCurrency ? tokenYColors.reverse() : tokenYColors;
    const finalTokenXColors = yBaseCurrency ? tokenXColors.reverse() : tokenXColors;

    return {
      labels,
      datasets: [
        {
          label: poolData.tokenY.symbol,
          data: finalTokenYData,
          backgroundColor: finalTokenYColors,
          borderWidth: 0,
          barThickness: 'flex' as const,
          maxBarThickness: 20,
        },
        {
          label: poolData.tokenX.symbol,
          data: finalTokenXData,
          backgroundColor: finalTokenXColors,
          borderWidth: 0,
          barThickness: 'flex' as const,
          maxBarThickness: 20,
        },
      ],
    };
  }, [binDistributionData, sliderMinValue, sliderMaxValue, sliderPriceRange, poolData, activeId, yBaseCurrency]);

  // Distribution chart data (for the upper chart with center line) - Enhanced with real distribution simulation
  const simulationChartData = useMemo(() => {
    if (!activeId || !poolData.lbBinStep || !poolData.tokenX.decimals || !poolData.tokenY.decimals) {
      return { datasets: [], labels: [] };
    }
    const binRange = [Math.min(debouncedMinPriceBinId, debouncedMaxPriceBinId), Math.max(debouncedMinPriceBinId, debouncedMaxPriceBinId)];

    // Calculate simulated distribution based on selected shape
    let simulatedDistribution: {
      binIds: number[];
      deltaIds: number[];
      distributionX: bigint[];
      distributionY: bigint[];
    } | null = null;

    if (selectedShape === LiquidityDistribution.BID_ASK) {
      const { deltaIds, distributionX, distributionY } = getBidAskDistributionFromBinRange(activeId, binRange, [
        new TokenAmount(
          new Token(
            DEFAULT_CHAINID,
            poolData.tokenX.address as `0x${string}`,
            poolData.tokenX.decimals,
            poolData.tokenX.symbol,
            poolData.tokenX.name
          ),
          parseUnits(debouncedAmountX || '0', poolData.tokenX.decimals)
        ),
        new TokenAmount(
          new Token(
            DEFAULT_CHAINID,
            poolData.tokenY.address as `0x${string}`,
            poolData.tokenY.decimals,
            poolData.tokenY.symbol,
            poolData.tokenY.name
          ),
          parseUnits(debouncedAmountY || '0', poolData.tokenY.decimals)
        ),
      ]);
      simulatedDistribution = {
        binIds: deltaIds.map((deltaId) => activeId + deltaId),
        deltaIds,
        distributionX,
        distributionY,
      };
    } else if (selectedShape === LiquidityDistribution.CURVE) {
      const { deltaIds, distributionX, distributionY } = getCurveDistributionFromBinRange(
        activeId,
        binRange,
        [
          new TokenAmount(
            new Token(
              DEFAULT_CHAINID,
              poolData.tokenX.address as `0x${string}`,
              poolData.tokenX.decimals,
              poolData.tokenX.symbol,
              poolData.tokenX.name
            ),
            parseUnits(debouncedAmountX || '0', poolData.tokenX.decimals)
          ),
          new TokenAmount(
            new Token(
              DEFAULT_CHAINID,
              poolData.tokenY.address as `0x${string}`,
              poolData.tokenY.decimals,
              poolData.tokenY.symbol,
              poolData.tokenY.name
            ),
            parseUnits(debouncedAmountY || '0', poolData.tokenY.decimals)
          ),
        ],
        0.1
      );
      simulatedDistribution = {
        binIds: deltaIds.map((deltaId) => activeId + deltaId),
        deltaIds,
        distributionX,
        distributionY,
      };
    } else if (selectedShape === LiquidityDistribution.SPOT) {
      const { deltaIds, distributionX, distributionY } = getUniformDistributionFromBinRange(activeId, binRange);
      simulatedDistribution = {
        binIds: deltaIds.map((deltaId) => activeId + deltaId),
        deltaIds,
        distributionX,
        distributionY,
      };
    }

    if (!simulatedDistribution) {
      return { datasets: [], labels: [] };
    }
    const minBinId = debouncedMinPriceBinId;
    const maxBinId = debouncedMaxPriceBinId;

    if (activeId <= minBinId) {
      if (!Number(debouncedAmountX)) {
        return { datasets: [], labels: [] };
      }
    }

    if (activeId >= maxBinId) {
      if (!Number(debouncedAmountY)) {
        return { datasets: [], labels: [] };
      }
    }

    if (minBinId <= activeId && activeId <= maxBinId) {
      if (!Number(debouncedAmountX) || !Number(debouncedAmountY)) {
        return { datasets: [], labels: [] };
      }
    }

    // (1 - liquidityTolerance / 100)
    // 0.1 -> 0.1%
    const slippageToleranceAmountX = (Number(debouncedAmountX) * (1 - liquidityTolerance / 100)).toFixed(poolData.tokenX.decimals);
    const slippageToleranceAmountY = (Number(debouncedAmountY) * (1 - liquidityTolerance / 100)).toFixed(poolData.tokenY.decimals);

    console.log({
      minBinId,
      maxBinId,
      binRange,
      amountX: debouncedAmountX,
      amountY: debouncedAmountY,
      amountXParsed: parseUnits(debouncedAmountX, poolData.tokenX.decimals).toString(),
      amountYParsed: parseUnits(debouncedAmountY, poolData.tokenY.decimals).toString(),
      simulatedDistribution,
    });

    const amountXMorethan0 = simulatedDistribution.distributionX.reduce((acc, val) => acc + val, 0n) > 0n;
    const amountYMorethan0 = simulatedDistribution.distributionY.reduce((acc, val) => acc + val, 0n) > 0n;

    setAddLiquidityInput((prev) => ({
      ...prev,
      deltaIds: simulatedDistribution.deltaIds,
      distributionX: simulatedDistribution.distributionX,
      distributionY: simulatedDistribution.distributionY,
      amountX: amountXMorethan0 ? parseUnits(debouncedAmountX, poolData.tokenX.decimals).toString() : '0',
      amountY: amountYMorethan0 ? parseUnits(debouncedAmountY, poolData.tokenY.decimals).toString() : '0',
      amountXMin: amountXMorethan0 ? parseUnits(slippageToleranceAmountX, poolData.tokenX.decimals).toString() : '0',
      amountYMin: amountYMorethan0 ? parseUnits(slippageToleranceAmountY, poolData.tokenY.decimals).toString() : '0',
      to: address as `0x${string}`,
      refundTo: address as `0x${string}`,
    }));

    const denominator = 1e18;
    const amountX = Number(debouncedAmountX) || 0;
    const amountY = Number(debouncedAmountY) || 0;

    const data = simulatedDistribution
      ? simulatedDistribution.binIds.map((binId, i) => {
          const price = yBaseCurrency
            ? (1 / getPriceFromId(binId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
            : getPriceFromId(binId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
          return {
            bin: binId,
            x: (Number(simulatedDistribution.distributionX[i]) / denominator) * amountX,
            y: (Number(simulatedDistribution.distributionY[i]) / denominator) * amountY,
            price: price,
            yHeight: (yBaseCurrency ? price : 1 / price) * (Number(simulatedDistribution.distributionY[i]) / denominator) * amountY,
            xHeight: (Number(simulatedDistribution.distributionX[i]) / denominator) * amountX,
          };
        })
      : [];

    // Reverse data arrays when yBaseCurrency is true to match reversed labels
    const finalData = yBaseCurrency ? data.reverse() : data;

    return {
      labels: yBaseCurrency ? simulatedDistribution.binIds.reverse() : simulatedDistribution.binIds,
      datasets: [
        {
          label: poolData.tokenY.symbol,
          data: finalData.map((bin) => bin.yHeight),
          backgroundColor: '#8bd2c6',
          borderWidth: 0,
          barThickness: 'flex' as const,
          maxBarThickness: 20,
          // Store actual token amounts for tooltip
          actualAmounts: finalData.map((bin) => bin.y),
        },
        {
          label: poolData.tokenX.symbol,
          data: finalData.map((bin) => bin.xHeight),
          backgroundColor: '#ff9f80',
          borderWidth: 0,
          barThickness: 'flex' as const,
          maxBarThickness: 20,
          // Store actual token amounts for tooltip
          actualAmounts: finalData.map((bin) => bin.x),
        },
      ],
    };
  }, [
    activeId,
    poolData,
    debouncedMinPriceBinId,
    debouncedMaxPriceBinId,
    debouncedAmountX,
    debouncedAmountY,
    liquidityTolerance,
    address,
    yBaseCurrency,
    selectedShape,
  ]);

  // Distribution chart options (upper chart with center line)
  const simulationChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 10,
        bottom: 0,
      },
    },
    elements: {
      bar: {
        borderWidth: 0,
      },
    },
    animation: {
      duration: 500,
      easing: 'easeInOutCubic' as const,
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#dbdae0',
        titleColor: '#121213',
        bodyColor: '#121213',
        borderColor: '#ffffff',
        borderWidth: 2,
        cornerRadius: 0,
        boxPadding: 4,
        displayColors: true,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: function (context: any[]) {
            const binId = context[0].label;
            const price = yBaseCurrency
              ? (1 / getPriceFromId(Number(binId), poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
              : getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
            return `Bin ID: ${binId} | Price: ${formatNumber(price, 6, 0, numberLocale)}`;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function (context: any) {
            const datasetLabel = context.dataset.label;
            const binId = context.label;

            const binIndex = simulationChartData.labels?.indexOf(Number(binId));
            if (binIndex !== undefined && binIndex !== -1) {
              const dataset = simulationChartData.datasets[context.datasetIndex];
              const actualAmount = (dataset as { actualAmounts?: number[] }).actualAmounts?.[binIndex] ?? 0;
              return `${datasetLabel}: ${formatNumber(actualAmount, 4, 0, numberLocale)}`;
            }
            return `${datasetLabel}: ${formatNumber(context.parsed?.y ?? 0, 4, 0, numberLocale)}`;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          afterLabel: function (context: any) {
            const binId = context.label;
            const price = yBaseCurrency
              ? (1 / getPriceFromId(Number(binId), poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
              : getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);

            const currentPrice = currentPriceWithDecimals;
            const priceDiff = ((price - currentPrice) / currentPrice) * 100;

            return `Price Change: ${priceDiff >= 0 ? '+' : ''}${formatNumber(priceDiff, 2, 0, numberLocale)}%`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        position: 'bottom' as const,
        stacked: true,
        ticks: {
          callback: (_value: unknown, index: number) => {
            const binId = simulationChartData.labels?.[index];
            if (!binId) return '';
            const priceY = yBaseCurrency
              ? (1 / getPriceFromId(Number(binId), poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
              : getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
            return formatNumber(priceY, 4, 0, numberLocale) || '';
          },
          maxTicksLimit: 4,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        categoryPercentage: 1.0,
        barPercentage: 1.0,
      },
      y: {
        stacked: true,
        beginAtZero: true,
        display: false,
        afterDataLimits: (scale: { max: number }) => {
          const max = scale.max;
          scale.max = max / 0.9;
        },
      },
    },
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const binDistributionChartOptions: any = {
    responsive: true,
    maintainAspectRatio: false,
    layout: {
      padding: {
        left: 0,
        right: 0,
        top: 10,
        bottom: 0,
      },
    },
    elements: {
      bar: {
        borderWidth: 0,
      },
    },
    animation: {
      duration: 500,
      easing: 'easeInOutCubic' as const,
    } as const,
    interaction: {
      intersect: false,
      mode: 'index' as const,
    },
    hover: {
      mode: 'index' as const,
      intersect: false,
      animationDuration: 200,
    },
    plugins: {
      annotation: {
        annotations: {
          line1: {
            type: 'line' as const,
            mode: 'vertical' as const,
            // find index
            xMin: () => {
              //
              const binId = activeId;
              const index = binDistributionChartData.labels?.indexOf(Number(binId));
              return index;
            },
            xMax: () => {
              const binId = activeId;
              const index = binDistributionChartData.labels?.indexOf(Number(binId));
              return index;
            },
            borderWidth: 2,
            borderDash: [6, 6],
            label: {
              content: `Bin ID: ${activeId}`,
              enabled: true, // 라벨 활성화
              position: 'start' as const, // 라인 상단에 위치
              backgroundColor: 'rgba(255, 99, 132, 0.8)',
              color: '#000', // 텍스트 색상을 흰색으로 설정하여 가시성 확보
              font: {
                size: 14,
              },
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
          } as any,
        },
        // label1: {
        //   type: 'label',
        //   xValue: (context) => {
        //     const binId = activeId;
        //     const index = binDistributionChartData.labels?.indexOf(Number(binId));
        //     return index;
        //   },
        //   yAdjust: 10,

        //   content: `Bin ID: ${activeId}`,
        //   font: {
        //     size: 14,
        //     color: '#000',
        //   },
        // },
      },
      legend: {
        display: false,
      },
      tooltip: {
        enabled: true,
        backgroundColor: '#dbdae0',
        titleColor: '#121213',
        bodyColor: '#121213',
        borderColor: '#ffffff',
        borderWidth: 2,
        cornerRadius: 0,
        boxPadding: 4,
        displayColors: true,
        callbacks: {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          title: function (context: any[]) {
            const binId = context[0].label;
            const price = yBaseCurrency
              ? (1 / getPriceFromId(Number(binId), poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
              : getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
            return `Bin ID: ${binId} | Price: ${formatNumber(price, 6, 0, numberLocale)}`;
          },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          label: function (context: any) {
            const datasetLabel = context.dataset.label;
            const binId = context.label;

            const binIndex = binDistributionChartData.labels?.indexOf(Number(binId));
            if (binIndex !== undefined && binIndex !== -1) {
              const dataset = binDistributionChartData.datasets[context.datasetIndex];
              if (dataset.data && dataset.data[binIndex]) {
                const actualReserve = dataset.data[binIndex].reserve; // This is the actual reserve amount
                return `${datasetLabel}: ${formatNumber(actualReserve, 4, 0, numberLocale)}`;
              }
            }

            return `${datasetLabel}: ${formatNumber(context.parsed?.y ?? 0, 4, 0, numberLocale)}`;
          },
        },
      },
    },
    scales: {
      x: {
        type: 'category' as const,
        position: 'bottom' as const,
        stacked: true,
        ticks: {
          callback: (_value: unknown, index: number) => {
            const binId = binDistributionChartData.labels?.[index];
            if (!binId) return '';
            const priceY = yBaseCurrency
              ? (1 / getPriceFromId(Number(binId), poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
              : getPriceFromId(Number(binId), poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
            return formatNumber(priceY, 4, 0, numberLocale) || '';
          },
          maxTicksLimit: 4,
        },
        grid: {
          display: false,
        },
        border: {
          display: false,
        },
        categoryPercentage: 1.0, // Remove category spacing
        barPercentage: 1.0, // Maximize bar width
      },
      y: {
        stacked: true,
        beginAtZero: true,
        display: false,
        // Limit Y-axis domain to 90% of max value (same as existing chart)
        afterDataLimits: (scale: { max: number }) => {
          const max = scale.max;
          scale.max = max / 0.9;
        },
      },
    },
  };

  // Memoize balance values to ensure proper updates when poolData or tokenBalanceData changes
  // Note: poolData already handles NATIVE_TOKEN_ADDRESS conversion based on isNativeIn,
  // so we can directly use poolData.tokenX.address and poolData.tokenY.address
  const amountXBalance = useMemo(() => {
    return tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance ?? '0';
  }, [poolData.tokenX.address, tokenBalanceData]);

  const amountYBalance = useMemo(() => {
    return tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance ?? '0';
  }, [poolData.tokenY.address, tokenBalanceData]);

  // Check allowance for both tokens
  const allowanceX = useAllowance(originalPoolData.tokenX.address, LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID]);
  const allowanceY = useAllowance(originalPoolData.tokenY.address, LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID]);

  // Calculate if approval is needed for each token
  const needsApprovalX = useMemo(() => {
    // Native token doesn't need approval
    const isNativeX = isNativeIn && originalPoolData.tokenX.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase();
    if (isNativeX) return false;

    // Check if amount is available and greater than 0
    if (!inputAmountXAvailable || !Number(debouncedAmountX)) return false;

    // Compare allowance with required amount
    const requiredAmount = parseUnits(debouncedAmountX || '0', originalPoolData.tokenX.decimals);
    return allowanceX < requiredAmount;
  }, [isNativeIn, originalPoolData.tokenX.address, originalPoolData.tokenX.decimals, inputAmountXAvailable, debouncedAmountX, allowanceX]);

  const needsApprovalY = useMemo(() => {
    // Native token doesn't need approval
    const isNativeY = isNativeIn && originalPoolData.tokenY.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase();
    if (isNativeY) return false;

    // Check if amount is available and greater than 0
    if (!inputAmountYAvailable || !Number(debouncedAmountY)) return false;

    // Compare allowance with required amount
    const requiredAmount = parseUnits(debouncedAmountY || '0', originalPoolData.tokenY.decimals);
    return allowanceY < requiredAmount;
  }, [isNativeIn, originalPoolData.tokenY.address, originalPoolData.tokenY.decimals, inputAmountYAvailable, debouncedAmountY, allowanceY]);

  // Disable add liquidity button if any approval is needed
  const needsApproval = needsApprovalX || needsApprovalY;

  return (
    <div className="space-y-4">
      {/* Header with Auto Fill */}
      <div className="flex items-center justify-between">
        <Label className="font-roboto font-semibold text-figma-text-dark text-[16px]">Enter deposit amount:</Label>
        <AutoFillSwitch />
      </div>

      {/* Token Input Fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Token X Input */}
        <div className="space-y-2">
          <div
            className="relative bg-white"
            style={{
              boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
            }}
          >
            <Input
              placeholder="Enter Amount"
              value={inputAmountXAvailable ? typedAmountX : ''}
              disabled={!inputAmountXAvailable}
              onChange={(e) => {
                setTypedAmountX(e.target.value);
                if (autoFill) {
                  try {
                    const price = currentPriceYInXWithDecimals;
                    const amountY = getNumberValue(e.target.value, numberLocale) / price;
                    if (!isNaN(amountY)) {
                      setTypedAmountY(formatNumber(amountY, poolData.tokenY.decimals, 0, numberLocale));
                    } else if (e.target.value === '') {
                      setTypedAmountY('');
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }
              }}
              className="pl-20 pr-4 h-16 !text-lg font-semibold bg-white border-0 text-figma-text-dark placeholder:text-figma-text-gray text-right font-roboto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <TokenTicker
                symbol={poolData.tokenX.symbol}
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase())?.logoURI}
                className="w-6 h-6"
              />
              <span className="text-sm font-medium text-figma-text-dark font-roboto flex items-center">
                {poolData.tokenX.symbol}
                {originalPoolData.tokenX.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase() && (
                  <button
                    type="button"
                    className="ml-1 px-1.5 py-0.5 text-[10px] bg-figma-purple/10 text-figma-purple hover:bg-figma-purple/20 transition-colors rounded flex items-center gap-0.5"
                    onClick={() => setIsNativeIn(!isNativeIn)}
                    title={isNativeIn ? 'Switch to WNATIVE deposit' : 'Switch to Native deposit'}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    {isNativeIn ? 'Native' : 'WNATIVE'}
                  </button>
                )}
              </span>
            </div>
            <div className="absolute right-4 top-1/2 translate-y-3 text-[10px] text-figma-text-gray font-roboto">
              {formatUSDWithLocale(
                Number(typedAmountX) * Number(tokenPrices?.find((token) => token.tokenAddress === poolData.tokenX.address)?.priceUsd ?? 0)
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-figma-text-gray font-roboto">
              Balance:{' '}
              {formatNumber(
                tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || 0,
                18,
                0,
                numberLocale
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                // if isNativeIn, reserve gas fee
                if (isNativeIn && originalPoolData.tokenX.address === WNATIVE[DEFAULT_CHAINID].address) {
                  const availableBalance =
                    Number(tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '') - 0.01 > 0
                      ? Number(tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '') - 0.01
                      : 0;

                  setTypedAmountX(formatNumber(availableBalance, 18, 0, numberLocale));
                } else {
                  setTypedAmountX(
                    formatStringOnlyLocale(
                      tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
                      // 18,
                      // 0,
                      numberLocale
                    )
                  );
                }

                if (autoFill) {
                  try {
                    const price = currentPriceXInYWithDecimals;
                    const amountY =
                      getNumberValue(
                        tokenBalanceData?.[poolData.tokenX.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
                        numberLocale
                      ) * price;
                    if (!isNaN(amountY)) {
                      setTypedAmountY(formatNumber(amountY, poolData.tokenY.decimals, 0, numberLocale));
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }
              }}
            >
              MAX
            </Button>
          </div>
        </div>

        {/* Token Y Input */}
        <div className="space-y-2">
          <div
            className="relative bg-white"
            style={{
              boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
            }}
          >
            <Input
              placeholder="Enter Amount"
              value={inputAmountYAvailable ? typedAmountY : ''}
              disabled={!inputAmountYAvailable}
              onChange={(e) => {
                setTypedAmountY(e.target.value);
                if (autoFill) {
                  try {
                    const price = currentPriceXInYWithDecimals;
                    const amountX = getNumberValue(e.target.value, numberLocale) / price;
                    if (!isNaN(amountX)) {
                      setTypedAmountX(formatNumber(amountX, poolData.tokenX.decimals, 0, numberLocale));
                    } else if (e.target.value === '') {
                      setTypedAmountX('');
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }
              }}
              className="pl-20 pr-4 h-16 !text-lg font-semibold bg-white border-0 text-figma-text-dark placeholder:text-figma-text-gray text-right font-roboto focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <div className="absolute left-3 top-1/2 -translate-y-1/2 flex items-center gap-2">
              <TokenTicker
                symbol={poolData.tokenY.symbol}
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase())?.logoURI}
                className="w-6 h-6"
              />
              <span className="text-sm font-medium text-figma-text-dark font-roboto flex items-center">
                {poolData.tokenY.symbol}
                {originalPoolData.tokenY.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase() && (
                  <button
                    type="button"
                    className="ml-1 px-1.5 py-0.5 text-[10px] bg-figma-purple/10 text-figma-purple hover:bg-figma-purple/20 transition-colors rounded flex items-center gap-0.5"
                    onClick={() => setIsNativeIn(!isNativeIn)}
                    title={isNativeIn ? 'Switch to WNATIVE deposit' : 'Switch to Native deposit'}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                    {isNativeIn ? 'Native' : 'WNATIVE'}
                  </button>
                )}
              </span>
            </div>
            <div className="absolute right-4 top-1/2 translate-y-3 text-[10px] text-figma-text-gray font-roboto">
              {formatUSDWithLocale(
                Number(typedAmountY) * Number(tokenPrices?.find((token) => token.tokenAddress === poolData.tokenY.address)?.priceUsd ?? 0)
              )}
            </div>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-figma-text-gray font-roboto">
              Balance:{' '}
              {formatNumber(
                tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || 0,
                18,
                0,
                numberLocale
              )}
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="text-xs px-2 text-muted-foreground hover:text-foreground"
              onClick={() => {
                if (isNativeIn && originalPoolData.tokenY.address === WNATIVE[DEFAULT_CHAINID].address) {
                  const availableBalance =
                    Number(tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '') - 0.01 > 0
                      ? Number(tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '') - 0.01
                      : 0;

                  setTypedAmountY(formatNumber(availableBalance, 18, 0, numberLocale));
                } else {
                  setTypedAmountY(
                    formatStringOnlyLocale(
                      tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
                      // 18,
                      // 0,
                      numberLocale
                    )
                  );
                }
                if (autoFill) {
                  try {
                    const price = currentPriceYInXWithDecimals;
                    const amountX =
                      getNumberValue(
                        tokenBalanceData?.[poolData.tokenY.address as keyof typeof tokenBalanceData]?.formattedBalance || '',
                        numberLocale
                      ) * price;
                    if (!isNaN(amountX)) {
                      setTypedAmountX(formatNumber(amountX, poolData.tokenX.decimals, 0, numberLocale));
                    }
                  } catch (error) {
                    console.error(error);
                  }
                }
              }}
            >
              MAX
            </Button>
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6"></div>

      {/* Liquidity Shape Selection */}
      <div className="space-y-3">
        <Label className="font-roboto font-semibold text-figma-text-dark text-[16px]">Select Liquidity Shape</Label>
        <div className="grid grid-cols-3 gap-3">
          {liquidityShapes.map((shape) => (
            <div
              key={shape.id}
              className={`cursor-pointer transition-all p-3 text-center ${
                selectedShape === shape.id ? 'bg-[#895bf5]/20' : 'bg-figma-gray-table hover:bg-figma-gray-table/80'
              }`}
              style={{
                boxShadow:
                  selectedShape === shape.id
                    ? 'inset -1px -1px 0px 0px #895bf5, inset 1px 1px 0px 0px #895bf5'
                    : 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
              }}
              onClick={() => setSelectedShape(shape.id)}
            >
              <div className="text-2xl mb-2 flex items-center justify-center">
                <img src={shape.icon} alt={shape.name} />
              </div>
              <div className="font-roboto font-medium text-[13px] text-figma-text-dark">{shape.name}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6"></div>

      {/* Distribution Chart */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Label className="font-roboto font-semibold text-figma-text-dark text-[16px]">Set Price Range</Label>
            <button
              className="flex items-center gap-1 text-[11px] text-figma-text-gray cursor-pointer px-2 py-1 hover:bg-figma-gray-table/80"
              style={{
                boxShadow: 'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa',
              }}
              onClick={onResetPriceRange}
            >
              <RotateCcw className="w-3 h-3" />
              Reset
            </button>
          </div>
          {/* Distribution Legend */}

          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center gap-4 text-xs ">
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-[#ff9f80]" /> {poolData.tokenX.symbol}
              </span>
              <span className="flex items-center gap-1 text-muted-foreground">
                <span className="w-2 h-2 rounded-full bg-[#8BD2C6]" /> {poolData.tokenY.symbol}
              </span>
            </div>
            <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
              <Button
                size="sm"
                variant="ghost"
                className={`rounded-md px-3 py-1 h-7 min-w-[60px] ${
                  yBaseCurrency ? 'bg-muted text-muted-foreground' : 'bg-primary text-primary-foreground hover:bg-primary/90'
                }`}
                onClick={() => setYBaseCurrency(false)}
              >
                <TokenTicker
                  symbol={poolData.tokenX?.symbol}
                  logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX?.address.toLowerCase())?.logoURI}
                  className="w-4 h-4"
                />
                {poolData.tokenX?.symbol}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className={`rounded-md px-3 py-1 h-7 min-w-[60px] ${
                  yBaseCurrency ? 'bg-primary text-primary-foreground hover:bg-primary/90' : 'bg-muted text-muted-foreground'
                }`}
                onClick={() => setYBaseCurrency(true)}
              >
                <TokenTicker
                  symbol={poolData.tokenY?.symbol}
                  logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY?.address.toLowerCase())?.logoURI}
                  className="w-4 h-4"
                />
                {poolData.tokenY?.symbol}
              </Button>
            </div>
          </div>
        </div>

        <div className="relative w-full bg-transparent">
          <div className="h-32 min-h-[160px] w-full bg-transparent">
            {simulationChartData.datasets.length === 0 ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">Set Token Amounts to see Simulated Distribution</p>
                </div>
              </div>
            ) : (
              <Bar data={simulationChartData} options={simulationChartOptions} />
            )}
          </div>
        </div>
      </div>

      {/* Divider */}
      <div className="border-t border-border my-6"></div>

      {/* Price Range Selection */}
      <div className="space-y-4">
        {/* Chart with integrated slider */}
        <div className="relative w-full bg-transparent">
          <div className="h-32 min-h-[160px] w-full bg-transparent">
            {isBinDistributionDataLoading ? (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : binDistributionData && binDistributionData.length > 0 ? (
              <Bar data={binDistributionChartData} options={binDistributionChartOptions} />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                <div className="text-center">
                  <p className="text-sm">No chart data available</p>
                  <p className="text-xs mt-1">Loading: {isBinDistributionDataLoading ? 'Yes' : 'No'}</p>
                  <p className="text-xs">Chart data length: {binDistributionData?.length || 0}</p>
                  <p className="text-xs">Active ID: {activeId}</p>
                </div>
              </div>
            )}
          </div>

          {/* Slider positioned between chart and legend */}
          <div className="absolute bottom-0 left-0 right-0  my-6">
            <DualRangeSlider
              value={[sliderMinValue, sliderMaxValue]}
              onValueChange={(value) => {
                onSliderChange(value);
              }}
              min={sliderPriceRange[0]}
              max={sliderPriceRange[1]}
              step={1}
              className="w-full"
            />
          </div>
        </div>

        {/* Price Inputs */}
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-2 sm:gap-4 mb-4">
          {yBaseCurrency ? (
            <>
              <div className="flex flex-col gap-2 col-span-5">
                <Label className="text-xs sm:text-sm font-roboto text-figma-text-gray">Min Price</Label>
                <div
                  className="flex flex-row overflow-hidden bg-white"
                  style={{
                    boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
                  }}
                >
                  <Input
                    value={maxPriceWithDecimals}
                    onChange={(e) => setMaxPriceWithDecimals(e.target.value)}
                    className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white font-roboto text-[#030303]"
                    onBlur={(e) => onAddLiquidityParamChange('maxPriceValueChange', e.target.value)}
                  />
                  <div className="w-px bg-figma-gray-table"></div>
                  <div className="relative">
                    <Input
                      value={maxPricePercent}
                      onChange={(e) => setMaxPricePercent(e.target.value)}
                      className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-white font-roboto text-[#030303]"
                      onBlur={(e) => onAddLiquidityParamChange('maxPricePercentChange', e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-figma-text-gray text-sm pointer-events-none font-roboto">
                      %
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 col-span-5">
                <Label className="text-xs sm:text-sm font-roboto text-figma-text-gray">Max Price</Label>
                <div
                  className="flex flex-row overflow-hidden bg-white"
                  style={{
                    boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
                  }}
                >
                  <Input
                    value={minPriceWithDecimals}
                    onChange={(e) => setMinPriceWithDecimals(e.target.value)}
                    className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white font-roboto text-[#030303]"
                    onBlur={(e) => onAddLiquidityParamChange('minPriceValueChange', e.target.value)}
                  />
                  <div className="w-px bg-figma-gray-table"></div>
                  <div className="relative">
                    <Input
                      value={minPricePercent}
                      onChange={(e) => setMinPricePercent(e.target.value)}
                      className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-white font-roboto text-[#030303]"
                      onBlur={(e) => onAddLiquidityParamChange('minPricePercentChange', e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-figma-text-gray text-sm pointer-events-none font-roboto">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <>
              <div className="flex flex-col gap-2 col-span-5">
                <Label className="text-xs sm:text-sm font-roboto text-figma-text-gray">Min Price</Label>
                <div
                  className="flex flex-row overflow-hidden bg-white"
                  style={{
                    boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
                  }}
                >
                  <Input
                    value={minPriceWithDecimals}
                    onChange={(e) => setMinPriceWithDecimals(e.target.value)}
                    className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white font-roboto text-[#030303]"
                    onBlur={(e) => onAddLiquidityParamChange('minPriceValueChange', e.target.value)}
                  />
                  <div className="w-px bg-figma-gray-table"></div>
                  <div className="relative">
                    <Input
                      value={minPricePercent}
                      onChange={(e) => setMinPricePercent(e.target.value)}
                      className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-white font-roboto text-[#030303]"
                      onBlur={(e) => onAddLiquidityParamChange('minPricePercentChange', e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-figma-text-gray text-sm pointer-events-none font-roboto">
                      %
                    </span>
                  </div>
                </div>
              </div>
              <div className="flex flex-col gap-2 col-span-5">
                <Label className="text-xs sm:text-sm font-roboto text-figma-text-gray">Max Price</Label>
                <div
                  className="flex flex-row overflow-hidden bg-white"
                  style={{
                    boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
                  }}
                >
                  <Input
                    value={maxPriceWithDecimals}
                    onChange={(e) => setMaxPriceWithDecimals(e.target.value)}
                    className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white font-roboto text-[#030303]"
                    onBlur={(e) => onAddLiquidityParamChange('maxPriceValueChange', e.target.value)}
                  />
                  <div className="w-px bg-figma-gray-table"></div>
                  <div className="relative">
                    <Input
                      value={maxPricePercent}
                      onChange={(e) => setMaxPricePercent(e.target.value)}
                      className="w-[84px] text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 text-center pr-6 bg-white font-roboto text-[#030303]"
                      onBlur={(e) => onAddLiquidityParamChange('maxPricePercentChange', e.target.value)}
                    />
                    <span className="absolute right-2 top-1/2 transform -translate-y-1/2 text-figma-text-gray text-sm pointer-events-none font-roboto">
                      %
                    </span>
                  </div>
                </div>
              </div>
            </>
          )}
          <div className="flex flex-col gap-2 col-span-2 text-right">
            <Label className="text-xs sm:text-sm text-left font-roboto text-figma-text-gray">Num Bins</Label>
            <div
              className="flex flex-row overflow-hidden bg-white"
              style={{
                boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa',
              }}
            >
              <Input
                value={numBins}
                className="flex-1 text-sm sm:text-lg disabled:text-foreground disabled:opacity-100 border-0 rounded-none focus-visible:ring-0 focus-visible:ring-offset-0 bg-white text-right font-roboto text-[#030303]"
                onChange={(e) => setNumBins(e.target.value)}
                onBlur={(e) => {
                  onAddLiquidityParamChange('numBinsChange', e.target.value);
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Approve & Add Liquidity Button */}
      <div className="space-y-4">
        {/* Approve Token X - Skip if native deposit for WNATIVE token */}
        {inputAmountXAvailable && Number(debouncedAmountX) > 0 && (
          <ApproveButton
            tokenAddress={
              isNativeIn && originalPoolData.tokenX.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase()
                ? zeroAddress // Native token doesn't need approve
                : (originalPoolData.tokenX.address as `0x${string}`)
            }
            spenderAddress={LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID]}
            amountInBigInt={parseUnits(debouncedAmountX || '0', originalPoolData.tokenX.decimals)}
            symbol={originalPoolData.tokenX.symbol}
          />
        )}

        {/* Approve Token Y - Skip if native deposit for WNATIVE token */}
        {inputAmountYAvailable && Number(debouncedAmountY) > 0 && (
          <ApproveButton
            tokenAddress={
              isNativeIn && originalPoolData.tokenY.address.toLowerCase() === WNATIVE[DEFAULT_CHAINID].address.toLowerCase()
                ? zeroAddress // Native token doesn't need approve
                : (originalPoolData.tokenY.address as `0x${string}`)
            }
            spenderAddress={LB_ROUTER_V22_ADDRESS[DEFAULT_CHAINID]}
            amountInBigInt={parseUnits(debouncedAmountY || '0', originalPoolData.tokenY.decimals)}
            symbol={originalPoolData.tokenY.symbol}
          />
        )}

        <AddLiquidityButton
          inputAmountXAvailable={inputAmountXAvailable}
          inputAmountYAvailable={inputAmountYAvailable}
          typedAmountX={debouncedAmountX}
          typedAmountY={debouncedAmountY}
          amountXBalance={amountXBalance}
          amountYBalance={amountYBalance}
          addLiquidityInput={addLiquidityInput}
          tokenXSymbol={poolData.tokenX.symbol}
          tokenYSymbol={poolData.tokenY.symbol}
          isNativeIn={isNativeIn}
          needsApproval={needsApproval}
          onSuccess={() => {
            setTypedAmountX('0');
            setTypedAmountY('0');
            // Reset other states if needed
          }}
        />
      </div>
    </div>
  );
}
