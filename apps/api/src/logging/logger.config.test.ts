import { Writable } from 'node:stream';
import pino from 'pino';
import { describe, expect, it } from 'vitest';
import { REDACTED_PATHS } from './logger.config';

function capture(): { lines: string[]; stream: Writable } {
  const lines: string[] = [];
  const stream = new Writable({
    write(chunk: Buffer, _encoding, callback) {
      lines.push(chunk.toString());
      callback();
    },
  });
  return { lines, stream };
}

describe('log redaction', () => {
  it('removes credentials and personal data at any supported depth', () => {
    const { lines, stream } = capture();
    const logger = pino({ redact: { paths: REDACTED_PATHS, censor: '[redacted]' } }, stream);

    logger.info({
      phone: '+919876543210',
      body: { password: 'hunter2hunter2', email: 'asha@example.com' },
      user: { profile: { phone: '+919876543211' } },
      req: { headers: { cookie: 'refresh=abc', authorization: 'Bearer xyz' } },
    });

    const output = lines.join('');
    for (const secret of ['+91987654321', 'hunter2', 'asha@example.com', 'refresh=abc', 'Bearer']) {
      expect(output).not.toContain(secret);
    }
    expect(output).toContain('[redacted]');
  });
});
