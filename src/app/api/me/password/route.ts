import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/prisma';
import { hashPassword } from '@/lib/auth';
import { badRequest } from '@/lib/api/httpError';
import { withPreOnboardingHandler } from '@/lib/api/withHandler';
import { changePasswordSchema } from '@/service/auth/schema';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** 내 비밀번호 바꾸기. 지금 비밀번호가 맞아야 한다. 로그인 상태(세션)는 그대로 유지된다. */
export const PATCH = withPreOnboardingHandler({ body: changePasswordSchema }, async (ctx, { body }) => {
  const user = await prisma.user.findUniqueOrThrow({ where: { id: ctx.userId }, select: { passwordHash: true } });

  const matched = user.passwordHash ? await bcrypt.compare(body.currentPassword, user.passwordHash) : false;
  if (!matched) {
    throw badRequest('지금 비밀번호가 맞지 않아요.', { currentPassword: '지금 비밀번호가 맞지 않아요.' });
  }

  await prisma.user.update({
    where: { id: ctx.userId },
    data: { passwordHash: await hashPassword(body.newPassword) },
  });
});
