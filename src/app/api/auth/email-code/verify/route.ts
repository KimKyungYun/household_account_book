import { withPublicHandler } from '@/lib/api/withHandler';
import { verifyCode } from '@/lib/repository/emailVerification';
import { emailCodeVerifySchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 받은 인증 코드를 확인한다. 다섯 번 틀리면 코드를 다시 받아야 한다. */
export const POST = withPublicHandler({ body: emailCodeVerifySchema }, async ({ body }) =>
  verifyCode(body.email, body.code));
