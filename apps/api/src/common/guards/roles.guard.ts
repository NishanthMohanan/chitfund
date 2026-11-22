import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { type Role } from '@chitfund/shared';
import { type AuthenticatedRequest } from '../auth/authenticated-user';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Default-deny authorisation. A route is reachable only if it is explicitly
 * marked @Public() or declares @Roles() that include the caller's role.
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const targets = [context.getHandler(), context.getClass()];

    if (this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, targets)) {
      return true;
    }

    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new UnauthorizedException();
    }

    const allowed = this.reflector.getAllAndOverride<Role[] | undefined>(ROLES_KEY, targets);
    if (!allowed?.includes(user.role)) {
      throw new ForbiddenException();
    }

    return true;
  }
}
