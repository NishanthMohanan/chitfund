import { type ExecutionContext, UnauthorizedException, createParamDecorator } from '@nestjs/common';
import { type AuthenticatedRequest, type AuthenticatedUser } from './authenticated-user';

/** The signed-in user. Ownership always comes from here, never from the request body. */
export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const user = context.switchToHttp().getRequest<AuthenticatedRequest>().user;
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  },
);
