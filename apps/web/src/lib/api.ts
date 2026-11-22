import { type z } from 'zod';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

/**
 * Sent on every request. Browsers do not let other origins set custom headers
 * without a CORS preflight, which the API only grants to the web origin.
 */
const CSRF_HEADER = { 'X-Requested-With': 'chitfund-web' } as const;

export type ApiErrorBody = {
  statusCode: number;
  code: string;
  message: string;
  fieldErrors?: Record<string, string[]>;
};

export class ApiError extends Error {
  override readonly name = 'ApiError';
  readonly status: number;
  readonly code: string;
  readonly fieldErrors: Record<string, string[]>;

  constructor(body: ApiErrorBody) {
    super(body.message);
    this.status = body.statusCode;
    this.code = body.code;
    this.fieldErrors = body.fieldErrors ?? {};
  }
}

export class NetworkError extends Error {
  override readonly name = 'NetworkError';
}

type RequestOptions<S extends z.ZodTypeAny> = {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  /** Validates and transforms the response, e.g. paise strings into bigint. */
  schema: S;
  signal?: AbortSignal;
};

function isErrorBody(value: unknown): value is ApiErrorBody {
  return (
    typeof value === 'object' &&
    value !== null &&
    typeof (value as ApiErrorBody).statusCode === 'number' &&
    typeof (value as ApiErrorBody).message === 'string'
  );
}

export async function apiRequest<S extends z.ZodTypeAny>(
  path: string,
  { method = 'GET', body, schema, signal }: RequestOptions<S>,
): Promise<z.output<S>> {
  let response: Response;
  try {
    response = await fetch(`${API_BASE}${path}`, {
      method,
      credentials: 'include',
      cache: 'no-store',
      headers: {
        Accept: 'application/json',
        ...CSRF_HEADER,
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError('Could not reach the server');
  }

  const payload: unknown = response.status === 204 ? null : await response.json().catch(() => null);

  if (!response.ok) {
    throw new ApiError(
      isErrorBody(payload)
        ? payload
        : { statusCode: response.status, code: 'ERROR', message: 'Something went wrong' },
    );
  }

  return schema.parse(payload);
}
