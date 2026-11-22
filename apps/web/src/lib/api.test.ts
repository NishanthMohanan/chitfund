import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { paiseSchema } from '@chitfund/shared';
import { ApiError, NetworkError, apiRequest } from './api';

function respond(status: number, body: unknown) {
  return vi.fn().mockResolvedValue(
    new Response(body === null ? null : JSON.stringify(body), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('apiRequest', () => {
  it('sends credentials and the CSRF header, and parses the response', async () => {
    const fetchMock = respond(200, { amount: '850000' });
    vi.stubGlobal('fetch', fetchMock);

    const result = await apiRequest('/groups/1', { schema: z.object({ amount: paiseSchema }) });

    expect(result).toEqual({ amount: 850_000n });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('/api/groups/1');
    expect(init.credentials).toBe('include');
    expect(init.headers).toMatchObject({ 'X-Requested-With': 'chitfund-web' });
  });

  it('serialises JSON bodies', async () => {
    const fetchMock = respond(201, { ok: true });
    vi.stubGlobal('fetch', fetchMock);

    await apiRequest('/things', {
      method: 'POST',
      body: { name: 'Kaveri 5' },
      schema: z.object({ ok: z.boolean() }),
    });

    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(init.body).toBe('{"name":"Kaveri 5"}');
    expect(init.headers).toMatchObject({ 'Content-Type': 'application/json' });
  });

  it('raises ApiError with field errors from the server', async () => {
    vi.stubGlobal(
      'fetch',
      respond(400, {
        statusCode: 400,
        code: 'VALIDATION_FAILED',
        message: 'Some fields need attention',
        fieldErrors: { phone: ['Enter a valid 10-digit mobile number'] },
      }),
    );

    const error = await apiRequest('/x', { schema: z.unknown() }).catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 400,
      code: 'VALIDATION_FAILED',
      fieldErrors: { phone: ['Enter a valid 10-digit mobile number'] },
    });
  });

  it('raises a generic ApiError when the body is not in the standard shape', async () => {
    vi.stubGlobal('fetch', respond(502, null));
    await expect(apiRequest('/x', { schema: z.unknown() })).rejects.toMatchObject({
      status: 502,
      message: 'Something went wrong',
    });
  });

  it('raises NetworkError when the request cannot be sent', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(apiRequest('/x', { schema: z.unknown() })).rejects.toBeInstanceOf(NetworkError);
  });
});
