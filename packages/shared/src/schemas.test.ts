import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import {
  paginatedSchema,
  paginationQuerySchema,
  paginationToSkipTake,
  paiseSchema,
  passwordSchema,
  phoneSchema,
  toPaginated,
} from './schemas';

describe('phoneSchema', () => {
  it('normalises to E.164', () => {
    expect(phoneSchema.parse(' 98765 43210 ')).toBe('+919876543210');
  });

  it('reports a readable error', () => {
    const result = phoneSchema.safeParse('12345');
    expect(result.success).toBe(false);
    expect(result.error?.issues[0]?.message).toBe('Enter a valid 10-digit mobile number');
  });
});

describe('passwordSchema', () => {
  it('enforces length bounds', () => {
    expect(passwordSchema.safeParse('short').success).toBe(false);
    expect(passwordSchema.safeParse('long enough passphrase').success).toBe(true);
    expect(passwordSchema.safeParse('x'.repeat(129)).success).toBe(false);
  });
});

describe('paiseSchema', () => {
  it('parses integer strings into bigint', () => {
    expect(paiseSchema.parse('850000')).toBe(850_000n);
  });

  it('rejects decimals and negatives', () => {
    expect(paiseSchema.safeParse('85.5').success).toBe(false);
    expect(paiseSchema.safeParse('-1').success).toBe(false);
  });
});

describe('pagination', () => {
  it('coerces query strings and applies defaults', () => {
    expect(paginationQuerySchema.parse({})).toEqual({ page: 1, pageSize: 20 });
    expect(paginationQuerySchema.parse({ page: '3', pageSize: '50' })).toEqual({
      page: 3,
      pageSize: 50,
    });
  });

  it('caps the page size', () => {
    expect(paginationQuerySchema.safeParse({ pageSize: '500' }).success).toBe(false);
    expect(paginationQuerySchema.safeParse({ page: '0' }).success).toBe(false);
  });

  it('converts to skip and take', () => {
    expect(paginationToSkipTake({ page: 3, pageSize: 20 })).toEqual({ skip: 40, take: 20 });
  });

  it('builds a response that matches the schema', () => {
    const response = toPaginated(['a', 'b'], 41, { page: 1, pageSize: 20 });
    expect(response.totalPages).toBe(3);
    expect(paginatedSchema(z.string()).parse(response)).toEqual(response);
  });
});
