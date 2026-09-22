import { prisma } from '@/lib/prisma';
import { badRequest, notFound } from '@/lib/api/httpError';
import { logger } from '@/lib/logger';
import { nextOccurrence, occurrencesBetween } from '@/lib/domain/recurring';
import { todayInSeoul } from '@/utils/ts/formatDate';
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
  amountIsFixed: true,
  splitMode: true,
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
    amountIsFixed: row.amountIsFixed,
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
    nextOccurrenceDate: row.isActive ? nextOccurrence(toRule(row), today) : null,
  }));
}

async function assertReferences(householdId: string, input: { memberId: string; categoryId?: string | null; paymentMethodId?: string | null; type: string }) {
  const member = await prisma.householdMember.findFirst({
    where: { id: input.memberId, householdId },
    select: { id: true },
  });
  if (!member) throw badRequest('구성원을 찾을 수 없습니다.', { memberId: '구성원을 찾을 수 없습니다.' });

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
    amountIsFixed: input.amountIsFixed,
    splitMode: input.type === 'TRANSFER' ? ('PERSONAL' as const) : input.splitMode,
    memo: input.memo || null,
    freq: input.freq,
    interval: input.interval,
    // 주기가 바뀌면 다른 주기의 필드를 비운다 — 남아 있으면 계산이 헷갈린다.
    dayOfMonth: input.freq === 'WEEKLY' ? null : input.dayOfMonth ?? null,
    weekday: input.freq === 'WEEKLY' ? input.weekday ?? null : null,
    monthOfYear: input.freq === 'YEARLY' ? input.monthOfYear ?? null : null,
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

/** 규칙은 비활성으로만 내린다. 이미 만든 거래는 남겨 과거 집계를 지키지 않으면 안 된다. */
export async function deactivateRecurringRule(householdId: string, id: string) {
  const current = await prisma.recurringRule.findFirst({ where: { id, householdId }, select: { id: true } });
  if (!current) throw notFound('반복 거래를 찾을 수 없습니다.');

  await prisma.recurringRule.update({ where: { id }, data: { isActive: false } });
}

export interface BackfillResult {
  created: number;
  pending: number;
  skipped: number;
}

/**
 * 미생성 회차를 채운다.
 *
 * 별도 스케줄러를 두지 않는다 — Vercel Cron 은 Hobby 에서 하루 한 번이고 로컬 Docker 개발에서는
 * 아예 돌지 않아 테스트 경로가 갈라진다. 대신 앱에 들어올 때 이 함수가 돈다.
 *
 * 중복 생성은 `RecurringOccurrence` 의 (ruleId, occurrenceDate) 유니크가 막는다.
 * 회차를 **먼저** 넣고 성공했을 때만 거래를 만들기 때문에, 부부가 동시에 접속해도 한 건만 남는다.
 */
export async function backfillRecurring(
  ctx: { householdId: string; userId: string },
  until: string = todayInSeoul(),
): Promise<BackfillResult> {
  const rules = await prisma.recurringRule.findMany({
    where: { householdId: ctx.householdId, isActive: true },
    select: { ...RULE_SELECT, lastGeneratedOn: true },
  });

  const result: BackfillResult = { created: 0, pending: 0, skipped: 0 };

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
              memo: rule.memo,
              // 금액이 매달 바뀌는 항목은 확인 대기로 둔다.
              status: rule.amountIsFixed ? 'CONFIRMED' : 'PENDING',
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

          if (rule.amountIsFixed) result.created += 1;
          else result.pending += 1;
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
 * 하루에 한 번만 백필을 돌린다.
 * 화면을 옮길 때마다 돌면 레이아웃 렌더가 느려지고 DB 를 계속 두드린다.
 */
export async function ensureRecurringUpToDate(ctx: { householdId: string; userId: string }) {
  const today = todayInSeoul();
  const household = await prisma.household.findUnique({
    where: { id: ctx.householdId },
    select: { lastRecurringRunOn: true },
  });
  if (household?.lastRecurringRunOn && toDateString(household.lastRecurringRunOn) >= today) return null;

  const result = await backfillRecurring(ctx, today);
  await prisma.household.update({
    where: { id: ctx.householdId },
    data: { lastRecurringRunOn: toDateOnly(today) },
  });

  return result;
}
