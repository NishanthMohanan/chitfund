## 1. Role and standard

You are a senior full-stack engineer at a large fintech company. You are building a production-grade, security-first Progressive Web App for managing chit fund groups in India. The code must look and read like it was written by an experienced product team: consistent structure, strong typing, tests, no dead code, no placeholder text, no TODOs left behind, no emojis anywhere in code, UI, logs or commit messages.


## 2. Product summary

A digital chit book for one organizer. It replaces the paper records an organizer keeps for their chit groups. No auctions. No online payments. No OTP. No WhatsApp/SMS.

- The software is built entirely for the organizer, who runs it locally on their own laptop. The laptop is the main device; phone layouts come later.
- There is exactly **one login**: the organizer. The account is the superadmin seeded from `.env` (name, phone, password) and has every permission. There are no other staff or organizer accounts.
- Members are records the organizer keeps. They do not sign in. Member logins, user management and notifications are future work and must not be built now.
- Data accuracy matters most. The organizer will make data-entry mistakes, so every entry can be corrected, and every change keeps its full history (who, when, what changed from what to what).
- English only.

### Chit plans and groups

- **Plan templates** hold the chit value, member count, duration, a **fixed** monthly installment (the same every month, month 1 included) and an exact payout amount for each month. The standard plan is 20 members over 21 months at ₹2,500 a month for a ₹50,000 chit. Bigger plans don't scale from these figures; each template's amounts are entered on their own.
- **Plan shape is enforced:** duration = member count + 1. Month 1 is always the organizer's commission month: its whole collection is commission and nobody receives a payout. From month 2 on, every month has a payout above ₹0 and no larger than the month's collection (member count × installment).
- Templates don't hold a start date or due day. Both are chosen when a **group** is created from a template, and the group gets its own copy of the month schedule.
- A **draft** group is fully editable: name, code, start date, due day, its plan (re-copied from a template) and each month's payout amount. Once the group starts, the due day and due dates are fixed and can't be edited.
- A group is draft → active → completed. Only a draft group can be cancelled; a completed group can't be reopened.

### Collections

- A **payment** is money a member pays for a ticket. It can be any amount, and it always pays off the oldest unpaid month first. Paying ahead is allowed and shows as advance. A payment may carry a future date; the organizer checks it before entering it. Recording a payment always has a confirm step, and a repeated submit never creates a second record.
- A payment is never edited in place or deleted. **Correct payment** reverses the original and records the corrected entry in one step, and links the two. It can change the amount, date, mode, reference, note, ticket or group. **Reverse** (with a reason) cancels a payment outright.
- A **payout** is the chit money handed to one ticket for one month. Each ticket gets one payout, and each month has one payout per group.
  - The amount defaults to the month's scheduled payout and can be edited before confirming. A different amount needs a reason. The schedule keeps the template amount, and the payout records the amount actually paid. Both appear in history.
  - The recipient's **overdue** dues on the payout date (not future months) are subtracted from the payout. The deduction is recorded as a payment on their ticket, linked to the payout, so their dues are cleared.
  - Paying out a month whose due date has not arrived is allowed after a warning and a confirm step.
  - The recipient picker shows the tickets that haven't received a payout, with each holder and their overdue dues.
  - There is no payout correction or reversal. The organizer records payouts carefully.

### Pool and commission

- Each group has a **pool**. A payout month's collection minus its payout stays in the pool. Month 1's collection is commission.
- The organizer can move any amount from the pool to commission, and from commission back to the pool, with a note. Every move is recorded.

### Tickets and members

- One member may hold several tickets.
- **Replace member:** a new member takes over a ticket from a given month and inherits its unpaid dues. The old holder stays in the ticket's history.
- **Correct assignment:** fixes a ticket given to the wrong member. History records it as a correction, not as the member leaving.
- **Remove member from a group:** the ticket becomes vacant and its dues keep building up until someone is assigned. The new holder inherits them. If the ticket is still vacant at the end, the organizer covers the dues.
- **Delete member:** only for a duplicate or mistaken entry that never held a ticket and has no payments. The deleted details are kept in history.

### Completing a group

- A group can be completed only when every due is paid and every payout is recorded. Otherwise the app blocks it and lists exactly what is pending (for example "3 tickets owe ₹7,500; month 21 payout not recorded").
- **Force complete:** the organizer bears the unpaid dues as a loss. The app shows the exact amount and records the loss against the organizer's commission.
- A completed group shows its total commission earned prominently on its list row and card.

### What the organizer can see

- **Dashboard:** due this month, collected (payments dated up to today only), overdue, payouts pending, groups ending soon. Defaulters are counted by member, not by ticket.
- **Commission report:** commission earned per group and per month for a chosen date range.
- **Cash book:** chit money only (payments in, payouts out), by day and by payment mode, with a running balance.
- **History:** a history panel on every payment, payout, group, ticket and member, plus one activity page for everything.
- Receipts and export are not needed now.

### Access

The single organizer account (role `SUPERADMIN`) can do everything. The `ORGANIZER` and `MEMBER` roles stay in the schema for future logins. Every query is still scoped to the signed-in account on the server, never only in the UI.

## 3. Tech stack (do not substitute without asking)

**Monorepo**
- pnpm workspaces + Turborepo
- `apps/api` — NestJS
- `apps/web` — React PWA
- `packages/shared` — Zod schemas, DTO types, enums, money/date utilities shared by both apps
- `packages/config` — shared ESLint, Prettier, TSConfig

**Backend**
- Node.js 22 LTS, NestJS 11, TypeScript strict mode
- PostgreSQL 16+ with Prisma ORM (migrations committed; raw SQL only where row locking is needed)
- Redis + BullMQ for scheduled jobs (due reminders, overdue marking)
- Server-Sent Events (SSE) for real-time in-app notifications
- `web-push` library with VAPID keys for system (outside-the-app) push notifications
- Validation: Zod via a global pipe (schemas from `packages/shared`)
- Logging: Pino (structured JSON, PII redacted)
- API docs: OpenAPI generated from NestJS, disabled in production

**Frontend**
- React 19 + Vite + TypeScript strict
- `vite-plugin-pwa` (Workbox) — installable, offline app shell
- React Router, TanStack Query, React Hook Form + Zod
- Tailwind CSS v4 driven entirely by design tokens (section 6)
- Radix UI primitives for accessible components (Dialog, Dropdown, Tabs, Toast, etc.), styled with our own tokens. Do NOT use the default shadcn/ui theme or look
- Icons: `@carbon/icons-react` only (one icon family, one size scale)
- i18n: `react-i18next`, English first, structure ready for Tamil (`ta`)
- Dates: `date-fns` with Asia/Kolkata handling

**Local dev**
- Docker Compose: Postgres, Redis, Mailpit (optional)
- `.env.example` documented; secrets never committed

## 4. Security requirements (highest priority)

Treat this app as a target. Assume attackers know the URL and have valid member accounts.

**Authentication**
- Login with phone number (Indian format, normalized to E.164) + password
- Passwords hashed with Argon2id (memory ≥ 19 MiB, iterations ≥ 2), never logged
- Password policy: minimum 10 characters, checked against a common-password list; no forced complexity rules
- Temporary passwords: random, 12+ characters, single use, expire in 72 hours, `mustChangePassword` flag enforced by a guard
- Superadmin accounts must enable TOTP two-factor (authenticator app); organizers can opt in. This is not SMS OTP
- Generic error messages ("Phone number or password is incorrect") — never reveal whether an account exists

**Sessions and tokens**
- Short-lived access token (10–15 min) + rotating refresh token, both in `HttpOnly; Secure; SameSite=Strict` cookies. Never store tokens in localStorage, sessionStorage or IndexedDB
- Refresh tokens stored hashed in DB with device info; reuse of an old refresh token revokes the whole session family
- Sessions list + "sign out all other devices"; password change revokes all other sessions
- CSRF protection (double-submit token or custom header check) on all state-changing requests

**Brute force and abuse**
- Rate limiting with Redis-backed `@nestjs/throttler`: strict on `/auth/*` (per IP and per phone number)
- Progressive lockout: 5 failed attempts → 15-minute lock; notify the account owner in-app; log a security event
- Global request size limits

**Authorization**
- `@Roles()` decorator + RolesGuard on every controller; default deny
- Ownership scoping enforced in a service layer helper (organizerId / userId taken from the authenticated session, never from request body or params)
- Add PostgreSQL Row-Level Security policies as a second line of defense for organizer-scoped tables
- IDs exposed to clients are UUIDv7, never sequential integers
- Write e2e tests proving an unauthenticated request cannot read or change anything, and that one organizer's data is never visible to another account (IDOR tests)

**Transport and headers**
- HTTPS only, HSTS (with preload once stable)
- Helmet with a strict Content-Security-Policy (no inline scripts, no `unsafe-eval`, self-hosted fonts and assets only, no third-party CDNs at runtime)
- `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal
- CORS: allow only the exact web origin, credentials true

**Data**
- Money stored as integer paise (`BIGINT`), never floats; all arithmetic in `packages/shared/money.ts` with tests
- No hard deletes for financial records; reversals and corrections are new records
- Append-only `audit_logs` for every create/update/reversal/correction/delete/login (actor, action, entity, the changed fields with old and new values, IP, user agent, timestamp), written in the same transaction as the change
- PII (phone, email) masked in logs; Sentry scrubbing enabled
- Encrypted DB backups; documented restore procedure tested once per phase

**PWA-specific**
- Service worker caches the app shell and static assets only. Never cache authenticated API responses in the Cache API
- On logout: clear TanStack Query cache, unregister push subscription for that device, clear any client state
- No sensitive data in URLs or query strings

**Supply chain and secrets**
- Lockfile committed, `pnpm audit` in CI, Dependabot/Renovate enabled
- Secrets only via environment variables; validate env at boot with Zod and fail fast
- Separate staging and production databases and VAPID keys

## 5. Data model (Prisma, PostgreSQL)

All tables: `id` (UUIDv7), `createdAt`, `updatedAt`. Money in paise.

- `User` — the organizer login (role SUPERADMIN, seeded from `.env`). ORGANIZER and MEMBER roles are kept for future logins.
- `Session` — userId, token hash, device info, expiresAt, revokedAt?
- `ChitPlanTemplate` + `ChitPlanTemplateMonth` — the plan and its per-month payout amounts (month 1 is the commission month)
- `ChitGroup` + `ChitGroupMonth` — a group created from a template with its own copy of the schedule; start date and due day are set on the group
- `Member` — a person the organizer enrols (no login)
- `PaymentModeMaster` — Cash, UPI, Bank transfer and the organizer's own modes, plus a system "Payout deduction" mode that can't be chosen by hand
- `Ticket` — a seat in a group; the current holder is optional (a vacant ticket has none)
- `TicketHolder` — who held a ticket from which month, and how their holding ended (left, removed or corrected)
- `PaymentRecord` — money received for a ticket; reversal fields; a link to the payment it corrects and to the payout it was deducted from; a client request key that makes a repeated submit safe
- `Payout` — chit money paid to one ticket for one month: amount, reason when it differs from the schedule, deduction, net amount handed over
- `GroupFundEntry` — pool and commission movements: pool → commission, commission → pool, organizer loss on force complete
- `AuditLog` — actor, action, entity, changed fields with old and new values, IP, user agent (append-only)

Dues are computed from payments on read (oldest month first); no installment rows are stored.

## 6. Design system — must look like enterprise software, not AI-generated

### Avoid (these make an app look vibe-coded)
- Purple/indigo/violet gradients, gradient text, glassmorphism, neon glows, blurred blobs
- Emojis in UI, buttons, toasts, headings or empty states
- Default shadcn/ui look, default Tailwind palette (`indigo-500`, `slate-*` straight out of the box)
- Huge rounded corners (`rounded-2xl`/`3xl`) and pill buttons everywhere
- Heavy drop shadows on every card, cards-inside-cards
- Marketing copy inside the app ("Supercharge", "Effortlessly", "Unlock", "Seamless", "Let's get started!")
- Spinners for page loads, centered hero layouts on app screens, inconsistent icon styles
- Title Case On Every Label, exclamation marks, cute illustrations

### Typography
- UI font: **IBM Plex Sans** (400, 500, 600) + **IBM Plex Sans Tamil** for Tamil text
- Numbers/IDs: **IBM Plex Mono** (500) for amounts in tables, receipt numbers, ticket numbers
- Self-host font files (woff2) in `apps/web/public/fonts`; `font-display: swap`; preload the 400 and 600 weights
- Always use `font-variant-numeric: tabular-nums` for amounts and dates
- Type scale (px / line-height): 12/16 caption, 14/20 body-small, 16/24 body (default on mobile), 18/28 subheading, 20/28 heading-3, 24/32 heading-2, 30/38 heading-1 (dashboard totals only)
- Weights: 400 body, 500 labels/buttons, 600 headings and key amounts. Never use 700+ or 300
- Sentence case everywhere ("Mark as paid", not "Mark As Paid")

### Color tokens (CSS variables on `:root`, Tailwind reads them)

Light
- `--color-bg`: #F6F7F9 (app background)
- `--color-surface`: #FFFFFF (cards, sheets)
- `--color-surface-muted`: #F0F2F5
- `--color-border`: #DDE1E6
- `--color-border-strong`: #C1C7CD
- `--color-text`: #161616
- `--color-text-secondary`: #525A63
- `--color-text-muted`: #6F7780
- `--color-primary`: #0F4C81 (deep trust blue)
- `--color-primary-hover`: #0B3C66
- `--color-primary-subtle`: #E6EEF6
- `--color-success`: #1B7A47, subtle #E5F3EB
- `--color-warning`: #A15C00, subtle #FBF0E0
- `--color-danger`: #B42318, subtle #FBE9E7
- `--color-info`: #0F4C81, subtle #E6EEF6
- `--color-focus`: #0F62FE (2px focus ring, 2px offset)

Dark (respect `prefers-color-scheme`, plus a manual toggle)
- bg #0F1215, surface #171B20, surface-muted #1E2329, border #2C333B, border-strong #3D4650, text #F2F4F6, text-secondary #B4BCC5, text-muted #8A939D, primary #5B9BD5, primary-hover #7BB0E0, success #4CAF7D, warning #E0A23B, danger #F0705F

Status must never be shown by color alone: always pair with a text label (Paid, Due, Overdue, Reversed) and an icon.

### Shape, spacing, elevation
- 4px base grid; spacing scale 4, 8, 12, 16, 24, 32, 48
- Radius: 4px inputs/badges, 6px buttons/cards, 8px sheets/dialogs. Nothing larger
- Borders do most of the work: 1px `--color-border`; shadows only on overlays (dialog, dropdown, toast): `0 4px 12px rgba(16,24,40,0.08)`
- Page side padding 16px on mobile, max content width 1200px on desktop
- Touch targets ≥ 44×44px; inputs 44px tall on mobile

### Components (build these once in `apps/web/src/ui`, reuse everywhere)
Button (primary, secondary, ghost, danger; sm/md), IconButton, Input, PhoneInput, PasswordInput (show/hide), Select, Textarea, Checkbox, Switch, Badge/StatusTag, Card, Table (desktop) that collapses to list rows (mobile), DescriptionList, Tabs, Dialog, BottomSheet (mobile), Toast, InlineAlert, EmptyState (icon + one line + one action), Skeleton, Pagination, Amount (formats paise → ₹ with Indian grouping via `Intl.NumberFormat('en-IN')`, e.g. ₹1,00,000), DateText, Avatar (initials, no generated faces), PageHeader, BottomTabBar, Sidebar.

### Layout and navigation
- Laptop first (1024px and up): left sidebar (240px) + content, tables for lists
- Sidebar: Dashboard, Groups, Plans, Members, Payments, Dues, Reports (Commission, Cash book), Activity, Settings (payment modes, profile)
- Phone layouts (top app bar + bottom tab bar) are a later phase; screens must not break below 1024px, but they aren't designed for it yet

### UX rules
- Skeleton loaders that match the final layout; no full-screen spinners
- Every list has a real empty state with one clear next action
- Record payment: a dialog (ticket, amount, date, mode, reference, note) → a confirm step that restates the member, ticket and amount → toast. The confirm button disables while saving.
- Destructive or financial actions always confirm and state the exact amount and person
- Forms: inline validation on blur, error text under the field, never only a red border
- Offline: thin banner "You're offline. Showing last saved screens." and disable actions that need the server
- Respect safe-area insets (iOS notch / home bar); `viewport-fit=cover`
- Motion: 150–200ms ease-out for sheets and toasts only; honor `prefers-reduced-motion`
- Accessibility: WCAG 2.2 AA contrast, visible focus, labels on all inputs, ARIA via Radix
- Microcopy: short, plain, consistent terms — Installment, Due, Paid, Overdue, Payout, Recipient, Group, Ticket

### PWA presentation
- Proper manifest: name, short_name, theme_color #0F4C81, background_color #F6F7F9, `display: standalone`, portrait
- Maskable icons (192, 512) + Apple touch icon + iOS splash screens; simple monogram logo, flat, no gradients
- Custom install prompt on Android; an "Add to Home Screen" help sheet for iOS (push works on iOS only after install)

## 7. Notifications (future, do not build yet)

Arrives together with member logins. Kept here as the target design.

- In-app: notification center (bell with unread count), real-time via SSE, stored in `Notification` table, mark read / mark all read
- System push (outside the app): Web Push with VAPID; ask permission only after a user action (a "Turn on notifications" button in Profile or after first login), never on page load
- Events:
  - Member: installment due in 3 days, due today, overdue, payment marked paid (receipt), payment reversed, you are this month's recipient, organizer announcement, password changed, new sign-in on a new device
  - Organizer: daily summary of dues/overdues, member account locked
  - Superadmin: security events (repeated lockouts, suspicious activity)
- Scheduled via BullMQ repeatable jobs, Asia/Kolkata time (e.g. reminders at 09:00 IST)
- Push payloads contain no amounts or personal data beyond a short title; details load after opening the app
- Remove dead subscriptions on 404/410 responses

## 8. Project structure

```
apps/api/src/
  main.ts, app.module.ts
  config/            env schema (Zod), security config
  common/            guards, decorators, interceptors, filters, pipes
  modules/
    auth/            login, logout, session, password change
    chit/            templates, groups, tickets, members, payments, payouts, pool, dashboard, reports
    audit/           history and activity
    health/
  prisma/            schema.prisma, migrations, create-superadmin.ts, superadmin seed
apps/web/src/
  app/               router, providers, layouts
  features/          auth, dashboard, groups, plans, members, payments, dues, reports, activity, settings
  ui/                design system components
  styles/            tokens.css, fonts.css, base.css
  lib/               api client, query client, i18n, format
  locales/en
packages/shared/src/ schemas, enums, money.ts, dates.ts
```

## 9. Phases (build in this order, one phase per session)

**Phase 0 — Foundation**
Monorepo, tooling, Docker Compose, env validation, Prisma schema + first migration, `create-superadmin` CLI, design tokens + fonts + base UI components, app shell with layouts and navigation, CI (lint, typecheck, test, build). Write CLAUDE.md summarizing this file.

**Done before this plan:** single-account session login, the organizer ledger API (templates, groups, tickets, members, payment modes, payments, payouts, dashboard), schema and migrations.

**Phase A — Business rules and corrections (API)**
Plan shape checks; draft groups fully editable and due dates fixed after start; the new payout flow (schedule default, reason for a different amount, overdue deduction, early-month confirm); vacant tickets with remove, correct assignment and replace; member delete; Correct payment; safe repeated submits; pool and commission moves; complete and force-complete rules; dashboard fixes. Migration and tests.

**Phase B — History and reports (API)**
Audit entries with changed fields only, written inside each transaction with IP and user agent; history per record and an activity feed; commission report; cash book. Tests.

**Phase C — Organizer screens: setup**
Laptop layout and sidebar; sign-in; plans; members; groups (create, draft edit, start, tickets, replace, correct, remove); settings.

**Phase D — Organizer screens: money**
Dashboard; payments (record with confirm, correct, reverse); payouts (recipient picker, deduction, early warning); dues; pool and commission; complete and force complete.

**Phase E — Organizer screens: reports and history**
Commission report, cash book, history panels, activity page.

**Later (not now):** backups and restore, phone layouts, member logins, notifications, receipts and export, Tamil.

## 10. Definition of done (every phase)
- Type-check, lint and all tests pass; new logic has unit tests; money logic has 100% branch coverage
- Every new endpoint: Zod validation, role guard, ownership check, audit log, rate limit where relevant, e2e test including an unauthorized-access case
- UI follows section 6 exactly; no ad-hoc colors, sizes or fonts outside tokens
- Works on a laptop (1024px and up) and doesn't break on smaller widths; light and dark mode checked
- No console errors, no `any`, no commented-out code, no emojis
- CLAUDE.md updated if conventions changed
