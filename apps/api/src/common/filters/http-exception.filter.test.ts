import {
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  PayloadTooLargeException,
  UnauthorizedException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { describe, expect, it } from 'vitest';
import { toErrorBody } from './http-exception.filter';

function prismaError(code: string) {
  return new Prisma.PrismaClientKnownRequestError('database detail', {
    code,
    clientVersion: 'test',
  });
}

describe('toErrorBody', () => {
  it('uses plain default messages for framework exceptions', () => {
    expect(toErrorBody(new UnauthorizedException())).toEqual({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Sign in to continue',
    });
    expect(toErrorBody(new ForbiddenException())).toMatchObject({
      statusCode: 403,
      code: 'FORBIDDEN',
    });
    expect(toErrorBody(new PayloadTooLargeException())).toMatchObject({ statusCode: 413 });
  });

  it('keeps explicit codes, messages and field errors', () => {
    const exception = new BadRequestException({
      code: 'VALIDATION_FAILED',
      message: 'Some fields need attention',
      fieldErrors: { phone: ['Enter a valid 10-digit mobile number'] },
    });
    expect(toErrorBody(exception)).toEqual({
      statusCode: 400,
      code: 'VALIDATION_FAILED',
      message: 'Some fields need attention',
      fieldErrors: { phone: ['Enter a valid 10-digit mobile number'] },
    });
  });

  it('falls back to the exception message for statuses without a default', () => {
    expect(toErrorBody(new NotFoundException()).message).toBe('Not found');
  });

  it('maps known database errors without exposing details', () => {
    expect(toErrorBody(prismaError('P2002'))).toEqual({
      statusCode: 409,
      code: 'CONFLICT',
      message: 'This conflicts with an existing record',
    });
    expect(toErrorBody(prismaError('P2025'))).toMatchObject({ statusCode: 404 });
  });

  it('maps exposed middleware client errors', () => {
    const tooLarge = Object.assign(new Error('request entity too large'), {
      status: 413,
      expose: true,
    });
    const malformed = Object.assign(new Error('Unexpected token'), { status: 400, expose: true });

    expect(toErrorBody(tooLarge)).toEqual({
      statusCode: 413,
      code: 'PAYLOAD_TOO_LARGE',
      message: 'The request is too large',
    });
    expect(toErrorBody(malformed)).toMatchObject({ statusCode: 400, code: 'BAD_REQUEST' });
  });

  it('maps exposed client errors without a default message', () => {
    const unsupported = Object.assign(new Error('unsupported charset'), {
      status: 415,
      expose: true,
    });
    expect(toErrorBody(unsupported)).toEqual({
      statusCode: 415,
      code: 'UNSUPPORTED_MEDIA_TYPE',
      message: 'The request could not be processed',
    });
  });

  it('hides unexpected errors behind a generic 500', () => {
    const hidden = Object.assign(new Error('internal'), { status: 500, expose: false });
    for (const error of [
      new Error('connection string leaked'),
      prismaError('P1001'),
      'oops',
      hidden,
    ]) {
      expect(toErrorBody(error)).toEqual({
        statusCode: 500,
        code: 'INTERNAL_SERVER_ERROR',
        message: 'Something went wrong',
      });
    }
  });
});
