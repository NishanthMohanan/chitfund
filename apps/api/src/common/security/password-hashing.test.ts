import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password-hashing';

describe('password hashing', () => {
  it('produces Argon2id hashes with the required cost', async () => {
    const hash = await hashPassword('correct horse battery');
    expect(hash).toMatch(/^\$argon2id\$v=19\$m=19456,t=2,p=1\$/);
  });

  it('verifies only the original password', async () => {
    const hash = await hashPassword('correct horse battery');
    await expect(verifyPassword(hash, 'correct horse battery')).resolves.toBe(true);
    await expect(verifyPassword(hash, 'correct horse battery!')).resolves.toBe(false);
  });
});
