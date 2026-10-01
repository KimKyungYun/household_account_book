import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { conflict } from '@/lib/api/httpError';
import { withPublicHandler } from '@/lib/api/withHandler';
import { signupSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export const POST = withPublicHandler({ body: signupSchema }, async ({ body }) => {
  const existing = await prisma.user.findUnique({ where: { email: body.email }, select: { id: true } });
  if (existing) throw conflict('이미 가입된 이메일이에요.', { email: '이미 가입된 이메일이에요.' });

  return prisma.user.create({
    data: {
      email: body.email,
      name: body.name,
      phone: body.phone,
      passwordHash: await hashPassword(body.password),
      privacyAgreedAt: new Date(),
    },
    select: { id: true, email: true, name: true },
  });
});
