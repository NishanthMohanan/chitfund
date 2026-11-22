import { z } from 'zod';
import { paiseFromString } from './money';
import { normalizeIndianPhone } from './phone';

export const PASSWORD_MIN_LENGTH = 10;
export const PASSWORD_MAX_LENGTH = 128;
export const PAGE_SIZE_DEFAULT = 20;
export const PAGE_SIZE_MAX = 100;

/** Accepts any common way of typing an Indian mobile and outputs E.164. */
export const phoneSchema = z
  .string()
  .trim()
  .transform((value, ctx) => {
    const normalized = normalizeIndianPhone(value);
    if (!normalized) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Enter a valid 10-digit mobile number',
      });
      return z.NEVER;
    }
    return normalized;
  });

export const passwordSchema = z
  .string()
  .min(PASSWORD_MIN_LENGTH, `Use at least ${PASSWORD_MIN_LENGTH} characters`)
  .max(PASSWORD_MAX_LENGTH, `Use at most ${PASSWORD_MAX_LENGTH} characters`);

export const idSchema = z.string().uuid('Invalid identifier');

/** Paise as a decimal integer string on the wire, a bigint in code. */
export const paiseSchema = z
  .string()
  .regex(/^\d+$/, 'Invalid amount')
  .transform((value) => paiseFromString(value));

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(PAGE_SIZE_MAX).default(PAGE_SIZE_DEFAULT),
});

export type PaginationQuery = z.infer<typeof paginationQuerySchema>;

export type Paginated<T> = {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export function paginatedSchema<T extends z.ZodTypeAny>(item: T) {
  return z.object({
    items: z.array(item),
    total: z.number().int().min(0),
    page: z.number().int().min(1),
    pageSize: z.number().int().min(1),
    totalPages: z.number().int().min(0),
  });
}

export function toPaginated<T>(items: T[], total: number, query: PaginationQuery): Paginated<T> {
  return {
    items,
    total,
    page: query.page,
    pageSize: query.pageSize,
    totalPages: Math.ceil(total / query.pageSize),
  };
}

export function paginationToSkipTake(query: PaginationQuery): { skip: number; take: number } {
  return { skip: (query.page - 1) * query.pageSize, take: query.pageSize };
}
