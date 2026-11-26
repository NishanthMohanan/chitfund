import {
  type CanActivate,
  type ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { type Request } from 'express';
import { type AuthenticatedRequest } from '../../common/auth/authenticated-user';
import { AuthService } from './auth.service';
import { SESSION_COOKIE } from './session-token';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_HEADER = 'x-requested-with';

/**
 * Runs before RolesGuard. Attaches `request.user` from the session cookie and
 * rejects state-changing requests without the custom header, which other
 * origins cannot send without a CORS preflight the API refuses.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly auth: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request & AuthenticatedRequest>();

    if (!SAFE_METHODS.has(request.method) && !request.headers[CSRF_HEADER]) {
      throw new ForbiddenException({ code: 'CSRF_REJECTED', message: 'Request was rejected' });
    }

    const cookies = request.cookies as Record<string, string | undefined> | undefined;
    const token = cookies?.[SESSION_COOKIE];
    if (token) {
      const user = await this.auth.authenticate(token);
      if (user) {
        request.user = user;
      }
    }
    return true;
  }
}
