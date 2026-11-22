import { type ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { type AuthenticatedUser } from '../auth/authenticated-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { RolesGuard } from './roles.guard';

function contextFor(metadata: Record<string, unknown>, user?: AuthenticatedUser): ExecutionContext {
  const handler = () => undefined;
  for (const [key, value] of Object.entries(metadata)) {
    Reflect.defineMetadata(key, value, handler);
  }

  return {
    getHandler: () => handler,
    getClass: () => Object,
    switchToHttp: () => ({ getRequest: () => ({ user }) }),
  } as unknown as ExecutionContext;
}

const organizer: AuthenticatedUser = { id: 'u1', role: 'ORGANIZER', sessionId: 's1' };
const guard = new RolesGuard(new Reflector());

describe('RolesGuard', () => {
  it('allows public routes without a user', () => {
    expect(guard.canActivate(contextFor({ [IS_PUBLIC_KEY]: true }))).toBe(true);
  });

  it('rejects unauthenticated requests with 401', () => {
    expect(() => guard.canActivate(contextFor({ [ROLES_KEY]: ['ORGANIZER'] }))).toThrow(
      UnauthorizedException,
    );
  });

  it('denies routes that declare no roles', () => {
    expect(() => guard.canActivate(contextFor({}, organizer))).toThrow(ForbiddenException);
  });

  it('denies roles that are not listed', () => {
    expect(() => guard.canActivate(contextFor({ [ROLES_KEY]: ['SUPERADMIN'] }, organizer))).toThrow(
      ForbiddenException,
    );
  });

  it('allows listed roles', () => {
    expect(
      guard.canActivate(contextFor({ [ROLES_KEY]: ['SUPERADMIN', 'ORGANIZER'] }, organizer)),
    ).toBe(true);
  });
});
