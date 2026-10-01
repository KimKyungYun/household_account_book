import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { conflict } from '@/lib/api/httpError';
import { withPublicHandler } from '@/lib/api/withHandler';
import { assertEmailVerified, clearVerification } from '@/lib/repository/emailVerification';
import { signupSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPublicHandler({ body: signupSchema }, async ({ body }) => {
  const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (existing) throw conflict('이미 가입된 이메일이에요.', { email: '이미 가입된 이메일이에요.' });

  // 인증 코드를 맞힌 주소만 받는다. 화면이 단추를 막아도 API 를 바로 부를 수 있으니 여기서도 막는다.
  await assertEmailVerified(body.email);

  const user = await prisma.user.create({
    data: {
      email: body.email,
      emailVerified: new Date(),
      name: body.name,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      privacyAgreedAt: new Date(),
    },
    select: { id: true, email: true, name: true },
  });

  await clearVerification(body.email);

  return user;
});
