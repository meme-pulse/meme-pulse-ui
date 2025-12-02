import * as SliderPrimitive from '@radix-ui/react-slider';
import * as React from 'react';
import { cn } from '@/lib/utils';

interface DualRangeSliderProps extends React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root> {
  label?: (value: number) => React.ReactNode;
  labelPosition?: 'top' | 'bottom';
}

const DualRangeSlider = React.forwardRef<React.ElementRef<typeof SliderPrimitive.Root>, DualRangeSliderProps>(
  ({ className, label, labelPosition = 'top', ...props }, ref) => {
    // Use value prop if it exists, otherwise use defaultValue
    const values = props.value || props.defaultValue;

    // Check if the two values in value are the same
    const isSameValue = values && values[0] === values[1] && props.max === props.min;

    // When two values are the same, force min, max, value to [0, 1]
    const sliderProps = isSameValue
      ? {
          min: 0,
          max: 1,
          value: [0, 1],
          onValueChange: () => {}, // Make onValueChange an empty function to prevent manipulation
          disabled: true, // Disable the slider itself
          'aria-readonly': true,
        }
      : {
          ...props,
          min: props.min ?? 0,
          max: props.max ?? 100,
        };

    // When the two values in value are the same, don't show the thumb's label
    const labelProps = isSameValue ? {} : { label, labelPosition };

    return (
      <SliderPrimitive.Root
        ref={ref}
        className={cn('relative flex w-full touch-none select-none items-center', className)}
        {...sliderProps}
      >
        <SliderPrimitive.Track 
          className="relative h-[6px] w-full grow overflow-hidden bg-figma-gray-table"
          style={{
            boxShadow: 'inset 1px 1px 0px 0px #808088, inset -1px -1px 0px 0px #f9f9fa'
          }}
        >
          <SliderPrimitive.Range className="absolute h-full bg-figma-purple" />
        </SliderPrimitive.Track>

        {sliderProps.value?.map((value, index) => (
          <React.Fragment key={index}>
            <SliderPrimitive.Thumb 
              className="relative block h-[14px] w-[10px] border-2 border-white bg-figma-gray-bg ring-offset-background transition-colors focus-visible:outline-none disabled:pointer-events-none disabled:opacity-50"
              style={{
                boxShadow: 'inset -1px -1px 0px 0px #808088, inset 1px 1px 0px 0px #f9f9fa, 1px 1px 0px 0px #000'
              }}
            >
              {labelProps.label && (
                <span
                  className={cn(
                    'absolute flex w-full justify-center text-figma-text-dark',
                    labelProps.labelPosition === 'top' && '-top-7',
                    labelProps.labelPosition === 'bottom' && 'top-4'
                  )}
                >
                  {labelProps.label(value)}
                </span>
              )}
            </SliderPrimitive.Thumb>
          </React.Fragment>
        ))}
      </SliderPrimitive.Root>
    );
  }
);

DualRangeSlider.displayName = SliderPrimitive.Root.displayName;

export { DualRangeSlider };
