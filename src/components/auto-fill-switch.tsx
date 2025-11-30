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
          'peer inline-flex h-5 w-[54px] shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-accent-primary data-[state=unchecked]:bg-muted',
          className
        )}
        {...props}
        ref={ref}
        checked={autoFill}
        onCheckedChange={setAutoFill}
      >
        <SwitchPrimitives.Thumb
          className={cn(
            'pointer-events-none block h-4 w-4 rounded-full bg-text-primary shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-[34px] data-[state=unchecked]:translate-x-0 drop-shadow-[0_2px_6px_rgba(0,0,0,0.25)]'
          )}
        />
      </SwitchPrimitives.Root>
      <span>Auto-Fill</span>
    </div>
  );
});
AutoFillSwitch.displayName = SwitchPrimitives.Root.displayName;

export default AutoFillSwitch;
