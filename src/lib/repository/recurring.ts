import { prisma } from '@/lib/prisma';
import { assertAssetUsable } from '@/lib/repository/asset';
import { assertMemberUsable, assertPaymentMethodUsable } from '@/lib/repository/reference';
import { badRequest, notFound } from '@/lib/api/httpError';
import { logger } from '@/lib/logger';
import { nextOccurrence, occurrencesBetween } from '@/lib/domain/recurring';
import { currentYearMonth, monthEnd, todayInSeoul } from '@/utils/ts/formatDate';
import type { RecurrenceRule } from '@/lib/domain/recurring';
import type { CreateRecurringInput, UpdateRecurringInput } from '@/service/recurring/schema';
import type { RecurringRuleDto } from '@/service/recurring/type';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const RULE_SELECT = {
  id: true,
  name: true,
  isActive: true,
  type: true,
  amount: true,
  splitMode: true,
  assetId: true,
  memo: true,
  freq: true,
  interval: true,
  dayOfMonth: true,
  weekday: true,
  monthOfYear: true,
  startDate: true,
  endDate: true,
  categoryId: true,
  paymentMethodId: true,
  memberId: true,
  member: { select: { id: true, displayName: true, colorHex: true } },
  category: { select: { id: true, name: true, parent: { select: { name: true } } } },
  paymentMethod: { select: { id: true, name: true } },
  asset: { select: { id: true, name: true, colorHex: true } },
} as const;

function toRule(row: { freq: string; interval: number; dayOfMonth: number | null; weekday: number | null; monthOfYear: number | null; startDate: Date; endDate: Date | null }): RecurrenceRule {
  return {
    freq: row.freq as RecurrenceRule['freq'],
    interval: row.interval,
    dayOfMonth: row.dayOfMonth,
    weekday: row.weekday,
    monthOfYear: row.monthOfYear,
    startDate: toDateString(row.startDate),
    endDate: row.endDate ? toDateString(row.endDate) : null,
  };
}

export async function listRecurringRules(householdId: string): Promise<RecurringRuleDto[]> {
  const rows = await prisma.recurringRule.findMany({
    where: { householdId },
    orderBy: [{ isActive: 'desc' }, { name: 'asc' }],
    select: RULE_SELECT,
  });
  const today = todayInSeoul();

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    isActive: row.isActive,
    type: row.type,
    amount: row.amount,
    splitMode: row.splitMode,
    memo: row.memo,
    freq: row.freq,
    interval: row.interval,
    dayOfMonth: row.dayOfMonth,
    weekday: row.weekday,
    monthOfYear: row.monthOfYear,
    startDate: toDateString(row.startDate),
    endDate: row.endDate ? toDateString(row.endDate) : null,
    member: row.member,
    category: row.category
      ? { id: row.category.id, name: row.category.name, parentName: row.category.parent?.name ?? null }
      : null,
    paymentMethod: row.paymentMethod,
    asset: row.asset,
    nextOccurrenceDate: row.isActive ? nextOccurrence(toRule(row), today) : null,
  }));
}

async function assertReferences(householdId: string, input: { memberId: string; categoryId?: string | null; paymentMethodId?: string | null; assetId?: string | null; type: string }) {
  await assertMemberUsable(householdId, input.memberId);
  if (input.paymentMethodId) await assertPaymentMethodUsable(householdId, input.paymentMethodId);
  // 자산은 '옮긴 돈' 규칙에만 붙는다. 종류가 다르면 어차피 저장 때 떨어뜨리므로 그때만 본다.
  if (input.type === 'TRANSFER' && input.assetId) await assertAssetUsable(householdId, input.assetId);

  if (input.categoryId) {
    const category = await prisma.category.findFirst({
      where: { id: input.categoryId, householdId },
      select: { kind: true, level: true },
    });
    if (!category) throw badRequest('카테고리를 찾을 수 없습니다.', { categoryId: '카테고리를 찾을 수 없습니다.' });
    if (category.kind !== input.type) throw badRequest('카테고리 종류가 맞지 않습니다.', { categoryId: '카테고리 종류가 맞지 않습니다.' });
    if (category.level !== 2) throw badRequest('소분류를 골라 주세요.', { categoryId: '소분류를 골라 주세요.' });
  }
}

function toData(input: CreateRecurringInput | UpdateRecurringInput) {
  return {
    name: input.name,
    type: input.type,
    memberId: input.memberId,
    categoryId: input.type === 'TRANSFER' ? null : input.categoryId ?? null,
    paymentMethodId: input.paymentMethodId ?? null,
    amount: input.amount,
    splitMode: input.type === 'TRANSFER' ? ('PERSONAL' as const) : input.splitMode,
    memo: input.memo || null,
    freq: input.freq,
    interval: input.interval,
    // 주기가 바뀌면 다른 주기의 필드를 비운다 — 남아 있으면 계산이 헷갈린다.
    dayOfMonth: input.freq === 'WEEKLY' ? null : input.dayOfMonth ?? null,
    weekday: input.freq === 'WEEKLY' ? input.weekday ?? null : null,
    monthOfYear: input.freq === 'YEARLY' ? input.monthOfYear ?? null : null,
    // 자산은 '옮긴 돈' 규칙에만 붙는다. 종류가 다르면 DB CHECK 가 막는다.
    assetId: input.type === 'TRANSFER' ? input.assetId ?? null : null,
    startDate: toDateOnly(input.startDate),
    endDate: input.endDate ? toDateOnly(input.endDate) : null,
  };
}

export async function createRecurringRule(householdId: string, input: CreateRecurringInput) {
  await assertReferences(householdId, input);

  return prisma.recurringRule.create({ data: { householdId, ...toData(input) }, select: { id: true } });
}

export async function updateRecurringRule(householdId: string, id: string, input: UpdateRecurringInput) {
  const current = await prisma.recurringRule.findFirst({ where: { id, householdId }, select: { id: true } });
  if (!current) throw notFound('반복 거래를 찾을 수 없습니다.');
  await assertReferences(householdId, input);

  // 규칙을 고쳐도 이미 만들어진 거래는 그대로 둔다. 미래 회차만 새 규칙을 따른다.
  return prisma.recurringRule.update({
    where: { id },
    data: { ...toData(input), isActive: input.isActive },
    select: { id: true },
  });
}

/** 중지 — 규칙만 멈춘다. 되살릴 수 있고 이미 만든 거래는 그대로다. */
export async function setRecurringRuleActive(householdId: string, id: string, isActive: boolean) {
  const current = await prisma.recurringRule.findFirst({ where: { id, householdId }, select: { id: true } });
  if (!current) throw notFound('반복 거래를 찾을 수 없습니다.');

  await prisma.recurringRule.update({ where: { id }, data: { isActive } });
}

/**
 * 삭제 — 규칙을 완전히 지운다.
 *
 * **이미 만들어진 거래는 지우지 않는다.** 그건 실제로 나간 돈의 기록이라
 * 함께 지우면 과거 달의 합계와 정산이 통째로 바뀐다.
 * 거래의 `recurringRuleId` 는 SetNull 로 끊기고, 회차 원장은 규칙과 함께 사라진다.
 */
export async function deleteRecurringRule(householdId: string, id: string) {
  const current = await prisma.recurringRule.findFirst({
    where: { id, householdId },
    select: { id: true, _count: { select: { transactions: true } } },
  });
  if (!current) throw notFound('반복 거래를 찾을 수 없습니다.');

  await prisma.recurringRule.delete({ where: { id } });

  return { keptTransactionCount: current._count.transactions };
}

export interface BackfillResult {
  /** 날짜가 지났고 금액이 고정된 회차 — 확정 거래로 넣었다. */
  created: number;
  /** 아직 날짜가 오지 않은 이번 달 회차 — 예정으로 넣었다. */
  upcoming: number;
  /** 이미 만들었거나 사용자가 지운 회차 — 건드리지 않았다. */
  skipped: number;
}

/**
 * 미생성 회차를 채운다.
 *
 * **상한은 오늘이 아니라 이번 달 말일이다.** 25일 월급이 22일에도 이번 달 수입에 잡혀야
 * 한 달을 통째로 볼 수 있다. 아직 오지 않은 날짜의 거래를 미리 만들어 두면 대시보드·예산·
 * 정산·엑셀이 모두 같은 데이터를 세므로, 집계 쿼리마다 예정액을 따로 더하다가 화면끼리
 * 숫자가 갈리는 일이 없다. 아직 오지 않은 회차는 날짜로 구분한다.
 *
 * 별도 스케줄러를 두지 않는다 — Vercel Cron 은 Hobby 에서 하루 한 번이고 로컬 Docker 개발에서는
 * 아예 돌지 않아 테스트 경로가 갈라진다. 대신 앱에 들어올 때 이 함수가 돈다.
 *
 * 중복 생성은 `RecurringOccurrence` 의 (ruleId, occurrenceDate) 유니크가 막는다.
 * 회차를 **먼저** 넣고 성공했을 때만 거래를 만들기 때문에, 부부가 동시에 접속해도 한 건만 남는다.
 */
export async function backfillRecurring(
  ctx: { householdId: string; userId: string },
  until: string = monthEnd(currentYearMonth()),
  options: { ruleId?: string } = {},
): Promise<BackfillResult> {
  const today = todayInSeoul();
  const rules = await prisma.recurringRule.findMany({
    where: {
      householdId: ctx.householdId,
      isActive: true,
      ...(options.ruleId ? { id: options.ruleId } : {}),
    },
    select: { ...RULE_SELECT, lastGeneratedOn: true },
  });

  const result: BackfillResult = { created: 0, upcoming: 0, skipped: 0 };

  for (const rule of rules) {
    const from = rule.lastGeneratedOn
      ? toDateString(new Date(rule.lastGeneratedOn.getTime() + 86_400_000))
      : toDateString(rule.startDate);
    if (from > until) continue;

    const dates = occurrencesBetween(toRule(rule), from, until);
    if (dates.length === 0) continue;

    for (const date of dates) {
      try {
        await prisma.$transaction(async (tx) => {
          const occurrence = await tx.recurringOccurrence.createMany({
            data: [{ ruleId: rule.id, occurrenceDate: toDateOnly(date) }],
            skipDuplicates: true,
          });
          // 이미 처리한 회차(생성됐거나 사용자가 지운 것)면 건드리지 않는다.
          if (occurrence.count === 0) {
            result.skipped += 1;

            return;
          }

          const created = await tx.transaction.create({
            data: {
              householdId: ctx.householdId,
              memberId: rule.memberId,
              type: rule.type,
              date: toDateOnly(date),
              amount: rule.amount,
              categoryId: rule.categoryId,
              paymentMethodId: rule.paymentMethodId,
              splitMode: rule.splitMode,
              // 반복 규칙에 자산이 붙어 있으면 만들어지는 거래도 그 자산으로 쌓인다.
              // 매달 적금이 자동으로 늘어나는 것이 이 줄이다.
              assetId: rule.assetId,
              memo: rule.memo,
              source: 'RECURRING',
              recurringRuleId: rule.id,
              createdById: ctx.userId,
            },
            select: { id: true },
          });

          await tx.recurringOccurrence.update({
            where: { ruleId_occurrenceDate: { ruleId: rule.id, occurrenceDate: toDateOnly(date) } },
            data: { transactionId: created.id },
          });

          if (date > today) result.upcoming += 1;
          else result.created += 1;
        });
      } catch (error) {
        // 한 회차가 실패해도 나머지는 계속 만든다. 다음 진입에서 다시 시도된다.
        logger.error(`반복 거래 생성 실패 (${rule.name} ${date})`, error);
      }
    }

    const lastDate = dates[dates.length - 1];
    if (lastDate) {
      await prisma.recurringRule.update({ where: { id: rule.id }, data: { lastGeneratedOn: toDateOnly(lastDate) } });
    }
  }

  return result;
}

/**
 * 규칙 하나의 지난 회차를 **지금 바로** 채운다.
 *
 * 규칙을 등록·수정·재개한 직후에 부른다. `ensureAutoEntriesUpToDate` 의 스로틀은 가구 단위
 * 하루 한 번이라, 오늘 이미 돌았다면 오늘 만든 규칙을 그대로 건너뛴다. 그러면 이번 달에
 * 이미 지나간 결제일이 거래로 들어오지 않아 대시보드 합계에서 빠진다.
 *
 * 스로틀 값(`lastRecurringRunOn`)은 건드리지 않는다. 이 호출은 가구 전체 스캔이 아니라
 * 규칙 한 건만 보므로, 그 값을 갱신하면 아직 안 본 다른 규칙들이 하루 동안 막힌다.
 */
export function backfillRecurringRule(ctx: { householdId: string; userId: string }, ruleId: string) {
  return backfillRecurring(ctx, monthEnd(currentYearMonth()), { ruleId });
}
