import { Card, CardContent } from './ui/card';
import { useNavigate } from 'react-router-dom';
import { useTokenList } from '../hooks/use-token-list';

import type { PoolRowProps } from '../Pool';
import { useLocalStorage } from 'usehooks-ts';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
export function PoolRowCard({
  name,
  tokenX,
  tokenY,
  lbBinStep,
  lbBaseFeePct,
  liquidityUsd,

  volumeUsd,
  feesUsd,
  apr,
}: PoolRowProps) {
  const navigate = useNavigate();
  const { data: tokenList } = useTokenList();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  return (
    <Card
      className="mb-4 cursor-pointer hover:shadow-lg transition-shadow bg-surface-default   border-border-subtle hover:border-border-highlight"
      onClick={() => navigate(`/pool/v22/${tokenX.address}/${tokenY.address}/${lbBinStep}`)}
    >
      <CardContent className="flex flex-col gap-3 p-4">
        <div className="flex items-center gap-3">
          <div className="flex -space-x-2">
            <img
              src={tokenList?.find((token) => token.address.toLowerCase() === tokenX.address.toLowerCase())?.logoURI}
              alt={tokenX.symbol}
              className="w-8 h-8 rounded-full bg-green-dark-600"
            />
            <img
              src={tokenList?.find((token) => token.address.toLowerCase() === tokenY.address.toLowerCase())?.logoURI}
              alt={tokenY.symbol}
              className="w-8 h-8 rounded-full bg-green-dark-600"
            />
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-text-primary text-body-md">{name}</span>
            <span className="text-caption text-text-secondary bg-surface-elevated border border-border-subtle px-2 py-0.5 rounded w-fit mt-1">
              {formatNumber(Number(lbBaseFeePct), 4, 0, numberLocale)} %
            </span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 mt-2 text-body-sm">
          <div className="flex flex-col flex-1 min-w-[120px]">
            <span className="text-text-secondary">Volume (24H)</span>
            <span className="font-medium text-text-primary">{formatUSDWithLocale(volumeUsd, 0, 0, numberLocale)}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-[120px]">
            <span className="text-text-secondary">Liquidity</span>
            <span className="font-medium text-text-primary">{formatUSDWithLocale(liquidityUsd, 0, 0, numberLocale)}</span>
          </div>
        </div>
        <div className="flex flex-wrap gap-4 text-body-sm">
          <div className="flex flex-col flex-1 min-w-[120px]">
            <span className="text-text-secondary">Fees (24H)</span>
            <span className="font-medium text-text-primary">{formatUSDWithLocale(feesUsd, 0, 0, numberLocale)}</span>
          </div>
          <div className="flex flex-col flex-1 min-w-[120px]">
            <span className="text-text-secondary">APR (24H)</span>
            <span className="font-medium text-text-primary">{formatNumber(apr, 2, 0, numberLocale)} %</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
