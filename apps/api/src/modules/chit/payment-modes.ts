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
  type PaginationQuery,
  paginationQuerySchema,
  paginationToSkipTake,
  paymentModeInputSchema,
  toPaginated,
} from '@chitfund/shared';
import { type z } from 'zod';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { writeAudit } from '../../common/audit/audit';
import { createZodDto } from '../../common/validation/zod-dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ManagerOnly, notFound } from './common';

class PaymentModeDto extends createZodDto(paymentModeInputSchema) {}
class PaymentModeUpdateDto extends createZodDto(paymentModeInputSchema.partial()) {}
class PageDto extends createZodDto(paginationQuerySchema) {}

export const DEFAULT_PAYMENT_MODES = ['Cash', 'UPI', 'Bank transfer'] as const;

@Injectable()
export class PaymentModesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizerId: string, query: PaginationQuery) {
    const where = { organizerId };
    const [items, total] = await Promise.all([
      this.prisma.paymentModeMaster.findMany({
        where,
        orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
        ...paginationToSkipTake(query),
      }),
      this.prisma.paymentModeMaster.count({ where }),
    ]);
    return toPaginated(items, total, query);
  }

  async create(organizerId: string, input: z.output<typeof paymentModeInputSchema>) {
    const mode = await this.prisma.paymentModeMaster.create({ data: { organizerId, ...input } });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: 'PAYMENT_MODE_CREATED',
      entityType: 'PaymentMode',
      entityId: mode.id,
      after: mode,
    });
    return mode;
  }

  async update(
    organizerId: string,
    id: string,
    input: Partial<z.output<typeof paymentModeInputSchema>>,
  ) {
    const before = await this.prisma.paymentModeMaster.findFirst({ where: { id, organizerId } });
    if (!before) {
      throw notFound();
    }
    const after = await this.prisma.paymentModeMaster.update({ where: { id }, data: input });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: 'PAYMENT_MODE_UPDATED',
      entityType: 'PaymentMode',
      entityId: id,
      before,
      after,
    });
    return after;
  }

  /** Seeds Cash, UPI and Bank transfer the first time an organizer exists. */
  async ensureDefaults(organizerId: string): Promise<void> {
    if ((await this.prisma.paymentModeMaster.count({ where: { organizerId } })) > 0) {
      return;
    }
    await this.prisma.paymentModeMaster.createMany({
      data: DEFAULT_PAYMENT_MODES.map((name, index) => ({ organizerId, name, sortOrder: index })),
    });
  }
}

@ApiTags('payment-modes')
@ManagerOnly()
@Controller('payment-modes')
export class PaymentModesController {
  constructor(private readonly modes: PaymentModesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: PageDto) {
    return this.modes.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: PaymentModeDto) {
    return this.modes.create(user.id, body);
  }

  @Patch(':id')
  update(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: PaymentModeUpdateDto,
  ) {
    return this.modes.update(user.id, id, body);
  }
}
