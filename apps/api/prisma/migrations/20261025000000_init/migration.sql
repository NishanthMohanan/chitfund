-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Role" AS ENUM ('SUPERADMIN', 'ORGANIZER', 'MEMBER');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED', 'LOCKED');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('CASH', 'UPI', 'BANK_TRANSFER');

-- CreateEnum
CREATE TYPE "InstallmentStatus" AS ENUM ('DUE', 'PAID', 'OVERDUE', 'REVERSED');

-- CreateEnum
CREATE TYPE "GroupStatus" AS ENUM ('DRAFT', 'ACTIVE', 'COMPLETED', 'CANCELLED');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "role" "Role" NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "email" VARCHAR(254),
    "password_hash" TEXT NOT NULL,
    "must_change_password" BOOLEAN NOT NULL DEFAULT false,
    "password_expires_at" TIMESTAMPTZ(3),
    "password_changed_at" TIMESTAMPTZ(3),
    "totp_secret" TEXT,
    "totp_enabled_at" TIMESTAMPTZ(3),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "failed_login_count" INTEGER NOT NULL DEFAULT 0,
    "locked_until" TIMESTAMPTZ(3),
    "organizer_id" UUID,
    "last_login_at" TIMESTAMPTZ(3),

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sessions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "user_id" UUID NOT NULL,
    "refresh_token_hash" TEXT NOT NULL,
    "family_id" UUID NOT NULL,
    "device_label" VARCHAR(120),
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(512),
    "last_used_at" TIMESTAMPTZ(3),
    "expires_at" TIMESTAMPTZ(3) NOT NULL,
    "revoked_at" TIMESTAMPTZ(3),

    CONSTRAINT "sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chit_plan_templates" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "organizer_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "chit_value" BIGINT NOT NULL,
    "member_count" INTEGER NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "monthly_installment" BIGINT NOT NULL,
    "archived_at" TIMESTAMPTZ(3),

    CONSTRAINT "chit_plan_templates_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chit_plan_template_months" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "template_id" UUID NOT NULL,
    "month_number" INTEGER NOT NULL,
    "payout_amount" BIGINT NOT NULL,
    "is_organizer_month" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chit_plan_template_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chit_groups" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "organizer_id" UUID NOT NULL,
    "template_id" UUID,
    "name" VARCHAR(120) NOT NULL,
    "code" VARCHAR(32) NOT NULL,
    "chit_value" BIGINT NOT NULL,
    "member_count" INTEGER NOT NULL,
    "duration_months" INTEGER NOT NULL,
    "monthly_installment" BIGINT NOT NULL,
    "start_date" TIMESTAMPTZ(3) NOT NULL,
    "due_day_of_month" INTEGER NOT NULL,
    "status" "GroupStatus" NOT NULL DEFAULT 'DRAFT',
    "show_recipient_names" BOOLEAN NOT NULL DEFAULT false,
    "activated_at" TIMESTAMPTZ(3),

    CONSTRAINT "chit_groups_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chit_group_months" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "group_id" UUID NOT NULL,
    "month_number" INTEGER NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "payout_amount" BIGINT NOT NULL,
    "is_organizer_month" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "chit_group_months_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tickets" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "group_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "ticket_number" INTEGER NOT NULL,

    CONSTRAINT "tickets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "installments" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "ticket_id" UUID NOT NULL,
    "month_number" INTEGER NOT NULL,
    "due_date" TIMESTAMPTZ(3) NOT NULL,
    "amount" BIGINT NOT NULL,
    "status" "InstallmentStatus" NOT NULL DEFAULT 'DUE',

    CONSTRAINT "installments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_records" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "installment_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "mode" "PaymentMode" NOT NULL,
    "reference" VARCHAR(120),
    "note" VARCHAR(500),
    "marked_by_id" UUID NOT NULL,
    "marked_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "reversed_by_id" UUID,
    "reversed_at" TIMESTAMPTZ(3),
    "reversal_reason" VARCHAR(500),

    CONSTRAINT "payment_records_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payouts" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "group_id" UUID NOT NULL,
    "month_number" INTEGER NOT NULL,
    "ticket_id" UUID NOT NULL,
    "amount" BIGINT NOT NULL,
    "paid_on" TIMESTAMPTZ(3) NOT NULL,
    "recorded_by_id" UUID NOT NULL,
    "note" VARCHAR(500),

    CONSTRAINT "payouts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "notifications" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "user_id" UUID NOT NULL,
    "type" VARCHAR(64) NOT NULL,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(1000) NOT NULL,
    "link" VARCHAR(300),
    "read_at" TIMESTAMPTZ(3),

    CONSTRAINT "notifications_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "push_subscriptions" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "user_id" UUID NOT NULL,
    "endpoint" TEXT NOT NULL,
    "p256dh" TEXT NOT NULL,
    "auth" TEXT NOT NULL,
    "user_agent" VARCHAR(512),
    "last_used_at" TIMESTAMPTZ(3),

    CONSTRAINT "push_subscriptions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "announcements" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "organizer_id" UUID NOT NULL,
    "group_id" UUID,
    "title" VARCHAR(160) NOT NULL,
    "body" VARCHAR(4000) NOT NULL,
    "created_by_id" UUID NOT NULL,

    CONSTRAINT "announcements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "audit_logs" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "actor_id" UUID,
    "action" VARCHAR(64) NOT NULL,
    "entity_type" VARCHAR(64) NOT NULL,
    "entity_id" UUID,
    "before" JSONB,
    "after" JSONB,
    "ip" VARCHAR(45),
    "user_agent" VARCHAR(512),

    CONSTRAINT "audit_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_phone_key" ON "users"("phone");

-- CreateIndex
CREATE INDEX "users_organizer_id_idx" ON "users"("organizer_id");

-- CreateIndex
CREATE INDEX "users_role_status_idx" ON "users"("role", "status");

-- CreateIndex
CREATE UNIQUE INDEX "sessions_refresh_token_hash_key" ON "sessions"("refresh_token_hash");

-- CreateIndex
CREATE INDEX "sessions_user_id_revoked_at_idx" ON "sessions"("user_id", "revoked_at");

-- CreateIndex
CREATE INDEX "sessions_family_id_idx" ON "sessions"("family_id");

-- CreateIndex
CREATE UNIQUE INDEX "chit_plan_templates_organizer_id_name_key" ON "chit_plan_templates"("organizer_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "chit_plan_template_months_template_id_month_number_key" ON "chit_plan_template_months"("template_id", "month_number");

-- CreateIndex
CREATE INDEX "chit_groups_organizer_id_status_idx" ON "chit_groups"("organizer_id", "status");

-- CreateIndex
CREATE UNIQUE INDEX "chit_groups_organizer_id_code_key" ON "chit_groups"("organizer_id", "code");

-- CreateIndex
CREATE UNIQUE INDEX "chit_group_months_group_id_month_number_key" ON "chit_group_months"("group_id", "month_number");

-- CreateIndex
CREATE INDEX "tickets_member_id_idx" ON "tickets"("member_id");

-- CreateIndex
CREATE UNIQUE INDEX "tickets_group_id_ticket_number_key" ON "tickets"("group_id", "ticket_number");

-- CreateIndex
CREATE INDEX "installments_status_due_date_idx" ON "installments"("status", "due_date");

-- CreateIndex
CREATE UNIQUE INDEX "installments_ticket_id_month_number_key" ON "installments"("ticket_id", "month_number");

-- CreateIndex
CREATE INDEX "payment_records_installment_id_idx" ON "payment_records"("installment_id");

-- CreateIndex
CREATE INDEX "payment_records_marked_at_idx" ON "payment_records"("marked_at");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_ticket_id_key" ON "payouts"("ticket_id");

-- CreateIndex
CREATE UNIQUE INDEX "payouts_group_id_month_number_key" ON "payouts"("group_id", "month_number");

-- CreateIndex
CREATE INDEX "notifications_user_id_read_at_created_at_idx" ON "notifications"("user_id", "read_at", "created_at");

-- CreateIndex
CREATE UNIQUE INDEX "push_subscriptions_endpoint_key" ON "push_subscriptions"("endpoint");

-- CreateIndex
CREATE INDEX "push_subscriptions_user_id_idx" ON "push_subscriptions"("user_id");

-- CreateIndex
CREATE INDEX "announcements_organizer_id_created_at_idx" ON "announcements"("organizer_id", "created_at");

-- CreateIndex
CREATE INDEX "announcements_group_id_idx" ON "announcements"("group_id");

-- CreateIndex
CREATE INDEX "audit_logs_entity_type_entity_id_idx" ON "audit_logs"("entity_type", "entity_id");

-- CreateIndex
CREATE INDEX "audit_logs_actor_id_created_at_idx" ON "audit_logs"("actor_id", "created_at");

-- CreateIndex
CREATE INDEX "audit_logs_action_created_at_idx" ON "audit_logs"("action", "created_at");

-- AddForeignKey
ALTER TABLE "users" ADD CONSTRAINT "users_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sessions" ADD CONSTRAINT "sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chit_plan_templates" ADD CONSTRAINT "chit_plan_templates_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chit_plan_template_months" ADD CONSTRAINT "chit_plan_template_months_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "chit_plan_templates"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chit_groups" ADD CONSTRAINT "chit_groups_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chit_groups" ADD CONSTRAINT "chit_groups_template_id_fkey" FOREIGN KEY ("template_id") REFERENCES "chit_plan_templates"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chit_group_months" ADD CONSTRAINT "chit_group_months_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "installments" ADD CONSTRAINT "installments_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_installment_id_fkey" FOREIGN KEY ("installment_id") REFERENCES "installments"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_marked_by_id_fkey" FOREIGN KEY ("marked_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_reversed_by_id_fkey" FOREIGN KEY ("reversed_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chit_groups"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_recorded_by_id_fkey" FOREIGN KEY ("recorded_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "notifications" ADD CONSTRAINT "notifications_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "push_subscriptions" ADD CONSTRAINT "push_subscriptions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_group_id_fkey" FOREIGN KEY ("group_id") REFERENCES "chit_groups"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "announcements" ADD CONSTRAINT "announcements_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "audit_logs" ADD CONSTRAINT "audit_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Integrity: append-only audit log and no hard deletes for financial records
-- ---------------------------------------------------------------------------

CREATE SCHEMA IF NOT EXISTS app;

CREATE FUNCTION app.reject_modification() RETURNS trigger
LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION '% on % is not permitted', TG_OP, TG_TABLE_NAME
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

CREATE TRIGGER audit_logs_append_only
  BEFORE UPDATE OR DELETE ON "audit_logs"
  FOR EACH ROW EXECUTE FUNCTION app.reject_modification();

CREATE TRIGGER audit_logs_no_truncate
  BEFORE TRUNCATE ON "audit_logs"
  FOR EACH STATEMENT EXECUTE FUNCTION app.reject_modification();

CREATE TRIGGER payment_records_no_delete
  BEFORE DELETE ON "payment_records"
  FOR EACH ROW EXECUTE FUNCTION app.reject_modification();

CREATE TRIGGER payouts_no_delete
  BEFORE DELETE ON "payouts"
  FOR EACH ROW EXECUTE FUNCTION app.reject_modification();

CREATE TRIGGER installments_no_delete
  BEFORE DELETE ON "installments"
  FOR EACH ROW EXECUTE FUNCTION app.reject_modification();

-- ---------------------------------------------------------------------------
-- Row-Level Security (second line of defence behind service-layer ownership)
--
-- The API sets these per transaction with SET LOCAL:
--   app.role     SUPERADMIN | ORGANIZER | MEMBER | SYSTEM
--   app.user_id  the authenticated user's id
-- RLS applies to the non-owner application role; the migration owner bypasses it.
-- ---------------------------------------------------------------------------

CREATE FUNCTION app.session_role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT coalesce(current_setting('app.role', true), '')
$$;

CREATE FUNCTION app.session_user_id() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('app.user_id', true), '')::uuid
$$;

CREATE FUNCTION app.is_privileged() RETURNS boolean
LANGUAGE sql STABLE AS $$
  SELECT app.session_role() IN ('SUPERADMIN', 'SYSTEM')
$$;

-- The helpers below are SECURITY DEFINER so that policies on one table can look
-- up related tables without recursing into those tables' own policies.

CREATE FUNCTION app.owns_group(target_group_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.session_role() = 'ORGANIZER' AND EXISTS (
    SELECT 1 FROM chit_groups g
    WHERE g.id = target_group_id AND g.organizer_id = app.session_user_id()
  )
$$;

CREATE FUNCTION app.can_read_group(target_group_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.is_privileged()
    OR app.owns_group(target_group_id)
    OR (app.session_role() = 'MEMBER' AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.group_id = target_group_id AND t.member_id = app.session_user_id()
    ))
$$;

CREATE FUNCTION app.ticket_group(target_ticket_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT group_id FROM tickets WHERE id = target_ticket_id
$$;

CREATE FUNCTION app.can_read_ticket(target_ticket_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.is_privileged()
    OR app.owns_group(app.ticket_group(target_ticket_id))
    OR (app.session_role() = 'MEMBER' AND EXISTS (
      SELECT 1 FROM tickets t
      WHERE t.id = target_ticket_id AND t.member_id = app.session_user_id()
    ))
$$;

CREATE FUNCTION app.installment_ticket(target_installment_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT ticket_id FROM installments WHERE id = target_installment_id
$$;

CREATE FUNCTION app.member_organizer() RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT organizer_id FROM users WHERE id = app.session_user_id()
$$;

ALTER TABLE "chit_groups" ENABLE ROW LEVEL SECURITY;
CREATE POLICY chit_groups_read ON "chit_groups" FOR SELECT
  USING (app.can_read_group(id));
CREATE POLICY chit_groups_write ON "chit_groups" FOR ALL
  USING (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()))
  WITH CHECK (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()));

ALTER TABLE "tickets" ENABLE ROW LEVEL SECURITY;
CREATE POLICY tickets_read ON "tickets" FOR SELECT
  USING (app.can_read_group(group_id));
CREATE POLICY tickets_write ON "tickets" FOR ALL
  USING (app.is_privileged() OR app.owns_group(group_id))
  WITH CHECK (app.is_privileged() OR app.owns_group(group_id));

ALTER TABLE "installments" ENABLE ROW LEVEL SECURITY;
CREATE POLICY installments_read ON "installments" FOR SELECT
  USING (app.can_read_ticket(ticket_id));
CREATE POLICY installments_write ON "installments" FOR ALL
  USING (app.is_privileged() OR app.owns_group(app.ticket_group(ticket_id)))
  WITH CHECK (app.is_privileged() OR app.owns_group(app.ticket_group(ticket_id)));

ALTER TABLE "payment_records" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_records_read ON "payment_records" FOR SELECT
  USING (app.can_read_ticket(app.installment_ticket(installment_id)));
CREATE POLICY payment_records_write ON "payment_records" FOR ALL
  USING (app.is_privileged() OR app.owns_group(app.ticket_group(app.installment_ticket(installment_id))))
  WITH CHECK (app.is_privileged() OR app.owns_group(app.ticket_group(app.installment_ticket(installment_id))));

ALTER TABLE "payouts" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payouts_read ON "payouts" FOR SELECT
  USING (app.can_read_group(group_id));
CREATE POLICY payouts_write ON "payouts" FOR ALL
  USING (app.is_privileged() OR app.owns_group(group_id))
  WITH CHECK (app.is_privileged() OR app.owns_group(group_id));

ALTER TABLE "announcements" ENABLE ROW LEVEL SECURITY;
CREATE POLICY announcements_read ON "announcements" FOR SELECT
  USING (
    app.is_privileged()
    OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id())
    OR (app.session_role() = 'MEMBER' AND (
      (group_id IS NULL AND organizer_id = app.member_organizer())
      OR (group_id IS NOT NULL AND app.can_read_group(group_id))
    ))
  );
CREATE POLICY announcements_write ON "announcements" FOR ALL
  USING (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()))
  WITH CHECK (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()));

ALTER TABLE "chit_plan_templates" ENABLE ROW LEVEL SECURITY;
CREATE POLICY chit_plan_templates_access ON "chit_plan_templates" FOR ALL
  USING (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()))
  WITH CHECK (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()));

CREATE FUNCTION app.owns_template(target_template_id uuid) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, pg_temp AS $$
  SELECT app.session_role() = 'ORGANIZER' AND EXISTS (
    SELECT 1 FROM chit_plan_templates t
    WHERE t.id = target_template_id AND t.organizer_id = app.session_user_id()
  )
$$;

ALTER TABLE "chit_plan_template_months" ENABLE ROW LEVEL SECURITY;
CREATE POLICY chit_plan_template_months_access ON "chit_plan_template_months" FOR ALL
  USING (app.is_privileged() OR app.owns_template(template_id))
  WITH CHECK (app.is_privileged() OR app.owns_template(template_id));

ALTER TABLE "chit_group_months" ENABLE ROW LEVEL SECURITY;
CREATE POLICY chit_group_months_read ON "chit_group_months" FOR SELECT
  USING (app.can_read_group(group_id));
CREATE POLICY chit_group_months_write ON "chit_group_months" FOR ALL
  USING (app.is_privileged() OR app.owns_group(group_id))
  WITH CHECK (app.is_privileged() OR app.owns_group(group_id));
