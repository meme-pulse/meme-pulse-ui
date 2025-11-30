import { useTokenList } from '@/hooks/use-token-list';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLocalStorage } from 'usehooks-ts';
import TokenTicker from '../token-ticker';
import { ChevronDown, ChevronRight, ChevronUp } from 'lucide-react';
import { formatNumber, formatUSDWithLocale } from '@/lib/format';
import type { GroupPoolRowProps } from '@/Pool';

interface GroupPoolRowComponentProps extends GroupPoolRowProps {
  aiMode?: boolean;
}

export function GroupPoolRow({
  apr,
  name,
  tokenX,
  tokenY,
  totalVolume24h,
  totalLiquidityUsd,
  totalFees24h,
  groups,
  aiMode = false,
}: GroupPoolRowComponentProps) {
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);
  const { data: tokenList } = useTokenList();
  const [isExpanded, setIsExpanded] = useState(false);
  const navigate = useNavigate();

  const toggleExpanded = () => {
    if (!aiMode) {
      setIsExpanded(!isExpanded);
    }
  };

  const handleDepositClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (aiMode) {
      navigate(`/ai-deposit/${tokenX.address}/${tokenY.address}`);
    } else {
      navigate(`/pool/v22/${tokenX.address}/${tokenY.address}/${groups[0]?.lbBinStep || 1}`);
    }
  };

  const poolCount = groups.length;

  return (
    <>
      {/* Aggregated (parent) row */}
      <tr className="bg-figma-gray-light h-[60px] cursor-pointer relative" onClick={toggleExpanded}>
        <td className="h-[60px]" style={{ paddingLeft: '12px' }}>
          <div className="flex items-center h-full">
            {/* Token icons */}
            <div className="flex items-center -space-x-2 flex-shrink-0">
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
            {/* Name and badge */}
            <div className="flex items-center gap-2 ml-3">
              <span className="font-roboto text-black text-[16px] leading-[19px] font-medium">{name}</span>
              {aiMode ? null : (
                <span className="bg-[#d0d0d4] text-[#5c5c66] text-[12px] font-roboto px-2 py-0.5 rounded">
                  {poolCount} {poolCount === 1 ? 'pool' : 'pools'}
                </span>
              )}
            </div>
          </div>
        </td>
        <td className="text-left font-roboto text-black text-[16px] leading-[19px]" style={{ paddingLeft: '8px' }}>
          {formatUSDWithLocale(totalLiquidityUsd, 0, 0, numberLocale)}
        </td>
        <td className="text-left font-roboto text-black text-[16px] leading-[19px]" style={{ paddingLeft: '8px' }}>
          {formatUSDWithLocale(totalVolume24h, 0, 0, numberLocale)}
        </td>
        <td className="text-center font-roboto text-black text-[16px] leading-[19px]">{formatNumber(apr, 2, 0, numberLocale)} %</td>
        <td className="text-center font-roboto text-black text-[16px] leading-[19px]">
          {formatUSDWithLocale(totalFees24h, 0, 0, numberLocale)}
        </td>
        <td className="relative w-[120px]">
          {aiMode ? (
            <button
              className="bg-figma-gray-table h-[36px] font-roboto text-figma-text-dark text-[16px] leading-[19px] w-[120px] absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
              onClick={handleDepositClick}
              style={{
                boxShadow:
                  'inset 1px 1px 0px 0px #f9f9fa, inset -1px -1px 0px 0px #3d3d43, inset 2px 2px 0px 0px #e7e7eb, inset -2px -2px 0px 0px #808088',
              }}
            >
              Deposit
            </button>
          ) : (
            <div className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2 flex items-center justify-center">
              {isExpanded ? <ChevronUp className="w-5 h-5 text-[#5c5c66]" /> : <ChevronDown className="w-5 h-5 text-[#5c5c66]" />}
            </div>
          )}
        </td>
      </tr>

      {/* Expanded child rows (non-AI mode only) */}
      {!aiMode &&
        isExpanded &&
        groups.map((group) => (
          <tr
            key={group.pairAddress}
            className="bg-[#d8d8dc] h-[60px] cursor-pointer hover:bg-[#d0d0d4] transition-colors"
            onClick={() => navigate(`/pool/v22/${tokenX.address}/${tokenY.address}/${group.lbBinStep}`)}
          >
            <td className="h-[60px]" style={{ paddingLeft: '12px' }}>
              <div className="flex items-center h-full">
                {/* Token icons - same position as parent */}
                <div className="flex items-center -space-x-2 flex-shrink-0">
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
                {/* Bin Step and Fee - Meteora style - single line */}
                <div className="flex items-center gap-6 ml-3 whitespace-nowrap">
                  <span className="font-roboto text-black text-[16px] leading-[19px] whitespace-nowrap">
                    Bin Step <span className="font-semibold">{group.lbBinStep}</span>
                  </span>
                  <span className="font-roboto text-black text-[16px] leading-[19px] whitespace-nowrap">
                    Fee <span className="font-semibold">{formatNumber(group.lbBaseFeePct, 2, 0, numberLocale)}%</span>
                  </span>
                </div>
              </div>
            </td>
            <td className="text-left font-roboto text-black text-[16px] leading-[19px]" style={{ paddingLeft: '8px' }}>
              {formatUSDWithLocale(group.liquidityUsd, 0, 0, numberLocale)}
            </td>
            <td className="text-left font-roboto text-black text-[16px] leading-[19px]" style={{ paddingLeft: '8px' }}>
              {formatUSDWithLocale(group.volume24h, 0, 0, numberLocale)}
            </td>
            <td className="text-center font-roboto text-black text-[16px] leading-[19px]">
              {formatNumber(group.apr || 0, 2, 0, numberLocale)} %
            </td>
            <td className="text-center font-roboto text-black text-[16px] leading-[19px]">
              {formatUSDWithLocale(group.fees24h, 2, 0, numberLocale)}
            </td>
            <td className="relative w-[120px]">
              {/* Navigation chevron */}
              <div className="absolute right-4 top-1/2 -translate-y-1/2 flex items-center justify-center">
                <ChevronRight className="w-5 h-5 text-[#808088]" />
              </div>
            </td>
          </tr>
        ))}
    </>
  );
}
