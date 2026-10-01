import { Prisma } from '@/generated/prisma/client';
import { prisma } from '@/lib/prisma';
import { assertMemberUsable, assertPaymentMethodUsable } from '@/lib/repository/reference';
import { badRequest, notFound } from '@/lib/api/httpError';
import { logger } from '@/lib/logger';
import { currentYearMonth, monthEnd, todayInSeoul } from '@/utils/ts/formatDate';
import { buildSchedule } from '@/utils/ts/loanSchedule';
import type { LoanTerms } from '@/utils/ts/loanSchedule';
import type { CreateLoanInput, UpdateLoanInput } from '@/service/loan/schema';
import type { LoanDto, LoanInstallmentDto, LoanSummaryDto } from '@/service/loan/type';

function toDateOnly(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

function toDateString(value: Date): string {
  return value.toISOString().slice(0, 10);
}

const LOAN_SELECT = {
  id: true,
  name: true,
  kind: true,
  principal: true,
  annualRateBp: true,
  repaymentType: true,
  termMonths: true,
  gracePeriodMonths: true,
  firstPaymentDate: true,
  colorHex: true,
  memo: true,
  isActive: true,
  includeInNetWorth: true,
  member: { select: { id: true, displayName: true, colorHex: true } },
  paymentMethod: { select: { id: true, name: true } },
  interestCategory: { select: { id: true, name: true } },
  principalCategory: { select: { id: true, name: true } },
  payments: {
    select: {
      installmentNo: true,
      dueDate: true,
      principalAmount: true,
      interestAmount: true,
      balanceAfter: true,
      interestTxId: true,
      principalTxId: true,
      skipped: true,
    },
    orderBy: { installmentNo: 'asc' },
  },
} as const;

type LoanRow = Awaited<ReturnType<typeof findLoanRows>>[number];

function findLoanRows(householdId: string) {
  return prisma.loan.findMany({
    where: { householdId },
    select: LOAN_SELECT,
    orderBy: [{ isActive: 'desc' }, { sortOrder: 'asc' }, { createdAt: 'asc' }],
  });
}

/**
 * 이자·원금 카테고리가 이 가구의 것이고 **종류가 맞는지** 본다.
 *
 * 종류를 확인하는 이유는 집계 때문이다. 원금 상환을 EXPENSE 카테고리에 넣으면
 * '이번 달 쓴 돈' 이 원금까지 세어 부풀고, 이 앱이 TRANSFER 를 모든 집계에서 빼는
 * 이유와 정면으로 어긋난다. 원금은 비용이 아니라 부채가 줄어드는 자산 이동이다.
 */
async function assertCategoriesUsable(householdId: string, interestCategoryId: string, principalCategoryId: string) {
  const categories = await prisma.category.findMany({
    where: { id: { in: [interestCategoryId, principalCategoryId] }, householdId },
    select: { id: true, kind: true, isActive: true },
  });

  const interest = categories.find((row) => row.id === interestCategoryId);
  const principal = categories.find((row) => row.id === principalCategoryId);

  if (!interest) throw badRequest('이자 분류를 찾을 수 없습니다.', { interestCategoryId: '분류를 찾을 수 없습니다.' });
  if (!principal) {
    throw badRequest('원금 분류를 찾을 수 없습니다.', { principalCategoryId: '분류를 찾을 수 없습니다.' });
  }
  if (!interest.isActive) {
    throw badRequest('보관된 분류입니다.', { interestCategoryId: '보관된 분류입니다.' });
  }
  if (!principal.isActive) {
    throw badRequest('보관된 분류입니다.', { principalCategoryId: '보관된 분류입니다.' });
  }
  if (interest.kind !== 'EXPENSE') {
    throw badRequest('이자는 지출 분류여야 합니다.', { interestCategoryId: '지출 분류를 골라 주세요.' });
  }
  if (principal.kind !== 'TRANSFER') {
    throw badRequest('원금 상환은 이체 분류여야 합니다. 갚은 원금은 쓴 돈이 아니라 빚이 줄어든 것입니다.', {
      principalCategoryId: '이체 분류를 골라 주세요.',
    });
  }
}

function termsOf(row: {
  principal: number;
  annualRateBp: number;
  termMonths: number;
  gracePeriodMonths: number;
  repaymentType: LoanTerms['repaymentType'];
  firstPaymentDate: Date;
}): LoanTerms {
  return {
    principal: row.principal,
    annualRateBp: row.annualRateBp,
    termMonths: row.termMonths,
    gracePeriodMonths: row.gracePeriodMonths,
    repaymentType: row.repaymentType,
    firstPaymentDate: toDateString(row.firstPaymentDate),
  };
}

function toDto(row: LoanRow): LoanDto {
  const thisMonth = currentYearMonth();
  /** 거래가 만들어진 회차만 '갚았다' 로 센다. 건너뛴 회차는 낸 적이 없다. */
  const paidRows = row.payments.filter((payment) => payment.principalTxId !== null || payment.interestTxId !== null);
  const paidInstallments = paidRows.length;
  const repaid = paidRows.reduce((acc, payment) => acc + payment.principalAmount, 0);
  const paidInterest = paidRows.reduce((acc, payment) => acc + payment.interestAmount, 0);

  const nextRow = row.payments.find(
    (payment) => payment.principalTxId === null && payment.interestTxId === null && !payment.skipped,
  );
  const monthRow = row.payments.find((payment) => toDateString(payment.dueDate).startsWith(thisMonth));

  return {
    id: row.id,
    name: row.name,
    kind: row.kind,
    principal: row.principal,
    annualRateBp: row.annualRateBp,
    repaymentType: row.repaymentType,
    termMonths: row.termMonths,
    gracePeriodMonths: row.gracePeriodMonths,
    firstPaymentDate: toDateString(row.firstPaymentDate),
    colorHex: row.colorHex,
    memo: row.memo,
    isActive: row.isActive,
    includeInNetWorth: row.includeInNetWorth,
    member: row.member,
    paymentMethod: row.paymentMethod,
    interestCategory: row.interestCategory,
    principalCategory: row.principalCategory,

    outstanding: Math.max(row.principal - repaid, 0),
    repaid,
    progress: row.principal > 0 ? Math.min(repaid / row.principal, 1) : 0,
    totalInterest: row.payments.reduce((acc, payment) => acc + payment.interestAmount, 0),
    paidInterest,
    nextPayment: nextRow
      ? {
        dueDate: toDateString(nextRow.dueDate),
        principalAmount: nextRow.principalAmount,
        interestAmount: nextRow.interestAmount,
      }
      : null,
    thisMonthPayment: monthRow ? monthRow.principalAmount + monthRow.interestAmount : 0,
    thisMonthInterest: monthRow?.interestAmount ?? 0,
    paidInstallments,
  };
}

export async function listLoans(householdId: string): Promise<LoanSummaryDto> {
  const loans = (await findLoanRows(householdId)).map(toDto);
  const active = loans.filter((loan) => loan.isActive);
  // 순자산에서 뺄 대출만 따로 센다. 목록 합계(`totalOutstandingAll`)와 갈라 두는 이유는,
  // 제외한 대출도 '갚아야 하는 돈' 이라는 사실은 목록에서 그대로 보여야 하기 때문이다.
  const counted = active.filter((loan) => loan.includeInNetWorth);

  return {
    loans,
    totalOutstanding: counted.reduce((acc, loan) => acc + loan.outstanding, 0),
    totalOutstandingAll: active.reduce((acc, loan) => acc + loan.outstanding, 0),
    excludedCount: active.length - counted.length,
    // 매달 나가는 돈은 순자산 포함 여부와 상관없이 실제로 통장에서 빠진다.
    monthlyPayment: active.reduce((acc, loan) => acc + loan.thisMonthPayment, 0),
    monthlyInterest: active.reduce((acc, loan) => acc + loan.thisMonthInterest, 0),
  };
}

export async function getLoanSchedule(householdId: string, id: string): Promise<LoanInstallmentDto[]> {
  const loan = await prisma.loan.findFirst({
    where: { id, householdId },
    select: { payments: LOAN_SELECT.payments },
  });
  if (!loan) throw notFound('대출을 찾을 수 없습니다.');

  return loan.payments.map((payment) => ({
    installmentNo: payment.installmentNo,
    dueDate: toDateString(payment.dueDate),
    principalAmount: payment.principalAmount,
    interestAmount: payment.interestAmount,
    balanceAfter: payment.balanceAfter,
    paid: payment.principalTxId !== null || payment.interestTxId !== null,
    skipped: payment.skipped,
  }));
}

export async function createLoan(householdId: string, input: CreateLoanInput) {
  await assertMemberUsable(householdId, input.memberId);
  if (input.paymentMethodId) await assertPaymentMethodUsable(householdId, input.paymentMethodId);
  await assertCategoriesUsable(householdId, input.interestCategoryId, input.principalCategoryId);

  const schedule = buildSchedule({
    principal: input.principal,
    annualRateBp: input.annualRateBp,
    termMonths: input.termMonths,
    gracePeriodMonths: input.gracePeriodMonths,
    repaymentType: input.repaymentType,
    firstPaymentDate: input.firstPaymentDate,
  });

  return prisma.loan.create({
    data: {
      householdId,
      name: input.name,
      kind: input.kind,
      principal: input.principal,
      annualRateBp: input.annualRateBp,
      repaymentType: input.repaymentType,
      termMonths: input.termMonths,
      gracePeriodMonths: input.gracePeriodMonths,
      firstPaymentDate: toDateOnly(input.firstPaymentDate),
      memberId: input.memberId,
      paymentMethodId: input.paymentMethodId ?? null,
      interestCategoryId: input.interestCategoryId,
      principalCategoryId: input.principalCategoryId,
      colorHex: input.colorHex ?? null,
      memo: input.memo ?? null,
      includeInNetWorth: input.includeInNetWorth,
      payments: {
        create: schedule.map((row) => ({
          installmentNo: row.installmentNo,
          dueDate: toDateOnly(row.dueDate),
          principalAmount: row.principalAmount,
          interestAmount: row.interestAmount,
          balanceAfter: row.balanceAfter,
        })),
      },
    },
    select: { id: true },
  });
}

/** 스케줄을 다시 계산해야 하는 필드. 이름·메모·색만 고치면 스케줄은 건드리지 않는다. */
const SCHEDULE_FIELDS = [
  'principal',
  'annualRateBp',
  'repaymentType',
  'termMonths',
  'gracePeriodMonths',
  'firstPaymentDate',
] as const;

export async function updateLoan(householdId: string, id: string, input: UpdateLoanInput) {
  const current = await prisma.loan.findFirst({
    where: { id, householdId },
    select: {
      id: true,
      principal: true,
      annualRateBp: true,
      repaymentType: true,
      termMonths: true,
      gracePeriodMonths: true,
      firstPaymentDate: true,
    },
  });
  if (!current) throw notFound('대출을 찾을 수 없습니다.');

  if (input.memberId) await assertMemberUsable(householdId, input.memberId);
  if (input.paymentMethodId) await assertPaymentMethodUsable(householdId, input.paymentMethodId);
  if (input.interestCategoryId || input.principalCategoryId) {
    const loan = await prisma.loan.findFirstOrThrow({
      where: { id, householdId },
      select: { interestCategoryId: true, principalCategoryId: true },
    });
    await assertCategoriesUsable(
      householdId,
      input.interestCategoryId ?? loan.interestCategoryId,
      input.principalCategoryId ?? loan.principalCategoryId,
    );
  }

  const needsRebuild = SCHEDULE_FIELDS.some((field) => input[field] !== undefined);

  return prisma.$transaction(async (tx) => {
    const updated = await tx.loan.update({
      where: { id },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.kind !== undefined ? { kind: input.kind } : {}),
        ...(input.principal !== undefined ? { principal: input.principal } : {}),
        ...(input.annualRateBp !== undefined ? { annualRateBp: input.annualRateBp } : {}),
        ...(input.repaymentType !== undefined ? { repaymentType: input.repaymentType } : {}),
        ...(input.termMonths !== undefined ? { termMonths: input.termMonths } : {}),
        ...(input.gracePeriodMonths !== undefined ? { gracePeriodMonths: input.gracePeriodMonths } : {}),
        ...(input.firstPaymentDate !== undefined
          ? { firstPaymentDate: toDateOnly(input.firstPaymentDate) }
          : {}),
        ...(input.memberId !== undefined ? { memberId: input.memberId } : {}),
        ...(input.paymentMethodId !== undefined ? { paymentMethodId: input.paymentMethodId } : {}),
        ...(input.interestCategoryId !== undefined ? { interestCategoryId: input.interestCategoryId } : {}),
        ...(input.principalCategoryId !== undefined ? { principalCategoryId: input.principalCategoryId } : {}),
        ...(input.colorHex !== undefined ? { colorHex: input.colorHex } : {}),
        ...(input.memo !== undefined ? { memo: input.memo } : {}),
        ...(input.isActive !== undefined ? { isActive: input.isActive } : {}),
        ...(input.includeInNetWorth !== undefined ? { includeInNetWorth: input.includeInNetWorth } : {}),
      },
      select: {
        id: true,
        principal: true,
        annualRateBp: true,
        repaymentType: true,
        termMonths: true,
        gracePeriodMonths: true,
        firstPaymentDate: true,
      },
    });

    if (needsRebuild) {
      /**
       * **이미 거래가 만들어진 회차는 지우지 않는다.** 지우면 `onDelete: SetNull` 로
       * 거래에서 대출 연결만 끊긴 고아 거래가 남아, 지난달 가계부가 조용히 바뀐다.
       * 아직 돈이 나가지 않은 회차만 새 조건으로 다시 깐다.
       */
      const kept = await tx.loanPayment.findMany({
        where: { loanId: id, OR: [{ interestTxId: { not: null } }, { principalTxId: { not: null } }] },
        select: { installmentNo: true },
      });
      const keptNos = new Set(kept.map((row) => row.installmentNo));

      await tx.loanPayment.deleteMany({
        where: { loanId: id, installmentNo: { notIn: [...keptNos] } },
      });

      const schedule = buildSchedule(termsOf(updated));
      const fresh = schedule.filter((row) => !keptNos.has(row.installmentNo));
      if (fresh.length > 0) {
        await tx.loanPayment.createMany({
          data: fresh.map((row) => ({
            loanId: id,
            installmentNo: row.installmentNo,
            dueDate: toDateOnly(row.dueDate),
            principalAmount: row.principalAmount,
            interestAmount: row.interestAmount,
            balanceAfter: row.balanceAfter,
          })),
        });
      }
    }

    return { id: updated.id };
  });
}

/** 대출만 지운다. 이미 나간 돈의 기록(거래)은 남는다. */
export async function deleteLoan(householdId: string, id: string) {
  const loan = await prisma.loan.findFirst({
    where: { id, householdId },
    select: { id: true, _count: { select: { transactions: true } } },
  });
  if (!loan) throw notFound('대출을 찾을 수 없습니다.');

  await prisma.loan.delete({ where: { id } });

  return { keptTransactionCount: loan._count.transactions };
}

export interface LoanBackfillResult {
  /** 날짜가 지난 회차 — 확정 거래로 넣었다. */
  created: number;
  /** 아직 날짜가 오지 않은 이번 달 회차 — 예정으로 넣었다. */
  upcoming: number;
  skipped: number;
}

interface DuePayment {
  id: string;
  dueDate: Date;
  principalAmount: number;
  interestAmount: number;
  loan: {
    id: string;
    name: string;
    memberId: string;
    paymentMethodId: string | null;
    interestCategoryId: string;
    principalCategoryId: string;
  };
}

/**
 * 대출 하나의 밀린 회차를 **트랜잭션 한 번에** 거래로 옮긴다. 실제로 옮긴 회차의 날짜를 돌려준다.
 *
 * 회차마다 트랜잭션을 따로 열면 회차 × 6번을 왕복한다. 2년 전에 시작한 대출을 등록하면
 * 24회차 × 6 = 144번이다. 여기서는 회차 수와 무관하게 여섯 번이면 끝난다.
 *
 *  1. 아직 비어 있는 회차를 updateMany 로 잡는다 — 행 잠금이 걸려 상대 요청은 커밋까지 기다린다
 *  2. 잡힌 회차를 다시 읽는다. 상대가 먼저 채운 회차는 여기서 빠진다
 *  3. 이자·원금 거래를 한 번에 만든다
 *  4. 회차에 거래 ID 를 한 번에 적는다 — 값이 행마다 달라 Prisma 로는 한 문장이 안 되므로 SQL 로 쓴다
 */
async function createLoanTransactions(
  ctx: { householdId: string; userId: string },
  payments: DuePayment[],
): Promise<string[]> {
  const ids = payments.map((payment) => payment.id);

  return prisma.$transaction(async (tx) => {
    await tx.loanPayment.updateMany({
      where: { id: { in: ids }, interestTxId: null, principalTxId: null },
      data: { skipped: false },
    });
    const open = await tx.loanPayment.findMany({
      where: { id: { in: ids }, interestTxId: null, principalTxId: null },
      select: { id: true },
    });
    const openIds = new Set(open.map((row) => row.id));
    const claimed = payments.filter((payment) => openIds.has(payment.id));
    if (claimed.length === 0) return [];

    const rows = claimed.flatMap((payment) => {
      const { loan } = payment;
      const base = {
        householdId: ctx.householdId,
        memberId: loan.memberId,
        date: payment.dueDate,
        paymentMethodId: loan.paymentMethodId,
        source: 'RECURRING' as const,
        loanId: loan.id,
        createdById: ctx.userId,
      };

      return [
        ...(payment.interestAmount > 0
          ? [{
            ...base,
            type: 'EXPENSE' as const,
            amount: payment.interestAmount,
            categoryId: loan.interestCategoryId,
            splitMode: 'SHARED' as const,
            memo: `${loan.name} 이자`,
          }]
          : []),
        ...(payment.principalAmount > 0
          ? [{
            ...base,
            type: 'TRANSFER' as const,
            amount: payment.principalAmount,
            categoryId: loan.principalCategoryId,
            // 이체는 정산에서 빠진다 — DB CHECK 가 TRANSFER 에 SHARED 를 막는다.
            splitMode: 'PERSONAL' as const,
            memo: `${loan.name} 원금상환`,
          }]
          : []),
      ];
    });

    const created = rows.length > 0
      ? await tx.transaction.createManyAndReturn({ data: rows, select: { id: true, date: true, type: true } })
      : [];

    // 한 대출의 상환일은 달마다 하나라 (날짜, 종류)로 거래와 회차를 잇는다.
    const txIdOf = new Map(created.map((row) => [`${toDateString(row.date)}|${row.type}`, row.id]));
    const links = claimed.map((payment) => {
      const date = toDateString(payment.dueDate);

      return Prisma.sql`(${payment.id}::text, ${txIdOf.get(`${date}|EXPENSE`) ?? null}::text, ${txIdOf.get(`${date}|TRANSFER`) ?? null}::text)`;
    });
    await tx.$executeRaw`
      UPDATE "LoanPayment" AS p
      SET "interestTxId" = v.interest, "principalTxId" = v.principal
      FROM (VALUES ${Prisma.join(links)}) AS v(id, interest, principal)
      WHERE p.id = v.id
    `;

    return claimed.map((payment) => toDateString(payment.dueDate));
  });
}

/**
 * 상환 회차를 거래로 옮긴다.
 *
 * 반복 거래와 **같은 자리에서 같은 상한(이번 달 말일)으로** 돈다. 그래야 25일 상환이
 * 22일에도 이번 달 지출에 잡혀 대시보드·예산·달력이 같은 숫자를 센다.
 *
 * 회차마다 거래를 **두 건** 만든다.
 *   · 이자 → EXPENSE. 실제로 나가는 비용이다.
 *   · 원금 → TRANSFER. 빚이 줄어든 것이라 수입·지출 집계에서 빠져야 한다.
 * 한 건으로 합치면 '이번 달 쓴 돈' 이 원금까지 세어 부풀고, 순저축이 무너진다.
 *
 * 중복 생성은 `LoanPayment` 의 `interestTxId`/`principalTxId` 가 이미 찼는지로 막는다.
 * 거래를 만들고 회차에 연결하는 것을 한 트랜잭션에 묶어, 부부가 동시에 들어와도 한 벌만 남는다
 * (createLoanTransactions).
 */
export async function backfillLoans(
  ctx: { householdId: string; userId: string },
  until: string = monthEnd(currentYearMonth()),
  options: { loanId?: string } = {},
): Promise<LoanBackfillResult> {
  const today = todayInSeoul();
  const result: LoanBackfillResult = { created: 0, upcoming: 0, skipped: 0 };

  const due = await prisma.loanPayment.findMany({
    where: {
      loan: { householdId: ctx.householdId, isActive: true, ...(options.loanId ? { id: options.loanId } : {}) },
      dueDate: { lte: toDateOnly(until) },
      skipped: false,
      interestTxId: null,
      principalTxId: null,
    },
    select: {
      id: true,
      dueDate: true,
      principalAmount: true,
      interestAmount: true,
      loan: {
        select: {
          id: true,
          name: true,
          memberId: true,
          paymentMethodId: true,
          interestCategoryId: true,
          principalCategoryId: true,
        },
      },
    },
    orderBy: { dueDate: 'asc' },
  });

  // 대출별로 묶어 대출 하나를 트랜잭션 한 번에 처리한다.
  const byLoan = new Map<string, DuePayment[]>();
  for (const payment of due) {
    const list = byLoan.get(payment.loan.id) ?? [];
    list.push(payment);
    byLoan.set(payment.loan.id, list);
  }

  for (const payments of byLoan.values()) {
    try {
      const claimed = await createLoanTransactions(ctx, payments);
      for (const date of claimed) {
        if (date > today) result.upcoming += 1;
        else result.created += 1;
      }
      result.skipped += payments.length - claimed.length;
    } catch (error) {
      // 한 대출이 실패해도 나머지는 계속 만든다. 회차가 비어 있으니 다음 진입에서 다시 시도된다.
      logger.error(`대출 상환 거래 생성 실패 (${payments[0]?.loan.name ?? ''})`, error);
      result.skipped += payments.length;
    }
  }

  return result;
}

/** 대출을 등록·수정한 직후에 그 대출의 지난 회차를 바로 채운다. */
export function backfillLoan(ctx: { householdId: string; userId: string }, loanId: string) {
  return backfillLoans(ctx, monthEnd(currentYearMonth()), { loanId });
}
