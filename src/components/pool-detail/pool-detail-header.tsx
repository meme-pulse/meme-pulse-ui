import { useNavigate } from 'react-router-dom';
import { ChevronRightIcon } from 'lucide-react';
import TokenTicker from '@/components/token-ticker';
import { formatNumber } from '@/lib/format';
import { useLocalStorage } from 'usehooks-ts';
import { type PoolData } from '@/PoolDetail';
import { BoostBadge } from '../pool/boost-badge';

interface PoolDetailHeaderProps {
  poolData: PoolData;
  yBaseCurrency: boolean;
  setYBaseCurrency: (value: boolean) => void;
  currentPrice: number;
  tokenListData?: { address: string; logoURI?: string }[];
}

export function PoolDetailHeader({ poolData, tokenListData, yBaseCurrency, setYBaseCurrency, currentPrice }: PoolDetailHeaderProps) {
  const navigate = useNavigate();
  const [numberLocale] = useLocalStorage('number-locale', navigator.language);

  const hasBoost = poolData.protocolSharePct === 10 || poolData.protocolSharePct === 20 || poolData.protocolSharePct === 40;

  return (
    <>
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm mb-4">
        <button onClick={() => navigate('/pool')} className="hover:underline text-zinc-400 font-roboto">
          Pools
        </button>
        <span className="text-zinc-500">
          <ChevronRightIcon className="w-4 h-4" />
        </span>
        <span className="text-white font-roboto font-medium">{poolData.name}</span>
      </div>

      {/* Pool Header */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4 pb-6">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
          {/* Token Icons and Name */}
          <div className="flex items-center gap-3">
            <div className="flex items-center -space-x-2">
              <TokenTicker
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenX?.address?.toLowerCase())?.logoURI}
                symbol={poolData.tokenX?.symbol}
                className="w-10 h-10 rounded-full border-2 border-[#060208]"
              />
              <TokenTicker
                logoURI={tokenListData?.find((token) => token.address.toLowerCase() === poolData.tokenY?.address?.toLowerCase())?.logoURI}
                symbol={poolData.tokenY?.symbol}
                className="w-10 h-10 rounded-full border-2 border-[#060208]"
              />
            </div>
            <span className="text-white text-[24px] leading-tight" style={{ fontFamily: '"Press Start 2P", cursive' }}>
              {poolData.tokenX?.symbol}-{poolData.tokenY?.symbol}
            </span>
          </div>

          {/* Badges */}
          <div className="flex flex-wrap gap-2 items-center">
            <span
              className="px-3 py-1.5 text-[12px] font-roboto text-[#030303] bg-figma-gray-table"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
              }}
            >
              Bin Step: {poolData.lbBinStep}
            </span>
            <span
              className="px-3 py-1.5 text-[12px] font-roboto text-[#030303] bg-figma-gray-table"
              style={{
                boxShadow:
                  'inset -1px -1px 0px 0px #f9f9fa, inset 1px 1px 0px 0px #a1a1aa, inset -2px -2px 0px 0px #a1a1aa, inset 2px 2px 0px 0px #f9f9fa',
              }}
            >
              Fee: {formatNumber(poolData.lbBaseFeePct, 4, 0, numberLocale)}%
            </span>
            {hasBoost && <BoostBadge protocolSharePct={poolData.protocolSharePct} variant="full" />}
          </div>
        </div>

        {/* Current Price */}
        <div className="flex items-center gap-3">
          <span className="font-roboto text-zinc-400 text-[14px]">Current Price:</span>
          <span className="text-[#facb25] text-[16px] font-roboto font-semibold flex items-center gap-2">
            {formatNumber(currentPrice, 6, 0, numberLocale)}
            <span className="text-zinc-300 font-normal">
              {yBaseCurrency
                ? `${poolData.tokenX?.symbol}/${poolData.tokenY?.symbol}`
                : `${poolData.tokenY?.symbol}/${poolData.tokenX?.symbol}`}
            </span>
            <img
              src="/horizontal_switch.svg"
              alt="switch"
              className="cursor-pointer w-5 h-5 hover:opacity-80"
              onClick={() => setYBaseCurrency(!yBaseCurrency)}
            />
          </span>
        </div>
      </div>
    </>
  );
}
