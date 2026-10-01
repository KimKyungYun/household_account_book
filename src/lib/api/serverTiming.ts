import { AsyncLocalStorage } from 'node:async_hooks';

/**
 * 요청 한 건이 어디에 시간을 썼는지 `Server-Timing` 헤더로 내보낸다.
 *
 * 브라우저 개발자도구 Network → Timing 탭에 그대로 그려진다. "API 가 느리다"가
 * 인증 때문인지, DB 왕복 때문인지, 계산 때문인지를 추측하지 않고 숫자로 가른다.
 *
 * DB 시간은 Prisma 확장(`lib/prisma.ts`)이 쿼리마다 여기에 더한다. 요청마다 저장소를
 * 따로 두려고 AsyncLocalStorage 를 쓴다 — 동시에 들어온 두 요청의 쿼리가 섞이지 않는다.
 */
interface TimingStore {
  dbCount: number;
  dbMs: number;
}

// PrismaClient 가 globalThis 에 캐시되므로 저장소도 같은 자리에 하나만 둔다.
// 라우트마다 모듈이 따로 평가되면 Prisma 쪽과 핸들러 쪽이 서로 다른 저장소를 보게 된다.
const globalForTiming = globalThis as unknown as { timingStorage?: AsyncLocalStorage<TimingStore> };
const storage = (globalForTiming.timingStorage ??= new AsyncLocalStorage<TimingStore>());

/** 이 시간을 넘긴 요청은 서버 로그에 남긴다. 운영 로그에서 느린 API 를 바로 찾기 위해서다. */
export const SLOW_REQUEST_MS = 800;

export function runWithTiming<T>(fn: () => Promise<T>): Promise<T> {
  return storage.run({ dbCount: 0, dbMs: 0 }, fn);
}

export function recordDbQuery(ms: number) {
  const store = storage.getStore();
  if (!store) return;

  store.dbCount += 1;
  store.dbMs += ms;
}

export function currentDbTiming(): TimingStore {
  return storage.getStore() ?? { dbCount: 0, dbMs: 0 };
}

export interface TimingMarks {
  authMs: number;
  totalMs: number;
}

export function toServerTimingHeader({ authMs, totalMs }: TimingMarks): string {
  const { dbCount, dbMs } = currentDbTiming();

  return [
    `auth;dur=${authMs.toFixed(1)}`,
    // 병렬로 보낸 쿼리는 시간이 겹치므로 db 는 total 보다 클 수 있다(쿼리별 시간의 합).
    `db;dur=${dbMs.toFixed(1)};desc="${dbCount} queries, summed"`,
    `total;dur=${totalMs.toFixed(1)}`,
  ].join(', ');
}
