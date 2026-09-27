import type { RecurrenceFreq, SplitMode, TransactionType } from '@/generated/prisma/enums';

export interface RecurringRuleDto {
  id: string;
  name: string;
  isActive: boolean;
  type: TransactionType;
  amount: number;
  amountIsFixed: boolean;
  splitMode: SplitMode;
  memo: string | null;
  freq: RecurrenceFreq;
  interval: number;
  dayOfMonth: number | null;
  weekday: number | null;
  monthOfYear: number | null;
  startDate: string;
  endDate: string | null;
  member: { id: string; displayName: string; colorHex: string };
  category: { id: string; name: string; parentName: string | null } | null;
  paymentMethod: { id: string; name: string } | null;
  /** 이 돈이 쌓이는 자산. '옮긴 돈' 규칙에만 붙는다. */
  asset: { id: string; name: string; colorHex: string | null } | null;
  /** 다음 발생 예정일. 끝난 규칙은 null. */
  nextOccurrenceDate: string | null;
}

/** 규칙을 저장한 직후 서버가 채운 지난 회차 결과. */
export interface BackfillResult {
  /** 날짜가 지났고 금액이 고정돼 확정으로 넣은 건수. */
  created: number;
  /** 날짜는 지났지만 금액이 매달 바뀌어 확인이 필요한 건수. */
  pending: number;
  /** 아직 날짜가 오지 않아 예정으로 넣은 이번 달 건수. */
  upcoming: number;
  /** 이미 처리한(만들었거나 사용자가 지운) 회차라 건너뛴 건수. */
  skipped: number;
}

/** 규칙 저장 응답 — 만들어진 거래 건수를 함께 돌려준다. */
export interface RecurringSaveResult {
  id: string;
  backfill: BackfillResult;
}
