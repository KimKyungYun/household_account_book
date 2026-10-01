-- 가입 전 이메일 인증 코드. 지난번에는 메일이 나가지 않아 걷어냈다가 Gmail SMTP 로 다시 둔다.
-- 코드를 맞힌 시각(verifiedAt)을 더해, 맞힌 뒤 30분 안에만 가입을 받는다.
CREATE TABLE "EmailVerification" (
    "email" TEXT NOT NULL,
    "codeHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastSentAt" TIMESTAMP(3) NOT NULL,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EmailVerification_pkey" PRIMARY KEY ("email")
);
