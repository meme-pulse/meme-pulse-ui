import React from 'react';
import { useLocalStorage } from 'usehooks-ts';
import * as SwitchPrimitives from '@radix-ui/react-switch';

import { cn } from '@/lib/utils';

const AutoFillSwitch = React.forwardRef<
  React.ElementRef<typeof SwitchPrimitives.Root>,
  React.ComponentPropsWithoutRef<typeof SwitchPrimitives.Root>
>(({ className, ...props }, ref) => {
  const [autoFill, setAutoFill] = useLocalStorage('autoFill', false);

  return (
    <div className="flex items-center gap-2">
      <SwitchPrimitives.Root
        className={cn(
          'peer inline-flex h-[18px] w-[36px] shrink-0 cursor-pointer items-center border-2 border-white transition-colors focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-figma-purple data-[state=unchecked]:bg-figma-gray-bg',
          'shadow-[inset_1px_1px_0px_0px_#808088,inset_-1px_-1px_0px_0px_#f9f9fa]',
          className
        )}
        {...props}
        ref={ref}
        checked={autoFill}
        onCheckedChange={setAutoFill}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            'pointer-events-none block h-[12px] w-[12px] bg-figma-gray-bg border border-white ring-0 transition-transform data-[state=checked]:translate-x-[18px] data-[state=unchecked]:translate-x-[2px]',
            'shadow-[inset_-1px_-1px_0px_0px_#808088,inset_1px_1px_0px_0px_#f9f9fa]'
          )}
        />
      </SwitchPrimitives.Root>
      <span className="text-figma-text-dark font-roboto text-[12px]">Auto-Fill</span>
    </div>
  );
});
AutoFillSwitch.displayName = SwitchPrimitives.Root.displayName;

export default AutoFillSwitch;
