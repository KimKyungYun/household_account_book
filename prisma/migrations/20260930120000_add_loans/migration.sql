-- 대출 관리.
--
-- Prisma 가 만든 diff 에서 다음 다섯 구문을 **일부러 뺐다**. init 이 raw SQL 로 넣은 것들이라
-- Prisma 의 데이터모델에 없고, 그대로 두면 이 마이그레이션이 지워 버린다.
--   · category_parent_must_be_root (FK)  · category_id_level_uniq
--   · Category.parent_level (생성 컬럼)   → 셋이 함께 3단 카테고리를 막는다
--   · tx_memo_trgm · tx_merchant_trgm     → 거래 검색 인덱스

-- CreateEnum
CREATE TYPE "LoanKind" AS ENUM ('MORTGAGE', 'JEONSE', 'CREDIT', 'CAR', 'STUDENT', 'OTHER');

-- CreateEnum
CREATE TYPE "RepaymentType" AS ENUM ('EQUAL_PAYMENT', 'EQUAL_PRINCIPAL', 'INTEREST_ONLY');

-- AlterTable
ALTER TABLE "Transaction" ADD COLUMN     "loanId" TEXT;

-- CreateTable
CREATE TABLE "Loan" (
    "id" TEXT NOT NULL,
    "householdId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "kind" "LoanKind" NOT NULL,
    "principal" INTEGER NOT NULL,
    "annualRateBp" INTEGER NOT NULL,
    "repaymentType" "RepaymentType" NOT NULL,
    "termMonths" INTEGER NOT NULL,
    "gracePeriodMonths" INTEGER NOT NULL DEFAULT 0,
    "firstPaymentDate" DATE NOT NULL,
    "memberId" TEXT NOT NULL,
    "paymentMethodId" TEXT,
    "interestCategoryId" TEXT NOT NULL,
    "principalCategoryId" TEXT NOT NULL,
    "colorHex" TEXT,
    "memo" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Loan_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LoanPayment" (
    "id" TEXT NOT NULL,
    "loanId" TEXT NOT NULL,
    "installmentNo" INTEGER NOT NULL,
    "dueDate" DATE NOT NULL,
    "principalAmount" INTEGER NOT NULL,
    "interestAmount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "interestTxId" TEXT,
    "principalTxId" TEXT,
    "skipped" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LoanPayment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Loan_householdId_isActive_idx" ON "Loan"("householdId", "isActive");

-- CreateIndex
CREATE INDEX "Loan_memberId_idx" ON "Loan"("memberId");

-- CreateIndex
CREATE INDEX "Loan_interestCategoryId_idx" ON "Loan"("interestCategoryId");

-- CreateIndex
CREATE INDEX "Loan_principalCategoryId_idx" ON "Loan"("principalCategoryId");

-- CreateIndex
CREATE INDEX "Loan_paymentMethodId_idx" ON "Loan"("paymentMethodId");

-- CreateIndex
CREATE UNIQUE INDEX "Loan_householdId_name_key" ON "Loan"("householdId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_interestTxId_key" ON "LoanPayment"("interestTxId");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_principalTxId_key" ON "LoanPayment"("principalTxId");

-- CreateIndex
CREATE INDEX "LoanPayment_loanId_dueDate_idx" ON "LoanPayment"("loanId", "dueDate");

-- CreateIndex
CREATE UNIQUE INDEX "LoanPayment_loanId_installmentNo_key" ON "LoanPayment"("loanId", "installmentNo");

-- CreateIndex
CREATE INDEX "Transaction_loanId_idx" ON "Transaction"("loanId");

-- AddForeignKey
ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_householdId_fkey" FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_memberId_fkey" FOREIGN KEY ("memberId") REFERENCES "HouseholdMember"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_paymentMethodId_fkey" FOREIGN KEY ("paymentMethodId") REFERENCES "PaymentMethod"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_interestCategoryId_fkey" FOREIGN KEY ("interestCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Loan" ADD CONSTRAINT "Loan_principalCategoryId_fkey" FOREIGN KEY ("principalCategoryId") REFERENCES "Category"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_loanId_fkey" FOREIGN KEY ("loanId") REFERENCES "Loan"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_interestTxId_fkey" FOREIGN KEY ("interestTxId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LoanPayment" ADD CONSTRAINT "LoanPayment_principalTxId_fkey" FOREIGN KEY ("principalTxId") REFERENCES "Transaction"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ── 무결성 (Prisma 가 표현하지 못하는 것) ─────────────────────────────
ALTER TABLE "Loan" ADD CONSTRAINT loan_principal_positive CHECK ("principal" > 0);
-- 연 0% ~ 100%. 금리를 % 로 착각해 4.25 를 넣으면 bp 로는 0.0425% 라 조용히 틀린다.
-- 상한만으로는 그걸 못 잡지만, 최소한 42500(425%) 같은 자리 실수는 막는다.
ALTER TABLE "Loan" ADD CONSTRAINT loan_rate_range CHECK ("annualRateBp" BETWEEN 0 AND 10000);
ALTER TABLE "Loan" ADD CONSTRAINT loan_term_positive CHECK ("termMonths" > 0);
-- 거치는 전체 기간 안에 있어야 한다. 넘으면 스케줄이 빈 채로 만들어진다.
ALTER TABLE "Loan" ADD CONSTRAINT loan_grace_range
  CHECK ("gracePeriodMonths" >= 0 AND "gracePeriodMonths" <= "termMonths");

ALTER TABLE "LoanPayment" ADD CONSTRAINT loan_payment_installment_positive CHECK ("installmentNo" > 0);
ALTER TABLE "LoanPayment" ADD CONSTRAINT loan_payment_amounts_nonneg
  CHECK ("principalAmount" >= 0 AND "interestAmount" >= 0 AND "balanceAfter" >= 0);
