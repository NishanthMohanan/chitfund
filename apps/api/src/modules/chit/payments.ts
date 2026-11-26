import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  formatINR,
  paginationQuerySchema,
  paginationToSkipTake,
  paymentCreateSchema,
  paymentListQuerySchema,
  paymentReverseSchema,
  toPaginated,
} from '@chitfund/shared';
import { type Prisma } from '@prisma/client';
import { type z } from 'zod';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { writeAudit } from '../../common/audit/audit';
import { createZodDto } from '../../common/validation/zod-dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ManagerOnly, conflict, notFound, rule } from './common';
import { LedgerService } from './ledger.service';

const listSchema = paginationQuerySchema.merge(paymentListQuerySchema);
class PaymentDto extends createZodDto(paymentCreateSchema) {}
class PaymentReverseDto extends createZodDto(paymentReverseSchema) {}
class PaymentListDto extends createZodDto(listSchema) {}

@Injectable()
export class PaymentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async list(organizerId: string, query: z.output<typeof listSchema>) {
    const where: Prisma.PaymentRecordWhereInput = {
      ticket: { group: { organizerId, ...(query.groupId ? { id: query.groupId } : {}) } },
      ...(query.ticketId ? { ticketId: query.ticketId } : {}),
      ...(query.memberId ? { payerMemberId: query.memberId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.paymentRecord.findMany({
        where,
        orderBy: [{ paidOn: 'desc' }, { markedAt: 'desc' }],
        include: {
          mode: { select: { id: true, name: true } },
          payer: { select: { id: true, name: true } },
          ticket: {
            select: {
              id: true,
              ticketNumber: true,
              group: { select: { id: true, name: true, code: true } },
            },
          },
        },
        ...paginationToSkipTake(query),
      }),
      this.prisma.paymentRecord.count({ where }),
    ]);
    return toPaginated(items, total, query);
  }

  async create(organizerId: string, input: z.output<typeof paymentCreateSchema>) {
    const ticket = await this.prisma.ticket.findFirst({
      where: { id: input.ticketId, group: { organizerId } },
      include: { group: { include: { months: { select: { monthNumber: true, dueDate: true } } } } },
    });
    if (!ticket) {
      throw notFound('Ticket not found');
    }
    if (ticket.group.status === 'DRAFT' || ticket.group.status === 'CANCELLED') {
      throw rule('GROUP_NOT_ACTIVE', 'Start the scheme before recording payments');
    }
    const mode = await this.prisma.paymentModeMaster.findFirst({
      where: { id: input.modeId, organizerId, isActive: true },
    });
    if (!mode) {
      throw notFound('Payment mode not found');
    }

    const paid = (await this.ledger.paidByTicket([ticket.id])).get(ticket.id) ?? 0n;
    const { remainingForPlan } = this.ledger.summary(ticket.group, paid);
    if (input.amount > remainingForPlan) {
      throw rule(
        'AMOUNT_EXCEEDS_PLAN',
        `Only ${formatINR(remainingForPlan)} is left to pay for this ticket`,
      );
    }

    return this.prisma.$transaction(async (tx) => {
      const payment = await tx.paymentRecord.create({
        data: {
          ticketId: ticket.id,
          payerMemberId: ticket.memberId,
          amount: input.amount,
          modeId: mode.id,
          reference: input.reference,
          note: input.note,
          paidOn: input.paidOn,
          markedById: organizerId,
        },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'PAYMENT_RECORDED',
        entityType: 'PaymentRecord',
        entityId: payment.id,
        after: payment,
      });
      return payment;
    });
  }

  async reverse(organizerId: string, id: string, reason: string) {
    const payment = await this.prisma.paymentRecord.findFirst({
      where: { id, ticket: { group: { organizerId } } },
    });
    if (!payment) {
      throw notFound();
    }
    if (payment.reversedAt) {
      throw conflict('ALREADY_REVERSED', 'This payment has already been reversed');
    }
    return this.prisma.$transaction(async (tx) => {
      const reversed = await tx.paymentRecord.update({
        where: { id },
        data: { reversedAt: new Date(), reversedById: organizerId, reversalReason: reason },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'PAYMENT_REVERSED',
        entityType: 'PaymentRecord',
        entityId: id,
        before: { amount: payment.amount },
        after: { reason },
      });
      return reversed;
    });
  }
}

@ApiTags('payments')
@ManagerOnly()
@Controller('payments')
export class PaymentsController {
  constructor(private readonly payments: PaymentsService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PaymentListDto) {
    return this.payments.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: PaymentDto) {
    return this.payments.create(user.id, body);
  }

  @Post(':id/reverse')
  @HttpCode(200)
  reverse(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PaymentReverseDto,
  ) {
    return this.payments.reverse(user.id, id, body.reason);
  }
}
