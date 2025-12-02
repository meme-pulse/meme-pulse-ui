import { useActiveId } from '@/hooks/use-active-id';
import { type PoolData } from '../PoolDetail';
// import { sql } from '@ponder/client';
// import { useEffect } from 'react';
// import { ponderClient } from '@/main';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react';
import { useState } from 'react';

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip, ReferenceLine } from 'recharts';
import { getPriceFromId } from '@/lib/bin';
import { formatNumber } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { getBinDistributionData } from '@/lib/hasura-client';

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

const CustomPoolDistributionTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ payload: BinData }> }) => {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    return (
      <div
        className="bg-figma-gray-bg p-3 border-2 border-white pointer-events-none"
        style={{ 
          zIndex: 1000,
          boxShadow: '2px 2px 0px 0px #000, inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa'
        }}
      >
        <div className="space-y-1">
          <p className="text-sm text-figma-text-dark">
            <span>Price:</span> <span className="font-medium">{formatNumber(data.priceY, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span>{data.tokenXSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.reserveX, 18, 0, numberLocale)}</span>
          </p>
          <p className="text-sm text-figma-text-dark">
            <span>{data.tokenYSymbol}:</span>{' '}
            <span className="font-medium">{formatNumber(data.reserveY, 18, 0, numberLocale)}</span>
          </p>
        </div>
      </div>
    );
  }
  return null;
};

export default function PoolDistributionChart({
  poolData,
  defaultActiveId,
  yBaseCurrency,
}: {
  poolData: PoolData;
  defaultActiveId: number;
  yBaseCurrency: boolean;
}) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const activeId = useActiveId(poolData.pairAddress as `0x${string}`, defaultActiveId);
  const [zoomLevel, setZoomLevel] = useState(25); // Display 25 items by default
  // const GET_BINS_BY_RANGE_QUERY = gql`
  //   query GetBinsByRange($pairAddress: String!, $fromId: Int!, $toId: Int!) {
  //     bins(where: { lbPairId: $pairAddress }) {
  //       items {
  //         id
  //       }
  //     }
  //   }
  // `;

  // Create array of bin IDs from activeId - 50 to activeId + 50

  const {
    data: binDistributionData,
    isLoading: isBinDistributionDataLoading,
    // isError: isBinDistributionDataError,
  } = useQuery({
    queryKey: ['binDistributionData', poolData.pairAddress, zoomLevel],
    refetchInterval: 10000,
    queryFn: () => {
      const fromId = activeId - zoomLevel;
      const toId = activeId + zoomLevel;

      // [2] = priceX, [3] = priceY, [5] = reserveX, [6] = reserveY [7] = binId
      // return ponderClient.db.execute(
      //   sql`SELECT * FROM bin WHERE lb_pair_id = ${poolData.pairAddress} AND CAST(bin_id AS INTEGER) BETWEEN ${fromId} AND ${toId}`
      // );
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

      // Create complete range from activeId - zoomLevel to activeId + zoomLevel
      const completeData = [];
      for (let i = activeId - zoomLevel; i <= activeId + zoomLevel; i++) {
        if (existingDataMap.has(i)) {
          completeData.push(existingDataMap.get(i));
        } else {
          // Fill missing data with zeros
          completeData.push({
            priceX: 0,
            priceY: getPriceFromId(i, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
            reserveX: 0,
            reserveY: 0,
            binId: i,
            tokenXHeight: 0,
            tokenYHeight: 0,
            tokenXSymbol: poolData.tokenX.symbol,
            tokenYSymbol: poolData.tokenY.symbol,
          });
        }
      }

      return yBaseCurrency ? completeData.reverse() : completeData;
    },
  });

  const handleZoomIn = () => {
    if (zoomLevel > 10) {
      setZoomLevel(zoomLevel - 10);
    }
  };

  const handleZoomOut = () => {
    if (zoomLevel < 100) {
      setZoomLevel(zoomLevel + 10);
    }
  };

  return (
    <div className="mt-6">
      {/* Zoom Controls */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-foreground">Liquidity Distribution</h3>
        <div className="flex items-center gap-2">
          <button
            onClick={handleZoomIn}
            disabled={zoomLevel <= 10}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          {/* <span className="text-xs text-muted-foreground min-w-[40px] text-center">±{zoomLevel}</span> */}
          <button
            onClick={handleZoomOut}
            disabled={zoomLevel >= 100}
            className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
        </div>
      </div>

      {isBinDistributionDataLoading && (
        <div className="flex items-center justify-center h-32 text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin" />
        </div>
      )}
      {binDistributionData && (
        <div className="flex justify-between items-end h-32 mb-4 min-h-[160px]">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={binDistributionData} margin={{ top: 30, right: 20, left: 20, bottom: 5 }}>
              <XAxis
                // only active bin shows price display
                dataKey="binId"
                axisLine={false}
                tickLine={false}
                tick={{ fontSize: 10, fill: '#000' }}
                ticks={[
                  binDistributionData[0]?.binId, // 0%
                  binDistributionData[Math.floor(binDistributionData.length * 0.33)]?.binId, // 33%
                  binDistributionData[Math.floor(binDistributionData.length * 0.66)]?.binId, // 66%
                  binDistributionData[binDistributionData.length - 1]?.binId, // 100%
                ].filter((tick): tick is number => tick !== undefined)}
                tickFormatter={(value: number) => {
                  let priceY = getPriceFromId(value, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
                  if (yBaseCurrency) {
                    priceY = 1 / priceY;
                  }
                  return formatNumber(priceY, 4, 0, numberLocale) || '';
                }}
              />
              <YAxis hide domain={[0, (dataMax: number) => dataMax / 0.9]} />
              <RechartsTooltip content={<CustomPoolDistributionTooltip />} cursor={{ opacity: 0.15 }} />
              <Bar dataKey="tokenYHeight" stackId="a" fill="#ff9f80" radius={[0, 0, 0, 0]} />
              <Bar dataKey="tokenXHeight" stackId="a" fill="#8bd2c6" radius={[0, 0, 0, 0]} />
              {/* Reference line for current price */}
              <ReferenceLine
                x={activeId}
                stroke="#000"
                strokeWidth={1}
                // strokeDasharray="3 3"
                label={{
                  value: `${formatNumber(
                    yBaseCurrency
                      ? (1 / getPriceFromId(activeId, poolData.lbBinStep)) * 10 ** (poolData.tokenY.decimals - poolData.tokenX.decimals)
                      : getPriceFromId(activeId, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals),
                    4,
                    0,
                    numberLocale
                  )} ${
                    yBaseCurrency
                      ? poolData.tokenY.symbol + '/' + poolData.tokenX.symbol
                      : poolData.tokenX.symbol + '/' + poolData.tokenY.symbol
                  }`,
                  position: 'top',
                  style: { fontSize: 10, fill: '#000' },
                }}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
      {/* Legend - Below Chart */}
      <div className="flex items-center justify-center gap-4 text-xs">
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-[#8BD2C6]" /> {poolData.tokenY.symbol}
        </span>
        <span className="flex items-center gap-1 text-muted-foreground">
          <span className="w-2 h-2 rounded-full bg-[#ff9f80]" /> {poolData.tokenX.symbol}
        </span>
      </div>
    </div>
  );
}
