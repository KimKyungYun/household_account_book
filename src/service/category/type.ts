import type { CategoryKind, SplitMode } from '@/generated/prisma/enums';

export interface CategoryNodeDto {
  id: string;
  name: string;
  kind: CategoryKind;
  level: number;
  /** 대분류면 null. */
  parentId: string | null;
  icon: string | null;
  colorHex: string | null;
  sortOrder: number;
  isActive: boolean;
  defaultSplitMode: SplitMode | null;
  /**
   * 이 분류를 쓰는 거래·반복 거래·대출 수. 대분류는 딸린 소분류 것까지 더한다.
   * 지울 때 옮길 곳을 물어야 하는지 화면에서 바로 판단한다.
   */
  transactionCount: number;
  recurringCount: number;
  loanCount: number;
  children: CategoryNodeDto[];
}

export interface CategoryTreeDto {
  kind: CategoryKind;
  categories: CategoryNodeDto[];
}
