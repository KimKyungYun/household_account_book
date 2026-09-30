import type { AssetKind } from '@/generated/prisma/enums';

/** 이 자산에 매달 저절로 들어오는 돈. 반복 규칙 한 건을 자산 쪽에서 본 모습이다. */
export interface AutoDepositDto {
  ruleId: string;
  amount: number;
  /** 1~31. 31 은 말일을 겸한다. */
  dayOfMonth: number;
  /** 이 자산에 붙은 활성 규칙이 둘 이상인지. 그러면 자산 폼에서 다루지 않는다. */
  hasMany: boolean;
}

export interface AssetDto {
  id: string;
  name: string;
  kind: AssetKind;
  colorHex: string | null;
  /** 앱에 적기 전에 이미 모여 있던 금액. */
  openingBalance: number;
  /** 모으려는 목표액. 정하지 않았으면 null. */
  targetAmount: number | null;
  isActive: boolean;
  memo: string | null;
  owner: { id: string; displayName: string; colorHex: string } | null;
  /** 이 자산으로 들어간 거래의 합. 시작 잔액은 빼고 센 값이다. */
  addedAmount: number;
  /** 지금 잔액 = 시작 잔액 + 들어간 금액. */
  balance: number;
  /** 이 자산에 붙은 거래 건수. 지울 수 있는지 판단에 쓴다. */
  transactionCount: number;
  /** 매달 자동으로 넣는 설정. 없으면 null. */
  autoDeposit: AutoDepositDto | null;
}

export interface AssetSummaryDto {
  assets: AssetDto[];
  /** 살아 있는 자산의 잔액 합. */
  totalBalance: number;
  /** 이번 달에 새로 들어간 금액. */
  addedThisMonth: number;
}

export interface AssetTrendPointDto {
  yearMonth: string;
  /** 그 달 말 기준 누적 잔액. */
  balance: number;
  /** 그 달에 들어간 금액. */
  added: number;
}
