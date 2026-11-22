import { describe, expect, it } from 'vitest';
import { dueDateFor, formatIstDate, formatIstDateTime, isPastDue, startOfIstDay } from './dates';

describe('startOfIstDay', () => {
  it('returns India midnight, which is 18:30 UTC the previous day', () => {
    expect(startOfIstDay(new Date('2026-03-10T05:00:00Z')).toISOString()).toBe(
      '2026-03-09T18:30:00.000Z',
    );
  });

  it('rolls over to the next India day after 18:30 UTC', () => {
    expect(startOfIstDay(new Date('2026-03-10T19:00:00Z')).toISOString()).toBe(
      '2026-03-10T18:30:00.000Z',
    );
  });
});

describe('dueDateFor', () => {
  const start = new Date('2026-01-05T04:30:00Z');

  it('uses the start month for offset 0', () => {
    expect(formatIstDate(dueDateFor(start, 0, 10), 'yyyy-MM-dd')).toBe('2026-01-10');
  });

  it('advances by whole months', () => {
    expect(formatIstDate(dueDateFor(start, 11, 10), 'yyyy-MM-dd')).toBe('2026-12-10');
  });

  it('clamps to the end of short months', () => {
    expect(formatIstDate(dueDateFor(start, 1, 31), 'yyyy-MM-dd')).toBe('2026-02-28');
    expect(formatIstDate(dueDateFor(new Date('2028-01-01T00:00:00Z'), 1, 30), 'yyyy-MM-dd')).toBe(
      '2028-02-29',
    );
  });

  it('returns India midnight', () => {
    expect(dueDateFor(start, 0, 10).toISOString()).toBe('2026-01-09T18:30:00.000Z');
  });
});

describe('isPastDue', () => {
  const due = new Date('2026-01-09T18:30:00Z');

  it('is not past due on the due day itself', () => {
    expect(isPastDue(due, new Date('2026-01-10T17:00:00Z'))).toBe(false);
  });

  it('is past due from the next India day', () => {
    expect(isPastDue(due, new Date('2026-01-10T18:30:00Z'))).toBe(true);
  });
});

describe('formatting', () => {
  it('formats dates and times in India time', () => {
    const value = new Date('2026-08-15T03:30:00Z');
    expect(formatIstDate(value)).toBe('15 Aug 2026');
    expect(formatIstDateTime(value)).toBe('15 Aug 2026, 9:00 AM');
  });
});
