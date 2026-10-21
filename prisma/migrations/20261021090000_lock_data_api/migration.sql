-- Supabase Data API(PostgREST·GraphQL)로 테이블에 닿지 못하게 막는다.
--
-- 앱은 Data API 를 쓰지 않고 Prisma 로 `postgres` 계정에 직접 붙는다. 그런데 Supabase 는 public
-- 테이블에 anon·authenticated 권한을 자동으로 주어 왔고 RLS 도 꺼져 있었다. 이대로면 프로젝트
-- 주소와 anon 키(공개해도 되는 값으로 설계된 키)만으로 세션·비밀번호 해시·거래를 읽고 지울 수 있다.
--
--  1. 모든 테이블에 RLS 를 켠다. 정책이 없으므로 anon·authenticated 요청은 한 줄도 닿지 않는다.
--     `postgres` 는 테이블 주인이고 BYPASSRLS 라 앱·Prisma 마이그레이션은 그대로 돈다.
--  2. anon·authenticated 에게 준 권한을 거둔다. 앞으로 만들 테이블에도 자동으로 붙지 않게 한다.
--     로컬 docker Postgres 에는 두 역할이 없으므로 있을 때만 돈다.
--
-- 앞으로 테이블을 새로 만들 때도 같은 마이그레이션에서 ENABLE ROW LEVEL SECURITY 를 건다.

ALTER TABLE "Account" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Asset" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Budget" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Category" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmailVerification" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Household" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "HouseholdMember" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Loan" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "LoanPayment" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PaymentMethod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringOccurrence" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "RecurringRule" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Session" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Transaction" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "VerificationToken" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "_prisma_migrations" ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  api_role text;
BEGIN
  FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated'] LOOP
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
      EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON TABLES FROM %I', api_role);
      EXECUTE format('ALTER DEFAULT PRIVILEGES IN SCHEMA public REVOKE ALL ON SEQUENCES FROM %I', api_role);
    END IF;
  END LOOP;
END $$;
