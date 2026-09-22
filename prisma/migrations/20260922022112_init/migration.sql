-- CreateEnum
CREATE TYPE "CategoryKind" AS ENUM ('EXPENSE', 'INCOME', 'TRANSFER');

-- CreateEnum
CREATE TYPE "SplitMode" AS ENUM ('SHARED', 'PERSONAL', 'CUSTOM');

-- CreateEnum
CREATE TYPE "PaymentMethodKind" AS ENUM ('CASH', 'DEBIT_CARD', 'CREDIT_CARD', 'BANK_TRANSFER', 'EASY_PAY', 'GIFT_CARD', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('INCOME', 'EXPENSE', 'TRANSFER');

-- CreateEnum
CREATE TYPE "TransactionSource" AS ENUM ('MANUAL', 'RECURRING', 'IMPORT');

-- CreateEnum
CREATE TYPE "TransactionStatus" AS ENUM ('CONFIRMED', 'PENDING');

-- CreateEnum
CREATE TYPE "RecurrenceFreq" AS ENUM ('WEEKLY', 'MONTHLY', 'YEARLY');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "email" TEXT NOT NULL,
    "emailVerified" TIMESTAMP(3),
    "image" TEXT,
    "passwordHash" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "Household" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'KRW',
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Seoul',
    "inviteCode" TEXT NOT NULL,
    "fiscalStartDay" INTEGER NOT NULL DEFAULT 1,
    "lastRecurringRunOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Household_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HouseholdMember" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "displayName" TEXT NOT NULL,
    "colorHex" TEXT NOT NULL DEFAULT '#1f6feb',
    "defaultShareBp" INTEGER NOT NULL DEFAULT 5000,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "joinedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HouseholdMember_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Category" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "parentId" TEXT,
    "level" INTEGER NOT NULL,
    "kind" "CategoryKind" NOT NULL,
    "name" TEXT NOT NULL,
    "icon" TEXT,
    "colorHex" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "isSystem" BOOLEAN NOT NULL DEFAULT false,
    "defaultSplitMode" "SplitMode",
    "archivedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Category_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PaymentMethod" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "PaymentMethodKind" NOT NULL,
    "ownerMemberId" TEXT,
    "last4" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PaymentMethod_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transaction" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "date" DATE NOT NULL,
    "amount" INTEGER NOT NULL,
    "categoryId" TEXT,
    "paymentMethodId" TEXT,
    "splitMode" "SplitMode" NOT NULL DEFAULT 'SHARED',
    "merchant" TEXT,
    "memo" TEXT,
    "status" "TransactionStatus" NOT NULL DEFAULT 'CONFIRMED',
    "source" "TransactionSource" NOT NULL DEFAULT 'MANUAL',
    "recurringRuleId" TEXT,
    "transferPeerId" TEXT,
    "refundOfId" TEXT,
    "installmentMonths" INTEGER,
    "clientRequestId" TEXT,
    "createdById" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Transaction_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransactionSplit" (
    "id" TEXT NOT NULL,
    "transactionId" TEXT NOT NULL,
    "memberId" TEXT NOT NULL,
    "shareBp" INTEGER NOT NULL,

    CONSTRAINT "TransactionSplit_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Budget" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "categoryId" TEXT NOT NULL,
    "yearMonth" CHAR(7) NOT NULL,
    "amount" INTEGER NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Budget_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringRule" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "type" "TransactionType" NOT NULL,
    "memberId" TEXT NOT NULL,
    "categoryId" TEXT,
    "paymentMethodId" TEXT,
    "amount" INTEGER NOT NULL,
    "amountIsFixed" BOOLEAN NOT NULL DEFAULT true,
    "splitMode" "SplitMode" NOT NULL DEFAULT 'SHARED',
    "merchant" TEXT,
    "memo" TEXT,
    "freq" "RecurrenceFreq" NOT NULL,
    "interval" INTEGER NOT NULL DEFAULT 1,
    "dayOfMonth" INTEGER,
    "weekday" INTEGER,
    "monthOfYear" INTEGER,
    "startDate" DATE NOT NULL,
    "endDate" DATE,
    "lastGeneratedOn" DATE,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RecurringRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RecurringOccurrence" (
    "id" TEXT NOT NULL,
    "ruleId" TEXT NOT NULL,
    "occurrenceDate" DATE NOT NULL,
    "transactionId" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RecurringOccurrence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MonthlySettlement" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "yearMonth" CHAR(7) NOT NULL,
    "sharedTotal" INTEGER NOT NULL,
    "lines" JSONB NOT NULL,
    "transferFromMemberId" TEXT,
    "transferToMemberId" TEXT,
    "transferAmount" INTEGER NOT NULL DEFAULT 0,
    "confirmedAt" TIMESTAMP(3) NOT NULL,
    "confirmedByMemberId" TEXT NOT NULL,

    CONSTRAINT "MonthlySettlement_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE UNIQUE INDEX "Household_inviteCode_key" ON "Household"("inviteCode");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_userId_key" ON "HouseholdMember"("userId");

-- CreateIndex
CREATE INDEX "HouseholdMember_householdId_idx" ON "HouseholdMember"("householdId");

-- CreateIndex
CREATE UNIQUE INDEX "HouseholdMember_householdId_slot_key" ON "HouseholdMember"("householdId", "slot");

-- CreateIndex
CREATE INDEX "Category_householdId_kind_isActive_idx" ON "Category"("householdId", "kind", "isActive");

-- CreateIndex
CREATE INDEX "Category_householdId_parentId_sortOrder_idx" ON "Category"("householdId", "parentId", "sortOrder");

-- CreateIndex
CREATE INDEX "PaymentMethod_householdId_isActive_idx" ON "PaymentMethod"("householdId", "isActive");

-- CreateIndex
CREATE UNIQUE INDEX "PaymentMethod_householdId_name_key" ON "PaymentMethod"("householdId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_transferPeerId_key" ON "Transaction"("transferPeerId");

-- CreateIndex
CREATE INDEX "Transaction_householdId_date_id_idx" ON "Transaction"("householdId", "date", "id");

-- CreateIndex
CREATE INDEX "Transaction_householdId_type_date_idx" ON "Transaction"("householdId", "type", "date");

-- CreateIndex
CREATE INDEX "Transaction_householdId_categoryId_date_idx" ON "Transaction"("householdId", "categoryId", "date");

-- CreateIndex
CREATE INDEX "Transaction_householdId_memberId_date_idx" ON "Transaction"("householdId", "memberId", "date");

-- CreateIndex
CREATE INDEX "Transaction_householdId_splitMode_date_idx" ON "Transaction"("householdId", "splitMode", "date");

-- CreateIndex
CREATE INDEX "Transaction_recurringRuleId_idx" ON "Transaction"("recurringRuleId");

-- CreateIndex
CREATE INDEX "Transaction_createdById_idx" ON "Transaction"("createdById");

-- CreateIndex
CREATE INDEX "Transaction_paymentMethodId_idx" ON "Transaction"("paymentMethodId");

-- CreateIndex
CREATE INDEX "Transaction_refundOfId_idx" ON "Transaction"("refundOfId");

-- CreateIndex
CREATE UNIQUE INDEX "Transaction_householdId_clientRequestId_key" ON "Transaction"("householdId", "clientRequestId");

-- CreateIndex
CREATE INDEX "TransactionSplit_memberId_idx" ON "TransactionSplit"("memberId");

-- CreateIndex
CREATE UNIQUE INDEX "TransactionSplit_transactionId_memberId_key" ON "TransactionSplit"("transactionId", "memberId");

-- CreateIndex
CREATE INDEX "Budget_householdId_yearMonth_idx" ON "Budget"("householdId", "yearMonth");

-- CreateIndex
CREATE INDEX "Budget_categoryId_idx" ON "Budget"("categoryId");

-- CreateIndex
CREATE UNIQUE INDEX "Budget_householdId_categoryId_yearMonth_key" ON "Budget"("householdId", "categoryId", "yearMonth");

-- CreateIndex
CREATE INDEX "RecurringRule_householdId_isActive_idx" ON "RecurringRule"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "RecurringRule_memberId_idx" ON "RecurringRule"("memberId");

-- CreateIndex
CREATE INDEX "RecurringRule_categoryId_idx" ON "RecurringRule"("categoryId");

-- CreateIndex
CREATE INDEX "RecurringRule_paymentMethodId_idx" ON "RecurringRule"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringOccurrence_transactionId_key" ON "RecurringOccurrence"("transactionId");

-- CreateIndex
CREATE UNIQUE INDEX "RecurringOccurrence_ruleId_occurrenceDate_key" ON "RecurringOccurrence"("ruleId", "occurrenceDate");

-- CreateIndex
CREATE UNIQUE INDEX "MonthlySettlement_householdId_yearMonth_key" ON "MonthlySettlement"("householdId", "yearMonth");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "HouseholdMember_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Category" ADD CONSTRAINT "Category_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PaymentMethod" ADD CONSTRAINT "PaymentMethod_ownerMemberId_fkey" FOREIGN KEY ("ownerMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_recurringRuleId_fkey" FOREIGN KEY ("recurringRuleId") REFERENCES "RecurringRule"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_refundOfId_fkey" FOREIGN KEY ("refundOfId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "TransactionSplit_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Budget" ADD CONSTRAINT "Budget_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "Category"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringOccurrence" ADD CONSTRAINT "RecurringOccurrence_ruleId_fkey" FOREIGN KEY ("ruleId") REFERENCES "RecurringRule"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RecurringOccurrence" ADD CONSTRAINT "RecurringOccurrence_transactionId_fkey" FOREIGN KEY ("transactionId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MonthlySettlement" ADD CONSTRAINT "MonthlySettlement_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- ─────────────────────────────────────────────────────────────────
-- Prisma 스키마로 표현할 수 없는 제약. 여기서 보강한다.
-- ─────────────────────────────────────────────────────────────────

-- 카테고리: level 과 parentId 의 정합 (3단 중첩·루트에 부모 있는 상태를 DB에서 막는다)
ALTER TABLE "Category" ADD CONSTRAINT "category_level_shape"
  CHECK ((level = 1 AND "parentId" IS NULL) OR (level = 2 AND "parentId" IS NOT NULL));

-- 카테고리 이름 중복.
-- Postgres 는 NULL 을 서로 다른 값으로 보므로 @@unique([householdId, parentId, name]) 만으로는
-- 대분류 중복이 막히지 않는다. 부분 유니크 인덱스로 나눠 건다.
CREATE UNIQUE INDEX "category_root_name_uniq"
  ON "Category" ("householdId", name) WHERE "parentId" IS NULL;
CREATE UNIQUE INDEX "category_child_name_uniq"
  ON "Category" ("householdId", "parentId", name) WHERE "parentId" IS NOT NULL;

-- 소분류의 부모는 반드시 대분류여야 한다 (상수 생성열 + 복합 FK 트릭).
-- parentId 가 NULL 이면 MATCH SIMPLE 규칙으로 검사되지 않으므로 대분류는 자유롭다.
ALTER TABLE "Category" ADD CONSTRAINT "category_id_level_uniq" UNIQUE (id, level);
ALTER TABLE "Category" ADD COLUMN "parent_level" int GENERATED ALWAYS AS (1) STORED;
ALTER TABLE "Category" ADD CONSTRAINT "category_parent_must_be_root"
  FOREIGN KEY ("parentId", "parent_level") REFERENCES "Category" (id, level);

-- 거래 무결성
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_amount_nonzero"
  CHECK (amount <> 0);
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_transfer_positive"
  CHECK (type <> 'TRANSFER' OR amount > 0);
-- 이체는 카테고리가 없어도 되지만 수입·지출은 반드시 있어야 한다
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_category_required"
  CHECK (type = 'TRANSFER' OR "categoryId" IS NOT NULL);
-- 이체는 정산 대상이 아니므로 분담 모드를 가질 수 없다
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_transfer_no_split"
  CHECK (type <> 'TRANSFER' OR "splitMode" = 'PERSONAL');
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_installment_positive"
  CHECK ("installmentMonths" IS NULL OR "installmentMonths" >= 2);

-- 분담률: 0~10000 (basis point)
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "member_share_bp_range"
  CHECK ("defaultShareBp" BETWEEN 0 AND 10000);
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "member_slot_range"
  CHECK (slot BETWEEN 0 AND 1);
ALTER TABLE "TransactionSplit" ADD CONSTRAINT "split_share_bp_range"
  CHECK ("shareBp" BETWEEN 0 AND 10000);

-- 예산
ALTER TABLE "Budget" ADD CONSTRAINT "budget_amount_nonneg"
  CHECK (amount >= 0);
ALTER TABLE "Budget" ADD CONSTRAINT "budget_ym_format"
  CHECK ("yearMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$');

-- 반복 규칙: 주기별로 필요한 필드가 채워졌는지
ALTER TABLE "RecurringRule" ADD CONSTRAINT "rr_shape" CHECK (
  (freq = 'MONTHLY' AND "dayOfMonth" BETWEEN 1 AND 31) OR
  (freq = 'WEEKLY'  AND weekday     BETWEEN 0 AND 6)  OR
  (freq = 'YEARLY'  AND "dayOfMonth" BETWEEN 1 AND 31 AND "monthOfYear" BETWEEN 1 AND 12)
);
ALTER TABLE "RecurringRule" ADD CONSTRAINT "rr_interval_positive"
  CHECK ("interval" >= 1);
ALTER TABLE "RecurringRule" ADD CONSTRAINT "rr_period_order"
  CHECK ("endDate" IS NULL OR "endDate" >= "startDate");

-- 회계월 범위
ALTER TABLE "Household" ADD CONSTRAINT "household_fiscal_start_day_range"
  CHECK ("fiscalStartDay" BETWEEN 1 AND 28);

-- 정산 스냅샷
ALTER TABLE "MonthlySettlement" ADD CONSTRAINT "settlement_ym_format"
  CHECK ("yearMonth" ~ '^\d{4}-(0[1-9]|1[0-2])$');
ALTER TABLE "MonthlySettlement" ADD CONSTRAINT "settlement_transfer_nonneg"
  CHECK ("transferAmount" >= 0);

-- 가맹점·메모 한글 부분검색. 수만 행에선 ILIKE 로 충분하지만 미리 깔아 둔다.
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX "tx_merchant_trgm" ON "Transaction" USING gin (merchant gin_trgm_ops);
CREATE INDEX "tx_memo_trgm" ON "Transaction" USING gin (memo gin_trgm_ops);
