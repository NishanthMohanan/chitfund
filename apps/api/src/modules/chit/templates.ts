import {
  Body,
  Controller,
  Get,
  HttpCode,
  Injectable,
  Param,
  ParseUUIDPipe,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import {
  listQuerySchema,
  paginationQuerySchema,
  paginationToSkipTake,
  templateInputSchema,
  toPaginated,
} from '@chitfund/shared';
import { z } from 'zod';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { CurrentUser } from '../../common/auth/current-user.decorator';
import { writeAudit } from '../../common/audit/audit';
import { createZodDto } from '../../common/validation/zod-dto';
import { PrismaService } from '../../prisma/prisma.service';
import { ManagerOnly, conflict, contains, notFound } from './common';

const templateListQuerySchema = paginationQuerySchema.merge(listQuerySchema).extend({
  includeArchived: z
    .enum(['true', 'false'])
    .default('false')
    .transform((value) => value === 'true'),
});
class TemplateDto extends createZodDto(templateInputSchema) {}
class TemplateListDto extends createZodDto(templateListQuerySchema) {}

type TemplateInput = z.output<typeof templateInputSchema>;

@Injectable()
export class TemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(organizerId: string, query: z.output<typeof templateListQuerySchema>) {
    const where = {
      organizerId,
      ...(query.includeArchived ? {} : { archivedAt: null }),
      ...(query.search ? { name: contains(query.search) } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.chitPlanTemplate.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { _count: { select: { groups: true } } },
        ...paginationToSkipTake(query),
      }),
      this.prisma.chitPlanTemplate.count({ where }),
    ]);
    return toPaginated(
      items.map(({ _count, ...template }) => ({ ...template, groupCount: _count.groups })),
      total,
      query,
    );
  }

  async detail(organizerId: string, id: string) {
    const template = await this.prisma.chitPlanTemplate.findFirst({
      where: { id, organizerId },
      include: { months: { orderBy: { monthNumber: 'asc' } } },
    });
    if (!template) {
      throw notFound();
    }
    return template;
  }

  private async ensureUniqueName(organizerId: string, name: string, exceptId?: string) {
    const existing = await this.prisma.chitPlanTemplate.findUnique({
      where: { organizerId_name: { organizerId, name } },
    });
    if (existing && existing.id !== exceptId) {
      throw conflict('NAME_IN_USE', 'A plan with this name already exists');
    }
  }

  async create(organizerId: string, input: TemplateInput) {
    await this.ensureUniqueName(organizerId, input.name);
    const { months, ...plan } = input;
    const template = await this.prisma.$transaction(async (tx) => {
      const created = await tx.chitPlanTemplate.create({
        data: { organizerId, ...plan, months: { create: months } },
        include: { months: { orderBy: { monthNumber: 'asc' } } },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'TEMPLATE_CREATED',
        entityType: 'ChitPlanTemplate',
        entityId: created.id,
        after: input,
      });
      return created;
    });
    return template;
  }

  /** Edits never reach existing groups: each group has its own schedule copy. */
  async replace(organizerId: string, id: string, input: TemplateInput) {
    const before = await this.detail(organizerId, id);
    await this.ensureUniqueName(organizerId, input.name, id);
    const { months, ...plan } = input;
    return this.prisma.$transaction(async (tx) => {
      await tx.chitPlanTemplateMonth.deleteMany({ where: { templateId: id } });
      const updated = await tx.chitPlanTemplate.update({
        where: { id },
        data: { ...plan, months: { create: months } },
        include: { months: { orderBy: { monthNumber: 'asc' } } },
      });
      await writeAudit(tx, {
        actorId: organizerId,
        action: 'TEMPLATE_UPDATED',
        entityType: 'ChitPlanTemplate',
        entityId: id,
        before,
        after: input,
      });
      return updated;
    });
  }

  async setArchived(organizerId: string, id: string, archived: boolean) {
    await this.detail(organizerId, id);
    const updated = await this.prisma.chitPlanTemplate.update({
      where: { id },
      data: { archivedAt: archived ? new Date() : null },
    });
    await writeAudit(this.prisma, {
      actorId: organizerId,
      action: archived ? 'TEMPLATE_ARCHIVED' : 'TEMPLATE_RESTORED',
      entityType: 'ChitPlanTemplate',
      entityId: id,
    });
    return updated;
  }
}

@ApiTags('templates')
@ManagerOnly()
@Controller('templates')
export class TemplatesController {
  constructor(private readonly templates: TemplatesService) {}

  @Get()
  list(@CurrentUser() user: AuthenticatedUser, @Query() query: TemplateListDto) {
    return this.templates.list(user.id, query);
  }

  @Post()
  create(@CurrentUser() user: AuthenticatedUser, @Body() body: TemplateDto) {
    return this.templates.create(user.id, body);
  }

  @Get(':id')
  detail(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.detail(user.id, id);
  }

  @Put(':id')
  replace(
    @CurrentUser() user: AuthenticatedUser,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: TemplateDto,
  ) {
    return this.templates.replace(user.id, id, body);
  }

  @Post(':id/archive')
  @HttpCode(200)
  archive(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.setArchived(user.id, id, true);
  }

  @Post(':id/restore')
  @HttpCode(200)
  restore(@CurrentUser() user: AuthenticatedUser, @Param('id', ParseUUIDPipe) id: string) {
    return this.templates.setArchived(user.id, id, false);
  }
}
