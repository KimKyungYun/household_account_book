import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@/generated/prisma/client';
import { recordDbQuery } from '@/lib/api/serverTiming';
import type { ITXClientDenyList } from '@prisma/client/runtime/client';

/**
 * PrismaClient 싱글턴.
 *
 * - Prisma 7 은 SQL 연결에 드라이버 어댑터를 요구한다(네이티브 엔진 바이너리 없음).
 * - 개발 중 HMR 이 모듈을 다시 평가하면 커넥션이 계속 늘어나므로 globalThis 에 캐시한다.
 * - 배포(Supabase)에서는 DATABASE_URL 에 pooled 엔드포인트를 쓴다. 마이그레이션만 direct.
 * - 쿼리마다 걸린 시간을 요청 단위로 모아 `Server-Timing` 헤더에 싣는다 (lib/api/serverTiming.ts).
 */
function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error('DATABASE_URL 이 설정되지 않았어요.');

  const adapter = new PrismaPg({ connectionString });

  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
  }).$extends({
    query: {
      async $allOperations({ args, query }) {
        const startedAt = performance.now();
        try {
          return await query(args);
        } finally {
          recordDbQuery(performance.now() - startedAt);
        }
      },
    },
  });
}

const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createPrismaClient> };

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

/** 인터랙티브 트랜잭션 안에서 받는 클라이언트. 확장을 얹었으므로 `Prisma.TransactionClient` 와 타입이 다르다. */
export type TxClient = Omit<typeof prisma, ITXClientDenyList>;
