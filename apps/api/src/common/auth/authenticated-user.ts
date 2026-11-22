import { type Role } from '@chitfund/shared';

/** The identity attached to `request.user` by the authentication layer. */
export type AuthenticatedUser = {
  id: string;
  role: Role;
  sessionId: string;
};

export type AuthenticatedRequest = {
  user?: AuthenticatedUser;
};
