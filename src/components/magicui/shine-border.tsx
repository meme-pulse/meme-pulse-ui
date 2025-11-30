'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

interface ShineBorderProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Width of the border in pixels
   * @default 1
   */
  borderWidth?: number;
  /**
   * Duration of the animation in seconds
   * @default 14
   */
  duration?: number;
  /**
   * Color of the border, can be a single color or an array of colors
   * @default "#000000"
   */
  shineColor?: string | string[];
}

/**
 * Shine Border
 *
 * An animated background border effect component with configurable properties.
 */
export function ShineBorder({ borderWidth = 1, duration = 14, shineColor = '#000000', className, style, ...props }: ShineBorderProps) {
  const colors = Array.isArray(shineColor) ? shineColor : [shineColor];
  const gradientColors = colors.join(', ');

  return (
    <div
      style={
        {
          '--border-width': `${borderWidth}px`,
          '--duration': `${duration}s`,
          border: `${borderWidth}px solid transparent`,
          background: `linear-gradient(white, white) padding-box, linear-gradient(90deg, transparent, ${gradientColors}, transparent) border-box`,
          backgroundSize: '200% 100%',
          ...style,
        } as React.CSSProperties
      }
      className={cn(
        'pointer-events-none absolute inset-0 size-full rounded-[inherit] will-change-[background-position] motion-safe:animate-shine-border',
        className
      )}
      {...props}
    />
  );
}
