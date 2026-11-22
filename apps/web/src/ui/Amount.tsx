import { type FormatInrOptions, type Paise, formatINR, paiseFromString } from '@chitfund/shared';
import { cn } from './cn';

export type AmountProps = {
  /** Paise, as a bigint or the decimal string the API sends. */
  value: Paise | string;
  fraction?: FormatInrOptions['fraction'];
  emphasis?: boolean;
  className?: string;
};

export function Amount({ value, fraction, emphasis = false, className }: AmountProps) {
  const paise = typeof value === 'string' ? paiseFromString(value) : value;

  return (
    <span
      className={cn(
        'whitespace-nowrap font-mono tabular',
        emphasis ? 'font-semibold' : 'font-medium',
        className,
      )}
    >
      {formatINR(paise, { fraction })}
    </span>
  );
}
