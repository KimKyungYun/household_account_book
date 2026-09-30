import { prisma } from '@/lib/prisma';
import { backfillLoans } from '@/lib/repository/loan';
import { backfillRecurring } from '@/lib/repository/recurring';
import { currentYearMonth, monthEnd, todayInSeoul } from '@/utils/ts/formatDate';
import type { LoanBackfillResult } from '@/lib/repository/loan';
import type { BackfillResult } from '@/lib/repository/recurring';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export interface AutoEntryResult {
  recurring: BackfillResult;
  loans: LoanBackfillResult;
}

/**
 * 저절로 생기는 거래를 한자리에서 채운다 — 반복 거래와 대출 상환.
 *
 * 둘을 함께 두는 이유는 **상한과 스로틀을 하나로 묶기 위해서**다. 따로 돌리면
 * 25일 월급은 이번 달에 잡히는데 25일 대출 상환은 안 잡히는 식으로 어긋나고,
 * 스로틀 표시가 하나뿐이라 뒤에 도는 쪽이 조용히 건너뛰어진다.
 *
 * 상한은 오늘이 아니라 **이번 달 말일**이다. 아직 오지 않은 날짜의 거래를 미리 만들어 두면
 * 대시보드·예산·달력·엑셀이 모두 같은 데이터를 세므로, 집계마다 예정액을 따로 더하다가
 * 화면끼리 숫자가 갈리는 일이 없다.
 *
 * 별도 스케줄러를 두지 않는다 — Vercel Cron 은 Hobby 에서 하루 한 번이고 로컬 개발에서는
 * 아예 돌지 않아 테스트 경로가 갈라진다. 대신 앱에 들어올 때 이 함수가 돈다.
 */
export async function ensureAutoEntriesUpToDate(ctx: {
  householdId: string;
  userId: string;
}): Promise<AutoEntryResult | null> {
  const today = todayInSeoul();
  const household = await prisma.household.findUnique({
    where: { id: ctx.householdId },
    select: { lastRecurringRunOn: true },
  });
  if (household?.lastRecurringRunOn && toDateString(household.lastRecurringRunOn) >= today) return null;

  const until = monthEnd(currentYearMonth());
  // 직렬로 돈다. 둘 다 Transaction 에 쓰기 때문에, 병렬로 돌리면 같은 커넥션 풀에서
  // 긴 트랜잭션 두 벌이 겹쳐 Supabase 의 pooler 에서 대기가 생긴다.
  const recurring = await backfillRecurring(ctx, until);
  const loans = await backfillLoans(ctx, until);

  await prisma.household.update({
    where: { id: ctx.householdId },
    data: { lastRecurringRunOn: toDateOnly(today) },
  });

  return { recurring, loans };
}
