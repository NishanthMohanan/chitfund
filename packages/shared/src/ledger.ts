import { isPastDue } from './dates';
import { type DueStatus } from './enums';
import { type Paise } from './money';

export type LedgerMonth = { monthNumber: number; dueDate: Date };

export type LedgerRow = {
  monthNumber: number;
  dueDate: Date;
  due: Paise;
  paid: Paise;
  balance: Paise;
  status: DueStatus;
};

export type LedgerSummary = {
  rows: LedgerRow[];
  /** Installments whose due date has arrived (today included). */
  dueToDate: Paise;
  totalPaid: Paise;
  /** Unpaid part of the installments due so far. */
  outstanding: Paise;
  /** Paid beyond what is due so far, held against future months. */
  advance: Paise;
  /** Everything still to be paid until the plan ends. */
  remainingForPlan: Paise;
  planTotal: Paise;
  /** Earliest month with an unpaid balance, or null when fully paid. */
  oldestUnpaidMonth: number | null;
};

function isDueYet(dueDate: Date, now: Date): boolean {
  return isPastDue(dueDate, now) || sameIstDay(dueDate, now);
}

function sameIstDay(a: Date, b: Date): boolean {
  return !isPastDue(a, b) && !isPastDue(b, a);
}

function statusFor(due: Paise, paid: Paise, dueDate: Date, now: Date): DueStatus {
  const arrived = isDueYet(dueDate, now);
  if (paid >= due) {
    return arrived ? 'PAID' : 'ADVANCE';
  }
  if (paid > 0n) {
    return 'PARTIAL';
  }
  if (!arrived) {
    return 'UPCOMING';
  }
  return isPastDue(dueDate, now) ? 'OVERDUE' : 'DUE';
}

/**
 * Applies a ticket's total payments to its months oldest first. Part payments
 * leave a balance on the oldest month; a larger payment later clears it, and
 * anything beyond what is due so far counts as advance for future months.
 */
export function buildLedger(
  months: readonly LedgerMonth[],
  installment: Paise,
  totalPaid: Paise,
  now: Date = new Date(),
): LedgerSummary {
  const ordered = [...months].sort((a, b) => a.monthNumber - b.monthNumber);
  let pool = totalPaid;
  let dueToDate = 0n;
  let oldestUnpaidMonth: number | null = null;

  const rows = ordered.map((month): LedgerRow => {
    const paid = pool >= installment ? installment : pool;
    pool -= paid;
    const balance = installment - paid;
    if (isDueYet(month.dueDate, now)) {
      dueToDate += installment;
    }
    if (balance > 0n && oldestUnpaidMonth === null) {
      oldestUnpaidMonth = month.monthNumber;
    }
    return {
      monthNumber: month.monthNumber,
      dueDate: month.dueDate,
      due: installment,
      paid,
      balance,
      status: statusFor(installment, paid, month.dueDate, now),
    };
  });

  const planTotal = installment * BigInt(ordered.length);
  return {
    rows,
    dueToDate,
    totalPaid,
    outstanding: totalPaid >= dueToDate ? 0n : dueToDate - totalPaid,
    advance: totalPaid > dueToDate ? totalPaid - dueToDate : 0n,
    remainingForPlan: totalPaid >= planTotal ? 0n : planTotal - totalPaid,
    planTotal,
    oldestUnpaidMonth,
  };
}
