import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useLocalStorage } from 'usehooks-ts';

export function LiquiditySettingPopover() {
  const [slippage, setSlippage] = useLocalStorage('liquidity-slippage', '0.5');
  const [binCountLimit, setBinCountLimit] = useLocalStorage('bin-count-limit', '21');
  const [deadline, setDeadline] = useLocalStorage('deadline', '30');

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button size="sm" className="text-text-primary hover:text-text-primary bg-transparent">
          <Settings className="w-4 h-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80">
        <div className="grid gap-4">
          <div className="space-y-2">
            <h4 className="leading-none font-medium">Settings</h4>
          </div>
          <div className="grid gap-4">
            {/* Slippage Tolerance Row */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="slippage" className="">
                Amount Slippage tolerance
              </Label>
              <div className="flex items-center  gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlippage('0.1')}
                  className={`${slippage === '0.1' ? 'bg-green-dark-800' : ''}`}
                >
                  0.1%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlippage('0.5')}
                  className={`${slippage === '0.5' ? 'bg-green-dark-800' : ''}`}
                >
                  0.5%
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setSlippage('1')}
                  className={`${slippage === '1' ? 'bg-green-dark-800' : ''}`}
                >
                  1%
                </Button>
                <Input
                  id="slippage"
                  placeholder="0.5"
                  max={100}
                  className={`min-w-20 h-8 ${slippage !== '0.5' && slippage !== '0.1' && slippage !== '1' ? 'bg-green-dark-800' : ''}`}
                  type="number"
                  value={slippage}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (value === '' || Number(value) <= 100) {
                      setSlippage(value);
                    }
                  }}
                />
              </div>
            </div>
            {/* Transaction Deadline Row */}
            <div className="flex flex-col gap-2">
              <Label htmlFor="deadline" className="">
                Transaction Deadline
              </Label>
              <div className="flex items-center gap-2">
                <Input id="deadline" className="h-8 w-20" type="number" value={deadline} onChange={(e) => setDeadline(e.target.value)} />
                <div className="flex items-center justify-center px-3  ">minutes</div>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <Label htmlFor="binCountLimit" className="">
                Bin Count Limit
              </Label>
              <Input
                id="binCountLimit"
                className="h-8 w-20"
                type="number"
                value={binCountLimit}
                onChange={(e) => {
                  try {
                    const value = e.target.value;
                    if (typeof Number(value) === 'number') {
                      setBinCountLimit(value.toString());
                    }
                  } catch (e) {
                    console.error(e);
                  }
                }}
              />
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
