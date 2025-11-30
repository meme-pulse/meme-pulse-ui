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
        <SliderPrimitive.Track className="relative h-1 w-full grow overflow-hidden rounded-full bg-gray-200">
          <SliderPrimitive.Range className="absolute h-full bg-gray-500" />
        </SliderPrimitive.Track>

        {sliderProps.value?.map((value, index) => (
          <React.Fragment key={index}>
            <SliderPrimitive.Thumb className="relative block h-3 w-3 rounded-full border-2 border-gray-500 bg-background ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50">
              {labelProps.label && (
                <span
                  className={cn(
                    'absolute flex w-full justify-center',
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
