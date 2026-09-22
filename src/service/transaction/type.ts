import type { SplitMode, TransactionStatus, TransactionType } from '@/generated/prisma/enums';

export interface TransactionListItemDto {
  id: string;
  /** 'YYYY-MM-DD' — 앱 경계에서는 Date 를 쓰지 않는다. */
  date: string;
  type: TransactionType;
  amount: number;
  member: { id: string; displayName: string; colorHex: string };
  category: { id: string; name: string; parentName: string | null; colorHex: string | null } | null;
  paymentMethod: { id: string; name: string } | null;
  splitMode: SplitMode;
  merchant: string | null;
  memo: string | null;
  status: TransactionStatus;
  version: number;
}

export interface TransactionSummaryDto {
  incomeTotal: number;
  expenseTotal: number;
  transferTotal: number;
  net: number;
  count: number;
}

export interface TransactionListDto {
  items: TransactionListItemDto[];
  page: { page: number; pageSize: number; total: number; pageCount: number };
  /** 현재 필터 전체 기준 합계 — 페이지 합계가 아니다. */
  summary: TransactionSummaryDto;
}
