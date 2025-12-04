import { motion } from 'motion/react';

interface BoostBadgeProps {
  protocolSharePct: number;
  className?: string;
  variant?: 'compact' | 'full' | 'mini';
}

export function BoostBadge({ protocolSharePct, className = '', variant = 'full' }: BoostBadgeProps) {
  // protocolSharePct is already in percentage (10, 20, 40, 50)
  // Only show boost for 10%, 20%, 40% (not 50% default)
  if (protocolSharePct === 50) return null;

  const getBoostInfo = () => {
    if (protocolSharePct === 10) {
      return {
        rank: 1,
        boostPercent: 80,
        bgColor: '#facb25',
        borderColor: '#d4a017',
        textColor: '#030303',
        retroShadow: 'inset -1px -1px 0px 0px #d4a017, inset 1px 1px 0px 0px #ffd700, inset -2px -2px 0px 0px #b8860b, inset 2px 2px 0px 0px #ffed4e',
      };
    }
    if (protocolSharePct === 20) {
      return {
        rank: 2,
        boostPercent: 60,
        bgColor: '#895bf5',
        borderColor: '#6b46c1',
        textColor: '#ffffff',
        retroShadow: 'inset -1px -1px 0px 0px #6b46c1, inset 1px 1px 0px 0px #a78bfa, inset -2px -2px 0px 0px #553c9a, inset 2px 2px 0px 0px #c4b5fd',
      };
    }
    if (protocolSharePct === 40) {
      return {
        rank: 3,
        boostPercent: 20,
        bgColor: '#22c55e',
        borderColor: '#16a34a',
        textColor: '#030303',
        retroShadow: 'inset -1px -1px 0px 0px #16a34a, inset 1px 1px 0px 0px #4ade80, inset -2px -2px 0px 0px #15803d, inset 2px 2px 0px 0px #86efac',
      };
    }
    return null;
  };

  const boostInfo = getBoostInfo();
  if (!boostInfo) return null;

  return (
    <motion.div
      className={`relative inline-flex items-center ${variant === 'mini' ? 'gap-0 border' : 'gap-1 border-2'} ${className}`}
      style={{
        background: boostInfo.bgColor,
        borderColor: boostInfo.borderColor,
        boxShadow: variant === 'mini' ? 'inset -1px -1px 0px 0px rgba(0,0,0,0.2), inset 1px 1px 0px 0px rgba(255,255,255,0.3)' : boostInfo.retroShadow,
        fontFamily: '"Press Start 2P", cursive',
      }}
      animate={{
        boxShadow: [
          boostInfo.retroShadow,
          `${boostInfo.retroShadow}, 0 0 8px ${boostInfo.bgColor}80`,
          boostInfo.retroShadow,
        ],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
    >
      {/* Pixelated glow effect */}
      <motion.div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(90deg, transparent 0%, ${boostInfo.bgColor}40 50%, transparent 100%)`,
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: 'linear',
        }}
      />

      {/* Content */}
      <div className={`relative z-10 flex items-center ${variant === 'mini' ? 'gap-0.5 px-1 py-0' : 'gap-1.5 px-2 py-0.5'}`}>
        {variant !== 'mini' && (
          <motion.span
            className={variant === 'compact' ? 'text-[7px]' : 'text-[8px]'}
            animate={{
              rotate: [0, 360],
            }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'linear',
            }}
          >
            ⚡
          </motion.span>
        )}
        <span
          className={`font-bold leading-tight ${
            variant === 'mini'
              ? 'text-[7px] px-0.5'
              : variant === 'compact'
                ? 'text-[7px]'
                : 'text-[8px] whitespace-nowrap'
          }`}
          style={{ color: boostInfo.textColor }}
        >
          {variant === 'mini'
            ? `+${boostInfo.boostPercent}%`
            : variant === 'compact'
              ? `+${boostInfo.boostPercent}%`
              : `YIELD BOOST +${boostInfo.boostPercent}%`}
        </span>
      </div>
    </motion.div>
  );
}

