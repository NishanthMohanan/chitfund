/**
 * Creates a superadmin account. Run on a trusted machine with direct database
 * access: `pnpm --filter @chitfund/api superadmin:create`. Superadmins can never
 * be created through the API.
 */
import { stdin, stdout } from 'node:process';
import { createInterface } from 'node:readline/promises';
import { maskPhone, passwordSchema, phoneSchema } from '@chitfund/shared';
import { PrismaClient } from '@prisma/client';
import { z } from 'zod';
import { hashPassword } from '../common/security/password-hashing';

const inputSchema = z.object({
  name: z.string().trim().min(2, 'Enter the full name').max(120),
  phone: phoneSchema,
  email: z
    .string()
    .trim()
    .email('Enter a valid email address')
    .optional()
    .or(z.literal('').transform(() => undefined)),
  password: passwordSchema,
});

function write(line: string): void {
  stdout.write(`${line}\n`);
}

/** Reads a line without echoing it when attached to a terminal. */
async function askHidden(question: string): Promise<string> {
  if (!stdin.isTTY) {
    const rl = createInterface({ input: stdin });
    const answer = await rl.question('');
    rl.close();
    return answer;
  }

  stdout.write(question);
  stdin.setRawMode(true);
  stdin.resume();
  stdin.setEncoding('utf8');

  return new Promise((resolve, reject) => {
    let value = '';
    const onData = (chunk: string) => {
      for (const char of chunk) {
        if (char === '\u0003') {
          cleanup();
          reject(new Error('Cancelled'));
          return;
        }
        if (char === '\r' || char === '\n') {
          cleanup();
          stdout.write('\n');
          resolve(value);
          return;
        }
        value = char === '\u007f' || char === '\b' ? value.slice(0, -1) : value + char;
      }
    };
    const cleanup = () => {
      stdin.off('data', onData);
      stdin.setRawMode(false);
      stdin.pause();
    };
    stdin.on('data', onData);
  });
}

async function promptForInput(): Promise<z.infer<typeof inputSchema>> {
  const rl = createInterface({ input: stdin, output: stdout });
  const name = await rl.question('Full name: ');
  const phone = await rl.question('Mobile number: ');
  const email = await rl.question('Email (optional): ');
  rl.close();

  const password = await askHidden('Password (min 10 characters): ');
  const confirmation = await askHidden('Confirm password: ');
  if (password !== confirmation) {
    throw new Error('Passwords do not match');
  }

  const parsed = inputSchema.safeParse({ name, phone, email, password });
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join('; '));
  }
  return parsed.data;
}

async function main(): Promise<void> {
  const input = await promptForInput();
  const prisma = new PrismaClient();

  try {
    const existing = await prisma.user.findUnique({ where: { phone: input.phone } });
    if (existing) {
      throw new Error('An account with this mobile number already exists');
    }

    const passwordHash = await hashPassword(input.password);
    const user = await prisma.$transaction(async (tx) => {
      const created = await tx.user.create({
        data: {
          role: 'SUPERADMIN',
          name: input.name,
          phone: input.phone,
          email: input.email ?? null,
          passwordHash,
          passwordChangedAt: new Date(),
        },
        select: { id: true, name: true, role: true },
      });

      await tx.auditLog.create({
        data: {
          action: 'SUPERADMIN_CREATED',
          entityType: 'User',
          entityId: created.id,
          after: { role: created.role, name: created.name, phone: maskPhone(input.phone) },
          userAgent: 'cli:create-superadmin',
        },
      });

      return created;
    });

    write(`Superadmin created for ${maskPhone(input.phone)} (id ${user.id}).`);
    write('Two-factor setup will be required at first sign-in.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  stdout.write(
    `Could not create superadmin: ${error instanceof Error ? error.message : 'unknown error'}\n`,
  );
  process.exitCode = 1;
});
