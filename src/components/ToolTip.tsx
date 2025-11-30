import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import TokenTicker from '@/components/token-ticker';
import { useMediaQuery } from 'usehooks-ts';
import { Popover } from './ui/popover';
import { PopoverContent, PopoverTrigger } from '@radix-ui/react-popover';
import { CircleQuestionMark } from 'lucide-react';

export function LPBoostTooltip({ boost }: { boost: number }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div
            className="rounded-md"
            style={{
              background:
                'linear-gradient(transparent, transparent) padding-box, linear-gradient(90deg, #16C4B3, #FF6B4D, #A66EFF) border-box',
              border: '0.5px solid transparent',
              backgroundSize: '200% 100%',
              animation: 'shine-border 3s linear infinite',
            }}
          >
            <div className="text-text-primary text-[12px] sm:text-[14px] bg-surface-muted px-2 py-1 font-thin rounded-md">
              ✨{boost}x LP{' '}
            </div>
          </div>
        </PopoverTrigger>
        <PopoverContent className="bg-surface-muted shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg p-4 z-50">
          <div>
            <div className="font-semibold leading-relaxed text-white">Points Boost for Liquidity</div>
            <div className="text-sm leading-relaxed text-white mt-2">
              Earn {boost}x points while your liquidity is <br />
              within the active bin.
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip delayDuration={0} disableHoverableContent>
      <TooltipTrigger asChild>
        <div
          className="rounded-md"
          style={{
            background:
              'linear-gradient(transparent, transparent) padding-box, linear-gradient(90deg, #16C4B3, #FF6B4D, #A66EFF) border-box',
            border: '0.5px solid transparent',
            backgroundSize: '200% 100%',
            animation: 'shine-border 3s linear infinite',
          }}
        >
          <div className="text-[#f0f0f0]  text-[12px] sm:text-[14px] bg-[#202126] px-2 py-1 font-thin rounded-md">✨{boost}x LP </div>
        </div>
      </TooltipTrigger>
      <TooltipContent asChild className="bg-surface-muted shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg">
        <div>
          <div className="font-semibold leading-relaxed text-white">Points Boost for Liquidity</div>
          <div className="text-sm leading-relaxed text-white mt-2">
            Earn {boost}x points while your liquidity is <br />
            within the active bin.
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
export function SwapBoostTooltip({ boost }: { boost: number }) {
  return (
    <Tooltip delayDuration={0} disableHoverableContent>
      <TooltipTrigger asChild>
        <div
          className="rounded-md"
          style={{
            background:
              'linear-gradient(transparent, transparent) padding-box, linear-gradient(90deg, #16C4B3, #FF6B4D, #A66EFF) border-box',
            border: '0.5px solid transparent',
            backgroundSize: '200% 100%',
            animation: 'shine-border 3s linear infinite',
          }}
        >
          <div className="text-text-primary text-[12px] bg-surface-muted px-2 py-0.5 font-thin rounded-md">✨{boost}x Points</div>
        </div>
      </TooltipTrigger>
      <TooltipContent asChild className="bg-surface-muted shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg">
        <div>
          <div className="font-semibold leading-relaxed text-white">Points Boost</div>
          <div className="text-sm leading-relaxed text-white mt-2">Swapping this token earns {boost}x points.</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
export function TokenBoostTooltip({ boost, logoURI, symbol }: { boost: number; logoURI?: string; symbol: string }) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <div className="rounded-md px-2 py-1 sm:py-1.5 border border-border-dark flex items-center space-x-1 ">
            <TokenTicker logoURI={logoURI} symbol={symbol} className="w-4 h-4" />
            <span className="text-xs text-white">{boost}x</span>
          </div>
        </PopoverTrigger>
        <PopoverContent className="bg-surface-muted shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg p-4 z-50">
          <div>
            <div className="font-semibold leading-relaxed text-white">Points Boost for Fees Earned</div>
            <div className="text-sm leading-relaxed text-white mt-2">
              Earn {boost}x points from fees generated <br /> when {symbol} is swapped.
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip delayDuration={0} disableHoverableContent>
      <TooltipTrigger asChild>
        <div className="rounded-md px-2 py-1 sm:py-1.5 border border-[#3e3e3e] flex items-center space-x-1 ">
          <TokenTicker logoURI={logoURI} symbol={symbol} className="w-4 h-4" />
          <span className="text-xs text-white">{boost}x</span>
        </div>
      </TooltipTrigger>
      <TooltipContent asChild className="bg-surface-muted shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg">
        <div>
          <div className="font-semibold leading-relaxed text-white">Points Boost for Fees Earned</div>
          <div className="text-sm leading-relaxed text-white mt-2">
            Earn {boost}x points from fees generated <br /> when {symbol} is swapped.
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function TotalBoostTooltip({
  boosts,

  referralBoost,
}: {
  boosts: { boostName: string; percent: number }[] | undefined;
  referralBoost?: number;
}) {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <CircleQuestionMark className="w-5 h-5   text-text-secondary" />
        </PopoverTrigger>
        <PopoverContent className="bg-[#202126] shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg p-4 focus-visible:outline-none z-10">
          <div className=" max-w-[286px] ">
            <div className="flex flex-col  gap-2   leading-relaxed text-white">
              {boosts?.map((boost) => (
                <div key={boost.boostName} className="flex justify-between items-center">
                  <span className="font-bold text-sm">{boost.boostName}</span>
                  <span className="font-bold text-[#1ee6e1] text-xs">+{boost.percent}%</span>
                </div>
              ))}
              {referralBoost && (
                <div className="flex justify-between items-center">
                  <span className="font-bold text-sm">Referral</span>
                  <span className="font-bold text-[#1ee6e1] text-xs">+{referralBoost}%</span>
                </div>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip delayDuration={0} disableHoverableContent>
      <TooltipTrigger asChild>
        <CircleQuestionMark className="w-5 h-5   text-text-secondary" />
      </TooltipTrigger>
      <TooltipContent asChild className="bg-[#202126] shadow-[0_4px_8px_0_rgba(255,255,255,0.07)] rounded-lg min-w-[200px]  ">
        <div className=" max-w-[286px]">
          <div className="flex flex-col  gap-2   leading-relaxed text-white">
            {boosts?.map((boost) => (
              <div key={boost.boostName} className="flex justify-between items-center">
                <span className="font-bold text-sm">{boost.boostName}</span>
                <span className="font-bold text-[#1ee6e1] text-xs">+{boost.percent}%</span>
              </div>
            ))}
            {referralBoost && (
              <div className="flex justify-between items-center">
                <span className="font-bold text-sm">Referral</span>
                <span className="font-bold text-[#1ee6e1] text-xs">+{referralBoost}%</span>
              </div>
            )}
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function MyPointsTooltip() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <img key={'info-my-points'} src={'/information.svg'} alt={'my-points'} className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="bg-surface-muted shadow-[0_2px_6px_0_rgba(0,0,0,0.4)] rounded-lg p-4 text-white">
          <div className=" max-w-[286px]">
            Points (excluding referral points) update in real time. Referral points are added once daily.
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip delayDuration={0} disableHoverableContent>
      <TooltipTrigger asChild>
        <img key={'info-my-points'} src={'/information.svg'} alt={'my-points'} className="h-[18px] w-[18px]" />
      </TooltipTrigger>
      <TooltipContent asChild className="bg-surface-muted shadow-[0_2px_6px_0_rgba(0,0,0,0.4)] rounded-lg">
        <div className=" max-w-[286px]">
          <div className="text-sm leading-relaxed text-white ">
            Points (excluding referral points) update in real time. Referral points are added once daily.
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
export function TierTooltip() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <img key={'info-my-points'} src={'/information.svg'} alt={'my-points'} className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="bg-surface-muted shadow-[0_2px_6px_0_rgba(0,0,0,0.4)] rounded-lg p-4 text-white z-20">
          <div className=" max-w-[286px]">
            Your tier is determined by your rank. Tier boosts take effect from the next season epoch. See available Tiers
            <a
              href="https://docs.memepulse.xyz/pre-phase/points/tiers-and-badges"
              target="_blank"
              className="text-text-secondary underline ml-1"
            >
              here
            </a>
          </div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <img key={'info-my-points'} src={'/information.svg'} alt={'my-points'} className="h-[18px] w-[18px]" />
      </TooltipTrigger>
      <TooltipContent asChild className="bg-surface-muted shadow-[0_2px_6px_0_rgba(0,0,0,0.4)] rounded-lg">
        <div className=" max-w-[286px]">
          <div className="text-sm leading-relaxed text-white ">
            Your tier is determined by your rank. Tier boosts take effect from the next season epoch. See available Tiers
            <a
              href="https://docs.memepulse.xyz/pre-phase/points/tiers-and-badges"
              target="_blank"
              className="text-text-secondary underline ml-1"
            >
              here
            </a>
          </div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

export function BoostTooltip() {
  const isMobile = useMediaQuery('(max-width: 768px)');

  if (isMobile) {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <img key={'info-my-points'} src={'/information.svg'} alt={'my-points'} className="h-4 w-4" />
        </PopoverTrigger>
        <PopoverContent className="bg-surface-muted shadow-[0_2px_6px_0_rgba(0,0,0,0.4)] rounded-lg p-4 text-white z-20">
          <div className=" max-w-[286px]">Sum of all boosts from Badges, Referrals, and Tier bonus.</div>
        </PopoverContent>
      </Popover>
    );
  }
  return (
    <Tooltip delayDuration={0}>
      <TooltipTrigger asChild>
        <img key={'info-my-points'} src={'/information.svg'} alt={'my-points'} className="h-[18px] w-[18px]" />
      </TooltipTrigger>
      <TooltipContent asChild className="bg-surface-muted shadow-[0_2px_6px_0_rgba(0,0,0,0.4)] rounded-lg">
        <div className=" max-w-[286px]">
          <div className="text-sm leading-relaxed text-white">Sum of all boosts from Badges, Referrals, and Tier bonus.</div>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
