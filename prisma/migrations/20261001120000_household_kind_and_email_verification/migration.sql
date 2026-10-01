-- 가구 유형(부부·가족·개인)과 구성원 관계, 가입 정보(전화번호·동의), 이메일 인증 코드.

-- CreateEnum
CREATE TYPE "HouseholdKind" AS ENUM ('COUPLE', 'FAMILY', 'SOLO');

-- CreateEnum
CREATE TYPE "MemberRelation" AS ENUM ('HUSBAND', 'WIFE', 'FATHER', 'MOTHER', 'CHILD', 'GRANDPARENT', 'OTHER', 'SELF');

-- AlterTable
ALTER TABLE "Household" ADD COLUMN "kind" "HouseholdKind" NOT NULL DEFAULT 'COUPLE';

-- AlterTable
ALTER TABLE "HouseholdMember" ADD COLUMN "relation" "MemberRelation" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "phone" TEXT,
ADD COLUMN "privacyAgreedAt" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "EmailVerification" (
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("email")
);

-- 정원이 유형마다 1·2·6명으로 늘어난다. 자리 번호는 0~5.
ALTER TABLE "HouseholdMember" DROP CONSTRAINT "member_slot_range";
ALTER TABLE "HouseholdMember" ADD CONSTRAINT "member_slot_range"
  CHECK (slot BETWEEN 0 AND 5);

-- 기존 가구는 모두 부부였다. 온보딩이 0 = 남편, 1 = 와이프로 받아 왔다.
UPDATE "HouseholdMember" SET "relation" = CASE slot WHEN 0 THEN 'HUSBAND'::"MemberRelation" ELSE 'WIFE'::"MemberRelation" END;

-- 이메일 인증이 생기기 전에 가입한 사람은 인증된 것으로 둔다. 안 그러면 배포 직후 로그인이 막힌다.
UPDATE "User" SET "emailVerified" = CURRENT_TIMESTAMP WHERE "emailVerified" IS NULL;
