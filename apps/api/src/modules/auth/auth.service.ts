import {
  HttpException,
  HttpStatus,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { type Role } from '@chitfund/shared';
import { type AuthenticatedUser } from '../../common/auth/authenticated-user';
import { writeAudit } from '../../common/audit/audit';
import { hashPassword, verifyPassword } from '../../common/security/password-hashing';
import { APP_CONFIG } from '../../config/config.module';
import { type Env } from '../../config/env';
import { PrismaService } from '../../prisma/prisma.service';
import { createSessionToken, hashSessionToken } from './session-token';

const MAX_FAILED_LOGINS = 5;
const LOCKOUT_MS = 15 * 60_000;
const SIGN_IN_ROLES: readonly Role[] = ['SUPERADMIN', 'ORGANIZER'];

export type LoginResult = {
  token: string;
  user: { id: string; name: string; role: Role };
};

type ClientInfo = { ip?: string; userAgent?: string };

@Injectable()
export class AuthService {
  /** Checked when the phone is unknown, so response timing does not reveal accounts. */
  private dummyHash: Promise<string> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(APP_CONFIG) private readonly config: Env,
  ) {}

  private idleMs(): number {
    return this.config.SESSION_IDLE_HOURS * 60 * 60_000;
  }

  async login(phone: string, password: string, client: ClientInfo): Promise<LoginResult> {
    const user = await this.prisma.user.findUnique({ where: { phone } });

    if (!user || !SIGN_IN_ROLES.includes(user.role)) {
      this.dummyHash ??= hashPassword('timing-equaliser-not-a-real-password');
      await verifyPassword(await this.dummyHash, password);
      throw new UnauthorizedException();
    }

    const now = new Date();
    if (user.lockedUntil && user.lockedUntil > now) {
      throw new HttpException(
        { code: 'ACCOUNT_LOCKED', message: 'Too many failed attempts. Try again in 15 minutes' },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    if (user.status === 'SUSPENDED') {
      throw new UnauthorizedException();
    }

    if (!(await verifyPassword(user.passwordHash, password))) {
      const failed = user.failedLoginCount + 1;
      const lock = failed >= MAX_FAILED_LOGINS;
      await this.prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginCount: lock ? 0 : failed,
          lockedUntil: lock ? new Date(now.getTime() + LOCKOUT_MS) : null,
        },
      });
      await writeAudit(this.prisma, {
        actorId: user.id,
        action: lock ? 'LOGIN_LOCKED' : 'LOGIN_FAILED',
        entityType: 'User',
        entityId: user.id,
      });
      throw new UnauthorizedException();
    }

    const token = createSessionToken();
    await this.prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: now },
      });
      const session = await tx.session.create({
        data: {
          userId: user.id,
          refreshTokenHash: hashSessionToken(token),
          familyId: user.id,
          ip: client.ip?.slice(0, 45) ?? null,
          userAgent: client.userAgent?.slice(0, 512) ?? null,
          lastUsedAt: now,
          expiresAt: new Date(now.getTime() + this.idleMs()),
        },
      });
      await writeAudit(tx, {
        actorId: user.id,
        action: 'LOGIN_SUCCEEDED',
        entityType: 'Session',
        entityId: session.id,
      });
    });

    return { token, user: { id: user.id, name: user.name, role: user.role } };
  }

  /** Resolves a cookie token to a user and slides the idle expiry forward. */
  async authenticate(token: string): Promise<AuthenticatedUser | null> {
    const session = await this.prisma.session.findUnique({
      where: { refreshTokenHash: hashSessionToken(token) },
      include: { user: { select: { id: true, role: true, status: true } } },
    });
    const now = new Date();
    if (
      !session ||
      session.revokedAt ||
      session.expiresAt <= now ||
      session.user.status === 'SUSPENDED' ||
      !SIGN_IN_ROLES.includes(session.user.role)
    ) {
      return null;
    }

    // Write at most once a minute to keep reads cheap.
    if (!session.lastUsedAt || now.getTime() - session.lastUsedAt.getTime() > 60_000) {
      await this.prisma.session.update({
        where: { id: session.id },
        data: { lastUsedAt: now, expiresAt: new Date(now.getTime() + this.idleMs()) },
      });
    }

    return { id: session.user.id, role: session.user.role, sessionId: session.id };
  }

  async logout(sessionId: string): Promise<void> {
    await this.prisma.session.updateMany({
      where: { id: sessionId, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  profile(userId: string) {
    return this.prisma.user.findUniqueOrThrow({
      where: { id: userId },
      select: { id: true, name: true, role: true, lastLoginAt: true },
    });
  }
}
