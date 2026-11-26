/** Mirrors the Prisma enums so the web app never imports the Prisma client. */

export const Role = {
  SUPERADMIN: 'SUPERADMIN',
  ORGANIZER: 'ORGANIZER',
  MEMBER: 'MEMBER',
} as const;
export type Role = (typeof Role)[keyof typeof Role];

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  SUSPENDED: 'SUSPENDED',
  LOCKED: 'LOCKED',
} as const;
export type UserStatus = (typeof UserStatus)[keyof typeof UserStatus];

/** Computed per ticket and month from the ledger; never stored. */
export const DueStatus = {
  PAID: 'PAID',
  PARTIAL: 'PARTIAL',
  DUE: 'DUE',
  OVERDUE: 'OVERDUE',
  UPCOMING: 'UPCOMING',
  ADVANCE: 'ADVANCE',
} as const;
export type DueStatus = (typeof DueStatus)[keyof typeof DueStatus];

export const GroupStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type GroupStatus = (typeof GroupStatus)[keyof typeof GroupStatus];
