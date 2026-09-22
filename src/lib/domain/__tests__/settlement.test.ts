import { describe, expect, it } from 'vitest';
import { calculateSettlement } from '@/lib/domain/settlement';
import type { SettlementMember } from '@/lib/domain/settlement';

const MEMBERS: SettlementMember[] = [
  { id: 'A', displayName: '남편', colorHex: '#1f6feb', shareBp: 6000 },
  { id: 'B', displayName: '와이프', colorHex: '#d97706', shareBp: 4000 },
];

const FIFTY_FIFTY: SettlementMember[] = [
  { id: 'A', displayName: '남편', colorHex: '#1f6feb', shareBp: 5000 },
  { id: 'B', displayName: '와이프', colorHex: '#d97706', shareBp: 5000 },
];

function lineOf(result: ReturnType<typeof calculateSettlement>, memberId: string) {
  const line = result.lines.find((item) => item.memberId === memberId);
  if (!line) throw new Error(`${memberId} 라인이 없다`);

  return line;
}

describe('calculateSettlement', () => {
  it('공동지출이 없으면 이동도 없다', () => {
    const result = calculateSettlement(MEMBERS, []);

    expect(result.sharedTotal).toBe(0);
    expect(result.transfer).toBeNull();
    expect(result.lines.every((line) => line.balanceAmount === 0)).toBe(true);
  });

  it('분담률대로 정확히 냈으면 차액이 0이다', () => {
    const result = calculateSettlement(MEMBERS, [
      { memberId: 'A', amount: 600_000 },
      { memberId: 'B', amount: 400_000 },
    ]);

    expect(result.sharedTotal).toBe(1_000_000);
    expect(lineOf(result, 'A').balanceAmount).toBe(0);
    expect(lineOf(result, 'B').balanceAmount).toBe(0);
    expect(result.transfer).toBeNull();
  });

  it('한쪽이 전액 부담하면 상대 분담액 전부가 이동한다', () => {
    const result = calculateSettlement(MEMBERS, [{ memberId: 'A', amount: 1_000_000 }]);

    expect(lineOf(result, 'A').owedAmount).toBe(600_000);
    expect(lineOf(result, 'B').owedAmount).toBe(400_000);
    expect(result.transfer).toEqual({ fromMemberId: 'B', toMemberId: 'A', amount: 400_000 });
  });

  it('각자 몫의 합은 항상 총액과 같다 — 잔여 원이 사라지거나 늘지 않는다', () => {
    // 3원을 6:4 로 나누면 1.8 / 1.2 → trunc 로 1 / 1, 잔여 1원은 결제자에게
    const result = calculateSettlement(MEMBERS, [{ memberId: 'A', amount: 3 }]);

    const owedSum = result.lines.reduce((sum, line) => sum + line.owedAmount, 0);
    expect(owedSum).toBe(3);
    expect(lineOf(result, 'A').owedAmount).toBe(2);
    expect(lineOf(result, 'B').owedAmount).toBe(1);
  });

  it('잔여 원 규칙은 거래가 많아도 합을 어긋내지 않는다', () => {
    const transactions = Array.from({ length: 97 }, (_, index) => ({
      memberId: index % 2 === 0 ? 'A' : 'B',
      amount: 1_000 + index * 7,
    }));

    const result = calculateSettlement(MEMBERS, transactions);
    const owedSum = result.lines.reduce((sum, line) => sum + line.owedAmount, 0);
    const paidSum = result.lines.reduce((sum, line) => sum + line.paidAmount, 0);

    expect(owedSum).toBe(result.sharedTotal);
    expect(paidSum).toBe(result.sharedTotal);
    expect(result.lines.reduce((sum, line) => sum + line.balanceAmount, 0)).toBe(0);
  });

  it('환불(음수)은 상계되고 합도 유지된다', () => {
    const result = calculateSettlement(FIFTY_FIFTY, [
      { memberId: 'A', amount: 100_000 },
      { memberId: 'A', amount: -30_000 },
    ]);

    expect(result.sharedTotal).toBe(70_000);
    expect(lineOf(result, 'A').paidAmount).toBe(70_000);
    expect(lineOf(result, 'A').owedAmount).toBe(35_000);
    expect(result.transfer).toEqual({ fromMemberId: 'B', toMemberId: 'A', amount: 35_000 });
  });

  it('거래별 분담률(CUSTOM)이 있으면 가구 기본값을 덮는다', () => {
    const result = calculateSettlement(MEMBERS, [
      { memberId: 'A', amount: 100_000, splits: [{ memberId: 'A', shareBp: 10_000 }, { memberId: 'B', shareBp: 0 }] },
    ]);

    expect(lineOf(result, 'A').owedAmount).toBe(100_000);
    expect(lineOf(result, 'B').owedAmount).toBe(0);
    expect(result.transfer).toBeNull();
  });

  it('분담률을 바꾸면 같은 거래의 정산 결과가 바뀐다', () => {
    const transactions = [{ memberId: 'A', amount: 1_000_000 }];

    const sixFour = calculateSettlement(MEMBERS, transactions);
    const fiftyFifty = calculateSettlement(FIFTY_FIFTY, transactions);

    expect(sixFour.transfer?.amount).toBe(400_000);
    expect(fiftyFifty.transfer?.amount).toBe(500_000);
  });
});
