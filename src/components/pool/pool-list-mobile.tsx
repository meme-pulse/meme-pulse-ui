import { PoolRowCard } from '../pool-row-card';
import type { PoolRowProps, GroupPoolRowProps } from '../../Pool';
import { useState } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TokenTicker from '../token-ticker';
import { useTokenList } from '../../hooks/use-token-list';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';

interface PoolListMobileProps {
  pools: PoolRowProps[];
  isLoading: boolean;
}

interface GroupedPoolListMobileProps {
  pools: GroupPoolRowProps[];
  isLoading: boolean;
}

function GroupPoolRowMobile({ apr, name, tokenX, tokenY, totalVolume24h, totalLiquidityUsd, totalFees24h, groups }: GroupPoolRowProps) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const { data: tokenList } = useTokenList();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      {/* Main Group Row */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-3">
          <div className="flex items-center -space-x-2">
            <TokenTicker
              logoURI={tokenList?.find((token) => token.address.toLowerCase() === tokenX.address.toLowerCase())?.logoURI}
              symbol={tokenX.symbol}
              className="w-7 h-7 rounded-full bg-green-dark-600"
            />
            <TokenTicker
              logoURI={tokenList?.find((token) => token.address.toLowerCase() === tokenY.address.toLowerCase())?.logoURI}
              symbol={tokenY.symbol}
              className="w-7 h-7 rounded-full bg-green-dark-600"
            />
          </div>

          <div className="flex flex-col items-start gap-1">
            <span className="font-medium text-foreground text-xs sm:text-sm">{name}</span>
            <span className="text-xs sm:text-sm text-muted-foreground bg-muted border border-border px-2 py-0.5 rounded">
              {groups.length} pools
            </span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 mb-3 relative">
        <div>
          <div className="text-sm text-muted-foreground">Volume (24H)</div>
          <div className="text-sm font-medium text-foreground">{formatUSDWithLocale(totalVolume24h, 0, 0, numberLocale)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Liquidity</div>
          <div className="text-sm font-medium text-foreground">{formatUSDWithLocale(totalLiquidityUsd, 0, 0, numberLocale)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">Fees (24H)</div>
          <div className="text-sm font-medium text-foreground">{formatUSDWithLocale(totalFees24h, 2, 0, numberLocale)}</div>
        </div>
        <div>
          <div className="text-sm text-muted-foreground">MAX APR (24H)</div>
          <div className="text-sm font-medium text-foreground">{formatNumber(apr, 2, 0, numberLocale)} %</div>
        </div>
        <button
          className={`transition-transform ${isExpanded ? 'rotate-180' : ''} absolute right-0 bottom-0`}
          onClick={(e) => {
            e.stopPropagation();
            toggleExpanded();
          }}
        >
          <ChevronDown className="w-5 h-5 text-muted-foreground" />
        </button>
      </div>

      {/* Expanded Groups */}
      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${
          isExpanded ? 'max-h-[1000px] opacity-100' : 'max-h-0 opacity-0'
        }`}
      >
        <div className="space-y-2 mt-3 pt-3 border-t border-border">
          {groups.map((group) => (
            <div
              key={group.pairAddress}
              className="p-3 cursor-pointer relative"
              onClick={() => navigate(`/pool/v22/${tokenX.address}/${tokenY.address}/${group.lbBinStep}`)}
            >
              <div className="flex items-center justify-between mb-3 ">
                <div className="flex items-center space-x-3">
                  <div className="flex items-center -space-x-2">
                    <TokenTicker
                      logoURI={tokenList?.find((token) => token.address.toLowerCase() === tokenX.address.toLowerCase())?.logoURI}
                      symbol={tokenX.symbol}
                      className="w-6 h-6 rounded-full bg-green-dark-600"
                    />
                    <TokenTicker
                      logoURI={tokenList?.find((token) => token.address.toLowerCase() === tokenY.address.toLowerCase())?.logoURI}
                      symbol={tokenY.symbol}
                      className="w-6 h-6 rounded-full bg-green-dark-600"
                    />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <span className="text-foreground text-xs sm:text-sm">
                      <span className="text-muted-foreground"> Bin Step:</span> {group.lbBinStep}
                    </span>
                    <span className="text-foreground text-xs sm:text-sm">
                      <span className="text-muted-foreground">Fee: </span>
                      {formatNumber(Number(group.lbBaseFeePct), 4, 0, numberLocale)} %
                    </span>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Volume (24H):</span>
                  <span className="text-foreground">{formatUSDWithLocale(group.volume24h, 0, 0, numberLocale)}</span>
                </div>
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Liquidity:</span>
                  <span className="text-foreground">{formatUSDWithLocale(group.liquidityUsd, 0, 0, numberLocale)}</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4 text-xs mt-3">
                <div className="flex flex-col">
                  <span className="text-muted-foreground">Fees (24H):</span>
                  <span className="text-foreground">{formatUSDWithLocale(group.fees24h, 2, 0, numberLocale)}</span>
                </div>
                <div className="flex flex-col relative">
                  <span className="text-muted-foreground">APR:</span>
                  <span className="text-foreground">{formatNumber(group.apr || 0, 2, 0, numberLocale)} %</span>
                  <ChevronRight className="w-5 h-5 text-muted-foreground absolute right-0 bottom-0" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function GroupedPoolListMobile({ pools, isLoading }: GroupedPoolListMobileProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 md:py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!pools?.length) {
    return (
      <div className="text-center py-4 md:py-12 text-muted-foreground">
        <div className="text-lg mb-1 md:mb-2">No pools found</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 md:gap-2">
      {pools.map((pool) => (
        <GroupPoolRowMobile key={pool.name} {...pool} />
      ))}
    </div>
  );
}

export function PoolListMobile({ pools, isLoading }: PoolListMobileProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4 md:py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }
  if (!pools?.length) {
    return (
      <div className="text-center py-4 md:py-12 text-muted-foreground">
        <div className="text-lg mb-1 md:mb-2">No pools found</div>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-1 md:gap-2">
      {pools.map((pool) => (
        <PoolRowCard key={pool.pairAddress} {...pool} />
      ))}
    </div>
  );
}
