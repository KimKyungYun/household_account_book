import type { LoanKind, RepaymentType } from '@/generated/prisma/enums';

export interface LoanInstallmentDto {
  installmentNo: number;
  dueDate: string;
  principalAmount: number;
  interestAmount: number;
  balanceAfter: number;
  /** 거래가 만들어졌는지. 아직 날짜가 오지 않았으면 false 다. */
  paid: boolean;
  skipped: boolean;
}

export interface LoanDto {
  id: string;
  name: string;
  kind: LoanKind;
  principal: number;
  /** 연 금리 basis point. 화면에서는 100 으로 나눠 % 로 보여준다. */
  annualRateBp: number;
  repaymentType: RepaymentType;
  termMonths: number;
  gracePeriodMonths: number;
  firstPaymentDate: string;
  colorHex: string | null;
  memo: string | null;
  isActive: boolean;
  /** 순자산에서 뺄 대상인지. 끄면 목록에는 남되 순자산 계산에서 빠진다. */
  includeInNetWorth: boolean;
  member: { id: string; displayName: string; colorHex: string };
  paymentMethod: { id: string; name: string } | null;
  interestCategory: { id: string; name: string };
  principalCategory: { id: string; name: string };

  /** 아직 갚지 않은 원금. */
  outstanding: number;
  /** 갚은 원금 = principal − outstanding. */
  repaid: number;
  /** 0~1. 진행 막대가 쓴다. */
  progress: number;
  /** 만기까지 낼 이자 총액. */
  totalInterest: number;
  /** 이미 낸 이자. */
  paidInterest: number;
  /** 다음 상환 회차. 다 갚았으면 null. */
  nextPayment: { dueDate: string; principalAmount: number; interestAmount: number } | null;
  /** 이번 달에 나가는 금액(원금 + 이자). 그 달에 회차가 없으면 0. */
  thisMonthPayment: number;
  /** 그중 이자분. 지출로 잡히는 것은 이쪽뿐이다. */
  thisMonthInterest: number;
  paidInstallments: number;
}

export interface LoanSummaryDto {
  loans: LoanDto[];
  /** 살아 있는 대출의 남은 원금 합 — 순자산에서 뺀 것만 센다. */
  totalOutstanding: number;
  /** 순자산에서 뺀 대출까지 포함한 전체 잔액. 목록 합계는 이쪽이다. */
  totalOutstandingAll: number;
  /** 순자산 계산에서 뺀 대출 건수. 0 이면 화면에 아무 말도 하지 않는다. */
  excludedCount: number;
  /** 이번 달에 나가는 상환액 합. */
  monthlyPayment: number;
  /** 이번 달 이자분 합 — '고정지출' 로 잡히는 금액이다. */
  monthlyInterest: number;
}
