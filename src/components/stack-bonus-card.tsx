import { useMediaQuery } from 'usehooks-ts';
import { Button } from './ui/button';
import { Popover, PopoverTrigger, PopoverContent } from './ui/popover';
import { useNavigate } from 'react-router-dom';

export default function StackBonusCard() {
  const hasReward = true;

  const isMobile = useMediaQuery('(max-width: 768px)');
  const navigate = useNavigate();
  return (
    // border = border: 1px solid var(--Style-6, rgba(255, 255, 255, 0.04));
    // boxShadow = box-shadow: 0px 1px 2px 0px rgba(255, 255, 255, 0.00), 0px -2px 0px 0px rgba(12, 17, 29, 0.05) inset, 0px 0px 0px 1px rgba(12, 17, 29, 0.05) inset;

    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="h-10  rounded-[8px] bg-border-subtle p-2 sm:px-4 border border-border-subtle shadow-[0px_1px_2px_0px_rgba(255,255,255,0.00),_0px_-2px_0px_0px_rgba(12,17,29,0.05)_inset,_0px_0px_0px_1px_rgba(12,17,29,0.05)_inset]  text-body-md hover:bg-border-subtle relative"
          type="button"
        >
          <img src="/icon/heroicons-solid/gift.svg" alt="stack bonus" className="w-5 h-5" />
          {hasReward && (
            <div className="bg-accent-primary absolute -top-2 -right-2 rounded-md px-2 py-1 text-caption font-bold text-surface-default">
              1
            </div>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className={`mt-2 bg-surface-muted   rounded-md p-2 border-none ${isMobile ? 'w-80' : ' w-96'}`}>
        <div className="bg-surface-elevated rounded-md p-2 ">
          <div className="flex items-center gap-2">
            <img src="/icon/stackbonus.png" alt="stack bonus" className="w-12 h-12" />
            <div className="flex flex-col gap-1">
              <div className="text-body-lg font-bold">Stack Bonus</div>
              <div className="text-caption text-text-secondary">
                Earn bonus M by providing liquidity in the M-MGOLD (Bin Step 10) pool within the active range.
              </div>
              <div className="text-body-sm font-bold text-green-dark-200 flex items-center gap-2">
                <img src="/token_default.svg" alt="M" className="w-[18px] h-[18px]" />0 M
              </div>
            </div>
            {!isMobile && (
              <Button
                variant="outline"
                size="sm"
                className=" bg-accent-primary text-surface-default hover:bg-accent-primary h-10 text-body-sm"
                onClick={() => {
                  navigate('/pool/v22/0x5555555555555555555555555555555555555555/0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb/10');
                }}
              >
                Deposit
              </Button>
            )}
          </div>
          {isMobile && (
            <Button
              variant="outline"
              size="sm"
              className="mt-2 bg-accent-primary text-surface-default hover:bg-accent-primary h-10 text-body-sm w-full"
              onClick={() => {
                navigate('/pool/v22/0x5555555555555555555555555555555555555555/0xb8ce59fc3717ada4c02eadf9682a9e934f625ebb/10');
              }}
            >
              Deposit
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
