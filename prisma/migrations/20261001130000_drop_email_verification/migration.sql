-- 이메일 인증 기능을 걷어냈다. 인증 코드를 담던 테이블을 지운다.
-- (User.emailVerified 는 Auth.js 의 컬럼이라 그대로 둔다.)
DROP TABLE "EmailVerification";
