import { PrismaClient } from '@prisma/client';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';

/**
 * Verifies the integrity guarantees added to the initial migration. Runs
 * against the migrated development or CI database.
 */
describe('database integrity (e2e)', () => {
  const prisma = new PrismaClient();
  let auditId: string;

  beforeAll(async () => {
    const entry = await prisma.auditLog.create({
      data: { action: 'TEST_PROBE', entityType: 'Test' },
    });
    auditId = entry.id;
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('generates UUIDv7 identifiers', () => {
    expect(auditId).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/,
    );
  });

  it('rejects updates to the audit log', async () => {
    await expect(
      prisma.auditLog.update({ where: { id: auditId }, data: { action: 'TAMPERED' } }),
    ).rejects.toThrow(/not permitted/);
  });

  it('rejects deletes from the audit log', async () => {
    await expect(prisma.auditLog.delete({ where: { id: auditId } })).rejects.toThrow(
      /not permitted/,
    );
  });

  it('enables row-level security on organizer-scoped tables', async () => {
    const rows = await prisma.$queryRaw<{ relname: string }[]>`
      SELECT relname FROM pg_class
      WHERE relrowsecurity AND relnamespace = 'public'::regnamespace
      ORDER BY relname`;
    expect(rows.map((row) => row.relname)).toEqual([
      'announcements',
      'chit_group_months',
      'chit_groups',
      'chit_plan_template_months',
      'chit_plan_templates',
      'installments',
      'payment_records',
      'payouts',
      'tickets',
    ]);
  });

  it('blocks hard deletes of financial records at the database level', async () => {
    const triggers = await prisma.$queryRaw<{ tgname: string }[]>`
      SELECT tgname FROM pg_trigger WHERE NOT tgisinternal ORDER BY tgname`;
    expect(triggers.map((row) => row.tgname)).toEqual(
      expect.arrayContaining([
        'installments_no_delete',
        'payment_records_no_delete',
        'payouts_no_delete',
      ]),
    );
  });
});
