-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "GymStatus" AS ENUM ('PENDING', 'ACTIVE', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "SubscriptionStatus" AS ENUM ('NOT_CONFIGURED', 'TRIAL', 'ACTIVE', 'PAST_DUE', 'EXPIRED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "UserStatus" AS ENUM ('ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "GymRole" AS ENUM ('OWNER', 'MANAGER', 'STAFF', 'TRAINER');

-- CreateEnum
CREATE TYPE "GymUserStatus" AS ENUM ('INVITED', 'ACTIVE', 'SUSPENDED');

-- CreateEnum
CREATE TYPE "MemberGender" AS ENUM ('MALE', 'FEMALE', 'OTHER', 'UNSPECIFIED');

-- CreateEnum
CREATE TYPE "MemberStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "ShiftCategory" AS ENUM ('GENTS', 'LADIES', 'MIXED');

-- CreateEnum
CREATE TYPE "AttendanceStatus" AS ENUM ('PRESENT', 'ABSENT');

-- CreateEnum
CREATE TYPE "WalletType" AS ENUM ('CASH', 'DIGITAL', 'BANK', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "ExpenseCategory" AS ENUM ('RENT', 'SALARIES', 'UTILITIES', 'EQUIPMENT', 'MAINTENANCE', 'CLEANING', 'MARKETING', 'SUPPLIES', 'OTHER');

-- CreateEnum
CREATE TYPE "CashSessionStatus" AS ENUM ('OPEN', 'CLOSED');

-- CreateEnum
CREATE TYPE "CashMovementSide" AS ENUM ('SOURCE', 'DESTINATION');

-- CreateEnum
CREATE TYPE "AuditAction" AS ENUM ('MEMBER_CREATED', 'MEMBER_UPDATED', 'MEMBER_ARCHIVED', 'ROLE_CHANGED', 'FINANCIAL_TRANSACTION_CREATED', 'FINANCIAL_TRANSACTION_REVERSED', 'PAYMENT_RECORDED', 'EXPENSE_RECORDED', 'CASH_SESSION_OPENED', 'CASH_SESSION_CLOSED', 'GYM_SETTINGS_UPDATED', 'GYM_STATUS_CHANGED', 'ADMIN_ACTION');

-- CreateTable
CREATE TABLE "Gym" (
    "id" UUID NOT NULL,
    "name" VARCHAR(160) NOT NULL,
    "slug" VARCHAR(100) NOT NULL,
    "contactEmail" VARCHAR(320),
    "contactPhone" VARCHAR(40),
    "website" VARCHAR(255),
    "address" TEXT,
    "status" "GymStatus" NOT NULL DEFAULT 'PENDING',
    "subscriptionStatus" "SubscriptionStatus" NOT NULL DEFAULT 'NOT_CONFIGURED',
    "subscriptionPlanName" VARCHAR(100),
    "trialEndsAt" TIMESTAMPTZ(3),
    "subscriptionExpiresAt" TIMESTAMPTZ(3),
    "subscriptionAdminNotes" TEXT,
    "memberRollPrefix" VARCHAR(20) NOT NULL DEFAULT 'GF',
    "nextMemberRollNumber" INTEGER NOT NULL DEFAULT 1001,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Gym_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" UUID NOT NULL,
    "email" VARCHAR(320) NOT NULL,
    "passwordHash" VARCHAR(255) NOT NULL,
    "firstName" VARCHAR(100) NOT NULL,
    "lastName" VARCHAR(100),
    "status" "UserStatus" NOT NULL DEFAULT 'ACTIVE',
    "emailVerifiedAt" TIMESTAMPTZ(3),
    "lastLoginAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymUser" (
    "gymId" UUID NOT NULL,
    "userId" UUID NOT NULL,
    "role" "GymRole" NOT NULL,
    "status" "GymUserStatus" NOT NULL DEFAULT 'INVITED',
    "invitedAt" TIMESTAMPTZ(3),
    "joinedAt" TIMESTAMPTZ(3),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GymUser_pkey" PRIMARY KEY ("gymId","userId")
);

-- CreateTable
CREATE TABLE "Member" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "rollNo" VARCHAR(40) NOT NULL,
    "fullName" VARCHAR(200) NOT NULL,
    "phone" VARCHAR(40),
    "email" VARCHAR(320),
    "gender" "MemberGender" NOT NULL DEFAULT 'UNSPECIFIED',
    "status" "MemberStatus" NOT NULL DEFAULT 'ACTIVE',
    "membershipPlanId" UUID,
    "membershipFee" DECIMAL(12,2) NOT NULL,
    "membershipStartDate" DATE,
    "membershipExpiresAt" DATE,
    "nextDueDate" DATE,
    "notes" TEXT,
    "archivedAt" TIMESTAMPTZ(3),
    "createdByUserId" UUID,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Member_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipPlan" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "description" TEXT,
    "durationDays" INTEGER NOT NULL,
    "fee" DECIMAL(12,2) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "MembershipPlan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Shift" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "category" "ShiftCategory" NOT NULL,
    "startTime" VARCHAR(5),
    "endTime" VARCHAR(5),
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Shift_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Attendance" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "shiftId" UUID,
    "markedByUserId" UUID,
    "attendanceDate" DATE NOT NULL,
    "checkedInAt" TIMESTAMPTZ(3),
    "status" "AttendanceStatus" NOT NULL DEFAULT 'PRESENT',
    "isManual" BOOLEAN NOT NULL DEFAULT false,
    "manuallyEdited" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Attendance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Wallet" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "name" VARCHAR(100) NOT NULL,
    "type" "WalletType" NOT NULL DEFAULT 'CASH',
    "openingBalance" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Wallet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "destinationWalletId" UUID,
    "createdByUserId" UUID,
    "reversalOfId" UUID,
    "type" "TransactionType" NOT NULL,
    "reference" VARCHAR(80) NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "amount" DECIMAL(12,2) NOT NULL,
    "currency" VARCHAR(3) NOT NULL,
    "paymentMethod" VARCHAR(60),
    "source" VARCHAR(40),
    "counterparty" VARCHAR(200),
    "transactionDate" DATE NOT NULL,
    "notes" TEXT,
    "reversedAt" TIMESTAMPTZ(3),
    "reversalReason" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Payment" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "memberId" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "membershipPlanId" UUID,
    "recordedByUserId" UUID,
    "membershipPeriodStart" DATE,
    "membershipPeriodEnd" DATE,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Payment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Expense" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "recordedByUserId" UUID,
    "category" "ExpenseCategory" NOT NULL DEFAULT 'OTHER',
    "vendor" VARCHAR(200),
    "receiptReference" VARCHAR(100),
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Expense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSession" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "openedByUserId" UUID NOT NULL,
    "closedByUserId" UUID,
    "status" "CashSessionStatus" NOT NULL DEFAULT 'OPEN',
    "openingBalance" DECIMAL(12,2) NOT NULL,
    "expectedClosing" DECIMAL(12,2),
    "actualClosing" DECIMAL(12,2),
    "discrepancy" DECIMAL(12,2),
    "openedAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "closedAt" TIMESTAMPTZ(3),
    "notes" TEXT,
    "closingNotes" TEXT,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "CashSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashSessionMovement" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "cashSessionId" UUID NOT NULL,
    "transactionId" UUID NOT NULL,
    "walletId" UUID NOT NULL,
    "side" "CashMovementSide" NOT NULL,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CashSessionMovement_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GymSettings" (
    "gymId" UUID NOT NULL,
    "currency" VARCHAR(3) NOT NULL DEFAULT 'PKR',
    "timezone" VARCHAR(64) NOT NULL DEFAULT 'Asia/Karachi',
    "dateFormat" VARCHAR(20) NOT NULL DEFAULT 'DD/MM/YYYY',
    "language" VARCHAR(40) NOT NULL DEFAULT 'English',
    "openingTime" VARCHAR(5),
    "closingTime" VARCHAR(5),
    "paymentMethods" TEXT[] DEFAULT ARRAY['Cash', 'JazzCash', 'EasyPaisa', 'Bank Transfer']::TEXT[],
    "receiptPrefix" VARCHAR(20) NOT NULL DEFAULT 'GF',
    "allowPartialPayments" BOOLEAN NOT NULL DEFAULT true,
    "requirePaymentNotes" BOOLEAN NOT NULL DEFAULT false,
    "allowManualAttendance" BOOLEAN NOT NULL DEFAULT true,
    "preventDuplicateCheckin" BOOLEAN NOT NULL DEFAULT true,
    "notifications" BOOLEAN NOT NULL DEFAULT true,
    "lowBalanceWarning" BOOLEAN NOT NULL DEFAULT true,
    "lowBalanceLimit" DECIMAL(12,2) NOT NULL DEFAULT 5000,
    "autoSave" BOOLEAN NOT NULL DEFAULT true,
    "compactTables" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMPTZ(3) NOT NULL,

    CONSTRAINT "GymSettings_pkey" PRIMARY KEY ("gymId")
);

-- CreateTable
CREATE TABLE "AuditLog" (
    "id" UUID NOT NULL,
    "gymId" UUID NOT NULL,
    "actorUserId" UUID,
    "action" "AuditAction" NOT NULL,
    "targetType" VARCHAR(80) NOT NULL,
    "targetId" VARCHAR(100),
    "changedFields" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMPTZ(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Gym_slug_key" ON "Gym"("slug");

-- CreateIndex
CREATE INDEX "Gym_status_createdAt_idx" ON "Gym"("status", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_status_idx" ON "User"("status");

-- CreateIndex
CREATE INDEX "GymUser_userId_status_idx" ON "GymUser"("userId", "status");

-- CreateIndex
CREATE INDEX "GymUser_gymId_role_status_idx" ON "GymUser"("gymId", "role", "status");

-- CreateIndex
CREATE INDEX "Member_gymId_status_fullName_idx" ON "Member"("gymId", "status", "fullName");

-- CreateIndex
CREATE INDEX "Member_gymId_nextDueDate_idx" ON "Member"("gymId", "nextDueDate");

-- CreateIndex
CREATE INDEX "Member_gymId_membershipPlanId_idx" ON "Member"("gymId", "membershipPlanId");

-- CreateIndex
CREATE INDEX "Member_gymId_createdAt_idx" ON "Member"("gymId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Member_gymId_id_key" ON "Member"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Member_gymId_rollNo_key" ON "Member"("gymId", "rollNo");

-- CreateIndex
CREATE INDEX "MembershipPlan_gymId_isActive_idx" ON "MembershipPlan"("gymId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_gymId_id_key" ON "MembershipPlan"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipPlan_gymId_name_key" ON "MembershipPlan"("gymId", "name");

-- CreateIndex
CREATE INDEX "Shift_gymId_category_isActive_idx" ON "Shift"("gymId", "category", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_gymId_id_key" ON "Shift"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Shift_gymId_name_key" ON "Shift"("gymId", "name");

-- CreateIndex
CREATE INDEX "Attendance_gymId_attendanceDate_idx" ON "Attendance"("gymId", "attendanceDate");

-- CreateIndex
CREATE INDEX "Attendance_gymId_memberId_attendanceDate_idx" ON "Attendance"("gymId", "memberId", "attendanceDate");

-- CreateIndex
CREATE INDEX "Attendance_gymId_shiftId_attendanceDate_idx" ON "Attendance"("gymId", "shiftId", "attendanceDate");

-- CreateIndex
CREATE INDEX "Attendance_gymId_status_attendanceDate_idx" ON "Attendance"("gymId", "status", "attendanceDate");

-- CreateIndex
CREATE UNIQUE INDEX "Attendance_gymId_id_key" ON "Attendance"("gymId", "id");

-- CreateIndex
CREATE INDEX "Wallet_gymId_type_isActive_idx" ON "Wallet"("gymId", "type", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_gymId_id_key" ON "Wallet"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Wallet_gymId_name_key" ON "Wallet"("gymId", "name");

-- CreateIndex
CREATE INDEX "Transaction_gymId_transactionDate_idx" ON "Transaction"("gymId", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_gymId_type_transactionDate_idx" ON "Transaction"("gymId", "type", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_gymId_walletId_transactionDate_idx" ON "Transaction"("gymId", "walletId", "transactionDate");

-- CreateIndex
CREATE INDEX "Transaction_gymId_createdByUserId_createdAt_idx" ON "Transaction"("gymId", "createdByUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_gymId_id_key" ON "Transaction"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_gymId_reference_key" ON "Transaction"("gymId", "reference");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_gymId_reversalOfId_key" ON "Transaction"("gymId", "reversalOfId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_transactionId_key" ON "Payment"("transactionId");

-- CreateIndex
CREATE INDEX "Payment_gymId_memberId_createdAt_idx" ON "Payment"("gymId", "memberId", "createdAt");

-- CreateIndex
CREATE INDEX "Payment_gymId_membershipPlanId_idx" ON "Payment"("gymId", "membershipPlanId");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gymId_id_key" ON "Payment"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Payment_gymId_transactionId_key" ON "Payment"("gymId", "transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_transactionId_key" ON "Expense"("transactionId");

-- CreateIndex
CREATE INDEX "Expense_gymId_category_createdAt_idx" ON "Expense"("gymId", "category", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_gymId_id_key" ON "Expense"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "Expense_gymId_transactionId_key" ON "Expense"("gymId", "transactionId");

-- CreateIndex
CREATE INDEX "CashSession_gymId_status_openedAt_idx" ON "CashSession"("gymId", "status", "openedAt");

-- CreateIndex
CREATE INDEX "CashSession_gymId_walletId_openedAt_idx" ON "CashSession"("gymId", "walletId", "openedAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashSession_gymId_id_key" ON "CashSession"("gymId", "id");

-- CreateIndex
CREATE INDEX "CashSessionMovement_gymId_cashSessionId_createdAt_idx" ON "CashSessionMovement"("gymId", "cashSessionId", "createdAt");

-- CreateIndex
CREATE INDEX "CashSessionMovement_gymId_walletId_createdAt_idx" ON "CashSessionMovement"("gymId", "walletId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "CashSessionMovement_gymId_id_key" ON "CashSessionMovement"("gymId", "id");

-- CreateIndex
CREATE UNIQUE INDEX "CashSessionMovement_gymId_transactionId_side_key" ON "CashSessionMovement"("gymId", "transactionId", "side");

-- CreateIndex
CREATE INDEX "AuditLog_gymId_createdAt_idx" ON "AuditLog"("gymId", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_gymId_action_createdAt_idx" ON "AuditLog"("gymId", "action", "createdAt");

-- CreateIndex
CREATE INDEX "AuditLog_gymId_targetType_targetId_idx" ON "AuditLog"("gymId", "targetType", "targetId");

-- CreateIndex
CREATE INDEX "AuditLog_actorUserId_createdAt_idx" ON "AuditLog"("actorUserId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "AuditLog_gymId_id_key" ON "AuditLog"("gymId", "id");

-- AddForeignKey
ALTER TABLE "GymUser" ADD CONSTRAINT "GymUser_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GymUser" ADD CONSTRAINT "GymUser_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_gymId_membershipPlanId_fkey" FOREIGN KEY ("gymId", "membershipPlanId") REFERENCES "MembershipPlan"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Member" ADD CONSTRAINT "Member_gymId_createdByUserId_fkey" FOREIGN KEY ("gymId", "createdByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_gymId_memberId_fkey" FOREIGN KEY ("gymId", "memberId") REFERENCES "Member"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_gymId_shiftId_fkey" FOREIGN KEY ("gymId", "shiftId") REFERENCES "Shift"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Attendance" ADD CONSTRAINT "Attendance_gymId_markedByUserId_fkey" FOREIGN KEY ("gymId", "markedByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gymId_walletId_fkey" FOREIGN KEY ("gymId", "walletId") REFERENCES "Wallet"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gymId_destinationWalletId_fkey" FOREIGN KEY ("gymId", "destinationWalletId") REFERENCES "Wallet"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gymId_createdByUserId_fkey" FOREIGN KEY ("gymId", "createdByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_gymId_reversalOfId_fkey" FOREIGN KEY ("gymId", "reversalOfId") REFERENCES "Transaction"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_memberId_fkey" FOREIGN KEY ("gymId", "memberId") REFERENCES "Member"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_transactionId_fkey" FOREIGN KEY ("gymId", "transactionId") REFERENCES "Transaction"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_membershipPlanId_fkey" FOREIGN KEY ("gymId", "membershipPlanId") REFERENCES "MembershipPlan"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Payment" ADD CONSTRAINT "Payment_gymId_recordedByUserId_fkey" FOREIGN KEY ("gymId", "recordedByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_gymId_transactionId_fkey" FOREIGN KEY ("gymId", "transactionId") REFERENCES "Transaction"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "Expense" ADD CONSTRAINT "Expense_gymId_recordedByUserId_fkey" FOREIGN KEY ("gymId", "recordedByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_gymId_walletId_fkey" FOREIGN KEY ("gymId", "walletId") REFERENCES "Wallet"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_gymId_openedByUserId_fkey" FOREIGN KEY ("gymId", "openedByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_gymId_closedByUserId_fkey" FOREIGN KEY ("gymId", "closedByUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSessionMovement" ADD CONSTRAINT "CashSessionMovement_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSessionMovement" ADD CONSTRAINT "CashSessionMovement_gymId_cashSessionId_fkey" FOREIGN KEY ("gymId", "cashSessionId") REFERENCES "CashSession"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSessionMovement" ADD CONSTRAINT "CashSessionMovement_gymId_transactionId_fkey" FOREIGN KEY ("gymId", "transactionId") REFERENCES "Transaction"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "CashSessionMovement" ADD CONSTRAINT "CashSessionMovement_gymId_walletId_fkey" FOREIGN KEY ("gymId", "walletId") REFERENCES "Wallet"("gymId", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_gymId_fkey" FOREIGN KEY ("gymId") REFERENCES "Gym"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_gymId_actorUserId_fkey" FOREIGN KEY ("gymId", "actorUserId") REFERENCES "GymUser"("gymId", "userId") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- Custom PostgreSQL integrity rules not expressible in Prisma schema syntax.

ALTER TABLE "Transaction"
  ADD CONSTRAINT "Transaction_amount_positive_check" CHECK ("amount" > 0),
  ADD CONSTRAINT "Transaction_currency_format_check" CHECK ("currency" ~ '^[A-Z]{3}$'),
  ADD CONSTRAINT "Transaction_wallet_flow_check" CHECK (("type" = 'TRANSFER' AND "destinationWalletId" IS NOT NULL AND "destinationWalletId" <> "walletId") OR ("type" IN ('INCOME','EXPENSE') AND "destinationWalletId" IS NULL)),
  ADD CONSTRAINT "Transaction_reversal_fields_check" CHECK (("reversalOfId" IS NULL AND (("reversedAt" IS NULL AND "reversalReason" IS NULL) OR ("reversedAt" IS NOT NULL AND "reversalReason" IS NOT NULL AND length(btrim("reversalReason")) > 0))) OR ("reversalOfId" IS NOT NULL AND "reversedAt" IS NULL AND "reversalReason" IS NOT NULL AND length(btrim("reversalReason")) > 0));
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_fee_nonnegative_check" CHECK ("fee" >= 0);
ALTER TABLE "MembershipPlan" ADD CONSTRAINT "MembershipPlan_duration_positive_check" CHECK ("durationDays" > 0);
ALTER TABLE "Member" ADD CONSTRAINT "Member_membership_fee_nonnegative_check" CHECK ("membershipFee" >= 0);
-- Negative bank opening balances are supported for an explicitly recorded overdraft; other wallet types cannot start negative.
ALTER TABLE "Wallet" ADD CONSTRAINT "Wallet_opening_balance_check" CHECK ("type" = 'BANK' OR "openingBalance" >= 0);
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_low_balance_limit_nonnegative_check" CHECK ("lowBalanceLimit" >= 0);
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_amount_ranges_check" CHECK ("openingBalance" >= 0 AND ("actualClosing" IS NULL OR "actualClosing" >= 0));
ALTER TABLE "User"
  ADD CONSTRAINT "User_email_normalized_check" CHECK ("email" = lower(btrim("email")) AND "email" !~ '[[:space:]]' AND "email" <> ''),
  ADD CONSTRAINT "User_password_hash_check" CHECK ("passwordHash" ~ '^\$argon2(id|i|d)\$' OR "passwordHash" ~ '^\$2[aby]\$');
ALTER TABLE "Shift" ADD CONSTRAINT "Shift_time_range_check" CHECK (("startTime" IS NULL AND "endTime" IS NULL) OR ("startTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "endTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
ALTER TABLE "GymSettings" ADD CONSTRAINT "GymSettings_operating_time_range_check" CHECK (("openingTime" IS NULL AND "closingTime" IS NULL) OR ("openingTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$' AND "closingTime" ~ '^([01][0-9]|2[0-3]):[0-5][0-9]$'));
ALTER TABLE "CashSession" ADD CONSTRAINT "CashSession_status_fields_check" CHECK (("status"='OPEN' AND "closedAt" IS NULL AND "closedByUserId" IS NULL AND "expectedClosing" IS NULL AND "actualClosing" IS NULL AND "discrepancy" IS NULL) OR ("status"='CLOSED' AND "closedAt" IS NOT NULL AND "closedByUserId" IS NOT NULL AND "expectedClosing" IS NOT NULL AND "actualClosing" IS NOT NULL AND "discrepancy" IS NOT NULL AND "discrepancy"="actualClosing"-"expectedClosing" AND "closedAt">="openedAt"));

CREATE UNIQUE INDEX "CashSession_one_open_per_wallet_key" ON "CashSession"("gymId","walletId") WHERE "status"='OPEN';

-- Lock wallet rows for transaction inserts; wallet type/state cannot race a cash movement.
CREATE OR REPLACE FUNCTION gymflow_validate_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE src "Wallet"%ROWTYPE; dst "Wallet"%ROWTYPE; p "Transaction"%ROWTYPE;
BEGIN
  NEW."createdAt" := clock_timestamp();
  PERFORM 1 FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id" IN (NEW."walletId",NEW."destinationWalletId") ORDER BY "id" FOR SHARE;
  SELECT * INTO src FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id"=NEW."walletId";
  IF NOT FOUND OR NOT src."isActive" THEN RAISE EXCEPTION 'Transaction source wallet must exist and be active'; END IF;
  IF NEW."destinationWalletId" IS NOT NULL THEN
    SELECT * INTO dst FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id"=NEW."destinationWalletId";
    IF NOT FOUND OR NOT dst."isActive" THEN RAISE EXCEPTION 'Transaction destination wallet must exist and be active'; END IF;
  END IF;
  -- Lock all affected open sessions in a stable order to avoid transfer deadlocks.
  PERFORM 1 FROM "CashSession" cs WHERE cs."gymId"=NEW."gymId" AND cs."status"='OPEN'
    AND ((src."type"='CASH' AND cs."walletId"=src."id") OR (NEW."destinationWalletId" IS NOT NULL AND dst."type"='CASH' AND cs."walletId"=dst."id"))
    ORDER BY cs."id" FOR UPDATE;
  IF NEW."reversalOfId" IS NULL THEN
    IF NEW."reversedAt" IS NOT NULL OR NEW."reversalReason" IS NOT NULL THEN RAISE EXCEPTION 'Only linked reversals may carry reversal fields'; END IF;
  ELSE
    SELECT * INTO p FROM "Transaction" WHERE "gymId"=NEW."gymId" AND "id"=NEW."reversalOfId" FOR UPDATE;
    IF NOT FOUND OR p."reversalOfId" IS NOT NULL OR p."reversedAt" IS NOT NULL THEN RAISE EXCEPTION 'Invalid or repeated reversal'; END IF;
    IF NEW."reversalReason" IS NULL OR length(btrim(NEW."reversalReason"))=0 OR NEW."amount"<>p."amount" OR NEW."currency"<>p."currency" THEN RAISE EXCEPTION 'Reversal needs a reason and must match original amount/currency'; END IF;
    IF NOT ((p."type"='INCOME' AND NEW."type"='EXPENSE' AND NEW."walletId"=p."walletId" AND NEW."destinationWalletId" IS NULL) OR (p."type"='EXPENSE' AND NEW."type"='INCOME' AND NEW."walletId"=p."walletId" AND NEW."destinationWalletId" IS NULL) OR (p."type"='TRANSFER' AND NEW."type"='TRANSFER' AND NEW."walletId"=p."destinationWalletId" AND NEW."destinationWalletId"=p."walletId")) THEN RAISE EXCEPTION 'Reversal must exactly counter original wallet flow'; END IF;
    UPDATE "Transaction" SET "reversedAt"=clock_timestamp(),"reversalReason"=NEW."reversalReason","updatedAt"=clock_timestamp() WHERE "gymId"=p."gymId" AND "id"=p."id";
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Transaction_validate_insert" BEFORE INSERT ON "Transaction" FOR EACH ROW EXECUTE FUNCTION gymflow_validate_transaction();
CREATE OR REPLACE FUNCTION gymflow_protect_transaction() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Ledger transactions cannot be deleted'; END IF;
  IF (to_jsonb(NEW)-ARRAY['reversedAt','reversalReason','updatedAt']) IS DISTINCT FROM (to_jsonb(OLD)-ARRAY['reversedAt','reversalReason','updatedAt']) THEN RAISE EXCEPTION 'Ledger facts are immutable; record a reversal'; END IF;
  IF pg_trigger_depth()<2 OR OLD."reversedAt" IS NOT NULL OR NEW."reversedAt" IS NULL OR NEW."reversalReason" IS NULL THEN RAISE EXCEPTION 'Reversal markers can only be set once by a linked reversal'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Transaction_protect_ledger" BEFORE UPDATE OR DELETE ON "Transaction" FOR EACH ROW EXECUTE FUNCTION gymflow_protect_transaction();

-- A transaction must carry one session movement for every CASH wallet leg.
CREATE OR REPLACE FUNCTION gymflow_assert_cash_movements() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE st "WalletType"; dt "WalletType";
BEGIN
  SELECT "type" INTO st FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id"=NEW."walletId";
  IF st='CASH' AND NOT EXISTS (SELECT 1 FROM "CashSessionMovement" WHERE "gymId"=NEW."gymId" AND "transactionId"=NEW."id" AND "side"='SOURCE' AND "walletId"=NEW."walletId") THEN RAISE EXCEPTION 'Cash source wallet movement must be attached to an open cash session'; END IF;
  IF st<>'CASH' AND EXISTS (SELECT 1 FROM "CashSessionMovement" WHERE "gymId"=NEW."gymId" AND "transactionId"=NEW."id" AND "side"='SOURCE') THEN RAISE EXCEPTION 'Non-cash source wallet cannot have cash-session movement'; END IF;
  IF NEW."destinationWalletId" IS NOT NULL THEN
    SELECT "type" INTO dt FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id"=NEW."destinationWalletId";
    IF dt='CASH' AND NOT EXISTS (SELECT 1 FROM "CashSessionMovement" WHERE "gymId"=NEW."gymId" AND "transactionId"=NEW."id" AND "side"='DESTINATION' AND "walletId"=NEW."destinationWalletId") THEN RAISE EXCEPTION 'Cash destination wallet movement must be attached to an open cash session'; END IF;
    IF dt<>'CASH' AND EXISTS (SELECT 1 FROM "CashSessionMovement" WHERE "gymId"=NEW."gymId" AND "transactionId"=NEW."id" AND "side"='DESTINATION') THEN RAISE EXCEPTION 'Non-cash destination wallet cannot have cash-session movement'; END IF;
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER "Transaction_cash_movements_deferred" AFTER INSERT ON "Transaction" DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION gymflow_assert_cash_movements();

CREATE OR REPLACE FUNCTION gymflow_validate_cash_movement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t "Transaction"%ROWTYPE; s "CashSession"%ROWTYPE; w "Wallet"%ROWTYPE;
BEGIN
  IF TG_OP<>'INSERT' THEN RAISE EXCEPTION 'Cash-session movements are immutable ledger history'; END IF;
  NEW."createdAt":=clock_timestamp();
  SELECT * INTO t FROM "Transaction" WHERE "gymId"=NEW."gymId" AND "id"=NEW."transactionId" FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cash movement requires a transaction in the same gym'; END IF;
  SELECT * INTO s FROM "CashSession" WHERE "gymId"=NEW."gymId" AND "id"=NEW."cashSessionId" FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Cash movement session must exist in the same gym'; END IF;
  IF s."status"<>'OPEN' THEN RAISE EXCEPTION 'Cash movements require an open session'; END IF;
  SELECT * INTO w FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id"=NEW."walletId" FOR SHARE;
  IF NOT FOUND OR w."type"<>'CASH' OR NOT w."isActive" OR s."walletId"<>w."id" THEN RAISE EXCEPTION 'Movement wallet must be the active CASH wallet for its session'; END IF;
  IF t."createdAt"<s."openedAt" THEN RAISE EXCEPTION 'Transaction predates the cash session'; END IF;
  IF NEW."side"='SOURCE' AND t."walletId"<>NEW."walletId" THEN RAISE EXCEPTION 'SOURCE movement wallet does not match transaction'; END IF;
  IF NEW."side"='DESTINATION' AND (t."type"<>'TRANSFER' OR t."destinationWalletId"<>NEW."walletId") THEN RAISE EXCEPTION 'DESTINATION movement requires matching transfer destination'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "CashSessionMovement_validate" BEFORE INSERT OR UPDATE OR DELETE ON "CashSessionMovement" FOR EACH ROW EXECUTE FUNCTION gymflow_validate_cash_movement();

CREATE OR REPLACE FUNCTION gymflow_check_payment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t "Transaction"%ROWTYPE;
BEGIN
  SELECT * INTO t FROM "Transaction" WHERE "gymId"=NEW."gymId" AND "id"=NEW."transactionId" FOR UPDATE;
  IF NOT FOUND OR t."type"<>'INCOME' OR t."reversedAt" IS NOT NULL OR t."reversalOfId" IS NOT NULL OR EXISTS(SELECT 1 FROM "Expense" WHERE "gymId"=NEW."gymId" AND "transactionId"=NEW."transactionId") THEN RAISE EXCEPTION 'Payment requires an unclaimed, unreversed INCOME transaction'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Payment_validate_transaction" BEFORE INSERT OR UPDATE ON "Payment" FOR EACH ROW EXECUTE FUNCTION gymflow_check_payment();
CREATE OR REPLACE FUNCTION gymflow_check_expense() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE t "Transaction"%ROWTYPE;
BEGIN
  SELECT * INTO t FROM "Transaction" WHERE "gymId"=NEW."gymId" AND "id"=NEW."transactionId" FOR UPDATE;
  IF NOT FOUND OR t."type"<>'EXPENSE' OR t."reversedAt" IS NOT NULL OR t."reversalOfId" IS NOT NULL OR EXISTS(SELECT 1 FROM "Payment" WHERE "gymId"=NEW."gymId" AND "transactionId"=NEW."transactionId") THEN RAISE EXCEPTION 'Expense requires an unclaimed, unreversed EXPENSE transaction'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Expense_validate_transaction" BEFORE INSERT OR UPDATE ON "Expense" FOR EACH ROW EXECUTE FUNCTION gymflow_check_expense();
CREATE OR REPLACE FUNCTION gymflow_preserve_financial_detail() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Financial detail history cannot be deleted'; END $$;
CREATE TRIGGER "Payment_preserve_history" BEFORE DELETE ON "Payment" FOR EACH ROW EXECUTE FUNCTION gymflow_preserve_financial_detail();
CREATE TRIGGER "Expense_preserve_history" BEFORE DELETE ON "Expense" FOR EACH ROW EXECUTE FUNCTION gymflow_preserve_financial_detail();

CREATE OR REPLACE FUNCTION gymflow_validate_cash_session() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE wt "WalletType"; active_wallet BOOLEAN; movement_total DECIMAL(12,2);
BEGIN
  IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Cash session history cannot be deleted'; END IF;
  IF TG_OP='INSERT' THEN
    IF NEW."status"<>'OPEN' THEN RAISE EXCEPTION 'Cash sessions must be opened before closing'; END IF;
    SELECT "type","isActive" INTO wt,active_wallet FROM "Wallet" WHERE "gymId"=NEW."gymId" AND "id"=NEW."walletId" FOR SHARE;
    IF NOT FOUND OR wt<>'CASH' OR NOT active_wallet THEN RAISE EXCEPTION 'Cash session requires an active CASH wallet'; END IF;
    NEW."openedAt":=clock_timestamp();
    RETURN NEW;
  END IF;
  IF OLD."status"='OPEN' AND NEW."status"='OPEN' THEN
    IF (NEW."gymId",NEW."walletId",NEW."openedByUserId",NEW."openingBalance",NEW."openedAt") IS DISTINCT FROM (OLD."gymId",OLD."walletId",OLD."openedByUserId",OLD."openingBalance",OLD."openedAt") THEN RAISE EXCEPTION 'Cannot alter cash-session opening details'; END IF;
    RETURN NEW;
  END IF;
  IF OLD."status"='OPEN' AND NEW."status"='CLOSED' THEN
    IF (NEW."gymId",NEW."walletId",NEW."openedByUserId",NEW."openingBalance",NEW."openedAt") IS DISTINCT FROM (OLD."gymId",OLD."walletId",OLD."openedByUserId",OLD."openingBalance",OLD."openedAt") THEN RAISE EXCEPTION 'Closing cannot alter opening details'; END IF;
    IF NEW."actualClosing" IS NULL OR NEW."closedByUserId" IS NULL THEN RAISE EXCEPTION 'A closing count and closer are required'; END IF;
    SELECT COALESCE(SUM(CASE WHEN (t."type"='INCOME' AND m."side"='SOURCE') OR (t."type"='TRANSFER' AND m."side"='DESTINATION') THEN t."amount" ELSE -t."amount" END),0)
      INTO movement_total FROM "CashSessionMovement" m JOIN "Transaction" t ON t."gymId"=m."gymId" AND t."id"=m."transactionId"
      WHERE m."gymId"=OLD."gymId" AND m."cashSessionId"=OLD."id";
    NEW."expectedClosing":=NEW."openingBalance"+movement_total;
    NEW."discrepancy":=NEW."actualClosing"-NEW."expectedClosing";
    NEW."closedAt":=clock_timestamp();
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'Closed sessions are immutable and cannot be reopened';
END $$;
CREATE TRIGGER "CashSession_preserve_history" BEFORE INSERT OR UPDATE OR DELETE ON "CashSession" FOR EACH ROW EXECUTE FUNCTION gymflow_validate_cash_session();

CREATE OR REPLACE FUNCTION gymflow_protect_wallet_accounting() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."type" IS DISTINCT FROM OLD."type" AND (EXISTS(SELECT 1 FROM "Transaction" WHERE "gymId"=OLD."gymId" AND ("walletId"=OLD."id" OR "destinationWalletId"=OLD."id")) OR EXISTS(SELECT 1 FROM "CashSession" WHERE "gymId"=OLD."gymId" AND "walletId"=OLD."id")) THEN RAISE EXCEPTION 'Wallet type cannot change after financial or cash-session history exists'; END IF;
  IF NEW."openingBalance" IS DISTINCT FROM OLD."openingBalance" AND (EXISTS(SELECT 1 FROM "Transaction" WHERE "gymId"=OLD."gymId" AND ("walletId"=OLD."id" OR "destinationWalletId"=OLD."id")) OR EXISTS(SELECT 1 FROM "CashSession" WHERE "gymId"=OLD."gymId" AND "walletId"=OLD."id")) THEN RAISE EXCEPTION 'Wallet opening balance cannot change after history exists; record an adjustment transaction'; END IF;
  IF OLD."isActive" AND NOT NEW."isActive" AND EXISTS(SELECT 1 FROM "CashSession" WHERE "gymId"=OLD."gymId" AND "walletId"=OLD."id" AND "status"='OPEN') THEN RAISE EXCEPTION 'Cannot deactivate a wallet with an open cash session'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Wallet_protect_accounting" BEFORE UPDATE OF "type","openingBalance","isActive" ON "Wallet" FOR EACH ROW EXECUTE FUNCTION gymflow_protect_wallet_accounting();

CREATE OR REPLACE FUNCTION gymflow_validate_attendance() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE dups BOOLEAN; gender "MemberGender"; category "ShiftCategory"; k BIGINT;
BEGIN
  SELECT m."gender" INTO gender FROM "Member" m WHERE m."gymId"=NEW."gymId" AND m."id"=NEW."memberId" FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Attendance member must belong to this gym'; END IF;
  IF NEW."shiftId" IS NOT NULL THEN
    SELECT s."category" INTO category FROM "Shift" s WHERE s."gymId"=NEW."gymId" AND s."id"=NEW."shiftId" FOR SHARE;
    IF NOT FOUND THEN RAISE EXCEPTION 'Attendance shift must belong to this gym'; END IF;
    IF NOT (category='MIXED' OR (category='GENTS' AND gender='MALE') OR (category='LADIES' AND gender='FEMALE')) THEN RAISE EXCEPTION 'Member is not eligible for assigned shift'; END IF;
  END IF;
  SELECT "preventDuplicateCheckin" INTO dups FROM "GymSettings" WHERE "gymId"=NEW."gymId" FOR SHARE;
  IF NOT FOUND THEN dups:=TRUE; END IF;
  IF NEW."status"='PRESENT' AND dups THEN
    k:=hashtextextended(NEW."gymId"::text||':'||NEW."memberId"::text||':'||NEW."attendanceDate"::text,0);
    PERFORM pg_advisory_xact_lock(k);
    IF EXISTS(SELECT 1 FROM "Attendance" a WHERE a."gymId"=NEW."gymId" AND a."memberId"=NEW."memberId" AND a."attendanceDate"=NEW."attendanceDate" AND a."status"='PRESENT' AND a."id" IS DISTINCT FROM NEW."id") THEN RAISE EXCEPTION 'Duplicate check-in disallowed by gym settings'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Attendance_validate" BEFORE INSERT OR UPDATE ON "Attendance" FOR EACH ROW EXECUTE FUNCTION gymflow_validate_attendance();
CREATE OR REPLACE FUNCTION gymflow_validate_duplicate_setting() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW."preventDuplicateCheckin" AND NOT OLD."preventDuplicateCheckin" AND EXISTS (SELECT 1 FROM "Attendance" a WHERE a."gymId"=NEW."gymId" AND a."status"='PRESENT' GROUP BY a."memberId",a."attendanceDate" HAVING count(*)>1) THEN RAISE EXCEPTION 'Cannot enable duplicate prevention while duplicate check-ins exist'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "GymSettings_validate_duplicate_setting" BEFORE UPDATE OF "preventDuplicateCheckin" ON "GymSettings" FOR EACH ROW EXECUTE FUNCTION gymflow_validate_duplicate_setting();

CREATE OR REPLACE FUNCTION gymflow_protect_attendance_eligibility() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_TABLE_NAME='Member' THEN
    IF NEW."gender" IS DISTINCT FROM OLD."gender" AND EXISTS(SELECT 1 FROM "Attendance" WHERE "gymId"=OLD."gymId" AND "memberId"=OLD."id") THEN RAISE EXCEPTION 'Member gender cannot change after attendance history exists'; END IF;
  ELSE
    IF NEW."category" IS DISTINCT FROM OLD."category" AND EXISTS(SELECT 1 FROM "Attendance" WHERE "gymId"=OLD."gymId" AND "shiftId"=OLD."id") THEN RAISE EXCEPTION 'Shift category cannot change after attendance history exists'; END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER "Member_protect_attendance_eligibility" BEFORE UPDATE OF "gender" ON "Member" FOR EACH ROW EXECUTE FUNCTION gymflow_protect_attendance_eligibility();
CREATE TRIGGER "Shift_protect_attendance_eligibility" BEFORE UPDATE OF "category" ON "Shift" FOR EACH ROW EXECUTE FUNCTION gymflow_protect_attendance_eligibility();

CREATE OR REPLACE FUNCTION gymflow_protect_audit_log() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RAISE EXCEPTION 'Audit history cannot be changed or deleted'; END $$;
CREATE TRIGGER "AuditLog_immutable" BEFORE UPDATE OR DELETE ON "AuditLog" FOR EACH ROW EXECUTE FUNCTION gymflow_protect_audit_log();
