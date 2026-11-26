import { TZDate } from '@date-fns/tz';
import { addMonths, format, getDaysInMonth, startOfDay, startOfMonth } from 'date-fns';

export const IST_TIME_ZONE = 'Asia/Kolkata';

function inIst(date: Date): TZDate {
  return new TZDate(date, IST_TIME_ZONE);
}

/** Midnight in India for the calendar day that `date` falls on there. */
export function startOfIstDay(date: Date = new Date()): Date {
  return new Date(startOfDay(inIst(date)).getTime());
}

/**
 * Due date for the month `monthOffset` months after the month containing
 * `startDate` (offset 0 is the start month). The due day is clamped to the
 * last day of short months, so day 31 falls on 28/29 February.
 */
export function dueDateFor(startDate: Date, monthOffset: number, dueDayOfMonth: number): Date {
  const month = addMonths(startOfMonth(inIst(startDate)), monthOffset);
  const day = Math.min(dueDayOfMonth, getDaysInMonth(month));
  return new Date(new TZDate(month.getFullYear(), month.getMonth(), day, IST_TIME_ZONE).getTime());
}

/** True once the India calendar day after the due date has started. */
export function isPastDue(dueDate: Date, now: Date = new Date()): boolean {
  return startOfIstDay(now).getTime() > startOfIstDay(dueDate).getTime();
}

export function formatIstDate(date: Date, pattern = 'd MMM yyyy'): string {
  return format(inIst(date), pattern);
}

export function formatIstDateTime(date: Date): string {
  return format(inIst(date), 'd MMM yyyy, h:mm a');
}

/** Parses a calendar date typed as yyyy-mm-dd into midnight India time. */
export function istDateFromIso(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const [year, month, day] = [Number(match[1]), Number(match[2]), Number(match[3])];
  const date = new TZDate(year, month - 1, day, IST_TIME_ZONE);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return null;
  }
  return new Date(date.getTime());
}

/** The India calendar date of `date` as yyyy-mm-dd, for date inputs. */
export function toIstIsoDate(date: Date): string {
  return format(inIst(date), 'yyyy-MM-dd');
}
