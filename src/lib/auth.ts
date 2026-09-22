import { PrismaAdapter } from '@auth/prisma-adapter';
import bcrypt from 'bcryptjs';
import NextAuth from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import { prisma } from '@/lib/prisma';
import { PATH } from '@/routes/paths';

/**
 * 인증은 이메일 + 비밀번호(Credentials) 하나만 쓴다.
 * 두 사람만 쓰는 앱에 소셜 로그인 설정을 얹을 이유가 없고, 매직링크는 SMTP 가 필요하다.
 *
 * Credentials 는 DB 세션을 쓸 수 없어 전략이 jwt 다. 세션에는 householdId / memberId 를
 * 실어 모든 Route Handler 가 테넌트 키를 세션에서만 얻게 한다.
 * (요청 본문으로 householdId 를 받으면 상대 가구 데이터가 뚫린다)
 */
declare module 'next-auth' {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      householdId: string | null;
      memberId: string | null;
      displayName: string | null;
    };
  }
}

function allowedEmails(): string[] {
  return (process.env.AUTH_ALLOWED_EMAILS ?? '')
    .split(',')
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/** 가입 허용 목록. 비어 있으면 제한하지 않는다(로컬 개발). */
export function isEmailAllowed(email: string): boolean {
  const list = allowedEmails();

  return list.length === 0 || list.includes(email.trim().toLowerCase());
}

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: 'jwt' },
  pages: { signIn: PATH.LOGIN },
  trustHost: true,
  providers: [
    Credentials({
      credentials: {
        email: { label: '이메일', type: 'email' },
        password: { label: '비밀번호', type: 'password' },
      },
      authorize: async (raw) => {
        const email = typeof raw?.email === 'string' ? raw.email.trim().toLowerCase() : '';
        const password = typeof raw?.password === 'string' ? raw.password : '';
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null;

        const matched = await bcrypt.compare(password, user.passwordHash);
        if (!matched) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    signIn: ({ user }) => (user.email ? isEmailAllowed(user.email) : false),

    jwt: ({ token, user }) => {
      if (user?.id) token.sub = user.id;

      return token;
    },

    /**
     * 가구·구성원은 **토큰에 캐시하지 않고** 매번 읽는다.
     *
     * 캐시하면 온보딩 직후(가구가 막 생긴 시점) 토큰이 낡아 "가구 설정을 먼저 마쳐 주세요"에
     * 갇힌다. 풀려면 세션 갱신 트리거가 필요하고 그건 SessionProvider 를 부른다.
     * 2인 앱에서 요청당 조회 1회는 무의미한 비용이라 낡음 버그가 생길 여지를 지우는 쪽을 택했다.
     */
    session: async ({ session, token }) => {
      const userId = token.sub ?? '';
      const member = userId
        ? await prisma.householdMember.findUnique({
          where: { userId },
          select: { id: true, householdId: true, displayName: true },
        })
        : null;

      session.user = {
        ...session.user,
        id: userId,
        householdId: member?.householdId ?? null,
        memberId: member?.id ?? null,
        displayName: member?.displayName ?? null,
      };

      return session;
    },
  },
});

export const PASSWORD_SALT_ROUNDS = 12;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, PASSWORD_SALT_ROUNDS);
}
