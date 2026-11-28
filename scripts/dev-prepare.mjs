// Runs before `pnpm dev`: makes sure PostgreSQL is up and the schema is current.
// Reads .env through `node --env-file`. The superadmin is seeded by the API itself
// at startup when SUPERADMIN_SEED_ON_START=true.
import { execFileSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import net from 'node:net';
import path from 'node:path';

const fail = (message) => {
  process.stderr.write(`\n[dev-prepare] ${message}\n\n`);
  process.exit(1);
};
const log = (message) => process.stdout.write(`[dev-prepare] ${message}\n`);

if (!process.env.DATABASE_URL) fail('DATABASE_URL is not set in .env.');
const db = new URL(process.env.DATABASE_URL);
const host = db.hostname === 'localhost' ? '127.0.0.1' : db.hostname;
const port = Number(db.port || 5432);

const reachable = () =>
  new Promise((resolve) => {
    const socket = net.connect({ host, port, timeout: 1500 });
    socket.once('connect', () => (socket.destroy(), resolve(true)));
    socket.once('error', () => resolve(false));
    socket.once('timeout', () => (socket.destroy(), resolve(false)));
  });

if (await reachable()) {
  log(`PostgreSQL is running on ${host}:${port}.`);
} else {
  const { PG_BIN_DIR, PG_DATA_DIR } = process.env;
  if (!PG_BIN_DIR || !PG_DATA_DIR) {
    fail(
      `PostgreSQL is not reachable on ${host}:${port}. Start it, or set PG_BIN_DIR and PG_DATA_DIR in .env so it starts automatically.`,
    );
  }
  const pgCtl = path.join(PG_BIN_DIR, process.platform === 'win32' ? 'pg_ctl.exe' : 'pg_ctl');
  if (!existsSync(pgCtl)) fail(`pg_ctl not found at ${pgCtl}. Check PG_BIN_DIR.`);
  if (!existsSync(path.join(PG_DATA_DIR, 'PG_VERSION')))
    fail(`No data directory at ${PG_DATA_DIR}. Check PG_DATA_DIR.`);
  const logFile = process.env.PG_LOG_FILE || path.join(PG_DATA_DIR, 'server.log');
  log(`Starting PostgreSQL from ${PG_DATA_DIR} (log: ${logFile})...`);
  try {
    execFileSync(pgCtl, ['start', '-w', '-D', PG_DATA_DIR, '-l', logFile, '-o', `-p ${port}`], {
      stdio: 'inherit',
    });
  } catch {
    fail(`pg_ctl could not start PostgreSQL. See ${logFile}.`);
  }
  if (!(await reachable()))
    fail(`PostgreSQL started but ${host}:${port} is still unreachable. See ${logFile}.`);
}

// Applies only pending migrations; a no-op when the schema is current. Never resets data.
log('Applying pending migrations...');
try {
  execFileSync('pnpm', ['--dir', 'apps/api', 'exec', 'prisma', 'migrate', 'deploy'], {
    stdio: 'inherit',
    shell: process.platform === 'win32',
  });
} catch {
  fail('prisma migrate deploy failed. See the output above.');
}
