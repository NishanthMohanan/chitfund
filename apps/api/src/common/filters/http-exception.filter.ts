import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { type Response } from 'express';

export type ErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

const DEFAULT_MESSAGES: Partial<Record<number, string>> = {
  [HttpStatus.BAD_REQUEST]: 'The request could not be processed',
  [HttpStatus.UNAUTHORIZED]: 'Sign in to continue',
  [HttpStatus.FORBIDDEN]: 'You do not have access to this',
  [HttpStatus.NOT_FOUND]: 'Not found',
  [HttpStatus.CONFLICT]: 'This conflicts with an existing record',
  [HttpStatus.PAYLOAD_TOO_LARGE]: 'The request is too large',
  [HttpStatus.TOO_MANY_REQUESTS]: 'Too many attempts. Try again later',
};

function codeFor(status: number): string {
  const name = HttpStatus[status];
  return typeof name === 'string' ? name : 'ERROR';
}

/** Normalises every error into one response shape and never leaks internals. */
export function toErrorBody(exception: unknown): ErrorBody {
  if (exception instanceof HttpException) {
    const statusCode = exception.getStatus();
    const response = exception.getResponse();
    const detail = typeof response === 'object' && response !== null ? response : {};
    const custom = detail as Partial<Pick<ErrorBody, 'code' | 'message' | 'fieldErrors'>>;

    return {
      statusCode,
      code: typeof custom.code === 'string' ? custom.code : codeFor(statusCode),
      message:
        typeof custom.message === 'string' && custom.code
          ? custom.message
          : (DEFAULT_MESSAGES[statusCode] ?? exception.message),
      ...(custom.fieldErrors ? { fieldErrors: custom.fieldErrors } : {}),
    };
  }

  if (exception instanceof Prisma.PrismaClientKnownRequestError) {
    if (exception.code === 'P2002') {
      return { statusCode: 409, code: 'CONFLICT', message: DEFAULT_MESSAGES[409] as string };
    }
    if (exception.code === 'P2025') {
      return { statusCode: 404, code: 'NOT_FOUND', message: DEFAULT_MESSAGES[404] as string };
    }
  }

  if (isClientHttpError(exception)) {
    return {
      statusCode: exception.status,
      code: codeFor(exception.status),
      message: DEFAULT_MESSAGES[exception.status] ?? 'The request could not be processed',
    };
  }

  return { statusCode: 500, code: 'INTERNAL_SERVER_ERROR', message: 'Something went wrong' };
}

/** Errors raised by Express middleware such as body-parser (malformed JSON, oversize body). */
function isClientHttpError(value: unknown): value is { status: number } {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const { status, expose } = value as { status?: unknown; expose?: unknown };
  return typeof status === 'number' && status >= 400 && status < 500 && expose === true;
}

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const body = toErrorBody(exception);

    if (body.statusCode >= 500) {
      this.logger.error(exception instanceof Error ? exception : { exception });
    }

    host.switchToHttp().getResponse<Response>().status(body.statusCode).json(body);
  }
}
