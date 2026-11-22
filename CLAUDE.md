# ChitFund

Security-first PWA for managing Indian chit fund groups. `MASTER_PROMPT.md` is the full specification; this file records how the codebase applies it.

## Working agreement

- Build one phase at a time (MASTER_PROMPT.md section 9). Present a plan and wait for approval before each phase; after it, run lint, typecheck, tests and migrations and report the results.
- Do not create git commits. The user commits.
- Mobile first. About 90% of users are members and organizers on phones; only the superadmin works on a laptop. Design every screen from 360px up. Desktop (1024px and up) is the enhancement.
- Every list endpoint and screen uses server-side pagination.

## Layout

```
apps/api         NestJS 11 API (CommonJS), Prisma, Pino, Redis
apps/web         React 19 + Vite PWA, Tailwind v4, Radix, TanStack Query
packages/shared  Zod schemas, enums, money, dates, phone (ESM + CJS via tsup)
packages/config  ESLint flat config and tsconfig bases
```

## Commands

- `pnpm install`, `pnpm dev`, `pnpm build`, `pnpm lint`, `pnpm typecheck`, `pnpm test`, `pnpm format`
- `pnpm db:migrate`: apply or create migrations against `.env`
- `pnpm --filter @chitfund/api db:test:prepare`: reset the test database from `.env.test`
- `pnpm --filter @chitfund/api superadmin:create`: the only way to create a superadmin (interactive)
- `pnpm --filter @chitfund/web fonts:sync`: re-copy the IBM Plex subsets after upgrading `@ibm/plex`
- `pnpm --filter @chitfund/web icons:generate`: rebuild the PWA icons from `public/logo.svg`

Local setup without Docker is described in `docs/local-setup.md`.

## Conventions

**Money**

- Integer paise in a `bigint` everywhere. The database column type is BIGINT.
- In JSON, paise travel as decimal strings. The API's JSON replacer serialises bigint, and `paiseSchema` parses it back.
- All arithmetic and formatting goes through `packages/shared/src/money.ts`, which must keep 100% coverage.

**IDs and time**

- IDs are UUIDv7, set by Prisma with `@default(uuid(7))`.
- Timestamps are stored as timestamptz.
- Calendar dates such as due dates are stored as midnight Asia/Kolkata. Use `packages/shared/src/dates.ts`.

**Phones**

- Phone numbers are stored in E.164 form (`+91XXXXXXXXXX`), normalised by `phoneSchema`.
- Mask them with `maskPhone` anywhere outside the record itself.

**Validation**

- Wrap shared Zod schemas with `createZodDto(schema)`. The global `ZodValidationPipe` parses every DTO parameter.
- Validation errors come back as `{ statusCode, code: 'VALIDATION_FAILED', message, fieldErrors }`.

**Authorization**

- `RolesGuard` is global and denies by default: a route needs `@Public()` or `@Roles(...)`.
- An unauthenticated request gets 401; a wrong role gets 403.
- Ownership always comes from the session, never from the request.

**Errors**

- Every error, including body-parser errors, uses the `toErrorBody` shape. Internals are never exposed.

**Pagination**

- Requests use `paginationQuerySchema` (`page`, `pageSize` up to 100).
- Responses use `toPaginated` (`{ items, total, page, pageSize, totalPages }`).
- On the web, use `usePagedQuery` for desktop tables and `useLoadMoreQuery` for phone lists.

**Database integrity**

- `audit_logs` is append-only (a trigger blocks UPDATE, DELETE and TRUNCATE).
- Payment records, payouts and installments cannot be deleted. Reversals are new data.
- RLS policies exist on all organizer-scoped tables. They are keyed on `app.role` and `app.user_id` set per transaction, which is wired in Phase 1, together with a non-owner DB role.

**Logging**

- Pino through `nestjs-pino`.
- Passwords, tokens, cookies, phone and email are redacted (`REDACTED_PATHS`).
- `console` is a lint error in app code.

## Chit plans (domain)

- An organizer creates **chit plan templates**. A template holds:
  - the chit value;
  - the member count and duration (the standard plan is 20 members over 21 months);
  - a **fixed** monthly installment, the same every month (₹2,500 for a ₹50,000 plan);
  - an exact **payout amount** for each month, entered by the organizer.
- Bigger plans do not scale from the ₹50,000 figures; each template's amounts are entered independently.
- **Members pay in month 1 too.** That whole month's collection is the organizer's commission (`isOrganizerMonth`), and no member withdraws that month.
- A group is created from a template and gets its own editable copy of the schedule in `ChitGroupMonth`. Two groups on the same plan can therefore differ.
- A ticket receives a payout once, and the amount must equal that month's `payoutAmount`.

## Web UI rules

- Only the design tokens in `apps/web/src/styles/tokens.css` exist. Tailwind's default palette, radii, shadows and type scale are disabled.
  - Type: `text-caption`, `text-body-sm`, `text-body`, `text-subheading`, `text-h3`, `text-h2`, `text-h1`.
  - Radii: `rounded-sm` (4px), `rounded-md` (6px), `rounded-lg` (8px).
  - Spacing follows the 4px grid.
- Components live in `apps/web/src/ui` and are reused everywhere. Non-component helpers go in their own files (`button-classes.ts`, `control-classes.ts`, `toast-context.ts`) so Fast Refresh works.
- Use `text-text-secondary` for readable secondary text. `text-text-muted` is below AA contrast on the page background and is only for placeholders and disabled states.
- Touch targets are at least 44px. `Button size="sm"` is compact only at `lg`.
- Status is never shown by colour alone: `StatusTag` always pairs an icon with a label.
- Amounts use `<Amount>` (IBM Plex Mono, tabular). Dates use `<DateText>` (India time).
- Strings live in `apps/web/src/locales/en/common.json`. Write in sentence case, with no exclamation marks and no emojis.
- The service worker precaches the app shell only. `/api` is never cached.

## Known follow-ups

- **Tamil font:** IBM Plex Sans Tamil is not published on npm. Self-host it from IBM's GitHub release when Tamil strings are added.
- **Web CSP:** the strict CSP and other headers for Cloudflare Pages (`public/_headers`) are part of the Phase 6 staging deploy.
