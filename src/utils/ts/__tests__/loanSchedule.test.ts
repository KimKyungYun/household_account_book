import { describe, expect, it } from 'vitest';
import { buildSchedule, monthlyPayment } from '@/utils/ts/loanSchedule';
import type { LoanTerms } from '@/utils/ts/loanSchedule';

const terms = (overrides: Partial<LoanTerms> = {}): LoanTerms => ({
  principal: 100_000_000,
  annualRateBp: 400, // 연 4.00%
  termMonths: 360,
  repaymentType: 'EQUAL_PAYMENT',
  gracePeriodMonths: 0,
  firstPaymentDate: '2026-01-25',
  ...overrides,
});

/** 합계 검산 — 이 기능에서 가장 자주 깨지는 자리다. */
function sum(values: number[]): number {
  return values.reduce((acc, value) => acc + value, 0);
}

describe('buildSchedule — 원리금균등', () => {
  it('회차 수가 상환 개월과 같다', () => {
    expect(buildSchedule(terms()).length).toBe(360);
  });

  it('첫 회차 이자는 원금 × 월이율이다', () => {
    // 1억 × (4% / 12) = 333,333.33… → 333,333
    expect(buildSchedule(terms())[0]?.interestAmount).toBe(333_333);
  });

  it('원금 합계가 최초 원금과 1원도 어긋나지 않는다', () => {
    const schedule = buildSchedule(terms());

    expect(sum(schedule.map((row) => row.principalAmount))).toBe(100_000_000);
  });

  it('마지막 회차에서 잔액이 정확히 0 이 된다', () => {
    const schedule = buildSchedule(terms());

    expect(schedule[schedule.length - 1]?.balanceAfter).toBe(0);
  });

  it('잔액이 한 번도 음수가 되지 않는다', () => {
    const schedule = buildSchedule(terms());

    expect(schedule.every((row) => row.balanceAfter >= 0)).toBe(true);
  });

  it('월 납입액이 마지막 회차를 빼면 모두 같다', () => {
    const schedule = buildSchedule(terms());
    const totals = schedule.slice(0, -1).map((row) => row.principalAmount + row.interestAmount);

    expect(new Set(totals).size).toBe(1);
  });

  it('이자는 갈수록 줄고 원금은 갈수록 는다', () => {
    const schedule = buildSchedule(terms());
    const first = schedule[0];
    const last = schedule[schedule.length - 1];

    expect(first!.interestAmount).toBeGreaterThan(last!.interestAmount);
    expect(first!.principalAmount).toBeLessThan(last!.principalAmount);
  });
});

describe('buildSchedule — 원금균등', () => {
  const equalPrincipal = terms({ repaymentType: 'EQUAL_PRINCIPAL', termMonths: 12, principal: 12_000_000 });

  it('원금분이 매달 같다 (마지막 잔여 조정 제외)', () => {
    const schedule = buildSchedule(equalPrincipal);
    const principals = schedule.slice(0, -1).map((row) => row.principalAmount);

    expect(new Set(principals).size).toBe(1);
    expect(principals[0]).toBe(1_000_000);
  });

  it('원금 합계가 최초 원금과 같다', () => {
    const schedule = buildSchedule(equalPrincipal);

    expect(sum(schedule.map((row) => row.principalAmount))).toBe(12_000_000);
  });

  it('납입액은 갈수록 줄어든다', () => {
    const schedule = buildSchedule(equalPrincipal);
    const totals = schedule.map((row) => row.principalAmount + row.interestAmount);

    expect(totals[0]).toBeGreaterThan(totals[totals.length - 1]!);
  });
});

describe('buildSchedule — 만기일시', () => {
  const interestOnly = terms({ repaymentType: 'INTEREST_ONLY', termMonths: 24, principal: 50_000_000 });

  it('마지막 회차 전에는 원금을 갚지 않는다', () => {
    const schedule = buildSchedule(interestOnly);

    expect(schedule.slice(0, -1).every((row) => row.principalAmount === 0)).toBe(true);
  });

  it('마지막 회차에 원금 전액을 갚는다', () => {
    const schedule = buildSchedule(interestOnly);

    expect(schedule[schedule.length - 1]?.principalAmount).toBe(50_000_000);
    expect(schedule[schedule.length - 1]?.balanceAfter).toBe(0);
  });

  it('이자가 매달 같다 — 잔액이 줄지 않기 때문이다', () => {
    const schedule = buildSchedule(interestOnly);

    expect(new Set(schedule.map((row) => row.interestAmount)).size).toBe(1);
  });
});

describe('buildSchedule — 거치기간', () => {
  const grace = terms({ termMonths: 36, gracePeriodMonths: 12, principal: 36_000_000 });

  it('거치 중에는 원금을 갚지 않는다', () => {
    const schedule = buildSchedule(grace);

    expect(schedule.slice(0, 12).every((row) => row.principalAmount === 0)).toBe(true);
  });

  it('거치가 끝나면 원금을 갚기 시작한다', () => {
    const schedule = buildSchedule(grace);

    expect(schedule[12]?.principalAmount).toBeGreaterThan(0);
  });

  it('총 회차는 거치를 포함한 전체 기간이다', () => {
    expect(buildSchedule(grace).length).toBe(36);
  });

  it('거치가 끝나도 원금 합계는 최초 원금과 같다', () => {
    expect(sum(buildSchedule(grace).map((row) => row.principalAmount))).toBe(36_000_000);
  });
});

describe('buildSchedule — 무이자', () => {
  const zero = terms({ annualRateBp: 0, termMonths: 10, principal: 1_000_000 });

  it('이자가 0 이고 원금만 나뉜다 (0 으로 나누지 않는다)', () => {
    const schedule = buildSchedule(zero);

    expect(schedule.every((row) => row.interestAmount === 0)).toBe(true);
    expect(sum(schedule.map((row) => row.principalAmount))).toBe(1_000_000);
  });
});

describe('buildSchedule — 상환일', () => {
  it('첫 상환일의 일자를 매달 되풀이한다', () => {
    const schedule = buildSchedule(terms({ termMonths: 3, firstPaymentDate: '2026-01-25' }));

    expect(schedule.map((row) => row.dueDate)).toEqual(['2026-01-25', '2026-02-25', '2026-03-25']);
  });

  it('31 일 시작은 그 달 일수로 클램프된다 — 말일을 겸한다', () => {
    const schedule = buildSchedule(terms({ termMonths: 4, firstPaymentDate: '2026-01-31' }));

    expect(schedule.map((row) => row.dueDate)).toEqual([
      '2026-01-31',
      '2026-02-28',
      '2026-03-31',
      '2026-04-30',
    ]);
  });

  it('윤년 2 월은 29 일로 클램프된다', () => {
    const schedule = buildSchedule(terms({ termMonths: 2, firstPaymentDate: '2028-01-31' }));

    expect(schedule[1]?.dueDate).toBe('2028-02-29');
  });

  it('클램프된 뒤에도 원래 일자로 돌아온다 — 드리프트가 없다', () => {
    const schedule = buildSchedule(terms({ termMonths: 3, firstPaymentDate: '2026-01-31' }));

    expect(schedule[2]?.dueDate).toBe('2026-03-31');
  });
});

describe('buildSchedule — 경계', () => {
  it('1 개월짜리는 한 번에 다 갚는다', () => {
    const schedule = buildSchedule(terms({ termMonths: 1, principal: 1_000_000 }));

    expect(schedule.length).toBe(1);
    expect(schedule[0]?.principalAmount).toBe(1_000_000);
    expect(schedule[0]?.balanceAfter).toBe(0);
  });

  it('거치가 전체 기간과 같으면 마지막에 원금을 다 갚는다', () => {
    const schedule = buildSchedule(terms({ termMonths: 12, gracePeriodMonths: 12, principal: 5_000_000 }));

    expect(schedule.slice(0, -1).every((row) => row.principalAmount === 0)).toBe(true);
    expect(schedule[11]?.principalAmount).toBe(5_000_000);
    expect(schedule[11]?.balanceAfter).toBe(0);
  });

  it('회차 번호는 1 부터 이어진다', () => {
    const schedule = buildSchedule(terms({ termMonths: 5 }));

    expect(schedule.map((row) => row.installmentNo)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe('monthlyPayment', () => {
  it('1 억 / 4% / 30 년의 월 납입액은 477,415 원이다', () => {
    expect(monthlyPayment(100_000_000, 400, 360)).toBe(477_415);
  });

  it('무이자면 원금을 개월로 나눈 값이다', () => {
    expect(monthlyPayment(1_200_000, 0, 12)).toBe(100_000);
  });
});
