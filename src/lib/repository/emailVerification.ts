import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { badRequest, conflict } from '@/lib/api/httpError';
import { sendMail } from '@/lib/mail';
import { verificationMail } from '@/lib/mail/verificationMail';
import { prisma } from '@/lib/prisma';

/** 코드가 살아 있는 시간. */
export const CODE_TTL_MINUTES = 10;
/** 같은 주소로 다시 보내려면 기다려야 하는 시간. 메일 폭탄과 Gmail 하루 한도를 막는다. */
export const RESEND_COOLDOWN_SECONDS = 60;
/** 틀려도 되는 횟수. 넘으면 새 코드를 받아야 한다 — 여섯 자리를 맞혀 보는 일을 막는다. */
const MAX_ATTEMPTS = 5;
/** 코드를 맞힌 뒤 가입을 마쳐야 하는 시간. */
const VERIFIED_TTL_MINUTES = 30;

const MINUTE = 60 * 1000;

/** 코드는 해시만 남긴다. 서버 비밀값을 섞어 DB 만 보고는 되돌릴 수 없게 한다. */
function hashCode(email: string, code: string): string {
  return createHmac('sha256', process.env.AUTH_SECRET ?? 'local-dev').update(`${email}:${code}`).digest('hex');
}

function isSameHash(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);

  return left.length === right.length && timingSafeEqual(left, right);
}

/** 인증 코드를 새로 만들어 보낸다. 이미 가입한 주소면 보내지 않는다. */
export async function sendVerificationCode(email: string): Promise<{ expiresAt: string; resendAfterSeconds: number }> {
  const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (user) throw conflict('이미 가입된 이메일이에요.', { email: '이미 가입된 이메일이에요.' });

  const now = Date.now();
  const current = await prisma.emailVerification.findUnique({ where: { email }, select: { lastSentAt: true } });
  if (current) {
    const waited = (now - current.lastSentAt.getTime()) / 1000;
    if (waited < RESEND_COOLDOWN_SECONDS) {
      throw badRequest(`${Math.ceil(RESEND_COOLDOWN_SECONDS - waited)}초 뒤에 다시 받을 수 있어요.`);
    }
  }

  const code = randomInt(0, 1_000_000).toString().padStart(6, '0');
  const expiresAt = new Date(now + CODE_TTL_MINUTES * MINUTE);

  // 메일을 먼저 보낸다. 보내지 못했는데 코드만 바뀌면 받은 적 없는 코드를 기다리게 된다.
  await sendMail(verificationMail(email, code, CODE_TTL_MINUTES));

  const data = { codeHash: hashCode(email, code), expiresAt, attempts: 0, lastSentAt: new Date(now), verifiedAt: null };
  await prisma.emailVerification.upsert({ where: { email }, create: { email, ...data }, update: data });

  return { expiresAt: expiresAt.toISOString(), resendAfterSeconds: RESEND_COOLDOWN_SECONDS };
}

/** 코드를 확인한다. 맞으면 인증된 것으로 표시한다. */
export async function verifyCode(email: string, code: string): Promise<{ verified: true }> {
  const row = await prisma.emailVerification.findUnique({ where: { email } });
  if (!row) throw badRequest('먼저 인증 코드를 받아 주세요.', { code: '먼저 인증 코드를 받아 주세요.' });
  if (row.verifiedAt) return { verified: true };
  if (row.expiresAt.getTime() < Date.now()) {
    throw badRequest('코드가 만료됐어요. 다시 받아 주세요.', { code: '코드가 만료됐어요. 다시 받아 주세요.' });
  }
  if (row.attempts >= MAX_ATTEMPTS) {
    throw badRequest('여러 번 틀렸어요. 코드를 다시 받아 주세요.', { code: '여러 번 틀렸어요. 코드를 다시 받아 주세요.' });
  }

  if (!isSameHash(row.codeHash, hashCode(email, code))) {
    const attempts = row.attempts + 1;
    await prisma.emailVerification.update({ where: { email }, data: { attempts } });
    const left = MAX_ATTEMPTS - attempts;
    const message = left > 0 ? `코드가 맞지 않아요. ${left}번 더 해 볼 수 있어요.` : '여러 번 틀렸어요. 코드를 다시 받아 주세요.';

    throw badRequest(message, { code: message });
  }

  await prisma.emailVerification.update({ where: { email }, data: { verifiedAt: new Date() } });

  return { verified: true };
}

/** 가입 직전에 부른다. 인증을 마친 지 30분이 안 된 주소만 통과시킨다. */
export async function assertEmailVerified(email: string): Promise<void> {
  const row = await prisma.emailVerification.findUnique({ where: { email }, select: { verifiedAt: true } });
  const isFresh = row?.verifiedAt && Date.now() - row.verifiedAt.getTime() < VERIFIED_TTL_MINUTES * MINUTE;

  if (!isFresh) {
    throw badRequest('이메일 인증을 마쳐 주세요.', { email: '이메일 인증을 마쳐 주세요.' });
  }
}

/** 가입이 끝난 주소의 인증 기록을 지운다. */
export async function clearVerification(email: string): Promise<void> {
  await prisma.emailVerification.deleteMany({ where: { email } });
}
