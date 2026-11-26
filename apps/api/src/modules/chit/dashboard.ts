import { Controller, Get, Injectable, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  dueListQuerySchema,
  formatIstDate,
  paginationQuerySchema,
  toPaginated,
} from '@chitfund/shared';
import { type z } from 'zod';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { createZodDto } from '../../common/validation/zod-dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ManagerOnly } from './common';
import { LedgerService } from './ledger.service';

const ENDING_SOON_DAYS = 90;
const duesSchema = paginationQuerySchema.merge(dueListQuerySchema);
class DuesDto extends createZodDto(duesSchema) {}

const monthKey = (date: Date) => formatIstDate(date, 'yyyy-MM');

/**
 * Dues are derived from payments, so these views compute in memory over the
 * organizer's running schemes. That is fine for a single local business.
 */
@Injectable()
export class DashboardService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  private async runningGroups(organizerId: string, groupId?: string) {
    const groups = await this.prisma.chitGroup.findMany({
      where: { organizerId, status: 'ACTIVE', ...(groupId ? { id: groupId } : {}) },
      orderBy: { name: 'asc' },
      include: {
        months: { orderBy: { monthNumber: 'asc' } },
        tickets: {
          orderBy: { ticketNumber: 'asc' },
          include: { member: { select: { id: true, name: true, phone: true } }, payout: true },
        },
      },
    });
    const paid = await this.ledger.paidByTicket(groups.flatMap((g) => g.tickets.map((t) => t.id)));
    return { groups, paid };
  }

  async summary(organizerId: string) {
    const now = new Date();
    const thisMonth = monthKey(now);
    const { groups, paid } = await this.runningGroups(organizerId);

    let outstanding = 0n;
    let advance = 0n;
    let defaulters = 0;
    let expectedThisMonth = 0n;
    let receivedForThisMonth = 0n;
    let paidThisMonthCount = 0;
    let ticketsDueThisMonth = 0;
    const payoutsPending: {
      groupId: string;
      groupName: string;
      monthNumber: number;
      dueDate: Date;
      payoutAmount: bigint;
    }[] = [];
    const endingSoon: {
      id: string;
      name: string;
      code: string;
      endDate: Date;
      monthsLeft: number;
    }[] = [];

    for (const group of groups) {
      const monthNow = group.months.find((m) => monthKey(m.dueDate) === thisMonth);
      for (const ticket of group.tickets) {
        const ledger = this.ledger.ledger(group, paid.get(ticket.id) ?? 0n, now);
        outstanding += ledger.outstanding;
        advance += ledger.advance;
        if (ledger.outstanding > 0n) {
          defaulters += 1;
        }
        if (monthNow) {
          const row = ledger.rows.find((r) => r.monthNumber === monthNow.monthNumber);
          ticketsDueThisMonth += 1;
          expectedThisMonth += group.monthlyInstallment;
          receivedForThisMonth += row?.paid ?? 0n;
          if (row && row.balance === 0n) {
            paidThisMonthCount += 1;
          }
        }
      }

      const paidOutMonths = new Set(
        group.tickets.flatMap((t) => (t.payout ? [t.payout.monthNumber] : [])),
      );
      for (const month of group.months) {
        if (month.dueDate <= now || monthKey(month.dueDate) === thisMonth) {
          if (!month.isOrganizerMonth && !paidOutMonths.has(month.monthNumber)) {
            payoutsPending.push({
              groupId: group.id,
              groupName: group.name,
              monthNumber: month.monthNumber,
              dueDate: month.dueDate,
              payoutAmount: month.payoutAmount,
            });
          }
        }
      }

      const last = group.months.at(-1);
      if (last && last.dueDate.getTime() - now.getTime() <= ENDING_SOON_DAYS * 86_400_000) {
        endingSoon.push({
          id: group.id,
          name: group.name,
          code: group.code,
          endDate: last.dueDate,
          monthsLeft: group.months.filter((m) => m.dueDate > now).length,
        });
      }
    }

    const monthStart = new Date(`${thisMonth}-01T00:00:00+05:30`);
    const collected = await this.prisma.paymentRecord.aggregate({
      where: {
        reversedAt: null,
        paidOn: { gte: monthStart },
        ticket: { group: { organizerId } },
      },
      _sum: { amount: true },
    });
    const [memberCount, draftGroups] = await Promise.all([
      this.prisma.member.count({ where: { organizerId } }),
      this.prisma.chitGroup.count({ where: { organizerId, status: 'DRAFT' } }),
    ]);

    return {
      activeGroups: groups.length,
      draftGroups,
      memberCount,
      outstanding,
      advance,
      defaulters,
      thisMonth: {
        label: formatIstDate(now, 'MMMM yyyy'),
        expected: expectedThisMonth,
        receivedForMonth: receivedForThisMonth,
        collected: collected._sum.amount ?? 0n,
        ticketsDue: ticketsDueThisMonth,
        ticketsPaid: paidThisMonthCount,
      },
      payoutsPending: payoutsPending.sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime()),
      endingSoon: endingSoon.sort((a, b) => a.endDate.getTime() - b.endDate.getTime()),
    };
  }

  /** Tickets in running schemes, most overdue first. */
  async dues(organizerId: string, query: z.output<typeof duesSchema>) {
    const now = new Date();
    const { groups, paid } = await this.runningGroups(organizerId, query.groupId);
    const search = query.search?.toLowerCase();

    const rows = groups.flatMap((group) =>
      group.tickets
        .filter((ticket) => !search || ticket.member.name.toLowerCase().includes(search))
        .map((ticket) => {
          const ledger = this.ledger.summary(group, paid.get(ticket.id) ?? 0n, now);
          const oldest = group.months.find((m) => m.monthNumber === ledger.oldestUnpaidMonth);
          return {
            ticketId: ticket.id,
            ticketNumber: ticket.ticketNumber,
            member: ticket.member,
            group: { id: group.id, name: group.name, code: group.code },
            payout: ticket.payout
              ? { monthNumber: ticket.payout.monthNumber, amount: ticket.payout.amount }
              : null,
            outstanding: ledger.outstanding,
            advance: ledger.advance,
            totalPaid: ledger.totalPaid,
            remainingForPlan: ledger.remainingForPlan,
            oldestUnpaidMonth: ledger.oldestUnpaidMonth,
            oldestUnpaidDueDate: oldest?.dueDate ?? null,
            monthsBehind:
              group.monthlyInstallment > 0n
                ? Number(
                    (ledger.outstanding + group.monthlyInstallment - 1n) / group.monthlyInstallment,
                  )
                : 0,
          };
        }),
    );

    const filtered = query.filter === 'unpaid' ? rows.filter((row) => row.outstanding > 0n) : rows;
    filtered.sort(
      (a, b) =>
        b.monthsBehind - a.monthsBehind ||
        a.group.name.localeCompare(b.group.name) ||
        a.ticketNumber - b.ticketNumber,
    );
    const start = (query.page - 1) * query.pageSize;
    return toPaginated(filtered.slice(start, start + query.pageSize), filtered.length, query);
  }
}

@ApiTags('dashboard')
@ManagerOnly()
@Controller()
export class DashboardController {
  constructor(private readonly dashboard: DashboardService) {}

  @Get('dashboard')
  summary(@CurrentUser() user: AuthenticatedUser) {
    return this.dashboard.summary(user.id);
  }

  @Get('dues')
  dues(@CurrentUser() user: AuthenticatedUser, @Query() query: DuesDto) {
    return this.dashboard.dues(user.id, query);
  }
}
