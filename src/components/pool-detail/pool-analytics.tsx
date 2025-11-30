import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { type PoolData } from '@/PoolDetail';
import PoolDistributionChart from '@/components/pool-distribution-chart';
import TokenTicker from '@/components/token-ticker';
import { useTokenList } from '@/hooks/use-token-list';
import { CardWithHeader } from '@/components/ui/card-with-header';

interface PoolAnalyticsProps {
  poolData: PoolData;
  activeId: number;
  yBaseCurrency: boolean;
}

export function PoolAnalytics({ poolData, activeId, yBaseCurrency }: PoolAnalyticsProps) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const { data: tokenListData } = useTokenList();

  return (
    <CardWithHeader title="Pool Analytics" contentClassName="p-3 pt-4 space-y-4">
      {/* 1. Total Value Locked */}
      <div
        className="p-4 bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px] mb-2">Total Value Locked</div>
        <div className="font-roboto font-semibold text-[#030303] text-[24px] leading-[28px]">
          {formatUSDWithLocale(poolData.liquidityUsd, 4, 0, numberLocale)}
        </div>
      </div>

      {/* 2. Liquidity Allocation */}
      <div
        className="p-4 bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px] mb-3">Liquidity Allocation</div>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TokenTicker
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX?.address?.toLowerCase())?.logoURI}
                symbol={poolData.tokenX?.symbol}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <div className="font-roboto font-medium text-[#030303] text-[14px]">{poolData.tokenX?.symbol}</div>
                <a
                  href={`https://hyperevmscan.io/address/${poolData.tokenX?.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-figma-text-gray hover:text-[#895bf5] transition-colors font-roboto"
                >
                  {poolData.tokenX?.address?.slice(0, 6)}...{poolData.tokenX?.address?.slice(-4)}
                </a>
              </div>
            </div>
            <div className="text-right">
              <div className="font-roboto text-[#030303] text-[14px]">{formatNumber(poolData.reserveX, 2, 0, numberLocale)}</div>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <TokenTicker
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY?.address?.toLowerCase())?.logoURI}
                symbol={poolData.tokenY?.symbol}
                className="w-8 h-8 rounded-full"
              />
              <div>
                <div className="font-roboto font-medium text-[#030303] text-[14px]">{poolData.tokenY?.symbol}</div>
                <a
                  href={`https://hyperevmscan.io/address/${poolData.tokenY?.address}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] text-figma-text-gray hover:text-[#895bf5] transition-colors font-roboto"
                >
                  {poolData.tokenY?.address?.slice(0, 6)}...{poolData.tokenY?.address?.slice(-4)}
                </a>
              </div>
            </div>
            <div className="text-right">
              <div className="font-roboto text-[#030303] text-[14px]">{formatNumber(poolData.reserveY, 2, 0, numberLocale)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Liquidity Distribution Chart */}
      <div
        className="p-4 bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <PoolDistributionChart poolData={poolData} defaultActiveId={activeId} yBaseCurrency={yBaseCurrency} />
      </div>

      {/* 4. Pool Parameters */}
      <div
        className="bg-figma-gray-table"
        style={{
          boxShadow:
            'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
        }}
      >
        <div className="font-roboto text-figma-text-gray text-[12px] leading-[14px] p-3 border-b border-[#c0c0c0]">Pool Parameters</div>
        <div className="divide-y divide-[#c0c0c0]">
          {[
            { label: 'Bin Step', value: poolData.lbBinStep },
            { label: 'Base Fee', value: `${poolData.lbBaseFeePct}%` },
            { label: 'Max Fee', value: `${poolData.lbMaxFeePct}%` },
            { label: 'Protocol Fee', value: '0.00050167%' },
            { label: 'Dynamic Fee', value: '0.0100334%' },
            { label: '24h Fee', value: formatUSDWithLocale(poolData.feesUsd, 2, 0, numberLocale) },
          ].map((param, index) => (
            <div key={index} className="flex justify-between items-center px-3 py-2">
              <span className="font-roboto text-figma-text-gray text-[13px]">{param.label}</span>
              <span className="font-roboto text-[#030303] text-[13px] font-medium">{param.value}</span>
            </div>
          ))}
        </div>
      </div>
    </CardWithHeader>
  );
}
