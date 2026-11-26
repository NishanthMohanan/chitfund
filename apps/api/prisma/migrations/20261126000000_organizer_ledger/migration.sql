-- Organizer-only ledger: members without logins, payment-mode master, ticket
-- holders, and ticket-level payments settled oldest-due-first (no installment rows).

DROP POLICY payment_records_read ON "payment_records";
DROP POLICY payment_records_write ON "payment_records";
DROP FUNCTION app.installment_ticket(uuid);

-- DropForeignKey
ALTER TABLE "tickets" DROP CONSTRAINT "tickets_member_id_fkey";

-- DropForeignKey
ALTER TABLE "installments" DROP CONSTRAINT "installments_ticket_id_fkey";

-- DropForeignKey
ALTER TABLE "payment_records" DROP CONSTRAINT "payment_records_installment_id_fkey";

-- DropIndex
DROP INDEX "payment_records_installment_id_idx";

-- DropIndex
DROP INDEX "payment_records_marked_at_idx";

-- AlterTable
ALTER TABLE "payment_records" DROP COLUMN "installment_id",
DROP COLUMN "mode",
ADD COLUMN     "mode_id" UUID NOT NULL,
ADD COLUMN     "paid_on" TIMESTAMPTZ(3) NOT NULL,
ADD COLUMN     "payer_member_id" UUID NOT NULL,
ADD COLUMN     "ticket_id" UUID NOT NULL;

-- AlterTable
ALTER TABLE "payouts" ADD COLUMN     "mode_id" UUID,
ADD COLUMN     "reference" VARCHAR(120);

-- DropTable
DROP TABLE "installments";

-- DropEnum
DROP TYPE "PaymentMode";

-- DropEnum
DROP TYPE "InstallmentStatus";

-- CreateTable
CREATE TABLE "members" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "organizer_id" UUID NOT NULL,
    "name" VARCHAR(120) NOT NULL,
    "phone" VARCHAR(16) NOT NULL,
    "phone_verified" BOOLEAN NOT NULL DEFAULT false,
    "address" VARCHAR(500),
    "id_proof_type" VARCHAR(60),
    "id_proof_number" VARCHAR(60),
    "nominee_name" VARCHAR(120),
    "nominee_phone" VARCHAR(16),
    "notes" VARCHAR(1000),

    CONSTRAINT "members_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payment_modes" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMPTZ(3) NOT NULL,
    "organizer_id" UUID NOT NULL,
    "name" VARCHAR(60) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "payment_modes_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ticket_holders" (
    "id" UUID NOT NULL,
    "created_at" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "ticket_id" UUID NOT NULL,
    "member_id" UUID NOT NULL,
    "from_month" INTEGER NOT NULL,
    "left_at" TIMESTAMPTZ(3),
    "left_reason" VARCHAR(500),

    CONSTRAINT "ticket_holders_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "members_organizer_id_name_idx" ON "members"("organizer_id", "name");

-- CreateIndex
CREATE UNIQUE INDEX "members_organizer_id_phone_key" ON "members"("organizer_id", "phone");

-- CreateIndex
CREATE UNIQUE INDEX "payment_modes_organizer_id_name_key" ON "payment_modes"("organizer_id", "name");

-- CreateIndex
CREATE INDEX "ticket_holders_ticket_id_idx" ON "ticket_holders"("ticket_id");

-- CreateIndex
CREATE INDEX "ticket_holders_member_id_idx" ON "ticket_holders"("member_id");

-- CreateIndex
CREATE INDEX "payment_records_ticket_id_reversed_at_idx" ON "payment_records"("ticket_id", "reversed_at");

-- CreateIndex
CREATE INDEX "payment_records_paid_on_idx" ON "payment_records"("paid_on");

-- AddForeignKey
ALTER TABLE "members" ADD CONSTRAINT "members_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_modes" ADD CONSTRAINT "payment_modes_organizer_id_fkey" FOREIGN KEY ("organizer_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "tickets" ADD CONSTRAINT "tickets_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_holders" ADD CONSTRAINT "ticket_holders_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ticket_holders" ADD CONSTRAINT "ticket_holders_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_ticket_id_fkey" FOREIGN KEY ("ticket_id") REFERENCES "tickets"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_payer_member_id_fkey" FOREIGN KEY ("payer_member_id") REFERENCES "members"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payment_records" ADD CONSTRAINT "payment_records_mode_id_fkey" FOREIGN KEY ("mode_id") REFERENCES "payment_modes"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payouts" ADD CONSTRAINT "payouts_mode_id_fkey" FOREIGN KEY ("mode_id") REFERENCES "payment_modes"("id") ON DELETE SET NULL ON UPDATE CASCADE;


-- ---------------------------------------------------------------------------
-- Integrity and RLS for the new and changed tables
-- ---------------------------------------------------------------------------

CREATE TRIGGER ticket_holders_no_delete
  BEFORE DELETE ON "ticket_holders"
  FOR EACH ROW EXECUTE FUNCTION app.reject_modification();

CREATE POLICY payment_records_read ON "payment_records" FOR SELECT
  USING (app.can_read_ticket(ticket_id));
CREATE POLICY payment_records_write ON "payment_records" FOR ALL
  USING (app.is_privileged() OR app.owns_group(app.ticket_group(ticket_id)))
  WITH CHECK (app.is_privileged() OR app.owns_group(app.ticket_group(ticket_id)));

ALTER TABLE "members" ENABLE ROW LEVEL SECURITY;
CREATE POLICY members_access ON "members" FOR ALL
  USING (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()))
  WITH CHECK (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()));

ALTER TABLE "payment_modes" ENABLE ROW LEVEL SECURITY;
CREATE POLICY payment_modes_access ON "payment_modes" FOR ALL
  USING (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()))
  WITH CHECK (app.is_privileged() OR (app.session_role() = 'ORGANIZER' AND organizer_id = app.session_user_id()));

ALTER TABLE "ticket_holders" ENABLE ROW LEVEL SECURITY;
CREATE POLICY ticket_holders_access ON "ticket_holders" FOR ALL
  USING (app.is_privileged() OR app.owns_group(app.ticket_group(ticket_id)))
  WITH CHECK (app.is_privileged() OR app.owns_group(app.ticket_group(ticket_id)));
