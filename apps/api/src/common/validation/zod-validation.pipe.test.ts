import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { phoneSchema } from '@chitfund/shared';
import { createZodDto } from './zod-dto';
import { ZodValidationPipe } from './zod-validation.pipe';

class ContactDto extends createZodDto(
  z.object({ phone: phoneSchema, name: z.string().min(2, 'Enter a name') }),
) {}

const pipe = new ZodValidationPipe();

describe('ZodValidationPipe', () => {
  it('returns the parsed output for DTO parameters', () => {
    expect(
      pipe.transform(
        { phone: '98765 43210', name: 'Asha' },
        { type: 'body', metatype: ContactDto },
      ),
    ).toEqual({ phone: '+919876543210', name: 'Asha' });
  });

  it('reports errors per field', () => {
    try {
      pipe.transform({ phone: '1', name: '' }, { type: 'body', metatype: ContactDto });
      expect.unreachable();
    } catch (error) {
      expect(error).toBeInstanceOf(BadRequestException);
      expect((error as BadRequestException).getResponse()).toEqual({
        code: 'VALIDATION_FAILED',
        message: 'Some fields need attention',
        fieldErrors: {
          phone: ['Enter a valid 10-digit mobile number'],
          name: ['Enter a name'],
        },
      });
    }
  });

  it('reports root-level errors', () => {
    expect(() => pipe.transform('not an object', { type: 'body', metatype: ContactDto })).toThrow(
      BadRequestException,
    );
  });

  it('passes through parameters without a schema', () => {
    expect(pipe.transform('raw', { type: 'param', metatype: String })).toBe('raw');
    expect(pipe.transform('raw', { type: 'query' })).toBe('raw');
  });

  it('skips custom decorators', () => {
    const user = { id: 'u1' };
    expect(pipe.transform(user, { type: 'custom', metatype: ContactDto })).toBe(user);
  });
});
