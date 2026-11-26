import { Injectable } from '@nestjs/common';
import { type LedgerSummary, buildLedger } from '@chitfund/shared';
import { PrismaService } from '../../prisma/prisma.service';

export type GroupSchedule = {
  monthlyInstallment: bigint;
  months: readonly { monthNumber: number; dueDate: Date }[];
};

/** Computes dues from payments on read, so a reversal or schedule edit is reflected immediately. */
@Injectable()
export class LedgerService {
  constructor(private readonly prisma: PrismaService) {}

  /** Sum of non-reversed payments per ticket. Tickets with no payments are absent. */
  async paidByTicket(ticketIds: readonly string[]): Promise<Map<string, bigint>> {
    if (ticketIds.length === 0) {
      return new Map();
    }
    const rows = await this.prisma.paymentRecord.groupBy({
      by: ['ticketId'],
      where: { ticketId: { in: [...ticketIds] }, reversedAt: null },
      _sum: { amount: true },
    });
    return new Map(rows.map((row) => [row.ticketId, row._sum.amount ?? 0n]));
  }

  ledger(schedule: GroupSchedule, paid: bigint, now = new Date()): LedgerSummary {
    return buildLedger(schedule.months, schedule.monthlyInstallment, paid, now);
  }

  /** Ledger summary without the per-month rows, for lists. */
  summary(schedule: GroupSchedule, paid: bigint, now = new Date()) {
    const { rows, ...rest } = this.ledger(schedule, paid, now);
    const lastPaidRow = [...rows].reverse().find((row) => row.paid > 0n);
    return { ...rest, paidThroughMonth: lastPaidRow?.monthNumber ?? 0 };
  }
}
