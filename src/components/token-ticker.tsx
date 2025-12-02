import { cn } from '@/lib/utils';

type TokenTickerProps = {
  logoURI: string | undefined;
  symbol: string | undefined;
  className?: string;
};

export default function TokenTicker({ logoURI, symbol, className }: TokenTickerProps) {
  return (
    <img
      src={symbol === 'M' ? '/token_default.svg' : logoURI ?? '/token_default.svg'}
      alt={symbol ?? ''}
      className={cn('w-7 h-7 rounded-full', className)}
    />
  );
}
