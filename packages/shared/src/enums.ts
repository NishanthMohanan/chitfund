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

export const PaymentMode = {
  CASH: 'CASH',
  UPI: 'UPI',
  BANK_TRANSFER: 'BANK_TRANSFER',
} as const;
export type PaymentMode = (typeof PaymentMode)[keyof typeof PaymentMode];

export const InstallmentStatus = {
  DUE: 'DUE',
  PAID: 'PAID',
  OVERDUE: 'OVERDUE',
  REVERSED: 'REVERSED',
} as const;
export type InstallmentStatus = (typeof InstallmentStatus)[keyof typeof InstallmentStatus];

export const GroupStatus = {
  DRAFT: 'DRAFT',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
  CANCELLED: 'CANCELLED',
} as const;
export type GroupStatus = (typeof GroupStatus)[keyof typeof GroupStatus];
