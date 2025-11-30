// import { useMemo, useState } from 'react';
// import { useQuery } from '@tanstack/react-query';
// import { Button } from '@/components/ui/button';
// import { ResponsiveContainer, BarChart, Bar, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';
// import { mockUserFeeEarned, mockUserFeesAnalytics } from '../../mock/api-data';
// import { useAccount } from 'wagmi';
// import { type PoolData } from '@/PoolDetail';
// import { useTokenList } from '@/hooks/use-token-list';
// import { useTokenPrices } from '@/hooks/use-token-price';
// import TokenTicker from '../token-ticker';
// import { getPriceFromId } from '@/lib/bin';
// import { useLocalStorage } from 'usehooks-ts';
// import { formatNumber, formatUSDWithLocale } from '@/lib/format';

// // Custom tooltip component
// const CustomFeeEarnedByDateTooltip = ({
//   active,
//   payload,
//   tokenXSymbol,
//   tokenYSymbol,
// }: {
//   active?: boolean;
//   payload?: { payload: { timestamp: number; tokenX: number; tokenY: number } }[];
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
//             <span className="font-medium text-foreground">
//               {new Date(data.timestamp).toLocaleDateString('en-US', {
//                 month: 'short',
//                 day: 'numeric',
//                 hour: '2-digit',
//               })}
//             </span>
//           </p>
//           <p className="text-sm">
//             <span className="text-muted-foreground">Earned {tokenXSymbol}:</span>{' '}
//             <span className="font-medium text-foreground">{formatNumber(data.tokenX, 18, 0, numberLocale)}</span>
//           </p>
//           <p className="text-sm">
//             <span className="text-muted-foreground">Earned {tokenYSymbol}:</span>{' '}
//             <span className="font-medium text-foreground">{formatNumber(data.tokenY, 18, 0, numberLocale)}</span>
//           </p>
//         </div>
//       </div>
//     );
//   }
//   return null;
// };
// const CustomFeeEarnedByBinTooltip = ({
//   active,
//   payload,
//   tokenXSymbol,
//   tokenYSymbol,
// }: {
//   active?: boolean;
//   payload?: { payload: { timestamp: number; tokenX: number; tokenY: number } }[];
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
//             {/* <span className="font-medium text-foreground">
//               Since last deposit on
//               <br />
//               <span className="text-muted-foreground">{data.mostRecentDepositTime}</span>
//             </span> */}
//           </p>
//           <p className="text-sm">
//             <span className="text-muted-foreground">Earned {tokenXSymbol}:</span>{' '}
//             <span className="font-medium text-foreground">{formatNumber(data.accruedFeesX, 18, 0, numberLocale)}</span>
//           </p>
//           <p className="text-sm">
//             <span className="text-muted-foreground">Earned {tokenYSymbol}:</span>{' '}
//             <span className="font-medium text-foreground">{formatNumber(data.accruedFeesY, 18, 0, numberLocale)}</span>
//           </p>
//           <p className="text-sm">
//             <span className="text-muted-foreground">Bin Price:</span>{' '}
//             <span className="font-medium text-foreground">{formatNumber(data.priceXY, 18, 0, numberLocale)}</span>
//           </p>
//         </div>
//       </div>
//     );
//   }
//   return null;
// };
// export function FeesCard({ poolData, yBaseCurrency }: { poolData: PoolData; yBaseCurrency: boolean }) {
//   const [numberLocale] = useLocalStorage('number-locale', navigator.language);
//   const [selectedPeriod, setSelectedPeriod] = useState('24H');
//   const { address } = useAccount();

//   const { data: tokenPrices } = useTokenPrices({
//     addresses: [],
//   });

//   const { data: tokenList } = useTokenList();
//   const tokenX = tokenList?.find((token) => token.address.toLowerCase() === poolData.tokenX.address.toLowerCase());
//   const tokenY = tokenList?.find((token) => token.address.toLowerCase() === poolData.tokenY.address.toLowerCase());

//   // using mock data
//   const { data: userFeeEarnedPerBin = [] } = useQuery<UserFeeEarnedBin[]>({
//     queryKey: ['userFeeEarnedPerBin', poolData.pairAddress, address],
//     queryFn: () => mockUserFeeEarned(poolData.pairAddress as `0x${string}`, address as `0x${string}`),
//     enabled: !!address && !!poolData.pairAddress,
//   });
//   type UserFeesAnalyticsEntry = {
//     date: string;
//     timestamp: number;
//     accruedFeesX: number;
//     accruedFeesY: number;
//     accruedFeesL: number;
//   };

//   interface UserFeesAnalytics {
//     '24h': UserFeesAnalyticsEntry[];
//     '7d': UserFeesAnalyticsEntry[];
//     '30d': UserFeesAnalyticsEntry[];
//     [key: string]: UserFeesAnalyticsEntry[];
//   }

//   const { data: userFeesAnalyticsData } = useQuery<UserFeesAnalytics>({
//     queryKey: ['userFeesAnalytics', poolData.pairAddress, address],
//     queryFn: () => mockUserFeesAnalytics(poolData.pairAddress as `0x${string}`, address as `0x${string}`),
//     enabled: !!address && !!poolData.pairAddress,
//   });

//   const userFeesAnalytics: UserFeesAnalytics = userFeesAnalyticsData || { '24h': [], '7d': [], '30d': [] };
//   // Add interfaces for mock data
//   interface UserFeeEarnedBin {
//     binId: number;
//     mostRecentDepositTime: string;
//     timestamp: number;
//     accruedFeesX: number;
//     accruedFeesY: number;
//     accruedFeesL: number;
//     priceXY: number;
//     priceYX: number;
//   }

//   // Get analytics data for selected period
//   const analyticsData: UserFeesAnalyticsEntry[] = Array.isArray(userFeesAnalytics[selectedPeriod.toLowerCase()])
//     ? (userFeesAnalytics[selectedPeriod.toLowerCase()] as UserFeesAnalyticsEntry[])
//     : [];

//   // Map analyticsData to chart data
//   const feesPeriodData = useMemo(
//     () =>
//       analyticsData
//         .filter((entry) => {
//           //convert selectedPeriod to timestamp
//           let targetTimestamp = Math.floor(new Date().getTime() / 1000) - 60 * 60 * 24;
//           if (selectedPeriod.toLowerCase() === '7d') {
//             targetTimestamp = Math.floor(new Date().getTime() / 1000) - 60 * 60 * 24 * 7;
//           } else if (selectedPeriod.toLowerCase() === '30d') {
//             targetTimestamp = Math.floor(new Date().getTime() / 1000) - 60 * 60 * 24 * 30;
//           }
//           return entry.timestamp > targetTimestamp;
//         })
//         .map((entry) => ({
//           time: entry.date ? new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '',
//           timestamp: entry.date || '',
//           tokenX: entry.accruedFeesX || 0,
//           tokenY: entry.accruedFeesY || 0,
//           total: entry.accruedFeesL || 0,
//         }))
//         .reverse(),
//     [analyticsData, selectedPeriod]
//   );

//   // Calculate totals for selected period
//   const totalFeesPeriod = useMemo(() => {
//     const totalXPeriod = feesPeriodData.reduce((sum, entry) => sum + entry.tokenX, 0);
//     const totalYPeriod = feesPeriodData.reduce((sum, entry) => sum + entry.tokenY, 0);
//     const tokenXPrice = Number(
//       tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenX.address.toLowerCase())?.priceUsd
//     );
//     const tokenYPrice = Number(
//       tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenY.address.toLowerCase())?.priceUsd
//     );
//     return {
//       total: formatUSDWithLocale(totalXPeriod * tokenXPrice + totalYPeriod * tokenYPrice, 4, 0, numberLocale),
//       tokenX: {
//         amount: formatNumber(totalXPeriod, 5, 0, numberLocale),
//         usd: formatUSDWithLocale(totalXPeriod * tokenXPrice, 4, 0, numberLocale),
//       },
//       tokenY: {
//         amount: formatNumber(totalYPeriod, 5, 0, numberLocale),
//         usd: formatUSDWithLocale(totalYPeriod * tokenYPrice, 4, 0, numberLocale),
//       },
//     };
//   }, [feesPeriodData, tokenPrices, poolData.tokenX.address, poolData.tokenY.address]);

//   // Map mockUserFeeEarned to per-bin chart data
//   const feesPerBinData = Array.isArray(userFeeEarnedPerBin)
//     ? (userFeeEarnedPerBin as UserFeeEarnedBin[]).map((bin) => ({
//         ...bin,
//         total: typeof bin.accruedFeesX === 'number' && typeof bin.accruedFeesY === 'number' ? bin.accruedFeesX + bin.accruedFeesY : 0,
//       }))
//     : [];

//   // Calculate totals for Per Bin
//   const totalFeesPerBin = useMemo(() => {
//     const totalXPerBin = userFeeEarnedPerBin.reduce((sum: number, bin: UserFeeEarnedBin) => sum + bin.accruedFeesX, 0);
//     const totalYPerBin = userFeeEarnedPerBin.reduce((sum: number, bin: UserFeeEarnedBin) => sum + bin.accruedFeesY, 0);
//     const tokenXPrice = Number(
//       tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenX.address.toLowerCase())?.priceUsd
//     );
//     const tokenYPrice = Number(
//       tokenPrices?.find((token) => token.tokenAddress.toLowerCase() === poolData.tokenY.address.toLowerCase())?.priceUsd
//     );
//     return {
//       total: formatUSDWithLocale(totalXPerBin * tokenXPrice + totalYPerBin * tokenYPrice, 4, 0, numberLocale),
//       tokenX: {
//         amount: formatNumber(totalXPerBin, 5, 0, numberLocale),
//         usd: formatUSDWithLocale(totalXPerBin * tokenXPrice, 4, 0, numberLocale),
//       },
//       tokenY: {
//         amount: formatNumber(totalYPerBin, 5, 0, numberLocale),
//         usd: formatUSDWithLocale(totalYPerBin * tokenYPrice, 4, 0, numberLocale),
//       },
//     };
//   }, [userFeeEarnedPerBin, tokenPrices, poolData.tokenX.address, poolData.tokenY.address]);

//   return (
//     <div className="max-w-4xl mx-auto p-6 bg-card rounded-2xl shadow-lg space-y-8">
//       {/* Fees Earned (24H) Section */}
//       <div>
//         <div className="flex justify-between items-center mb-2">
//           <h2 className="text-xl font-semibold text-foreground">Fees Earned ({selectedPeriod})</h2>
//           <div className="flex rounded-lg border border-border">
//             {['24H', '7D', '30D'].map((period) => (
//               <Button
//                 key={period}
//                 variant={selectedPeriod === period ? 'default' : 'ghost'}
//                 size="sm"
//                 onClick={() => setSelectedPeriod(period)}
//                 className={selectedPeriod === period ? 'bg-accent-primary text-surface-default' : 'text-muted-foreground hover:text-foreground'}
//               >
//                 {period}
//               </Button>
//             ))}
//           </div>
//         </div>

//         {/* <p className="text-sm text-muted-foreground mb-6">Last refreshed on Jul 4 2025, 11:00 AM</p> */}

//         {/* Period Chart */}
//         <div className="h-64 mb-4">
//           {feesPeriodData.length === 0 ? (
//             <div className="flex items-center justify-center h-full text-text-secondary text-base">
//               You have no fees earned in the last {selectedPeriod}
//             </div>
//           ) : (
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={feesPeriodData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 <XAxis
//                   dataKey="timestamp"
//                   axisLine={false}
//                   tickLine={false}
//                   tick={{ fontSize: 12, fill: '#fff' }}
//                   interval="preserveStartEnd"
//                   tickFormatter={(value) => {
//                     return new Date(value).toLocaleDateString('en-US', {
//                       month: 'short',
//                       day: 'numeric',
//                       hour: '2-digit',
//                     });
//                   }}
//                 />
//                 <YAxis hide />
//                 <RechartsTooltip
//                   content={<CustomFeeEarnedByDateTooltip tokenXSymbol={tokenX?.symbol || ''} tokenYSymbol={tokenY?.symbol || ''} />}
//                   cursor={{ opacity: 0.15 }}
//                 />
//                 <Bar dataKey="total" fill="#8bd2c6" radius={[2, 2, 0, 0]} />
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         {/* Total Fees Summary */}
//         <div className="text-right mb-4">
//           <span className="text-sm text-muted-foreground">Total Fees Earned ({selectedPeriod}): </span>
//           <span className="font-semibold text-foreground">{totalFeesPeriod.total}</span>
//         </div>

//         {/* Token Breakdown */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
//           <div className="flex-1 flex items-center gap-3 bg-border-subtle rounded-lg px-4 py-3">
//             <TokenTicker logoURI={tokenX?.logoURI} symbol={tokenX?.symbol} className="w-7 h-7 rounded-full" />
//             <div>
//               <div className="font-semibold text-foreground text-sm">
//                 {totalFeesPeriod.tokenX.amount} {poolData.tokenX.symbol}
//               </div>
//               <div className="text-xs text-text-secondary">{totalFeesPeriod.tokenX.usd}</div>
//             </div>
//           </div>

//           <div className="flex-1 flex items-center gap-3 bg-border-subtle rounded-lg px-4 py-3">
//             <TokenTicker logoURI={tokenY?.logoURI} symbol={tokenY?.symbol} className="w-7 h-7 rounded-full" />
//             <div>
//               <div className="font-semibold text-foreground text-sm">
//                 {totalFeesPeriod.tokenY.amount} {poolData.tokenY.symbol}
//               </div>
//               <div className="text-xs text-text-secondary">{totalFeesPeriod.tokenY.usd}</div>
//             </div>
//           </div>
//         </div>
//       </div>

//       {/* Fees Earned (Per Bin) Section */}
//       <div>
//         <h2 className="text-xl font-semibold mb-2 text-foreground">Fees Earned (Per Bin)</h2>
//         <p className="text-sm text-muted-foreground mb-6">
//           {/* Last refreshed on {new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} */}
//         </p>

//         {/* Per Bin Chart */}
//         <div className="h-64 mb-4">
//           {feesPerBinData.length === 0 ? (
//             <div className="flex items-center justify-center h-full text-text-secondary text-base">
//               You have no fees earned in your current bin positions
//             </div>
//           ) : (
//             <ResponsiveContainer width="100%" height="100%">
//               <BarChart data={feesPerBinData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
//                 {/* priceXY or priceYX  according to setting*/}
//                 <XAxis
//                   dataKey="binId"
//                   axisLine={false}
//                   tickLine={false}
//                   tick={{ fontSize: 12, fill: '#fff' }}
//                   tickFormatter={(value: number) => {
//                     let priceY = getPriceFromId(value, poolData.lbBinStep) * 10 ** (poolData.tokenX.decimals - poolData.tokenY.decimals);
//                     if (yBaseCurrency) {
//                       priceY = 1 / priceY;
//                     }
//                     return formatNumber(priceY, 4, 0, numberLocale) || '';
//                   }}
//                 />
//                 <YAxis hide />
//                 <RechartsTooltip
//                   content={<CustomFeeEarnedByBinTooltip tokenXSymbol={tokenX?.symbol || ''} tokenYSymbol={tokenY?.symbol || ''} />}
//                   cursor={{ opacity: 0.15 }}
//                 />
//                 <Bar dataKey="total" fill="#8bd2c6" radius={[2, 2, 0, 0]} barSize={60} />
//               </BarChart>
//             </ResponsiveContainer>
//           )}
//         </div>

//         {/* Total Fees Summary */}
//         <div className="text-right mb-4">
//           <span className="text-sm text-muted-foreground">Total Fees earned (since last deposit): </span>
//           <span className="font-semibold text-foreground">{totalFeesPerBin.total}</span>
//         </div>

//         {/* Token Breakdown */}
//         <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
//           <div className="flex-1 flex items-center gap-3 bg-border-subtle rounded-lg px-4 py-3">
//             <TokenTicker logoURI={tokenX?.logoURI} symbol={tokenX?.symbol} className="w-7 h-7 rounded-full" />
//             <div>
//               <div className="font-semibold text-foreground text-sm">
//                 {totalFeesPerBin.tokenX.amount} {poolData.tokenX.symbol}
//               </div>
//               <div className="text-xs text-text-secondary">{totalFeesPerBin.tokenX.usd}</div>
//             </div>
//           </div>

//           <div className="flex-1 flex items-center gap-3 bg-border-subtle rounded-lg px-4 py-3">
//             <TokenTicker logoURI={tokenY?.logoURI} symbol={tokenY?.symbol} className="w-7 h-7 rounded-full" />
//             <div>
//               <div className="font-semibold text-foreground text-sm">
//                 {totalFeesPerBin.tokenY.amount} {poolData.tokenY.symbol}
//               </div>
//               <div className="text-xs text-text-secondary">{totalFeesPerBin.tokenY.usd}</div>
//             </div>
//           </div>
//         </div>

//         {/* Notes */}
//         <div className="bg-card p-4 rounded-lg border border-border">
//           <h4 className="font-medium text-sm mb-2 text-foreground">Note:</h4>
//           <ul className="text-sm text-muted-foreground space-y-1">
//             <li>- Fees earned are automatically compounded into the bins.</li>
//             <li>- Analytics are reset on every deposit or withdraw.</li>
//           </ul>
//         </div>
//       </div>
//     </div>
//   );
// }
