# ChitFund

A digital chit book for one organizer, run locally on their laptop. `MASTER_PROMPT.md` is the full specification (section 2 holds the business rules); this file records how the codebase applies it.

## Working agreement

- Build one phase at a time (MASTER_PROMPT.md section 9). Present a plan and wait for approval before each phase; after it, run lint, typecheck, tests and migrations and report the results.
- Do not create git commits. The user commits.
- One login: the organizer, which is the superadmin seeded from `.env`. Members are records without logins. Don't build member logins, user management or notifications yet.
- Laptop first (1024px and up). Phone layouts are a later phase; screens must not break on smaller widths.
- English only.
- Every list endpoint and screen uses server-side pagination.
- Correctness of money and history comes first: every change is correctable and keeps its old and new values in `audit_logs`.

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

- `audit_logs` is append-only (a trigger blocks UPDATE, DELETE and TRUNCATE). Write the audit entry with the same transaction client as the change.
- Payment records, payouts and ticket holders cannot be deleted. A payment is reversed or corrected, never edited in place.
- RLS policies exist on all organizer-scoped tables. They are keyed on `app.role` and `app.user_id` set per transaction, which is wired in Phase 1, together with a non-owner DB role.

**Logging**

- Pino through `nestjs-pino`.
- Passwords, tokens, cookies, phone and email are redacted (`REDACTED_PATHS`).
- `console` is a lint error in app code.

## Chit plans (domain)

The full rules are in MASTER_PROMPT.md section 2. In short:

- A **chit plan template** holds:
  - the chit value;
  - the member count and duration (the standard plan is 20 members over 21 months);
  - a **fixed** monthly installment, the same every month (₹2,500 for a ₹50,000 plan);
  - an exact **payout amount** for each month.
- Bigger plans don't scale from the ₹50,000 figures; each template's amounts are entered independently.
- Plan shape is enforced:
  - duration = member count + 1;
  - month 1 is always the commission month (`isOrganizerMonth`, derived, never typed): members pay, nobody withdraws;
  - months 2 onward each have a payout above ₹0, no larger than member count × installment.
- Start date and due day are set on the **group**, not the template. A group copies the schedule into `ChitGroupMonth`. A draft group is fully editable; after it starts, due dates are fixed.
- Payments always pay off the oldest unpaid month first. Paying ahead and future-dated payments are allowed. The dashboard's "collected" counts only payments dated up to today.
- A payout:
  - defaults to the month's `payoutAmount` and can be edited before confirming, with a reason. The schedule is never overwritten;
  - has the recipient's overdue dues (not future months) deducted, recorded as a linked payment;
  - can be made for a future month after a warning and a confirm step;
  - is limited to one per ticket and one per month.
- Each group has a pool: a payout month's collection minus its payout. The organizer moves money between the pool and commission, and every move is recorded.
- A vacant ticket keeps accruing dues. The next holder inherits them, or the organizer covers them at the end.
- A group completes only when nothing is pending. Force complete records the unpaid dues as the organizer's loss.

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

- **Backups:** the data lives on one laptop. Automatic backups with a tested restore are listed under "Later" in MASTER_PROMPT.md section 9.
- **Tamil font:** IBM Plex Sans Tamil is not published on npm. Self-host it from IBM's GitHub release if Tamil strings are added.
- **Web CSP:** the strict CSP and other headers (`public/_headers`) arrive with the deployment work.
