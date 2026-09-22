export interface SettlementLineDto {
  memberId: string;
  displayName: string;
  colorHex: string;
  shareBp: number;
  paidAmount: number;
  owedAmount: number;
  balanceAmount: number;
}

export interface SettlementDto {
  yearMonth: string;
  sharedTotal: number;
  lines: SettlementLineDto[];
  transfer: { fromMemberId: string; toMemberId: string; amount: number } | null;
  confirmedAt: string | null;
  recalculationDiff: number;
}
