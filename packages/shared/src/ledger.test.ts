import { describe, expect, it } from 'vitest';
import { dueDateFor } from './dates';
import { buildLedger } from './ledger';

const start = new Date('2026-01-01T00:00:00+05:30');
const months = Array.from({ length: 4 }, (_, i) => ({
  monthNumber: i + 1,
  dueDate: dueDateFor(start, i, 5),
}));
// 20 Feb 2026: months 1 and 2 are past due, 3 and 4 are in the future.
const now = new Date('2026-02-20T10:00:00+05:30');

describe('buildLedger', () => {
  it('marks unpaid past months overdue and future months upcoming', () => {
    const ledger = buildLedger(months, 250000n, 0n, now);
    expect(ledger.rows.map((r) => r.status)).toEqual([
      'OVERDUE',
      'OVERDUE',
      'UPCOMING',
      'UPCOMING',
    ]);
    expect(ledger.outstanding).toBe(500000n);
    expect(ledger.oldestUnpaidMonth).toBe(1);
  });

  it('carries a part payment and settles it with a later larger payment', () => {
    const partial = buildLedger(months, 500000n, 250000n, now);
    expect(partial.rows[0]).toMatchObject({ paid: 250000n, balance: 250000n, status: 'PARTIAL' });
    const settled = buildLedger(months, 500000n, 250000n + 750000n, now);
    expect(settled.rows.slice(0, 2).map((r) => r.status)).toEqual(['PAID', 'PAID']);
    expect(settled.outstanding).toBe(0n);
  });

  it('counts money beyond the dues so far as advance', () => {
    const ledger = buildLedger(months, 250000n, 750000n, now);
    expect(ledger.rows[2]?.status).toBe('ADVANCE');
    expect(ledger.advance).toBe(250000n);
    expect(ledger.remainingForPlan).toBe(250000n);
    expect(ledger.oldestUnpaidMonth).toBe(4);
  });

  it('reports DUE on the due date itself and zero remaining when fully paid', () => {
    const onDueDay = new Date('2026-02-05T09:00:00+05:30');
    expect(buildLedger(months, 100n, 100n, onDueDay).rows[1]?.status).toBe('DUE');
    const done = buildLedger(months, 100n, 400n, now);
    expect(done.remainingForPlan).toBe(0n);
    expect(done.oldestUnpaidMonth).toBeNull();
  });
});
