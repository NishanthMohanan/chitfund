import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Param,
  ParseIntPipe,
  ParseUUIDPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  dueDateFor,
  groupCreateSchema,
  groupMonthUpdateSchema,
  groupStatusChangeSchema,
  groupUpdateSchema,
  listQuerySchema,
  paginationQuerySchema,
  paginationToSkipTake,
  payoutCreateSchema,
  ticketAssignSchema,
  ticketReplaceSchema,
  toPaginated,
} from '@chitfund/shared';
import { type GroupStatus, type Prisma } from '@prisma/client';
import { z } from 'zod';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { writeAudit } from '../../common/audit/audit';
import { createZodDto } from '../../common/validation/zod-dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ManagerOnly, conflict, contains, notFound, rule } from './common';
import { LedgerService } from './ledger.service';

const groupListQuerySchema = paginationQuerySchema.merge(listQuerySchema).extend({
  status: z.enum(['DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED']).optional(),
});

class GroupCreateDto extends createZodDto(groupCreateSchema) {}
class GroupUpdateDto extends createZodDto(groupUpdateSchema) {}
class GroupMonthUpdateDto extends createZodDto(groupMonthUpdateSchema) {}
class GroupStatusDto extends createZodDto(groupStatusChangeSchema) {}
class GroupListDto extends createZodDto(groupListQuerySchema) {}
class PageDto extends createZodDto(paginationQuerySchema) {}
class TicketAssignDto extends createZodDto(ticketAssignSchema) {}
class TicketReplaceDto extends createZodDto(ticketReplaceSchema) {}
class PayoutDto extends createZodDto(payoutCreateSchema) {}

const ALLOWED_TRANSITIONS: Record<GroupStatus, readonly GroupStatus[]> = {
  DRAFT: ['ACTIVE', 'CANCELLED'],
  ACTIVE: ['COMPLETED'],
  COMPLETED: [],
  CANCELLED: [],
};

const memberSummary = { select: { id: true, name: true, phone: true } } as const;

@Injectable()
export class GroupsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  /** Loads a group the organizer owns, or 404 (never 403, so ids are not probeable). */
  async owned(organizerId: string, groupId: string) {
    const group = await this.prisma.chitGroup.findFirst({
      where: { id: groupId, organizerId },
      include: { months: { orderBy: { monthNumber: 'asc' } } },
    });
    if (!group) {
      throw notFound();
    }
    return group;
  }

  async list(organizerId: string, query: z.output<typeof groupListQuerySchema>) {
    const where: Prisma.ChitGroupWhereInput = {
      organizerId,
      ...(query.status ? { status: query.status } : {}),
      ...(query.search
        ? { OR: [{ name: contains(query.search) }, { code: contains(query.search) }] }
        : {}),
    };
    const [groups, total] = await Promise.all([
      this.prisma.chitGroup.findMany({
        where,
        orderBy: [{ status: 'asc' }, { startDate: 'desc' }],
        include: {
          months: { orderBy: { monthNumber: 'desc' }, take: 1, select: { dueDate: true } },
          _count: { select: { tickets: true, payouts: true } },
        },
        ...paginationToSkipTake(query),
      }),
      this.prisma.chitGroup.count({ where }),
    ]);
    return toPaginated(
      groups.map(({ months, _count, ...group }) => ({
        ...group,
        endDate: months[0]?.dueDate ?? null,
        filledTickets: _count.tickets,
        payoutsDone: _count.payouts,
      })),
      total,
      query,
    );
  }

  async create(organizerId: string, input: z.output<typeof groupCreateSchema>) {
    const template = await this.prisma.chitPlanTemplate.findFirst({
      where: { id: input.templateId, organizerId, archivedAt: null },
      include: { months: { orderBy: { monthNumber: 'asc' } } },
    });
    if (!template) {
      throw notFound('Plan not found');
    }
    const clash = await this.prisma.chitGroup.findUnique({
      where: { organizerId_code: { organizerId, code: input.code } },
    });
    if (clash) {
      throw conflict('CODE_IN_USE', 'A scheme with this code already exists');
    }

    return this.prisma.$transaction(async (tx) => {
      const group = await tx.chitGroup.create({
        data: {
          organizerId,
          templateId: template.id,
          name: input.name,
          code: input.code,
          chitValue: template.chitValue,
          memberCount: template.memberCount,
          durationMonths: template.durationMonths,
          monthlyInstallment: template.monthlyInstallment,
          startDate: input.startDate,
          dueDayOfMonth: input.dueDayOfMonth,
          months: {
            create: template.months.map((month) => ({
              monthNumber: month.monthNumber,
              dueDate: dueDateFor(input.startDate, month.monthNumber - 1, input.dueDayOfMonth),
              payoutAmount: month.payoutAmount,
              isOrganizerMonth: month.isOrganizerMonth,
            })),
          },
        },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'GROUP_CREATED',
        entityType: 'ChitGroup',
        entityId: group.id,
        after: { ...input, templateName: template.name },
      });
      return group;
    });
  }

  async detail(organizerId: string, groupId: string) {
    const group = await this.owned(organizerId, groupId);
    const [payouts, ticketCount] = await Promise.all([
      this.prisma.payout.findMany({
        where: { groupId },
        include: {
          ticket: { select: { ticketNumber: true, member: memberSummary } },
          mode: { select: { name: true } },
        },
      }),
      this.prisma.ticket.count({ where: { groupId } }),
    ]);
    const payoutByMonth = new Map(payouts.map((payout) => [payout.monthNumber, payout]));
    const now = new Date();

    return {
      ...group,
      endDate: group.months.at(-1)?.dueDate ?? null,
      filledTickets: ticketCount,
      months: group.months.map((month) => {
        const payout = payoutByMonth.get(month.monthNumber);
        return {
          ...month,
          isPast: month.dueDate <= now,
          payout: payout
            ? {
                id: payout.id,
                amount: payout.amount,
                paidOn: payout.paidOn,
                ticketNumber: payout.ticket.ticketNumber,
                member: payout.ticket.member,
                modeName: payout.mode?.name ?? null,
                reference: payout.reference,
                note: payout.note,
              }
            : null,
        };
      }),
    };
  }

  async update(organizerId: string, groupId: string, input: z.output<typeof groupUpdateSchema>) {
    const group = await this.owned(organizerId, groupId);
    if (input.dueDayOfMonth !== undefined && group.status !== 'DRAFT') {
      throw rule('GROUP_STARTED', 'The due day is fixed once the scheme has started');
    }
    return this.prisma.$transaction(async (tx) => {
      const updated = await tx.chitGroup.update({
        where: { id: groupId },
        data: {
          ...(input.name ? { name: input.name } : {}),
          ...(input.dueDayOfMonth ? { dueDayOfMonth: input.dueDayOfMonth } : {}),
        },
      });
      if (input.dueDayOfMonth && input.dueDayOfMonth !== group.dueDayOfMonth) {
        // Move every month's due date to the new day of the month.
        for (const month of group.months) {
          await tx.chitGroupMonth.update({
            where: { id: month.id },
            data: {
              dueDate: dueDateFor(group.startDate, month.monthNumber - 1, input.dueDayOfMonth),
            },
          });
        }
      }
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'GROUP_UPDATED',
        entityType: 'ChitGroup',
        entityId: groupId,
        before: { name: group.name, dueDayOfMonth: group.dueDayOfMonth },
        after: input,
      });
      return updated;
    });
  }

  async updateMonth(
    organizerId: string,
    groupId: string,
    monthNumber: number,
    input: z.output<typeof groupMonthUpdateSchema>,
  ) {
    const group = await this.owned(organizerId, groupId);
    const month = group.months.find((m) => m.monthNumber === monthNumber);
    if (!month) {
      throw notFound('Month not found');
    }
    if (group.status !== 'DRAFT') {
      throw rule('GROUP_STARTED', 'The schedule is fixed once the scheme has started');
    }
    if (input.payoutAmount !== undefined) {
      const payout = await this.prisma.payout.findUnique({
        where: { groupId_monthNumber: { groupId, monthNumber } },
      });
      if (payout) {
        throw rule('PAYOUT_RECORDED', 'This month has been paid out; its amount cannot change');
      }
    }
    const updated = await this.prisma.chitGroupMonth.update({
      where: { id: month.id },
      data: input,
    });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: 'GROUP_MONTH_UPDATED',
      entityType: 'ChitGroupMonth',
      entityId: month.id,
      before: { dueDate: month.dueDate, payoutAmount: month.payoutAmount },
      after: input,
    });
    return updated;
  }

  async changeStatus(organizerId: string, groupId: string, status: GroupStatus) {
    const group = await this.owned(organizerId, groupId);
    if (!ALLOWED_TRANSITIONS[group.status].includes(status)) {
      throw rule(
        'INVALID_STATUS',
        `A ${group.status.toLowerCase()} scheme cannot become ${status.toLowerCase()}`,
      );
    }
    if (status === 'ACTIVE' && group.status === 'DRAFT') {
      const filled = await this.prisma.ticket.count({ where: { groupId } });
      if (filled < group.memberCount) {
        throw rule(
          'TICKETS_VACANT',
          `Assign all ${group.memberCount} tickets before starting (${filled} assigned)`,
        );
      }
    }
    const updated = await this.prisma.chitGroup.update({
      where: { id: groupId },
      data: {
        status,
        ...(status === 'ACTIVE' && !group.activatedAt ? { activatedAt: new Date() } : {}),
      },
    });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: 'GROUP_STATUS_CHANGED',
      entityType: 'ChitGroup',
      entityId: groupId,
      before: { status: group.status },
      after: { status },
    });
    return updated;
  }

  /** Every seat 1..memberCount, filled or vacant, with each filled ticket's dues. */
  async tickets(
    organizerId: string,
    groupId: string,
    query: z.output<typeof paginationQuerySchema>,
  ) {
    const group = await this.owned(organizerId, groupId);
    const { skip, take } = paginationToSkipTake(query);
    const numbers = Array.from({ length: group.memberCount }, (_, i) => i + 1).slice(
      skip,
      skip + take,
    );
    const tickets = await this.prisma.ticket.findMany({
      where: { groupId, ticketNumber: { in: numbers } },
      include: {
        member: memberSummary,
        payout: { select: { monthNumber: true, amount: true, paidOn: true } },
        holders: { orderBy: { createdAt: 'asc' }, include: { member: memberSummary } },
      },
    });
    const byNumber = new Map(tickets.map((ticket) => [ticket.ticketNumber, ticket]));
    const paid = await this.ledger.paidByTicket(tickets.map((t) => t.id));
    const now = new Date();

    const items = numbers.map((ticketNumber) => {
      const ticket = byNumber.get(ticketNumber);
      if (!ticket) {
        return { ticketNumber, ticket: null };
      }
      return {
        ticketNumber,
        ticket: {
          id: ticket.id,
          member: ticket.member,
          payout: ticket.payout,
          previousHolders: ticket.holders
            .filter((holder) => holder.leftAt)
            .map((holder) => ({
              member: holder.member,
              fromMonth: holder.fromMonth,
              leftAt: holder.leftAt,
              leftReason: holder.leftReason,
            })),
          ledger: this.ledger.summary(group, paid.get(ticket.id) ?? 0n, now),
        },
      };
    });
    return toPaginated(items, group.memberCount, query);
  }

  /** One ticket's month-by-month dues and payments. */
  async ticketDetail(organizerId: string, groupId: string, ticketId: string) {
    const group = await this.owned(organizerId, groupId);
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: ticketId, groupId },
      include: { member: memberSummary, payout: true },
    });
    if (!ticket) {
      throw notFound();
    }
    const paid = (await this.ledger.paidByTicket([ticket.id])).get(ticket.id) ?? 0n;
    return {
      id: ticket.id,
      ticketNumber: ticket.ticketNumber,
      member: ticket.member,
      payout: ticket.payout,
      group: { id: group.id, name: group.name, code: group.code, status: group.status },
      ledger: this.ledger.ledger(group, paid),
    };
  }

  async assignTicket(organizerId: string, groupId: string, ticketNumber: number, memberId: string) {
    const group = await this.owned(organizerId, groupId);
    if (ticketNumber < 1 || ticketNumber > group.memberCount) {
      throw notFound('Ticket not found');
    }
    if (group.status === 'COMPLETED' || group.status === 'CANCELLED') {
      throw rule('GROUP_CLOSED', 'This scheme is closed');
    }
    const member = await this.prisma.member.findFirst({ where: { id: memberId, organizerId } });
    if (!member) {
      throw notFound('Member not found');
    }
    const existing = await this.prisma.ticket.findUnique({
      where: { groupId_ticketNumber: { groupId, ticketNumber } },
    });

    return this.prisma.$transaction(async (tx) => {
      if (existing) {
        // Before the scheme starts, a seat can simply be given to someone else.
        if (group.status !== 'DRAFT') {
          throw rule('TICKET_TAKEN', 'This ticket is taken. Use replace member instead');
        }
        const payments = await tx.paymentRecord.count({ where: { ticketId: existing.id } });
        if (payments > 0) {
          throw rule('TICKET_HAS_PAYMENTS', 'This ticket has payments. Use replace member instead');
        }
        await tx.ticketHolder.updateMany({
          where: { ticketId: existing.id, leftAt: null },
          data: { leftAt: new Date(), leftReason: 'Reassigned before the scheme started' },
        });
      }
      const ticket = existing
        ? await tx.ticket.update({ where: { id: existing.id }, data: { memberId } })
        : await tx.ticket.create({ data: { groupId, ticketNumber, memberId } });
      await tx.ticketHolder.create({ data: { ticketId: ticket.id, memberId, fromMonth: 1 } });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'TICKET_ASSIGNED',
        entityType: 'Ticket',
        entityId: ticket.id,
        after: { groupId, ticketNumber, memberId },
      });
      return ticket;
    });
  }

  /** A member leaves mid-scheme: the new member takes over the ticket and its dues. */
  async replaceMember(
    organizerId: string,
    groupId: string,
    ticketNumber: number,
    input: z.output<typeof ticketReplaceSchema>,
  ) {
    const group = await this.owned(organizerId, groupId);
    if (input.fromMonth > group.durationMonths) {
      throw rule('INVALID_MONTH', `Choose a month from 1 to ${group.durationMonths}`);
    }
    const ticket = await this.prisma.ticket.findUnique({
      where: { groupId_ticketNumber: { groupId, ticketNumber } },
    });
    if (!ticket) {
      throw notFound('Ticket not found');
    }
    if (ticket.memberId === input.memberId) {
      throw rule('SAME_MEMBER', 'Choose a different member');
    }
    const member = await this.prisma.member.findFirst({
      where: { id: input.memberId, organizerId },
    });
    if (!member) {
      throw notFound('Member not found');
    }
    return this.prisma.$transaction(async (tx) => {
      await tx.ticketHolder.updateMany({
        where: { ticketId: ticket.id, leftAt: null },
        data: { leftAt: new Date(), leftReason: input.reason },
      });
      await tx.ticketHolder.create({
        data: { ticketId: ticket.id, memberId: input.memberId, fromMonth: input.fromMonth },
      });
      const updated = await tx.ticket.update({
        where: { id: ticket.id },
        data: { memberId: input.memberId },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'TICKET_MEMBER_REPLACED',
        entityType: 'Ticket',
        entityId: ticket.id,
        before: { memberId: ticket.memberId },
        after: { memberId: input.memberId, fromMonth: input.fromMonth, reason: input.reason },
      });
      return updated;
    });
  }

  /**
   * Who has paid what for one month. Payments settle the oldest dues first, so
   * a month counts as paid once everything up to it is covered.
   */
  async monthCollection(
    organizerId: string,
    groupId: string,
    monthNumber: number,
    query: z.output<typeof paginationQuerySchema>,
  ) {
    const group = await this.owned(organizerId, groupId);
    const month = group.months.find((m) => m.monthNumber === monthNumber);
    if (!month) {
      throw notFound('Month not found');
    }
    const [tickets, total] = await Promise.all([
      this.prisma.ticket.findMany({
        where: { groupId },
        orderBy: { ticketNumber: 'asc' },
        include: { member: memberSummary },
        ...paginationToSkipTake(query),
      }),
      this.prisma.ticket.count({ where: { groupId } }),
    ]);
    const paid = await this.ledger.paidByTicket(tickets.map((t) => t.id));
    const now = new Date();
    const items = tickets.map((ticket) => {
      const ledger = this.ledger.ledger(group, paid.get(ticket.id) ?? 0n, now);
      const row = ledger.rows.find((r) => r.monthNumber === monthNumber);
      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        member: ticket.member,
        month: row,
        outstanding: ledger.outstanding,
        advance: ledger.advance,
      };
    });
    return { month, ...toPaginated(items, total, query) };
  }

  async recordPayout(
    organizerId: string,
    groupId: string,
    input: z.output<typeof payoutCreateSchema>,
  ) {
    const group = await this.owned(organizerId, groupId);
    if (group.status !== 'ACTIVE') {
      throw rule('GROUP_NOT_ACTIVE', 'Payouts can be recorded only for a running scheme');
    }
    const month = group.months.find((m) => m.monthNumber === input.monthNumber);
    if (!month) {
      throw notFound('Month not found');
    }
    if (month.isOrganizerMonth) {
      throw rule('ORGANIZER_MONTH', "This month's collection is the organizer's commission");
    }
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: input.ticketId, groupId },
      include: { payout: true },
    });
    if (!ticket) {
      throw notFound('Ticket not found');
    }
    if (ticket.payout) {
      throw conflict('TICKET_ALREADY_PAID_OUT', 'This ticket has already received its payout');
    }
    const existing = await this.prisma.payout.findUnique({
      where: { groupId_monthNumber: { groupId, monthNumber: input.monthNumber } },
    });
    if (existing) {
      throw conflict('MONTH_ALREADY_PAID_OUT', 'This month has already been paid out');
    }
    if (input.modeId) {
      const mode = await this.prisma.paymentModeMaster.findFirst({
        where: { id: input.modeId, organizerId },
      });
      if (!mode) {
        throw notFound('Payment mode not found');
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const payout = await tx.payout.create({
        data: {
          groupId,
          monthNumber: input.monthNumber,
          ticketId: ticket.id,
          amount: input.amount,
          paidOn: input.paidOn,
          modeId: input.modeId ?? null,
          reference: input.reference,
          note: input.note,
          recordedById: organizerId,
        },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'PAYOUT_RECORDED',
        entityType: 'Payout',
        entityId: payout.id,
        before: { scheduledAmount: month.payoutAmount },
        after: payout,
      });
      return payout;
    });
  }
}

@ApiTags('groups')
@ManagerOnly()
@Controller('groups')
export class GroupsController {
  constructor(private readonly groups: GroupsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: GroupListDto) {
    return this.groups.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: GroupCreateDto) {
    return this.groups.create(user.id, body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.groups.detail(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GroupUpdateDto,
  ) {
    return this.groups.update(user.id, id, body);
  }

  @Post(':id/status')
  @HttpCode(200)
  status(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: GroupStatusDto,
  ) {
    return this.groups.changeStatus(user.id, id, body.status);
  }

  @Patch(':id/months/:month')
  updateMonth(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('month', ParseIntPipe) month: number,
    @Body() body: GroupMonthUpdateDto,
  ) {
    return this.groups.updateMonth(user.id, id, month, body);
  }

  @Get(':id/months/:month/collection')
  monthCollection(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('month', ParseIntPipe) month: number,
    @Query() query: PageDto,
  ) {
    return this.groups.monthCollection(user.id, id, month, query);
  }

  @Get(':id/tickets')
  tickets(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Query() query: PageDto,
  ) {
    return this.groups.tickets(user.id, id, query);
  }

  @Get(':id/tickets/:ticketId')
  ticketDetail(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('ticketId', ParseUUIDPipe) ticketId: string,
  ) {
    return this.groups.ticketDetail(user.id, id, ticketId);
  }

  @Put(':id/tickets/:number')
  assign(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('number', ParseIntPipe) ticketNumber: number,
    @Body() body: TicketAssignDto,
  ) {
    return this.groups.assignTicket(user.id, id, ticketNumber, body.memberId);
  }

  @Post(':id/tickets/:number/replace')
  @HttpCode(200)
  replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Param('number', ParseIntPipe) ticketNumber: number,
    @Body() body: TicketReplaceDto,
  ) {
    return this.groups.replaceMember(user.id, id, ticketNumber, body);
  }

  @Post(':id/payouts')
  payout(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PayoutDto,
  ) {
    return this.groups.recordPayout(user.id, id, body);
  }
}
