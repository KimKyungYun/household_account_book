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
  /** 다음 발생 예정일. 끝난 규칙은 null. */
  nextOccurrenceDate: string | null;
}
