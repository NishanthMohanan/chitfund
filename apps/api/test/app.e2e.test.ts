import { Body, Controller, Get, Post } from '@nestjs/common';
import { type NestExpressApplication } from '@nestjs/platform-express';
import { paiseSchema, phoneSchema } from '@chitfund/shared';
import request from 'supertest';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { z } from 'zod';
import { Public } from '../src/common/decorators/public.decorator';
import { Roles } from '../src/common/decorators/roles.decorator';
import { createZodDto } from '../src/common/validation/zod-dto';
import { createTestApp } from './create-test-app';

class EchoDto extends createZodDto(z.object({ phone: phoneSchema, amount: paiseSchema })) {}

@Controller('test-probe')
class ProbeController {
  @Get('undeclared')
  undeclared() {
    return { reached: true };
  }

  @Roles('SUPERADMIN')
  @Get('admin')
  admin() {
    return { reached: true };
  }

  @Public()
  @Post('echo')
  echo(@Body() body: EchoDto) {
    return { phone: body.phone, amount: body.amount, doubled: body.amount * 2n };
  }
}

describe('application stack (e2e)', () => {
  let app: NestExpressApplication | undefined;

  const server = () => {
    if (!app) {
      throw new Error('Application failed to start');
    }
    return app.getHttpServer();
  };

  beforeAll(async () => {
    app = await createTestApp({ controllers: [ProbeController] });
  });

  afterAll(async () => {
    await app?.close();
  });

  it('reports healthy dependencies', async () => {
    const response = await request(server()).get('/api/health').expect(200);
    expect(response.body).toEqual({ status: 'ok', checks: { database: 'up', redis: 'up' } });
  });

  it('sends strict security headers', async () => {
    const response = await request(server()).get('/api/health');
    expect(response.headers['content-security-policy']).toContain("default-src 'none'");
    expect(response.headers['content-security-policy']).toContain("frame-ancestors 'none'");
    expect(response.headers['strict-transport-security']).toContain('max-age=31536000');
    expect(response.headers['x-frame-options']).toBe('DENY');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(response.headers['permissions-policy']).toContain('camera=()');
    expect(response.headers['cache-control']).toBe('no-store');
    expect(response.headers['x-powered-by']).toBeUndefined();
  });

  it('allows CORS only for the configured web origin', async () => {
    const webOrigin = process.env.WEB_ORIGIN?.split(',')[0]?.trim() ?? '';
    const allowed = await request(server()).get('/api/health').set('Origin', webOrigin);
    expect(allowed.headers['access-control-allow-origin']).toBe(webOrigin);
    expect(allowed.headers['access-control-allow-credentials']).toBe('true');

    const denied = await request(server())
      .get('/api/health')
      .set('Origin', 'https://attacker.example');
    expect(denied.headers['access-control-allow-origin']).not.toBe('https://attacker.example');
  });

  it('denies routes without a role declaration by default', async () => {
    const response = await request(server()).get('/api/test-probe/undeclared');
    expect(response.status).toBe(401);
    expect(response.body).toEqual({
      statusCode: 401,
      code: 'UNAUTHORIZED',
      message: 'Sign in to continue',
    });
  });

  it('rejects unauthenticated access to role-protected routes', async () => {
    await request(server()).get('/api/test-probe/admin').expect(401);
  });

  it('validates bodies with shared schemas and serialises money as strings', async () => {
    const response = await request(server())
      .post('/api/test-probe/echo')
      .send({ phone: '98765 43210', amount: '850000' })
      .expect(201);
    expect(response.body).toEqual({
      phone: '+919876543210',
      amount: '850000',
      doubled: '1700000',
    });
  });

  it('returns field errors for invalid bodies', async () => {
    const response = await request(server())
      .post('/api/test-probe/echo')
      .send({ phone: '123', amount: '85.5' })
      .expect(400);
    expect(response.body.code).toBe('VALIDATION_FAILED');
    expect(Object.keys(response.body.fieldErrors)).toEqual(['phone', 'amount']);
  });

  it('rejects oversized and malformed bodies with the standard error shape', async () => {
    const oversized = await request(server())
      .post('/api/test-probe/echo')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ phone: 'x'.repeat(200 * 1024), amount: '1' }));
    expect(oversized.status).toBe(413);
    expect(oversized.body).toMatchObject({ statusCode: 413, code: 'PAYLOAD_TOO_LARGE' });

    const malformed = await request(server())
      .post('/api/test-probe/echo')
      .set('Content-Type', 'application/json')
      .send('{"phone":');
    expect(malformed.status).toBe(400);
    expect(malformed.body.code).toBe('BAD_REQUEST');
  });

  it('returns 404 in the standard error shape for unknown routes', async () => {
    const response = await request(server()).get('/api/does-not-exist');
    expect(response.status).toBe(404);
    expect(response.body).toMatchObject({ statusCode: 404, code: 'NOT_FOUND' });
  });
});
