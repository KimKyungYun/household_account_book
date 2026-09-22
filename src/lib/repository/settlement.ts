import { prisma } from '@/lib/prisma';
import { calculateSettlement } from '@/lib/domain/settlement';
import { monthRange } from '@/utils/ts/formatDate';
import type { SettlementResult } from '@/lib/domain/settlement';

export interface MonthlySettlementView extends SettlementResult {
  yearMonth: string;
  confirmedAt: string | null;
  /** 확정 후 거래가 바뀌었는지 — 0 이 아니면 재확정을 유도한다. */
  recalculationDiff: number;
}

/**
 * 해당 월의 공동지출 정산.
 *
 * 대상은 `type=EXPENSE AND splitMode <> 'PERSONAL'` 뿐이다.
 * 이체·수입·개인지출을 섞으면 "용돈까지 정산에 들어온다"는 불신이 생긴다.
 */
export async function getMonthlySettlement(
  householdId: string,
  yearMonth: string,
): Promise<MonthlySettlementView> {
  const { from, toExclusive } = monthRange(yearMonth);

  const [members, transactions, confirmed] = await Promise.all([
    prisma.householdMember.findMany({
      where: { householdId },
      orderBy: { slot: 'asc' },
      select: { id: true, displayName: true, colorHex: true, defaultShareBp: true },
    }),
    prisma.transaction.findMany({
      where: {
        householdId,
        type: 'EXPENSE',
        splitMode: { not: 'PERSONAL' },
        date: { gte: new Date(from), lt: new Date(toExclusive) },
      },
      select: {
        memberId: true,
        amount: true,
        splits: { select: { memberId: true, shareBp: true } },
      },
    }),
    prisma.monthlySettlement.findUnique({
      where: { householdId_yearMonth: { householdId, yearMonth } },
      select: { sharedTotal: true, confirmedAt: true },
    }),
  ]);

  const result = calculateSettlement(
    members.map((member) => ({
      id: member.id,
      displayName: member.displayName,
      colorHex: member.colorHex,
      shareBp: member.defaultShareBp,
    })),
    transactions.map((tx) => ({
      memberId: tx.memberId,
      amount: tx.amount,
      splits: tx.splits.length > 0 ? tx.splits : undefined,
    })),
  );

  return {
    ...result,
    yearMonth,
    confirmedAt: confirmed?.confirmedAt?.toISOString() ?? null,
    recalculationDiff: confirmed ? result.sharedTotal - confirmed.sharedTotal : 0,
  };
}
