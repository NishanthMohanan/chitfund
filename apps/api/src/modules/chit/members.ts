import {
  Body,
  Controller,
  Get,
  Injectable,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  memberInputSchema,
  paginationQuerySchema,
  paginationToSkipTake,
  toPaginated,
} from '@chitfund/shared';
import { type z } from 'zod';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { writeAudit } from '../../common/audit/audit';
import { createZodDto } from '../../common/validation/zod-dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ManagerOnly, conflict, contains, notFound } from './common';
import { LedgerService } from './ledger.service';

const memberListQuerySchema = paginationQuerySchema.merge(listQuerySchema);
class MemberDto extends createZodDto(memberInputSchema) {}
class MemberUpdateDto extends createZodDto(memberInputSchema.partial()) {}
class MemberListDto extends createZodDto(memberListQuerySchema) {}

type MemberInput = z.output<typeof memberInputSchema>;

@Injectable()
export class MembersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly ledger: LedgerService,
  ) {}

  async list(organizerId: string, query: z.output<typeof memberListQuerySchema>) {
    const where = {
      organizerId,
      ...(query.search
        ? {
            OR: [
              { name: contains(query.search) },
              { phone: { contains: query.search.replace(/\D/g, '') || query.search } },
            ],
          }
        : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.member.findMany({
        where,
        orderBy: { name: 'asc' },
        include: { _count: { select: { tickets: true } } },
        ...paginationToSkipTake(query),
      }),
      this.prisma.member.count({ where }),
    ]);
    return toPaginated(
      items.map(({ _count, ...member }) => ({ ...member, ticketCount: _count.tickets })),
      total,
      query,
    );
  }

  private async ensureUniquePhone(organizerId: string, phone: string, exceptId?: string) {
    const existing = await this.prisma.member.findUnique({
      where: { organizerId_phone: { organizerId, phone } },
    });
    if (existing && existing.id !== exceptId) {
      throw conflict('PHONE_IN_USE', 'A member with this mobile number already exists');
    }
  }

  async create(organizerId: string, input: MemberInput) {
    await this.ensureUniquePhone(organizerId, input.phone);
    const member = await this.prisma.member.create({ data: { organizerId, ...input } });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: 'MEMBER_CREATED',
      entityType: 'Member',
      entityId: member.id,
      after: { name: member.name },
    });
    return member;
  }

  async update(organizerId: string, id: string, input: Partial<MemberInput>) {
    const before = await this.prisma.member.findFirst({ where: { id, organizerId } });
    if (!before) {
      throw notFound();
    }
    if (input.phone) {
      await this.ensureUniquePhone(organizerId, input.phone, id);
    }
    const after = await this.prisma.member.update({ where: { id }, data: input });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: 'MEMBER_UPDATED',
      entityType: 'Member',
      entityId: id,
      before: { name: before.name },
      after: { name: after.name, fields: Object.keys(input) },
    });
    return after;
  }

  /** The member with every ticket they hold or held, and each ticket's dues. */
  async detail(organizerId: string, id: string) {
    const member = await this.prisma.member.findFirst({ where: { id, organizerId } });
    if (!member) {
      throw notFound();
    }
    const holdings = await this.prisma.ticketHolder.findMany({
      where: { memberId: id },
      orderBy: { createdAt: 'desc' },
      include: {
        ticket: {
          include: {
            payout: true,
            group: {
              include: { months: { select: { monthNumber: true, dueDate: true } } },
            },
          },
        },
      },
    });
    const paid = await this.ledger.paidByTicket(holdings.map((h) => h.ticketId));
    const now = new Date();

    const tickets = holdings.map((holding) => {
      const { ticket } = holding;
      const { group } = ticket;
      const current = ticket.memberId === id && !holding.leftAt;
      return {
        ticketId: ticket.id,
        ticketNumber: ticket.ticketNumber,
        current,
        fromMonth: holding.fromMonth,
        leftAt: holding.leftAt,
        leftReason: holding.leftReason,
        group: {
          id: group.id,
          name: group.name,
          code: group.code,
          status: group.status,
          monthlyInstallment: group.monthlyInstallment,
        },
        payout: ticket.payout
          ? {
              monthNumber: ticket.payout.monthNumber,
              amount: ticket.payout.amount,
              paidOn: ticket.payout.paidOn,
            }
          : null,
        ledger: this.ledger.summary(group, paid.get(ticket.id) ?? 0n, now),
      };
    });

    return { ...member, tickets };
  }
}

@ApiTags('members')
@ManagerOnly()
@Controller('members')
export class MembersController {
  constructor(private readonly members: MembersService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: MemberListDto) {
    return this.members.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: MemberDto) {
    return this.members.create(user.id, body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.members.detail(user.id, id);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: MemberUpdateDto,
  ) {
    return this.members.update(user.id, id, body);
  }
}
