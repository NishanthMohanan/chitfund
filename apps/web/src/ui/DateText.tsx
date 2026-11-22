import { formatIstDate, formatIstDateTime } from '@chitfund/shared';
import { cn } from './cn';

export type DateTextProps = {
  value: Date | string;
  withTime?: boolean;
  className?: string;
};

/** Dates are always shown in India time, whatever the device time zone. */
export function DateText({ value, withTime = false, className }: DateTextProps) {
  const date = typeof value === 'string' ? new Date(value) : value;

  return (
    <time dateTime={date.toISOString()} className={cn('whitespace-nowrap tabular', className)}>
      {withTime ? formatIstDateTime(date) : formatIstDate(date)}
    </time>
  );
}
