import { prisma } from '@/lib/prisma';
import { hashPassword, isEmailAllowed } from '@/lib/auth';
import { conflict, forbidden } from '@/lib/api/httpError';
import { withPublicHandler } from '@/lib/api/withHandler';
import { signupSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPublicHandler({ body: signupSchema }, async ({ body }) => {
  // 두 사람만 쓰는 앱이다. 허용 목록이 가입 봇을 막는 가장 저렴한 수단이다.
  if (!isEmailAllowed(body.email)) throw forbidden('이 이메일로는 가입할 수 없습니다.');

  const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (existing) throw conflict('이미 가입된 이메일입니다.', { email: '이미 가입된 이메일입니다.' });

  const user = await prisma.user.create({
    data: { email: body.email, name: body.name, passwordHash: await hashPassword(body.password) },
    select: { id: true, email: true, name: true },
  });

  return user;
});
