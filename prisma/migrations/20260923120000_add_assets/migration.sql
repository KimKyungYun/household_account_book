-- 자산 관리
--
-- '청년미래적금', '주식' 처럼 모으는 통을 등록해 두고, 거래를 넣을 때 어디에 모으는지
-- 고른다. 잔액은 저장하지 않는다 — openingBalance 에서 시작해 그 자산으로 들어간
-- 거래를 더해 계산한다. 저장해 두면 거래를 고칠 때마다 맞춰야 하고, 한 번 어긋나면
-- 어느 쪽이 맞는지 알 수 없다.

CREATE TYPE "AssetKind" AS ENUM ('SAVINGS', 'INVESTMENT', 'CASH', 'PENSION', 'OTHER');

CREATE TABLE "Asset" (
  "id"             TEXT NOT NULL,
  "householdId"    TEXT NOT NULL,
  "name"           TEXT NOT NULL,
  "kind"           "AssetKind" NOT NULL,
  "ownerMemberId"  TEXT,
  "colorHex"       TEXT,
  "openingBalance" INTEGER NOT NULL DEFAULT 0,
  "targetAmount"   INTEGER,
  "sortOrder"      INTEGER NOT NULL DEFAULT 0,
  "isActive"       BOOLEAN NOT NULL DEFAULT true,
  "memo"           TEXT,
  "createdAt"      TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt"      TIMESTAMP(3) NOT NULL,

  CONSTRAINT "Asset_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Asset_householdId_name_key" ON "Asset"("householdId", "name");
CREATE INDEX "Asset_householdId_isActive_idx" ON "Asset"("householdId", "isActive");
CREATE INDEX "Asset_ownerMemberId_idx" ON "Asset"("ownerMemberId");

ALTER TABLE "Asset" ADD CONSTRAINT "Asset_householdId_fkey"
  FOREIGN KEY ("householdId") REFERENCES "Household"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Asset" ADD CONSTRAINT "Asset_ownerMemberId_fkey"
  FOREIGN KEY ("ownerMemberId") REFERENCES "HouseholdMember"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 시작 잔액과 목표액은 음수일 수 없다. 빚은 이 표가 다루지 않는다.
ALTER TABLE "Asset" ADD CONSTRAINT "asset_opening_nonneg" CHECK ("openingBalance" >= 0);
ALTER TABLE "Asset" ADD CONSTRAINT "asset_target_positive"
  CHECK ("targetAmount" IS NULL OR "targetAmount" > 0);

-- ── 거래·반복 규칙에 자산을 잇는다 ──────────────────────────────
ALTER TABLE "Transaction"   ADD COLUMN "assetId" TEXT;
ALTER TABLE "RecurringRule" ADD COLUMN "assetId" TEXT;

ALTER TABLE "Transaction" ADD CONSTRAINT "Transaction_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "RecurringRule" ADD CONSTRAINT "RecurringRule_assetId_fkey"
  FOREIGN KEY ("assetId") REFERENCES "Asset"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Transaction_householdId_assetId_date_idx"
  ON "Transaction"("householdId", "assetId", "date");

-- 자산은 '옮긴 돈'에만 붙는다. 수입·지출에 붙으면 그 돈이 합계에도 들어가고
-- 자산에도 쌓여 같은 금액을 두 번 세게 된다.
ALTER TABLE "Transaction" ADD CONSTRAINT "tx_asset_transfer_only"
  CHECK ("assetId" IS NULL OR type = 'TRANSFER');
ALTER TABLE "RecurringRule" ADD CONSTRAINT "rr_asset_transfer_only"
  CHECK ("assetId" IS NULL OR type = 'TRANSFER');
