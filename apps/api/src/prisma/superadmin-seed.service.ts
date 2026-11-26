import { Inject, Injectable, Logger, type OnApplicationBootstrap } from '@nestjs/common';
import { maskPhone, passwordSchema, phoneSchema } from '@chitfund/shared';
import { z } from 'zod';
import { hashPassword, verifyPassword } from '../common/security/password-hashing';
import { APP_CONFIG } from '../config/config.module';
import { type Env } from '../config/env';
import { PaymentModesService } from '../modules/chit/payment-modes';
import { PrismaService } from './prisma.service';

const seedSchema = z.object({
  name: z.string().trim().min(2, 'SUPERADMIN_NAME: enter the full name').max(120),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .email('SUPERADMIN_EMAIL: enter a valid email address')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: passwordSchema,
});

/**
 * Creates or replaces the superadmin from the SUPERADMIN_* variables at startup
 * when SUPERADMIN_SEED_ON_START=true. With the flag off it does nothing, so the
 * stored superadmin keeps its existing mobile number and password.
 */
@Injectable()
export class SuperadminSeedService implements OnApplicationBootstrap {
  private readonly logger = new Logger(SuperadminSeedService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentModes: PaymentModesService,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  async onApplicationBootstrap(): Promise<void> {
    await this.seedSuperadmin();
    // Masters every organizer starts with: Cash, UPI and Bank transfer.
    const managers = await this.prisma.user.findMany({
      where: { role: { in: ['SUPERADMIN', 'ORGANIZER'] } },
      select: { id: true },
    });
    for (const manager of managers) {
      await this.paymentModes.ensureDefaults(manager.id);
    }
  }

  private async seedSuperadmin(): Promise<void> {
    if (!this.config.SUPERADMIN_SEED_ON_START) {
      this.logger.log('SUPERADMIN_SEED_ON_START is off; superadmin left unchanged');
      return;
    }

    const parsed = seedSchema.safeParse({
      name: this.config.SUPERADMIN_NAME,
      phone: this.config.SUPERADMIN_PHONE,
      email: this.config.SUPERADMIN_EMAIL,
      password: this.config.SUPERADMIN_PASSWORD,
    });
    if (!parsed.success) {
      // Messages only, never the values: the password is a secret.
      const problems = parsed.error.issues
        .map((issue) => `${issue.path.join('.')}: ${issue.message}`)
        .join('; ');
      throw new Error(`Cannot seed superadmin, fix the SUPERADMIN_* variables. ${problems}`);
    }
    const input = parsed.data;

    const byPhone = await this.prisma.user.findUnique({ where: { phone: input.phone } });
    if (byPhone && byPhone.role !== 'SUPERADMIN') {
      throw new Error(
        `Cannot seed superadmin: ${maskPhone(input.phone)} already belongs to a ${byPhone.role} account`,
      );
    }

    // Replace the account with the configured number, otherwise the oldest superadmin.
    const target =
      byPhone ??
      (await this.prisma.user.findFirst({
        where: { role: 'SUPERADMIN' },
        orderBy: { createdAt: 'asc' },
      }));

    if (!target) {
      const passwordHash = await hashPassword(input.password);
      await this.prisma.$transaction(async (tx) => {
        const created = await tx.user.create({
          data: {
            role: 'SUPERADMIN',
            name: input.name,
            phone: input.phone,
            email: input.email ?? null,
            passwordHash,
            passwordChangedAt: new Date(),
          },
        });
        await tx.auditLog.create({
          data: {
            action: 'SUPERADMIN_CREATED',
            entityType: 'User',
            entityId: created.id,
            after: { role: created.role, name: created.name, phone: maskPhone(input.phone) },
            userAgent: 'startup:superadmin-seed',
          },
        });
      });
      this.logger.log(`Superadmin created for ${maskPhone(input.phone)}`);
      return;
    }

    const passwordMatches = await verifyPassword(target.passwordHash, input.password);
    const unchanged =
      passwordMatches &&
      target.phone === input.phone &&
      target.name === input.name &&
      target.email === (input.email ?? null) &&
      target.status === 'ACTIVE' &&
      target.lockedUntil === null;
    if (unchanged) {
      this.logger.log(`Superadmin ${maskPhone(input.phone)} already matches .env`);
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: target.id },
        data: {
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          status: 'ACTIVE',
          failedLoginCount: 0,
          lockedUntil: null,
          ...(passwordMatches
            ? {}
            : {
                passwordHash: await hashPassword(input.password),
                passwordChangedAt: new Date(),
                mustChangePassword: false,
              }),
        },
      });
      await tx.auditLog.create({
        data: {
          action: 'SUPERADMIN_REPLACED',
          entityType: 'User',
          entityId: target.id,
          before: { name: target.name, phone: maskPhone(target.phone) },
          after: {
            name: input.name,
            phone: maskPhone(input.phone),
            passwordReset: !passwordMatches,
          },
          userAgent: 'startup:superadmin-seed',
        },
      });
    });
    this.logger.log(`Superadmin replaced: now ${maskPhone(input.phone)}`);
  }
}
