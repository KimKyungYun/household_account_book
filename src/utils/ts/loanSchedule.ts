import dayjs from 'dayjs';
import type { DateString } from '@/utils/ts/formatDate';

/**
 * 대출 상환 스케줄 계산.
 *
 * 반복 거래와 달리 **계약 시점에 만기까지의 모든 회차가 확정**된다. 그래서 규칙을 저장하고
 * 매번 다시 푸는 대신 회차 목록을 통째로 만들어 `LoanPayment` 에 넣는다.
 *
 * 이 파일이 순수 함수인 이유: 반올림 잔여·거치기간·말일 클램프가 이 기능에서 버그 밀도가
 * 가장 높은 세 지점이고, DB 없이 테스트로 고정해 두어야 하는 것들이다.
 *
 * `lib/domain` 이 아니라 `utils` 에 있는 이유: 등록 폼이 타이핑하는 동안 월 납입액을
 * 보여 주려면 화면도 같은 계산을 써야 한다. `@/lib` 은 화면에서 import 할 수 없고(서버 전용),
 * 계산을 두 벌 두면 미리보기 숫자와 실제로 저장되는 스케줄이 어긋난다.
 */
export type RepaymentType =
  /** 원리금균등 — 매달 내는 총액이 같다. 원금분은 늘고 이자분은 준다. */
  | 'EQUAL_PAYMENT'
  /** 원금균등 — 매달 갚는 원금이 같다. 총액은 갈수록 준다. */
  | 'EQUAL_PRINCIPAL'
  /** 만기일시 — 매달 이자만 내고 만기에 원금을 한 번에 갚는다. */
  | 'INTEREST_ONLY';

export interface LoanTerms {
  /** 최초 원금 (원). */
  principal: number;
  /** 연 금리 basis point. 4.25% → 425. float 로 두면 360 회차를 누적하며 원 단위가 어긋난다. */
  annualRateBp: number;
  /** 거치를 포함한 전체 상환 개월. */
  termMonths: number;
  repaymentType: RepaymentType;
  /** 이자만 내는 앞 구간. 전체 기간에 포함된다. */
  gracePeriodMonths?: number;
  /** 첫 상환일. 이 날짜의 '일' 이 매달 되풀이된다. */
  firstPaymentDate: DateString;
}

export interface LoanInstallment {
  /** 1 부터. */
  installmentNo: number;
  dueDate: DateString;
  principalAmount: number;
  interestAmount: number;
  /** 이 회차를 갚고 난 뒤 남는 원금. 마지막 회차에서 반드시 0 이다. */
  balanceAfter: number;
}

function monthlyRate(annualRateBp: number): number {
  return annualRateBp / 10_000 / 12;
}

/**
 * 원리금균등의 월 납입액.
 *
 * `P × r × (1+r)^n / ((1+r)^n − 1)`. 무이자면 분모가 0 이 되므로 따로 가른다.
 */
export function monthlyPayment(principal: number, annualRateBp: number, months: number): number {
  if (months <= 0) return 0;

  const rate = monthlyRate(annualRateBp);
  if (rate === 0) return Math.round(principal / months);

  const growth = (1 + rate) ** months;

  return Math.round((principal * rate * growth) / (growth - 1));
}

/**
 * n 번째 상환일.
 *
 * `firstPaymentDate` 에 그냥 `add(n, 'month')` 를 하면 1/31 → 2/28 → 3/28 로 **드리프트한다**.
 * 매번 첫 달을 기준으로 다시 세고 그 달 일수로 클램프해야 3/31 로 돌아온다.
 * (반복 거래의 `dayOfMonth = 31` 규칙과 같다 — 31 은 말일을 겸한다)
 */
function dueDateOf(firstPaymentDate: DateString, offsetMonths: number): DateString {
  const first = dayjs(firstPaymentDate);
  const target = first.startOf('month').add(offsetMonths, 'month');

  return target.date(Math.min(first.date(), target.daysInMonth())).format('YYYY-MM-DD');
}

/**
 * 만기까지의 전 회차.
 *
 * 마지막 회차의 원금은 계산값이 아니라 **남은 잔액 그대로** 넣는다. 회차마다 원 단위로
 * 반올림하므로 그러지 않으면 다 갚고도 몇십 원이 남거나 모자란다.
 */
export function buildSchedule(terms: LoanTerms): LoanInstallment[] {
  const { principal, annualRateBp, termMonths, repaymentType, firstPaymentDate } = terms;
  if (termMonths <= 0 || principal <= 0) return [];

  const rate = monthlyRate(annualRateBp);
  const grace = Math.min(terms.gracePeriodMonths ?? 0, termMonths);
  /** 원금을 실제로 갚는 구간. 거치가 전체를 덮으면 만기일시와 같아진다. */
  const amortMonths = termMonths - grace;

  const rows: LoanInstallment[] = [];
  let balance = principal;

  const payment =
    repaymentType === 'EQUAL_PAYMENT' && amortMonths > 0
      ? monthlyPayment(principal, annualRateBp, amortMonths)
      : 0;
  const flatPrincipal = amortMonths > 0 ? Math.floor(principal / amortMonths) : 0;

  for (let index = 0; index < termMonths; index += 1) {
    const isLast = index === termMonths - 1;
    const interestAmount = Math.round(balance * rate);

    let principalAmount: number;
    if (isLast) {
      // 남은 것을 전부 턴다. 반올림 잔여가 여기서 정리된다.
      principalAmount = balance;
    } else if (index < grace) {
      principalAmount = 0;
    } else if (repaymentType === 'INTEREST_ONLY') {
      principalAmount = 0;
    } else if (repaymentType === 'EQUAL_PRINCIPAL') {
      principalAmount = Math.min(flatPrincipal, balance);
    } else {
      principalAmount = Math.min(Math.max(payment - interestAmount, 0), balance);
    }

    balance -= principalAmount;
    rows.push({
      installmentNo: index + 1,
      dueDate: dueDateOf(firstPaymentDate, index),
      principalAmount,
      interestAmount,
      balanceAfter: balance,
    });
  }

  return rows;
}

/** 아직 갚지 않은 원금. 스케줄에서 파생하므로 따로 저장하지 않는다. */
export function outstandingBalance(schedule: LoanInstallment[], paidInstallments: number): number {
  if (paidInstallments <= 0) return schedule[0] ? schedule[0].balanceAfter + schedule[0].principalAmount : 0;

  return schedule[Math.min(paidInstallments, schedule.length) - 1]?.balanceAfter ?? 0;
}

/** 총 이자 — '이 대출로 얼마를 더 내는가' 를 한 줄로 보여줄 때 쓴다. */
export function totalInterest(schedule: LoanInstallment[]): number {
  return schedule.reduce((acc, row) => acc + row.interestAmount, 0);
}
