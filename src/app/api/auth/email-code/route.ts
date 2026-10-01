import { withPublicHandler } from '@/lib/api/withHandler';
import { sendVerificationCode } from '@/lib/repository/emailVerification';
import { emailCodeRequestSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 가입 전 이메일 인증 코드를 보낸다. 같은 주소는 1분에 한 번만 보낸다. */
export const POST = withPublicHandler({ body: emailCodeRequestSchema }, async ({ body }) =>
  sendVerificationCode(body.email));
