## 1. Role and standard

You are a senior full-stack engineer at a large fintech company. You are building a production-grade, security-first Progressive Web App for managing chit fund groups in India. The code must look and read like it was written by an experienced product team: consistent structure, strong typing, tests, no dead code, no placeholder text, no TODOs left behind, no emojis anywhere in code, UI, logs or commit messages.


## 2. Product summary

A chit fund management app with exactly three roles. No auctions. No online payments. No OTP. No WhatsApp/SMS.

- Each chit group has a fixed chit value, a fixed number of members (tickets), a fixed duration in months, and a fixed monthly installment.
- Every month, each member pays the installment offline (cash/UPI/bank). The members marks it as paid with document attach option and organizer approves it as paid in the app.
- Every month, the organizer records who receives that month's chit amount (the recipient), chosen offline.
- Members can only view their own data.This app is basically a digital book which replaces the manual check records in chit books.
- the app works by permission based rbac from the settings/user management . the user management wil have user tab and roles tab. each users password, data crud, activte/deactivate and each role crud based on permissions could be done.
- Notification cases wll be mentioned by me and users can edit the inapp or push enable disable in their profile. Every user can edit their own profile expect username and phone number whih needs organizer or superadmin approval. Remeber the organizers are the owners of this company, the superadmin is the software owner like a systemadmin, the members are the customer of the chit plans.

### Roles and permissions

**SUPERADMIN** (one or very few accounts, created via a secure CLI seed command, never via public signup, the superadmin name, password and number are configured in .env)
- Create, edit, suspend and reactivate organizer accounts
-Overrirde all the permissions
- View all groups, members and collections across organizers (read-only by default)
- View the audit log and security events (logins, failed logins, logouts, and all the activities within the app)
- Reset any organizer's and members password (makes the user log out)

**ORGANIZER**
- Create and manage their own chit groups (draft → active → completed)
- Create member accounts (name, phone, optional email) with a system-generated temporary password; the member must change it on first login
- Assign members in a group (one person may hold more than one ticket)
- Mark installments as paid (mode: CASH / UPI / BANK_TRANSFER, optional reference, optional note). Reversing a payment requires a reason and creates a reversal record; nothing is ever hard-deleted
- Record the monthly recipient and payout amount for each month
- Send announcements to a group or to all their members
- See dashboards: due this month, collected, overdue, per-group progress
- Update notice board
- Reset passwords for their own members

**MEMBER**
- View their groups, ticket(s), installment schedule and status (Paid / Due / Overdue), payment history and payout month
- Receive notifications (in-app and system push)
- Change password, manage active sessions (sign out other devices)
- Cannot see other members' profile details (only names in the group's recipient history, if the organizer enables it)

Organizers can only ever access data belonging to their own organizer_id. Members can only ever access their own records. This must be enforced on the server for every query, never only in the UI.

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
- Write e2e tests proving a member cannot read another member's data and an organizer cannot read another organizer's data (IDOR tests)

**Transport and headers**
- HTTPS only, HSTS (with preload once stable)
- Helmet with a strict Content-Security-Policy (no inline scripts, no `unsafe-eval`, self-hosted fonts and assets only, no third-party CDNs at runtime)
- `X-Frame-Options: DENY`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` minimal
- CORS: allow only the exact web origin, credentials true

**Data**
- Money stored as integer paise (`BIGINT`), never floats; all arithmetic in `packages/shared/money.ts` with tests
- No hard deletes for financial records; reversals are new records
- Append-only `audit_logs` for every create/update/reversal/login/permission change (actor, action, entity, before/after, IP, user agent, timestamp)
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

- `User` — role (SUPERADMIN | ORGANIZER | MEMBER), name, phone (unique), email?, passwordHash, mustChangePassword, totpSecret? (encrypted), status (ACTIVE | SUSPENDED | LOCKED), failedLoginCount, lockedUntil?, organizerId? (for members: the organizer who created them), lastLoginAt
- `Session` — userId, refreshTokenHash, familyId, deviceLabel, ip, userAgent, expiresAt, revokedAt?
- `ChitGroup` — organizerId, name, code, chitValue, memberCount, durationMonths, monthlyInstallment, startDate, dueDayOfMonth, status (DRAFT | ACTIVE | COMPLETED | CANCELLED)
- `Ticket` — groupId, memberId, ticketNumber (unique per group)
- `Installment` — ticketId, monthNumber, dueDate, amount, status (DUE | PAID | OVERDUE | REVERSED), unique (ticketId, monthNumber)
- `PaymentRecord` — installmentId, amount, mode (CASH | UPI | BANK_TRANSFER), reference?, note?, markedById, markedAt, reversedById?, reversedAt?, reversalReason?
- `Payout` — groupId, monthNumber (unique per group), ticketId (recipient), amount, paidOn, recordedById, note?
- `Notification` — userId, type, title, body, link?, readAt?
- `PushSubscription` — userId, endpoint (unique), p256dh, auth, userAgent, lastUsedAt
- `Announcement` — organizerId, groupId?, title, body, createdById
- `AuditLog` — actorId, action, entityType, entityId, before (JSONB), after (JSONB), ip, userAgent, createdAt (append-only; no update/delete grants)

Generating installments: when a group is activated, create all installments for all tickets in one transaction.

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
- Mobile (primary): top app bar with page title + bottom tab bar
  - Member tabs: Home, Groups, Payments, Notifications, Profile
  - Organizer tabs: Dashboard, Groups, Members, Collections, More
- Desktop (≥ 1024px): left sidebar (240px) + content; tables instead of list rows
- Superadmin is desktop-first but must work on mobile

### UX rules
- Skeleton loaders that match the final layout; no full-screen spinners
- Every list has a real empty state with one clear next action
- Mark as paid: one tap opens a bottom sheet (mode, reference, note) → confirm → toast with 10-second Undo (undo creates a reversal record)
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

## 7. Notifications

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
    auth/            login, refresh, logout, password change, TOTP, sessions
    users/
    organizers/
    members/
    groups/
    installments/
    payments/
    payouts/
    notifications/   SSE stream, web push, jobs
    announcements/
    audit/
    dashboard/
  prisma/            schema.prisma, migrations, seed.ts, create-superadmin.ts
apps/web/src/
  app/               router, providers, layouts
  features/          auth, dashboard, groups, members, collections, payments, notifications, profile, admin
  ui/                design system components
  styles/            tokens.css, fonts.css, base.css
  lib/               api client, query client, i18n, format
  locales/en, locales/ta
packages/shared/src/ schemas, enums, money.ts, dates.ts
```

## 9. Phases (build in this order, one phase per session)

**Phase 0 — Foundation**
Monorepo, tooling, Docker Compose, env validation, Prisma schema + first migration, `create-superadmin` CLI, design tokens + fonts + base UI components, app shell with layouts and navigation, CI (lint, typecheck, test, build). Write CLAUDE.md summarizing this file.

**Phase 1 — Auth and security core**
Login, refresh rotation, logout, sessions, forced password change, lockout, rate limiting, CSRF, Helmet/CSP, RolesGuard, ownership helpers, TOTP for superadmin, audit logging interceptor. IDOR and auth e2e tests.

**Phase 2 — Superadmin + organizers**
Organizer CRUD, suspend/reactivate, password reset, audit log viewer, security events.

**Phase 3 — Groups, members, tickets**
Member account creation with temporary password (shown once to organizer, copy button), group lifecycle, ticket assignment, installment generation on activation.

**Phase 4 — Collections**
Mark as paid, undo/reversal, overdue job, organizer dashboard and collection views, payout recording, member views of schedule/history.

**Phase 5 — Notifications**
Notification center, SSE, Web Push subscribe/unsubscribe, scheduled reminders, announcements.

**Phase 6 — PWA polish and hardening**
Manifest, icons, splash, install flows, offline shell, Lighthouse PWA/Accessibility/Best Practices ≥ 95, Playwright critical paths, security review checklist, backup/restore runbook, staging deploy.

## 10. Definition of done (every phase)
- Type-check, lint and all tests pass; new logic has unit tests; money logic has 100% branch coverage
- Every new endpoint: Zod validation, role guard, ownership check, audit log, rate limit where relevant, e2e test including an unauthorized-access case
- UI follows section 6 exactly; no ad-hoc colors, sizes or fonts outside tokens
- Works at 360px width and on desktop; light and dark mode checked
- No console errors, no `any`, no commented-out code, no emojis
- CLAUDE.md updated if conventions changed
